import type { MetadataRoute } from "next"
import { canonicalUrl } from "@/src/config/site"
import { serverRecords } from "@/src/data/servers"
import { isPublicIndexable } from "@/src/lib/indexability"

const STATIC_PATHS = ["/", "/servers", "/docs", "/learn", "/methodology", "/evidence"] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: canonicalUrl(path),
  }))

  const serverEntries: MetadataRoute.Sitemap = serverRecords
    .filter(isPublicIndexable)
    .map((server) => ({
      url: canonicalUrl(`/servers/${server.slug}`),
      ...(server.updatedAt ? { lastModified: server.updatedAt } : {}),
    }))

  return [...staticEntries, ...serverEntries]
}
