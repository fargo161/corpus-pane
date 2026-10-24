# Schema extension plan

Proposed: `corpus-pane/authoring-bundle` 1.0.0 and record schemas 1.0.0, JSON Schema Draft 2020-12. Preserve workspace `sprite-foundry/corpus-verifier` format 1, track `adventure-studio/unified-prep` format 4, portable `sprite-foundry/corpus-package` version 1 and `adventure-studio/universal-skeleton` 1.2.0. No added canonical bones/face slots. New slot symbols map to existing `face.brow.left/right`, `face.eye.left/right`, `face.lower`.

The owner's latest correction protects the100% 2D reusable language and source bytes, not v0.4.13 implementation topology. Versioned PoserProfile/ArtworkRigMapping records let M02P compare adapted/native/hybrid rigs and M09 validate migrated source art. Internal deformation/control hierarchy maps explicitly to universal 1.2.0; no renderer-specific control becomes a new canonical anatomical landmark. Architecture decisions use scoped ReviewEvents, not owner asset-acceptance events.

## Storage and compatibility

Use a new `.cp-authoring.zip` container with `manifest.json`, exact `legacy/original.corpus.zip`, `records/<revisionId>.json`, `blobs/sha256/<hash>` and `notices/`. The distinct format prevents legacy misinterpretation. Legacy-only export is explicit, with a loss inventory; retain the full authoring archive. Do not claim old-app roundtrip of arbitrary extensions without proof. Unsupported required schema major versions fail closed; optional unknown payloads survive as opaque hashed bytes.

Database `corpus-pane-authoring-v1`, version 1, is separate from legacy `sprite-foundry-corpus-lab-v1`. Stores: bundleHeads, recordRevisions, entityHeads, blobs, rawObservations, jobs, reviewEvents, stagedImports, migrations. Insert source/blob/record staging, validate references, then atomically advance the head. Crash recovery ignores uncommitted staging. Read an exported backup rather than mutating the live legacy store.

## Envelope and invariants

Each record has schemaVersion, type, entityId, revisionId, parentRevisionIds[], createdAt (UTC), actorId, payload, derivedFrom[] and extensions. IDs are UUIDv4; hashes are 64 lowercase hex. Hash exact UTF-8 JSON bytes in the external manifest, avoiding a self-hash. Revisions are immutable; head selection is a separate transaction. Cross-record semantic validators check references, units, cycles, acceptance scope and provenance beyond structural validation. Explicit validators check dates/UUID syntax; no coercion.

No implicit defaults for acceptance, side, view, evidence origin, units, source hash or checkpoint. Scores declare scale/provider. Reject NaN/Infinity, duplicate keys, unsafe object keys, traversal paths, oversized nesting and remote schema execution. Preserve unknown optional fields. The following fields are required unless explicitly marked optional:

| Record | Payload contract | Semantic invariant |
|---|---|---|
| SourceAsset | containerSha256, byteLength, MIME, sourceRightsRef, streams, decoderIdentity, originalName | Verify exact bytes; names are labels, not paths |
| RightsRecord | artifactHash, holder, grantEvidenceRefs, allowedUses, redistributionTerms, attribution, restrictions, disposition, reviewer | Separate code/weight/data/art grants; no permission inferred from import |
| CalibrationRecord | personOrBodyRef, familyProfileRef, scaleMeasurements, proportionMeasurements, bindPoseRef, viewProfiles, sourceRefs, uncertainty, reviewerRefs | Member measurements use the approved procedure; no automatic family acceptance |
| BodyPackage | skeletonRef, calibrationRef, bodySurfaceRefs, anatomyBindingRefs, bindPoseRef, viewProfiles, jointConstraints, rightsRefs, testRefs, poserProfileRef, artworkRigMappingRefs | Canonical1.2.0 motion language independent of selected art-rig topology and head/clothing modules |
| PoserProfile | strategy, canonicalSkeletonRef, internalControlSchema, partHierarchy, bindingRules, deformationPolicy, drawOrderPolicy, moduleInterfaces, resourceProfile, comparisonTestRefs, selectionDecisionRef | M02P candidate/selected 2D architecture; internal controls may differ, canonical 1.2.0 semantics cannot |
| ArtworkRigMapping | sourceRigHash, sourceArtworkHashes, sourceRegionMappings, derivedPartRefs, transformRefs, anatomicalBindingRefs, artworkPivotRefs, attachmentSocketRefs, unsupportedFields, coverageLossReportRef | Original art/rig immutable as sources; derived splits/hierarchy/pivots/sockets need not match old topology |
| FrameObservation | frameRef, blobRefs, transforms, source/view metadata | Pixel hash/native time identify one source frame |
| PersonIdentity | sourceContextId, label, associationRevisionRefs, status | Cross-source identity requires review |
| ComponentIdentity | personEntityId, semanticClass, regionCodes, optional parentComponentId, associationRefs | Layered body/garment coverage permitted; ownership explicit |
| RawProviderObservation | providerRunRef, frameRefs, rawTopologyOrLabels, rawBlobRefs, confidenceDefinition, warnings | Raw immutable; provider cannot supply canonical acceptance |
| EvidenceMapping | rawObservationRefs, mappingVersion, skeletonId/version, landmarkMap, side/view assumptions, residuals | Map to 1.2.0 only; extras remain evidence |
| ComponentTrack | componentEntityId, personEntityId, ordered observationRefs, visibility intervals, providerAssociationRefs, corrections, ownershipHypotheses | Rational PTS order; absent/occluded/out-of-frame/unknown distinct |
| SpatialEvidence | width, height, referenceObservationRef, coverageBlob, originBlob, contributorIndexBlob, contributorTableRef, uncertaintyBlob | Dimensions agree; per-state source proofs resolve |
| ContributorTable | referenceObservationRef, coordinateDomain, sets | Set0 empty; source/process/visibility refs resolve and nonempty weights normalize |
| DerivationProcess | kind, implementationIdentity, configuration, inputRefs, outputRefs, actorId, modelIdentity, warnings | Named algorithm/model/manual invention; checkpoint null when inapplicable |
| CanonicalSurface | componentId, viewProfileRef, calibrationRef, coordinateDomain, rgbaBlob, spatialEvidenceRef, registrationRefs, conflictMaskRef | No mixing incompatible views/bind poses; resampling retains lineage |
| Registration | from/to spaces, transformType, matrix or warpBlob, anchors, weights, residuals, excludedRegions | Reject singular/unsupported warp; residual units explicit |
| AnatomicalBinding | skeleton1.2 reference, canonical joint/bone IDs, local bind transforms, regionCodes | No provider topology migration |
| ArtworkPivot | surfaceOrPartRef, localXY, coordinateDomain, rationale/sourceRefs | Separate from anatomical joint |
| AttachmentSocket | hostPartRef, name, local3x3, semanticRole, compatibleAttachmentTypes | Separate from pivot; acyclic parent graph/invertible transform |
| Mesh | restXYBlob, uvBlob, triangleIndexBlob, constrainedRings, islandIds, seamEdges, topologyRevision, skinWeights | No cross-island/void/seam bridging; valid indices/winding/areas |
| LayeredAssetPackage | hostFamilyProfileRef, kind, subparts, viewVariants, orderGraphs, overlapZones, seamConstraints, envelopes, sourceRefs, testRefs, poserProfileRef | Explicit selected-profile/surface/pivot/socket/anatomy links; overlap preserved |
| HeadIdentity | headSurfaceRef, structuralLayers, structuralAnchors, neckSocketRef, headSpace, viewVariants | Identity structure separate from performance |
| FaceKit | registrationProfileRef, compatibleHeadProfiles, slots, maskSemantics, sourceInventoryRef | Exactly five slots; missing variants explicit |
| FamilyProfile | proposedFamilyId, skeletonRef, calibrationProcedure, tolerances, bindPose, requiredViews, moduleRequirements | Proposed until owner decision; never invent accepted tolerances |
| CharacterPackage | familyProfileRef, bodyRef, headRef, faceKitRef, hairRefs, garmentRefs, accessoryRefs, compositionOrder, envelopes, rightsRefs, testRefs | Exact module revisions; acceptance external, never constructor default |
| AnchorBinding | characterPackageRef, sourcePersonRef, sourceFrameRefs, projectionRefs, applicableViews, acceptanceRefs, exclusions | Complete accepted female package and reviewed participant association |
| RolePerformance | role A/B, timeDomain, poseTrackRef, rootTrack, facingTrack, facePerformanceRef, componentStateTracks | Body motion independent of original identities |
| PairedActionTemplate | roleARef, roleBRef, relationshipChannels, familyRequirements, propRefs, envelopeRefs, testRefs | Independent roles and common rational time |
| RelationshipChannel | kind, intervals, local anchors/role parts, transforms/values, uncertainty, tolerances, evidenceRefs | Touching/proposed/released/unknown distinct; per-interval order acyclic |
| ReviewEvent | targetRevisionRefs, scope, decision, actor, evidence/testRefs, previousEventRef | Model completion cannot accept; edits make affected decisions stale |
| CompatibilityTestRun | testSpecRevision, appCommit, inputRevisionRefs, dependencyLockHash, metrics, visualEvidenceRefs, reviewer, status | Exact revision/envelope scope; raw and corrected quality separate |
| JobRecord | requestHash, jobId, state, eventSequence, resultManifestRef, baseRevisionRefs | State machine plus stale-import CAS; provider cannot update heads |
| MigrationRecord | sourceManifestHash, adapterVersion, mapping, outputManifestHash, warnings, rollbackRef | Original bytes retained; deterministic mappings and loss inventory |

[CORE_RECORD_SCHEMAS.json](proposals/CORE_RECORD_SCHEMAS.json) formalizes envelope, frame and spatial fields. [RECORD_FIELD_CONTRACTS.json](proposals/RECORD_FIELD_CONTRACTS.json) enumerates required fields for every record. These are design artifacts, not shipped validators. M01 must finish every type-specific schema and cross-record validator before downstream persistence. Preflight structural checks do not establish application correctness.

Referenced profile types are explicit: member calibration is CalibrationRecord; bodyRef resolves BodyPackage; processRef resolves DerivationProcess; sourceRightsRef resolves RightsRecord; contributorTableRef resolves ContributorTable. View profiles are named/revision-scoped definitions embedded in family/body calibration; face registration profiles specialize Registration with reviewed head-space anchors, slot constraints and mask semantics. Cross-record validators check target types, not just UUID shape.

PoserProfile is implementation-neutral and does not require a v0.4.13 topology or renderer. ArtworkRigMapping.sourceRigHash describes an optional source rig and is explicitly null for artwork without one; it is not a required production-host reference. The common v0.4.13 comparison specimen cites its preserved source hash while candidate output profiles/hierarchies remain distinct. BodyPackage/LayeredAssetPackage link exact selected profiles so a profile change invalidates affected compatibility, not source identity.

Imported ReviewEvents retain their original issuer/status as historical assertions. A JSON actorId containing the word owner is not authority: trusted local actor roles and explicit review commands govern new acceptance. Foreign/unrecognized issuer claims need owner association/review before applicability. Providers cannot impersonate owner events. Authority metadata and origin remain intact across import.

## Native frames and transforms

`FrameRef={sourceSha256,streamIndex,decodeIndex,ptsTicks:string,timeBaseNum:int,timeBaseDen:int,pixelSha256,width:int,height:int,decoderIdentity}`. Time-base numerator/denominator are positive. Signed PTS strings allow negative starts. decodeIndex is the zero-based displayed-frame inventory index under the declared decoder, not guessed fps; keep packet/decode-order metadata separately if available. Rational time is `ptsTicks*timeBaseNum/timeBaseDen`. Duplicate PTS retains distinct index/pixel hash. Record whether orientation metadata was applied and retain original/display transform.

Matrices are row-major 3x3 with column points `[x,y,1]`, composition `T_parent*T_local`; declare fromSpace/toSpace, units, mirror flag and inverse check tolerance 1e-8. Nonlinear warps declare grid/domain/interpolation. Map resized provider pixels through the exact inverse preprocessing, never viewport zoom. Every mask names its coordinate space.

## Spatial contributor encoding

RGBA uses PNG/declared lossless planes. `coverage` is u8 valid support independent of texture alpha. `origin` is u8 categorical 0 UNKNOWN / 1 OBSERVED / 2 RECOVERED / 3 INFERRED. `contributorIndex` is little-endian u32 `[width*height]`, indexing deduplicated contributor sets; 0 is empty. Entries contain source frame/observation, sourceXY or warp, visibility evidence, normalized weight, processRef if inferred and explicit state. Arrays declare byte length, shape, dtype, endian and hash.

UNKNOWN has no resolved content assertion. OBSERVED has visible texture only from referenceObservation. RECOVERED includes visible texture from a specific other observation with no inferred contributor. INFERRED requires named process/actor and inputs. Blends retain all contributors; summary conservatively prioritizes INFERRED, then RECOVERED, then OBSERVED. Unresolved support stays UNKNOWN. Segmentation cannot make occluded pixels directly visible. Erasing changes coverage and records correction, not source history. Texture transparency, visibility, alpha uncertainty and evidence origin are separate.

## Vocabulary and timeline

Corpus Pane classes: BODY_SKIN, HAIR, GARMENT with construction subparts, FOOTWEAR, ACCESSORY, UNASSIGNED. Region codes describe anatomical coverage without importing parser taxonomy; DRESS can cover torso/pelvis/legs. Ownership is a person/component hypothesis with reviewed resolution. Body behind clothing stays UNKNOWN unless recovered or explicitly inferred.

Roles use native rational time and a separate mapping to template origin. Resampling creates a derived track with source samples/configuration. Contacts store interval endpoint inclusivity, participating anatomical anchors or garment/prop sockets, offsets, tolerances and evidence. Root x/y uses calibrated normalized body-height units, orientation has declared view/facing convention; no hidden 3D-depth claim. Retargeting is bounded by family compatibility, not arbitrary-body scaling.

Migration is explicit and tested; original review states and skeleton bytes survive. Unsupported formats cannot be downgraded by silent record deletion. See [MIGRATION_AND_ROLLBACK_PLAN.md](MIGRATION_AND_ROLLBACK_PLAN.md).
