# Universal skeleton / editable project contract — Checkpoint 04

Schema ID `adventure-studio/universal-skeleton`, version **1.2.0**. Project format `adventure-studio/unified-prep`, version **4**. Current profile: `humanoid-2d`.

The exported schema describes semantic anatomy; it is not a JSON Schema Draft validator. Import validation is implemented in `lib/universal.js` plus `lib/reliability.js` and exercised by the supplied tests.

## Single authority
One subject, original-frame timeline and anatomical namespace. Detector adapters provide observations; reference/pose solvers and manual edits interpret the same record. Character/rig adapters later map these concepts to layers, proportions, sockets and rest geometry. The mannequin's asset names do not own the universal schema. No per-limb skeletons or independent face timeline are introduced.

Coordinates remain source-image pixels, top-left origin, X right/Y down. Anatomical `.left` / `.right` are the character's sides. Mirror convention is explicit. No metric depth or 3D ground truth is implied.

Primary face controls are `face.brow.left`, `face.brow.right`, `face.eye.left`, `face.eye.right`, `face.lower`. `nose` is shared with the skeleton. Original detector `eye.left/right` data remain available as raw evidence; when not independently pinned, their resolved values alias the canonical facial eye controls. Imported legacy body-eye corrections are preserved. Optional 68 landmarks remain model-ordered observations, not 68 mandatory editing controls.

## Core and additive fields
- `source`, `subject`, `timeline`: source fingerprints/timing, one subject identity, original frame indices and trim.
- `frames[i].points`: raw/current observations. `raw[passId]` retains detector/body/face-solver evidence.
- `frames[i].motion`: original source SHA-256, decoded-pixel SHA-256, cumulative low-resolution image-difference phase, delta, repeated-frame flag and method. Phase is a heuristic, not a joint trajectory measurement.
- `frames[i].visibilityEvidence`: scoped automatic state hypotheses with reasons and `heuristic:true`. Committed only for actually accepted, unprotected point updates; other groups' evidence is preserved.
- `frames[i].faceOval`, `face`, `quality`: followed oval, face evidence metadata, separate body/face quality channels. Body-only passes cannot rewrite the tracked face oval.
- `edits`: exact per-frame/manual point positions, prior baseline retained for historical compatibility. The old baseline is no longer used to blend correction offsets.
- `locks`: frozen resolved values and scope. Null is a valid protected absence.
- `visibilityEdits`: explicit per-frame manual overrides; range/held actions expand to these annotations and record an operation.
- `processing.faceOvals`: independent manual oval geometry (`cx,cy,w,h,angle` in radians), provenance and head reference.
- `processing.faceReferences`: selected source-frame references, primary anchors, hidden states and labels. Image templates are reconstructed from exact original pixels.
- `processing.faceOptions`: anchors-follow-oval and optional keyer protection.
- `pendingReview`: proposed scoped pass, per-frame points/evidence, comparison, source motion metadata and remaining queue. Not an accepted observation layer.
- `reviewContinuation`: remaining ordered frame queue/options after a review decision.
- `passes`, `operations`: source/method/scope, review decision, protection/retention statistics and edit history.
- Existing keyer, brush, color, crop, source/face guides, output and binding data remain preserved.

## Resolve and commit rules
Exact manual pins precede accepted snapshots. Protected null remains null. Between bracketing pins within radius, absolute interpolation is permitted in Both directions without crossing an accepted lock or hidden interval. Source motion phase is used when available and monotonic; otherwise timing is the explicit fallback. One-sided error-offset smearing is removed. Visual reference following occurs during a new refinement pass instead.

Derived neck/pelvis/chest/head and approximate hand/toe endpoints use the final corrected parents. Explicit independent controls remain authoritative. Every interpolated/derived point records its non-detection origin; interpolation confidence is null rather than a fabricated calibrated probability.

Manual visibility takes precedence over automatic suggestions. Unknown, visible, occluded and outside-frame are distinct. A missing coordinate can still carry visibility evidence. Generic low-confidence observations are not automatically classified as hidden.

A proposal may contain contextual full-body evidence, but commit writes only allowlisted unprotected coordinates and associated evidence. Review rejection/retention of a coordinate also retains its previous automatic visibility metadata. Contextual body passes do not mutate the face oval. Changes to body/face quality are recalculated from the final resolved track.

The comparison labels describe evidence and displacement, not accuracy. Conservative acceptance retains ambiguous replacements; full-candidate acceptance still cannot override user protection. Discard or cancellation does not commit proposed coordinates.

## Interchange and preservation
Formats 2 and 3 migrate additively to format 4, preserving existing raw arrays, corrections, locks, visibility, media identity and processing. New saves require Checkpoint 04. Undo history is not serialized; current data, operations, passes and pending decisions are.

`project.json` is the editing authority. `track.resolved.json` is a derivative with normalized and explicit crop/scale output coordinates. Rendered trims retain the full original editing project and map output frames to source indices. Source-inclusive project ZIPs contain original media and a SHA-256 manifest. A rendered-frame ZIP is not a source-inclusive master backup.

The schema supports later adapters; no completed Doll Rigger retargeting, foot-contact solver or automatic character universalization is claimed here.
