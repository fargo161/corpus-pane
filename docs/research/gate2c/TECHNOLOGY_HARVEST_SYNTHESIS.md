# Corpus Pane technology-harvesting synthesis

Use a small combination of replaceable evidence providers and permissive 2D authoring primitives. Keep Corpus Pane's canonical component, evidence, binding, review and acceptance layers original. This is the proposed combination for the owner's next-gate review; no production integration occurred.

## Concrete decisions by function

| Corpus Pane function | What to use and exact useful piece | Reuse action | What Corpus Pane must build | Why alternatives are rejected/deferred |
|---|---|---|---|---|
| Controlled foreground | Existing SpriteKeyer/chroma path and simple foreground support | Retain baseline / ADAPT_IMPLEMENTATION | Native frame provenance, masks and correction UI | Arbitrary-background segmentation is outside this product; RVM adds an unnecessary copyleft/matting path |
| Fast body evidence | Bundled MoveNet fast and existing crop/inference adapter | DIRECT_CODE_REUSE_CANDIDATE, already present | Versioned skeleton1.2 mapping, person selection, visibility and review | Multipass doubles cost without a demonstrated quality improvement here; do not restart a model contest |
| Rich pose evidence | Measured DWPose ONNX affine/BGR/SimCC path; preserve133 raw landmarks | ADAPT_IMPLEMENTATION; optional after ledger closure | Raw-to-canonical mapping and extra landmark channels | Full MMPose/RTMPose stack is unnecessary just to execute the already measured ONNX path; no foreign topology |
| Temporal masks | SAM2.1 tiny video predictor, reviewed add-mask/point corrections and propagation state | ADAPT_IMPLEMENTATION in an optional local worker | Component/person identities, correction events, warnings, ownership and editable output | Cutie is faster and remains a serious alternative, but its exact weight grant is unresolved; flow alone failed; SAM3 stack not justified |
| Semantic components | Human-reviewed labels/prompts with chroma/color/pose hints and selected masks | Hybrid original workflow using SAM evidence | Corpus vocabulary, ambiguity bands, nested garment decisions and ownership | SCHP/See-through parser benefit is unmeasured; dataset/weight/domain limits make them optional research; color alone fails warm skin |
| Multi-frame assets | Body/view-local sample registration and contributor-preserving selection; borrow See-through's RGBA/offset/order separation | ARCHITECTURAL_REFERENCE_ONLY plus original implementation | Correspondence validation, per-region coverage/origin, source atlas, unknown/inferred policy | A single inpainted PSD does not supply temporal source evidence; no mandatory generative completion or pseudo-depth authority |
| Layered garments/hair/accessories | Adapt Stretchy contour/interior sampling and Delaunator kernel; authored construction-aware pieces | ADAPT_IMPLEMENTATION; DIRECT_CODE_REUSE_CANDIDATE for triangulation | Seam constraints, intentional overlap, joints/pivots/sockets, weights and tested view/envelopes | Unconstrained mesh bridges holes/islands; masks are not finished garments; no mannequin substitution |
| Deformation and animation | Rigid parts, reviewed simple skinning and typed keys; optional offline Animated Drawings ARAP | ADAPT_IMPLEMENTATION of small modules | Binding authoring, no-inversion checks, envelope/variant selection and discrete channel rules | ARAP bends can invert; Stretchy's fixed40px weighted-angle heuristic is not a general binding solution; no wholesale editor |
| Rendering/import | Stretchy GPU buffers, alpha/stencil and crop offsets; borrow Spine attachment indirection | ADAPT_IMPLEMENTATION / ARCHITECTURAL_REFERENCE_ONLY | Mask/clip scope, pose-local draw graph, canonical package I/O and unsupported-feature audit | uint16 and naming assumptions need repair; PSD import is not certified PXZ decoding; Spine runtime not selected |
| Five-slot face | Crop-safe head transforms, reviewed landmark similarity fit, explicit per-slot masks and gaze variants | Adapt small fit/render/track primitives | HEAD_IDENTITY/FACE_KIT profiles, anatomical side/gaze, native PXZ mask semantics and swap tests | DWPose can suggest anchors but cannot certify them; foreign face taxonomies do not replace five slots |
| Known Character Anchor | Reviewed package-to-source binding plus constrained appearance/mask/pose association | Original layer informed by temporal systems | Accepted female package identity, visibility projection, competing ownership hypotheses | Color match or a provider track ID is not an accepted known character; current clip lacks binding |
| Paired action substitution | Independent role performances plus local relative/contact/order graph; borrow interaction-mesh/graph concepts | ARCHITECTURAL_REFERENCE_ONLY; original 2D solver | Contacts/timing/props, local occlusion, limited root/IK retargeting and replacement tests | Generic tracking or independent motion retargeting cannot guarantee coherent interaction; 3D physics/RL stack unnecessary |

Resource IDs, exact pins, licenses and dependency boundaries are in [RESOURCE_REUSE_MATRIX.md](RESOURCE_REUSE_MATRIX.md) and its full CSV. Specific source links are beside the findings in the detailed comparison/harvest reports, and in the CSV's primary_source column.

## What the measured weakness changed

Gate 2B's garment flow mean coarse IoU0.240 cannot support an automatic authoring path. The fixture red rule reaches0.716 but is color-specific. Gate 2C's SAM0.877 and Cutie0.862 establish a practical reason to use temporal component models, with human-reviewed semantics. The hair result remains a warning: around0.72 region IoU, skin/face leakage, and no reliable monotonic benefit from reseeding. Therefore choose a review-driven component pipeline, not autonomous acceptance.

Cutie seed0 median56.21ms versus SAM242.29ms is a meaningful local tradeoff, with differing internal resolutions/preprocessing. Choose SAM first because its checkpoint terms are explicit; keep the provider boundary open for a properly cleared Cutie artifact. This is a licensing/resource decision informed by measured quality, not a claim that SAM is universally more accurate.

The source probes also change the reuse decision. Stretchy's sampler and GPU/math pieces are useful; its whole mesher and timeline cannot be taken unchanged. Animated Drawings' MIT ARAP implementation saves solver work, but triangle inversion at90 degrees in the tiny probe prevents treating it as a ready garment engine. Harvest primitives and keep compatibility authority local.

## What gets borrowed, adapted and built

**Borrow as code candidates:** Delaunator5.1.0 with robust-predicates3.0.3; selected verified transform arithmetic; the existing measured pose adapter pieces. Include exact notices and restrictions; none is integrated now.

**Adapt implementations:** SAM worker protocol/corrections, selected Stretchy mesh/render/typed animation/import functions, standalone ARAP setup/solve. The named repairs and missing constraints are part of the plan, not hidden future surprises.

**Borrow concepts:** See-through separated layer/offset/order bookkeeping; Spine attachment indirection and weight-review patterns; interaction-mesh/graph relationship preservation. No trained generative completion, proprietary runtime or foreign canonical skeleton is required.

**Build locally:** Source/evidence records, canonical component tracks, semantic ownership, contributor atlas, construction-aware layered packages, binding/socket/pivot separation, five-slot registration, female package compatibility, Known Character Anchor binding, paired role/contact/order constraints, reviewer authority, dependency registry and acceptance tests.

## Clear first-path exclusions

No production requirement on Cutie weights, SCHP checkpoints, Grounding DINO, SAM3/3.1, See-through generative models, Sapiens, RVM, Spine/Live2D runtimes or an unreviewed FFmpeg binary. Optional providers cannot silently download unresolved dependencies. A manual reviewed-source path remains complete when an accelerator is unavailable. No external system's taxonomy, IDs, skeleton, confidence or generated layer becomes authoritative Corpus Pane data.

## Why the research can hand off

The important selection decisions are now explicit enough for an implementation preflight: bounded providers, exact reusable pieces, required repairs, missing original engineering and a license disposition for every researched resource. More unrelated model surveying is not the next action. The owner can review the proposed stack and prepare the input/license/acceptance conditions for a later authorization. Production, canonical migration, family acceptance, real garment compatibility and final pair replacement remain unapproved and unproved.
