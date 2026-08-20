import { SITE } from "../config/site"
import { getPublicServers } from "./registry"

export const PUBLIC_REGISTRY_SCHEMA_VERSION = "1.0.0"

export function buildPublicRegistrySnapshot() {
  const servers = getPublicServers()

  return {
    schemaVersion: PUBLIC_REGISTRY_SCHEMA_VERSION,
    canonicalOrigin: SITE.origin,
    publicationPolicy: {
      authority: "isServerIndexable",
      failClosed: true,
      rule: "published + verified + qualifying evidence + !noindex",
    },
    count: servers.length,
    servers: servers.map((server) => ({
      slug: server.slug,
      canonicalName: server.canonicalName,
      title: server.title,
      description: server.description,
      category: server.category,
      capabilities: server.capabilities,
      latestVerifiedVersion: server.latestVerifiedVersion,
      repositoryUrl: server.repositoryUrl,
      websiteUrl: server.websiteUrl,
      updatedAt: server.updatedAt,
      evidence: server.evidence.map((item) => ({
        sourceUrl: item.sourceUrl,
        sourceType: item.sourceType,
        status: item.status,
        capturedAt: item.capturedAt,
        description: item.description ?? null,
      })),
    })),
  }
}
