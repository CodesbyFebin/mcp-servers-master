"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import type { SearchDoc } from "@/lib/search-index";
import { searchDocs } from "@/lib/search-index";

/**
 * /search UI (P5).
 *
 * Results expose title, type, snippet, canonical URL, and verification state
 * where relevant. Empty query and zero-results states are explicit. Native
 * form controls keep the surface keyboard-accessible and mobile-safe.
 */

const TYPE_LABELS: Record<string, string> = {
  server: "Server",
  guide: "Guide",
  glossary: "Glossary",
  pillar: "Pillar",
  blog: "Blog",
  doc: "Doc",
};

export default function SearchClient({ docs }: { docs: SearchDoc[] }) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const resultsId = `${inputId}-results`;

  const results = useMemo(() => searchDocs(docs, query), [docs, query]);

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1"
        >
          Search MCPserver.in
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search servers, guides, glossary, and docs"
          aria-controls={resultsId}
          autoComplete="off"
          className="w-full max-w-xl rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div id={resultsId} role="status" aria-live="polite">
        {query.trim() === "" ? (
          <p className="text-slate-600 dark:text-slate-400">
            Search covers published servers, guides, glossary entries, and docs —
            the same public content that is indexable by search engines.
          </p>
        ) : results.length === 0 ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6">
            <p className="text-slate-700 dark:text-slate-300">
              No results for “{query}”. Try different keywords, or browse the{" "}
              <Link href="/servers" className="text-blue-600 dark:text-blue-400 hover:underline">
                server directory
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {results.length} result{results.length !== 1 ? "s" : ""} for “{query}”
            </p>
            <ul className="space-y-4">
              {results.map((r) => (
                <li key={r.url}>
                  <article>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                        {TYPE_LABELS[r.type] ?? r.type}
                      </span>
                      {r.verification && (
                        <span className="ml-2">{r.verification}</span>
                      )}
                    </p>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      <Link href={r.url} className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                        {r.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{r.snippet}</p>
                  </article>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
