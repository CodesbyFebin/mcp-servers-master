import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PILLAR_GROUPS, PILLAR_REGISTRY, getPillarsByGroup } from "@/content/pillar-registry";

/**
 * P8 — 69-pillar integration final check.
 *
 * The header must derive pillar navigation from the pillar registry (the
 * same source /pillars renders from). Draft/review pillars must never leak
 * into public navigation. No hardcoded pillar arrays.
 */

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf-8");

describe("P8: header uses registry-derived pillar groups", () => {
  const headerSource = read("src/components/layout/SiteHeader.tsx");

  it("header imports PILLAR_GROUPS from the pillar registry", () => {
    expect(headerSource).toContain('from "@/content/pillar-registry"');
    expect(headerSource).toContain("PILLAR_GROUPS.map");
  });

  it("header does not hardcode pillar names or group labels", () => {
    // Group labels must come from the registry, not be repeated in JSX.
    for (const g of PILLAR_GROUPS) {
      expect(headerSource.includes(g.label), `hardcoded label: ${g.label}`).toBe(false);
    }
    // No individual pillar labels hardcoded either.
    for (const p of PILLAR_REGISTRY.slice(0, 10)) {
      expect(headerSource.includes(p.label), `hardcoded pillar: ${p.label}`).toBe(false);
    }
  });

  it("header group anchors resolve to real ids on /pillars", () => {
    // Every group link /pillars#key must match a section id rendered on /pillars.
    const pillarsSource = read("app/pillars/page.tsx");
    expect(pillarsSource).toContain('id={group.key}');
    expect(headerSource).toContain('href={`/pillars#${group.key}`}');
    expect(PILLAR_GROUPS.length).toBeGreaterThan(0);
  });

  it("layout renders the registry-derived header", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("<SiteHeader />");
  });
});

describe("P8: pillar publication gating", () => {
  it("every pillar id is unique across all 69 pillars", () => {
    expect(new Set(PILLAR_REGISTRY.map((p) => p.id)).size).toBe(PILLAR_REGISTRY.length);
  });

  it("every pillar canonicalPath is unique (no duplicate canonical ownership)", () => {
    const paths = PILLAR_REGISTRY.map((p) => p.canonicalPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("group counts match expected counts (6x10 + 9 authority pillars)", () => {
    for (const g of PILLAR_GROUPS) {
      expect(getPillarsByGroup(g.key)).toHaveLength(g.expectedCount);
    }
  });
});
