import { describe, it, expect } from "vitest";
import type { ServerEntry } from "@/content/server-registry";
import {
  DEFAULT_PARAMS,
  PAGE_SIZE,
  deriveFilterOptions,
  discover,
  discoveryParamsToQueryString,
  hasActiveFilters,
  parseDiscoveryParams,
} from "@/lib/server-discovery";

/**
 * P2 — /servers discovery engine logic tests.
 *
 * The public cohort is currently empty (zero-fabrication contract), so these
 * tests run the engine against synthetic fixture entries. They prove the
 * filter/sort/pagination behavior that will govern the real cohort once
 * verified servers exist. No fabricated metric (stars, ratings, usage) is
 * ever a sort or filter input.
 */

function fixture(overrides: Partial<ServerEntry> & { id: string }): ServerEntry {
  return {
    type: "server",
    name: overrides.id,
    description: "A test MCP server",
    slug: overrides.id,
    version: "1.0.0",
    capabilities: [],
    tags: [],
    evidence: [],
    evidenceRefs: ["ev-1"],
    verificationStatus: "verified",
    publicationStatus: "published",
    creator: "test-publisher",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    indexPath: `/servers/${overrides.id}`,
    isVerified: true,
    ...overrides,
  } as ServerEntry;
}

const SERVERS: ServerEntry[] = [
  fixture({
    id: "alpha",
    name: "Alpha Server",
    description: "Database access server",
    tags: ["database", "sql"],
    categories: ["databases"],
    capabilities: ["tools"],
    transports: ["stdio"],
    authentication: ["api-key"],
    creator: "Acme",
    updatedAt: "2026-03-01T00:00:00Z",
  }),
  fixture({
    id: "bravo",
    name: "Bravo Server",
    description: "Filesystem server",
    tags: ["files"],
    categories: ["devops"],
    capabilities: ["resources", "tools"],
    transports: ["streamable-http"],
    authentication: ["oauth"],
    creator: "BetaCo",
    updatedAt: "2026-05-01T00:00:00Z",
  }),
  fixture({
    id: "charlie",
    name: "Charlie Server",
    description: "Monitoring and observability server",
    tags: ["monitoring", "metrics"],
    categories: ["monitoring"],
    capabilities: ["prompts"],
    transports: ["stdio"],
    authentication: ["none"],
    creator: "Acme",
    updatedAt: "2026-04-01T00:00:00Z",
  }),
];

describe("parseDiscoveryParams", () => {
  it("returns defaults for empty input", () => {
    expect(parseDiscoveryParams(new URLSearchParams())).toEqual(DEFAULT_PARAMS);
  });

  it("parses all fields from a query string", () => {
    const sp = new URLSearchParams(
      "q=data&category=databases&capability=tools&transport=stdio&auth=api-key&publisher=Acme&verification=verified&sort=name-desc&page=3",
    );
    const p = parseDiscoveryParams(sp);
    expect(p).toEqual({
      q: "data",
      category: "databases",
      capability: "tools",
      transport: "stdio",
      auth: "api-key",
      publisher: "Acme",
      verification: "verified",
      sort: "name-desc",
      page: 3,
    });
  });

  it("rejects invalid sort values", () => {
    const p = parseDiscoveryParams(new URLSearchParams("sort=most-popular"));
    expect(p.sort).toBe(DEFAULT_PARAMS.sort);
  });

  it("clamps invalid page numbers to 1", () => {
    expect(parseDiscoveryParams(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseDiscoveryParams(new URLSearchParams("page=-5")).page).toBe(1);
    expect(parseDiscoveryParams(new URLSearchParams("page=abc")).page).toBe(1);
  });

  it("truncates overlong search queries", () => {
    const p = parseDiscoveryParams(new URLSearchParams(`q=${"x".repeat(500)}`));
    expect(p.q.length).toBe(200);
  });

  it("accepts Next.js-style param records", () => {
    const p = parseDiscoveryParams({ q: "data", page: ["2"], other: undefined });
    expect(p.q).toBe("data");
    expect(p.page).toBe(2);
  });
});

describe("discoveryParamsToQueryString", () => {
  it("serializes non-default params", () => {
    const qs = discoveryParamsToQueryString({ ...DEFAULT_PARAMS, q: "data", page: 2 });
    expect(qs).toBe("?q=data&page=2");
  });

  it("omits all defaults (empty string)", () => {
    expect(discoveryParamsToQueryString(DEFAULT_PARAMS)).toBe("");
  });

  it("round-trips through parseDiscoveryParams", () => {
    const original = { ...DEFAULT_PARAMS, q: "monitor", sort: "updated-desc" as const, page: 2 };
    const parsed = parseDiscoveryParams(new URLSearchParams(discoveryParamsToQueryString(original).slice(1)));
    expect(parsed).toEqual(original);
  });
});

describe("discover: keyword search", () => {
  it("matches name", () => {
    expect(discover(SERVERS, { ...DEFAULT_PARAMS, q: "bravo" }).total).toBe(1);
  });

  it("matches description", () => {
    expect(discover(SERVERS, { ...DEFAULT_PARAMS, q: "filesystem" }).items[0]?.id).toBe("bravo");
  });

  it("matches tags case-insensitively", () => {
    expect(discover(SERVERS, { ...DEFAULT_PARAMS, q: "METRICS" }).items[0]?.id).toBe("charlie");
  });

  it("returns zero results for unmatched keywords (zero-results state)", () => {
    const r = discover(SERVERS, { ...DEFAULT_PARAMS, q: "nonexistent-xyz" });
    expect(r.total).toBe(0);
    expect(r.items).toHaveLength(0);
    expect(r.totalPages).toBe(1);
    expect(r.page).toBe(1);
  });
});

describe("discover: filters", () => {
  it("filters by category", () => {
    const r = discover(SERVERS, { ...DEFAULT_PARAMS, category: "databases" });
    expect(r.items.map((s) => s.id)).toEqual(["alpha"]);
  });

  it("filters by capability", () => {
    const r = discover(SERVERS, { ...DEFAULT_PARAMS, capability: "resources" });
    expect(r.items.map((s) => s.id)).toEqual(["bravo"]);
  });

  it("filters by transport", () => {
    const r = discover(SERVERS, { ...DEFAULT_PARAMS, transport: "stdio" });
    expect(r.total).toBe(2);
  });

  it("filters by authentication", () => {
    const r = discover(SERVERS, { ...DEFAULT_PARAMS, auth: "oauth" });
    expect(r.items.map((s) => s.id)).toEqual(["bravo"]);
  });

  it("filters by publisher", () => {
    const r = discover(SERVERS, { ...DEFAULT_PARAMS, publisher: "Acme" });
    expect(r.total).toBe(2);
  });

  it("composes filters (AND semantics)", () => {
    const r = discover(SERVERS, { ...DEFAULT_PARAMS, publisher: "Acme", category: "monitoring" });
    expect(r.items.map((s) => s.id)).toEqual(["charlie"]);
  });

  it("verification filter keeps only verified entries", () => {
    const unverified = [...SERVERS, fixture({ id: "delta", isVerified: false })];
    const r = discover(unverified, { ...DEFAULT_PARAMS, verification: "verified" });
    expect(r.items.some((s) => s.id === "delta")).toBe(false);
  });
});

describe("discover: sorting", () => {
  it("sorts by name ascending by default", () => {
    expect(discover(SERVERS, DEFAULT_PARAMS).items.map((s) => s.id)).toEqual([
      "alpha",
      "bravo",
      "charlie",
    ]);
  });

  it("sorts by name descending", () => {
    expect(discover(SERVERS, { ...DEFAULT_PARAMS, sort: "name-desc" }).items.map((s) => s.id)).toEqual([
      "charlie",
      "bravo",
      "alpha",
    ]);
  });

  it("sorts by recently updated", () => {
    expect(discover(SERVERS, { ...DEFAULT_PARAMS, sort: "updated-desc" }).items.map((s) => s.id)).toEqual([
      "bravo",
      "charlie",
      "alpha",
    ]);
  });

  it("sorts by oldest update", () => {
    expect(discover(SERVERS, { ...DEFAULT_PARAMS, sort: "updated-asc" }).items.map((s) => s.id)).toEqual([
      "alpha",
      "charlie",
      "bravo",
    ]);
  });
});

describe("discover: pagination", () => {
  const many = Array.from({ length: PAGE_SIZE * 2 + 5 }, (_, i) =>
    fixture({ id: `server-${String(i).padStart(3, "0")}` }),
  );

  it("paginates at PAGE_SIZE", () => {
    const r = discover(many, DEFAULT_PARAMS);
    expect(r.total).toBe(many.length);
    expect(r.totalPages).toBe(3);
    expect(r.items).toHaveLength(PAGE_SIZE);
  });

  it("returns the requested page", () => {
    const r = discover(many, { ...DEFAULT_PARAMS, page: 2 });
    expect(r.page).toBe(2);
    expect(r.items[0]?.id).toBe("server-024");
  });

  it("clamps out-of-range pages into the valid range", () => {
    expect(discover(many, { ...DEFAULT_PARAMS, page: 99 }).page).toBe(3);
    expect(discover(many, { ...DEFAULT_PARAMS, page: -1 }).page).toBe(1);
  });

  it("the last page carries the remainder", () => {
    const r = discover(many, { ...DEFAULT_PARAMS, page: 3 });
    expect(r.items).toHaveLength(5);
  });
});

describe("deriveFilterOptions", () => {
  it("derives sorted unique option values from the cohort", () => {
    const o = deriveFilterOptions(SERVERS);
    expect(o.categories).toEqual(["databases", "devops", "monitoring"]);
    expect(o.capabilities).toEqual(["prompts", "resources", "tools"]);
    expect(o.transports).toEqual(["stdio", "streamable-http"]);
    expect(o.authMethods).toEqual(["api-key", "none", "oauth"]);
    expect(o.publishers).toEqual(["Acme", "BetaCo"]);
  });

  it("derives nothing from an empty cohort (no fabricated facets)", () => {
    const o = deriveFilterOptions([]);
    expect(o).toEqual({
      categories: [],
      capabilities: [],
      transports: [],
      authMethods: [],
      publishers: [],
    });
  });
});

describe("hasActiveFilters", () => {
  it("false for defaults", () => {
    expect(hasActiveFilters(DEFAULT_PARAMS)).toBe(false);
  });

  it("true when any filter is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_PARAMS, q: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_PARAMS, page: 2 })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_PARAMS, sort: "name-desc" })).toBe(true);
  });
});
