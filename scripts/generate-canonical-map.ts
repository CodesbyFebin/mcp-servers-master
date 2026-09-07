/**
 * scripts/generate-canonical-map.ts
 *
 * Generates reports/69-pillar-canonical-map.csv from the pillar registry,
 * the existing content-registry, and the Milestone 7 migration ledger.
 *
 * Decision logic per pillar:
 *   1. If the existingOwner has GSC clicks > 0 in the migration ledger →
 *      KEEP_EXISTING_CANONICAL (preserves search equity).
 *   2. If the existingOwner is published in content-registry but has no
 *      GSC equity → MERGE (use the proposed path if clean, else existing).
 *   3. If the proposed canonical path is unique and clean → USE_PROPOSED.
 *   4. If the pillar is in review/draft status → DRAFT/NOINDEX.
 *   5. Anything unresolved → EVIDENCE_REVIEW.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PILLAR_REGISTRY, type PillarDefinition } from "../src/content/pillar-registry";
import { contentRegistry } from "../src/content/content-registry";

type Decision =
  | "USE_PROPOSED"
  | "KEEP_EXISTING_CANONICAL"
  | "MERGE"
  | "REDIRECT"
  | "DRAFT"
  | "NOINDEX"
  | "EVIDENCE_REVIEW";

type Row = {
  pillar_id: string;
  group: string;
  display_name: string;
  proposed_path: string;
  existing_owner: string;
  gsc_clicks: number;
  gsc_impressions: number;
  semantic_equivalent: string;
  decision: Decision;
  final_canonical: string;
  redirect_required: "yes" | "no";
  publication_status: string;
  notes: string;
};

const LEDGER_PATH = resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv");
const OUTPUT_PATH = resolve(process.cwd(), "reports/69-pillar-canonical-map.csv");

/** Strip trailing slash for matching. */
function norm(p: string): string {
  return p.replace(/\/$/, "") || "/";
}

/** Load GSC equity from migration ledger keyed by path. */
function loadGscEquity(): Map<string, { clicks: number; impressions: number }> {
  // Read the CSV without external deps
  const fs = require("node:fs") as typeof import("node:fs");
  const text = fs.readFileSync(LEDGER_PATH, "utf8");
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  const idxUrl = header.indexOf("canonical_url");
  const idxClicks = header.indexOf("gsc_clicks");
  const idxImpressions = header.indexOf("gsc_impressions");
  const idxDecision = header.indexOf("decision");
  const map = new Map<string, { clicks: number; impressions: number }>();
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    if (cells[idxDecision] !== "KEEP_INDEXED") continue;
    const url = cells[idxUrl];
    if (!url) continue;
    const path = new URL(url).pathname;
    const clicks = Number(cells[idxClicks] ?? 0);
    const impressions = Number(cells[idxImpressions] ?? 0);
    const normed = norm(path);
    map.set(normed, { clicks, impressions });
  }
  return map;
}

function decide(p: PillarDefinition, gsc: Map<string, { clicks: number; impressions: number }>): Row {
  const owner = p.existingOwner ? norm(p.existingOwner) : null;
  const ownerEntry = owner ? contentRegistry[owner] : undefined;
  const gscData = owner ? gsc.get(owner) : undefined;
  const proposed = norm(p.canonicalPath);

  const proposedHasContent = !!contentRegistry[proposed];

  // Default: pillar's own migration decision is the source of truth.
  let decision: Decision = p.migrationDecision as Decision;
  let final = p.canonicalPath;
  let redirect = "no" as "yes" | "no";

  // Guard: if pillar says KEEP_EXISTING_CANONICAL but no owner exists, fall back.
  if (decision === "KEEP_EXISTING_CANONICAL" && !ownerEntry) {
    decision = "EVIDENCE_REVIEW";
    final = p.canonicalPath;
  }

  // If pillar is review/draft → NOINDEX/DRAFT.
  if (p.status === "review" || p.status === "draft") {
    decision = p.status === "review" ? "EVIDENCE_REVIEW" : "DRAFT";
  }

  // If pillar is retired → DRAFT.
  if (p.status === "retired") {
    decision = "DRAFT";
  }

  // If existing owner exists in content-registry and was published, treat as MERGE.
  if (owner && ownerEntry && ownerEntry.status === "published" && !ownerEntry.noindex) {
    final = owner;
    redirect = proposed !== owner ? "yes" : "no";
    // Strong equity beats any clean-slug contract.
    if ((gscData?.clicks ?? 0) > 0) {
      decision = "KEEP_EXISTING_CANONICAL";
    } else if (decision === "USE_PROPOSED" || decision === "MERGE") {
      decision = "MERGE";
    }
  }

  // Override for new pillars with no content yet.
  if (!ownerEntry && !proposedHasContent) {
    if (decision === "USE_PROPOSED") {
      decision = "EVIDENCE_REVIEW";
    }
  }

  return {
    pillar_id: p.id,
    group: p.group,
    display_name: p.label,
    proposed_path: p.canonicalPath,
    existing_owner: p.existingOwner ?? "",
    gsc_clicks: gscData?.clicks ?? 0,
    gsc_impressions: gscData?.impressions ?? 0,
    semantic_equivalent: p.description,
    decision,
    final_canonical: final,
    redirect_required: redirect,
    publication_status: p.status,
    notes: p.notes ?? "",
  };
}

function main() {
  const gsc = loadGscEquity();
  const rows: Row[] = PILLAR_REGISTRY.map((p) => decide(p, gsc));

  const header: Array<keyof Row> = [
    "pillar_id",
    "group",
    "display_name",
    "proposed_path",
    "existing_owner",
    "gsc_clicks",
    "gsc_impressions",
    "semantic_equivalent",
    "decision",
    "final_canonical",
    "redirect_required",
    "publication_status",
    "notes",
  ];

  const lines: string[] = [header.join(",")];
  for (const r of rows) {
    const cell = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    lines.push(header.map((h) => cell(r[h] as string | number)).join(","));
  }

  writeFileSync(OUTPUT_PATH, lines.join("\n") + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.log(`Wrote ${rows.length} rows to ${OUTPUT_PATH}`);

  // Summary
  const counts = new Map<Decision, number>();
  for (const r of rows) counts.set(r.decision, (counts.get(r.decision) ?? 0) + 1);
  // eslint-disable-next-line no-console
  console.log("Decision distribution:", Object.fromEntries(counts));
}

main();
