import Link from "next/link";
import { PILLAR_GROUPS } from "@/content/pillar-registry";

/**
 * Global site header (P8).
 *
 * Navigation is registry-derived: pillar group labels come from
 * PILLAR_GROUPS (the same source /pillars renders from) — no hardcoded
 * pillar arrays here. Individual pillars are NOT listed in the header;
 * they are reachable via /pillars, which gates each entry through
 * isPillarIndexable() so draft/review pillars never render publicly.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto py-4 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="text-2xl font-bold text-slate-900 dark:text-slate-100 no-underline"
        >
          MCPserver.in
        </Link>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Public authority for MCP server discovery
        </p>
      </div>

      <nav aria-label="Primary" className="container mx-auto pb-2">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
          <li>
            <Link
              href="/servers"
              className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Servers
            </Link>
          </li>
          <li>
            <Link
              href="/pillars"
              className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Pillars
            </Link>
          </li>
          <li>
            <Link
              href="/search"
              className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Search
            </Link>
          </li>
          <li>
            <Link
              href="/evidence"
              className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Evidence
            </Link>
          </li>
          <li>
            <Link
              href="/methodology"
              className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Methodology
            </Link>
          </li>
        </ul>
      </nav>

      <nav
        aria-label="Pillar groups"
        className="container mx-auto pb-3 border-t border-slate-100 dark:border-slate-900 pt-2"
      >
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {PILLAR_GROUPS.map((group) => (
            <li key={group.key}>
              <Link
                href={`/pillars#${group.key}`}
                className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {group.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
