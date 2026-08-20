# MCPserver.in SEO Contract

## Canonical origin

`https://www.mcpserver.in`

This is the only origin allowed in canonical URLs, Open Graph canonical URLs, sitemap entries, JSON-LD public identifiers, internal preferred URLs, and machine-readable public feeds.

## Indexability

Public entity surfaces must use `isPublicIndexable()` from `src/lib/indexability.ts`. A record is indexable only when it is published, verified, not explicitly noindex, and has verified or measured evidence.

## Preview policy

Vercel preview hosts are never canonical. `proxy.ts` adds `X-Robots-Tag: noindex, follow` to `*.vercel.app` responses. Preview URLs must not appear in sitemap or LLM discovery feeds.

## Apex policy

`mcpserver.in` is redirect-only and must resolve in one hop to the same path/query on `https://www.mcpserver.in`.

## Sitemap

`app/sitemap.ts` is the single sitemap implementation. Entity URLs are generated only from records passing `isPublicIndexable()`. `lastModified` is emitted only from meaningful record timestamps.

## Robots

`app/robots.ts` is the single robots implementation. It points to the canonical sitemap. AI-search and AI-training policy must not be conflated with search indexability.

## Structured data

Structured data must describe visible content. Ratings, reviews, pricing, uptime, certifications, compliance, hosting regions, latency, and other claims must not be emitted unless the corresponding fact is visible and evidence-backed.

## Claims

Unknown remains unknown. Missing values are represented as `null`, an empty array, or explicit unknown state; they are never synthesized for completeness.
