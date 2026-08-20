#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const REQUIRED_ORIGIN = "https://www.mcpserver.in"
const SITE_CONFIG = path.join(ROOT, "src/config/site.ts")
const POLICY_FILE = path.join(ROOT, ".production-gate.json")

const SCAN_ROOTS = ["app", "src", "public", "content", "data"]
const ROOT_FILES = [
  "package.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vercel.json",
]

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".txt",
  ".xml",
  ".html",
  ".css",
])

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "coverage",
  ".vercel",
])

const FORBIDDEN_CLAIMS = [
  /sub[- ]?15\s*ms/i,
  /sub[- ]?12\s*ms/i,
  /soc\s*2/i,
  /dpdp\s+compliant/i,
  /rbi\s+compliant/i,
  /99\.99%\s+uptime/i,
  /india['’]?s\s+#?1/i,
  /largest\s+(hosted\s+)?mcp\s+platform/i,
  /10,?000\+?\s+mcp\s+servers/i,
  /500,?000\+?\s+deployments/i,
  /1m\+?\s+api/i,
  /4\.9\s*\/\s*5/i,
]

const problems = []
const notes = []

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/")
}

function fail(code, file, message) {
  problems.push({ code, file: file ? rel(file) : null, message })
}

function note(message) {
  notes.push(message)
}

function readText(file) {
  return fs.readFileSync(file, "utf8")
}

function loadPolicy() {
  if (!fs.existsSync(POLICY_FILE)) {
    return { orphanAllowlist: [], claimEvidencePaths: [] }
  }

  try {
    const parsed = JSON.parse(readText(POLICY_FILE))
    return {
      orphanAllowlist: Array.isArray(parsed.orphanAllowlist)
        ? parsed.orphanAllowlist
        : [],
      claimEvidencePaths: Array.isArray(parsed.claimEvidencePaths)
        ? parsed.claimEvidencePaths
        : [],
    }
  } catch (error) {
    fail("POLICY_INVALID", POLICY_FILE, `Invalid JSON: ${error.message}`)
    return { orphanAllowlist: [], claimEvidencePaths: [] }
  }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue

    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
      continue
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full)
    }
  }

  return out
}

function collectScanFiles() {
  const files = []

  for (const root of SCAN_ROOTS) {
    walk(path.join(ROOT, root), files)
  }

  for (const name of ROOT_FILES) {
    const file = path.join(ROOT, name)
    if (fs.existsSync(file)) files.push(file)
  }

  return [...new Set(files)]
}

function verifySiteConfig() {
  if (!fs.existsSync(SITE_CONFIG)) {
    fail("SITE_CONFIG_MISSING", SITE_CONFIG, "src/config/site.ts is required")
    return
  }

  const source = readText(SITE_CONFIG)

  if (!source.includes(`origin: \"${REQUIRED_ORIGIN}\"`)) {
    fail(
      "CANONICAL_ORIGIN",
      SITE_CONFIG,
      `SITE.origin must be exactly ${REQUIRED_ORIGIN}`,
    )
  }

  if (!source.includes('hostname: "www.mcpserver.in"')) {
    fail(
      "CANONICAL_HOSTNAME",
      SITE_CONFIG,
      "SITE.hostname must be exactly www.mcpserver.in",
    )
  }
}

function evidenceContextAllowed(file, source, matchIndex, policy) {
  const relative = rel(file)
  const configured = policy.claimEvidencePaths.some(
    (prefix) => relative === prefix || relative.startsWith(`${prefix}/`),
  )

  const conventional =
    relative.startsWith("src/data/evidence/") ||
    relative.startsWith("data/evidence/") ||
    /(^|\/)claims\.(json|ts|js|mjs)$/.test(relative)

  if (!configured && !conventional) return false

  const start = Math.max(0, matchIndex - 800)
  const end = Math.min(source.length, matchIndex + 800)
  const window = source.slice(start, end)

  const hasEvidenceField = /\bevidence\s*[:=]/i.test(window)
  const hasSourceField = /\b(sourceUrl|source|registryUrl|repositoryUrl)\s*[:=]/i.test(window)

  return hasEvidenceField && hasSourceField
}

function verifySource(file, source, policy) {
  const relative = rel(file)

  if (/draft-manager/i.test(source)) {
    fail(
      "LEGACY_DRAFT_MANAGER",
      file,
      "Legacy draft-manager reference found; migrate publication authority to the Evidence Ledger",
    )
  }

  const apexUrl = /https?:\/\/mcpserver\.in(?=\/|\b)/gi
  for (const match of source.matchAll(apexUrl)) {
    fail(
      "NON_WWW_ORIGIN",
      file,
      `Hardcoded apex URL found at offset ${match.index}: ${match[0]}`,
    )
  }

  const insecureCanonical = /http:\/\/www\.mcpserver\.in(?=\/|\b)/gi
  for (const match of source.matchAll(insecureCanonical)) {
    fail(
      "INSECURE_CANONICAL",
      file,
      `HTTP production URL found at offset ${match.index}`,
    )
  }

  const previewUrl = /https?:\/\/[^\s"'`<>]*\.vercel\.app(?:\/[^\s"'`<>]*)?/gi
  for (const match of source.matchAll(previewUrl)) {
    fail(
      "PREVIEW_URL_PUBLIC",
      file,
      `Preview URL must not be embedded in public source: ${match[0]}`,
    )
  }

  for (const pattern of FORBIDDEN_CLAIMS) {
    pattern.lastIndex = 0
    const match = pattern.exec(source)
    if (!match) continue

    if (!evidenceContextAllowed(file, source, match.index, policy)) {
      fail(
        "UNSUPPORTED_CLAIM",
        file,
        `Risky factual claim requires a structured evidence record: ${JSON.stringify(match[0])}`,
      )
    }
  }

  if (
    /sitemap/i.test(relative) &&
    /lastmod|lastModified/.test(source) &&
    /new Date\s*\(\s*\)\s*\.toISOString\s*\(\s*\)/.test(source)
  ) {
    fail(
      "SITEMAP_FAKE_FRESHNESS",
      file,
      "Sitemap lastModified must come from meaningful record timestamps, not build time",
    )
  }
}

function routeFromPageFile(file) {
  const appRoot = path.join(ROOT, "app")
  const directory = path.relative(appRoot, path.dirname(file))
  if (directory.startsWith("..")) return null

  const segments = directory
    .split(path.sep)
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => !segment.startsWith("@"))

  if (segments.some((segment) => segment.startsWith("_"))) return null

  const route = `/${segments.join("/")}`.replace(/\/{2,}/g, "/")
  return route === "" ? "/" : route
}

function discoverStaticRoutes(files) {
  return files
    .filter((file) => {
      const relative = rel(file)
      return /^app\/(?:.*\/)?page\.(?:ts|tsx|js|jsx)$/.test(relative)
    })
    .map(routeFromPageFile)
    .filter(Boolean)
    .filter((route) => !route.includes("["))
}

function discoverInternalLinks(files) {
  const links = new Set(["/"])
  const patterns = [
    /\bhref\s*=\s*["'`](\/[^"'`?#]*)["'`]/g,
    /\bhref\s*=\s*\{\s*["'`](\/[^"'`?#]*)["'`]\s*\}/g,
    /\bhref\s*:\s*["'`](\/[^"'`?#]*)["'`]/g,
  ]

  for (const file of files) {
    const source = readText(file)
    for (const pattern of patterns) {
      pattern.lastIndex = 0
      for (const match of source.matchAll(pattern)) {
        let href = match[1].replace(/\/+$/, "") || "/"
        if (href.startsWith("//")) continue
        links.add(href)
      }
    }
  }

  return links
}

function verifyOrphans(files, policy) {
  const routes = discoverStaticRoutes(files)
  if (routes.length === 0) {
    note("No static App Router pages exist yet; orphan-page check deferred until scaffold is present")
    return
  }

  const incoming = discoverInternalLinks(files)
  const allow = new Set(policy.orphanAllowlist)

  for (const route of routes) {
    if (route === "/" || allow.has(route)) continue
    if (!incoming.has(route)) {
      fail(
        "ORPHAN_ROUTE",
        path.join(ROOT, "app"),
        `No statically discoverable incoming internal link for ${route}. Add a crawlable href or explicitly review/allowlist it.`,
      )
    }
  }
}

function verifySingleGeneratedAssets() {
  const robotCandidates = [
    "app/robots.ts",
    "app/robots.js",
    "app/robots.mjs",
    "public/robots.txt",
  ].filter((name) => fs.existsSync(path.join(ROOT, name)))

  if (robotCandidates.length > 1) {
    fail(
      "ROBOTS_DUPLICATE",
      null,
      `Competing robots implementations: ${robotCandidates.join(", ")}`,
    )
  }

  const sitemapCandidates = [
    "app/sitemap.ts",
    "app/sitemap.js",
    "app/sitemap.mjs",
    "public/sitemap.xml",
  ].filter((name) => fs.existsSync(path.join(ROOT, name)))

  if (sitemapCandidates.length > 1) {
    fail(
      "SITEMAP_DUPLICATE",
      null,
      `Competing sitemap implementations: ${sitemapCandidates.join(", ")}`,
    )
  }
}

function verifyPackageScripts() {
  const packageFile = path.join(ROOT, "package.json")
  if (!fs.existsSync(packageFile)) {
    note("package.json does not exist yet; script-recursion check deferred")
    return
  }

  let pkg
  try {
    pkg = JSON.parse(readText(packageFile))
  } catch (error) {
    fail("PACKAGE_INVALID", packageFile, `Invalid package.json: ${error.message}`)
    return
  }

  const build = pkg.scripts?.build || ""
  const gate = pkg.scripts?.["production:gate"] || ""

  if (/production:gate/.test(build) && /npm\s+run\s+build/.test(gate)) {
    fail(
      "SCRIPT_RECURSION",
      packageFile,
      "build calls production:gate while production:gate calls build. Keep build as the framework build and let production:gate orchestrate preflight -> build -> postbuild.",
    )
  }
}

function run() {
  const policy = loadPolicy()
  verifySiteConfig()

  const files = collectScanFiles()
  for (const file of files) {
    verifySource(file, readText(file), policy)
  }

  verifyOrphans(files, policy)
  verifySingleGeneratedAssets()
  verifyPackageScripts()

  for (const message of notes) {
    console.log(`NOTE  ${message}`)
  }

  if (problems.length > 0) {
    console.error(`\nPRODUCTION PREFLIGHT: FAIL (${problems.length} issue${problems.length === 1 ? "" : "s"})`)
    for (const problem of problems) {
      const location = problem.file ? ` ${problem.file}` : ""
      console.error(`- [${problem.code}]${location}: ${problem.message}`)
    }
    process.exit(1)
  }

  console.log(`\nPRODUCTION PREFLIGHT: PASS`)
  console.log(`Canonical origin: ${REQUIRED_ORIGIN}`)
  console.log(`Files scanned: ${files.length}`)
}

run()
