# Poser implementation detail

Destination contract: the reusable layered-garment/component language from Gate2B/C, as corrected by the latest owner instruction. The project stays100% 2D. Original v0.4.13 and the 16 recovered PNGs are preserved historical/reference artwork and an anatomical/visual migration/test specimen; their hierarchy, parenting, pivots, sockets, renderer and deformation are not immutable production requirements. The final poser may substantially redesign or replace the old rig. U01 remains closed for planning; comparison and real production compatibility are NOT_RUN.

Before production poser development, M02P measures three options: retain/adapt, Corpus Pane-native, hybrid. [POSER_ARCHITECTURE_SELECTION.md](POSER_ARCHITECTURE_SELECTION.md) defines bounds, common tests,11 criteria, hard gates, scoring, independent evidence and selection/revalidation. No architecture wins through this preflight. Later v0.5 rig artifacts are still unapproved source inputs; this does not restrict independent new design.

## Exact harvesting decisions

| Upstream piece | Treatment | Corpus Pane additions / exclusions |
|---|---|---|
| Stretchy `src/mesh/contour.js`, `sample.js`, `generate.js`, `delaunay.js`, worker boundary at commit24a83a27ba43e43e9d2e3de5e33994594e6199c2 | ADAPT_IMPLEMENTATION, MIT attribution retained | Alpha contours, boundary/interior sampling, UV generation and worker dispatch. Replace fixed2px dilation with profile-scaled settings. Preserve multiple islands/holes and constrain seams; current unconstrained output failed synthetic void cases |
| Delaunator5.1.0 / robust-predicates3.0.3 | DIRECT_CODE_REUSE_CANDIDATE under ISC / Unlicense | Kernel on one valid region at a time; not a constrained mesher. Verify every triangle/edge against region/holes and seam constraints. Reject invalid mesh rather than pretending centroid filtering is sufficient |
| Stretchy parent/local matrices, pivot math, draw_order and numeric timeline/mesh keyframe concepts | ADAPT_IMPLEMENTATION | Explicit matrix conventions, cycle/singularity errors, typed discrete channels, per-view/interval order DAG and interpolation tests |
| Stretchy skin-weight painting/near-joint support idea | ADAPT_IMPLEMENTATION | Own normalized LBS, scale-invariant units, reviewed anatomical bindings. Do not copy angle-times-weight rotation as LBS or fixed40px heuristics |
| Animated Drawings `animated_drawings/model/arap.py` at b859684857519c7424da51a0b0862fbd1fd258f4 | ADAPT_IMPLEMENTATION, optional MIT offline solver | Two-stage sparse pin/barycentric solve; controlled NumPy scalar/bool compatibility patch, boundary/pin/degeneracy checks, conditioning, inversion and envelope rejection |
| Animated Drawings geodesic association and joint draw-order reasoning | ARCHITECTURAL_REFERENCE_ONLY | Own bindings and ordered subparts; no largest-contour-only mesher, foreign skeleton or bundled detector/training stack |
| Spine slot/attachment/skin/draw-order/deform concepts | ARCHITECTURAL_REFERENCE_ONLY | Own records and renderer; no proprietary runtime/code/art reuse |

File hashes and upstream license identities are in the dependency proposal. Adaptations go in provenance-tracked vendor adapters with patch log, not unlabelled wholesale copying.

## Geometry and mesh contract

Use surface-local rest XY in declared pixel units, normalized UV, explicit vertex IDs/topology revision, CCW rest triangles in the declared coordinate convention, constrained rings (outer/hole), island IDs, seam edges and skin weights. Source y-down versus signed-area convention must be tested, not guessed. Every island is a separate connected mesh unless an author explicitly draws a legitimate connecting panel. Holes include collar/arm openings; invisible alpha and missing texture are not automatically geometric holes.

Native/hybrid candidate starting point, subject to M02P selection: rigid parts always supported; for deformable simple polygons without holes, boundary-preserving ear clipping plus verified interior refinement is Corpus Pane-owned. Delaunator can propose interior topology, but accept only if edges stay inside the polygon, no constrained edge crosses, all required boundary segments exist, triangles have consistent winding/nonzero area and area coverage matches. For holes, author-approved bridges/constrained polygon decomposition or separate panels are required before triangulation; unresolved topology falls back to rigid/panel authoring. Do not add a new triangulation dependency through the back door. M06 independently tests donut, two-island, thin strap, touching contour, concavity, narrow seam and zero-area cases. Automatic hole-aware mesh support cannot be claimed until those pass.

Stretchy's synthetic two-island probe had28 triangle centroids deep in the gap; its hole probe had17 deep in the void. A new centroid-only filter cannot prove no crossing edges. Reject topologically invalid results, keep the source texture and explain the failed constraint in the editor.

Indices use Uint16 only below65536 vertices; larger meshes require explicitly supported Uint32/WebGL2 paths or subdivision/rejection. No silent truncation. Default authoring cap4096 vertices/part and65535 vertices/package is a proposed resource budget; narrow/adjust only with documented quality impact. Every UV/vertex edit invalidates dependent weights, shape keys/bakes and compatibility freshness unless explicitly remapped/tested.

## Layering, seams, overlap

Each garment/hair/accessory subpart has surface, rigid/deformable behavior, anatomical bindings, separate pivot/socket references, view envelope, and order constraints. Intentional overlap polygons specify paired parts, covered joint/seam region, minimum coverage in normalized units and applicable poses/views. Keep hidden seam material as RECOVERED/INFERRED/UNKNOWN according to origin. Do not trim overlap to improve segmentation IoU. A source silhouette and complete reusable panel can have different coverage.

Order is a DAG per view/temporal interval; explicitly represent behind-body, between body regions and front-of-body relations. Crossing forearms/garment flaps can require reviewed order variants. Reject cycles or require author split/review; arbitrary numeric z sorting cannot resolve contradictory anatomy. Render with explicit alpha convention and part-specific clip IDs. Mask/stencil must not accidentally share an image-left/right name across swapped heads.

## Skinning, pivots and variants

Rigid local transform uses `T(position+pivot)*R*S*T(-pivot)` under parent transform. Singular transforms are errors, not identity fallback. Bind matrices distinguish anatomical rest transforms from art offsets. The proposed LBS candidate uses normalized nonnegative bone weights summing1 within1e-6, max4 influences (initial authoring defaults2), `sum(w_i * currentBone_i * inverseBind_i * vertex)`. Zero-weight vertices fail validation or are explicitly rigid-bound. No joint movement is inferred from trimmed image bounds.

Shape keys hold deltas indexed by the same topology revision with bounded weights and mutually compatible view/pose conditions. Discrete variants/order changes use step interpolation; never blend boolean attachments into0.5. Shape-key authoring cannot overwrite raw source or conceal inferred coverage. Prefer a pose/view-specific variant when silhouettes, folds or layer order change beyond a stable warp; restrict the envelope when evidence is absent.

Optional ARAP computes offline deformation from pins, then bakes vertex deltas/frames with residuals. No live solver dependency for ordinary playback. Gate 2C synthetic solver inverted1 triangle at90/120° and3 at150° despite good pin residuals; residual alone is insufficient. Check signed triangle areas against rest orientation, near-zero area, excessive stretch/shear, seam gaps and order before accepting a bake. Default refuses inversions; no automatic smoothing that hides a failure. Large articulation uses new variants, split panels or a narrower reviewed envelope.

## M09 selected-poser validation and reference-art migration

Reference rig SHA256 `488f9ce9f415ee57c43fc120030533b3e9f32be31f4f3a0b6aae36c62463a7cd`,20 layers/4 embedded/16 external, canvas2200×3010, is frozen source material. Approved external identities are in RECOVERED_ARTWORK_VERIFICATION.json. Keep original files/render evidence recoverable. Missing/corrupt reference bytes block the affected preservation/migration test, not unrelated architecture work. Do not invent substitute source evidence.

M02P first selects provisionally from measured A/B/C prototypes. M06 implements the selected 2D rig profile; M09 validates it using actual M04/M05 tracked/canonicalized surfaces, layered garments and mappings from the recovered artwork. Preserve original part names, pixel origins and hierarchy as source metadata; derived production parts may split/merge/reparent, introduce new pivots/sockets/weights/meshes, or use a new renderer. Every derivative cites source hashes, crop/warp/split/merge transforms, anatomical bindings and evidence origin for hidden extensions. Source loss is prohibited; topology change is permitted.

Keep a historical neutral-render reference where reproducible; new production rendering need not be pixel-identical to that renderer. Judge reviewed anatomical/visual anchors, coverage, modularity and declared intended corrections. Legacy-only rendering fidelity is a separate adapter claim, not a veto on a better design.

Run all 25 anatomical targets: shoulder[-20,-10,0,10,20] × elbow[-30,-15,0,15,30], normalized body height1024, through each candidate's tested canonical-to-rig mapping. Preserve proposed seam/alignment≤2px, no inversions, intentional joint coverage and reviewed order. Save worst-case overlays and complete pose metrics. Revalidate the M02P stress/mapping/module/performance tests, preserving body motion under swaps. A sleeve result cannot certify all hip/skirt/hair envelopes; record additional supported/rejected ranges and independent tests.

Tester measures against exact code/art/profile/mapping/test revisions; Auditor checks canonical mapping, joint/pivot/socket separation, maintainability and provenance; Licensing Steward confirms derivative/reused-code rights. Director ratifies or reopens the architecture decision using those results within authorized scope. Owner alone accepts family/assets/release. If M09 refutes M02P's provisional choice, revisit eligible alternatives with bounded change control; do not automatically reinstate the historical rig.

A changed or replaced v0.4.13 topology is not an acceptance failure. Broken source preservation, canonical mapping, modularity, layering/coverage or required quality targets is. No comparison, prototype or compatibility pilot has been executed in this amended preflight.
