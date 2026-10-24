# Corpus Pane 02.2.2 — View Priority & Composite Review Authority Report

**Application:** 0.2.2.2  
**Knowledge:** 1.0.3  
**Date:** 2026-10-23

## Scope

This pass addresses the two issues found in the independent 02.2.1 review: search ranking could prefer a view-conflicting reference merely because it exposed more joints, and a larger saved region could fail to inherit review authority from several smaller current reviews. The pass also makes explicit hidden anatomy count as known coverage and standardizes release packaging.

## View-priority ranking

Checked-reference results now sort in this order:

1. no reviewed view conflict before reviewed view conflict;
2. no reviewed heading conflict before heading conflict;
3. requested-region known coverage;
4. strict query before rough query when coverage is otherwise equal;
5. projection conflict and geometry score.

This means a back-view arm cannot outrank a compatible front-view arm merely because the back-view source exposes more points. A conflicting result is still shown; it is not silently deleted.

## Hidden is known, not geometry

Pose signatures now retain three separate ideas:

- **usable geometry** — coordinates allowed to contribute to vectors/lengths/angles;
- **known hidden evidence** — explicit `occluded` or `out_of_frame` state;
- **unknown/missing** — neither usable geometry nor explicit hidden evidence.

Requested-region coverage uses known evidence. Projected geometry uses usable coordinates only. Thus a checked hidden forearm can make the region knowledge complete without inventing an elbow/wrist position.

## Composite review authority

`authorityForScope()` now aggregates current reviews per joint. A saved whole arm can therefore be supported by separate current reviews of `leftUpperArm`, `leftForearm`, and `leftHand`. References retain deterministic `supportingReviewIds`, `supportByKey`, and `compositeReview` metadata.

Owner authority is only reported when every requested joint has current owner/accepted support. Mixed or assistant-only support remains visibly mixed/pending.

`reviewOwnerAcceptance()` uses the same joint-by-joint rule, so owner acceptance can be composed from smaller exact checks without pretending that an unrelated broader assistant range was directly owner-reviewed.

## Compatibility

The existing five-clip Starter Pass backup restores as five clips, 18 references, six comparisons and 20 reviews. The new deterministic support metadata is added during migration and does not create imported-revision duplicates.

## Not changed

No changes were made to the universal skeleton topology, body/face detector models, canonical still mannequin, Doll Rigger, or source media. This pass does not claim that a retrieved pose is anatomically correct or that artwork pieces are interchangeable.
