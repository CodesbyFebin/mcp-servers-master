import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const APP_ROOT = path.join(ROOT, "app")
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"])

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(full)
  }
  return files
}

describe("public application boundary", () => {
  it("does not import the raw server seed directly", () => {
    const violations = walk(APP_ROOT)
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8")
        return /(?:@\/|\.\.\/|\.\/)?src\/data\/servers/.test(source)
      })
      .map((file) => path.relative(ROOT, file))

    expect(violations).toEqual([])
  })
})
