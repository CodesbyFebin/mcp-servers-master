# Performance budgets

These are engineering targets, not measured field-performance claims.

## Public web target budgets

- Largest Contentful Paint target: <= 2.5 s at the 75th percentile when field data becomes available.
- Cumulative Layout Shift target: <= 0.1 at the 75th percentile when field data becomes available.
- Interaction to Next Paint target: <= 200 ms at the 75th percentile when field data becomes available.
- Crawl-critical title, description, canonical, H1, primary content and JSON-LD must be present in initial server-rendered HTML.
- Public registry routes should avoid client-side data fetching when the canonical Evidence Ledger is available at build/render time.

No Core Web Vitals pass is claimed until production-origin field evidence is collected.
