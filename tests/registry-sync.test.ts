import { describe, expect, it, vi } from "vitest"
import { RegistrySyncService, quickSync } from "../services/registry-sync"

const base = {
  canonicalName: "example/alpha",
  title: "Alpha",
  description: "Evidence-backed registry test record.",
  category: "Developer Tools",
  sourceUrl: "https://registry.modelcontextprotocol.io/?q=example%2Falpha",
  latestVerifiedVersion: "1.0.0",
  capabilities: ["streamable-http"],
  updatedAt: "2026-08-20",
} as const

const verifiedSource = {
  sourceUrl: base.sourceUrl,
  sourceType: "registry" as const,
  capturedAt: "2026-08-20",
  verified: true,
}

describe("registry synchronization service", () => {
  it("fails closed unless publication is explicitly requested", () => {
    const result = quickSync([base], [verifiedSource])
    expect(result.records).toHaveLength(1)
    expect(result.records[0]?.verificationStatus).toBe("verified")
    expect(result.publicRecords).toEqual([])
    expect(result.decisions[0]?.indexable).toBe(false)
  })

  it("publishes only records that satisfy isServerIndexable", () => {
    const result = quickSync([{ ...base, publicationStatus: "published" }], [verifiedSource])
    expect(result.publicRecords).toHaveLength(1)
    expect(result.publicRecords[0]?.canonicalName).toBe(base.canonicalName)
    expect(result.decisions[0]?.reason).toContain("published + verified")
  })

  it("deduplicates canonical identities deterministically", () => {
    const result = quickSync([
      { ...base, publicationStatus: "published", title: "Alpha old" },
      { ...base, publicationStatus: "published", title: "Alpha current", evidence: [{
        sourceUrl: "https://example.test/extra",
        sourceType: "official",
        status: "verified",
        capturedAt: "2026-08-20",
      }] },
    ], [verifiedSource])
    expect(result.records).toHaveLength(1)
    expect(result.records[0]?.title).toBe("Alpha current")
  })

  it("generates sitemap entries only for public records", () => {
    const service = new RegistrySyncService()
    const result = service.ingest([{ ...base, publicationStatus: "published" }], [verifiedSource])
    const sitemap = service.generateSitemapXml(result.records)
    expect(sitemap).toContain("https://www.mcpserver.in/servers/example-alpha")
    expect(sitemap).toContain("<lastmod>2026-08-20</lastmod>")
    expect(service.generateRobotsTxt()).toContain("https://www.mcpserver.in/sitemap.xml")
  })

  it("keeps untrusted fetched sources unverified and non-public", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ ...base, sourceUrl: undefined, publicationStatus: "published" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    }))
    const service = new RegistrySyncService({ fetchImpl: fetchImpl as typeof fetch, trustedSourceHosts: [] })
    const result = await service.ingestFromSource("https://mirror.example.test/registry.json")
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(result.records[0]?.verificationStatus).toBe("unverified")
    expect(result.publicRecords).toEqual([])
  })
})
