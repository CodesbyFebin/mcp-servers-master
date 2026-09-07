# MCPserver.in — Standalone Self-Host Runbook

This document describes how to build and run the MCPserver.in Next.js
application as a self-contained single-host deployment using the official
multi-stage `Dockerfile` and `docker-compose.yml`.

The runtime image uses Next.js' `output: "standalone"` build (set in
`next.config.mjs`), which produces a minimal `server.js` entry point and only
copies the runtime dependencies required to serve the app. The result is a
small, fast image with no need for the full `node_modules` tree.

---

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- A registered domain pointed at the host (the default `Caddyfile` covers
  `mcpserver.in`, `app.mcpserver.in`, and `www.mcpserver.in`)
- A `.env` file in the project root with at minimum:
  - `ACME_EMAIL` — email registered with Let's Encrypt
  - `COMMIT_SHA` — git SHA of the deployed commit (exposed at `/api/health`)

Optional Sentry variables (only required if you want source maps and error
ingestion):

- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (build-time only)

---

## Build

```bash
# 1. Record the deployed commit SHA (used in /api/health and image tag)
export COMMIT_SHA=$(git rev-parse HEAD)

# 2. Build the image (uses Dockerfile + sets APP_VERSION=$COMMIT_SHA)
docker compose build
```

The multi-stage build:

1. Installs dependencies with `npm ci` in a `node:24-alpine` builder.
2. Runs `next build` with `output: "standalone"`, producing `.next/standalone`.
3. Copies only the standalone bundle, `.next/static`, and `public/` into a
   second `node:24-alpine` image and runs as the unprivileged `node` user.

The resulting image is typically < 250 MB.

---

## Run

```bash
docker compose up -d
```

This starts two services on a private bridge network:

| Service | Port (host) | Port (internal) | Purpose |
| --- | --- | --- | --- |
| `web`   | —            | `3000`         | Next.js standalone server |
| `caddy` | `80`, `443`  | `80`, `443`    | Reverse proxy + TLS (Let's Encrypt) |

`caddy` waits for `web` to pass its healthcheck (`GET /api/health` returns
`200 + { status: "ok", sha, now }`) before serving traffic.

---

## Verify

```bash
# Liveness
curl -i https://www.mcpserver.in/api/health
# → 200 OK
# → { "status": "ok", "sha": "<COMMIT_SHA>", "now": "<ISO timestamp>" }

# Canonical redirect (apex → www)
curl -i https://mcpserver.in/
# → 308 Location: https://www.mcpserver.in/

# Trailing-slash normalization
curl -i https://www.mcpserver.in/servers/
# → 308 Location: https://www.mcpserver.in/servers

# Machine-readable surfaces
curl -s https://www.mcpserver.in/llms.txt | head -5
curl -s https://www.mcpserver.in/registry.json | jq '.metadata'
```

---

## Update

```bash
git pull
export COMMIT_SHA=$(git rev-parse HEAD)
docker compose build
docker compose up -d
```

Old images are retained; prune with `docker image prune` after a successful
deploy.

---

## Roll back

```bash
# Re-tag a known-good SHA and redeploy.
export COMMIT_SHA=<known-good-sha>
docker compose build
docker compose up -d
```

---

## Security notes

- The `web` container is **not** exposed on the host network. All traffic
  flows through `caddy`, which terminates TLS and forwards to `web` over
  the internal bridge.
- The application is run as the unprivileged `node` user. The image does
  not contain a shell entrypoint that an attacker could trivially escape to.
- `HSTS` is set with `max-age=31536000; includeSubDomains; preload`. Submit
  the domain to the [HSTS Preload List](https://hstspreload.org/) after
  confirming all subdomains support HTTPS.
- Sentry DSNs and auth tokens are loaded from the host environment, never
  baked into the image.

---

## Limitations

- ACME HTTP-01 challenges require port 80 to be reachable from the internet.
  DNS-01 (Cloudflare, Route53) is recommended for split-horizon deployments.
- The image has no shell. Use `docker compose exec web <cmd>` carefully
  (e.g. `docker compose exec web node -e 'console.log("hi")'`).
- This stack is for the public authority surface only. The `app.mcpserver.in`
  workspace product is a separate deployment and not yet built.
