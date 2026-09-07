## Summary

<!--
One or two sentences. What does this PR change, and why?
Reference the pillar or registry entry it touches, if any.
-->

## Linked issue

<!-- Link the issue this PR closes (Closes #123) or "none". -->

## Type of change

- [ ] Bug fix
- [ ] New editorial entry
- [ ] New pillar / registry entry
- [ ] New machine-readable surface
- [ ] Infrastructure / build
- [ ] Documentation
- [ ] Other (describe below)

## Zero-fabrication contract

- [ ] I have NOT invented metrics, counts, or comparisons that are not backed by a primary source.
- [ ] All new claims cite evidence (see `/evidence`).
- [ ] I did not modify the publication authority surface (`isServerIndexable`, `isContentIndexable`, `isPillarIndexable`) without flagging it in the description below.

## Migration / redirect changes

- [ ] No redirect map changes
- [ ] Redirect map changes updated in `data/migration/source/glossary-and-legacy-redirects.json` AND the ledger regenerated
- [ ] I have run `npm run build` to confirm the new redirect sources resolve to 200/301 correctly

## Verification

- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes (all green, no skipped tests)
- [ ] `npm run build` succeeds
- [ ] I have manually verified the affected pages in a local dev server
- [ ] New tests cover the new behavior

## Screenshots / evidence

<!-- For editorial changes: paste the Evidence Ledger entry ID(s) you cited. -->
