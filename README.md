# MCPserver.in — Public Authority for MCP Servers

> Evidence-backed directory, guides, and methodology for the Model Context Protocol ecosystem.

MCPserver.in is the **public authority** for MCP server discovery. It pairs a
verified server directory with a published **publication authority** that
determines what gets indexed — no fabricated counts, no AggregateRating
schema, no comparison without two verified sides.

The workspace product (`app.mcpserver.in`) is a separate deployment; this
repo builds the public authority surface only.

---

## What lives here

- **Server directory** — verified MCP servers with evidence-panel citations.
- **Editorial corpus** — 69-pillar authority graph (see `/pillars`).
- **Methodology** — the SAFE-DEEP OS v5 review framework that determines
  what is and is not indexable.
- **Machine-readable surfaces** — `/llms.txt`, `/llms-full.txt`,
  `/registry.json`, `/api/servers.json`, `/mcp-registry.json`, `/api/health`.

The publication authority is enforced by three single-source functions in
`src/content/`:

| Function              | Used by                     |
| --------------------- | --------------------------- |
| `isServerIndexable()` | Server pages, sitemap, registry |
| `isContentIndexable()`| Editorial pages, sitemap    |
| `isPillarIndexable()` | Header nav, pillar graph    |

---

## Evidence methodology

Every published claim is grounded in a primary source. The full methodology
is published at [`/methodology`](https://www.mcpserver.in/methodology) and
the editorial policy is at [`/editorial-policy`](https://www.mcpserver.in/editorial-policy).

In short: **unverified is not the same as fabricated**. If we cannot source
a claim, we either leave it out or mark it explicitly as community-documented
pattern with a `not verified against this server` flag.

---

## Local development

```bash
# Requires Node.js 24
nvm use 24

# Install
npm install

# Dev server
npm run dev

# Open http://localhost:3000
```

---

## Verification gates

```bash
# Typecheck
npx tsc --noEmit

# Tests (Vitest)
npm test

# Build
npm run build
```

CI runs the same three gates on every push and PR (see
`.github/workflows/ci.yml`).

---

## Docker / self-host

A multi-stage `Dockerfile` produces a self-contained image using Next.js
`output: "standalone"`. The full runbook is in
[`deploy/standalone-output.md`](./deploy/standalone-output.md).

```bash
# Build + run
export COMMIT_SHA=$(git rev-parse HEAD)
docker compose up --build
```

This brings up `web` (Next.js on port 3000, internal only) and `caddy`
(reverse proxy + TLS, ports 80/443). `/api/health` is the liveness probe.

---

## Repository layout

```
app/                    Next.js App Router pages and route handlers
src/content/            Publication authority surface (pillar + content + server registries)
src/seo/                SEO helpers (canonical, breadcrumbs, JSON-LD schema)
src/components/         React components (Breadcrumbs, FAQ, EvidencePanel, etc.)
data/migration/source/  Migration source data (glossary redirects, GSC export)
reports/                Generated migration ledger CSVs
scripts/                Ledger + reconciliation scripts
deploy/                 Self-host runbook
.github/                CI, Dependabot, CODEOWNERS, issue + PR templates
```

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Short version: read the
editorial policy, link a primary source for any new claim, and run the
verification gates before opening a PR.

---

## Security

Coordinated disclosure: **security@mcpserver.in** (see `security.txt`).
Full policy at [`/security`](https://www.mcpserver.in/security).
Pinned HSTS header: `max-age=31536000; includeSubDomains; preload`.
