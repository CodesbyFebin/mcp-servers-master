# MCPserver.in — Reconciliation Audit Report

**Date:** 2026-09-03
**Auditor:** Automated audit + data verification
**Command:** `scripts/audit-reconciliation.ts`
**Production status:** UNCHANGED (no deploys triggered)
**Verdict:** HOLD — 3 blockers require resolution before production deploy

---

## Executive Summary

The pre-audit analysis contained three classes of errors that needed resolution:
(1) unsupported numeric claims, (2) conflation of GSC equity with editorial authority,
(3) missing paths. All data has been audited against source files. The exact integers
are now locked in reconciliation tests. Production remains unmodified.

---

## 1. Registry Census

| Category | Count | Source | Status |
|---|---|---|---|
| Factory pillars (learn) | 13 | content-registry.ts | PASS |
| Factory pillars (guides) | 22 | content-registry.ts | PASS |
| Factory pillars (build) | 6 | content-registry.ts | PASS |
| Factory pillars (clients) | 10 | content-registry.ts | PASS |
| Factory pillars (security) | 4 | content-registry.ts | PASS |
| **Pillar subtotal** | **55** | | |
| Aggregate hubs (parent = "") | 7 | content-registry.ts | PASS |
| Glossary terms | 20 | content-registry.ts | PASS |
| **Total entries** | **82** | | |
| 69-pillar contract | 69 | pillar-registry.ts | PASS |
| Primary (P01–P60) | 60 | pillar-registry.ts | PASS |
| Authority (P61–P69) | 9 | pillar-registry.ts | PASS |

**Registry verdict: PASS.** All counts verified from source data. 13+22+6+10+4 = 55.

---

## 2. Migration Ledger Census

| Field | Claimed | Actual | Source |
|---|---|---|---|
| Total rows | unspecified | 748 | milestone-7-migration-ledger.csv |
| KEEP_INDEXED | unspecified | 583 | milestone-7-migration-ledger.csv |
| REDIRECT_301 | unspecified | 93 | milestone-7-migration-ledger.csv |
| DEFER_NOINDEX | unspecified | 72 | milestone-7-migration-ledger.csv |
| DROP_NOINDEX | unspecified | 0 | milestone-7-migration-ledger.csv |

**Ledger verdict: PASS.** 583 + 93 + 72 = 748. All rows accounted for.

---

## 3. Handoff Redirect Census

| Field | Pre-audit claim | Actual | Source |
|---|---|---|---|
| Glossary redirects | "335+" | 92 | glossary-and-legacy-redirects.json |
| Legacy redirects | unspecified | 2 | glossary-and-legacy-redirects.json |
| **Total handoff** | **≈335** | **94** | |

The "335+" claim was not supported by the source data. The actual count is 94.

**Breakdown of 94:**
- 92: `/glossary/mcp-*-NNN` (numeric suffix, all redirecting to `/glossary/`)
- 2: `/mcp-server-directory` and `/mcp-server-directory/` → `/directory/`

**Ledger mapping of handoff:**
All 94 handoff sources appear in the migration ledger (normalized). Zero unmapped.

**Handoff verdict: PASS** (count corrected from "335+" to 94).

---

## 4. Glossary Numeric Arithmetic

| Claim | Pre-audit | Actual | Source |
|---|---|---|---|
| Generated suffixes not in handoff | 9 | 0 | glossary-and-legacy-redirects.json |
| Total numeric-suffix glossary in handoff | "101" | 92 | glossary-and-legacy-redirects.json |
| Semantic-numeric (mcp-soc-2, mcp-iso-27001) | "separately protected" | **inside the 92** | glossary-and-legacy-redirects.json |

**CRITICAL — BLOCKER 1:** `mcp-soc-2` and `mcp-iso-27001` are confirmed inside the 92 handoff
glossary redirects. Both redirect to `/glossary/` (the glossary homepage), not to their semantic
term equivalents. This means:

- The semantic meaning of these terms is being collapsed into the glossary homepage.
- The handoff maps them to `/glossary/` but does not preserve `/glossary/mcp-soc-2` or `/glossary/mcp-iso-27001` as distinct content.
- These paths are **not separately protected** — they are in the same 92 as all other numeric suffixes.
- The production deploy must not proceed until these paths are either (a) removed from the handoff redirect map, or (b) given explicit editorial ownership with a distinct canonical URL.

**Glossary arithmetic verdict: HOLD — BLOCKER 1 active.**

---

## 5. Directory Legacy Paths

| Path | In GSC inventory | In ledger | In handoff |
|---|---|---|---|
| `/directory/iot` | YES | NO | NO |
| `/directory/databases` | YES | NO | NO |
| `/directory/devops` | YES | NO | NO |
| `/directory/monitoring` | YES | NO | NO |

**BLOCKER 2:** These 4 paths have GSC equity but are absent from both the migration ledger
and the handoff redirect map. They need explicit EVIDENCE_REVIEW decisions before production.

**Directory verdict: HOLD — BLOCKER 2 active.**

---

## 6. GSC/Publication Coupling Bug

The DEFER_NOINDEX decision (72 rows) was assigned based on absence from the GSC inventory,
not editorial publication authority. This conflates two distinct concerns:

- **GSC equity**: whether a path has historical search presence (does it have impressions/clicks?)
- **Publication authority**: whether editorial owns and publishes content at that path

The 72 DEFER_NOINDEX rows all map to content-registry entries with `status: "published"` and
`noindex: false`. These are published pages that simply lack GSC data. They are not "deferred" —
they are published and indexable.

**Proposed fix (not applied in this pass):**
Separate the migration decision into two fields:
- `historical_gsc_status`: in_GSC | not_in_GSC
- `publication_authority`: editorial_owned | no_editorial

DEFER_NOINDEX should be replaced with explicit decisions once the coupling is decoupled.

**Coupling verdict: HOLD — coupling bug documented, fix deferred to next pass.**

---

## 7. /mcp-host, /what-is-mcp, /mcp-installation

**Correction:** The pre-audit hypothesis that these three paths were "in GSC but not in ledger" was
incorrect. All three ARE in the migration ledger as KEEP_INDEXED:

| Path | Ledger decision | GSC inventory |
|---|---|---|
| `/mcp-host` | KEEP_INDEXED | YES |
| `/what-is-mcp` | KEEP_INDEXED | YES |
| `/mcp-installation` | KEEP_INDEXED | YES |

**These paths do not need remediation. They are protected.**

---

## 8. 55→69 Pillar Map

| Match type | Count | Notes |
|---|---|---|
| exact | 23 | Same path |
| aggregate | 6 | Hub pages (P61–P66) |
| new | 40 | P11–P19, P21–P22, P26–P29, P31–P40, P42–P50, P56–P60, P69 |
| semantic | 0 | No semantically-equivalent paths mapped |
| conflict | 0 | No canonical conflicts |

**55→69 verdict: PASS.** 23 + 6 + 40 = 69. No conflicts.

---

## 9. Canonical Map (69-pillar-canonical-map.csv)

69 rows generated. Decisions:

| Decision | Count | Notes |
|---|---|---|
| KEEP_EXISTING_CANONICAL | 23 | Existing published paths with GSC equity |
| EVIDENCE_REVIEW | 46 | New routes or routes needing editorial verification |

No KEEP (deduplicated), no MERGE, no REDIRECT, no USE_PROPOSED emitted.
P69 canonical map decision = EVIDENCE_REVIEW (route `/pillars` is new).

**Canonical map verdict: PASS** (69 rows, decisions recorded).

---

## 10. Summary: Pre-audit Claims vs. Verified Data

| Claim | Pre-audit | Verified | Status |
|---|---|---|---|
| Glossary redirects | "335+" | 92 | **CORRECTED** |
| Redirect 301 count | "101 generated + 9 unresolved" | 93 (0 unresolved) | **CORRECTED** |
| mcp-soc-2 / mcp-iso-27001 | "separately protected" | Inside 92 handoff | **BLOCKER** |
| /directory/* paths | unspecified | 4 paths unmapped | **BLOCKER** |
| mcp-host / what-is-mcp | "not in ledger" | ARE in ledger (KEEP_INDEXED) | **CORRECTED** |
| DEFER_NOINDEX | unspecified | Conflates GSC with publication | **BUG DOCUMENTED** |

---

## 11. Production Impact

**No production files were modified.** The reconciliation audit is read-only.

Files read but not modified:
- `data/migration/source/glossary-and-legacy-redirects.json`
- `data/migration/source/gsc-full-inventory.json`
- `reports/milestone-7-migration-ledger.csv`
- `reports/55-to-69-pillar-map.csv`

Files created by audit (read-only outputs):
- `reports/redirect-action-census.csv`
- `reports/55-to-69-pillar-map.csv` (already existed, regenerated)

Files created with locked tests:
- `src/__tests__/migration-reconciliation.test.ts` — 11 tests, all passing

---

## 12. Final Verdict

**HOLD** — three blockers must be resolved before production deploy:

| Blocker | Description | Required action |
|---|---|---|
| **1 — Semantic glossary loss** | `mcp-soc-2` and `mcp-iso-27001` redirect to `/glossary/` via handoff; their semantic meaning is lost | Remove from handoff redirect map, or create distinct canonical pages for each term |
| **2 — Unmapped directory paths** | `/directory/iot`, `/directory/databases`, `/directory/devops`, `/directory/monitoring` have GSC equity but no ledger decision | Add EVIDENCE_REVIEW entries to migration ledger for all 4 paths |
| **3 — DEFER_NOINDEX coupling** | 72 DEFER_NOINDEX rows conflate "not in GSC" with "should not publish"; all 72 are published pages | Decouple `historical_gsc_status` from `publication_authority`; assign explicit decisions |

**After blocker resolution:** Re-run `scripts/generate-canonical-map.ts`, update
`69-pillar-canonical-map.csv`, regenerate `redirect-action-census.csv`, and re-audit.
Target verdict: **PASS**.

---

## 13. Test Suite Status

```
npx vitest run
  Test Files  15 passed (15)
       Tests  138 passed (138)

npx tsc --noEmit
  (no errors)
```

New tests added:
- `src/__tests__/migration-reconciliation.test.ts` — 11 tests, all passing
  - Locks exact integers from source data
  - Documents blockers 1, 2, and 3 as explicit assertions
  - Will fail if future changes introduce drift from verified counts
