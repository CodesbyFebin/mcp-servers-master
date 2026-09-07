import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchDocs, type SearchDoc } from "@/lib/search-index";
import { getIndexableEntries } from "@/content/content-registry";
import { getIndexableServers } from "@/content/server-registry";

/**
 * P5 — /search surface tests.
 *
 * The search index is a projection of the public indexable cohorts ONLY.
 * These tests block draft/noindex/unverified leakage and verify result
 * shape (title, type, snippet, canonical URL).
 */

const docs = buildSearchIndex();

describe("search index construction", () => {
  it("contains exactly the indexable editorial + server cohorts", () => {
    const expected =
      getIndexableEntries().length + getIndexableServers().length;
    expect(docs.length).toBe(expected);
  });

  it("every doc exposes title, type, snippet, canonical URL", () => {
    for (const d of docs) {
      expect(d.title, JSON.stringify(d)).toBeTruthy();
      expect(d.type).toBeTruthy();
      expect(d.snippet).toBeTruthy();
      expect(d.url.startsWith("/"), d.url).toBe(true);
    }
  });

  it("server docs carry verification state and are indexable-only", () => {
    const serverDocs = docs.filter((d) => d.type === "server");
    expect(serverDocs.length).toBe(getIndexableServers().length);
    for (const d of serverDocs) {
      expect(d.verification).toBe("verified");
    }
  });

  it("searchable text contains no unverified server names", () => {
    // mcp-server-postgres is unverified → must not appear in the index
    const leaked = docs.filter((d) => d.url.includes("mcp-server-postgres"));
    expect(leaked).toHaveLength(0);
  });
});

describe("searchDocs matching", () => {
  it("returns empty for blank query", () => {
    expect(searchDocs(docs, "")).toEqual([]);
    expect(searchDocs(docs, "   ")).toEqual([]);
  });

  it("matches a known published editorial entry", () => {
    const entries = getIndexableEntries();
    if (entries.length === 0) return; // cohort may be empty; nothing to assert
    const target = entries[0];
    const r = searchDocs(docs, target.h1);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]!.url).toBe(target.indexPath);
  });

  it("zero-results state is reachable with a nonsense query", () => {
    expect(searchDocs(docs, "zzzqqqxyzzy-no-such-content")).toEqual([]);
  });

  it("ranked results respect the limit", () => {
    const few = searchDocs(
      docs,
      "mcp",
      5,
    );
    expect(few.length).toBeLessThanOrEqual(5);
  });
});

describe("raw inventory leakage guard", () => {
  it("docs never include draft or noindex entries", () => {
    // The index is built solely from getIndexableEntries(): every non-server
    // doc URL must belong to the indexable editorial cohort.
    const indexablePaths = new Set(getIndexableEntries().map((e) => e.indexPath));
    for (const d of docs) {
      if (d.type !== "server") {
        expect(indexablePaths.has(d.url), `${d.url} not in indexable cohort`).toBe(true);
      }
    }
  });
});
