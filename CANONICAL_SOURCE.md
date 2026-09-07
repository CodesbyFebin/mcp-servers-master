# MCPserver.in — CANONICAL SOURCE

This document defines the single authoritative source of truth for the
mcpserver.in production deployment. All other repositories and branches are
subordinate to or independent of this one.

---

## CANONICAL HIERARCHY

| Role | Value |
|------|-------|
| Local workspace | `/Users/cyberteck/Downloads/MCP/MCP-SERVERS-master` |
| GitHub repository | `CodesbyFebin/mcp-servers-master` |
| Production branch | `production` |
| Production commit | `c0a6531f364873e42be3c716aaf8fe2c0ad2385c` |
| Vercel project | `mcp-servers-master` |
| Public authority domain | `https://www.mcpserver.in` |
| Legacy/noncanonical repos | See below |

---

## NONCANONICAL / LEGACY REPOSITORIES

The following repositories are **independent legacy codebases** and must **never**
be used as the source of content, deployments, redirects, sitemaps, registries,
or SEO signals for mcpserver.in:

| Repository | Note |
|-----------|------|
| `CodesbyFebin/MCP-SERVER` | Separate small repo; no authority over mcpserver.in |
| `CodesbyFebin/MCP-SERVERS` | Separate legacy repo; default branch `master`; no authority over mcpserver.in |

Any future agent, pipeline, or human that suggests replacing production content
from one of these repositories must first perform an explicit, audited migration
into the canonical repository.

---

## RULE

**No code, content, sitemap, redirect, registry, or deployment from a
noncanonical repository may replace production without an explicit, audited
migration into the canonical repository.**

---

## PRODUCTION ARCHITECTURE

### Hosts

| Host | Behaviour |
|------|-----------|
| `www.mcpserver.in` | Public search / evidence / knowledge authority |
| `mcpserver.in` | Apex → 308 redirect to `www.mcpserver.in` |
| `app.mcpserver.in` | App workspace surface → 308 redirect to `www.mcpserver.in` (until standalone app exists) |

### Publication Authorities

| Authority | Function |
|----------|----------|
| Editorial content | `isContentIndexable()` from `@mcp/servers-registry` |
| Server entries | `isServerIndexable()` / `isServerIndexableEntry()` from `@mcp/servers-registry` |

### Canonical Signals

- Every page: exactly one `<h1>`, canonical link pointing to `https://www.mcpserver.in`
- Sitemap: only `www.mcpserver.in` URLs; no `app.mcpserver.in` or apex URLs
- lastmod: from registry `reviewedAt` / `updatedAt` fields only; no build-time timestamps
- Schema: Organization + WebSite + WebPage only; no AggregateRating, Review, Offer, or unsupported types
- robots.txt: references `https://www.mcpserver.in/sitemap.xml`

---

## BRANCH STRATEGY

| Branch | Purpose | Protected? |
|--------|---------|-----------|
| `main` | Legacy archive (remote main history); read-only | No |
| `deployment/flattened-root` | Active development / staging | No |
| `production` | **Canonical production source** | **Yes — required** |

The `main` branch is preserved as an archive. It is **not** the production branch.
Do not assume `main` is authoritative.

---

## LOCAL WORKFLOW

```bash
# Always work from the canonical workspace
cd /Users/cyberteck/Downloads/MCP/MCP-SERVERS-master

# Feature work
git checkout deployment/flattened-root
# ... make changes ...

# Merge to production after test + build pass
git checkout production
git merge deployment/flattened-root
git push origin production

# Vercel auto-deploys production branch
```

---

## LAST UPDATED

`production` branch SHA `5332733` — `docs: add CANONICAL_SOURCE.md`
