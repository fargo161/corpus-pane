# Corpus Pane Checkpoint 02.1 — Repair Report

**Date:** October 22, 2026  
**Scope:** narrow repair pass; no new product feature family.  
**Trigger:** external Claude static-code review of Corpus Pane Checkpoint 02.

## Repair matrix

| Review finding | Reproduced before fix | 02.1 behavior | Permanent regression evidence |
|---|---|---|---|
| Recording perspective can make an unchanged saved reference stale because a new view record has a new ID. | Yes | Freshness compares semantic perspective values rather than record IDs. Head-only changes affect head/face references, not unrelated body-region references. | `tests/repair.test.cjs`: head-only edit preserves arm ref; real body edit stales arm ref; semantic replacement IDs do not stale comparison. |
| Importing a CP01 backup into CP02 can create false “imported revision” clips because new empty Knowledge fields differ structurally. | Yes: 5 old clips became 5 forks before repair. | Incoming/current entries are upgraded before duplicate/revision comparison. Schema-only Knowledge additions no longer fork. | `tests/repair.test.cjs` + `tests/seed_backup_compat.py`. |
| Similar-pose search can score a nearly empty frame as a perfect match. | Yes: one-anchor signature could produce score 0. | Numeric knowledge score requires at least two shared visible informative points beyond the normalization anchor. Sparse candidates are not ranked. | `tests/repair.test.cjs`: sparse signature/search rejection and sufficiently supported search acceptance. |
| Existing head-direction observations were not carried into the split head-perspective layer. | Yes | Starter Pass head observations migrate deterministically when no later reviewed head record exists. Hidden/unknown stays unknown. | Node migration checks + browser UI check. |
| Assistant-reviewed data looked like owner verification. | Yes | References/reviews expose review authority and owner-acceptance state in Records/search UI. | Browser repair test confirms visible “Assistant-reviewed · owner acceptance pending.” |
| Unknown profile direction could become image-left. | Yes | Profile with unknown heading converts back to legacy unknown. | Node repair test. |
| Knowledge context did not specifically map every anatomical subgroup. | Yes | All current groups have specific article mappings. | Node repair test. |
| `new_piece` vs `needs_new_artwork` terminology mismatch. | Yes | Canonical saved key is `needs_new_artwork`; legacy input normalizes to it. | Node repair test + browser dropdown check. |
| View-conflict test contradicted its name because result truncation hid the mismatched frame. | Yes | Test asks for enough results and asserts the conflicting frame remains present with `viewConflict:true`. | `tests/core.test.cjs`. |
| Seed compatibility test could say PASS before assertions / rely on inaccessible path. | Yes | Fixture is package-local; PASS result is written after assertions. | `tests/seed_backup_compat.py`. |

## Important design rule preserved

A historical record ID is provenance, not anatomy. Freshness is based on the current evidence that matters to the reference: checked coordinates/visibility, fixed scale, relevant perspective, and regional projection. The history record still remains available for audit.

## Migration authority

Starter Pass 01 records were reviewed by the assistant and explicitly had owner acceptance pending. Checkpoint 02.1 preserves that distinction. Migration does not upgrade those records to owner approval. New explicit user actions in the program are recorded as owner decisions.

## No hidden anatomy upgrade

These fixes make the knowledge layer safer. They do not improve detector accuracy by themselves, infer missing anatomy, or certify the existing 18 references as owner-approved.
