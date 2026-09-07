import Link from "next/link";
import { Breadcrumbs } from "@/src/components/content/Breadcrumbs";

/**
 * Shared stub render for "not yet authored" detail pages.
 *
 * Used by /categories/[slug], /capabilities/[slug], /compare/[slug] — paths
 * that may be linked from external sources but for which no verified content
 * is currently published. The page returns 200 with noindex so links do not
 * break, but cannot be cited as published authority content.
 */
export interface NotYetAuthoredProps {
  /** e.g. "categories" — used for breadcrumbs. */
  parentLabel: string;
  /** e.g. "/categories" — used for breadcrumbs and parent link. */
  parentHref: string;
  /** Raw slug from the URL. */
  slug: string;
  /** Pillar ID (e.g. "P62") if one exists; otherwise null. */
  pillarId: string | null;
  /** What kind of thing the slug is meant to identify, e.g. "category". */
  kind: string;
}

export function NotYetAuthored({
  parentLabel,
  parentHref,
  slug,
  pillarId,
  kind,
}: NotYetAuthoredProps) {
  const humanSlug = slug
    .split("-")
    .map((p) => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(" ");

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Breadcrumbs
          crumbs={[
            { label: "MCPserver.in", href: "/" },
            { label: parentLabel, href: parentHref },
            { label: humanSlug, href: "#" },
          ]}
        />

        <h1 className="mt-6 mb-4 text-3xl font-bold text-slate-900 dark:text-slate-100">
          {humanSlug}
        </h1>

        <p className="mb-6 text-slate-700 dark:text-slate-300 leading-relaxed">
          This {kind} page is reachable from external links but is not part of
          the published authority corpus.
        </p>

        <div
          role="status"
          className="mb-8 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4"
        >
          <p className="font-medium text-amber-900 dark:text-amber-200">
            No verified content for slug <code>{slug}</code>.
          </p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            {pillarId
              ? `Pillar ${pillarId} is published, but no detail page has been authored for this ${kind} yet.`
              : `No pillar entry exists for this ${kind}; the path is reserved for a future page.`}{" "}
            To prevent 404s on inbound links, this stub returns 200 with
            <code> noindex </code>
            so it cannot be mistaken for a published entry.
          </p>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Browse the {parentLabel.toLowerCase()} index for verified content, or
          visit{" "}
          <Link href="/pillars" className="text-blue-600 dark:text-blue-400 hover:underline">
            the 69-pillar directory
          </Link>
          .
        </p>

        <p className="mt-4">
          <Link
            href={parentHref}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to {parentLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
