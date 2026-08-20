# Phase 8 deployment foundation

This directory defines the deployment topology without claiming that every non-web service is feature-complete.

## Current executable services

- `web` — the production Next.js public knowledge graph from this repository.
- `redis` — Redis 8 persistence/cache dependency.
- `postgres` — PostgreSQL 17 state dependency.
- `caddy` — reverse proxy and canonical host routing.

## Foundation-only service slots

`app`, `api`, `mcp-server`, and `gateway` currently run the explicit `foundation` health container. They exist so routing, service discovery, health behavior, and environment separation can be validated before those runtimes are replaced by their full implementations. They are labelled `mcpserver.foundation-only=true` and must not be represented as production feature-complete.

The public web application does expose a separate read-only MCP JSON-RPC endpoint at `/api/mcp`; that endpoint is part of the web runtime and is not a substitute for the future standalone `mcp-server` service.

## Environments

Copy `.env.example` into an environment-specific secret store. Do not commit `.env`, production credentials, JWT secrets, database passwords, or provider keys.

- development: local Compose or developer runtime
- staging: isolated DNS, credentials, database and Redis volumes
- production: separate secrets and persistent volumes; foundation-only service slots must be replaced before claiming full dual-surface launch

## Validation

`npm run verify:infra` validates the topology contract without starting services. GitHub Actions additionally runs `docker compose --env-file .env.example config --quiet` to catch invalid Compose wiring.
