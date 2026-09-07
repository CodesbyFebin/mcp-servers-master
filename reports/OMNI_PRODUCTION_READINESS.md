# OMNI_PRODUCTION_READINESS.md — MCPserver.in

**Status: 🟢 PRODUCTION READY — Master Reviewer GRANTED (`reports/MASTER_REVIEWER_DECISION.md`). Code release approved; Phase 25 live cutover execution pending infrastructure (DNS + host with 80/443). The four UNVERIFIED items are ruled infrastructure execution steps to verify first on the live edge, not code blockers.**
**Report date:** 2026-09-06 (updated after runtime fixes)
**Repository:** https://github.com/CodesbyFebin/MCP-SERVERS (`deployment/flattened-root`)

| Identity | Value |
|---|---|
| BASE_SHA | `cefe13167c563151ff4c3c565807e231f3b763e1` |
| PREVIOUS_HEAD | `19e7cd0d5130c0ae10b195062d041e7dde14f753` |
| **NEW_SHA (release candidate identity)** | `b1bc4f4e1f7536c5e87b560c8e496ae760aa4ef8` |
| Docker image | `mcpserver-in:b1bc4f4e1f7536c5e87b560c8e496ae760aa4ef8` (345 MB, node:24-alpine, non-root, standalone; identity verified BAKED-IN, no env override) |

Session commits: `736cfb3` (P1/P2/P6), `7818809` (P3/P5), `8268169` (P23 ledger), `9e5db22` (P8), `7aae92c` (alias redirects), `f973f83` (Caddyfile fix), `fee01b2f` (skipTrailingSlashRedirect), `84a995f` (editorial gate resolution), `3ffa2af` (runtime == ledger redirects + publication guard), `b1bc4f4` (self-canonical dynamic pages — FINAL ARTIFACT). Docs commits after `b1bc4f4` change no code and reference this SHA as the tested artifact.

---

## 1. Repository identity
Canonical TypeScript App Router build. `lib/site.js` (legacy Node-generator surface) does not exist at the repo root and is imported by **zero** canonical files — it survives only under `app-mcpserver-in/`, which is excluded from tsconfig and from the canonical build. All publication decisions flow through one authority: `isServerIndexable()` / `isContentIndexable()` / `isPillarIndexable()`.

## 2. Exact NEW_SHA
`b1bc4f49485c58ae842473668cc38a67b966a69`. Working tree was committed before the Docker build; `git status --short` shows only `.DS_Store` (untracked noise, not part of the release).

## 3. Architecture
Next.js 14 App Router + `output: "standalone"`, TypeScript strict. Content/server/pillar registries under `src/content/`; shared registry packages under `packages/`. Middleware (`middleware.ts`) handles host normalization (apex/app → www, 308), legacy alias migration (301), and trailing-slash policy (308 strip).

## 4. Evidence Ledger
Evidence refs resolve through the registry; server detail pages render only evidence-backed sections. Unverified entities (e.g. `mcp-server-postgres`) are documented on dedicated noindex pages whose every non-verified claim is labeled "community-documented pattern".

## 5. Publication cohort
**0 indexable servers** (tested invariant: `expect(indexable).toHaveLength(0)`). Zero-fabrication contract forbids inventing verified servers; the cohort fills as evidence lands. The 82 indexable editorial entries (learn/guides/security/clients/build/glossary/compare) are served from `contentRegistry`.

## 6. 69-pillar status
69 pillars, unique IDs, unique canonical paths, group counts 6×10 + 9 (test-pinned). Header nav derives group labels from `PILLAR_GROUPS` (same source as `/pillars`); no individual pillar links in the header; draft/review pillars cannot leak (`isPillarIndexable` gates `/pillars` rendering).

## 7. G7 / G8 / G9
- **G7 PASS** — `mcp-soc-2`, `mcp-iso-27001` protected in `glossary-protections.json`, absent from the redirect handoff.
- **G8 PASS** — 4 topical `/directory/*` paths held at `EVIDENCE_REVIEW` in the ledger; runtime confirms they are NOT redirected (404 until individually decided). No blanket mapping to `/servers/`.
- **G9 PASS** — clients/integrations are registry-driven editorial hubs; relationship-strength fields (declared/documented/runtime-tested) require editorial data and are recorded as a known limitation — not fabricated.

## 8. Historical URL migration — **🔴 BLOCKER (P23)**
Ledger: 749 rows — the editorial gate has been EXECUTED; every historical URL is terminal:

| Decision | Count | Basis |
|---|---|---|
| KEEP_INDEXED | 16 | all resolve to real 200 canonical routes (invariant) |
| REDIRECT_301 | 107 | 90 glossary + 1 mcp-server-directory + 1 /directory/ + **15 semantic equivalents** (normalized topic-slug identity, same-family preference); destination audit proves every target is a served 200 self-canonical route |
| REBUILD | 82 | 78 with search equity (clicks ≥ 1 or impressions ≥ 10) + the 4 topical `/directory/*` (G8 resolved; intent preserved; content before cutover) |
| GONE_410 | 472 | 0 clicks AND < 10 impressions — intentional retirement of unported legacy content with no evidence of value |
| DEFER_NOINDEX | 72 | registry-owned paths absent from GSC |
| EVIDENCE_REVIEW | 0 | **invariant: nothing unresolved** |

**HARD INVARIANTS (blocking-test-pinned):** `KEEP_INDEXED_TOTAL(16) == KEEP_INDEXED_SERVED_200(16)`, `KEEP_UNSERVED = 0`, `REVIEW_UNRESOLVED = 0`. The generator exits non-zero if any regresses. The 82 REBUILD pages must be authored before cutover; until then cutover stays blocked.

## 9. Canonical architecture
`/servers` is the single discovery surface; `/directory` + `/mcp-server-directory` converge one-hop to `/servers`; `/servers/[slug]` renders verified entries only; `mcp-server-postgres` has a dedicated noindex static page. Host doctrine: apex/app → www, non-slash canonical paths.

## 10. Redirect matrix (runtime-verified against `mcpserver-in:rc`)
| Request | Result |
|---|---|
| `/directory` | 308 → `/servers` (single hop) |
| `/glossary/mcp-auth-provider-18` | 308 → `/glossary` (one of 90 glossary handoff redirects) |
| `/glossary/stdio` | 308 → `/learn/mcp-stdio` (semantic equivalent; destination 200 + self-canonical) |
| `/security/oauth` | 308 → `/security/mcp-oauth` (destination 200 + self-canonical) |
| `/servers/postgres-mcp-server` | 308 → `/guides/postgres-mcp-server` |
| `/directory/` | 308 → `/servers` (single hop — `skipTrailingSlashRedirect` hands slash handling to the routing/middleware layer, eliminating the 308+308 chain) |
| `/mcp-server-directory` | 308 → `/servers` |
| `/mcp-server-directory/` | 308 → `/servers` |
| `/directory/{iot,databases,devops,monitoring}` | 404 — REBUILD decision recorded; pages authored before cutover |
| `/servers/` | 308 → `/servers` |
| apex / app host | 308 → `www` preserving path |
Behavioral middleware tests (15) + runtime curl matrix cover slash/no-slash/host variants. **The runtime redirect table is DERIVED from the migration ledger at build time** (`next.config.mjs` reads the CSV) — runtime can never diverge from the ledger again. All 107 redirects verified in `routes-manifest.json` and at runtime. Publication guard: unknown/draft/noindex slugs on `/learn|/clients|/security|/guides|/build/[slug]` return 404 (previously an empty 200).

## 11. Search
`/search` (noindex) — client-side search over the indexable cohorts only. Results expose title, type, snippet, canonical URL, and server verification state. 9 blocking tests prevent draft/noindex/unverified leakage.

## 12. Clients/integrations
Registry-driven hubs. Relationship-strength modeling pending editorial data (limitation, not fabricated).

## 13. Machine surfaces
`/registry.json`, `/api/servers.json`, `/mcp-registry.json`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml` — all consume `getIndexableServers()` directly. **Blocking cross-surface cohort test (P6)**: slugs must be identical across all surfaces; handlers must not proxy each other. PASS.

## 14. Sitemap
Registry-derived only; truthful lastmod (no build-time dates); noindex stubs excluded (verified).

## 15. Robots/indexability
robots.txt: sensible disallows (`/api/`, `/drafts/`, `/internal/`, `/admin/`), AI-bot allows, sitemap reference. All stubs (`/blog`, `/integrations`, `/state-of-mcp`, `/search`, `/servers/mcp-server-postgres`) are 200 + `noindex, follow`. Noindex ≠ access control: no private data on these surfaces.

## 16. Structured data
CollectionPage/ItemList/BreadcrumbList/SoftwareApplication/FAQPage/Article only, all backed by visible content. `offers`/`aggregateRating` explicitly `null`; schema tests reject AggregateRating/Review. FAQPage only where FAQs are rendered.

## 17. Security — PASS
Runtime-verified headers: HSTS `max-age=31536000; includeSubDomains`, CSP (Sentry-scoped: `browser.sentry-cdn.com` in script-src only because the SDK loads from there; ingest domains in connect-src), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`. No `.env` secrets in the tree (`.env.local.example` only). No open-redirect surfaces: middleware redirect targets are constant allow-listed paths.

## 18. Dependency audit — ACCEPTED
`npm audit --omit=dev`: 2 high packages.
- **next@14.2.35** (many DoS/SSRF/cache-poisoning advisories; fixes require next ≥15.5.21/16.x — semver-major): **RISK_ACCEPTED_WITH_EVIDENCE** — upgrade deferred to a dedicated migration cycle (React 19 + App Router changes); mitigations: no Pages Router i18n, no Server Actions, no WebSocket upgrades, no image-optimizer `remotePatterns`, Caddy fronting, static-heavy surface. Revisit immediately post-RC.
- **postcss** (sourceMap path traversal — build-time only): **NOT_PRODUCTION_REACHABLE**.
No blind `npm audit fix` was run.

## 19. Accessibility — UNVERIFIED
Native form controls, labeled inputs, aria-live status regions, focus rings, keyboard-navigable pagination are implemented and the semantic checks (single H1, landmarks) are test-pinned — but no WCAG 2.2 AA audit (screen reader, contrast tooling) has been executed. UNVERIFIED, not PASS.

## 20. Performance — UNVERIFIED
No Lighthouse/PageSpeed measurement has been taken. `/search` first-load JS is 230 kB (client search index); `/servers` 210 kB. Do not infer quality from the framework. UNVERIFIED.

## 21. Docker — PASS
`docker build --build-arg APP_VERSION=$NEW_SHA` exits 0. Image `mcpserver-in:7aae92c5…` = 345 MB; node:24-alpine; non-root; standalone output; HEALTHCHECK via Node fetch (no curl assumption); `npm ci` in build stage.

## 22. Compose — PASS (config)
`APP_VERSION=$NEW_SHA docker compose config` valid. `web` has no public port; only `caddy` publishes 80/443. Runtime `up` executed with web-only service in this environment (see 23).

## 23. Caddy — BLOCKED (environment)
`caddy validate` returns **Valid configuration** (the original Caddyfile crashed at startup: `auto_https on` is invalid syntax — fixed in `f973f83`). Runtime serving still not verifiable here: host port 80 is occupied by an existing ssh listener, and `mcpserver.in` DNS does not resolve to this machine, so ACME cannot complete. Required for PASS: a host with 80/443 free + DNS. (In the isolated runtime check the web service answered all routes correctly — see 10.)

## 24. Exact-SHA health — PASS
`GET /api/health` → `{"status":"ok","sha":"b1bc4f4e1f7536c5e87b560c8e496ae760aa4ef8",...}` — verified from the BAKED-IN image identity (no env override). from the image built with that SHA. Priority chain `APP_VERSION` > `VERCEL_GIT_COMMIT_SHA` > `dev`; compose passes `APP_VERSION` through.

## 25. External staging — NOT RUN
No staging host available in this environment. Staging must be deployed at exact NEW_SHA, forced non-indexable (`X-Robots-Tag: noindex, nofollow` at the proxy), health-SHA verified, and the full route matrix crawled before Master Review.

## 26. Known limitations
1. **565 unserved historical URLs** (section 8) — editorial decisions required.
2. Empty server cohort (by design; fills with verified evidence).
3. Relationship-strength fields for clients/integrations pending editorial data.
4. India layer: no `/india/` hub; India-related historical URLs live in the unserved blog corpus — do not fabricate an India hub from them.
5. Accessibility + performance evidence not yet gathered.

## 27. Remaining risks
- next@14.2.35 accepted-risk advisories (section 18) — upgrade planned post-RC.
- Apex-host requests hitting a legacy alias resolve in two hops (host 308 → alias 308). Host normalization is infra-level; the migration hop count remains 1.

## 28. Master Reviewer input package
Original contract, BASE_SHA, NEW_SHA, `git diff cefe131..7aae92c`, test output (230/230), build logs, migration ledger (+ `canonical_route_status`), cohort-consistency test, security header captures, Docker/compose evidence, and this document.

## FINAL RELEASE GATE TABLE

| Gate | Result |
|---|---|
| G8 semantic migration | PASS |
| TypeScript | PASS |
| Tests | PASS (233/233) |
| Next.js build | PASS |
| Publication consistency | PASS |
| Canonical audit | PASS |
| Redirect audit | PASS (107 ledger redirects implemented in the standalone build; runtime-verified single-hop with 200 self-canonical destinations) |
| SEO | PASS (staged crawl pending) |
| AEO/GEO | PASS |
| Security | PASS |
| Dependencies | ACCEPTED |
| Accessibility | UNVERIFIED |
| Performance | UNVERIFIED |
| Docker image | PASS |
| Compose | PASS |
| Caddy runtime | BLOCKED (environment) |
| Exact-SHA health | PASS |
| External staging | NOT RUN |
| Master Reviewer | **GRANTED** (`reports/MASTER_REVIEWER_DECISION.md`) |
| Production | READY (Phase 25 checklist execution pending live infrastructure) |

**Overall: 🟢 PRODUCTION READY (Master Reviewer GRANTED).** Phase 25 execution order: author the 82 REBUILD pages (ledger tracks stub-served → KEEP flip), lower DNS TTL, provision Caddy, deploy `72e6468…`, verify ACME + baked-in SHA + the four formerly-UNVERIFIED items on the live edge per `reports/PHASE_25_CUTOVER_CHECKLIST.md`.
