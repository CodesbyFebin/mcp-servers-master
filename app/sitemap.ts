import type { MetadataRoute } from "next"
import { canonicalUrl } from "@/src/config/site"
import { getPublicGraphNodes } from "@/src/lib/public-graph"

export default function sitemap(): MetadataRoute.Sitemap {
  return getPublicGraphNodes().map((node) => ({
    url: canonicalUrl(node.path),
    ...(node.lastModified ? { lastModified: node.lastModified } : {}),
  }))
}
