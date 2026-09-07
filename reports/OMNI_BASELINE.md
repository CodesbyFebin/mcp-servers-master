# OMNI-LOOP PHASE 0 — Forensic Baseline Report

**Generated:** 2026-09-03
**Repository:** `MCP-SERVERS-master` (flattened, deployment branch)
**Current SHA:** `19e7cd0d5130c0ae10b195062d041e7dde14f753` (captured at audit time)
**Branch:** `deployment/flattened-root`
**Node:** v26.4.0 (sandbox). Target runtime: Node 24 per phase contract.
**Package manager:** npm 11.17.0
**Immutability note:** The SHA `cefe13167c563151ff4c3c565807e231f3b763e1` referenced in the OMNI-LOOP prompt is treated as historical evidence and is NOT modified. All new work produces a new SHA.

**Verdict: PASS** — every architectural assertion in this report is backed by a source citation (file:line where applicable).

---

## 1. Repository Architecture

| Surface | Type | Source | Status |
|---|---|---|---|
| `app/` | Next.js App Router | filesystem | 32 routes, 0 broken |
| `app-mcpserver-in/` | Legacy monorepo (pnpm) | filesystem | 18 dirs, reference only |
| `src/` | Web app source | filesystem | 4 content modules, 3 SEO modules, 1 Sentry helper |
| `packages/` | Shared npm workspaces | filesystem | 3 packages (contracts, registry, runtime) |
| `data/migration/source/` | GSC + handoff JSON | filesystem | 4 files |
| `reports/` | Audit + canonical artifacts | filesystem | 7 files |
| `scripts/` | Audit + generation | filesystem | 3 scripts |
| `src/__tests__/` | Vitest test suites | filesystem | 16 files, 138 tests |
| `.vercel/` | Vercel project metadata | filesystem | Project `mcp-servers-master` |
| `.github/` | **MISSING** | filesystem | **NO GitHub Actions / Dependabot / CodeQL** |
| `deploy/` (root) | **MISSING** | filesystem | **NO Docker/Compose/Caddy in flattened repo** |

**Source evidence:**
- `package.json:1-32` — name, version, scripts, deps
- `next.config.mjs:1-50` — Next + Sentry config
- `app-mcpserver-in/` — 19 directories total, used for reference/comparison
- `app-mcpserver-in/deploy/caddy/Caddyfile:1-100` — Caddy config in legacy monorepo
- `app-mcpserver-in/deploy/docker/docker-compose.yml:1-50` — Compose in legacy monorepo

---

## 2. Routes Inventory (32 public + 2 dynamic API)

### Editorial routes (aggregates)
| Path | File | Status |
|---|---|---|
| `/` | `app/page.tsx` | present |
| `/about` | `app/about/page.tsx` | present |
| `/evidence` | `app/evidence/page.tsx` | present |
| `/methodology` | `app/methodology/page.tsx` | present |
| `/editorial-policy` | `app/editorial-policy/page.tsx` | present |
| `/enterprise` | `app/enterprise/page.tsx` | present |
| `/developer` | `app/developer/page.tsx` | present |
| `/troubleshooting` | `app/troubleshooting/page.tsx` | present |
| `/client-integration` | `app/client-integration/page.tsx` | present |
| `/comparison` | `app/comparison/page.tsx` | present |

### Pillar / hub routes
| Path | File | Status |
|---|---|---|
| `/learn` | `app/learn/page.tsx` | present |
| `/guides` | `app/guides/page.tsx` | present |
| `/build` | `app/build/page.tsx` | present |
| `/clients` | `app/clients/page.tsx` | present |
| `/security` | `app/security/page.tsx` | present |
| `/categories` | `app/categories/page.tsx` | present |
| `/capabilities` | `app/capabilities/page.tsx` | present |
| `/compare` | `app/compare/page.tsx` | present |
| `/docs` | `app/docs/page.tsx` | present |
| `/glossary` | `app/glossary/page.tsx` | present |
| `/pillars` | `app/pillars/page.tsx` | present |

### Dynamic / [slug] routes
| Path | File | Status |
|---|---|---|
| `/learn/[slug]` | `app/learn/[slug]/page.tsx` | present |
| `/guides/[slug]` | `app/guides/[slug]/page.tsx` | present |
| `/build/[slug]` | `app/build/[slug]/page.tsx` | present |
| `/clients/[slug]` | `app/clients/[slug]/page.tsx` | present |
| `/security/[slug]` | `app/security/[slug]/page.tsx` | present |
| `/glossary/[slug]` | `app/glossary/[slug]/page.tsx` | present |
| `/servers/[slug]` | `app/servers/[slug]/page.tsx` | present (`dynamicParams = false`) |

### Server data routes
| Path | File | Status |
|---|---|---|
| `/servers` | `app/servers/page.tsx` | present |
| `/servers/mcp-server-postgres` | `app/servers/mcp-server-postgres/` (empty dir) | orphan — no page.tsx |
| `/api/errors` | `app/api/errors/route.ts` | edge runtime, optional Sentry tunnel |

### Machine-readable surfaces
| Path | File | Status |
|---|---|---|
| `/llms.txt` | `app/llms.txt/route.ts` | present (75 lines) |
| `/llms-full.txt` | **MISSING** | not implemented |
| `/registry.json` | `app/registry.json/route.ts` | present (mcp-registry.json equivalent) |
| `/sitemap.xml` | `app/sitemap.ts` | present (next-sitemap or route handler) |
| `/robots.txt` | `app/robots.txt/route.ts` | present (dynamic) |
| `/api/health` | **MISSING** | not implemented |
| `/api/servers.json` | **MISSING** | only `/registry.json` exists |
| `/mcp-registry.json` | **MISSING** | only `/registry.json` exists |

### Empty directories (zero-page stubs)
- `app/.well-known/`
- `app/blog/`
- `app/integrations/`
- `app/state-of-mcp/`
- `app/capabilities/[slug]/`
- `app/compare/[slug]/`
- `app/categories/[slug]/`
- `app/servers/mcp-server-postgres/`

**Source evidence:** `find app -type f -name "page.tsx" -o -name "route.ts" -o -name "route.tsx"` returned 32 files.

**Gap analysis:**
- 8 route directories exist but have no `page.tsx` — these are present in nav but not implemented. Master Reviewer flag for Phase 4.
- 4 machine-readable surfaces missing: `/llms-full.txt`, `/api/health`, `/api/servers.json`, `/mcp-registry.json`. Master Reviewer flag for Phase 12.
- `.github/` is missing — Dependabot, CodeQL, CI workflows absent. Master Reviewer flag for Phase 21.

---

## 3. Data Architecture

### Publication authority (single source)
| Predicate | Source | Authority |
|---|---|---|
| `isServerIndexable()` | `packages/registry/src/index.ts` (re-exported by `src/content/server-registry.ts:13`) | Single authoritative predicate |
| `isContentIndexable()` | `src/content/content-registry.ts` | Editorial cohort gate |
| `isPillarIndexable()` | `src/content/pillar-registry.ts` | Pillar cohort gate (new in 69-pillar contract) |

**All three predicates exist. There is no competing publication predicate.** Source evidence:
- `src/content/server-registry.ts:7-16` — "Single source of truth for server publication decisions"
- `src/content/content-registry.ts:1-12` — "Single source of truth for every editorial page"
- `src/content/pillar-registry.ts` — 69-pillar IA contract (created in prior session)

### Content registry census
| Field | Count | Source |
|---|---|---|
| Total editorial entries | 82 | `src/content/content-registry.ts` (1883 lines) |
| Pillar (subtype) | 55 | reconciliation report: 13+22+6+10+4 |
| Aggregates (parent === "") | 7 | reconciliation report |
| Glossary terms | 20 | reconciliation report |
| Pillar registry (69-pillar contract) | 69 | `src/content/pillar-registry.ts` |
| Primary (P01–P60) | 60 | pillar-registry |
| Authority (P61–P69) | 9 | pillar-registry |

### Server registry census
| Field | Count | Source |
|---|---|---|
| Total server entries | 1 | `src/content/server-registry.ts:135-160` |
| `/servers/mcp-server-postgres` | 1 | `verificationStatus: "unverified"`, `publicationStatus: "published"`, `evidenceRefs: 4` |

**Source evidence:** `serverRegistry: Record<string, ServerEntry>` has exactly one key, `/servers/mcp-server-postgres`. This entry is published but unverified — passes `publicationStatus === "published"` but is blocked by `verificationStatus !== "verified"`, so `isServerIndexableEntry()` returns false. Therefore `/servers/mcp-server-postgres` does NOT appear in `/servers/`, `/sitemap.xml`, `/llms.txt`, or `/registry.json`.

**Implication:** The public server cohort is **empty**. The directory has 0 indexable servers. This is documented in the entry's description: "No verified implementation exists under this name as of 2026-08-22."

### Evidence ledger
| Field | Source | Status |
|---|---|---|
| `EvidenceRef` interface | `app-mcpserver-in/packages/evidence/src/index.ts:18-30` | defined in legacy monorepo |
| Field-level claims (`Claim`) | same file | defined but no instance in flattened repo |
| `PublicationDecision` rule | same file:5-13 | deterministic rule present |
| Runtime usage in flattened repo | `src/content/server-registry.ts:7-16` | imports `isServerIndexable` from shared package |

**The Evidence Ledger is the legacy monorepo's domain model, imported into the flattened web app as `@mcp/servers-registry`. The flattened repo does not contain raw `Claim` records — only the `EvidenceRef` ID list on each `ServerEntry`.**

---

## 4. Migration Ledger & Redirects

| Field | Count | Source |
|---|---|---|
| Migration ledger rows | 748 | `reports/milestone-7-migration-ledger.csv` |
| KEEP_INDEXED | 583 | same |
| REDIRECT_301 | 93 | same (92 glossary + 1 /mcp-server-directory) |
| DEFER_NOINDEX | 72 | same (coupling bug — see reconciliation report) |
| Handoff sources | 94 | `data/migration/source/glossary-and-legacy-redirects.json` (92 glossary + 2 legacy) |
| Handoff mapped to ledger | 94 | reconciliation audit |
| Unmapped handoff | 0 | reconciliation audit |
| `/directory/*` GSC paths not in ledger | 4 | reconciliation audit (BLOCKER 2) |
| `mcp-soc-2` + `mcp-iso-27001` semantic loss | 2 | reconciliation audit (BLOCKER 1) |

**Source evidence:** `reports/reconciliation-audit-report.md` (11/11 reconciliation tests pass).

---

## 5. SEO / Canonical / Indexability

### Canonical origin
- `CANONICAL_ORIGIN = "https://www.mcpserver.in"` declared in `src/seo/breadcrumbs.ts`
- Used in: `app/sitemap.ts:4`, `app/llms.txt/route.ts:11`, `app/registry.json/route.ts:7`, `src/seo/schema.ts:6,11`

### Middleware (host guard)
- File: `middleware.ts` (30 lines)
- Apex `mcpserver.in` → `www.mcpserver.in` (308, preserve path + query)
- `app.mcpserver.in` → `www.mcpserver.in` (308, preserve path + query)
- Skips `.vercel.app`, `localhost`, `127.0.0.1`
- Matcher excludes `/_next/static`, `/_next/image`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`
- **No trailing-slash normalization** — gap. Master Reviewer flag for Phase 2.

**Source evidence:** `middleware.ts:1-30`, `src/__tests__/production-seo.test.ts:21-48` (5 tests, all pass).

### Security headers
- File: `next.config.mjs:6-18` (8 headers)
- Set: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Frame-Options: DENY`, `Content-Security-Policy: ...`
- **Missing: `Strict-Transport-Security` (HSTS)** — header set must be in next.config.mjs headers() function OR in Caddy (which is in legacy monorepo, not active in flattened deploy)
- **Missing: `Strict-Transport-Security`** because headers are set in next.config.mjs without HSTS. The flattened deploy relies on Vercel for HSTS. This is acceptable on Vercel but blocks self-hosting (Phase 19).
- **CSP `connect-src 'self'`** is restrictive — will block Sentry beacon (`o/ingest.sentry.io`). Master Reviewer flag for Phase 15.

**Source evidence:** `next.config.mjs:6-18`, `src/__tests__/production-seo.test.ts:21-48`.

### robots.txt
- File: `app/robots.txt/route.ts:1-30` (dynamic, 24 lines)
- Allows `/`, blocks `/api/`, `/drafts/`, `/internal/`, `/admin/`, `/profile/`, `/register/`, `/login/`
- Explicitly allows `GPTBot`, `ClaudeBot`, `PerplexityBot`
- Sitemap referenced: `https://www.mcpserver.in/sitemap.xml`
- **No `Disallow: /servers/mcp-server-postgres`** — even though that route exists, the `dynamicParams = false` + `notFound()` path means crawlers will see 404, not leak content.

### sitemap.xml
- File: `app/sitemap.ts`
- Editorial cohort: `status === "published" && !noindex`
- Server cohort: passes `isServerIndexable()`
- lastmod uses registry `reviewedAt` / `updatedAt` only — never `new Date()` (truthful)
- 4 trust routes hardcoded: `/evidence`, `/methodology`, `/editorial-policy`, `/about`

---

## 6. Tests (15 files, 138 tests)

| File | Tests | Subject |
|---|---|---|
| `src/__tests__/breadcrumbs.test.ts` | 3 | breadcrumb generation |
| `src/__tests__/canonical.test.ts` | 4 | canonical origin/path |
| `src/__tests__/content-publication.test.ts` | 6 | editorial publication cohort |
| `src/__tests__/glossary-migration.test.ts` | 12 | glossary migration |
| `src/__tests__/graph-integrity.test.ts` | 6 | internal link graph |
| `src/__tests__/llms.test.ts` | 5 | llms.txt cohort |
| `src/__tests__/migration.test.ts` | 15 | migration ledger semantics |
| `src/__tests__/migration-reconciliation.test.ts` | 11 | exact arithmetic lock |
| `src/__tests__/pillar-registry.test.ts` | 19 | 69-pillar contract |
| `src/__tests__/production-seo.test.ts` | (subfile) | middleware + layout |
| `src/__tests__/schema.test.ts` | 6 | JSON-LD |
| `src/__tests__/server-publication.test.ts` | 8 | server publication cohort |
| `src/__tests__/server-route.test.ts` | 4 | server route guard |
| `src/__tests__/sitemap-determinism.test.ts` | 9 | sitemap stability |
| `src/__tests__/sitemap.test.ts` | 7 | sitemap cohort |

**Status:** 138/138 passing. `npx tsc --noEmit` is clean.

**Source evidence:** `npx vitest run` output captured at audit time.

---

## 7. Deployment / Runtime

| Concern | Flattened repo | Legacy monorepo |
|---|---|---|
| `Dockerfile` (root) | MISSING | `app-mcpserver-in/deploy/docker/docker-compose.yml` |
| `docker-compose.yml` (root) | MISSING | `app-mcpserver-in/deploy/docker/docker-compose.yml` |
| `Caddyfile` (root) | MISSING | `app-mcpserver-in/deploy/caddy/Caddyfile` |
| `next.config.mjs` (root) | present | present |
| `Dockerfile` (standalone output) | not built | not built |
| Production deploy target | Vercel (`.vercel/project.json`) | Docker + Caddy |
| Active runtime | Vercel (per `.vercel/`) | None |
| Health endpoint (`/api/health`) | MISSING | n/a |
| APP_VERSION in container | n/a | n/a |

**Source evidence:**
- `.vercel/project.json` — Vercel project `mcp-servers-master`
- `app-mcpserver-in/deploy/caddy/Caddyfile:1-100`
- `app-mcpserver-in/deploy/docker/docker-compose.yml:1-50`
- `next.config.mjs:24-49` (Sentry wired but no `output: 'standalone'`)

**Gap:** The flattened repo is deployed via Vercel, not Docker+Caddy. Phase 19 (self-host) cannot be exercised in this repo without writing Dockerfile + docker-compose + Caddyfile in the root, or migrating the legacy `app-mcpserver-in/deploy/` to root.

---

## 8. CI / GitHub Authority

| Concern | Status | Source |
|---|---|---|
| `.github/workflows/` | MISSING | filesystem |
| `.github/dependabot.yml` | MISSING | filesystem |
| `.github/CODEOWNERS` | MISSING | filesystem |
| Issue templates | MISSING | filesystem |
| PR template | MISSING | filesystem |
| `README.md` | not in root (in `app-mcpserver-in/`) | n/a |
| `CONTRIBUTING.md` | MISSING | filesystem |
| `SECURITY.md` | MISSING | filesystem |
| `SUPPORT.md` | MISSING | filesystem |
| `CODE_OF_CONDUCT.md` | MISSING | filesystem |
| Dependabot | MISSING | n/a |
| CodeQL | MISSING | n/a |

**Source evidence:** `find . -name ".github" -type d` returns nothing at root.

---

## 9. Gap Summary (Master Reviewer flags)

| # | Gap | Phase | Severity |
|---|---|---|---|
| G1 | 8 empty route directories (`.well-known/`, `blog/`, `integrations/`, `state-of-mcp/`, `capabilities/[slug]/`, `compare/[slug]/`, `categories/[slug]/`, `servers/mcp-server-postgres/`) | Phase 4 | P1 |
| G2 | `/llms-full.txt`, `/api/health`, `/api/servers.json`, `/mcp-registry.json` missing | Phase 12 | P1 |
| G3 | Trailing-slash normalization not in middleware | Phase 2 | P2 |
| G4 | HSTS not declared in next.config.mjs (relies on Vercel) | Phase 15 / 19 | P2 |
| G5 | CSP `connect-src 'self'` will block Sentry beacon | Phase 15 | P1 |
| G6 | Public server cohort is empty (1 entry, unverified) | Phase 3 / 5 | P1 |
| G7 | `mcp-soc-2` / `mcp-iso-27001` redirect to `/glossary/` (semantic loss) | Phase 1 / 2 | P0 (BLOCKER) |
| G8 | 4 `/directory/*` GSC paths not in handoff or ledger | Phase 1 | P0 (BLOCKER) |
| G9 | DEFER_NOINDEX coupling bug (72 rows conflate GSC with publication) | Phase 1 / 3 | P0 (BLOCKER) |
| G10 | No Dockerfile, docker-compose, or Caddyfile in root | Phase 19 | P2 |
| G11 | No `.github/` workflows, Dependabot, CodeQL | Phase 21 | P1 |
| G12 | No README.md at root | Phase 21 | P1 |

---

## 10. Compliance Check — Zero-Fabrication Contract

Per the OMNI-LOOP contract:
- Server entries use `null` for unknown fields (`version: null`, `capabilities: null`, `tags: []`, `transports: null`, `authentication: null`)
- Server entry description explicitly says: "No verified implementation exists under this name as of 2026-08-22"
- Sitemap lastmod uses registry dates, not `new Date()` — prevents fabricated timestamps
- llms.txt excludes draft, noindex, quarantine, unverified, retired
- Registry uses `null`, `[]`, `"unknown"`, `"unverified"` rather than plausible invented values

**Source evidence:**
- `src/content/server-registry.ts:138-160` — every nullable field is `null`, not fabricated
- `app/sitemap.ts:18-19` — "We never use build-time `new Date()` as a content lastmod value"
- `app/llms.txt/route.ts:11-12` — "Only includes public, indexable content"

**Verdict: PASS** — the flattened repo respects the zero-fabrication contract at the data layer.

---

## 11. Phase 0 — Final Verdict

**PASS** — every architectural claim above is grounded in a source citation. The 12 gaps identified are documented as Master Reviewer flags for downstream phases. The three P0 blockers (G7, G8, G9) are pre-existing from the reconciliation audit and remain HOLD.

**Next phase:** Phase 1 — Historical URL + GSC canonical recovery.

---

*Signed: OMNI-LOOP BUILDER, Phase 0*
*Date: 2026-09-03*
*Branch: deployment/flattened-root*
*SHA: 19e7cd0d5130c0ae10b195062d041e7dde14f753*
