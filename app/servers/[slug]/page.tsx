import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getIndexableServers,
  getServerEntry,
  getServerVerificationDecision,
  isServerIndexableEntry,
} from "@/src/content/server-registry";
import { softwareApplicationJsonLd, breadcrumbListJsonLd } from "@/src/seo/schema";
import { Breadcrumbs } from "@/src/components/content/Breadcrumbs";
import { DirectAnswer } from "@/src/components/content/DirectAnswer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Server detail page — verified entries ONLY.
 *
 * Publication doctrine (P3):
 * - generateStaticParams + dynamicParams=false mean only indexable entries
 *   (the isServerIndexable() cohort) are ever rendered here. Unverified
 *   entities like mcp-server-postgres have dedicated static pages instead.
 * - Sections render ONLY when the registry field holds verified data.
 *   Unknown values are omitted, never inferred or fabricated.
 * - No installation commands, authentication claims, transport claims, or
 *   compatibility claims are inferred from ecosystem norms or popularity.
 */
export async function generateStaticParams() {
  const servers = getIndexableServers();
  return servers.map((server) => ({ slug: server.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getServerEntry(`/servers/${slug}`);

  if (!entry) {
    return {
      title: "Server not found — MCPserver.in",
    };
  }

  const decision = getServerVerificationDecision(entry);

  return {
    title: `${entry.name} — MCPserver.in`,
    description: entry.description,
    openGraph: {
      title: `${entry.name} — MCPserver.in`,
      description: entry.description,
      type: "website",
    },
    other: {
      "x-verification-status": decision.indexable ? "indexable" : "not-indexable",
      "x-verification-reason": decision.reason,
    },
  };
}

/** Static-only route: no dynamic params beyond what generateStaticParams provides. */
export const dynamicParams = false;

function DetailList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <li
            key={v}
            className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400"
          >
            {v}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ServerDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const indexPath = `/servers/${slug}`;
  const entry = getServerEntry(indexPath);

  // Runtime publication guard — authoritative check using isServerIndexable
  if (!entry || !isServerIndexableEntry(entry)) {
    notFound();
  }

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Servers", href: "/servers" },
    { label: entry.name, href: entry.indexPath },
  ];

  const capabilities = entry.capabilities ?? [];
  const transports = entry.transports ?? [];
  const authentication = entry.authentication ?? [];
  const categories = entry.categories ?? [];
  const hasVerifiedDetails =
    capabilities.length + transports.length + authentication.length + categories.length > 0;

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Breadcrumbs crumbs={crumbs} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              softwareApplicationJsonLd({
                name: entry.name,
                description: entry.description,
                url: `https://www.mcpserver.in${entry.indexPath}`,
                applicationCategory: "DeveloperApplication",
                operatingSystem: "cross-platform",
                version: entry.version ?? undefined,
                author: {
                  "@type": "Organization",
                  name: entry.creator,
                  url: "https://www.mcpserver.in",
                },
                offers: null, // No verified offer/pricing
                aggregateRating: null, // No verified rating
              }),
              breadcrumbListJsonLd([
                { name: "Home", item: "https://www.mcpserver.in/" },
                { name: "Servers", item: "https://www.mcpserver.in/servers" },
                { name: entry.name, item: `https://www.mcpserver.in${entry.indexPath}` },
              ]),
            ]),
          }}
        />

        <h1 className="mb-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
          {entry.name}
        </h1>

        <DirectAnswer
          text={`${entry.name} is a verified MCP server with documented capabilities and evidence-backed implementation.`}
        />

        <section aria-labelledby="about-heading" className="my-10">
          <h2
            id="about-heading"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3"
          >
            About
          </h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            {entry.description}
          </p>

          <dl className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-4">
            {entry.version && (
              <div className="flex gap-2">
                <dt className="font-medium text-slate-700 dark:text-slate-300">Verified version:</dt>
                <dd className="font-mono">{entry.version}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="font-medium text-slate-700 dark:text-slate-300">Publisher:</dt>
              <dd>{entry.creator}</dd>
            </div>
          </dl>

          {hasVerifiedDetails && (
            <div className="space-y-3">
              <DetailList title="Capabilities" values={capabilities} />
              <DetailList title="Transports" values={transports} />
              <DetailList title="Authentication" values={authentication} />
              <DetailList title="Categories" values={categories} />
            </div>
          )}

          {(entry.repository || entry.documentationUrl) && (
            <ul className="mt-4 space-y-1 text-sm">
              {entry.repository && (
                <li>
                  <a
                    href={entry.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Source repository →
                  </a>
                </li>
              )}
              {entry.documentationUrl && (
                <li>
                  <a
                    href={entry.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Official documentation →
                  </a>
                </li>
              )}
            </ul>
          )}
        </section>

        <section aria-labelledby="evidence-heading" className="my-10">
          <h2
            id="evidence-heading"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3"
          >
            Evidence
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            This entry is published only because it satisfies the publication
            authority: a verified implementation backed by evidence references in
            the Evidence Ledger.
          </p>
          <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
            {entry.evidenceRefs.map((ref) => (
              <li key={ref} className="font-mono">
                {ref}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <Link
              href="/evidence"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Evidence Ledger →
            </Link>
          </p>
        </section>

        <section aria-labelledby="related-heading" className="my-10">
          <h2
            id="related-heading"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3"
          >
            Related
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/servers" className="text-blue-600 dark:text-blue-400 hover:underline">
                Server directory →
              </Link>
            </li>
            <li>
              <Link
                href="/editorial-policy"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                How servers qualify — publication methodology →
              </Link>
            </li>
            <li>
              <Link
                href="/security/mcp-security"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                MCP security overview →
              </Link>
            </li>
          </ul>
        </section>

        <footer className="border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-500">
          <p>
            Evidence last reviewed: <strong>{entry.lastVerifiedAt ?? "N/A"}</strong> ·
            Last registry update: <strong>{entry.updatedAt}</strong>
          </p>
          <p className="mt-1">
            Sections on this page appear only when verified data exists in the
            registry. Missing sections mean the underlying value has not been
            verified — not that it does not exist.
          </p>
        </footer>
      </div>
    </main>
  );
}
