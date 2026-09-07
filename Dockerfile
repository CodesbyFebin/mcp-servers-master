# syntax=docker/dockerfile:1.7

# =============================================================================
# MCPserver.in — Multi-stage Next.js standalone build
# =============================================================================
# Stage 1: install dependencies and build the Next.js standalone output
# Stage 2: copy the standalone bundle to a minimal Node 24 runtime image
# =============================================================================

# -------- Stage 1: deps + build -----------------------------------------------
FROM node:24-alpine AS build

# APP_VERSION is the build-time identity (commit SHA). It is exposed both as a
# build-arg and as a runtime ENV so /api/health can surface the deployed version.
# Default "dev" for local builds; CI overrides with --build-arg APP_VERSION=$NEW_SHA.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=1

WORKDIR /app

# Install dependencies (caching) before copying the rest of the source.
COPY package.json package-lock.json* ./
# `npm ci` requires package-lock.json to be in sync with package.json — a
# strict gate that guarantees reproducible installs. Use `npm install` only if
# the lockfile is known to be out of sync and cannot be regenerated (e.g. from
# a pre-built context where the lockfile was generated on a different platform).
RUN npm ci --no-audit --no-fund

# Copy the rest of the source and build.
COPY . .

RUN npm run build

# -------- Stage 2: runtime ----------------------------------------------------
FROM node:24-alpine AS runtime

# Pass the build-time APP_VERSION through to the runtime stage. The /api/health
# route reads process.env.APP_VERSION (priority: APP_VERSION > VERCEL_GIT_COMMIT_SHA > "dev").
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as the unprivileged `node` user shipped with the Node Alpine image.
WORKDIR /app
RUN chown -R node:node /app
USER node

# Copy the standalone output (server.js, .next/standalone, .next/static).
# No ./public directory exists — Next.js App Router uses app/favicon.ico instead.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

# Liveness probe — /api/health returns 200 + { status, sha, now }.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
