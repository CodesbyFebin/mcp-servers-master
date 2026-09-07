import type { Metadata } from "next";
import { RegistryEntry } from "@/src/content/content-registry";
import { absoluteUrl } from "@/src/seo/breadcrumbs";

/**
 * Authority-aware Metadata for a {@link RegistryEntry}. Only entries the
 * publication authority indexes are exposed to crawlers (index,follow);
 * everything else is served noindex,follow so a draft or review page can
 * never be picked up as a public authority page.
 */
export function buildDynamicMeta(entry: RegistryEntry | undefined): Metadata {
  if (!entry) {
    return {
      title: "MCPserver.in",
      description: "Public authority for MCP server discovery.",
      robots: { index: false, follow: true },
    };
  }
  const indexable = entry.status === "published" && !entry.noindex;
  return {
    title: entry.metaTitle,
    description: entry.metaDescription,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    // Self-canonical for every published page (P7): dynamic editorial routes
    // previously emitted no canonical tag at all, so redirect destinations
    // could not prove canonical ownership.
    alternates: { canonical: dynamicCanonical(entry) },
  };
}

export function dynamicCanonical(entry: RegistryEntry | undefined): string {
  if (!entry) return absoluteUrl("/");
  const indexable = entry.status === "published" && !entry.noindex;
  return absoluteUrl(indexable ? entry.indexPath : "/");
}