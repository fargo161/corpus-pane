import { RECORD_TYPES, RECORD_SCHEMAS, DEFINITIONS } from './contracts.mjs';
import { ContractError } from './safety.mjs';
// Complete descriptor inventory. Paths refer to payload fields; wildcard means
// array item or keyed-map value. Internal IDs are explicitly classified below.
const ALL = RECORD_TYPES;
const R = (...types) => ({ kind: 'REVISION', types: types.length ? types : ALL });
const E = (...types) => ({ kind: 'ENTITY', types });
const I = { kind: 'INTERNAL' };
const tests = R('CompatibilityTestRun'), reviews = R('ReviewEvent'), surfaces = R('CanonicalSurface'), anatomy = R('AnatomicalBinding'), motion = R('MotionTrack');
const variants = { 'viewVariants.*.surfaceRefs.*': surfaces, 'viewVariants.*.bindingRefs.*': anatomy };
const envelopes = { 'envelopes.*.id': I, 'envelopes.*.testRefs.*': tests };
const order = prefix => ({ [`${prefix}.*.edges.*.behind`]: I, [`${prefix}.*.edges.*.inFront`]: I });
export const REFERENCE_DESCRIPTORS = {
  SourceAsset: { sourceRightsRef: R('RightsRecord') },
  FrameObservation: {},
  PersonIdentity: { sourceContextId: I, 'associationRevisionRefs.*': reviews },
  ComponentIdentity: { personEntityId: E('PersonIdentity'), parentComponentId: E('ComponentIdentity'), 'associationRefs.*': reviews },
  RawProviderObservation: { providerRunRef: R('JobRecord') },
  EvidenceMapping: { 'rawObservationRefs.*': R('RawProviderObservation') },
  ComponentTrack: { componentEntityId: E('ComponentIdentity'), personEntityId: E('PersonIdentity'), 'observationRefs.*': R('FrameObservation'), 'visibilityIntervals.*.evidenceRefs.*': R(), 'providerAssociationRefs.*': R('RawProviderObservation', 'ReviewEvent'), 'corrections.*.observationRef': R('FrameObservation'), 'corrections.*.previousRevisionRef': R(), 'corrections.*.correctedRevisionRef': R(), 'ownershipHypotheses.*.personEntityId': E('PersonIdentity'), 'ownershipHypotheses.*.evidenceRefs.*': R() },
  SpatialEvidence: { referenceObservationRef: R('FrameObservation'), contributorTableRef: R('ContributorTable') },
  ContributorTable: { referenceObservationRef: R('FrameObservation'), 'sets.*.*.observationRef': R('FrameObservation'), 'sets.*.*.registrationRef': R('Registration'), 'sets.*.*.visibilityEvidenceRef': R('FrameObservation', 'ReviewEvent'), 'sets.*.*.processRef': R('DerivationProcess') },
  DerivationProcess: { 'inputRefs.*': R(), 'outputRefs.*': R(), 'modelIdentity.licenseRef': R('RightsRecord') },
  CanonicalSurface: { componentId: E('ComponentIdentity'), viewProfileRef: R('CalibrationRecord', 'FamilyProfile', 'BodyPackage'), calibrationRef: R('CalibrationRecord'), spatialEvidenceRef: R('SpatialEvidence'), 'registrationRefs.*': R('Registration') },
  Registration: { 'faceProfile.anchors.*.evidenceRefs.*': R() },
  AnatomicalBinding: {},
  ArtworkPivot: { surfaceOrPartRef: R('CanonicalSurface', 'LayeredAssetPackage', 'BodyPackage'), 'sourceRefs.*': R() },
  AttachmentSocket: { hostPartRef: R('CanonicalSurface', 'LayeredAssetPackage', 'BodyPackage', 'HeadIdentity'), parentSocketRef: R('AttachmentSocket') },
  Mesh: { topologyRevision: I, 'skinWeights.*.*.bindingRef': anatomy },
  LayeredAssetPackage: { hostFamilyProfileRef: R('FamilyProfile'), poserProfileRef: R('PoserProfile'), 'subparts.*.id': I, 'subparts.*.surfaceRef': surfaces, 'subparts.*.anatomyBindingRef': anatomy, 'subparts.*.artworkPivotRef': R('ArtworkPivot'), 'subparts.*.attachmentSocketRefs.*': R('AttachmentSocket'), 'subparts.*.meshRef': R('Mesh'), 'subparts.*.shapeKeys.*.topologyRevision': I, 'subparts.*.sourceRefs.*': R(), ...variants, ...order('orderGraphs'), 'overlapZones.*.parts.*': I, 'overlapZones.*.evidenceRefs.*': R(), 'seamConstraints.*.partA': I, 'seamConstraints.*.partB': I, 'seamConstraints.*.envelopeId': I, ...envelopes, 'sourceRefs.*': R(), 'testRefs.*': tests },
  HeadIdentity: { headSurfaceRef: surfaces, 'structuralLayers.*.surfaceRef': surfaces, 'structuralAnchors.*.evidenceRefs.*': R(), neckSocketRef: R('AttachmentSocket'), ...variants },
  FaceKit: { registrationProfileRef: R('Registration'), 'compatibleHeadProfiles.*': R('HeadIdentity'), 'slots.*.variants.*.id': I, 'slots.*.variants.*.surfaceRef': surfaces, 'slots.*.variants.*.sourceRef': R('SourceAsset', 'FrameObservation'), 'maskSemantics.nativeVerificationRefs.*': R('CompatibilityTestRun', 'ReviewEvent'), sourceInventoryRef: R('SourceAsset') },
  FamilyProfile: { 'calibrationProcedure.ownerReviewRefs.*': reviews, 'tolerances.*.ownerReviewRefs.*': reviews, 'bindPose.poseRef': motion, 'bindPose.ownerReviewRefs.*': reviews },
  CharacterPackage: { familyProfileRef: R('FamilyProfile'), bodyRef: R('BodyPackage'), headRef: R('HeadIdentity'), faceKitRef: R('FaceKit'), 'hairRefs.*': R('LayeredAssetPackage'), 'garmentRefs.*': R('LayeredAssetPackage'), 'accessoryRefs.*': R('LayeredAssetPackage'), 'compositionOrder.*.edges.*.behind': R('BodyPackage', 'HeadIdentity', 'FaceKit', 'LayeredAssetPackage'), 'compositionOrder.*.edges.*.inFront': R('BodyPackage', 'HeadIdentity', 'FaceKit', 'LayeredAssetPackage'), ...envelopes, 'rightsRefs.*': R('RightsRecord'), 'testRefs.*': tests },
  AnchorBinding: { characterPackageRef: R('CharacterPackage'), sourcePersonRef: R('PersonIdentity'), 'sourceFrameRefs.*': R('FrameObservation'), 'projectionRefs.*': R('Registration'), 'acceptanceRefs.*': reviews, 'exclusions.*.componentRef': R('ComponentIdentity', 'LayeredAssetPackage', 'CanonicalSurface') },
  RolePerformance: { poseTrackRef: motion, 'rootTrack.*.evidenceRefs.*': R(), 'facingTrack.*.evidenceRefs.*': R(), facePerformanceRef: motion, 'componentStateTracks.*.componentEntityId': E('ComponentIdentity'), 'componentStateTracks.*.samples.*.variantRef': R('CanonicalSurface', 'LayeredAssetPackage', 'HeadIdentity', 'FaceKit'), 'componentStateTracks.*.samples.*.evidenceRefs.*': R() },
  PairedActionTemplate: { roleARef: R('RolePerformance'), roleBRef: R('RolePerformance'), 'relationshipChannels.*': R('RelationshipChannel'), 'familyRequirements.*': R('FamilyProfile'), 'propRefs.*': R('LayeredAssetPackage'), 'envelopeRefs.*': R('LayeredAssetPackage', 'CharacterPackage'), 'testRefs.*': tests },
  RelationshipChannel: { 'localAnchors.*.partRef': R('LayeredAssetPackage', 'BodyPackage', 'HeadIdentity', 'CanonicalSurface'), 'localAnchors.*.socketRef': R('AttachmentSocket'), 'values.*.sharedPropRef': R('LayeredAssetPackage'), 'evidenceRefs.*': R() },
  ReviewEvent: { 'targetRevisionRefs.*': R(), 'evidenceRefs.*': R(), 'testRefs.*': tests, previousEventRef: reviews },
  CompatibilityTestRun: { testSpecRevision: R('SourceAsset', 'ReviewEvent', 'CompatibilityTestRun'), 'inputRevisionRefs.*': R() },
  JobRecord: { jobId: I, 'baseRevisionRefs.*': R() },
  MigrationRecord: { 'mapping.*.targetEntityId': E(...ALL), 'mapping.*.targetRevisionId': R() },
  CalibrationRecord: { personOrBodyRef: R('PersonIdentity', 'BodyPackage'), familyProfileRef: R('FamilyProfile'), 'scaleMeasurements.*.evidenceRefs.*': R(), 'proportionMeasurements.*.evidenceRefs.*': R(), bindPoseRef: motion, 'sourceRefs.*': R(), 'reviewerRefs.*': reviews },
  BodyPackage: { calibrationRef: R('CalibrationRecord'), 'bodySurfaceRefs.*': surfaces, 'anatomyBindingRefs.*': anatomy, bindPoseRef: motion, 'rightsRefs.*': R('RightsRecord'), 'testRefs.*': tests, poserProfileRef: R('PoserProfile'), 'artworkRigMappingRefs.*': R('ArtworkRigMapping') },
  RightsRecord: {},
  PoserProfile: { 'partHierarchy.*.partId': I, 'partHierarchy.*.parentPartId': I, 'comparisonTestRefs.*': tests, selectionDecisionRef: reviews },
  ArtworkRigMapping: { 'sourceRegionMappings.*.destinationPartId': I, 'sourceRegionMappings.*.registrationRef': R('Registration'), 'derivedPartRefs.*': R('CanonicalSurface', 'LayeredAssetPackage'), 'transformRefs.*': R('Registration'), 'anatomicalBindingRefs.*': anatomy, 'artworkPivotRefs.*': R('ArtworkPivot'), 'attachmentSocketRefs.*': R('AttachmentSocket'), coverageLossReportRef: tests },
  MotionTrack: { sourcePersonRef: R('PersonIdentity'), calibrationRef: R('CalibrationRecord'), 'samples.*.frameObservationRef': R('FrameObservation'), 'samples.*.joints.*.rawEvidenceRefs.*': R('RawProviderObservation', 'FrameObservation', 'EvidenceMapping'), 'samples.*.facing.evidenceRefs.*': R() }
};
function valuesAt(value, path) {
  if (!path.length) return value === null || value === undefined ? [] : [value];
  const [key, ...rest] = path;
  if (key === '*') return value && typeof value === 'object' ? Object.values(value).flatMap(v => valuesAt(v, rest)) : [];
  return valuesAt(value?.[key], rest);
}
export function validateReferences(records, heads) {
  const revisions = new Map(records.map(r => [r.revisionId, r])), entities = new Map();
  for (const r of records) if (!entities.has(r.entityId) || heads.get(r.entityId) === r.revisionId) entities.set(r.entityId, r);
  const resolve = (id, descriptor, at) => {
    const target = descriptor.kind === 'ENTITY' ? entities.get(id) : revisions.get(id);
    if (!target || !descriptor.types.includes(target.type)) throw new ContractError('REFERENCE_TYPE', `Missing/wrong typed ${descriptor.kind} reference ${at}: ${id}`);
  };
  for (const record of records) {
    for (const id of record.parentRevisionIds) resolve(id, R(record.type), `${record.type}.parentRevisionIds`);
    for (const id of record.derivedFrom) resolve(id, R(), `${record.type}.derivedFrom`);
    for (const [path, descriptor] of Object.entries(REFERENCE_DESCRIPTORS[record.type])) if (descriptor.kind !== 'INTERNAL') for (const id of valuesAt(record.payload, path.split('.'))) resolve(id, descriptor, `${record.type}.${path}`);
  }
}
// Exhaustive classification of every schema UUID position. A future UUID-valued
// field cannot enter the schema without declaring revision/entity/internal meaning.
export function assertReferenceDescriptorCoverage() {
  for (const type of RECORD_TYPES) {
    const found = new Set(), root = RECORD_SCHEMAS[type];
    function walk(schema, path) {
      if (schema.$ref) { if (schema.$ref === '#/$defs/uuid') { found.add(path); return; } const target = schema.$ref.slice(2).split('/').reduce((o, k) => o[k], root); if (target && schema.$ref !== '#/$defs/jsonValue') walk(target, path); return; }
      if (schema.pattern === DEFINITIONS.uuid.pattern) { found.add(path); return; }
      for (const branch of schema.anyOf ?? []) walk(branch, path);
      for (const [key, child] of Object.entries(schema.properties ?? {})) walk(child, path ? `${path}.${key}` : key);
      if (schema.items) walk(schema.items, `${path}.*`);
      if (schema.additionalProperties && typeof schema.additionalProperties === 'object') walk(schema.additionalProperties, `${path}.*`);
    }
    walk(root.properties.payload, '');
    // Face slots and fixed canonical joint dictionaries are keyed maps semantically.
    const normalized = new Set([...found].map(p => p.replace(/^slots\.(LEFT_BROW|RIGHT_BROW|LEFT_EYE|RIGHT_EYE|LOWER_FACE)\./, 'slots.*.').replace(/^(samples\.\*\.joints)\..+\.rawEvidenceRefs/, '$1.*.rawEvidenceRefs')));
    const declared = new Set(Object.keys(REFERENCE_DESCRIPTORS[type]));
    for (const path of normalized) if (!declared.has(path)) throw new ContractError('REFERENCE_DESCRIPTOR_MISSING', `${type}.${path}`);
    for (const path of declared) if (!normalized.has(path)) throw new ContractError('REFERENCE_DESCRIPTOR_STALE', `${type}.${path}`);
  }
  return true;
}
