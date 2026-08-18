import { describe, expect, it } from "vitest"
import { canonicalUrl, isCanonicalProductionUrl, normalizePath, SITE } from "@/src/config/site"

describe("canonical URL contract", () => {
  it("locks the canonical production origin", () => {
    expect(SITE.origin).toBe("https://www.mcpserver.in")
    expect(SITE.hostname).toBe("www.mcpserver.in")
  })

  it("normalizes paths and strips trailing slashes", () => {
    expect(normalizePath("servers/github/")).toBe("/servers/github")
    expect(canonicalUrl("/")).toBe("https://www.mcpserver.in/")
    expect(canonicalUrl("/servers/github/")).toBe("https://www.mcpserver.in/servers/github")
  })

  it("rejects non-canonical production URLs", () => {
    expect(isCanonicalProductionUrl("https://www.mcpserver.in/servers")).toBe(true)
    expect(isCanonicalProductionUrl("https://mcpserver.in/servers")).toBe(false)
    expect(isCanonicalProductionUrl("https://www.mcpserver.in/servers/" )).toBe(false)
  })
})
