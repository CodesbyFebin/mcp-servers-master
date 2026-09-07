import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PILLAR_BY_ID } from "@/src/content/pillar-registry";
import { NotYetAuthored } from "@/src/components/content/NotYetAuthored";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

const PILLAR_ID = "P62"; // MCP Categories

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pillar = PILLAR_BY_ID[PILLAR_ID];
  return {
    title: `${slug.replace(/-/g, " ")} — Categories — MCPserver.in`,
    description: pillar
      ? `${pillar.label} index. No verified detail page authored for slug "${slug}".`
      : `No verified content for category slug "${slug}".`,
    robots: { index: false, follow: true },
    alternates: { canonical: `${CANONICAL_ORIGIN}/categories/${slug}` },
  };
}

export default async function CategorySlugPage({ params }: Props) {
  const { slug } = await params;

  if (!slug || slug === "index") {
    notFound();
  }

  return (
    <NotYetAuthored
      parentLabel="Categories"
      parentHref="/categories"
      slug={slug}
      pillarId={PILLAR_ID}
      kind="category"
    />
  );
}
