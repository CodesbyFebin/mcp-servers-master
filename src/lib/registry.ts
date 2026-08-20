import { serverRecords, type ServerRecord } from "../data/servers"
import { isServerIndexable, ledgerCounts } from "./indexability"

export type RegistrySnapshot = readonly ServerRecord[]

export function selectPublicServers(records: RegistrySnapshot = serverRecords): ServerRecord[] {
  return records
    .filter(isServerIndexable)
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title) || a.canonicalName.localeCompare(b.canonicalName))
}

export function getPublicServers(): ServerRecord[] {
  return selectPublicServers(serverRecords)
}

export function getPublicServerBySlug(slug: string): ServerRecord | null {
  return getPublicServers().find((server) => server.slug === slug) ?? null
}

export function getPublicServerSlugs(): string[] {
  return getPublicServers().map((server) => server.slug)
}

export function getRegistryLedgerCounts() {
  return ledgerCounts(serverRecords)
}

export type PublicFacetServer = {
  slug: string
  title: string
}

export type PublicServerFacet = {
  name: string
  count: number
  servers: PublicFacetServer[]
}

function buildPublicFacets(valuesFor: (server: ServerRecord) => readonly string[]): PublicServerFacet[] {
  const facets = new Map<string, PublicFacetServer[]>()

  for (const server of getPublicServers()) {
    for (const rawValue of valuesFor(server)) {
      const value = rawValue.trim()
      if (!value) continue

      const servers = facets.get(value) ?? []
      if (!servers.some((item) => item.slug === server.slug)) {
        servers.push({ slug: server.slug, title: server.title })
      }
      facets.set(value, servers)
    }
  }

  return [...facets.entries()]
    .map(([name, servers]) => ({
      name,
      count: servers.length,
      servers: servers.slice().sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function getPublicCategoryFacets(): PublicServerFacet[] {
  return buildPublicFacets((server) => [server.category])
}

export function getPublicCapabilityFacets(): PublicServerFacet[] {
  return buildPublicFacets((server) => server.capabilities)
}

export function getPublicServerCategories(): Array<{ name: string; count: number }> {
  return getPublicCategoryFacets().map(({ name, count }) => ({ name, count }))
}

export type RegistryIntegrityIssue = {
  code: "DUPLICATE_SLUG" | "DUPLICATE_CANONICAL_NAME"
  value: string
}

export function validatePublicRegistry(records: RegistrySnapshot = serverRecords): RegistryIntegrityIssue[] {
  const issues: RegistryIntegrityIssue[] = []
  const slugs = new Set<string>()
  const canonicalNames = new Set<string>()

  for (const server of selectPublicServers(records)) {
    if (slugs.has(server.slug)) issues.push({ code: "DUPLICATE_SLUG", value: server.slug })
    else slugs.add(server.slug)

    if (canonicalNames.has(server.canonicalName)) {
      issues.push({ code: "DUPLICATE_CANONICAL_NAME", value: server.canonicalName })
    } else {
      canonicalNames.add(server.canonicalName)
    }
  }

  return issues
}
