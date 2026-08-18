# MCPserver.in

Evidence-backed Model Context Protocol directory and knowledge graph for `https://www.mcpserver.in`.

## Production doctrine

MCPserver.in is an Evidence Ledger exposed as a crawlable public knowledge graph. A server record is public only when it is explicitly published, verified, not marked noindex, and backed by verified or measured evidence.

The same `isPublicIndexable()` predicate drives directory listings, server profiles, sitemap membership, and LLM discovery feeds.

## Canonical origin

`https://www.mcpserver.in`

The apex domain is redirect-only. Vercel preview deployments are non-indexable and must never appear in canonical URLs, the sitemap, structured data identifiers, or public machine-readable feeds.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run verify:preflight
npm run typecheck
npm test
npm run build
npm run production:gate
```

`npm run production:gate` is also the Vercel build command for the consolidation branch.

## Data model

- `src/data/servers.ts` — normalized MCP server records
- `src/lib/indexability.ts` — Evidence Ledger and publication contract
- `src/config/site.ts` — canonical site identity
- `app/sitemap.ts` — public URLs generated from the publication gate
- `app/robots.ts` — single robots implementation
- `app/llms.txt/route.ts` — concise machine-readable discovery feed
- `app/llms-full.txt/route.ts` — detailed published evidence feed
- `proxy.ts` — apex redirect and Vercel preview noindex boundary

## Adding a server

Do not add a public server profile from generated copy alone. Add the normalized record, attach explicit evidence records, set missing facts to unknown/null, and promote to `published` + `verified` only when the evidence supports publication.

## Claims policy

Do not invent or imply ratings, reviews, pricing, latency, uptime, certifications, regulatory compliance, hosting regions, customer counts, deployment counts, or popularity metrics. Unknown remains unknown.

See `SEO_CONTRACT.md` for the non-negotiable crawl/indexing contract.
