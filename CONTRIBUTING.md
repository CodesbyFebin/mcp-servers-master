# Contributing to MCPserver.in

Thanks for your interest. Most of what this repo does is governed by the
[Editorial Policy](https://www.mcpserver.in/editorial-policy) and the
[Publication Authority methodology](https://www.mcpserver.in/methodology).
Please read both before opening a PR.

## What you can contribute

- **Pillar additions** — see the 69-pillar directory at `/pillars`. A new
  pillar must have a primary source for every claim in its `notes` field.
- **Editorial entries** — new guides, glossary terms, comparison pages.
  These are also governed by the publication authority.
- **Server entries** — additions to `src/content/server-registry.ts` are
  gated by `isServerIndexable()`. An entry only becomes public after
  evidence-ledger review.
- **Bug fixes and infrastructure** — code, CI, Docker, and Caddy changes
  are welcome.

## What you cannot contribute

- Counts, ratings, or comparisons that you cannot back with a primary source.
- Content that bypasses the publication authority surface (`isServerIndexable`,
  `isContentIndexable`, `isPillarIndexable`).
- Redirects that do not match a real, observed legacy URL.

## Workflow

1. Fork the repo.
2. Create a branch: `git checkout -b feat/<short-slug>`.
3. Make your change.
4. Run the verification gates: `npx tsc --noEmit && npm test && npm run build`.
5. Open a PR. The PR template will ask you to confirm the zero-fabrication
   contract and list any evidence you cited.

The publication-authority code paths are protected by `CODEOWNERS` and
require an explicit code-owner review.

## Style

- TypeScript strict; no `any` outside of explicit migration shims.
- One concern per PR — please don't bundle unrelated changes.
- Comments in code: only when the constraint is non-obvious from reading
  the code.
- Tests required for any behavior change.
