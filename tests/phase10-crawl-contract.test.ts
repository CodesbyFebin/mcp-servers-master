import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { getPublicGraphPaths } from "../src/lib/public-graph"

const ROOT = process.cwd()
const placeholders = ["integrations", "clients", "glossary"] as const

describe("Phase 10 crawl safety", () => {
  it("keeps evidence-pending surfaces out of the public graph", () => {
    const publicPaths = new Set(getPublicGraphPaths())
    for (const route of placeholders) expect(publicPaths.has(`/${route}`)).toBe(false)
  })

  it("marks evidence-pending surfaces noindex,follow", () => {
    for (const route of placeholders) {
      const source = fs.readFileSync(path.join(ROOT, "app", route, "page.tsx"), "utf8")
      expect(source).toContain("robots: { index: false, follow: true }")
    }
  })

  it("uses explicit orphan allowlisting only for the noindex placeholders", () => {
    const policy = JSON.parse(fs.readFileSync(path.join(ROOT, ".production-gate.json"), "utf8")) as {
      orphanAllowlist: string[]
    }
    expect([...policy.orphanAllowlist].sort()).toEqual(["/clients", "/glossary", "/integrations"])
  })
})
