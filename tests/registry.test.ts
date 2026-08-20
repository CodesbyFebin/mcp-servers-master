import { describe, expect, it } from "vitest"
import { serverRecords } from "../src/data/servers"
import { isPublicIndexable } from "../src/lib/indexability"
import {
  getPublicCapabilityFacets,
  getPublicCategoryFacets,
  getPublicServerCategories,
  getPublicServerBySlug,
  getPublicServers,
  selectPublicServers,
  validatePublicRegistry,
} from "../src/lib/registry"

describe("canonical public registry", () => {
  it("returns only records that pass the publication authority", () => {
    const base = serverRecords[0]
    const records = [
      base,
      { ...base, slug: "draft-record", canonicalName: "example/draft", publicationStatus: "draft" as const },
      { ...base, slug: "unverified-record", canonicalName: "example/unverified", verificationStatus: "unverified" as const },
      { ...base, slug: "no-evidence-record", canonicalName: "example/no-evidence", evidence: [] },
      { ...base, slug: "noindex-record", canonicalName: "example/noindex", noindex: true },
    ]

    const selected = selectPublicServers(records)
    expect(selected).toHaveLength(1)
    expect(selected[0]?.slug).toBe(base.slug)
    expect(selected.every(isPublicIndexable)).toBe(true)
  })

  it("keeps public identities unique", () => {
    expect(validatePublicRegistry()).toEqual([])

    const base = serverRecords[0]
    const duplicate = { ...base, title: `${base.title} duplicate` }
    expect(validatePublicRegistry([base, duplicate])).toEqual([
      { code: "DUPLICATE_SLUG", value: base.slug },
      { code: "DUPLICATE_CANONICAL_NAME", value: base.canonicalName },
    ])
  })

  it("resolves detail pages only from the public registry", () => {
    const servers = getPublicServers()
    expect(servers.length).toBeGreaterThan(0)
    expect(getPublicServerBySlug(servers[0]!.slug)?.slug).toBe(servers[0]!.slug)
    expect(getPublicServerBySlug("definitely-not-public")).toBeNull()
  })

  it("derives category counts from the public cohort", () => {
    const total = getPublicServerCategories().reduce((sum, category) => sum + category.count, 0)
    expect(total).toBe(getPublicServers().length)
  })

  it("keeps category and capability facet references inside the public cohort", () => {
    const publicSlugs = new Set(getPublicServers().map((server) => server.slug))
    const referencedSlugs = [
      ...getPublicCategoryFacets(),
      ...getPublicCapabilityFacets(),
    ].flatMap((facet) => facet.servers.map((server) => server.slug))

    expect(referencedSlugs.length).toBeGreaterThan(0)
    expect(referencedSlugs.every((slug) => publicSlugs.has(slug))).toBe(true)
  })
})
