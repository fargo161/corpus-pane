# Corpus Pane 02 — Knowledge Integration

## Design decision

The Knowledge Schema is integrated as **reference + structured context**, not as a second skeleton or a truth engine. The existing universal skeleton, editable tracks, manual pins, verification snapshots, and corpus package format remain authoritative for project evidence.

## Implemented in Checkpoint 02

### 1. Split body and head perspective

Each clip can now record body/torso and head orientation independently for an exact frame range. The runtime vocabulary is the Knowledge Schema vocabulary: `FRONT`, `FRONT_THREE_QUARTER`, `PROFILE`, `BACK_THREE_QUARTER`, `BACK`, `MIXED`, `UNKNOWN`, plus explicit screen heading.

For backward compatibility, a reviewed body view is also written to the existing `viewLabels[]` form. Old backups therefore continue to work, while new records retain the more precise body/head split in `entry.knowledge.viewStates[]`.

### 2. Regional projection annotations

`entry.knowledge.projections[]` records how a chosen anatomical group appears in 2D: ordinary/planar, foreshortened, edge-on, cross-body, folded overlap, ambiguous silhouette, hidden, or unknown. Optional depth direction is a hint only. It never changes coordinates or layer order automatically.

### 3. Knowledge-aware pose signatures

A selected body region can be represented by a compact signature containing normalized joint positions, projected bone lengths, bone angles, visibility, split perspective, and projection context. The standing display height remains the default scale basis; no per-frame stretching is introduced.

### 4. Reference ranking

`Find similar` and `Find verified references` retain the original simple projected-distance measure and add the richer pose signature. Reviewed view or projection conflicts add an explicit ranking penalty. They are **not filtered as anatomical failures** and are shown to the user.

### 5. Reusable reference context

New verified configurations retain their old snapshot/calibration/view fields and additionally store `knowledgeContext`: Knowledge package version, split view state, regional projection, and pose signature.

### 6. Built-in knowledge browser

The complete Knowledge Schema v1.0.0 ships under `knowledge/`. A generated local runtime bundle exposes the 38 articles to the UI without a web request. Context recommendations are based on the selected anatomical region and current tab.

### 7. Non-destructive upgrade

Old corpus entries gain an empty `knowledge` object when loaded. The corpus format remains version 1 and the skeleton remains 1.2.0. Source bytes, coordinates, edits, locks, reviews, references, and comparisons are not modified by that upgrade.

## Still documentation-only

The following remain intentionally unimplemented: perspective-reference generation with MakeHuman/MPFB, automatic depth reconstruction, artwork pivot/socket authoring, part compatibility tests, articulation-envelope authoring, actual doll-piece harvesting, Doll Rigger retargeting, and detector retraining.

These remain in the knowledge library so later features can be implemented against a stable vocabulary and evidence boundary rather than improvised ad hoc.


## Checkpoint 02.1 repair semantics

Checkpoint 02.1 keeps the Knowledge package itself unchanged and repairs how the application consumes it. Perspective freshness is semantic rather than record-ID based; sparse signatures are not ranked; old backups are normalized before merge comparison; prior head observations migrate without changing owner authority; and canonical comparison terminology uses `needs_new_artwork`. These are integration rules, not new Knowledge articles.

## Checkpoint 02.2 search and approval semantics

The bundled Knowledge package metadata is refreshed to 1.0.1 so implementation-status text matches the program. Split body/head perspective and pose signatures are implemented. Nearest-reference matching is partly implemented through Corpus Pane's own checked-reference retrieval.

The reference side of knowledge-aware search remains strict. When the active query lacks strict evidence, bounded uncertain detector observations may be used only to ask which checked references are worth inspecting. The UI labels this path `Rough query — inspect before using`; it does not transfer authority from the reference to the query.
