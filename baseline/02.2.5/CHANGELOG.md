# Corpus Pane Changelog

## Checkpoint 02.2.5 / 0.2.2.5 — 2026-10-24

- Fixed the frame-display race: during a seek, old pixels are cleared before new frame pixels load, and overlays are drawn only when bitmap/raw frame indices match the requested frame.
- Added explicit arm landmark semantics for shoulder, elbow, wrist, and hand/palm center; these rules are shown beside precise point editing.
- Repaired MC10 p02 frame 37 left-arm wrist/hand placement using the new landmark convention.
- Reclassified MC10 p03 frame 16 distal left wrist/hand as out-of-frame rather than accepting interior forearm points as wrist/hand.
- Kept both repaired references assistant-reviewed with owner acceptance pending.
- Kept universal skeleton topology/version 1.2.0 unchanged.

## Checkpoint 02.2.4 / 0.2.2.4 — 2026-10-24

- Surgically corrected MC03 frame 24 so the visible right arm follows shoulder → elbow → wrist → fist/hand.
- Reclassified MC01 frame 30 as an occlusion/depth case: far elbow hidden behind the torso, distal forearm/hand visible near the neck.
- Changed reference ranking from hard view-distance-first sorting to a combined pose-shape + graded-view score.
- Kept a small neighboring-view penalty while strengthening clearly opposite-view penalties.
- Preserved hidden-versus-visible disagreement semantics without inventing hidden geometry.
- Removed the builder-specific absolute path from the graded-view browser fixture; it now uses the packaged continuation backup.
- Added seven direct surgical regressions and real 13-clip search review evidence.
- Updated the built-in Knowledge support notes to 1.0.5.
- No still mannequin, Doll Rigger, universal skeleton topology, detector model, or source media was changed.

## Checkpoint 02.2.2 / 0.2.2.2 — 2026-10-23

- Ranked compatible reviewed body/head views ahead of view-conflicting references before considering extra regional coverage.
- Counted explicit occluded/out-of-frame anatomy as known regional evidence while continuing to exclude it from projected-coordinate geometry.
- Added joint-by-joint composite review authority so separately checked upper arm, forearm and hand can support one whole-arm reference.
- Extended owner-acceptance aggregation across smaller current reviews without silently widening the accepted scope.
- Added 7 direct regressions and a focused browser scenario for view priority, hidden-known coverage, and composite review provenance.
- Updated built-in Knowledge package to 1.0.3.
- Standardized the checksum manifest format and removed generated Python cache files from release packaging.

## Checkpoint 02.2.1 / 0.2.2.1 — 2026-10-22

- Added requested-region coverage to pose signatures and match results.
- A complete bone counts as a full match only when that bone is the requested region; larger requested regions are labeled partial when only a subset matches.
- Strict and rough query modes are both evaluated when useful; broader requested-region coverage can outrank a narrower strict match.
- Automatically derived hand/toe endpoints no longer inflate search coverage without stronger accepted/manual evidence.
- Owner re-check/save reuses an identical current reference instead of creating a duplicate.
- Owner acceptance records exact saved support and preserves broader assistant-review attribution.
- Review cards show partial/full owner coverage derived from later owner reviews/references.
- Fixed contradictory rough-search guidance and misleading single-face-point search text.
- Updated built-in Knowledge package to 1.0.2 and marked projection recording/search coverage behavior accurately.
- Added eight direct 02.2.1 regressions plus a focused live browser scenario.
- No still mannequin, Doll Rigger, skeleton topology, detector model, or source media was intentionally changed.

## Checkpoint 02.2 / 0.2.2 — 2026-10-22

- Added complete-bone regional search for two-joint limb segments.
- Added strict-reference / rough-query fallback with explicit UI labeling.
- Added owner acceptance for assistant-reviewed reusable configurations while preserving provenance.
- Prevented older pending imports from duplicating or downgrading owner-accepted references.
- Added review-authority badges to comparison records.
- Refreshed Knowledge implementation wording and package metadata to 1.0.1.
- Added seven direct 02.2 regressions and a focused browser/UI test.

## Checkpoint 02.1 / 0.2.1 — 2026-10-22

Repair-only release following external static-code review of Checkpoint 02.

- Fixed false reference/comparison staleness caused by newly generated perspective record IDs.
- A head-only perspective change no longer invalidates an unchanged body-region reference; real relevant perspective changes still do.
- Fixed older-backup duplicate/fork behavior by normalizing imported entries before equality/revision checks.
- Similar-pose search now requires enough shared visible anatomy; one-anchor sparse frames cannot score as perfect matches.
- Migrated prior Starter Pass head-direction observations into split head perspective without inventing unknown directions.
- Made review authority visible: assistant-reviewed / owner acceptance pending versus owner-approved.
- Fixed unknown profile direction so it stays unknown rather than defaulting to image-left.
- Expanded Knowledge context mapping to every current anatomical subgroup.
- Standardized comparison key `needs_new_artwork`, while retaining import compatibility with legacy `new_piece`.
- Corrected the view-conflict test and made the five-clip compatibility fixture self-contained for reviewers.
- Added a dedicated 02.1 repair suite and Claude-oriented reviewer bundle.
- No still mannequin, Doll Rigger, skeleton topology, source video, or accepted coordinate was intentionally changed.

## Checkpoint 02 / 0.2.0 — 2026-10-22

- Renamed the focused tool from Corpus Lab to **Corpus Pane**.
- Embedded the complete Corpus Pane Knowledge Schema v1.0.0 as a read-only reference layer.
- Added body/torso and head perspective as separate reviewed records.
- Added per-region projection state and non-authoritative depth hints.
- Added richer pose signatures and knowledge-aware reference ranking.
- Added contextual Knowledge tab with 38 searchable articles.
- New reusable configurations retain knowledge context while old references remain valid.
- Bundled the five-clip Starter Pass 01 corpus backup for convenient continuation.
