# Corpus Pane 02.2.3 — Arm/Torso Correction & Gap-Fill

**Application:** 0.2.2.3  
**Checkpoint:** 02.2.3  

## Scope

This pass is intentionally bounded before the arm → shoulder → torso poser pilot. It repairs two reviewed tracking situations from the targeted corpus pass, adds a deliberately hidden arm example, adds one or two depth-sensitive reach examples, and improves reference retrieval so nearby views are penalized gradually rather than treated as either identical or fully conflicting.

## Search rules

Reviewed body/head view families use an ordered five-step ladder: FRONT, FRONT_THREE_QUARTER, PROFILE, BACK_THREE_QUARTER, BACK. Same view has no penalty; one-step neighbors receive a small penalty; farther views receive progressively larger penalties. Unknown/mixed/unreviewed views do not create a fabricated exact camera relationship.

Hidden anatomy remains real evidence. Hidden-hidden is compatible; visible-visible is compared geometrically; hidden-visible is an explicit disagreement; unknown remains insufficient. Hidden controls never contribute fabricated projected coordinates.

## Data boundary

The correction/gap corpus package is separate from the application release. All new/corrected references remain assistant-reviewed with owner acceptance pending unless the owner explicitly accepts them in the UI. The universal skeleton remains 1.2.0.
