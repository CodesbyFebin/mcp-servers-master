import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PILLAR_BY_ID } from "@/src/content/pillar-registry";
import { NotYetAuthored } from "@/src/components/content/NotYetAuthored";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

const PILLAR_ID = "P61"; // MCP Server Compare

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pillar = PILLAR_BY_ID[PILLAR_ID];
  return {
    title: `${slug.replace(/-/g, " ")} — Comparisons — MCPserver.in`,
    description: pillar
      ? `${pillar.label} index. No verified detail page authored for slug "${slug}".`
      : `No verified content for comparison slug "${slug}".`,
    robots: { index: false, follow: true },
    alternates: { canonical: `${CANONICAL_ORIGIN}/compare/${slug}` },
  };
}

export default async function CompareSlugPage({ params }: Props) {
  const { slug } = await params;

  if (!slug || slug === "index") {
    notFound();
  }

  return (
    <NotYetAuthored
      parentLabel="Comparisons"
      parentHref="/compare"
      slug={slug}
      pillarId={PILLAR_ID}
      kind="comparison"
    />
  );
}
