# Corpus Pane — linked evidence contract

## Purpose and authority

Corpus Lab completes and verifies the existing corpus. It is not a replacement corpus with silently renumbered sources, a second skeleton, a two-video database, or a completed doll-building pipeline.

The original `adventure-studio-mannequin-motion-corpus` v0.1 manifest is retained verbatim under `inheritedCorpora[].manifest`. Its `panel_id`, source fingerprints, source crop information, tentative view, action description, quality notes, floor/root estimates and exclusions remain source evidence. Current user decisions are additional records, not edits to that historical description.

The canonical still gray mannequin remains an eventual consumer of this common anatomical language. No still-mannequin artwork, rig JSON, attachment geometry or skeleton was edited in this checkpoint. Importing a new compatible character is not permission to change its proportions to match a demonstration video.

## Four independent layers

| Layer | What it stores | What it does not establish |
|---|---|---|
| Original media | Immutable source bytes, fingerprint, name, MIME type and size | Cleaned edges or correct anatomy |
| Editable track | Sample timing, detector evidence, manual pins, visibility, face oval, cleanup settings, proposals and protected snapshots | Human review merely because a model found a point |
| Scoped review | Selected joint IDs on exact frame indices, positions/visibility/face-oval snapshot, explicit decision | Approval of every region, image, frame or 3D interpretation |
| Cross-source knowledge | Linked classifications and eligible named configurations with tags | Automatic model training, guaranteed part interchangeability or new artwork |

Automatic estimates, manual corrections and explicit verification are deliberately separate. A manually moved point is not automatically verified. A proposed view is not automatically checked. Accepting a tracking proposal is not verification. A comparison classification is not approval of either source's coordinates.

## Versions and identities

Workspace: `sprite-foundry/corpus-verifier`, integer `formatVersion: 1`; application 0.1.0 / checkpoint 1.

Track: `adventure-studio/unified-prep`, format 4.

Shared anatomy: `adventure-studio/universal-skeleton`, version `1.2.0`, profile `humanoid-2d`. This is reused, not redefined by the new interface. The exact definition is in `universal-skeleton-v1.2.0.json`.

Portable backup: `sprite-foundry/corpus-package`, version 1.

Clip IDs, original panel IDs, project/subject IDs, media hashes, verification IDs, comparison IDs and reference IDs are distinct. Replacing what is displayed in pane A does not replace a clip record. Anatomy is owned by the clip's track; the panes only choose which clip and sample to display.

Anatomical left/right means the subject's own sides. It does not reverse whenever the figure turns. Source mirroring remains an explicit track setting. Legacy screen-side face names are mapped by the inherited adapter rather than assigned by sorting image X positions.

## The shared skeleton and face

Body observations include the nose, detector eye/ear evidence, shoulders, elbows, wrists, hips, knees and ankles. Head, neck, chest, pelvis, hand endpoints and toe endpoints can be derived or explicitly corrected. Derived positions are not falsely claimed as direct detections.

The five face slots are `face.brow.left`, `face.brow.right`, `face.eye.left`, `face.eye.right` and `face.lower`. `nose` is the shared skeletal point. `eye.left/right` resolve through the face slots unless a historical independent body-eye correction must be preserved. Optional 68-point facial observations remain retained evidence.

The interface exposes 26 primary controls, excluding the duplicate detector-eye aliases and ears. Its group definitions are references to the same IDs. An elbow in “Left upper arm” and “Left forearm” is one elbow, not two independently editable points.

Positions are source pixels, with top-left origin, X right and Y down. Do not infer depth or biological length from projected distances. Display calibration stores `rootX`, `crownY`, `floorY`, a reference frame, status and method. The standing display height is `floorY - crownY`. It defines a fixed uniform comparison scale, not a solved mannequin measurement or per-frame stretch.

## Per-clip records

Each `entries[clipId]` stores identity, a compatible `bodyType` label, optional `legacyPanelId`, original metadata, the entire editable `project`, ordered `mediaRefs`, fixed calibration, view labels, reviews, review findings and revision metadata.

`viewLabels[]` records an inclusive frame range, view family, heading on screen, status and timestamp. The newest applicable record wins without deleting older labels. Unknown/mixed are uncertain, not reusable checked views. Original source hints remain provisional until explicitly overridden for a range.

`project.edits[index][jointId]` stores exact manual coordinates separately from automatic frame observations. `project.visibilityEdits` can record hidden/outside/unknown states even with no known position. Visibility and position confidence are different concepts. `project.locks` stores accepted position snapshots; it is not a claim that the detector is correct.

`project.pendingReview` holds a staged refinement result. The prior committed observations remain intact until application. Pins, accepted positions and explicit hidden intervals resist automatic replacement. Whole-character and region passes address the same frame table and schema.

## Review snapshots and invalidation

A verification record stores `start`, `end`, `keys`, `region`, `decision`, `reviewer`, timestamp and an exact snapshot. The snapshot contains sorted joint IDs with X, Y and visibility on each selected frame, plus the face oval when the selected scope includes face controls.

Coordinates cannot be verified while a supposedly visible point is missing or uncertain. An explicit hidden or out-of-frame state is verifiable without an invented position. Current approval is calculated by comparing the current resolved snapshot with the saved snapshot, not by reading a timeless “verified=true” bit.

Changing a related coordinate, visibility or face oval makes affected reviews stale. Editing an unrelated knee does not invalidate an independent arm review. Reopening a scope conservatively reopens overlapping review records and unlocks the selected scope. Existing manual pins remain until removed explicitly. Review status survives serialization; staleness is recomputed on import.

A verification is a user's recorded assertion, not cryptographic proof of anatomical correctness or a remote signed credential. Imported records retain their assertions but must not be represented as independently re-audited by this application.

## Named reusable configurations

A configuration records its source clip/frame, selected group and joint IDs, name, tags, body-family label, current view, calibration, snapshot, skeleton version and source fingerprint.

Eligibility requires a current verified group, a checked view and checked fixed calibration. Search excludes stale configurations. A later change to those dependencies or body-family label invalidates eligibility while retaining the record for audit.

“Find similar in other clip” searches draft frames as candidates. “Find verified references” searches eligible named configurations. Both compare visible supported 2D positions normalized by fixed per-clip standing display height. Known view/heading conflicts and body-family conflicts are surfaced or filtered. Hidden, missing and uncertain points are excluded. A numeric shape difference is not an anatomical accuracy score. No other character's coordinates are silently pasted into the active track.

The first implementation retrieves reviewed examples; it does not retrain the bundled neural models. Local tracking references within a clip are an additional existing mechanism, separate from the cross-corpus reference library.

## Comparison decisions

Each comparison stores both source clip/frame links, their relevant snapshots/views/calibrations, shared region/keys, a classification, note, optional tags and timestamp. Vocabulary: same configuration; tracking error; different view/foreshortening; new pose; needs new artwork; hidden/outside; source/cleanup artifact; possible schema limitation requiring investigation; uncertain.

If either source's relevant observations change, the decision is shown as needing review. Classifying “needs new artwork” does not generate a piece. Classifying “possible skeleton limitation” does not automatically change the common schema.

## Non-destructive image preparation

Original video/image bytes are retained. Chroma/RGB background removal, feathering, spill adjustment, brightness/contrast/saturation and remove/restore/recolor strokes produce derived images. Brush strokes have source-pixel coordinates and inclusive frame scopes. Repeated-frame strokes do not motion-track themselves; use a bounded range when a fixed-position cleanup is appropriate.

Transparent PNG exports omit overlays. A cleaned sequence includes `frame-map.json` with original source frame indices/timing and a copy of the editable track. It is not a source-inclusive master backup.

The body/face tracker consumes actual source and prepared image evidence. Hidden-part suggestions are conservative heuristics. Neither transparency nor low model confidence proves occlusion.

## Portable package layout

```
manifest.json                 Version, clip/media links, integrity checks
corpus.header.json            Identity, schema, original manifests, change log, extensions
media/index.json              Fingerprint -> original name/type/size
media/<sha256>.bin             Original source bytes, unchanged
records/<clipId>.json          Per-clip metadata/reviews, without duplicated project
tracks/<clipId>.uprep.json      Complete editable format-4 project
references/index.json          Named reviewed configurations
comparisons/index.json         Pairwise classification decisions
READ_ME.txt                   Reopening instructions
```

Every required payload has a SHA-256 checksum. The importer checks payloads before merging. Unavailable source bytes are explicitly represented and can be reattached by fingerprint. Plain JSON export includes all workspace records but not media bytes.

Exact duplicate records are reused by their values, regardless of JSON object field order. A differing entry with the same clip ID becomes a separate imported revision; its dependent references/comparisons are remapped. Existing corrections are not overwritten. Unknown JSON extension fields survive. The original source files are never renamed, written back or deleted by the application.

Schema validation checks basic structure and supported versions; JavaScript validation and round-trip tests enforce additional cross-record rules. Neither validates the truth of a human anatomical judgment.

## Persistence and update boundary

Browser IndexedDB stores workspace JSON and original source Blobs in separate stores. Storage denial leaves an explicit backup warning; sources already loaded remain usable in the current session. Save portable backups before closing/updating. Updating `app/` is separate from distributing unchanged `engine/` models and from the user's growing corpus.

The verification workflow, not ever-larger release bundles, is intended to accumulate the reusable evidence. Do not silently migrate the skeleton version, promote provisional labels, discard unknown fields, force new character proportions to match the starter, or turn the two visible panes into a two-entry database.

## Editing history scope

Undo/redo is session-local, capped at 24 transactions or approximately 32 MB while retaining the newest transaction. The export preserves current manual pins and their original detector baseline, current and prior review/view records, source observations, and a chronological change log. It does not serialize the undo stack or every superseded pointer position. Use successive portable backups for durable workspace versions.


---

## Checkpoint 02 knowledge addendum

Checkpoint 02 does not replace the four evidence layers above. It adds a curated knowledge-reference layer and two new per-entry record families under `entry.knowledge`: `viewStates[]` for split body/head perspective and `projections[]` for regional 2D projection context. These records are review context, not coordinate verification.

A new reusable configuration may include `knowledgeContext` with the built-in knowledge version, split perspective, regional projection, and a pose signature. Legacy references without this block remain valid. Search uses the richer signature when available but never copies another source's coordinates or promotes a match to verified status.

The knowledge package itself is static application reference data. It is not exported as user evidence because the build already ships the canonical package under `knowledge/`; the corpus records only the package identity/version they were interpreted against.


## Checkpoint 02.1 repair addendum

Historical IDs on view/perspective/projection records are provenance. Reference/comparison freshness uses semantic fields rather than requiring the same record ID. Region relevance matters: face/head references depend on head orientation; body regions depend on body orientation.

Before corpus merge/equality checks, older entries are upgraded non-destructively into the current Knowledge container shape. This prevents a schema-only field addition from being interpreted as a substantive clip revision. Unknown extension fields remain preserved.

A knowledge pose signature is rankable only when the two signatures share at least two visible informative points beyond the normalization anchor. Insufficient evidence produces no numeric knowledge score.

Review authority and owner acceptance are independent metadata. Assistant-reviewed Starter Pass records remain `assistant_visual_review` with `userAcceptance: pending`; migration cannot silently promote them.

## Checkpoint 02.2 Library Search & Approval addendum

Checked reusable references remain strict admission records. A query frame may temporarily use `rough_query` evidence for retrieval only when its strict signature is insufficient. Rough query evidence is never serialized as verification merely because a match was found.

A pose signature is sufficient when it has either two informative shared points beyond its normalization anchor or one complete shared bone. One isolated point remains insufficient.

Owner acceptance of a reusable configuration is stored separately from the original preparation/review authority. Import reconciliation treats authority/acceptance metadata as annotations on the same structural reference rather than grounds for a duplicate reference record; accepted owner state is never downgraded by an older pending copy.
