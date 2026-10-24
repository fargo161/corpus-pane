import { createRecord } from '../../src/domain/identity.mjs';
import { sha256, encode } from '../../src/domain/safety.mjs';
import { AuthoringStore } from '../../src/storage/memory-store.mjs';
import { encodeZip } from '../../src/storage/zip.mjs';
export const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const decoderIdentity = { name: 'owner-prepared-rgba', version: '1.0.0', codeSha256: null, configSha256: null };
export const domain = { id: 'bind-front', width: 4, height: 1, origin: 'TOP_LEFT', xAxis: 'RIGHT', yAxis: 'DOWN', units: 'PIXEL', viewId: 'FRONT' };
export function make(type, payload, options = {}) { return createRecord(type, payload, { actorId: 'fixture-author', ...options }); }
export async function legacyFixture() {
  const header = { format: 'sprite-foundry/corpus-verifier', formatVersion: 1, reviewState: 'owner-pending', unknownNamespace: { preserved: true } };
  const files = new Map([['corpus.header.json', encode(JSON.stringify(header))], ['media/index.json', encode('{}')], ['references/index.json', encode('{}')], ['comparisons/index.json', encode('{}')]]);
  const contents = await Promise.all([...files].map(async ([path, bytes]) => ({ path, sha256: await sha256(bytes) })));
  files.set('manifest.json', encode(JSON.stringify({ format: 'sprite-foundry/corpus-package', version: 1, clips: [], media: [], contents })));
  return encodeZip(files);
}
export async function mixedFixture() {
  const blobs = [];
  async function blob(bytes) { const sha = await sha256(bytes); blobs.push({ sha256: sha, bytes }); return sha; }
  async function plane(values, dtype = 'u8', channels = 1, width = 4, height = 1) {
    let bytes;
    if (dtype === 'u8') bytes = Uint8Array.from(values);
    else { bytes = new Uint8Array(values.length * 4); const view = new DataView(bytes.buffer); values.forEach((n, i) => dtype === 'u32' ? view.setUint32(i * 4, n, true) : view.setFloat32(i * 4, n, true)); }
    return { sha256: await blob(bytes), byteLength: bytes.length, width, height, channels, dtype, endian: dtype === 'u8' ? 'NA' : 'LITTLE', encoding: 'RAW' };
  }
  const sourceBytes = encode('synthetic controlled source; no owner acceptance');
  const sourceHash = await blob(sourceBytes);
  const rights = make('RightsRecord', { artifactHash: sourceHash, holder: 'Corpus Pane synthetic test author', grantEvidenceRefs: [], allowedUses: ['PRIVATE_AUTHORING'], redistributionTerms: 'Synthetic test fixture', attribution: [], restrictions: [], disposition: 'APPROVED_WITH_CONDITIONS', reviewer: 'fixture-author' });
  const source = make('SourceAsset', { containerSha256: sourceHash, byteLength: sourceBytes.length, MIME: 'application/x-corpus-pane-synthetic-frames', sourceRightsRef: rights.revisionId, streams: [{ index: 0, mediaType: 'IMAGE_SEQUENCE', timeBaseNum: 1, timeBaseDen: 24, width: 4, height: 1 }], decoderIdentity, originalName: 'synthetic-controlled-source' });
  const pixels0 = new Uint8Array([200, 0, 0, 255, 210, 10, 0, 255, 220, 20, 0, 255, 230, 30, 0, 255]);
  const pixels1 = new Uint8Array([0, 200, 0, 255, 10, 210, 0, 255, 20, 220, 0, 255, 30, 230, 0, 255]);
  const pixel0 = await blob(pixels0), pixel1 = await blob(pixels1);
  const frame = (ptsTicks, decodeIndex, pixelSha256) => make('FrameObservation', { frameRef: { sourceSha256: sourceHash, streamIndex: 0, decodeIndex, ptsTicks, timeBaseNum: 1, timeBaseDen: 24, pixelSha256, width: 4, height: 1, decoderIdentity }, blobRefs: [pixelSha256], transforms: [], sourceViewMetadata: { viewId: 'FRONT', orientationApplied: false, originalToDisplay: I, anatomicalSideConvention: 'SUBJECT', visibility: 'VISIBLE', sourceMetadata: {} } });
  const f0 = frame('0', 0, pixel0), f1 = frame('1', 1, pixel1);
  const person = make('PersonIdentity', { sourceContextId: crypto.randomUUID(), label: 'Synthetic female candidate', associationRevisionRefs: [], status: 'PROPOSED' });
  const component = make('ComponentIdentity', { personEntityId: person.entityId, semanticClass: 'GARMENT', regionCodes: ['leftUpperArm', 'upperTorso'], associationRefs: [] });
  const family = make('FamilyProfile', { proposedFamilyId: 'FEMALE_STANDARD_V1', skeletonRef: { id: 'adventure-studio/universal-skeleton', version: '1.2.0' }, calibrationProcedure: { name: 'synthetic-only', version: '1.0.0', instructions: 'Not accepted body proportions', ownerReviewRefs: [] }, tolerances: [], bindPose: { name: 'proposed', poseRef: null, ownerReviewRefs: [] }, requiredViews: ['FRONT'], moduleRequirements: { body: true, headIdentity: true, faceKit: true, hair: false, garments: false, accessories: false } });
  const calibration = make('CalibrationRecord', { personOrBodyRef: person.revisionId, familyProfileRef: family.revisionId, scaleMeasurements: [], proportionMeasurements: [], bindPoseRef: null, viewProfiles: [{ id: 'FRONT', coordinateDomain: domain, orientationDescription: 'Synthetic 2D frontal' }], sourceRefs: [f0.revisionId], uncertainty: 0, reviewerRefs: [] });
  const registration = make('Registration', { fromSpace: 'source-frame-1', toSpace: domain.id, transformType: 'AFFINE_2D', matrix: I, anchors: [], weights: [], residuals: [], excludedRegions: [] });
  const process = make('DerivationProcess', { kind: 'MANUAL_INVENTION', implementationIdentity: { name: 'synthetic-painted-hidden-region', version: '1.0.0', codeSha256: null, configSha256: null }, configuration: {}, inputRefs: [f0.revisionId], outputRefs: [], actorId: 'fixture-author', modelIdentity: null, warnings: ['Hidden pixel explicitly inferred'] });
  const table = make('ContributorTable', { referenceObservationRef: f0.revisionId, coordinateDomain: domain, sets: [[], [{ state: 'OBSERVED', observationRef: f0.revisionId, sourceXY: [1, 0], registrationRef: null, visibilityEvidenceRef: f0.revisionId, visible: true, weight: 1, processRef: null }], [{ state: 'RECOVERED', observationRef: f1.revisionId, sourceXY: [2, 0], registrationRef: registration.revisionId, visibilityEvidenceRef: f1.revisionId, visible: true, weight: 1, processRef: null }], [{ state: 'INFERRED', observationRef: null, sourceXY: null, registrationRef: null, visibilityEvidenceRef: null, visible: false, weight: 1, processRef: process.revisionId }]] });
  const evidence = make('SpatialEvidence', { width: 4, height: 1, referenceObservationRef: f0.revisionId, coverageBlob: await plane([0, 255, 255, 255]), originBlob: await plane([0, 1, 2, 3]), contributorIndexBlob: await plane([0, 1, 2, 3], 'u32'), contributorTableRef: table.revisionId, uncertaintyBlob: null });
  const surface = make('CanonicalSurface', { componentId: component.entityId, viewProfileRef: calibration.revisionId, calibrationRef: calibration.revisionId, coordinateDomain: domain, rgbaBlob: await plane([0, 0, 0, 0, 210, 10, 0, 255, 20, 220, 0, 255, 60, 60, 60, 255], 'u8', 4), spatialEvidenceRef: evidence.revisionId, registrationRefs: [registration.revisionId], conflictMaskRef: null }, { derivedFrom: [f0.revisionId, f1.revisionId, process.revisionId] });
  const track = make('ComponentTrack', { componentEntityId: component.entityId, personEntityId: person.entityId, observationRefs: [f0.revisionId, f1.revisionId], visibilityIntervals: [], providerAssociationRefs: [], corrections: [], ownershipHypotheses: [{ personEntityId: person.entityId, evidenceRefs: [f0.revisionId], confidence: null, decision: 'PROPOSED' }] });
  const records = [rights, source, f0, f1, person, component, family, calibration, registration, process, table, evidence, surface, track];
  return { blobs, records, rights, source, f0, f1, person, component, family, calibration, registration, process, table, evidence, surface, track, plane };
}
export async function populatedStore() {
  const fixture = await mixedFixture(), store = new AuthoringStore();
  await store.commit({ records: fixture.records, blobs: fixture.blobs, headUpdates: new Map(fixture.records.map(r => [r.entityId, r.revisionId])), expectedHeads: new Map(fixture.records.map(r => [r.entityId, null])), legacy: await legacyFixture() });
  return { store, fixture };
}
