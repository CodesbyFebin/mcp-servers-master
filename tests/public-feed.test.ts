import { describe, expect, it } from "vitest"
import { buildPublicRegistrySnapshot } from "../src/lib/public-feed"
import { getPublicServers } from "../src/lib/registry"

describe("public registry JSON snapshot", () => {
  it("has exact parity with the public registry cohort", () => {
    const snapshot = buildPublicRegistrySnapshot()
    const servers = getPublicServers()

    expect(snapshot.count).toBe(servers.length)
    expect(snapshot.servers.map((server) => server.slug)).toEqual(
      servers.map((server) => server.slug),
    )
  })

  it("does not add synthetic freshness or private publication fields", () => {
    const snapshot = buildPublicRegistrySnapshot() as Record<string, unknown>
    expect("generatedAt" in snapshot).toBe(false)
    expect(snapshot.publicationPolicy).toEqual({
      authority: "isPublicIndexable",
      failClosed: true,
      rule: "published + verified + qualifying evidence + !noindex",
    })
  })
})
