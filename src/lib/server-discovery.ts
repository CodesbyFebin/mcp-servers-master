import type { ServerEntry } from "@/content/server-registry";

/**
 * /servers discovery engine — pure filter/sort/pagination logic (P2).
 *
 * Constraints (publication doctrine):
 * - Only filter/sort on values derived from verified public data.
 * - NEVER rank by stars, popularity, ratings, usage, or downloads — no such
 *   verified metric exists. Sorting is limited to name (alphabetical) and
 *   last-updated (registry timestamp).
 * - This module is pure: no React, no routing, no I/O. The UI layer persists
 *   state to the query string; the page feeds it the indexable cohort only.
 */

export const DISCOVERY_SORTS = ["name-asc", "name-desc", "updated-desc", "updated-asc"] as const;
export type DiscoverySort = (typeof DISCOVERY_SORTS)[number];

export const PAGE_SIZE = 24;

export interface DiscoveryParams {
  /** Keyword: matches name, description, tags (case-insensitive substring) */
  q: string;
  category: string;
  capability: string;
  transport: string;
  auth: string;
  publisher: string;
  verification: "" | "verified";
  sort: DiscoverySort;
  page: number;
}

export const DEFAULT_PARAMS: DiscoveryParams = {
  q: "",
  category: "",
  capability: "",
  transport: "",
  auth: "",
  publisher: "",
  verification: "",
  sort: "name-asc",
  page: 1,
};

export interface DiscoveryOptions {
  categories: string[];
  capabilities: string[];
  transports: string[];
  authMethods: string[];
  publishers: string[];
}

function toList(value: string | null | undefined): string[] {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Parse and sanitize query-string params into DiscoveryParams. */
export function parseDiscoveryParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): DiscoveryParams {
  const get = (key: string): string[] => {
    if (input instanceof URLSearchParams) return toList(input.get(key));
    const v = input[key];
    if (v === undefined) return [];
    return Array.isArray(v) ? v.flatMap(toList) : toList(v);
  };
  const first = (key: string): string => get(key)[0] ?? "";

  const sortRaw = first("sort") as DiscoverySort;
  const sort: DiscoverySort = DISCOVERY_SORTS.includes(sortRaw) ? sortRaw : DEFAULT_PARAMS.sort;

  const pageRaw = Number.parseInt(first("page") || "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const verificationRaw = first("verification");
  const verification: DiscoveryParams["verification"] =
    verificationRaw === "verified" ? "verified" : "";

  return {
    q: first("q").slice(0, 200),
    category: first("category").slice(0, 100),
    capability: first("capability").slice(0, 100),
    transport: first("transport").slice(0, 100),
    auth: first("auth").slice(0, 100),
    publisher: first("publisher").slice(0, 100),
    verification,
    sort,
    page,
  };
}

/** Serialize params back to a query string (omitting defaults). */
export function discoveryParamsToQueryString(p: DiscoveryParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  if (p.capability) sp.set("capability", p.capability);
  if (p.transport) sp.set("transport", p.transport);
  if (p.auth) sp.set("auth", p.auth);
  if (p.publisher) sp.set("publisher", p.publisher);
  if (p.verification) sp.set("verification", p.verification);
  if (p.sort !== DEFAULT_PARAMS.sort) sp.set("sort", p.sort);
  if (p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Filter option values, derived ONLY from the given (indexable) cohort. */
export function deriveFilterOptions(servers: ServerEntry[]): DiscoveryOptions {
  const uniqSorted = (values: Iterable<string | null | undefined>): string[] =>
    [...new Set([...values].filter((v): v is string => Boolean(v)))].sort((a, b) =>
      a.localeCompare(b),
    );

  return {
    categories: uniqSorted(servers.flatMap((s) => s.categories ?? [])),
    capabilities: uniqSorted(servers.flatMap((s) => s.capabilities ?? [])),
    transports: uniqSorted(servers.flatMap((s) => s.transports ?? [])),
    authMethods: uniqSorted(servers.flatMap((s) => s.authentication ?? [])),
    publishers: uniqSorted(servers.map((s) => s.creator)),
  };
}

function matchesKeyword(server: ServerEntry, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [server.name, server.description, ...server.tags].join(" ").toLowerCase();
  return haystack.includes(needle);
}

function hasFilterValue(
  value: string | string[] | null | undefined,
  filter: string,
): boolean {
  if (!filter) return true;
  if (Array.isArray(value)) return value.includes(filter);
  return value === filter;
}

export interface DiscoveryResult {
  items: ServerEntry[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

/** Filter + sort + paginate in one call. Page is clamped to a valid range. */
export function discover(servers: ServerEntry[], params: DiscoveryParams): DiscoveryResult {
  const filtered = servers.filter((s) => {
    if (!matchesKeyword(s, params.q)) return false;
    if (!hasFilterValue(s.categories, params.category)) return false;
    if (!hasFilterValue(s.capabilities, params.capability)) return false;
    if (!hasFilterValue(s.transports, params.transport)) return false;
    if (!hasFilterValue(s.authentication, params.auth)) return false;
    if (params.publisher && s.creator !== params.publisher) return false;
    if (params.verification === "verified" && !s.isVerified) return false;
    return true;
  });

  const byString = (a: string, b: string) => a.localeCompare(b);
  const sorted = [...filtered].sort((a, b) => {
    switch (params.sort) {
      case "name-desc":
        return byString(b.name, a.name);
      case "updated-desc":
        return b.updatedAt.localeCompare(a.updatedAt);
      case "updated-asc":
        return a.updatedAt.localeCompare(b.updatedAt);
      case "name-asc":
      default:
        return byString(a.name, b.name);
    }
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;

  return {
    items: sorted.slice(start, start + PAGE_SIZE),
    total,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}

/** True when the params differ from defaults (drives "Clear filters" UI). */
export function hasActiveFilters(p: DiscoveryParams): boolean {
  return (
    p.q !== "" ||
    p.category !== "" ||
    p.capability !== "" ||
    p.transport !== "" ||
    p.auth !== "" ||
    p.publisher !== "" ||
    p.verification !== "" ||
    p.sort !== DEFAULT_PARAMS.sort ||
    p.page > 1
  );
}
