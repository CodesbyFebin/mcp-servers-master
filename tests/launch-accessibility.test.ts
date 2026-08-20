import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("launch accessibility contracts", () => {
  it("keeps language, skip navigation, visible focus and 44px navigation targets", () => {
    const layout = fs.readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8")
    const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8")
    expect(layout).toContain('<html lang="en-IN">')
    expect(layout).toContain('className="skip-link"')
    expect(css).toContain("a:focus-visible")
    expect(css).toContain("min-height: 44px")
    expect(css).toContain("prefers-reduced-motion")
  })
})
