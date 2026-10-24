# Known Character Anchor and paired-action implementation plan

First family stays female, similar proportions/scale. The current mixed-sex clip can exercise association/overlap tooling only. It cannot certify standardized female substitution or introduce a male body family. Gate 2B/C Known Character Anchor and role/relationship models remain authoritative.

## Anchor establishment M10

Entry: an owner-accepted FEMALE_STANDARD_V1 package revision with body/skeleton 1.2.0, registered head/face, hair, layered garments/accessories as applicable and tested view/articulation envelopes; accepted rights/test records; explicit source participant. Bind package to that PersonIdentity with reviewed frame references, projection/scale/facing, visible component matches and exclusions. Similar red clothing is insufficient.

Store package/acceptance/source hashes, association reviewer, per-component observations, alignment residuals and uncertainty. Test projected known parts against visible pixels/pose; use them as ownership evidence rather than immutable truth. Competing limb/component hypotheses remain reviewable. Full occlusion can yield UNKNOWN/occluded while retaining person identity; nearest-mask reassignment cannot switch ownership silently. New package or association revisions make dependent anchor applicability stale.

M10 can implement/test the validator and source-binding UI using synthetic/mock packages before U06. A mock/provisional package never satisfies its real-anchor acceptance exit. If no accepted complete female package exists, mark real binding BLOCKED_LATER rather than accepting a candidate by convenience.

## Template extraction M11

Role A and Role B each store independent pose sequence, root x/y/orientation/scale, facing/view, facial performance, component/visibility states, source evidence and native-time mapping. Root coordinates use calibrated body height with declared 2D view assumptions. Original participant identity is a provenance link, not the role's required replacement identity.

Relationship channels:

- Relative root transform/orientation/scale and permissible deviations.
- Body/body and hand/body contact, role-local anatomical or socket anchors, start/end/release timing, uncertainty and tolerances.
- Front/behind and occlusion order per body/component interval, including unresolved order and competing hypotheses.
- Shared props with prop-local sockets, holder changes and evidence.
- Constraints preserving interaction, supported views, articulation/garment envelopes and explicit rejected ranges.

Nearness in 2D is only a contact hypothesis. Extract candidate contacts from landmark proximity/relative velocity/anchor projection and then require review of visible contact, timing and ambiguity. Preserve occluded/unknown events; do not create contact truth solely from bounding-box overlap. Temporal smoothing is a derived channel with raw samples retained. Source native time remains exact; resampling records phase/algorithm and cannot hide a one-frame error.

The relationship order graph is acyclic within each interval; transitions name evidence and exact time boundaries. Known-character shape/appearance can constrain which arm/hair/garment belongs to whom, but reviewed ownership remains Corpus Pane authority. Unassigned masks must not be forced into either role just to close coverage.

## Substitution and acceptance M12

U07 requires controlled paired footage with a fully standardized female anchor and two different compatible standardized female replacement packages. Check family/profile, scale/proportion, required views, role reach/articulation envelopes, head/face kit and garments before binding. Unsupported replacements fail validation with a specific incompatibility; no unrestricted scaling or foreign topology conversion.

Retarget each role's canonical 1.2.0 motion independently through the selected PoserProfile and tested canonical-to-control mapping; no historical v0.4.13 control hierarchy is required. Solve bounded root offsets and limited approved IK adjustments for shared contacts; store adjustments as derived tracks with original motion retained. Recheck pair-relative position/orientation/scale, contacts, body/garment intersection, order transitions, shared prop attachment and facial/component state. Never mutate a package's acceptance/envelope to force a scene to pass.

Test original-reference binding plus replacement assignments in A and B, swapped assignments where supported, size extremes within approved tolerances, contact onset/release and overlap/reappearance. Existing proposed target: contact error≤2% normalized height, timing error≤1 native frame. Use owner labels, not color masks or published scores. Coherent interaction also needs visual/manual approval; passing numeric contact alone is insufficient. A constrained pose correction cannot disguise changed identity ownership or bad layer order.

M11 record/replay and synthetic contact tests can proceed without U07. M12 real replacement acceptance cannot. Tester records exact packages, input hashes, worst contact/timing errors and videos/overlays; auditor verifies independent roles, no male-family expansion, provenance and valid anchor; owner decides asset/template acceptance. No real anchor or replacement acceptance occurred in this preflight.
