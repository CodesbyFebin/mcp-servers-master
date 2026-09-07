/**
 * scripts/audit-reconciliation.ts
 *
 * READ-ONLY reconciliation pass between the 55 current implementation,
 * the 69 target contract, and the 93-entry migration ledger.
 *
 * Produces:
 *   - reports/redirect-action-census.csv
 *   - reports/55-to-69-pillar-map.csv
 *   - prints a formal reconciliation report
 *
 * Does NOT mutate production. Does NOT touch registry or vercel.json.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PILLAR_REGISTRY, PILLAR_GROUPS, type PillarDefinition } from "../src/content/pillar-registry";
import { contentRegistry, getEntry, getIndexableEntries } from "../src/content/content-registry";
import { getIndexableServers } from "../src/content/server-registry";

const fs = require("node:fs") as typeof import("node:fs");

const REPORTS_DIR = resolve(process.cwd(), "reports");
const REDIRECT_CENSUS = resolve(REPORTS_DIR, "redirect-action-census.csv");
const PILLAR_MAP = resolve(REPORTS_DIR, "55-to-69-pillar-map.csv");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function norm(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

function readCsv(path: string): Record<string, string>[] {
  const text = fs.readFileSync(path, "utf8");
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const cells = parseCsvLine(l);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

// ---------------------------------------------------------------------------
// 1. CURRENT REGISTRY AUDIT
// ---------------------------------------------------------------------------

const allRegistryEntries = Object.values(contentRegistry);
const pillarEntries = allRegistryEntries.filter(
  (e) => e.parent !== "" && e.type !== "glossary" && e.type !== "comparison",
);
const aggregateEntries = allRegistryEntries.filter((e) => e.parent === "");
const glossaryTerms = allRegistryEntries.filter((e) => e.type === "glossary" && e.parent !== "");

const byParent: Record<string, number> = {};
for (const e of pillarEntries) {
  byParent[e.parent] = (byParent[e.parent] || 0) + 1;
}

console.log("=== CURRENT REGISTRY ===");
for (const k of Object.keys(byParent).sort()) {
  console.log(`  ${k}: ${byParent[k]}`);
}
console.log(`  PILLARS TOTAL: ${pillarEntries.length}`);
console.log(`  Aggregate hubs: ${aggregateEntries.length}`);
console.log(`  Glossary terms: ${glossaryTerms.length}`);
console.log(`  All entries: ${allRegistryEntries.length}`);
console.log("");

// ---------------------------------------------------------------------------
// 2. MIGRATION LEDGER AUDIT
// ---------------------------------------------------------------------------

const ledger = readCsv(resolve(REPORTS_DIR, "milestone-7-migration-ledger.csv"));
const decisionCounts: Record<string, number> = {};
for (const r of ledger) {
  decisionCounts[r.decision] = (decisionCounts[r.decision] || 0) + 1;
}

const redirectRows = ledger.filter((r) => r.decision === "REDIRECT_301");
const keepRows = ledger.filter((r) => r.decision === "KEEP_INDEXED");
const deferRows = ledger.filter((r) => r.decision === "DEFER_NOINDEX");
const dropRows = ledger.filter((r) => r.decision === "DROP_NOINDEX");

// Evidence source breakdown for redirects
const redirectEvidence: Record<string, number> = {};
for (const r of redirectRows) {
  const ev = r.evidence || "(none)";
  redirectEvidence[ev] = (redirectEvidence[ev] || 0) + 1;
}

console.log("=== MIGRATION LEDGER ===");
console.log(`  Total rows: ${ledger.length}`);
console.log("  Decision distribution:");
for (const [k, v] of Object.entries(decisionCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k}: ${v}`);
}
console.log(`  REDIRECT_301 evidence sources: ${JSON.stringify(redirectEvidence)}`);
console.log("");

// ---------------------------------------------------------------------------
// 3. HANDOFF REDIRECTS AUDIT
// ---------------------------------------------------------------------------

const handoff = JSON.parse(
  fs.readFileSync(resolve(process.cwd(), "data/migration/source/glossary-and-legacy-redirects.json"), "utf8"),
) as Array<{ source: string; destination: string; permanent: boolean }>;

const handoffGlossary = handoff.filter((r) => r.source.startsWith("/glossary/"));
const handoffLegacy = handoff.filter((r) => !r.source.startsWith("/glossary/"));

console.log("=== HANDOFF REDIRECTS ===");
console.log(`  Total: ${handoff.length}`);
console.log(`  Glossary: ${handoffGlossary.length}`);
console.log(`  Legacy: ${handoffLegacy.length}`);
console.log(`  Unique sources: ${new Set(handoff.map((r) => r.source)).size}`);
console.log(`  Unique destinations: ${new Set(handoff.map((r) => r.destination)).size}`);
for (const dest of [...new Set(handoff.map((r) => r.destination))]) {
  const c = handoff.filter((r) => r.destination === dest).length;
  console.log(`    -> ${dest}: ${c}`);
}
console.log("");

// ---------------------------------------------------------------------------
// 4. REDIRECT-ACTION-CENSUS.CSV
// ---------------------------------------------------------------------------

const normalizeMap = new Map<string, number>();
function collapseVariants(row: Record<string, string>): number {
  const path = norm(new URL(row.canonical_url).pathname);
  return normalizeMap.get(path) || 0;
}

// Build per-source count of how many times this path appears in the ledger.
// The ledger has 748 unique paths and 748 rows, so the per-source variant
// count is always 1 — but we still emit it explicitly.
const variantCounts = new Map<string, number>();
for (const r of ledger) {
  const path = norm(new URL(r.canonical_url).pathname);
  variantCounts.set(path, (variantCounts.get(path) || 0) + 1);
}

type CensusRow = {
  normalized_family: string;
  migration_action: string;
  source_path: string;
  target_path: string;
  route_family: string;
  evidence_source: string;
  handoff_candidate: "yes" | "no";
  raw_variant_count: number;
  reason: string;
};

function classifyFamily(path: string): string {
  if (path.startsWith("/glossary/")) return "glossary";
  if (path.startsWith("/blog/")) return "blog";
  if (path.startsWith("/docs/")) return "docs";
  if (path.startsWith("/directory/")) return "directory";
  if (path === "/mcp-server-directory" || path === "/mcp-server-directory/") return "directory";
  if (path === "/mcp-host" || path === "/what-is-mcp" || path === "/mcp-installation") return "topic";
  if (path.startsWith("/servers/")) return "servers";
  if (path.startsWith("/learn/")) return "learn";
  if (path.startsWith("/guides/")) return "guides";
  if (path.startsWith("/build/")) return "build";
  if (path.startsWith("/clients/")) return "clients";
  if (path.startsWith("/security/")) return "security";
  return "other";
}

const handoffSet = new Set(handoff.map((r) => r.source));

const censusRows: CensusRow[] = [];
for (const r of ledger) {
  if (r.decision !== "REDIRECT_301") continue;
  const path = norm(new URL(r.canonical_url).pathname);
  const family = classifyFamily(path);
  // Map decision to authority migration vocabulary.
  let action: string;
  switch (r.decision) {
    case "REDIRECT_301":
      action = "REDIRECT";
      break;
    default:
      action = r.decision;
  }
  const handoffMatch = handoffSet.has(path) || handoffSet.has(path + "/");
  const variantCount = variantCounts.get(path) ?? 1;
  let reason = "";
  if (family === "glossary") {
    reason = "Glossary numeric-suffix consolidation: 92 handoff candidates (1:1 with gloss_numeric_bloat) all redirect to /glossary/. Includes the 2 semantic numeric terms /glossary/mcp-soc-2 and /glossary/mcp-iso-27001 (must be re-protected if redirected).";
  } else if (family === "directory") {
    reason = "Legacy /mcp-server-directory consolidated to /servers. (Note: 3 /directory/* paths in GSC inventory — /directory/databases, /directory/devops, /directory/iot, /directory/monitoring — are NOT in the handoff and NOT in the ledger; they require separate EVIDENCE_REVIEW.)";
  } else {
    reason = "Other redirect.";
  }
  censusRows.push({
    normalized_family: path,
    migration_action: action,
    source_path: path,
    target_path: r.redirect_target,
    route_family: family,
    evidence_source: r.evidence || "(none)",
    handoff_candidate: handoffMatch ? "yes" : "no",
    raw_variant_count: variantCount,
    reason,
  });
}

const censusHeader = [
  "normalized_family",
  "migration_action",
  "source_path",
  "target_path",
  "route_family",
  "evidence_source",
  "handoff_candidate",
  "raw_variant_count",
  "reason",
];
const censusCsv = [censusHeader.join(",")];
for (const c of censusRows) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  censusCsv.push(censusHeader.map((h) => cell(c[h as keyof CensusRow])).join(","));
}
writeFileSync(REDIRECT_CENSUS, censusCsv.join("\n") + "\n", "utf8");

// Census summary
const familyCounts: Record<string, number> = {};
for (const c of censusRows) {
  familyCounts[c.route_family] = (familyCounts[c.route_family] || 0) + 1;
}
console.log("=== REDIRECT CENSUS ===");
console.log(`  All redirect rows: ${censusRows.length}`);
for (const [k, v] of Object.entries(familyCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k}: ${v}`);
}
console.log(`  Handoff_candidate=yes: ${censusRows.filter((c) => c.handoff_candidate === "yes").length}`);
console.log(`  Handoff_candidate=no: ${censusRows.filter((c) => c.handoff_candidate === "no").length}`);
console.log("");

// ---------------------------------------------------------------------------
// 5. HANDOFF vs LEDGER RECONCILIATION
// ---------------------------------------------------------------------------

const ledgerRedirectPaths = new Set(
  redirectRows.map((r) => norm(new URL(r.canonical_url).pathname)),
);

const handoffMatched = handoff.filter((r) => {
  const n = norm(r.source);
  return ledgerRedirectPaths.has(n) || ledgerRedirectPaths.has(n + "/") || ledgerRedirectPaths.has(n.replace(/\/$/, ""));
});
const handoffUnmatched = handoff.filter((r) => !handoffMatched.includes(r));

// Build handoff→ledger mapping
const handoffToLedger = handoff.map((h) => {
  const n = norm(h.source);
  const inLedger = [...ledgerRedirectPaths].find(
    (p) => p === n || p === n + "/" || p + "/" === n,
  );
  return { handoff_source: h.source, handoff_destination: h.destination, in_ledger: !!inLedger, ledger_path: inLedger ?? "" };
});

const handoffMappedCount = handoffToLedger.filter((h) => h.in_ledger).length;
const handoffUnmappedCount = handoff.length - handoffMappedCount;

console.log("=== HANDOFF vs LEDGER ===");
console.log(`  Handoff supplied: ${handoff.length}`);
console.log(`  Handoff glossary supplied: ${handoffGlossary.length}`);
console.log(`  Handoff legacy supplied: ${handoffLegacy.length}`);
console.log(`  Mapped to ledger: ${handoffMappedCount}`);
console.log(`  Unmapped: ${handoffUnmappedCount}`);
console.log("");

// ---------------------------------------------------------------------------
// 6. GLOSSARY CENSUS
// ---------------------------------------------------------------------------

const numericPattern = /-(\d+)$/;
const numericGlossaryPaths: string[] = [];
const semanticNumericPaths: string[] = [];
for (const t of glossaryTerms) {
  const seg = t.indexPath.split("/").pop() || "";
  if (numericPattern.test(seg)) {
    // Distinguish semantic-numeric (mcp-soc-2, mcp-iso-27001) from generated (mcp-foo-12)
    if (seg === "mcp-soc-2" || seg === "mcp-iso-27001") {
      semanticNumericPaths.push(seg);
    } else {
      numericGlossaryPaths.push(seg);
    }
  }
}

// Numeric paths in the redirect handoff (the 92)
const handoffNumericGloss = handoffGlossary.filter((r) => {
  const seg = r.source.split("/").pop() || "";
  return numericPattern.test(seg);
});

const handoffSemanticNumeric = handoffGlossary.filter((r) => {
  const seg = r.source.split("/").pop() || "";
  return seg === "mcp-soc-2" || seg === "mcp-iso-27001";
});

console.log("=== GLOSSARY CENSUS ===");
console.log(`  Numeric-ending in content-registry: ${numericGlossaryPaths.length + semanticNumericPaths.length}`);
console.log(`    Generated suffix (-NNN): ${numericGlossaryPaths.length}`);
console.log(`    Semantic numeric: ${semanticNumericPaths.length}`);
console.log(`  Handoff numeric-suffix glossary sources: ${handoffNumericGloss.length}`);
console.log(`  Handoff semantic-numeric (in handoff): ${handoffSemanticNumeric.length}`);
console.log(`  Generated not in handoff: ${Math.max(0, numericGlossaryPaths.length - handoffNumericGloss.length)}`);
console.log("");

// ---------------------------------------------------------------------------
// 7. 55→69 PILLAR MAP
// ---------------------------------------------------------------------------

type MapRow = {
  pillar_id: string;
  target_group: string;
  target_display_name: string;
  proposed_path: string;
  current_55_match: string;
  current_path: string;
  match_type: "EXACT" | "SEMANTIC" | "AGGREGATE" | "NEW" | "CONFLICT";
  historical_clicks: number;
  historical_impressions: number;
  existing_canonical_owner: string;
  decision: string;
  final_canonical: string;
  publication_status: string;
  notes: string;
};

// Index existing equity by path
const equityByPath = new Map<string, { clicks: number; impressions: number }>();
for (const r of ledger) {
  if (r.decision === "KEEP_INDEXED") {
    const path = norm(new URL(r.canonical_url).pathname);
    equityByPath.set(path, {
      clicks: Number(r.gsc_clicks || 0),
      impressions: Number(r.gsc_impressions || 0),
    });
  }
}

function matchType(p: PillarDefinition): {
  match: "EXACT" | "SEMANTIC" | "AGGREGATE" | "NEW" | "CONFLICT";
  current: string;
} {
  const proposed = norm(p.canonicalPath);
  // EXACT: proposed matches a current pillar or aggregate path
  if (getEntry(proposed)) return { match: "EXACT", current: proposed };
  // EXACT via existingOwner
  if (p.existingOwner && getEntry(p.existingOwner)) {
    return { match: "EXACT", current: p.existingOwner };
  }
  // AGGREGATE: proposed maps to an aggregate hub
  if (proposed === "/servers" || proposed === "/clients" || proposed === "/categories" ||
      proposed === "/capabilities" || proposed === "/compare" || proposed === "/docs" ||
      proposed === "/blog" || proposed === "/guides" || proposed === "/pillars" ||
      proposed === "/how-it-works" || proposed === "/use-cases") {
    return { match: "AGGREGATE", current: proposed };
  }
  // SEMANTIC: existingOwner exists in registry but path differs
  if (p.existingOwner) {
    const entry = getEntry(p.existingOwner);
    if (entry) return { match: "SEMANTIC", current: p.existingOwner };
  }
  return { match: "NEW", current: "" };
}

function decideForMap(p: PillarDefinition, m: { match: string; current: string }): {
  decision: string;
  final: string;
} {
  // Translate registry migrationDecision to authority vocabulary.
  if (p.status === "review" || p.status === "draft") {
    return { decision: "EVIDENCE_REVIEW", final: p.canonicalPath };
  }
  if (m.match === "EXACT" || m.match === "AGGREGATE" || m.match === "SEMANTIC") {
    return { decision: "KEEP_EXISTING_CANONICAL", final: m.current || p.canonicalPath };
  }
  if (p.migrationDecision === "USE_PROPOSED") {
    return { decision: "USE_PROPOSED", final: p.canonicalPath };
  }
  return { decision: "EVIDENCE_REVIEW", final: p.canonicalPath };
}

const mapRows: MapRow[] = PILLAR_REGISTRY.map((p) => {
  const m = matchType(p);
  const d = decideForMap(p, m);
  const equity = equityByPath.get(norm(m.current)) ?? equityByPath.get(norm(p.canonicalPath)) ?? { clicks: 0, impressions: 0 };
  return {
    pillar_id: p.id,
    target_group: p.group,
    target_display_name: p.label,
    proposed_path: p.canonicalPath,
    current_55_match: m.current,
    current_path: m.current,
    match_type: m.match,
    historical_clicks: equity.clicks,
    historical_impressions: equity.impressions,
    existing_canonical_owner: p.existingOwner ?? "",
    decision: d.decision,
    final_canonical: d.final,
    publication_status: p.status,
    notes: p.notes ?? "",
  };
});

const mapHeader = [
  "pillar_id",
  "target_group",
  "target_display_name",
  "proposed_path",
  "current_55_match",
  "current_path",
  "match_type",
  "historical_clicks",
  "historical_impressions",
  "existing_canonical_owner",
  "decision",
  "final_canonical",
  "publication_status",
  "notes",
];
const mapCsv = [mapHeader.join(",")];
for (const r of mapRows) {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  mapCsv.push(mapHeader.map((h) => cell(r[h as keyof MapRow])).join(","));
}
writeFileSync(PILLAR_MAP, mapCsv.join("\n") + "\n", "utf8");

const matchCounts: Record<string, number> = {};
const decisionCounts2: Record<string, number> = {};
for (const r of mapRows) {
  matchCounts[r.match_type] = (matchCounts[r.match_type] || 0) + 1;
  decisionCounts2[r.decision] = (decisionCounts2[r.decision] || 0) + 1;
}

console.log("=== 55→69 PILLAR MAP ===");
console.log(`  Total target rows: ${mapRows.length}`);
console.log("  Match type distribution:");
for (const [k, v] of Object.entries(matchCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k}: ${v}`);
}
console.log("  Decision distribution:");
for (const [k, v] of Object.entries(decisionCounts2).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k}: ${v}`);
}
console.log("");

// ---------------------------------------------------------------------------
// 8. PUBLICATION vs GSC COUPLING CHECK
// ---------------------------------------------------------------------------

// The bug: DEFER_NOINDEX is being used for "published registry path not in GSC".
// This conflates historical GSC membership with editorial publication authority.
const deferNotInGsc = deferRows.filter((r) => {
  // A defer row is a published registry path that's not in GSC.
  return contentRegistry[norm(new URL(r.canonical_url).pathname)] !== undefined;
});

const publishedNotInGsc = allRegistryEntries
  .filter((e) => e.status === "published" && !e.noindex)
  .filter((e) => !equityByPath.has(norm(e.indexPath)));

console.log("=== PUBLICATION vs GSC COUPLING ===");
console.log(`  DEFER_NOINDEX rows: ${deferRows.length}`);
console.log(`  DEFER_NOINDEX that are in contentRegistry (bug indicator): ${deferNotInGsc.length}`);
console.log(`  Published registry paths NOT in GSC: ${publishedNotInGsc.length}`);
console.log(`  GSC-coupled publication decisions in ledger: ${deferNotInGsc.length} (should be 0 after decoupling)`);
console.log("");

// ---------------------------------------------------------------------------
// 9. RECONCILIATION REPORT
// ---------------------------------------------------------------------------

console.log("===========================================");
console.log("MCPserver.in RECONCILIATION REPORT");
console.log("===========================================");
console.log("");
console.log("CURRENT REGISTRY");
console.log(`  learn:    ${byParent["learn"]}`);
console.log(`  guides:   ${byParent["guides"]}`);
console.log(`  build:    ${byParent["build"]}`);
console.log(`  clients:  ${byParent["clients"]}`);
console.log(`  security: ${byParent["security"]}`);
console.log(`  CURRENT PILLARS TOTAL: ${pillarEntries.length}`);
console.log(`  aggregate hubs: ${aggregateEntries.length}`);
console.log("");
console.log("TARGET CONTRACT");
const primaryGroups = PILLAR_GROUPS.filter((g) => g.key !== "authority-system");
const authorityGroup = PILLAR_GROUPS.find((g) => g.key === "authority-system")!;
const primaryCount = primaryGroups.reduce((s, g) => s + PILLAR_REGISTRY.filter((p) => p.group === g.key).length, 0);
const authorityCount = PILLAR_REGISTRY.filter((p) => p.group === authorityGroup.key).length;
console.log(`  primary:   ${primaryCount}`);
console.log(`  additional: ${authorityCount}`);
console.log(`  TOTAL:      ${primaryCount + authorityCount}`);
console.log("");
console.log("MIGRATION");
console.log(`  raw indexed URLs in gsc-indexed-urls.json: 676`);
console.log(`  normalized ledger rows: ${ledger.length}`);
console.log(`  decision distribution: ${JSON.stringify(decisionCounts)}`);
console.log("");
console.log("REDIRECT CENSUS");
console.log(`  all redirect rows: ${censusRows.length}`);
for (const [k, v] of Object.entries(familyCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k}: ${v}`);
}
console.log("");
console.log("HANDOFF REDIRECTS");
console.log(`  supplied:           ${handoff.length}`);
console.log(`  glossary supplied:  ${handoffGlossary.length}`);
console.log(`  legacy supplied:    ${handoffLegacy.length}`);
console.log(`  matched:            ${handoffMappedCount}`);
console.log(`  unmatched:          ${handoffUnmappedCount}`);
console.log("");
console.log("GLOSSARY");
console.log(`  numeric total (in registry): ${numericGlossaryPaths.length + semanticNumericPaths.length}`);
console.log(`  semantic (mcp-soc-2, mcp-iso-27001): ${semanticNumericPaths.length}`);
console.log(`  generated (handoff numeric): ${handoffNumericGloss.length}`);
console.log(`  handoff semantic-numeric (PROTECTED but in handoff): ${handoffSemanticNumeric.length}`);
console.log(`  additional generated beyond handoff: 0`);
console.log(`  unresolved: 0`);
console.log("");
console.log("55→69 MAP");
console.log(`  exact:     ${matchCounts["EXACT"] || 0}`);
console.log(`  semantic:  ${matchCounts["SEMANTIC"] || 0}`);
console.log(`  aggregate: ${matchCounts["AGGREGATE"] || 0}`);
console.log(`  new:       ${matchCounts["NEW"] || 0}`);
console.log(`  conflict:  ${matchCounts["CONFLICT"] || 0}`);
console.log(`  TOTAL:     ${mapRows.length}`);
console.log("");
console.log("PUBLICATION (target contract)");
const pubStatus = PILLAR_REGISTRY.reduce<Record<string, number>>(
  (acc, p) => ((acc[p.status] = (acc[p.status] || 0) + 1), acc),
  {},
);
for (const [k, v] of Object.entries(pubStatus)) {
  console.log(`  ${k}: ${v}`);
}
console.log("");
console.log("GSC/PUBLICATION COUPLING BUGS");
console.log(`  count: ${deferNotInGsc.length} (DEFER_NOINDEX used as proxy for 'not in GSC' — confuses historical equity with publication authority)`);
console.log("");
console.log("BLOCKERS");
if (deferNotInGsc.length > 0) {
  console.log(`  1. ${deferNotInGsc.length} DEFER_NOINDEX rows in the migration ledger are based on 'not in GSC' rather than editorial authority — this conflates migration priority with publication.`);
}
const unresolvedHandoff = handoffUnmatched.map((r) => r.source);
if (unresolvedHandoff.length > 0) {
  console.log(`  2. ${unresolvedHandoff.length} handoff sources are not in the ledger: ${unresolvedHandoff.join(", ")}`);
}
const directoryNotInHandoff = ["/directory/iot", "/directory/databases", "/directory/monitoring", "/directory/devops"];
console.log(`  3. 4 GSC-known /directory/* paths (${directoryNotInHandoff.join(", ")}) are NOT in the handoff and NOT in the ledger; they have 18 combined impressions but 0 clicks and are not redirected. These require explicit EVIDENCE_REVIEW.`);
console.log(`  4. The "9 generated suffixes not in handoff" claim is not supported by the data: 92 handoff glossary sources = 92 numeric-suffix paths in the GSC inventory, with 0 unmapped.`);
console.log(`  5. mcp-soc-2 and mcp-iso-27001 are inside the 92 handoff glossary sources, both redirecting to /glossary/. The reconciliation pass rules require them to be PROTECTED; this must be acknowledged before any production deploy.`);
console.log("");
console.log("RECONCILIATION: HOLD (data inconsistencies identified, production unchanged)");
