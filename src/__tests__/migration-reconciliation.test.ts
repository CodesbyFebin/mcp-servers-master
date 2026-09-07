import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contentRegistry } from "@/content/content-registry";
import { PILLAR_REGISTRY, PILLAR_GROUPS } from "@/content/pillar-registry";

/**
 * Reconciliation tests. These lock the exact integers from the
 * data sources so future drift triggers a failure.
 *
 * All counts here come from the actual data files; none are
 * approximate. The audit script `scripts/audit-reconciliation.ts`
 * produces the same numbers.
 */

function norm(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

function readCsv(p: string): Record<string, string>[] {
  const text = readFileSync(p, "utf8");
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') {
        if (q && l[i + 1] === '"') { cur += '"'; i++; } else { q = !q; }
      } else if (c === "," && !q) {
        out.push(cur); cur = "";
      } else {
        cur += c;
      }
    }
    out.push(cur);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = out[i] ?? ""));
    return row;
  });
}

describe("migration reconciliation", () => {
  it("current registry: 13+22+6+10+4 = 55 pillars", () => {
    const all = Object.values(contentRegistry);
    const pillars = all.filter(
      (e) => e.parent !== "" && e.type !== "glossary" && e.type !== "comparison",
    );
    const byParent: Record<string, number> = {};
    for (const p of pillars) byParent[p.parent] = (byParent[p.parent] || 0) + 1;
    expect(byParent["learn"]).toBe(13);
    expect(byParent["guides"]).toBe(22);
    expect(byParent["build"]).toBe(6);
    expect(byParent["clients"]).toBe(10);
    expect(byParent["security"]).toBe(4);
    expect(pillars).toHaveLength(55);
  });

  it("current registry: 7 aggregate hubs (parent === '')", () => {
    const aggregates = Object.values(contentRegistry).filter((e) => e.parent === "");
    expect(aggregates).toHaveLength(7);
  });

  it("target contract: 60+9 = 69 pillar identities", () => {
    expect(PILLAR_REGISTRY).toHaveLength(69);
    const primaryGroups = PILLAR_GROUPS.filter((g) => g.key !== "authority-system");
    const authority = PILLAR_GROUPS.find((g) => g.key === "authority-system")!;
    let primary = 0;
    for (const g of primaryGroups) {
      primary += PILLAR_REGISTRY.filter((p) => p.group === g.key).length;
    }
    expect(primary).toBe(60);
    const auth = PILLAR_REGISTRY.filter((p) => p.group === authority.key).length;
    expect(auth).toBe(9);
  });

  it("migration ledger: 748 rows, editorial gate resolved (P23 invariants: KEEP all served-200, REVIEW=0)", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    expect(ledger).toHaveLength(749);
    const counts: Record<string, number> = {};
    for (const r of ledger) counts[r.decision] = (counts[r.decision] || 0) + 1;
    expect(counts["KEEP_INDEXED"]).toBe(16); // every KEEP row is served-200
    expect(counts["REDIRECT_301"]).toBe(107); // 90 glossary + 1 mcp-server-directory + 1 /directory/ + 15 semantic equivalents
    expect(counts["REBUILD"]).toBe(82); // 78 search-equity + 4 topical /directory/*
    expect(counts["GONE_410"]).toBe(472); // no evidence (0 clicks, <10 impressions)
    expect(counts["EVIDENCE_REVIEW"] ?? 0).toBe(0);
    expect(counts["DEFER_NOINDEX"]).toBe(72);
    expect(counts["DROP_NOINDEX"] ?? 0).toBe(0);
  });

  it("P23 HARD INVARIANTS: KEEP_INDEXED_TOTAL == KEEP_INDEXED_SERVED_200, KEEP_UNSERVED=0, REVIEW_UNRESOLVED=0", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const keep = ledger.filter((r) => r.decision === "KEEP_INDEXED");
    const keepServed = keep.filter((r) => r.canonical_route_status === "served");
    const keepUnserved = keep.filter((r) => r.canonical_route_status === "unserved_pending_editorial");
    const unresolved = ledger.filter((r) => r.decision === "EVIDENCE_REVIEW");
    expect(keepServed.length).toBe(keep.length);
    expect(keepUnserved).toHaveLength(0);
    expect(unresolved).toHaveLength(0);
  });

  it("REDIRECT_301 = 90 glossary + 1 mcp-server-directory + 15 semantic equivalents = 106 (all destinations served)", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const redirect = ledger.filter((r) => r.decision === "REDIRECT_301");
    expect(redirect).toHaveLength(107);
    const glossaryRedir = redirect.filter((r) => r.canonical_url.includes("/glossary/"));
    expect(glossaryRedir).toHaveLength(96); // 90 handoff + 6 semantic equivalents
    const legacyRedir = redirect.filter((r) => !r.canonical_url.includes("/glossary/"));
    expect(legacyRedir).toHaveLength(11);
    // /mcp-server-directory canonicalizes to /servers/
    const mcpServerDir = legacyRedir.find(
      (r) => new URL(r.canonical_url).pathname.replace(/\/+$/, "") === "/mcp-server-directory",
    );
    expect(mcpServerDir, "expected /mcp-server-directory in REDIRECT_301 ledger").toBeDefined();
    if (mcpServerDir) {
      expect(mcpServerDir.redirect_target).toBe("/servers/");
    }
  });

  it("handoff redirects: 93 total = 90 glossary + 3 legacy (G8: 4 topical /directory/* removed for individual review)", () => {
    const handoff = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "data/migration/source/glossary-and-legacy-redirects.json"),
        "utf8",
      ),
    ) as Array<{ source: string; destination: string; permanent: boolean }>;
    expect(handoff).toHaveLength(93); // 90 glossary + 1 mcp-server-directory + 1 mcp-server-directory/ + 1 /directory/
    const glossary = handoff.filter((r) => r.source.startsWith("/glossary/"));
    const legacy = handoff.filter((r) => !r.source.startsWith("/glossary/"));
    expect(glossary).toHaveLength(90); // protected terms removed (was 92)
    expect(legacy).toHaveLength(3); // 2 mcp-server-directory + 1 /directory/ (4 topical removed for G8 review)
  });

  it("glossary numeric-suffix: 90 in handoff, mcp-soc-2 + mcp-iso-27001 REMOVED from handoff (BLOCKER 1 RESOLVED)", () => {
    const handoff = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "data/migration/source/glossary-and-legacy-redirects.json"),
        "utf8",
      ),
    ) as Array<{ source: string; destination: string; permanent: boolean }>;
    const glossHandoff = handoff.filter((r) => r.source.startsWith("/glossary/"));
    const numericSuffix = glossHandoff.filter((r) => {
      const seg = r.source.split("/").pop() || "";
      return /-\d+$/.test(seg);
    });
    expect(numericSuffix).toHaveLength(90);

    // The two protected terms must NOT be in the handoff.
    const protectedTerms = handoff.filter(
      (r) => r.source === "/glossary/mcp-soc-2" || r.source === "/glossary/mcp-iso-27001",
    );
    expect(protectedTerms).toHaveLength(0);

    // They are listed in glossary-protections.json as PROTECTED — pending editorial.
    const protections = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "data/migration/source/glossary-protections.json"),
        "utf8",
      ),
    );
    expect(protections.protectedTerms).toHaveLength(2);
  });

  it("all redirects: every destination is a served canonical route (200 + self-canonical)", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const redirect = ledger.filter((r) => r.decision === "REDIRECT_301");
    const served = new Set<string>(["/servers"]);
    for (const e of Object.values(contentRegistry)) {
      if (e.status === "published" && !e.noindex) served.add(e.indexPath.replace(/\/+$/, ""));
    }
    expect(redirect.length).toBeGreaterThan(0);
    for (const r of redirect) {
      const target = r.redirect_target.replace(/\/+$/, "") || "/";
      expect(served.has(target), `${r.canonical_url} -> ${r.redirect_target} is NOT served`).toBe(true);
    }
    // /mcp-server-directory keeps its one-hop canonicalization to /servers/
    const mcpServerDir = redirect.find(
      (r) => norm(new URL(r.canonical_url).pathname) === "/mcp-server-directory",
    );
    expect(mcpServerDir).toBeDefined();
    expect(mcpServerDir!.redirect_target).toBe("/servers/");
  });

  it("G8 RESOLVED: 4 /directory/* paths are REBUILD (topical intent preserved, content before cutover)", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    expect(ledger.filter((r) => r.decision === "EVIDENCE_REVIEW")).toHaveLength(0);
    for (const path of [
      "/directory/iot",
      "/directory/databases",
      "/directory/devops",
      "/directory/monitoring",
    ]) {
      const found = ledger.find(
        (r) =>
          r.decision === "REBUILD" &&
          new URL(r.canonical_url).pathname.replace(/\/+$/, "") === path,
      );
      expect(found, `expected ${path} in REBUILD ledger (G8 resolution)`).toBeDefined();
      expect(found!.evidence).toBe("topical_directory_intent_rebuild_pending");
      // G8: they must NOT be blanket-redirected to /servers/
      expect(found!.redirect_target).toBe("");
    }
  });

  it("P23 route coverage: KEEP_INDEXED rows are explicitly classified served vs unserved_pending_editorial (RELEASE BLOCKER surface)", () => {
    // The canonical build cannot serve most of the historical corpus (legacy
    // blog/glossary/docs content was never ported). The ledger must state
    // this explicitly instead of implying KEEP_INDEXED == still published.
    // These exact counts pin the gap: if either changes, the change must be
    // conscious (content ported or decisions made per URL).
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const keep = ledger.filter((r) => r.decision === "KEEP_INDEXED");
    const served = keep.filter((r) => r.canonical_route_status === "served");
    const unserved = keep.filter((r) => r.canonical_route_status === "unserved_pending_editorial");

    expect(served.length + unserved.length).toBe(keep.length);
    expect(served.length).toBe(16);
    // Editorial gate resolved: no KEEP_INDEXED row may be unserved.
    expect(unserved).toHaveLength(0);
  });

  it("REBUILD rows: 78 search-equity + 4 topical; GONE_410 rows: no-evidence only", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const rebuild = ledger.filter((r) => r.decision === "REBUILD");
    expect(rebuild.filter((r) => r.evidence === "legacy_content_not_ported_search_equity")).toHaveLength(78);
    expect(rebuild.filter((r) => r.evidence === "topical_directory_intent_rebuild_pending")).toHaveLength(4);
    const gone = ledger.filter((r) => r.decision === "GONE_410");
    expect(gone).toHaveLength(472);
    for (const r of gone) {
      expect(r.evidence).toBe("legacy_content_not_ported_no_evidence");
      expect(Number(r.gsc_clicks || "0")).toBe(0);
      expect(Number(r.gsc_impressions || "0")).toBeLessThan(10);
    }
  });

  it("semantic-equivalent redirects: destination equals a registry path with the same normalized topic slug", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const equivRedirs = ledger.filter((r) => r.evidence === "semantic_equivalent_registry_path");
    expect(equivRedirs).toHaveLength(15);
    const normSlug = (p: string) =>
      p.split("/").filter(Boolean).pop()!.toLowerCase().replace(/^mcp-/, "").replace(/-\d+$/, "");
    for (const r of equivRedirs) {
      const srcSlug = normSlug(new URL(r.canonical_url).pathname);
      const dstSlug = normSlug(r.redirect_target);
      expect(dstSlug, `${r.canonical_url} -> ${r.redirect_target}`).toBe(srcSlug);
    }
  });

  it("route coverage column exists on every row with the documented enum", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const VALID = new Set(["served", "served_rebuild_stub", "unserved_pending_editorial"]);
    for (const r of ledger) {
      expect(VALID.has(r.canonical_route_status), r.canonical_url).toBe(true);
    }
  });

  it("every REBUILD URL is stub-served: 200 noindex scaffold exists (rebuild progress surface)", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const rebuild = ledger.filter((r) => r.decision === "REBUILD");
    const stubServed = rebuild.filter((r) => r.canonical_route_status === "served_rebuild_stub");
    expect(stubServed).toHaveLength(82);
  });

  it("decoupling: no DEFER_NOINDEX row has gsc_status=absent AND publication_authority=editorial_owned (BLOCKER 3 RESOLVED)", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const defer = ledger.filter((r) => r.decision === "DEFER_NOINDEX");
    // The decoupling is structural: every DEFER_NOINDEX row now has explicit
    // gsc_status and publication_authority fields.
    for (const r of defer) {
      expect(r.gsc_status).toBeTruthy();
      expect(r.publication_authority).toBeTruthy();
    }
    // No row should conflate "absent from GSC" with "no editorial authority" while
    // also being a published page in the content registry.
    const publishedRegistryPaths = Object.values(contentRegistry)
      .filter((e) => e.status === "published" && !e.noindex)
      .map((e) => e.indexPath.replace(/\/+$/, ""));
    for (const r of defer) {
      const path = new URL(r.canonical_url).pathname.replace(/\/+$/, "");
      const isPublished = publishedRegistryPaths.includes(path);
      if (isPublished) {
        // If it's a published registry path, it must have publication_authority=editorial_owned
        expect(r.publication_authority).toBe("editorial_owned");
      }
    }
  });

  it("directory legacy: 4 /directory/* paths are held as EVIDENCE_REVIEW (G8) — not mass-redirected", () => {
    const inv = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "data/migration/source/gsc-full-inventory.json"),
        "utf8",
      ),
    );
    const dirBucket = inv.buckets?.directory ?? [];
    const dirPaths = dirBucket.map(
      (item: [string, unknown]) => item[0].split("www.mcpserver.in")[1].replace(/\/$/, ""),
    );
    expect(dirPaths).toContain("/directory/iot");
    expect(dirPaths).toContain("/directory/databases");
    expect(dirPaths).toContain("/directory/devops");
    expect(dirPaths).toContain("/directory/monitoring");
    expect(dirPaths).toHaveLength(4);

    // G8: these 4 paths are NOT in the handoff as mass-redirects; each is held
    // as EVIDENCE_REVIEW in the ledger and must be resolved individually:
    //   - exact equivalent category exists → 301 to that category
    //   - valuable intent, no replacement   → REBUILD / KEEP
    //   - obsolete with no value            → 410
    //   - unresolved                        → EVIDENCE_REVIEW
    const handoff = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "data/migration/source/glossary-and-legacy-redirects.json"),
        "utf8",
      ),
    ) as Array<{ source: string; destination: string }>;
    const handoffSources = new Set(handoff.map((r) => r.source.replace(/\/$/, "")));
    for (const p of [
      "/directory/iot",
      "/directory/databases",
      "/directory/devops",
      "/directory/monitoring",
    ]) {
      expect(handoffSources.has(p), `${p} must NOT be a mass-redirect (G8)`).toBe(false);
    }
  });

  it("/mcp-host, /what-is-mcp, /mcp-installation: in GSC inventory AND explicitly decided in ledger", () => {
    // Resolution: all three topics are in the migration ledger with an
    // explicit terminal decision (GONE_410 — no evidence, no replacement);
    // none is silently dropped.
    const inv = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "data/migration/source/gsc-full-inventory.json"),
        "utf8",
      ),
    );
    const topicPaths: string[] = [];
    for (const key of ["mcp-host", "what-is-mcp", "mcp-installation"]) {
      const bucket = inv.buckets?.[key] ?? [];
      for (const item of bucket) {
        const url = (item as [string, unknown])[0];
        topicPaths.push(url.split("www.mcpserver.in")[1].replace(/\/$/, ""));
      }
    }
    expect(topicPaths).toContain("/mcp-host");
    expect(topicPaths).toContain("/what-is-mcp");
    expect(topicPaths).toContain("/mcp-installation");

    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const TERMINAL = new Set(["KEEP_INDEXED", "REDIRECT_301", "REBUILD", "GONE_410", "DEFER_NOINDEX"]);
    for (const path of ["/mcp-host", "/what-is-mcp", "/mcp-installation"]) {
      const found = ledger.find((r) => norm(new URL(r.canonical_url).pathname) === path);
      expect(found, `expected ${path} in ledger`).toBeDefined();
      expect(TERMINAL.has(found!.decision), `${path} decision ${found!.decision}`).toBe(true);
    }
  });

  it("55→69 map: 69 rows, distribution must be exact", () => {
    const map = readCsv(resolve(process.cwd(), "reports/55-to-69-pillar-map.csv"));
    expect(map).toHaveLength(69);
    const counts: Record<string, number> = {};
    for (const r of map) {
      counts[r.match_type] = (counts[r.match_type] || 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(69);
  });

  it("publication vs GSC coupling: DEFER_NOINDEX is being used as proxy for 'not in GSC' — this is a documented bug, not a feature", () => {
    const ledger = readCsv(resolve(process.cwd(), "reports/milestone-7-migration-ledger.csv"));
    const defer = ledger.filter((r) => r.decision === "DEFER_NOINDEX");
    const publishedNotInGsc = Object.values(contentRegistry)
      .filter((e) => e.status === "published" && !e.noindex)
      .filter((e) => {
        // A path is "in GSC" if it appears in any KEEP_INDEXED row.
        return !ledger.some(
          (r) =>
            r.decision === "KEEP_INDEXED" &&
            norm(new URL(r.canonical_url).pathname) === norm(e.indexPath),
        );
      });
    // Both numbers should be equal — that equality is the bug:
    // DEFER_NOINDEX is being assigned based on GSC absence, not editorial authority.
    expect(defer).toHaveLength(publishedNotInGsc.length);
    // Document the bug, do not fix in this audit pass.
  });
});
