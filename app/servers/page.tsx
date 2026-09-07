import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/src/components/content/Breadcrumbs";
import { DirectAnswer } from "@/src/components/content/DirectAnswer";
import { getIndexableServers, collectionFor } from "@/src/content/route-helpers";
import ServersDiscovery from "./ServersDiscovery";

import { absoluteUrl } from "@/src/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "MCPserver.in — Server Directory",
  description: "AI-indexed directory of MCP servers with evidence verification",
  alternates: { canonical: absoluteUrl("/servers") },
};

export default function ServersPage() {
  const indexableServers = getIndexableServers();
  const collection = collectionFor("servers");

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Servers", href: "/servers" },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumbs + JSON-LD */}
        <Breadcrumbs crumbs={crumbs} />

        {/* JSON-LD: CollectionPage + ItemList + BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "CollectionPage",
                  "@id": "https://www.mcpserver.in/servers#collection",
                  url: "https://www.mcpserver.in/servers",
                  name: "MCP Server Directory",
                  description:
                    "AI-indexed directory of MCP servers with evidence verification",
                  mainEntity: {
                    "@type": "ItemList",
                    itemListElement: indexableServers.map((server, i) => ({
                      "@type": "ListItem",
                      position: i + 1,
                      item: {
                        "@type": "SoftwareApplication",
                        "@id": `https://www.mcpserver.in${server.indexPath}#server`,
                        url: `https://www.mcpserver.in${server.indexPath}`,
                        name: server.name,
                        description: server.description,
                        applicationCategory: "DeveloperApplication",
                        operatingSystem: "cross-platform",
                        isAccessibleForFree: true,
                      },
                    })),
                  },
                },
                {
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    {
                      "@type": "ListItem",
                      position: 1,
                      name: "Home",
                      item: "https://www.mcpserver.in/",
                    },
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: "Servers",
                      item: "https://www.mcpserver.in/servers",
                    },
                  ],
                },
              ],
            }),
          }}
        />

        {/* H1 */}
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          {collection?.h1 ?? "Server Directory"}
        </h1>

        {/* Direct Answer */}
        <DirectAnswer
          text={
            indexableServers.length > 0
              ? `The MCPserver.in directory lists ${indexableServers.length} verified MCP server${indexableServers.length !== 1 ? "s" : ""} that satisfy the publication authority: published, evidence-backed, and verified. Each server entry documents its capabilities, transport, authentication, and read/write behavior with source provenance.`
              : "No servers currently satisfy the publication authority. Entries in the registry that do not meet the isServerIndexable() criteria are tracked internally but not listed publicly."
          }
        />

        {/* Methodology link */}
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          <Link
            href="/methodology"
            className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
          >
            How servers qualify for this directory →
          </Link>
        </p>

        {/* Discovery engine: search + filters + sorting + pagination (P2).
            Suspense boundary required because the client component reads
            useSearchParams(); the shell (H1, direct answer, JSON-LD) still
            prerenders statically. */}
        <Suspense fallback={<p className="text-sm text-slate-500">Loading server directory…</p>}>
          <ServersDiscovery servers={indexableServers} />
        </Suspense>

        {/* Trust routes */}
        <nav aria-label="Trust and methodology" className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <ul className="flex flex-wrap gap-6 text-sm">
            <li>
              <Link
                href="/evidence"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Evidence Ledger
              </Link>
            </li>
            <li>
              <Link
                href="/methodology"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Publication Methodology
              </Link>
            </li>
            <li>
              <Link
                href="/editorial-policy"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Editorial Policy
              </Link>
            </li>
            <li>
              <Link
                href="/security"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Security Model
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}