import { Metadata } from "next";
import { Breadcrumbs } from "@/src/components/content/Breadcrumbs";
import { buildSearchIndex } from "@/src/lib/search-index";
import SearchClient from "./SearchClient";

/**
 * /search (P5) — public site search.
 *
 * noindex: search result surfaces are utility pages, not canonical content.
 * The search INDEX itself is built only from the public indexable cohorts
 * (published editorial entries + isServerIndexable() servers) — raw
 * inventory, drafts, and unverified entities are excluded by construction.
 */
export const metadata: Metadata = {
  title: "Search — MCPserver.in",
  description:
    "Search published MCP servers, guides, glossary entries, and documentation on MCPserver.in.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchPage() {
  const docs = buildSearchIndex();

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Search", href: "/search" },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="mb-6 text-3xl font-bold text-slate-900 dark:text-slate-100">
          Search
        </h1>
        <SearchClient docs={docs} />
      </div>
    </main>
  );
}
