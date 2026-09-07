import type { MetadataRoute } from "next";
import { getIndexableEntries } from "@/src/content/content-registry";
import { getIndexableServers } from "@/src/content/server-registry";
import { CANONICAL_ORIGIN } from "@/src/seo/breadcrumbs";

/**
 * Sitemap generation combining editorial content and server entities.
 *
 * lastmod rules (truthful, not fabricated):
 * - Editorial entries: use registry `reviewedAt` if present; omit if not set
 * - Server entries:   use registry `updatedAt` if present; omit if not set
 * - Static hub pages: omit lastmod — no authoritative content modification date
 *
 * Invariant: deploying unchanged content must NOT change sitemap timestamps.
 * We never use build-time `new Date()` as a content lastmod value.
 *
 * Only includes:
 * - Editorial: entries with status="published" AND noindex !== true
 * - Servers: entries that pass isServerIndexable() (verified + evidence)
 *
 * Excludes: draft, noindex, quarantine, unverified, retired
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = CANONICAL_ORIGIN;

  // Editorial cohort — lastmod from registry review date only
  const editorialEntries = getIndexableEntries();
  const editorialUrls: MetadataRoute.Sitemap = editorialEntries
    .filter((e) => e.indexPath) // skip entries without a route
    .map((entry) => ({
      url: `${baseUrl}${entry.indexPath}`,
      lastModified: entry.reviewedAt ? new Date(entry.reviewedAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: entry.type === "category" || entry.type === "capability" ? 0.8 : 0.7,
    }));

  // Server cohort — lastmod from registry update date only
  const serverEntries = getIndexableServers();
  const serverUrls: MetadataRoute.Sitemap = serverEntries.map((entry) => ({
    url: `${baseUrl}${entry.indexPath}`,
    lastModified: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Static core pages — no authoritative content modification date; omit lastmod
  // to avoid fabricating build-time timestamps.
  const staticUrls: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily" as const, priority: 1.0 },
    { url: `${baseUrl}/servers`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${baseUrl}/pillars`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/docs`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/categories`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/capabilities`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${baseUrl}/evidence`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/methodology`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/editorial-policy`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly" as const, priority: 0.5 },
  ];

  // Combine all, deduplicate by URL
  const allUrls = [...staticUrls, ...editorialUrls, ...serverUrls];
  const uniqueUrls = new Map<string, MetadataRoute.Sitemap[0]>();

  for (const url of allUrls) {
    if (!uniqueUrls.has(url.url)) {
      uniqueUrls.set(url.url, url);
    }
  }

  return Array.from(uniqueUrls.values()).sort((a, b) => a.url.localeCompare(b.url));
}
