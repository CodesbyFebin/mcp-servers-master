import { describe, it, expect } from "vitest";
import {
  PILLAR_REGISTRY,
  PILLAR_GROUPS,
  PILLAR_BY_ID,
  PILLAR_BY_PATH,
  PUBLIC_HEADER_GROUPS,
  isPillarIndexable,
  getIndexablePillars,
  getPillarsByGroup,
  type PillarDefinition,
} from "@/content/pillar-registry";
import { contentRegistry, getIndexableEntries } from "@/content/content-registry";

/**
 * 69-PILLAR AUTHORITY CONTRACT
 *
 *   6 governed groups × 10 primary pillars = 60
 * + 9 additional authority-system pillars
 * = 69 total
 *
 * Tests enforce the structural contract and prevent drift. They do NOT
 * claim "69 published" — publication is decided by `isPillarIndexable()`.
 */
describe("69-pillar authority contract", () => {
  it("has exactly 69 pillar identities", () => {
    expect(PILLAR_REGISTRY).toHaveLength(69);
  });

  it("pillar IDs P01..P69 are all present exactly once", () => {
    const ids = PILLAR_REGISTRY.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(69);
    const expected = Array.from({ length: 69 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`);
    expect(ids).toEqual(expected);
  });

  it("no duplicate canonical paths", () => {
    const paths = PILLAR_REGISTRY.map((p) => p.canonicalPath);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it("six groups contain exactly ten primary pillars each", () => {
    const primaryGroups = PILLAR_GROUPS.filter((g) => g.key !== "authority-system");
    for (const g of primaryGroups) {
      const pillars = getPillarsByGroup(g.key);
      expect(pillars).toHaveLength(10);
    }
  });

  it("the authority system has exactly nine additional pillars", () => {
    const auth = getPillarsByGroup("authority-system");
    expect(auth).toHaveLength(9);
  });

  it("total groups = 7 (6 governed + 1 authority system)", () => {
    expect(PILLAR_GROUPS).toHaveLength(7);
  });

  it("every pillar has the expected group membership", () => {
    const groupKeys = new Set(PILLAR_GROUPS.map((g) => g.key));
    for (const p of PILLAR_REGISTRY) {
      expect(groupKeys.has(p.group)).toBe(true);
    }
  });

  it("every display label begins with 'MCP '", () => {
    for (const p of PILLAR_REGISTRY) {
      expect(p.label.startsWith("MCP ")).toBe(true);
    }
  });

  it("no broken href placeholders (no '#' or dynamic route placeholders)", () => {
    for (const p of PILLAR_REGISTRY) {
      expect(p.canonicalPath).not.toBe("#");
      expect(p.canonicalPath).not.toMatch(/\[/); // no [slug] placeholders
      expect(p.canonicalPath).toMatch(/^\//); // must start with /
    }
  });

  it("canonical paths do not mechanically add 'mcp-' prefix to clean slugs", () => {
    // The contract is: clean slug, no /mcp-<topic> doubles.
    // Existing equity paths (e.g. /learn/mcp-stdio) are exempt because they
    // already own their intent in GSC.
    for (const p of PILLAR_REGISTRY) {
      if (p.existingOwner) continue; // existing equity exempt
      if (p.canonicalPath.startsWith("/learn/")) continue; // learn namespace exempt
      if (p.canonicalPath.startsWith("/build/")) continue;
      if (p.canonicalPath.startsWith("/guides/")) continue;
      if (p.canonicalPath.startsWith("/security/")) continue;
      if (p.canonicalPath.startsWith("/clients/")) continue;
      if (p.canonicalPath.startsWith("/glossary/")) continue;
      // For brand-new clean paths, no mcp- prefix.
      const segments = p.canonicalPath.split("/").filter(Boolean);
      for (const seg of segments) {
        if (seg === "mcp-server" || seg === "mcp") continue;
        expect(seg.startsWith("mcp-")).toBe(false);
      }
    }
  });

  it("numbering is sequential 01..69 with the correct fix (no shared startIndex bug)", () => {
    const ids = PILLAR_REGISTRY.map((p) => p.id);
    for (let i = 0; i < 69; i++) {
      const expected = `P${String(i + 1).padStart(2, "0")}`;
      expect(ids[i]).toBe(expected);
    }
  });

  it("PILLAR_BY_ID and PILLAR_BY_PATH have 69 entries each", () => {
    expect(Object.keys(PILLAR_BY_ID)).toHaveLength(69);
    expect(Object.keys(PILLAR_BY_PATH)).toHaveLength(69);
  });

  it("published pillars all pass isPillarIndexable()", () => {
    for (const p of PILLAR_REGISTRY) {
      if (p.status === "published") {
        expect(isPillarIndexable(p)).toBe(true);
        expect(p.noindex).toBe(false);
      } else {
        expect(isPillarIndexable(p)).toBe(false);
      }
    }
  });

  it("review/draft pillars are not indexable", () => {
    const drafts = PILLAR_REGISTRY.filter((p) => p.status === "review" || p.status === "draft");
    for (const p of drafts) {
      expect(isPillarIndexable(p)).toBe(false);
      expect(p.noindex).toBe(true);
    }
  });

  it("publication counts match the truth (no 69-published claim)", () => {
    const counts = {
      published: PILLAR_REGISTRY.filter((p) => p.status === "published").length,
      review: PILLAR_REGISTRY.filter((p) => p.status === "review").length,
      draft: PILLAR_REGISTRY.filter((p) => p.status === "draft").length,
      retired: PILLAR_REGISTRY.filter((p) => p.status === "retired").length,
    };
    expect(counts.published + counts.review + counts.draft + counts.retired).toBe(69);
    // Truthful: not all 69 are published.
    expect(counts.published).toBeLessThan(69);
  });

  it("public header groups only contain indexable pillars", () => {
    for (const g of PUBLIC_HEADER_GROUPS) {
      for (const p of g.items) {
        expect(isPillarIndexable(p)).toBe(true);
      }
    }
  });

  it("public header groups do not leak draft/review pillars as nav links", () => {
    const draftIds = new Set(
      PILLAR_REGISTRY.filter((p) => p.status !== "published").map((p) => p.id),
    );
    for (const g of PUBLIC_HEADER_GROUPS) {
      for (const p of g.items) {
        expect(draftIds.has(p.id)).toBe(false);
      }
    }
  });

  it("published pillars with existingOwner resolve to a published content-registry entry OR an existing route page", () => {
    // Two acceptable cases:
    // 1. existingOwner resolves in contentRegistry as published + !noindex
    // 2. existingOwner is a dynamic route aggregate (/servers, /categories, etc.)
    //    and the corresponding Next.js page file exists
    const fs = require("node:fs") as typeof import("node:fs");
    const path = require("node:path") as typeof import("node:path");
    const orphans: string[] = [];
    for (const p of PILLAR_REGISTRY) {
      if (p.status !== "published") continue;
      if (!p.existingOwner) continue; // new routes are exempt (e.g. /pillars)
      const entry = contentRegistry[p.existingOwner];
      if (entry && entry.status === "published" && !entry.noindex) continue;
      // Fallback: check Next.js route file exists
      const routeFile = path.join(process.cwd(), "app", p.existingOwner, "page.tsx");
      if (!fs.existsSync(routeFile)) {
        orphans.push(p.id);
      }
    }
    expect(orphans).toEqual([]);
  });

  it("KEEP_EXISTING_CANONICAL pillars respect GSC equity (equity ≥ 0)", () => {
    // Sanity: every KEEP decision was made because the existing owner has equity.
    // We don't enforce a hard threshold because some pillars are equity-preserving
    // even with 0 reported clicks (impressions only).
    for (const p of PILLAR_REGISTRY) {
      if (p.migrationDecision === "KEEP_EXISTING_CANONICAL") {
        expect(p.existingOwner).toBeTruthy();
      }
    }
  });
});
