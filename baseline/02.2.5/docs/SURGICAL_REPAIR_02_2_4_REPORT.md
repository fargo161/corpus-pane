# Corpus Pane 02.2.4 — Surgical Repair Report

## Purpose

This pass responds to external visual review of the prior correction/gap-fill work. The goal was not to add more general corpus material. It was to remove two anatomically misleading arm records from the trusted path, correct them against their source motion, and stop exact view labels from overpowering much better pose-shape evidence during retrieval.

## Source corrections

### MC03 output35, center, display frame 24 — right arm

External review correctly identified that the outer visible tip is the fist/hand, not the elbow. The prior record folded the wrist/hand back toward the shoulder. The repaired visible guide is:

- shoulder.right: `(137.4, 166.3)`
- elbow.right: `(124, 171)`
- wrist.right: `(110, 179)`
- hand.right: `(103, 183)`

The record therefore proceeds from shoulder to elbow to wrist to the outer fist. The original detector evidence is retained beneath the manual correction. The existing reference keeps its ID but is renamed **“3Q fist-forward foreshortened reach — corrected right arm.”** It remains assistant-reviewed / owner acceptance pending. The perspective note is explicitly a 2D foreshortening cue, not solved 3D anatomy.

### MC01 output37, right panel, display frame 30 — far left arm

External review correctly identified that the far upper arm/elbow travel behind the torso. The prior record placed the elbow on the near shoulder and marked it visible. The repaired record says:

- shoulder.left: visible at `(116, 144)`
- elbow.left: **occluded**; retained underlying coordinate is provenance only, not a visible observation
- wrist.left: visible at `(178, 129)`
- hand.left: visible at `(193, 131)`

This is now named **“Rear-3Q far arm behind torso — distal forearm/hand visible.”** It is an occlusion/depth reference, not a clean full-arm length or “reach away” measurement. The associated comparison is reclassified as `hidden_part`.

## Search ranking repair

The ordered view ladder remains:

`FRONT → FRONT_THREE_QUARTER → PROFILE → BACK_THREE_QUARTER → BACK`

But view is no longer a hard first sort. Search now ranks by the existing combined `rankingScore`, which includes pose-shape evidence, requested-region coverage, visibility disagreement, graded view distance, heading/projection context and rough-query penalties.

The view penalties are intentionally asymmetric in effect:

- same view: no penalty
- neighboring view: small penalty
- two steps: meaningful penalty
- three steps: large penalty
- opposite end of ladder: very strong penalty

This allows a clearly better neighboring-view arm to outrank a mediocre same-view arm without allowing a front/back contradiction to disappear.

## Real-corpus ranking inspection

Using the repaired 13-clip corpus, a straight horizontal left-arm query from `MC12_turn-armstretch_p01_left` frame 59 now ranks **“Front T-pose extension — left arm”** first even though it is a neighboring reviewed view. Worse same-view references rank below it. This is the intended behavior: exact view informs the judgment but does not automatically beat a much better arm shape.

The repaired MC01 hidden-arm query no longer produces a false perfect visible-arm match: visible-arm candidates carry an explicit visibility mismatch.

## Data/preservation boundary

Counts remain **13 clips / 39 reusable references / 13 comparisons / 41 scoped reviews**. No owner acceptance is invented. No universal-skeleton topology, detector model, still mannequin, Doll Rigger, or original source-media byte is changed.

The continuation backup is `starter/Arm_Shoulder_Torso_Surgical_Repair_02_2_4.corpus.zip`.
