# Corpus Pane 02.2.5 — Acceptance Reliability & Landmark Semantics

## Trigger
External review found that a saved reference could briefly display the first video frame while drawing the requested frame's points, and that two pilot-candidate arm references needed a precise wrist/hand convention.

## Repairs

### Display synchronization
Each pane now tracks `bitmapIndex` and `rawIndex`. Starting a new draw clears stale pixels immediately. The requested frame index is captured before asynchronous media decode, and pixels/overlays are committed only if the render token and requested index are still current. Pointer editing is disabled unless the raw pixels belong to the active frame.

### Arm landmark semantics v1
Shoulder, elbow, wrist, and hand/palm-center definitions are explicit in `docs/LANDMARK_SEMANTICS.json` and shown in the point editor. This keeps anatomical observations separate from later artwork pivots/sockets.

### Source corrections
- `MC10_arms_p02_center`, UI frame 37, left arm: wrist corrected to `(188,68)` and hand/palm center to `(194,56)`; elbow centered at `(170,124)`; shoulder retained at `(148.8,165.2)`.
- `MC10_arms_p03_right`, UI frame 16, left arm: shoulder/elbow retained; wrist and hand are `out_of_frame` with no asserted visible coordinate.

Both repaired review/reference records remain assistant-reviewed and owner acceptance pending.
