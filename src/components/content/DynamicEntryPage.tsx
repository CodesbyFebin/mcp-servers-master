import { notFound } from "next/navigation";
import ContentPage from "@/src/components/content/ContentPage";
import { buildDynamicMeta } from "@/src/seo/dynamic-meta";
import { entryBySlug, parentLabel, siblingEntries, entriesForParent } from "@/src/content/route-helpers";

/**
 * Shared shell for every /<parent>/[slug] editorial page. Each route file calls
 * makeDynamicEntry("learn") (its own folder's parent) and re-exports the three
 * Next.js page responsibilities. All publication logic is delegated to the
 * content registry and ContentPage — this file does not restate the authority
 * rule, so the parent branch cannot drift from it.
 */

type PageProps = { params: { slug: string } };

interface DynamicEntry {
  generateStaticParams: () => { slug: string }[];
  generateMetadata: (props: PageProps) => ReturnType<typeof buildDynamicMeta>;
  Page: (props: PageProps) => Promise<React.ReactElement>;
}

export function makeDynamicEntry(parent: string): DynamicEntry {
  /**
   * Publication guard: only published, non-noindex entries may resolve.
   * Unknown, draft, review, retired, or noindex slugs MUST 404 — rendering
   * an empty 200 page leaks the route space and breaks the publication
   * authority contract.
   */
  function publishable(slug: string) {
    const entry = entryBySlug(parent, slug);
    if (!entry || entry.status !== "published" || entry.noindex) return undefined;
    return entry;
  }

  function generateStaticParams() {
    return entriesForParent(parent)
      .filter((e) => e.type !== "category")
      .filter((e) => e.status === "published" && !e.noindex)
      .map((e) => ({ slug: e.slug }));
  }

  function generateMetadata({ params }: PageProps) {
    const entry = publishable(params.slug);
    if (!entry) notFound();
    return buildDynamicMeta(entry);
  }

  async function Page({ params }: PageProps) {
    const entry = publishable(params.slug);
    if (!entry) notFound();
    return (
      <ContentPage
        entry={entry}
        indexableChildren={siblingEntries(entry)}
        crumbs={[{ name: parentLabel(parent), path: `/${parent}` }]}
      />
    );
  }

  return { generateStaticParams, generateMetadata, Page };
}