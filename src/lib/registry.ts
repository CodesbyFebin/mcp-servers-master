import { serverRecords, type ServerRecord } from "../data/servers"
import { isPublicIndexable, ledgerCounts } from "./indexability"

export type RegistrySnapshot = readonly ServerRecord[]

export function selectPublicServers(records: RegistrySnapshot = serverRecords): ServerRecord[] {
  return records
    .filter(isPublicIndexable)
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

export function getPublicServerCategories(): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()

  for (const server of getPublicServers()) {
    counts.set(server.category, (counts.get(server.category) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
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
