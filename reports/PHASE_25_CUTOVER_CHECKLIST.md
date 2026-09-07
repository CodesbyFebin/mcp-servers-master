# Phase 25: Production Cutover Checklist

**Target SHA:** `c20a72cbcea6c1a5f0b3ffced9aee577abd02e45`
**Status:** PENDING MASTER REVIEWER APPROVAL — do not execute until GRANTED

## Pre-cutover
- [ ] 82 REBUILD pages authored with substantive content; ledger decisions flipped REBUILD -> KEEP with route status served
- [ ] Live Caddy/HTTPS verified on target host (ports 80/443 free, DNS resolving)
- [ ] External staging at exact SHA: audit PASS incl. Lighthouse measured + WCAG evidence
- [ ] Master Reviewer GRANTED on the evidence bundle

## Deployment
- [ ] Build production image from the exact merged SHA with APP_VERSION baked in
- [ ] `APP_VERSION=c20a72cbcea6c1a5f0b3ffced9aee577abd02e45 docker compose up -d`
- [ ] `docker compose ps` healthy (web + caddy)

## Post-deployment verification
- [ ] `curl -s https://www.mcpserver.in/api/health` → sha == c20a72cbcea6c1a5f0b3ffced9aee577abd02e45 (baked-in, no env override)
- [ ] `curl -sI https://mcpserver.in` → 308 to `https://www.mcpserver.in`
- [ ] `/mcp-server-directory`, `/directory` → single hop to `/servers`
- [ ] `/glossary/stdio` → `/learn/mcp-stdio` (sample of 107 ledger redirects)
- [ ] HSTS + CSP + nosniff + Referrer-Policy + Permissions-Policy + X-Frame-Options present
- [ ] Sitemap/llms/registry surfaces 200 and cohort-equal

## DNS cutover (only after all above)
- [ ] Lower TTL to 300s, then switch A/AAAA records
- [ ] Monitor ACME issuance in Caddy logs
- [ ] Archive this bundle + ledger to immutable storage
