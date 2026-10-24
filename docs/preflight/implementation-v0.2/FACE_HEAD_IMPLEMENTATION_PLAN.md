# Head and five-slot face implementation plan

Use the completed Brifern audit and Gate 2B FACE_PACKAGE_AND_REGISTRATION_SPEC as destination. Source PXZ SHA256 `526d2948f4b3907ff0567475f9dd6e722705fedaf4861d5d716ceb7833abc0be`; canvas3264×2448, head source rectangle1120,456,1024×1536, rotation0. Preserve the original archive bytes and source inventory. Its96 entries include 1 base, 22 brows, 62 eyes and 11 lower-face items ; 51 full-canvas / 45 cropped entries and 5 extra WebP mask files require explicit treatment. Existing layers are evidence, not production-certified variants.

## Implementation sequence and ownership

1. M07 imports ZIP/PXZ as a preserved native-source object, records every entry/path/hash/order/group/rect/trim/mask reference, limits archive expansion and never executes content. Derive preview layers without rewriting the source. Inventory unsupported blend/mask/group semantics explicitly.
2. Build head-space registration: sourceRect origin + trimOffset − headOrigin, then reviewed similarity/affine transform with measured structural anchors. Keep source canvas, cropped pixel origin and rendered bounds distinct. Alpha centroid or centered-crop placement is forbidden as a registration shortcut.
3. Author a registration profile: head origin/scale, reviewed brow/eye/lower-face structural anchors, interocular baseline, neck socket, anatomical-side mapping and gaze convention, supported views and masks. Native file labels image-left/right are retained as source labels until owner-reviewed anatomical mapping U03 exists. Mirroring changes a transform, never silently changes biological side.
4. Separate HEAD_IDENTITY structural head/skin/nose from FACE_KIT variants. Exactly five independently addressable slots LEFT_BROW, RIGHT_BROW, LEFT_EYE, RIGHT_EYE, LOWER_FACE. Facial performance timeline selects each slot/variant/gaze separately; slot changes do not move body joints or replace identity.
5. Render RGBA with declared premultiplied-alpha policy, correct color-space handling, per-layer mask transform and deterministic order. Preserve masks as separate planes. Unsupported native PXZ mask semantics show UNSUPPORTED/needs_review; an alpha-only preview cannot be labelled native-equivalent. Obtain a native render reference and compare before certifying mask-aware output.
6. Head attaches through a reviewed neck socket/transform on the selected PoserProfile, distinct from head art pivot and anatomical neck joint. The socket need not match v0.4.13; preserve source-to-new mapping and compatibility evidence. Keep view-specific occlusion at hair, neck and garment collar; separate sockets/profile constraints from pixel trimming.

Borrow trim/offset and transform/compositing concepts from selected MIT implementations; no external facial rig topology is imported. Corpus Pane builds native-source inventory, registration profiles, slot availability, mask semantics, revisions, attachments and swap compatibility. No unverified Pixlr/PXZ specification is invented from a convenient preview.

## Variant availability and gaze

Retain 11 expression families as audited source labels, not automatically uniform kit coverage. U04 remains explicit: frown-forward on both eyes and grimace-left/right on source image-left eye need disposition; missing named items could be intentional. A kit availability table records AVAILABLE, INTENTIONAL_GAP, UNVERIFIED or UNSUPPORTED, with reviewer/evidence. Do not generate replacements and label them OBSERVED. Gaze is defined in a reviewed head-local convention plus optional screen-facing projection; store source label and anatomical interpretation separately.

## Buildable now versus blocked proof

| Build now after implementation authorization | Acceptance requiring input |
|---|---|
| Source ZIP safety/inventory, native bytes/hash preservation, trim-safe positioning UI, anchor authoring, five independent slot state machine | U03 native masks, structural/neck anchors and reviewed side/gaze are necessary for Brifern certification |
| Synthetic masked/cropped layers and same-head independent brow/eye/lower-face animation tests | U04 disposition before claiming complete declared gaze coverage |
| HEAD_IDENTITY/FACE_KIT schema and compatibility validator, explicit failure for unavailable variants, neck attachment prototype | U02 reviewed family/view profile before family membership |
| Brifern candidate registration with visible unsupported semantics and provisional anchors | U05 second compatible head+kit for real independent interchangeability proof |

Proposed target is structural residual≤1% of reviewed interocular distance, measured across declared views/slot combinations. This target remains unmeasured, not weakened. Report identity-fit error separately from expression displacement. Same-head tests cannot establish two-head compatibility.

Second-head acceptance tests freeze body motion hash and compare identityA+kitA, identityB+kitB, and only profile-compatible cross-kit combinations A+kitB/B+kitA. Run independent left/right brows, eye expression/gaze and LOWER_FACE combinations, crop/trim changes, hair/collar occlusion, neck articulation and save/export/reopen. Unsupported cross-profile swaps must reject cleanly, not distort to pass. Tester supplies overlays/worst residuals; auditor checks slot/identity independence; owner accepts the resulting modules.
