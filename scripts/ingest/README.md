# MCPServer.in ingestion pipeline

This pipeline imports the complete cursor-paginated Official MCP Registry and uses `RenatoMarinho/mcp-registry` only for deterministic enrichment and discovery candidates.

## Safety rules

- Dry-run is the default. Database writes require `--live`.
- Official Registry names define canonical identities.
- Hugging Face rows join only by exact official ID, normalized repository URL, or package identifier.
- Ambiguous matches go to `.ingest-state/conflicts.json`.
- Unmatched Hugging Face rows go to the private `registry_candidates` review queue; they are not published automatically.
- Never expose the PostgreSQL DSN or Supabase service-role key in a browser bundle or `NEXT_PUBLIC_*` variable.

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-mcp-ingest.txt
```

## Dry-run and generate static artifacts

```bash
python mcpserver_ingest.py --output generated/registry
```

Outputs:

- `generated/registry/servers/*.json` — one content record per canonical server
- `generated/registry/server-manifest.json` — route-generation manifest
- `generated/registry/llms-servers.txt` — server portion for `llms.txt`
- `generated/registry/sitemap-servers.xml` — server sitemap
- `generated/registry/ingestion-report.json` — counts and run state
- `.ingest-state/conflicts.json` — ambiguous identity matches
- `.ingest-state/candidates.json` — unmatched discovery records

## Live Supabase upsert

Use a server-side direct/pooler Postgres connection string from Supabase. Do not commit it.

```bash
export DATABASE_URL='postgresql://...'
python mcpserver_ingest.py --live --output generated/registry
```

To pin the enrichment dataset for a reproducible release:

```bash
python mcpserver_ingest.py --hf-revision '<HUGGING_FACE_COMMIT_SHA>'
```

## Site integration

Read `server-manifest.json` in the static route generator. Copy or compose `llms-servers.txt` into the site's main `llms.txt`, and add `sitemap-servers.xml` to the sitemap index. Publish only records whose `evidence_tier` is `canonical-registry`; candidate records require editorial approval.
