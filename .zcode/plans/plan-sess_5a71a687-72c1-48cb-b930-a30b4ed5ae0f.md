# OMNI-LOOP Phase 1–4 + Critical Infrastructure Plan

## What's Already Done
The 69-pillar implementation is already wired in: `pillar-registry.ts` (69 pillars, P01–P69, 7 groups, 924 lines), `app/pillars/page.tsx`, 19 registry tests, 11 reconciliation tests, 69-row CSV, and the authority report all exist in this repo. What's missing is the OMNI-LOOP production-completion work: 3 P0 data blockers, Header/landing-page integration with pillar groups, 4 missing machine-readable surfaces, empty route stubs, trailing-slash/HSTS/CSP hardening, and Docker + GitHub Actions infrastructure.

## What This Plan Does (Scope)

**Resolves 3 P0 blockers** (Phase 1 + 3) → **Phase 2 canonical hardening** → **Phase 4 empty stubs** → **Phase 12 machine surfaces** → **Phase 19 Docker** → **Phase 21 GitHub Actions**

**NOT in scope** (documented as next-session items):
- Phases 6–20 (editorial evidence/dependency upgrades, server cohort fill — zero-fabrication contract)
- MASTER REVIEWER sign-off (gated until staging passes)
- DNS cutover and live production deploy

---

## 1. Resolve 3 P0 Blockers (Phase 1 + 3)

### Blockers → resolved programmatically (reversible via git)

**`data/migration/source/glossary-and-legacy-redirects.json`**
- Remove entries where `source` is `/glossary/mcp-soc-2` or `/glossary/mcp-iso-27001`
- Create `data/migration/source/glossary-protections.json` listing the 2 protected terms with status "PROTECTED — pending editorial"
- Handoff: 94 → 92 entries. Two terms no longer collapse to `/glossary/`.

**`reports/milestone-7-migration-ledger.csv`**
- Add 4 new rows for `/directory/iot`, `/directory/databases`, `/directory/devops`, `/directory/monitoring` with `decision: EVIDENCE_REVIEW`, `evidence: gsc_coverage_valid`
- Add `gsc_status` column: existing 72 DEFER_NOINDEX rows get `gsc_status: absent` (decoupled from publication authority)
- Ledger: 748 → 752 rows

**`scripts/generate-migration-ledger.ts`**
- Decouple: do not assign DEFER_NOINDEX solely because `gsc_absent`
- Populate `publication_status` from `contentRegistry` for published editorial pages

**New assertions in `src/__tests__/migration-reconciliation.test.ts`:**
- Assert handoff = 92 entries (not 94)
- Assert `mcp-soc-2` and `mcp-iso-27001` NOT in handoff
- Assert ledger = 752 rows
- Assert 4 `/directory/*` paths have EVIDENCE_REVIEW decision
- Assert decoupling: no DEFER_NOINDEX row has `publication_status: published` AND `gsc_status: absent`

---

## 2. Phase 2 — Canonical Architecture Hardening

**`middleware.ts`**
- Add trailing-slash normalization: non-root paths ending in `/` → 308 to strip it
- Add HSTS header (`max-age=31536000; includeSubDomains`) on redirect responses

**`next.config.mjs`**
- Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` to security headers array
- Update CSP `connect-src` to `self` plus `*.ingest.sentry.io https://o*.ingest.sentry.io https://*.sentry.io`
- Update `script-src` to include `*.sentry.io` (Sentry SDK needs this)

**New assertions in `src/__tests__/production-seo.test.ts`:**
- Middleware strips trailing slash
- next.config.mjs exports HSTS header
- CSP connect-src includes Sentry origins

---

## 3. Phase 4 — Empty Route Stubs (Truthful Noindex Pages)

Each empty directory gets a `page.tsx` that returns 200 + noindex meta with a truthful "no verified content" message. All read from `pillar-registry.ts` or `contentRegistry` to avoid fabricating routes.

- `app/blog/page.tsx` — reads `PILLAR_REGISTRY[P68]`, renders "MCP Blog — no published posts yet", `noindex: true`
- `app/integrations/page.tsx` — pillar-registry placeholder, `noindex: true`
- `app/state-of-mcp/page.tsx` — pillar-registry placeholder, `noindex: true`
- `app/categories/[slug]/page.tsx` — reads `PILLAR_REGISTRY[P62]`, dynamic lookup
- `app/capabilities/[slug]/page.tsx` — reads `PILLAR_REGISTRY[P63]`
- `app/compare/[slug]/page.tsx` — reads `PILLAR_REGISTRY[P61]`
- `app/servers/mcp-server-postgres/page.tsx` — renders the server-registry entry's "No verified implementation as of 2026-08-22" message (zero-fabrication compliant)
- `app/.well-known/security.txt` — copy from root `security.txt`
- `app/.well-known/ai.txt` — copy from root `ai.txt`

---

## 4. Phase 12 — Machine-Readable Surfaces

- `app/llms-full.txt/route.ts` — full body content (sections + FAQ), not just title+desc. Same cohort filter as `/llms.txt`.
- `app/api/health/route.ts` — returns `{ status: "ok", sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev", now: ISO8601 }`. Omits fabricated uptime/metrics.
- `app/api/servers.json/route.ts` — delegates to `/registry.json` route handler (alias path per OMNI-LOOP contract)
- `app/mcp-registry.json/route.ts` — delegates to `/registry.json` route handler (matches MCP server.json convention)

**New assertions in `src/__tests__/llms.test.ts`:**
- `/llms-full.txt` content length > title-only `/llms.txt`
- `/api/health` returns 200 + status="ok"
- `/api/servers.json` slugs === `/registry.json` slugs
- `/mcp-registry.json` slugs === `/registry.json` slugs

---

## 5. Phase 19 — Self-Host Runtime

**`Dockerfile`** (multi-stage, Node 24, non-root, standalone output)
- Stage 1: build → `npm ci && npm run build`
- Stage 2: `node:24-alpine` runtime → `COPY --from=build /app/.next/standalone ./`
- `HEALTHCHECK` via curl to `/api/health`
- `APP_VERSION=$COMMIT_SHA` build arg

**`docker-compose.yml`**
- Services: `web` (Next.js), `caddy` (Caddy 2)
- `web` port 3000 (internal), `caddy` port 80/443
- Volume for Caddy ACME data
- Health check via `web:3000/api/health`

**`Caddyfile`**
- `www.mcpserver.in` → reverse_proxy `web:3000`
- `mcpserver.in` → 308 to `https://www.mcpserver.in{uri}`
- `app.mcpserver.in` → 308 to `https://www.mcpserver.in{uri}` (matches middleware)
- HSTS, security headers, gzip, ACME (Let's Encrypt)
- `handle /.well-known/*` → reverse_proxy web:3000

**`deploy/standalone-output.md`** — how to build and run self-host.

**Note:** `next.config.mjs` must set `output: 'standalone'` for Docker to work. This is added.

---

## 6. Phase 21 — GitHub Authority

- `.github/workflows/ci.yml` — Node 24, npm ci → tsc → vitest → build, caches node_modules
- `.github/dependabot.yml` — npm ecosystem, weekly, minor+patch
- `.github/CODEOWNERS` — `* @CodesbyFebin`
- `README.md` — project identity, evidence methodology, Docker quick-start, links to `/docs`, `/evidence`
- `CONTRIBUTING.md` — short, links to `/editorial-policy`
- `SECURITY.md` — short, links to `/methodology`
- `SUPPORT.md` — short, links to `/troubleshooting`
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

---

## 7. Update Baseline Report

- `reports/OMNI_BASELINE.md`: re-baseline G1–G12, mark G7, G8, G9 as RESOLVED, add "Completed in this session" section

---

## 8. Final Verification

```bash
npx tsc --noEmit                              # PASS
npx vitest run                                # 145+ tests PASS (was 138, +7 new)
npm run build 2>&1 | tee /tmp/build.log     # BUILD_EXIT=0
docker build -t mcpserver-in:test .          # exit 0, image < 500MB
docker compose config                         # config valid YAML
```

**Hard gates:**
1. All 138 existing tests still pass
2. New tests for blockers, security headers, machine surfaces pass
3. `npm run build` exits 0
4. Docker build succeeds
5. CSP + HSTS verified in built bundle

---

## Files Summary

**New (35 files):**
`data/migration/source/glossary-protections.json`, `app/blog/page.tsx`, `app/integrations/page.tsx`, `app/state-of-mcp/page.tsx`, `app/categories/[slug]/page.tsx`, `app/capabilities/[slug]/page.tsx`, `app/compare/[slug]/page.tsx`, `app/servers/mcp-server-postgres/page.tsx`, `app/.well-known/security.txt`, `app/.well-known/ai.txt`, `app/llms-full.txt/route.ts`, `app/api/health/route.ts`, `app/api/servers.json/route.ts`, `app/mcp-registry.json/route.ts`, `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `deploy/standalone-output.md`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`

**Modified (7 files):**
`data/migration/source/glossary-and-legacy-redirects.json` (remove 2 entries), `reports/milestone-7-migration-ledger.csv` (+4 rows, +1 column), `scripts/generate-migration-ledger.ts` (decouple logic), `src/__tests__/migration-reconciliation.test.ts` (update integers + new assertions), `middleware.ts` (trailing slash + HSTS), `next.config.mjs` (HSTS + CSP Sentry + standalone output), `src/__tests__/production-seo.test.ts` (new assertions)

**Total changes: 42 files (35 new, 7 modified)**

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Decoupling DEFER_NOINDEX breaks migration contract | Run `scripts/audit-reconciliation.ts` before/after; diff should only show +4 rows and column add |
| `output: 'standalone'` change breaks Vercel deploy | Test build locally; Vercel handles standalone output natively |
| CSP change blocks Sentry in production | Sentry DNS check is in `instrumentation.ts` already; verify with test build |
| Empty stubs leak into sitemap | All stub pages set `noindex: true`; sitemap only includes published + noindex=false |
| Docker build fails on missing deps | `npm ci` runs inside Dockerfile stage 1; verify with `docker build` as final gate |