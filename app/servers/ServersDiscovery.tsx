"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ServerEntry } from "@/content/server-registry";
import {
  DEFAULT_PARAMS,
  DISCOVERY_SORTS,
  deriveFilterOptions,
  discover,
  discoveryParamsToQueryString,
  hasActiveFilters,
  parseDiscoveryParams,
  type DiscoverySort,
} from "@/lib/server-discovery";

/**
 * /servers discovery UI (P2).
 *
 * State lives in the query string (persisted, shareable). Filter option
 * values are derived from the indexable cohort only — no fabricated facets.
 * All controls are native form elements: keyboard-accessible and mobile-safe
 * without custom widgets.
 */

const SORT_LABELS: Record<DiscoverySort, string> = {
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
  "updated-desc": "Recently updated",
  "updated-asc": "Oldest update",
};

export default function ServersDiscovery({ servers }: { servers: ServerEntry[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(
    () => parseDiscoveryParams(searchParams ?? new URLSearchParams()),
    [searchParams],
  );
  const options = useMemo(() => deriveFilterOptions(servers), [servers]);
  const result = useMemo(() => discover(servers, params), [servers, params]);
  const active = hasActiveFilters(params);

  const apply = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const sp = new URLSearchParams(searchParams?.toString() ?? "");
      mutate(sp);
      router.replace(`${pathname}${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setParam = (key: string, value: string) =>
    apply((sp) => {
      if (value) sp.set(key, value);
      else sp.delete(key);
      // Any filter change resets pagination.
      if (key !== "page") sp.delete("page");
    });

  const clearAll = () => router.replace(pathname, { scroll: false });

  const selectField = (
    key: string,
    label: string,
    values: string[],
    current: string,
  ) => (
    <div>
      <label
        htmlFor={`filter-${key}`}
        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
      >
        {label}
      </label>
      <select
        id={`filter-${key}`}
        value={current}
        onChange={(e) => setParam(key, e.target.value)}
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section aria-label="Server search and filters">
      {/* Search + filters */}
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="mb-6 rounded-lg border border-slate-200 dark:border-slate-800 p-4"
      >
        <div>
          <label
            htmlFor="filter-q"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
          >
            Search servers
          </label>
          <input
            id="filter-q"
            type="search"
            value={params.q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search by name, description, or tag"
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {selectField("category", "Category", options.categories, params.category)}
          {selectField("capability", "Capability", options.capabilities, params.capability)}
          {selectField("transport", "Transport", options.transports, params.transport)}
          {selectField("auth", "Authentication", options.authMethods, params.auth)}
          {selectField("publisher", "Publisher", options.publishers, params.publisher)}
          <div>
            <label
              htmlFor="filter-sort"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Sort
            </label>
            <select
              id="filter-sort"
              value={params.sort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DISCOVERY_SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Clear filters
          </button>
        )}
      </form>

      {/* Result count */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4" role="status">
        {result.total === 0
          ? "No servers match the current filters."
          : `Showing ${result.items.length} of ${result.total} server${result.total !== 1 ? "s" : ""} (page ${result.page} of ${result.totalPages})`}
      </p>

      {/* Results grid */}
      {result.items.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8 list-none p-0">
          {result.items.map((server) => (
            <li key={server.indexPath}>
              <article className="rounded-lg border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors h-full">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  <Link href={server.indexPath} className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    {server.name}
                  </Link>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                  {server.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {server.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-8 text-center">
          <p className="text-slate-700 dark:text-slate-300">
            {servers.length === 0
              ? "No servers are currently published in the public directory. Servers appear here only after passing evidence verification."
              : "No servers match the current filters. Try clearing the filters."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4 mb-8">
          <button
            type="button"
            disabled={result.page <= 1}
            onClick={() => setParam("page", String(result.page - 1))}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Page {result.page} of {result.totalPages}
          </span>
          <button
            type="button"
            disabled={result.page >= result.totalPages}
            onClick={() => setParam("page", String(result.page + 1))}
            className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
