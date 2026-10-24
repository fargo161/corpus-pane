# Resource reuse matrix

Each row identifies a specific resource or artifact boundary. These are Gate 2C research dispositions, not owner authorization to integrate or promotion of owner-pending assets. APPROVED_FOR_INTEGRATION means the named kernel's assessed eligibility; actual integration still requires the next gate. APPROVED_WITH_CONDITIONS requires the stated notice/artifact conditions. RESEARCH_ONLY, REJECT and UNRESOLVED resources are excluded from mandatory production dependencies.

Reuse classifications describe the proposed engineering action independently of licensing. A direct-code candidate can remain research-only or unresolved until its artifact conditions are satisfied. The full machine-readable [CSV](RESOURCE_REUSE_MATRIX.csv) separately records code, weights, training/pretraining, dataset images/annotations, transitive dependencies, commercial use, redistribution, evidence, local engineering and rejection conditions.

| ID | Function / resource | Reuse classification | Resource disposition | Exact useful piece / decision |
|---|---|---|---|---|
| R01 | Foreground: Existing SpriteKeyer/simple chroma | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | Controlled-background support masks — Retain first path |
| R02 | Pose: Bundled MoveNet fast | DIRECT_CODE_REUSE_CANDIDATE | APPROVED_WITH_CONDITIONS | 17-point interactive pose evidence — Fast default proposal |
| R03 | Pose: MoveNet multipass | RESEARCH_ONLY | RESEARCH_ONLY | Explicit retry/crop evidence — Optional explicit retry |
| R04 | Pose: DWPose preprocessing/decode | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | Affine crop, BGR normalization, SimCC decode — Optional richer adapter |
| R05 | Pose: DWPose dw-ll_ucoco_384 ONNX | DIRECT_CODE_REUSE_CANDIDATE | RESEARCH_ONLY | 133-point body/hand/foot/face evidence — Optional after production ledger closure |
| R06 | Pose: RTMPose/MMPose | ARCHITECTURAL_REFERENCE_ONLY | APPROVED_WITH_CONDITIONS | SimCC and deployment adapter patterns — Reference; no third mandatory pose runtime |
| R07 | Temporal masks: SAM2.1 code | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | Mask/point corrections, state, propagation API — Preferred optional mask worker |
| R08 | Temporal masks: SAM2.1 Hiera tiny checkpoint | DIRECT_CODE_REUSE_CANDIDATE | APPROVED_WITH_CONDITIONS | Learned temporal masks — Optional preferred accelerator |
| R09 | Temporal masks: Cutie inference core | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | Object memory, stable-vs-temporary IDs, mask propagation — Learn memory concepts; optional alternative later |
| R10 | Temporal masks: Cutie base-mega checkpoint | DIRECT_CODE_REUSE_CANDIDATE | UNRESOLVED | Faster learned temporal mask evidence — Research-only alternative; excluded from required stack |
| R11 | Interactive masks: Cutie GUI/RITM checkpoint | ARCHITECTURAL_REFERENCE_ONLY | RESEARCH_ONLY | Permanent-memory GUI interaction concepts — Exclude initial dependency; learn correction ergonomics |
| R12 | Prompted temporal masks: SAM3/3.1 | ARCHITECTURAL_REFERENCE_ONLY | RESEARCH_ONLY | Text/exemplar prompts; separated detector/tracker; shared memory concept — Defer |
| R13 | Semantic parsing: SCHP code | ARCHITECTURAL_REFERENCE_ONLY | APPROVED_WITH_CONDITIONS | LIP/ATR logits, crop inverse, provider-label mapping — Concept/reference only initially |
| R14 | Semantic parsing: SCHP LIP/ATR/Pascal trained parsers | RESEARCH_ONLY | UNRESOLVED | Skin/hair/clothing proposals — No mandatory parser |
| R15 | Semantic prompting: Grounded-SAM2 + Grounding DINO tiny | ARCHITECTURAL_REFERENCE_ONLY | RESEARCH_ONLY | Text boxes to SAM prompts — Optional future seed suggestion |
| R16 | Layer reconstruction: See-through code | ARCHITECTURAL_REFERENCE_ONLY | APPROVED_WITH_CONDITIONS | Crop rectangles, separate RGBA/depth, local split/order/export concepts — Layered reconstruction reference; no generative default |
| R17 | Hidden completion: See-through LayerDiff3D | RESEARCH_ONLY | RESEARCH_ONLY | Transparent layer generation — Optional later inferred completion only |
| R18 | Depth/order hints: See-through Marigold | RESEARCH_ONLY | RESEARCH_ONLY | Layer pseudo-depth hints — Defer depth model |
| R19 | Semantic parsing: See-through SAM-HQ body parser | RESEARCH_ONLY | RESEARCH_ONLY | 19-class anime parsing — Possible targeted future parser trial |
| R20 | Poser mesh: Stretchy mesh sampling | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | contour.js/sample.js/generate.js worker-friendly rest mesh/UVs — Adapt sampling/generation |
| R21 | Poser transforms: Stretchy transform primitives | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | Matrix arithmetic and parent-local-pivot composition — Reuse verified small math; adapt hierarchy |
| R22 | Rendering and face: Stretchy buffers/alpha/stencil | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | partRenderer.js,scenePass.js,mesh shaders — Adapt renderer primitives |
| R23 | Poser deformation: Stretchy weights/warp authoring | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | CanvasViewport weights; SkeletonOverlay weighted-angle rotation; shape/lattice channels — Adapt control/authoring ideas |
| R24 | Animation: Stretchy timeline | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | animationEngine.js numeric easing, mesh overrides, sorted keys — Adapt typed channels |
| R25 | Import/export: Stretchy PSD/project I-O | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | psd.js crop offsets; projectFile.js weights/rest serialization — Adapt layer offsets; borrow archive separation |
| R26 | External export: Stretchy Spine/Live2D exporters | REJECT | REJECT | Coordinate conversion/export concepts only — Reject initial canonical dependency |
| R27 | Offline deformation: Animated Drawings ARAP | ADAPT_IMPLEMENTATION | APPROVED_WITH_CONDITIONS | animated_drawings/model/arap.py two-stage sparse solve/barycentric pins — Optional offline authoring solver |
| R28 | Mesh association: Animated Drawings full application/mesh | ARCHITECTURAL_REFERENCE_ONLY | RESEARCH_ONLY | Geodesic silhouette association and depth-grouped triangles — Concept only; no app adoption |
| R29 | Modularity and authoring: Spine concepts | ARCHITECTURAL_REFERENCE_ONLY | APPROVED_WITH_CONDITIONS | Slot/attachment/skin indirection, weights, linked mesh, order keys — Borrow concepts |
| R30 | Runtime: Spine runtimes | REJECT | REJECT | Possible licensed external consumer — Excluded default stack |
| R31 | Triangulation: Delaunator + robust-predicates | DIRECT_CODE_REUSE_CANDIDATE | APPROVED_FOR_INTEGRATION | Unconstrained Delaunay kernel — Use kernel; not whole mesher |
| R32 | Layer format import: ag-psd | DIRECT_CODE_REUSE_CANDIDATE | APPROVED_WITH_CONDITIONS | PSD parsing with raster offsets/masks/groups — Optional future PSD import; not PXZ parser |
| R33 | Registration and masks: OpenCV | DIRECT_CODE_REUSE_CANDIDATE | APPROVED_WITH_CONDITIONS | Chroma, morphology, flow diagnostics, affine fit APIs — Optional worker utility |
| R34 | Pose execution: ONNX Runtime | DIRECT_CODE_REUSE_CANDIDATE | APPROVED_WITH_CONDITIONS | Portable local pose inference — Optional local CPU worker |
| R35 | Temporal execution: PyTorch CUDA / torchvision | DIRECT_CODE_REUSE_CANDIDATE | APPROVED_WITH_CONDITIONS | Shared isolated CUDA model inference — Optional local heavy worker |
| R36 | Numerical utilities: NumPy/Pillow/psutil/SciPy | DIRECT_CODE_REUSE_CANDIDATE | APPROVED_WITH_CONDITIONS | Arrays/images/resource sampling/sparse solves — Selected narrow worker utilities |
| R37 | Video decoding: Installed FFmpeg/ffprobe | ARCHITECTURAL_REFERENCE_ONLY | UNRESOLVED | Native PTS/probe and decode diagnostics — Local research tool; production decoder choice open |
| R38 | Paired retargeting: Interaction mesh paper | ARCHITECTURAL_REFERENCE_ONLY | RESEARCH_ONLY | Preserve local inter-character spatial relationships — Borrow relationship-preservation concept |
| R39 | Paired constraints: Interaction graph paper | ARCHITECTURAL_REFERENCE_ONLY | RESEARCH_ONLY | Separate pair-landmark constraints from solo performance — Borrow graph concept |
| R40 | Human parsing: Sapiens v1 | REJECT | REJECT | Dense human-centric segmentation reference — Exclude initial production path |
| R41 | Human parsing: Sapiens2 | ARCHITECTURAL_REFERENCE_ONLY | RESEARCH_ONLY | Current alternative human-centric architecture — Defer |
| R42 | Matting: Robust Video Matting | REJECT | REJECT | Fine alpha estimation for difficult source edges — Exclude mandatory first path |
| R43 | Source material: Owner pack, PXZ, rig and inherited corpus | ARCHITECTURAL_REFERENCE_ONLY | APPROVED_WITH_CONDITIONS | Private controlled fixtures and authoring specimens — Authoritative private research inputs |
| R44 | 2D deformation: ARAP edge-based formulation paper | ARCHITECTURAL_REFERENCE_ONLY | RESEARCH_ONLY | Edge-based deformation with arbitrary barycentric handles and two-stage solve — Algorithm reference for offline solver |

## Evidence strength and competition

Only MoveNet/DWPose/keyer/flow/color are inherited executed provider measurements. Gate 2C executes SAM/Cutie, selected Stretchy modules and one ARAP module. Parser/reconstruction/face/paired-paper entries are explicitly source/license/architectural research. No public benchmark is substituted for a local measurement.

SAM is preferred over Cutie initially because its weights have an explicit Apache grant; Cutie is faster locally but its exact checkpoint grant is unresolved. Prompted review is chosen over mandatory SCHP/See-through/Sapiens parsing because semantic correction benefit and artifact fit remain unmeasured. Stretchy primitives and standalone ARAP beat wholesale foreign editor/runtime adoption because they preserve Corpus Pane's own contract and permit bounded repairs. Spine runtime, RVM and generative completion are unnecessary first-path dependencies for this scope. These choices do not certify the proposed family or any garment/pair asset.
