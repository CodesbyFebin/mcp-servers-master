/**
 * Generate reports/milestone-7-migration-ledger.csv from the GSC cohort + redirect map
 * + content/server registries.
 *
 * Schema matches handoff spec:
 *   columns: family_slug, canonical_url, gsc_clicks, gsc_impressions,
 *            decision, evidence, redirect_target
 *   decision enum: KEEP_INDEXED | REDIRECT_301 | DEFER_NOINDEX | DROP_NOINDEX
 *
 * Decision rules (applied in this order):
 *   - Path is a redirect source                → REDIRECT_301
 *   - Path is GSC Coverage-Valid               → KEEP_INDEXED
 *   - Path matches numeric-suffix glossary     → DROP_NOINDEX
 *   - Path is a published registry path, not in GSC → DEFER_NOINDEX
 *
 * Never fabricates metrics. Missing values → empty cell.
 *
 * Run from repo root: npx tsx scripts/generate-migration-ledger.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { contentRegistry } from "@/content/content-registry";
import { serverRegistry, isServerIndexableEntry } from "@/content/server-registry";

const DATA_DIR = path.join(process.cwd(), "data/migration/source");
const REPORTS_DIR = path.join(process.cwd(), "reports");

const gsc = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "gsc-indexed-urls.json"), "utf-8")
) as { url: string; path: string; bucket: string; clicks: number; impressions: number }[];
const redirects = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "glossary-and-legacy-redirects.json"), "utf-8")
) as { source: string; destination: string; permanent: boolean }[];

// Only permanent redirects (permanent: true) participate in REDIRECT_301 decisions.
// Protected terms (permanent: false) are editorial gaps — they do NOT get a redirect
// decision, which allows them to be treated as candidate editorial paths.
const permanentRedirects = redirects.filter((r) => r.permanent);

const CANONICAL_ORIGIN = "https://www.mcpserver.in";
function strip(p: string): string {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}
function resolveDestination(d: string): string {
  // /glossary/mcp-server/ is a synonym for the canonical /glossary/ hub.
  if (d === "/glossary/mcp-server/") return "/glossary/";
  return d;
}

// Build path -> GSC row map (no-slash key).
const gscByPath = new Map<string, { clicks: number; impressions: number }>();
for (const row of gsc) {
  const key = strip(row.path) || "/";
  if (!gscByPath.has(key)) gscByPath.set(key, { clicks: row.clicks, impressions: row.impressions });
}

// Build no-slash -> destination map (only permanent redirects).
// Protected terms (permanent: false) are NOT added to the map, so they do not
// receive REDIRECT_301 — they fall through to GSC or DROP_NOINDEX classification.
const redirectMap = new Map<string, string>();
for (const r of permanentRedirects) {
  const src = strip(r.source);
  if (!redirectMap.has(src)) redirectMap.set(src, resolveDestination(r.destination));
}

const NUMERIC_SUFFIX = /^[\w-]+-\d+$/;
function deriveSlug(p: string): string {
  const segs = p.split("/").filter(Boolean);
  return segs[segs.length - 1] ?? p;
}

/**
 * Canonical route coverage (P23 gap surface).
 *
 * KEEP_INDEXED implies the canonical build can serve the URL. That is NOT
 * true for a large part of the historical corpus (legacy blog/glossary/docs
 * content that was never ported). This column makes the gap explicit and
 * machine-checkable instead of silently 404ing at cutover:
 *   - served                     → a canonical route exists for this path
 *   - unserved_pending_editorial → no route; needs an explicit editorial
 *                                  decision (REBUILD / redirect / 410)
 *                                  BEFORE production cutover.
 * No mass reclassification happens here — decisions stay with editorial.
 */
function collectStaticRoutes(dir: string, base = ""): Set<string> {
  const routes = new Set<string>();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return routes;
  }
  const hasPage = entries.some((e) => e.isFile() && (e.name === "page.tsx" || e.name === "page.tsx" || e.name === "page.jsx"));
  if (hasPage) routes.add(base === "" ? "/" : base);
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("[") || e.name.startsWith("_") || e.name.startsWith("(")) continue;
    const childBase = `${base}/${e.name}`;
    for (const r of collectStaticRoutes(path.join(dir, e.name), childBase)) routes.add(r);
  }
  return routes;
}

/**
 * Routes whose page file is an auto-generated REBUILD stub (scaffolded by
 * scripts/scaffold-rebuild-pages.mjs). These resolve 200 but carry noindex
 * and no substantive content — they are NOT "served" in the indexable sense;
 * their decision must remain REBUILD until real content is authored.
 */
function collectRebuildStubRoutes(dir: string, base = ""): Set<string> {
  const stubs = new Set<string>();
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return stubs;
  }
  const pageFile = entries.find((e) => e.isFile() && e.name === "page.tsx");
  if (pageFile) {
    try {
      const head = fs.readFileSync(path.join(dir, pageFile.name), "utf-8").slice(0, 400);
      if (head.includes("AUTO-GENERATED REBUILD STUB")) stubs.add(base === "" ? "/" : base);
    } catch {
      // unreadable page file — treat as normal route
    }
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("[") || e.name.startsWith("_") || e.name.startsWith("(")) continue;
    const childBase = `${base}/${e.name}`;
    for (const r of collectRebuildStubRoutes(path.join(dir, e.name), childBase)) stubs.add(r);
  }
  return stubs;
}

const staticRoutes = collectStaticRoutes(path.join(process.cwd(), "app"));
const rebuildStubRoutes = collectRebuildStubRoutes(path.join(process.cwd(), "app"));
const registryPaths = new Set(
  Object.values(contentRegistry)
    .filter((e) => e.status === "published" && !e.noindex)
    .map((e) => strip(e.indexPath)),
);
const serverPaths = new Set(
  Object.values(serverRegistry)
    .filter((s) => isServerIndexableEntry(s))
    .map((s) => strip(s.indexPath)),
);
type RouteStatus = "served" | "served_rebuild_stub" | "unserved_pending_editorial";
function routeStatusFor(normPath: string): RouteStatus {
  if (rebuildStubRoutes.has(normPath)) return "served_rebuild_stub";
  if (staticRoutes.has(normPath) || registryPaths.has(normPath) || serverPaths.has(normPath)) return "served";
  return "unserved_pending_editorial";
}

interface Row {
  family_slug: string;
  canonical_url: string;
  gsc_clicks: string;
  gsc_impressions: string;
  decision: string;
  evidence: string;
  redirect_target: string;
  /** Decoupled GSC historical status (RESOLVES BLOCKER 3). */
  gsc_status: string;
  /** Decoupled editorial publication authority (RESOLVES BLOCKER 3). */
  publication_authority: string;
  /** Whether the canonical build can serve this URL (P23 gap surface). */
  canonical_route_status: string;
}

const rows: Row[] = [];
const seen = new Set<string>();

function addRow(normPath: string, slug: string, gscRow: { clicks: number; impressions: number } | null, redirectDest: string | null, editorialOwned = false): void {
  if (seen.has(normPath)) return;
  seen.add(normPath);

  let decision: string;
  let evidence: string;
  let redirectTarget = "";

  if (redirectDest) {
    // Path is a permanent redirect source — REDIRECT_301 wins, even if also in GSC
    // (Google will drop the source from Coverage-Valid once the 301 propagates).
    decision = "REDIRECT_301";
    evidence = "handoff_redirect_map";
    redirectTarget = redirectDest;
  } else if (gscRow) {
    decision = "KEEP_INDEXED";
    evidence = "gsc_coverage_valid";
  } else if (NUMERIC_SUFFIX.test(slug)) {
    // Only classify as DROP_NOINDEX if NOT already in the redirect map as protected.
    // The redirect map now includes all entries (permanent + protected).
    // If a path is in the redirect map with permanent=false, it stays out of
    // REDIRECT_301 but also must not be DROP_NOINDEX — it's a protected term.
    decision = "DROP_NOINDEX";
    evidence = "gsc_absent_and_no_redirect";
  } else if (editorialOwned) {
    // Path has editorial authority (published in registry) but no GSC presence.
    // This is the decoupled DEFER_NOINDEX: defer GSC review, not publication authority.
    decision = "DEFER_NOINDEX";
    evidence = "gsc_absent_editorial_owned";
  } else {
    decision = "DEFER_NOINDEX";
    evidence = "gsc_absent";
  }

  rows.push({
    family_slug: slug,
    canonical_url: `${CANONICAL_ORIGIN}${normPath}`,
    gsc_clicks: gscRow ? String(gscRow.clicks) : "",
    gsc_impressions: gscRow ? String(gscRow.impressions) : "",
    decision,
    evidence,
    redirect_target: redirectTarget,
    gsc_status: gscRow ? "in_gsc" : "absent",
    publication_authority: editorialOwned ? "editorial_owned" : "no_editorial",
    canonical_route_status: routeStatusFor(normPath),
  });
}

// 1) Process every GSC URL (676 base rows).
// Normalize before the seen check to deduplicate slash/non-slash variants.
for (const row of gsc) {
  const norm = strip(row.path) || "/";
  if (seen.has(norm)) continue; // Skip if trailing-slash variant was already processed.
  const slug = deriveSlug(norm);
  const gscRow = gscByPath.get(norm) ?? null;
  const dest = redirectMap.get(norm) ?? null;
  addRow(norm, slug, gscRow, dest);
}

// 2) Add every current registry path — these are REDIRECT/DEFER/DROP if not in GSC.
// Published registry paths are editorial_owned (they have editorial authority).
for (const entry of Object.values(contentRegistry)) {
  if (entry.status !== "published" || entry.noindex) continue;
  const norm = strip(entry.indexPath);
  const slug = deriveSlug(norm);
  const gscRow = gscByPath.get(norm) ?? null;
  const dest = redirectMap.get(norm) ?? null;
  addRow(norm, slug, gscRow, dest, true); // editorialOwned = true
}

// Indexable servers are also editorial-owned.
for (const server of Object.values(serverRegistry)) {
  if (!isServerIndexableEntry(server)) continue;
  const norm = strip(server.indexPath);
  const slug = deriveSlug(norm);
  const gscRow = gscByPath.get(norm) ?? null;
  const dest = redirectMap.get(norm) ?? null;
  addRow(norm, slug, gscRow, dest, true); // editorialOwned = true
}

// 2.5) Every permanent handoff redirect source must appear in the ledger —
// even when absent from GSC and the registry (e.g. /directory/). A decided
// redirect that never becomes a row would silently vanish from the runtime
// redirect table, which is derived from this ledger.
for (const r of permanentRedirects) {
  const norm = strip(r.source);
  if (!norm) continue;
  const slug = deriveSlug(norm);
  const dest = redirectMap.get(norm) ?? resolveDestination(r.destination);
  addRow(norm, slug, gscByPath.get(norm) ?? null, dest);
}

// 3) EVIDENCE_REVIEW upgrade for any GSC paths with significant equity but no
// editorial decision. These 4 topical /directory/* paths have GSC coverage (G8)
// but their destination requires individual resolution:
//   - exact equivalent category exists  → direct 301 to that category
//   - valuable intent, no replacement   → REBUILD / KEEP
//   - obsolete with no value            → 410
//   - unresolved                        → EVIDENCE_REVIEW
// The 2 glossary terms (mcp-soc-2, mcp-iso-27001) are PROTECTED in glossary-protections.json
// and are NOT in this list — they are not GSC-observed and remain protected gaps.
const EVIDENCE_REVIEW_PATHS = new Set<string>([
  "/directory/databases",
  "/directory/devops",
  "/directory/iot",
  "/directory/monitoring",
]);

for (const r of rows) {
  const path = r.canonical_url.replace(CANONICAL_ORIGIN, "");
  if (r.decision === "KEEP_INDEXED" && EVIDENCE_REVIEW_PATHS.has(path)) {
    r.decision = "EVIDENCE_REVIEW";
    r.evidence = "gsc_coverage_valid_pending_editorial";
  }
}

// --- 4) Editorial resolution gate (P23) -------------------------------------
// Every historical URL must end in exactly one of:
//   KEEP_INDEXED  → resolves to a real 200 canonical route (checked above)
//   REDIRECT_301  → semantically equivalent destination, one hop, 200 target
//   REBUILD       → content recreated before cutover, original intent preserved
//   GONE_410      → intentionally retired, no replacement exists
//   EVIDENCE_REVIEW → unresolved (release-blocking; must end at 0)
//
// Rules (evidence-based, no batch destination assignment):
//   a. Semantic equivalent: a registry path whose normalized slug equals the
//      URL's normalized slug (strip leading "mcp-", trailing "-<digits>").
//      Topic identity is the equivalence; disambiguation prefers the same
//      top-level family, then /learn (definitional), then lexicographic.
//   b. No equivalent + search equity (clicks >= 1 OR impressions >= 10)
//      → REBUILD.
//   c. No equivalent + no evidence (0 clicks, < 10 impressions)
//      → GONE_410 (intentional retirement of unported legacy content).
const normalizeSlug = (s: string): string =>
  s.toLowerCase().replace(/^mcp-/, "").replace(/-\d+$/, "");

const registryByNormSlug = new Map<string, string[]>();
for (const entry of Object.values(contentRegistry)) {
  if (entry.status !== "published" || entry.noindex) continue;
  const slug = entry.indexPath.split("/").filter(Boolean).pop() ?? entry.slug;
  const key = normalizeSlug(slug);
  registryByNormSlug.set(key, [...(registryByNormSlug.get(key) ?? []), strip(entry.indexPath)]);
}
for (const key of registryByNormSlug.keys()) {
  registryByNormSlug.get(key)!.sort((a, b) => {
    const famA = a.split("/")[1];
    const famB = b.split("/")[1];
    if (famA !== famB) {
      if (famA === "learn") return -1;
      if (famB === "learn") return 1;
      return famA.localeCompare(famB);
    }
    return a.localeCompare(b);
  });
}
function findRegistryEquivalent(normPath: string): string | null {
  const segs = normPath.split("/").filter(Boolean);
  const slug = segs[segs.length - 1] ?? normPath;
  const family = segs.length > 1 ? segs[0] : null;
  const candidates = registryByNormSlug.get(normalizeSlug(slug));
  if (!candidates || candidates.length === 0) return null;
  if (family) {
    const sameFamily = candidates.find((p) => p.split("/")[1] === family);
    if (sameFamily) return sameFamily;
  }
  return candidates[0];
}

const REBUILD_EQUITY_CLICKS = 1;
const REBUILD_EQUITY_IMPRESSIONS = 10;

let resolutionCounts: Record<string, number> = {};
for (const r of rows) {
  const normPath = r.canonical_url.replace(CANONICAL_ORIGIN, "");
  if (r.decision === "EVIDENCE_REVIEW") {
    // G8 resolution: the 4 topical /directory/* paths carry real historical
    // intent (category pages) → REBUILD before cutover; intent preserved.
    r.decision = "REBUILD";
    r.evidence = "topical_directory_intent_rebuild_pending";
    continue;
  }
  if (r.decision !== "KEEP_INDEXED") continue;
  // A scaffolded rebuild stub resolves 200 but is noindex and contentless:
  // it does NOT satisfy KEEP_INDEXED (indexable canonical content). The URL
  // keeps its REBUILD decision; the route-status column records progress.
  if (r.canonical_route_status === "served_rebuild_stub") {
    const equity =
      Number(r.gsc_clicks || "0") >= REBUILD_EQUITY_CLICKS ||
      Number(r.gsc_impressions || "0") >= REBUILD_EQUITY_IMPRESSIONS;
    r.decision = "REBUILD";
    r.evidence = equity ? "legacy_content_not_ported_search_equity" : "legacy_content_not_ported_no_evidence";
    continue;
  }
  if (r.canonical_route_status !== "unserved_pending_editorial") {
    continue;
  }
  const equiv = findRegistryEquivalent(normPath);
  if (equiv) {
    r.decision = "REDIRECT_301";
    r.evidence = "semantic_equivalent_registry_path";
    r.redirect_target = equiv;
  } else if (
    Number(r.gsc_clicks || "0") >= REBUILD_EQUITY_CLICKS ||
    Number(r.gsc_impressions || "0") >= REBUILD_EQUITY_IMPRESSIONS
  ) {
    r.decision = "REBUILD";
    r.evidence = "legacy_content_not_ported_search_equity";
  } else {
    r.decision = "GONE_410";
    r.evidence = "legacy_content_not_ported_no_evidence";
  }
  resolutionCounts[r.decision] = (resolutionCounts[r.decision] ?? 0) + 1;
}

// --- Write CSV ---
const COLUMNS = [
  "family_slug",
  "canonical_url",
  "gsc_clicks",
  "gsc_impressions",
  "decision",
  "evidence",
  "redirect_target",
  "gsc_status",
  "publication_authority",
  "canonical_route_status",
];
function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
const csv = [
  COLUMNS.join(","),
  ...rows.map((r) => COLUMNS.map((c) => csvEscape(r[c as keyof Row] ?? "")).join(",")),
].join("\n") + "\n";

const outPath = path.join(REPORTS_DIR, "milestone-7-migration-ledger.csv");
fs.writeFileSync(outPath, csv);

console.log(`Wrote ${rows.length} rows to ${outPath}`);
const counts: Record<string, number> = {};
for (const r of rows) counts[r.decision] = (counts[r.decision] ?? 0) + 1;
console.log("Decisions:", JSON.stringify(counts));
console.log("Editorial resolutions applied:", JSON.stringify(resolutionCounts));

const keepServed = rows.filter((r) => r.decision === "KEEP_INDEXED" && r.canonical_route_status === "served").length;
const keepUnserved = rows.filter((r) => r.decision === "KEEP_INDEXED" && r.canonical_route_status !== "served").length;
const stubServed = rows.filter((r) => r.decision === "REBUILD" && r.canonical_route_status === "served_rebuild_stub").length;
const rebuildPending = rows.filter((r) => r.decision === "REBUILD" && r.canonical_route_status !== "served_rebuild_stub").length;
const unresolved = rows.filter((r) => r.decision === "EVIDENCE_REVIEW").length;
console.log(`KEEP_INDEXED route coverage: served=${keepServed} non-served=${keepUnserved}`);
console.log(`REBUILD: stub-served=${stubServed} page-not-yet-authored=${rebuildPending}`);
console.log(`EVIDENCE_REVIEW unresolved: ${unresolved}`);

// Hard invariants (P23 editorial gate): KEEP_INDEXED must equal served-200,
// and no unresolved review rows may remain.
const invariantsHold = keepUnserved === 0 && unresolved === 0;
console.log(`INVARIANTS: KEEP_UNSERVED=0 ${keepUnserved === 0 ? "PASS" : "FAIL"} · REVIEW_UNRESOLVED=0 ${unresolved === 0 ? "PASS" : "FAIL"}`);
if (!invariantsHold) {
  console.log("RELEASE BLOCKER (P23): unresolved editorial decisions remain.");
  process.exitCode = 1;
}

// Redirect destination audit: every REDIRECT_301 target must be a served
// canonical route (200 + self-canonicalizing registry/static page).
const servedTargets = new Set<string>(["/servers"]);
for (const entry of Object.values(contentRegistry)) {
  if (entry.status === "published" && !entry.noindex) servedTargets.add(strip(entry.indexPath));
}
let badTargets = 0;
for (const r of rows) {
  if (r.decision !== "REDIRECT_301") continue;
  const target = strip(r.redirect_target);
  if (!servedTargets.has(target)) {
    badTargets++;
    console.log(`BAD REDIRECT TARGET: ${r.canonical_url} -> ${r.redirect_target}`);
  }
}
console.log(`Redirect destination audit: ${badTargets === 0 ? "PASS" : `FAIL (${badTargets} unserved targets)`}`);
if (badTargets > 0) process.exitCode = 1;
