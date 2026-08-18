# MCPserver.in — Production Acceptance

Status: **HOLD — production candidate is gate-backed, release is not yet frozen**

## Source identity

- Repository: `CodesbyFebin/mcp-servers-master`
- Branch: `feat/consolidation-foundation`
- Candidate commit: `fdbfd45061e506ae607643275f8b00186615aab3`
- Pull request: `#1`

## Deployment identity

- Vercel project: `projects555/mcp-servers-master`
- Vercel project id: `prj_SsBgiKdLvyavXiTY6pxCfj2wOUDi`
- Candidate deployment id: `dpl_FKXVbWZ5aHVvUNM7q9NkVSDC9gEg`
- Candidate deployment URL: `https://mcp-servers-master-bqopnoflj-projects555.vercel.app`
- Deployment state: `READY`
- Deployment target: preview (`target: null`), not production

## Gate evidence

Vercel cloned commit `fdbfd45` and executed the configured build command:

```text
npm run production:gate
```

The gate executed:

```text
npm run verify:preflight
npm run typecheck
npm test
npm run build
```

Observed results:

- `PRODUCTION PREFLIGHT: PASS`
- Canonical origin: `https://www.mcpserver.in`
- TypeScript: PASS
- Vitest: 2 test files PASS
- Vitest: 5 tests PASS
- Next.js production compilation: PASS
- Static generation: 20/20 pages PASS
- Deployment: completed

Observed Vercel build versions:

- Next.js: `16.3.1`
- Vitest: `4.1.11`
- Turbopack build

## Generated public route surface

The gate-backed build emitted:

- `/`
- `/docs`
- `/evidence`
- `/learn`
- `/llms-full.txt`
- `/llms.txt`
- `/methodology`
- `/robots.txt`
- `/servers`
- 8 statically generated `/servers/[slug]` routes
- `/sitemap.xml`
- request Proxy

## Runtime preview evidence

A gate-backed preview response for `/` returned HTTP 200 with crawl-critical content present in raw HTML, including:

- `lang="en-IN"`
- title
- meta description
- H1
- crawlable internal links
- canonical pointing to `https://www.mcpserver.in`
- Open Graph URL pointing to `https://www.mcpserver.in`
- Organization/WebSite JSON-LD
- evidence-derived server counts and server links

Observed response protections included:

- `X-Robots-Tag: noindex, follow`
- Content-Security-Policy
- Strict-Transport-Security (Vercel edge)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy

This verifies that the Vercel preview is non-indexable while its document canonicals point to the intended production origin.

## Publication contract

The production candidate uses one `isPublicIndexable()` predicate. Public server records require:

1. `publicationStatus === "published"`
2. `verificationStatus === "verified"`
3. `noindex !== true`
4. at least one evidence record with `status === "verified"` or `status === "measured"`

The same predicate drives the server directory, server static params, sitemap entity entries, `llms.txt`, and `llms-full.txt`.

## Current seed evidence

The first 8 public records were migrated from the existing `MCP-SERVER` Official MCP Registry snapshot dated `2026-08-15`. Each migrated record carries an explicit registry evidence record. This acceptance report does **not** claim that those sources were freshly re-fetched during this consolidation run.

## Release blockers

### B1 — Dependency lockfile not committed

`package-lock.json` is not yet committed. The Vercel build resolved semver ranges to Next.js `16.3.1` and Vitest `4.1.11`, demonstrating that dependency resolution is not frozen by the repository alone.

Exit criteria:

- generate `package-lock.json` from the candidate `package.json`
- commit it
- change CI install to `npm ci`
- run the full production gate again against that exact lockfile-backed SHA

### B2 — Production domain cutover not executed

This deployment is a preview (`target: null`). This report does not claim that `www.mcpserver.in` is currently served by this repository or deployment.

Exit criteria:

- merge the final green PR to `main`
- deploy the exact lockfile-backed merge SHA to the production Vercel project
- bind `www.mcpserver.in` as the primary domain
- ensure `mcpserver.in` redirects in one hop to the matching `https://www.mcpserver.in` path
- validate the public origin after DNS/domain stabilization

### B3 — Protected preview prevents direct unauthenticated sitemap-body acceptance

The protected Vercel preview can be fetched through authenticated tooling for HTML validation, but direct sitemap requests encountered the Vercel SSO protection layer. The build proves `/sitemap.xml` is generated; production cutover acceptance must additionally fetch and validate its actual body from the public production origin.

## Explicitly not claimed

This report does not claim:

- Google indexing
- rankings
- Search Console submission
- Bing submission
- IndexNow submission
- AI citation placement
- Lighthouse/Core Web Vitals scores
- formal security certification
- DPDP/RBI/SOC 2 compliance
- uptime or latency guarantees
- production-domain cutover

## Current gate summary

| Gate | Status |
|---|---|
| Source branch identity | PASS |
| Canonical architecture | PASS |
| Evidence/indexability contract | PASS |
| Preflight | PASS |
| TypeScript | PASS |
| Unit tests | PASS |
| Next.js build | PASS |
| Vercel preview deployment | PASS |
| Preview noindex | PASS |
| Raw HTML crawlability | PASS |
| Security header baseline | PASS |
| Dependency lockfile | **FAIL / BLOCKER** |
| Exact reproducible install (`npm ci`) | **FAIL / BLOCKER** |
| Production domain cutover | **NOT EXECUTED** |
| Public production sitemap body verification | **PENDING CUTOVER** |

## Overall

**HOLD — not yet 100/100 implementation readiness.**

The candidate is technically coherent and gate-backed. Release certification requires a committed lockfile followed by a fresh green gate on that exact SHA, then production-domain cutover and public-origin acceptance.
