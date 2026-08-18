# MCPserver.in — Production Acceptance

Status: **RELEASE-READY / DOMAIN CUTOVER PENDING**

## Source identity

- Repository: `CodesbyFebin/mcp-servers-master`
- Branch: `feat/consolidation-foundation`
- Verified implementation baseline: `a537626f11284b363c7d1f4db2562ba24c562ec3`
- Pull request: `#1`
- Dependency lockfile: committed (`package-lock.json`, lockfile v3)
- CI install mode: `npm ci`

The commit containing this report is documentation-only relative to the verified implementation baseline. A final merge must still require the same production gate to remain green.

## Deployment identity

- Vercel project: `projects555/mcp-servers-master`
- Vercel project id: `prj_SsBgiKdLvyavXiTY6pxCfj2wOUDi`
- Verified baseline deployment id: `dpl_7LhXaBQqTLRreDGe2JhNQUzWjzbT`
- Verified baseline deployment URL: `https://mcp-servers-master-5nsumimjz-projects555.vercel.app`
- Deployment state: `READY`
- Deployment target: preview (`target: null`), not production

## Gate evidence

GitHub Actions executed the lockfile-backed workflow on the verified baseline and completed successfully:

```text
npm ci
npm run production:gate
```

The production gate executes:

```text
npm run verify:preflight
npm run typecheck
npm test
npm run build
```

Observed results across the gate-backed candidate lineage:

- `PRODUCTION PREFLIGHT: PASS`
- Canonical origin: `https://www.mcpserver.in`
- TypeScript: PASS
- Vitest: 2 test files PASS
- Vitest: 5 tests PASS
- Next.js production compilation: PASS
- Static generation: 20/20 pages PASS
- Vercel deployment: READY

The lockfile freezes dependency resolution for reproducible `npm ci` installs. Node is pinned to major version 24 in `package.json` and GitHub Actions.

## Generated public route surface

The gate-backed build emits:

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

## Remaining external release work

### R1 — Production domain cutover

The verified deployment is a preview (`target: null`). This report does not claim that `www.mcpserver.in` is currently served by this repository or deployment.

Exit criteria:

- merge the final green PR to `main`
- allow Vercel to deploy the exact merge result as production
- bind or confirm `www.mcpserver.in` as the primary production domain
- ensure `mcpserver.in` redirects in one hop to the matching `https://www.mcpserver.in` path
- validate the public origin after domain/DNS stabilization

### R2 — Public-origin sitemap acceptance

The protected preview proves `/sitemap.xml` is generated at build time, but direct unauthenticated sitemap-body requests can be intercepted by Vercel preview protection. After cutover, fetch the public production sitemap and verify every URL is a 200, self-canonical, indexable `www.mcpserver.in` URL.

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
- completed production-domain cutover

## Current gate summary

| Gate | Status |
|---|---|
| Source branch identity | PASS |
| Canonical architecture | PASS |
| Evidence/indexability contract | PASS |
| Dependency lockfile | PASS |
| Exact reproducible install (`npm ci`) | PASS |
| Preflight | PASS |
| TypeScript | PASS |
| Unit tests | PASS |
| Next.js build | PASS |
| GitHub Actions production gate | PASS |
| Vercel preview deployment | PASS |
| Preview noindex | PASS |
| Raw HTML crawlability | PASS |
| Security header baseline | PASS |
| Production domain cutover | **PENDING** |
| Public production sitemap body verification | **PENDING CUTOVER** |

## Overall

**RELEASE-READY — repository and preview gates pass. Production certification remains pending domain cutover and public-origin acceptance.**

This is an implementation-readiness statement only. It is not a ranking, indexing, performance, compliance, or AI-citation guarantee.
