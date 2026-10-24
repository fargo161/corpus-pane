# Corpus Pane Knowledge Schema v1.0.5

This package is a curated knowledge layer for the **Corpus Pane**. It does not modify the program, the existing five-clip corpus, or the canonical gray mannequin.

The central idea is simple: **keep one universal anatomical skeleton, then document how that skeleton appears across different characters, poses, viewing angles, visibility states, artwork pieces, and tested articulation ranges.**

## Start here

1. `MASTER_INDEX.json` — the master map of the package.
2. `articles/CP-K000_...json` — mission and authority boundaries.
3. Follow the `novice` reading path in the master index.
4. `models/universal_skeleton_v1_2_0.json` — the current shared skeleton, copied unchanged for reference.
5. `models/proposed_corpus_to_doll_bridge.json` — a **proposed** mapping to the current still mannequin mechanics; it is not a completed retarget.
6. `schemas/` — proposed JSON record shapes for split view state, perspective references, pose signatures, poser parts, and compatibility tests.

## Existing versus proposed

Every article has an `implementation.status` field:

- `existing` — already supported by the current Corpus Pane/shared schema.
- `mixed` — part exists now; the article adds a proposed refinement.
- `proposed` — recommended project-specific addition.
- `research_only` — outside knowledge worth using selectively, not something already imported.

## Why the package is deliberately not huge

The research found that a controlled, well-described reference pack is more useful to this project than dumping thousands of unrelated poses into the corpus. The package therefore keeps external sources as **source records and design rules**, not bundled third-party datasets or code.

## Validation

Run `python tests/validate_package.py` from the package root. It checks JSON parsing, stable article IDs, source references, article links, master-index paths, and key model files.
