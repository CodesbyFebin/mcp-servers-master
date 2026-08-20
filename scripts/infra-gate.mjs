#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const composePath = path.join(root, "docker-compose.yml")
const envExamplePath = path.join(root, ".env.example")
const caddyPath = path.join(root, "infra/Caddyfile")

const requiredServices = ["web", "app", "api", "mcp-server", "gateway", "redis", "postgres", "caddy"]
const foundationServices = ["app", "api", "mcp-server", "gateway"]
const problems = []

function read(file) {
  if (!fs.existsSync(file)) {
    problems.push(`missing ${path.relative(root, file)}`)
    return ""
  }
  return fs.readFileSync(file, "utf8")
}

const compose = read(composePath)
const envExample = read(envExamplePath)
const caddy = read(caddyPath)

for (const service of requiredServices) {
  const pattern = new RegExp(`^\\s{2}${service.replace("-", "\\-")}:\\s*$`, "m")
  if (!pattern.test(compose)) problems.push(`compose service missing: ${service}`)
}

for (const service of foundationServices) {
  const blockPattern = new RegExp(`^\\s{2}${service.replace("-", "\\-")}:([\\s\\S]*?)(?=^\\s{2}[a-zA-Z0-9-]+:|^networks:|^volumes:)`, "m")
  const block = compose.match(blockPattern)?.[1] ?? ""
  if (!/SERVICE_MODE:\s*foundation/.test(block) || !/mcpserver\.foundation-only/.test(compose)) {
    problems.push(`foundation-only disclosure missing for ${service}`)
  }
}

for (const key of ["POSTGRES_PASSWORD", "REDIS_PASSWORD", "JWT_SECRET"]) {
  const match = envExample.match(new RegExp(`^${key}=(.+)$`, "m"))
  if (!match) problems.push(`.env.example missing ${key}`)
  else if (!/replace-/i.test(match[1])) problems.push(`${key} example must remain an explicit non-secret placeholder`)
}

if (!/www\.mcpserver\.in/.test(caddy)) problems.push("Caddy canonical www host missing")
if (!/mcpserver\.in\s*\{[\s\S]*redir https:\/\/www\.mcpserver\.in\{uri\} permanent/m.test(caddy)) {
  problems.push("Caddy apex -> www permanent redirect missing")
}
if (!/\.well-known\/mcp/.test(caddy)) problems.push("Caddy .well-known MCP route missing")

if (problems.length > 0) {
  console.error(`INFRA PREFLIGHT: FAIL (${problems.length})`)
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}

console.log("INFRA PREFLIGHT: PASS")
console.log(`Services: ${requiredServices.join(", ")}`)
console.log(`Foundation-only: ${foundationServices.join(", ")}`)
