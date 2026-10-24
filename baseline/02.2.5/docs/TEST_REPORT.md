# Corpus Pane — Checkpoint 02.2.5 Test Report

**Application:** 0.2.2.5 / Checkpoint 02.2.5  
**Knowledge package:** 1.0.5  
**Status:** acceptance-reliability / landmark-semantics repair candidate; owner acceptance pending

## Direct regression suites

| Suite | Result |
|---|---:|
| Original core/data contract | 41 / 41 |
| Knowledge integration | 8 / 8 |
| Checkpoint 02.1 repair regressions | 14 / 14 |
| Checkpoint 02.2 library search & approval | 7 / 7 |
| Checkpoint 02.2.1 search-semantics cleanup | 8 / 8 |
| Checkpoint 02.2.2 view priority & composite authority | 7 / 7 |
| Graded view / visibility semantics | 6 / 6 |
| Checkpoint 02.2.4 surgical repair | 7 / 7 |
| Checkpoint 02.2.5 acceptance reliability / landmark semantics | 5 / 5 |
| **Total** | **103 / 103** |

The new 02.2.5 suite checks that the universal skeleton remains version 1.2.0, the four arm landmark meanings are explicit, MC10 p02 frame 37 uses the corrected wrist/palm-center-hand positions, MC10 p03 frame 16 does not invent an in-frame wrist/hand where the distal arm leaves the crop, and both repaired references remain assistant-reviewed with owner acceptance pending.

## Live browser / backup scenarios

The focused 02.2.5 browser scenario passed **6 / 6** with zero page errors. It deliberately slows a frame decode and verifies that stale source pixels are cleared while the requested frame is loading, then verifies `index == bitmapIndex == rawIndex` after the seek completes. This directly covers the acceptance-screen failure where one frame's skeleton could previously appear over another frame's picture.

The current build was also rerun successfully through these focused historical browser scenarios:

- 02.1 repair / migration browser: PASS; zero page errors.
- 02.2 rough search / owner approval browser: PASS; zero page errors.
- 02.2.1 search-semantics / exact-support browser: PASS; zero page errors.
- 02.2.2 view-priority / composite-authority browser: PASS; zero page errors.
- Starter Pass 01 migration/import: PASS; five clips / 18 references / six comparisons restored with no page errors.
- 02.2.4 graded view / visibility scenario, rerun against the 02.2.5 continuation backup: **8 / 8 PASS**; zero page errors.

Browser scenarios are run separately because long chained Playwright pipes can stall in this managed environment even when the individual scenarios are healthy.

## Acceptance corpus

`Arm_Shoulder_Torso_Acceptance_Reliability_02_2_5.corpus.zip` preserves:

- **13 clips**
- **39 reusable reference records**
- **13 comparison decisions**
- **43 scoped review records**
- all attached original source media

The review count increases from the earlier 41 because the two acceptance-list repairs are preserved as new exact review evidence rather than silently rewriting the earlier history.

### Reference #12 repair

`MC10_arms_p02_center`, UI frame 37, left arm:

- shoulder: `(148.8, 165.2)` visible
- elbow: `(170, 124)` visible
- wrist: `(188, 68)` visible
- hand/palm center: `(194, 56)` visible

The repaired reference is labeled `3Q overhead reach — left arm · landmark corrected` and remains owner-pending.

### Reference #15 repair

`MC10_arms_p03_right`, UI frame 16, left arm:

- shoulder and elbow remain visible
- the distal forearm leaves the source crop
- wrist: **out of frame, no invented coordinate**
- hand: **out of frame, no invented coordinate**

The repaired reference is labeled `Rear-3Q open side extension — left arm · wrist exits frame` and remains owner-pending.

## Landmark-semantics rule

The runtime and UI now share an explicit arm convention:

- **Shoulder:** center of anatomical shoulder rotation where the upper arm pivots against the torso; inside the body contour, not the skin edge.
- **Elbow:** center of the elbow hinge; not the visible point of the elbow silhouette.
- **Wrist:** center of the wrist joint at the narrow forearm-to-hand transition; not palm center, knuckles, fist tip, or fingertips.
- **Hand:** center of the palm / metacarpal mass immediately beyond the wrist; not fingertip or outside fist tip.

This adds semantic precision without changing universal-skeleton topology or version.

## Knowledge validation

- Package/integrity checks: **330 / 330**
- JSON-schema validations: **54 / 54**

## Release audit

`tests/release-audit-02_2_5.json` passes **65 / 65** checks. It checks versioning, unchanged detector/runtime assets, unchanged universal-skeleton definition, required repair files, JavaScript syntax, current regression result files, knowledge validation, display-sync implementation markers, landmark-semantics markers, corpus checksums/counts, repaired-reference authority, relative test fixtures, and absence of Python cache files.

## Environment boundary

The browser harness uses the established in-memory test store where native IndexedDB is unavailable. Ordinary local-file launch and native browser persistence/reload remain user-machine checks. Portable corpus import, real source decoding, UI frame synchronization, and the deterministic data/review rules were exercised here.
