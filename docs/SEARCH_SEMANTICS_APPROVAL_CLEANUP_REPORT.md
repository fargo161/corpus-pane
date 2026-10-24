# Corpus Pane 02.2.1 — Search Semantics & Approval Cleanup Report

**Date:** October 22, 2026  
**Application:** Corpus Pane 0.2.2.1  
**Knowledge:** 1.0.2  
**Status:** repair/cleanup candidate; owner release acceptance pending

## Scope

This pass addresses the remaining issues from the external 02.2 review. It intentionally does not add a new skeleton, detector, source corpus, poser, Doll Rigger bridge, or paired-action system.

## 1. Requested-region coverage

The matcher now distinguishes the body part that was actually requested from the smaller sub-part that happened to be searchable. A two-joint bone is enough evidence for that bone, but not automatically for a larger arm or leg group.

Each pose signature records requested/usable points and requested/usable bones. Each match reports one of:

- `complete_region`
- `partial_region`
- `insufficient`

The UI renders these in plain language, for example `Full region match`, `Partial match — 2/3 region bones`, or `Partial match — 3/5 controls`.

Automatically derived hand/toe endpoints do not count as independent terminal evidence unless they have stronger accepted/manual support. This prevents an inferred endpoint from making an incomplete whole limb appear fully covered.

## 2. Coverage-first strict/rough query selection

02.2 permitted rough search when strict evidence was weak. 02.2.1 evaluates both modes when appropriate and prefers the candidate mode that covers more of the requested region. Coverage is considered before the final geometry score.

The trust boundary is unchanged:

- the **reference library remains strict and checked**;
- uncertain detector points may participate only on the **query side**;
- rough results are labeled `Rough query — inspect before using`;
- no reference coordinates are copied into the active track;
- no rough result becomes verification or owner acceptance.

## 3. Owner re-check and duplicate prevention

Saving the same current frame/group/snapshot after an owner re-check reuses the existing reference rather than creating a second equivalent reference. If the underlying authority has become owner-accepted, the existing assistant-prepared reference is promoted while retaining its original preparation provenance.

## 4. Exact-support owner acceptance

The Records action is now `Accept reference + exact support`. The acceptance records the exact saved frame/group/snapshot represented by that reference. It does not silently widen owner authority to every frame of an earlier assistant review range.

The review list derives how much of an assistant review has later owner support and can show partial or complete owner coverage while preserving the original assistant review record.

## 5. UI wording cleanup

- The comparison pane no longer says a rough-searchable frame “will not rank.”
- A single facial control explains that one point cannot define a pose match and recommends a larger region such as `Face only`.
- Search cards report requested-region coverage instead of calling a partial sub-region a complete match.
- Knowledge CP-K022 now describes projection recording as implemented.

## Compatibility

The five-clip Starter Pass backup imports as five clips with 18 reusable configurations, 20 review records, and six comparison decisions. Its head-direction migration remains intact. The universal skeleton stays `adventure-studio/universal-skeleton` 1.2.0. The `engine/` and `starter/` directories are unchanged from Checkpoint 02.2.

## Tests

See `docs/TEST_REPORT.md`. The new direct suite specifically covers whole-arm partial coverage, broader rough coverage, whole-leg partial coverage, incomplete face coverage, owner re-check deduplication, exact-support acceptance, single-point refusal, and current foreshortening Knowledge wording.
