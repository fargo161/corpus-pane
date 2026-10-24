# Corpus Lab 01 — continuation boundary

## Product direction

This program is a tool for **filling out, correcting and verifying the existing corpus**, not another unrelated sample library. Two panes are working views of an expandable collection. Mannequins are the initial evidence, not the only supported character identity.

The eventual consumer is a standardized character-construction system based on the canonical still, multi-piece three-quarter mannequin. Preserve the identity, proportions, shared joint meanings and source artwork. Do not revive the previous video-pair retargeting experiment as the organizing architecture.

## Small modules, not repeated full rebuilds

`engine/` contains the inherited offline trackers, models, keyer, pixel pipeline, media decoder and shared tracking contract. All thirteen JavaScript files are byte-identical to the supplied Unified Prep Checkpoint 04 modules. Preserve their separate distribution unless a targeted, tested engine fix is needed.

`app/corpus.js` owns clip identity, source links, view labels, review snapshots, reusable configurations, comparison classifications, matching and merge rules. It contains no file chooser or pane ownership.

`app/storage.js` owns native browser persistence and the portable ZIP of linked JSON records plus immutable media. Source payloads are keyed by SHA-256 separately from workspace records.

`app/workspace.js`, `app/style.css` and `index.html` own the editor. A pane holds only its selected entry/frame and display state. Library content survives pane replacement. The starter payload is loaded on demand; the original 35-panel index does not imply that all videos are bundled or tracked.

`starter/catalog.js` is the retained source manifest. `starter/pair.js` has two exact source-video payloads and live automatic drafts. No shipped human verification, manual correction or reusable approved configuration is present.

The user's corpus backup is a third distribution boundary, independent of both the small application files and the unchanged model files. Do not turn each UI update into a full media export.

## Authority boundaries to retain

A model observation, a hand correction, a user-approved scope, a checked viewing direction, a checked scale guide and a classified comparison mean different things. Never collapse them into one good/bad flag. Unknown visibility is not hidden. A retained hidden coordinate is not visible evidence.

A compatibility label is not proof that an artwork piece can be interchanged. A projected arm can become shorter because it points toward the viewer. Do not silently stretch it, change the anatomical schema or invent unseen raster content.

Verification depends on the exact selected positions/visibility and, for face scopes, the oval. Saved configurations additionally depend on checked view, calibration and body-family label. Invalidation must retain history rather than erase earlier records. Import conflicts must fork instead of overwrite. JSON property order is not a data conflict.

## Current limits, not concealed completion claims

The viewport is desktop-oriented. Background removal is for solid/chroma backgrounds, with manual cleanup. Inputs should already isolate one figure; the original corpus panels meet that intake arrangement. Generic video timing uses the declared sampling rate rather than reconstructing variable source timestamps. The still mannequin, wardrobe/hair segmentation, final piece extraction and rig transfer remain outside this checkpoint.

The matcher retrieves existing reviewed configurations; it does not train a new detector from user actions. The underlying refinement engine can use corrected frames as references within the current clip. CPU inference may delay cancellation until the current frame finishes.

Undo/redo is session-local and bounded to 24 transactions or approximately 32 MB, retaining at least the newest transaction. Current pins, original observations, verification snapshots and a chronological change log are saved; the change log is not a complete replay of every superseded drag position. Portable backups are the durable version boundary.

The recorded tests establish the bounded behavior described in `TEST_REPORT.md`, not independently measured anatomical accuracy. Native launch and successful native browser save/reload still require acceptance on the target machine.

## Next development should follow use

First establish local launch/storage acceptance and let the user correct a small group across the starter pair. Use those saved records to improve the highest-friction editing or comparison step. Only then add more pose/view coverage. Preserve the corpus and regression fixtures when changing the program. Do not expand into doll rendering or garment systems merely because those systems exist elsewhere.


## Checkpoint 02 knowledge layer

Load order now includes `app/knowledge.js` before `app/corpus.js`. `CorpusKnowledge` is a static browser global generated from the unchanged `knowledge/` JSON package. `CorpusCore` remains usable without it in Node/tests; the knowledge version falls back to the embedded current package.

New `CorpusCore` APIs: `ensureKnowledge`, `upgradeKnowledge`, `viewStateAt`, `setViewState`, `projectionAt`, `setProjection`, `poseSignature`, and `signatureDistance`. Do not move these concerns into the universal skeleton: they describe projected evidence around the skeleton, not new joints.


## Checkpoint 02.1 repair handoff

The key compatibility rule is **normalize before comparing revisions**. Call `CorpusCore.upgradeKnowledge` on a clone of incoming/current corpus data before equality decisions. Do not add ephemeral record IDs back into semantic freshness comparisons. `signatureDistance` intentionally returns `score:null` until it has at least two informative shared visible points. UI review authority must remain distinct from anatomical validity and from owner acceptance. See `docs/REPAIR_REPORT.md` and `tests/repair.test.cjs`.


## Checkpoint 02.2.1 search semantics handoff

A match must be interpreted against the **requested region**, not merely the subset of joints that happened to overlap. `poseSignature.regionEvidence` and `signatureDistance.regionCoverage` are now part of the retrieval contract. Preserve the rule that rough evidence is query-only and checked references remain strict. A derived hand/toe endpoint does not by itself enlarge coverage. Owner re-check/save should reuse an identical current reference. `supportingScopeAcceptance` describes exact saved support and must not be expanded into blanket acceptance of a broader assistant review. See `docs/SEARCH_SEMANTICS_APPROVAL_CLEANUP_REPORT.md` and `tests/search_semantics_cleanup.test.cjs`.


## Checkpoint 02.2.2 view-priority / composite-authority handoff

- Search sort order must keep reviewed view conflicts behind compatible reviewed views before regional coverage.
- Explicit `occluded` / `out_of_frame` states count as known regional coverage but never generate pose geometry.
- `authorityForScope` is joint-by-joint and may return `compositeReview: true` with `supportingReviewIds`.
- Do not collapse assistant review into owner acceptance; every requested joint must have owner/accepted support before a larger reference inherits owner authority.
- Preserve deterministic support metadata across import so old backups do not fork.


## Checkpoint 02.2.4 handoff

Search uses the ordered body-view ladder FRONT → FRONT_THREE_QUARTER → PROFILE → BACK_THREE_QUARTER → BACK when both query and reference views are reviewed. Ranking prefers smaller view distance before extra regional coverage. Visibility is orthogonal: occluded/out-of-frame points count as known coverage, but a visible point compared with a hidden point is a mismatch and must be surfaced/penalized. Do not fabricate coordinates for hidden controls. Workspace format and universal skeleton remain unchanged.


## Checkpoint 02.2.4 surgical repair

Do not reintroduce a hard `viewDistance`-first sort. `Corpus.search()` deliberately sorts by the combined `rankingScore`; view distance is a graded contribution/tie-breaker. Neighboring-view shapes may outrank poor same-view shapes, while opposite views retain a strong penalty.

The packaged continuation fixture is `starter/Arm_Shoulder_Torso_Surgical_Repair_02_2_4.corpus.zip`. The two key regression records are MC03 display frame 24 (right-arm anatomical order) and MC01 display frame 30 (far elbow occluded, distal forearm/hand visible).

`tests/graded_view_visibility_browser.py` must remain self-contained and resolve the packaged backup relative to the release root.
