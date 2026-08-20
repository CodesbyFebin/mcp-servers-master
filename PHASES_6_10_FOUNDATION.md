# Phases 6–10 production foundation

Status: candidate implementation; exact-head gate evidence is recorded on the pull request before merge.

## Phase 6 — Registry synchronization

Implemented in `services/registry-sync/index.ts` with normalize → attach evidence → deduplicate → validate → verify → publication decision. Publication remains fail-closed: verified evidence does not by itself publish a record; `publicationStatus: "published"` must also be explicit and the record must satisfy `isServerIndexable()`.

## Phase 7 — Security

Implemented as a standard-library Python package under `services/security/`:

- HS256 JWT creation/verification and Bearer validation
- deterministic PAN/GSTIN/email/phone redaction
- seven-stage fail-closed policy engine
- HTTPS-only URL policy, public-IP SSRF controls and DNS rebinding detection
- Python compilation and unit tests in GitHub Actions

These controls are implementation evidence, not a SOC 2, DPDP, RBI, ISO, or other compliance certification.

## Phase 8 — Deployment foundation

`docker-compose.yml`, Caddy routing, Dockerfiles and `.env.example` define the target topology. `app`, `api`, standalone `mcp-server`, and `gateway` are explicitly foundation-only health slots and must be replaced before claiming those products as feature-complete. The web runtime, Redis, PostgreSQL and Caddy definitions are executable configuration.

## Phase 9 — Observability and tests

- structured JSON logger with sensitive-value redaction
- in-memory metric contract for request, error, MCP tool, model and provider-fallback measurements
- `/api/health` web health route
- read-only `/api/mcp` JSON-RPC endpoint with executable `initialize`, `tools/list`, and `tools/call` contract tests
- registry-sync Vitest tests and Python security tests

No uptime, latency, or field-performance value is claimed by these contracts.

## Phase 10 — SEO/AEO/GEO and launch safety

The existing Evidence Ledger public graph remains authoritative. `/integrations`, `/clients`, and `/glossary` now exist only as `noindex,follow` evidence-migration placeholders and are excluded from the public graph, sitemap, and LLM navigation until authoritative records exist.

`llms.txt` and `llms-full.txt` remain the supported machine-navigation files. `ai.txt` is intentionally not added as a ranking/indexing requirement. RFC 9116 `security.txt` is intentionally not fabricated because no verified security contact/canonical policy fields are present in the repository. Performance budgets are documented as targets, not measured results.

## Launch boundary

A full launch still requires production-domain runtime acceptance and replacement of foundation-only service slots. Search rankings, indexation, AI citations, Core Web Vitals field passes, formal compliance certifications, uptime, and latency remain unclaimed until separately evidenced.
