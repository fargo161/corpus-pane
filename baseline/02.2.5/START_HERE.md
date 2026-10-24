# Corpus Pane — Checkpoint 02.2.5

**Application:** 0.2.2.5  
**Knowledge:** 1.0.5  
**Shared skeleton:** `adventure-studio/universal-skeleton` 1.2.0  
**Status:** acceptance-reliability / landmark-semantics repair candidate; owner acceptance pending

## What changed

This is the final pre-pilot reliability pass requested after visual review of the acceptance checklist. It does not add a new skeleton or change the detector.

1. **Frame and overlay are synchronized.** Corpus Pane no longer keeps the previous bitmap visible while a new frame is still decoding. A frame is drawn only when the image, raw pixels, and overlay all belong to the same source index.
2. **Arm landmarks now have an explicit placement convention.** Shoulder = anatomical rotation center inside the torso contour; elbow = hinge center; wrist = narrow forearm/hand transition; hand = palm/metacarpal center, not fingertip or outer fist tip. The rule appears in the point editor.
3. **MC10 p02 frame 37 repaired.** The left overhead arm now uses the wrist joint and palm center instead of off-arm points.
4. **MC10 p03 frame 16 inspected and repaired.** The visible shoulder and elbow are retained, while the wrist and hand are recorded as outside the image. No distal coordinate is invented.
5. All repaired construction candidates remain **assistant-reviewed · owner acceptance pending**.

## Continue from the repaired corpus

Import `starter/Arm_Shoulder_Torso_Acceptance_Reliability_02_2_5.corpus.zip`. It contains the same 13 source clips and 39 reusable references, with the two acceptance-list repairs above.

## Important semantic rule

Skeleton points describe anatomy, not artwork edges. Future poser pivots/sockets may refer to these anatomical joints but are separate records. See `docs/LANDMARK_SEMANTICS.json`.

## Next step

After external review, shortlist and owner-accept the small set of references used for Arm → Shoulder → Torso Poser Pilot 01.
