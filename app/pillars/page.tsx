import { Metadata } from "next";
import Link from "next/link";
import {
  PILLAR_GROUPS,
  PILLAR_REGISTRY,
  getPillarsByGroup,
  isPillarIndexable,
} from "@/src/content/pillar-registry";
import { Breadcrumbs } from "@/src/components/content/Breadcrumbs";

export const metadata: Metadata = {
  title: "MCP Pillar Directory — MCPserver.in",
  description:
    "The canonical 69-pillar directory for the MCP authority graph. Six governed groups plus nine authority-system pillars.",
  alternates: {
    canonical: "https://www.mcpserver.in/pillars",
  },
};

export default function PillarsDirectoryPage() {
  const indexableCount = PILLAR_REGISTRY.filter(isPillarIndexable).length;
  const reviewCount = PILLAR_REGISTRY.filter((p) => p.status === "review").length;

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "MCP Pillar Directory",
      description: "Canonical directory of 69 pillars governing the MCP authority graph.",
      url: "https://www.mcpserver.in/pillars",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      numberOfItems: 69,
      itemListElement: PILLAR_REGISTRY.slice(0, 10).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.label,
        url: `https://www.mcpserver.in${p.canonicalPath}`,
      })),
    },
  ];

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Pillars", href: "/pillars" },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs crumbs={crumbs} />

        {schemas.map((schema, i) => (
          <script
            key={`jsonld-${i}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}

        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
          MCP Pillar Directory
        </h1>

        <p className="mb-6 text-slate-600 dark:text-slate-400">
          The canonical 69-pillar authority contract for the MCP knowledge graph.
          Six governed groups of ten pillars each, plus nine authority-system
          pillars. {indexableCount} are currently published and indexable;{" "}
          {reviewCount} are in editorial review awaiting content.
        </p>

        {PILLAR_GROUPS.map((group) => {
          const pillars = getPillarsByGroup(group.key);
          return (
            <section key={group.key} id={group.key} className="mb-10 scroll-mt-20">
              <h2 className="mb-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {group.label}
              </h2>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                {pillars.length} pillars
                {group.expectedCount !== pillars.length &&
                  ` (expected ${group.expectedCount})`}
              </p>

              <ul className="space-y-3" role="list">
                {pillars.map((p) => {
                  const indexable = isPillarIndexable(p);
                  return (
                    <li
                      key={p.id}
                      className="rounded border border-slate-200 dark:border-slate-800 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
                              {p.id}
                            </span>
                            {indexable ? (
                              <Link
                                href={p.canonicalPath}
                                className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {p.label}
                              </Link>
                            ) : (
                              <span className="text-base font-semibold text-slate-500 dark:text-slate-400">
                                {p.label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {p.description}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-500">
                            {p.canonicalPath}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {p.status === "published" ? (
                            <span className="inline-block rounded bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              Published
                            </span>
                          ) : p.status === "review" ? (
                            <span className="inline-block rounded bg-amber-100 dark:bg-amber-900/30 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                              Review
                            </span>
                          ) : (
                            <span className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                              {p.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
