import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { JOINTS, BONES, SKELETON, FACE_SLOTS, SLOT_TO_CANONICAL } from '../../src/domain/contracts.mjs';
import { mixedFixture, make, populatedStore, I, domain } from './fixture.mjs';
import { AuthoringStore } from '../../src/storage/memory-store.mjs';
import { sha256, encode, stringifyJSON } from '../../src/domain/safety.mjs';
import { exportBundle, importBundle } from '../../src/storage/bundle.mjs';
import { assertAcyclic } from '../../src/domain/semantics.mjs';

test('canonical skeletal IDs/bones/face slots equal immutable1.2.0; no foreign topology', async () => {
  const source = await readFile(new URL('../../baseline/02.2.5/engine/universal.js', import.meta.url), 'utf8');
  const context = { module: { exports: {} } }; vm.runInNewContext(source, context);
  const baseline = context.module.exports.SCHEMA;
  assert.deepEqual(JSON.parse(JSON.stringify(baseline.joints.map(j => j.id))), JOINTS);
  assert.deepEqual(JSON.parse(JSON.stringify(baseline.bones)), BONES);
  assert.deepEqual(JSON.parse(JSON.stringify(baseline.face.slots)), Object.values(SLOT_TO_CANONICAL));
  assert.equal(baseline.version, SKELETON.version); assert.equal(FACE_SLOTS.length, 5);
});
test('durable solo MotionTrack preserves native timing, symbolic face performance, original format4 bytes and independence', async () => {
  const { store, fixture: f } = await populatedStore();
  const legacy = encode('{"format":"adventure-studio/unified-prep","formatVersion":4,"unknown:legacy":"preserved bytes"}'), legacyHash = await sha256(legacy);
  const motion = make('MotionTrack', { skeletonRef: SKELETON, sourcePersonRef: f.person.revisionId, calibrationRef: f.calibration.revisionId, units: 'SOURCE_PIXEL', legacyTrackSnapshotHash: legacyHash, interpolation: 'KEYFRAME_HOLD', samples: [{ frameObservationRef: f.f0.revisionId, joints: { 'shoulder.left': { xy: [1, 0], visibility: 'VISIBLE', source: 'MANUAL', confidence: null, rawEvidenceRefs: [f.f0.revisionId] } }, root: { xy: [0, 0], angleDegrees: 0, visibility: 'VISIBLE', units: 'NORMALIZED_HEIGHT' }, facing: { viewId: 'FRONT', facing: 'FRONT', evidenceRefs: [f.f0.revisionId] }, faceSlots: Object.fromEntries(FACE_SLOTS.map(slot => [slot, slot === 'LOWER_FACE' ? { expression: 'smile', gaze: 'NOT_APPLICABLE', intensity: 1 } : null])) }] });
  await store.commit({ records: [motion], blobs: [{ sha256: legacyHash, bytes: legacy }], headUpdates: new Map([[motion.entityId, motion.revisionId]]), expectedHeads: new Map([[motion.entityId, null]]) });
  const before = await sha256(store.getRecordBytes(motion.revisionId));
  const pivot = make('ArtworkPivot', { surfaceOrPartRef: f.surface.revisionId, localXY: [2, 0], coordinateDomain: domain, rationale: 'Independent head/module attachment specimen', sourceRefs: [f.f0.revisionId] });
  await store.commit({ records: [pivot] });
  assert.equal(await sha256(store.getRecordBytes(motion.revisionId)), before);
  const { store: reopened } = await importBundle((await exportBundle(store)).bytes);
  assert.deepEqual(reopened.getBlob(legacyHash), legacy); assert.deepEqual(reopened.getRecord(motion.revisionId), motion);
  assert.equal(motion.payload.samples[0].faceSlots.LOWER_FACE.expression, 'smile');
  const wrong = structuredClone(motion); wrong.payload.headIdentityRef = crypto.randomUUID();
  await assert.rejects(store.commit({ records: [wrong] }), e => e.code === 'SCHEMA_INVALID');
});

async function meshFixture({ points = [[0, 0], [4, 0], [0, 4]], triangles = [0, 1, 2], islands = [0, 0, 0], rings = [{ islandId: 0, kind: 'OUTER', indices: [0, 1, 2] }], seams = [] } = {}) {
  const f = await mixedFixture(), binding = make('AnatomicalBinding', { skeletonRef: SKELETON, jointBoneIds: ['shoulder.left'], localBindTransforms: [{ canonicalId: 'shoulder.left', transform: I }], regionCodes: ['leftUpperArm'] });
  const mesh = make('Mesh', { restXYBlob: await f.plane(points.flat(), 'f32', 2, points.length), uvBlob: await f.plane(points.flatMap(p => [p[0] / 4, p[1] / 4]), 'f32', 2, points.length), triangleIndexBlob: await f.plane(triangles, 'u32', 3, triangles.length / 3), constrainedRings: rings, islandIds: islands, seamEdges: seams, topologyRevision: crypto.randomUUID(), skinWeights: points.map(() => [{ bindingRef: binding.revisionId, controlId: 'shoulder.left', weight: 1 }]) });
  return { ...f, mesh, records: [...f.records, binding, mesh] };
}
test('positive winding, island-bounded constrained rest mesh is accepted and roundtrips', async () => {
  const f = await meshFixture(), store = new AuthoringStore(); await store.commit({ records: f.records, blobs: f.blobs });
  assert.deepEqual(store.getRecord(f.mesh.revisionId), f.mesh);
});
test('rest mesh rejects inversion, degeneracy, out-of-range vertices and cross-island triangles', async () => {
  for (const [options, code] of [[{ triangles: [0, 2, 1] }, 'TRIANGLE_INVERTED'], [{ points: [[0, 0], [1, 0], [2, 0]] }, 'TRIANGLE_INVERTED'], [{ triangles: [0, 1, 4] }, 'TRIANGLE_INDEX'], [{ islands: [0, 1, 0], rings: [] }, 'ISLAND_BRIDGE']]) {
    const f = await meshFixture(options); await assert.rejects(new AuthoringStore().commit({ records: f.records, blobs: f.blobs }), e => e.code === code);
  }
});
test('whole enclosed holes reject even when triangle centroid misses the void', async () => {
  const points = [[0, 0], [10, 0], [0, 10], [1, 1], [2, 1], [1, 2]], holes = [{ islandId: 0, kind: 'OUTER', indices: [0, 1, 2] }, { islandId: 0, kind: 'HOLE', indices: [3, 4, 5] }];
  const f = await meshFixture({ points, islands: Array(6).fill(0), rings: holes });
  await assert.rejects(new AuthoringStore().commit({ records: f.records, blobs: f.blobs }), e => e.code === 'HOLE_BRIDGE');
});
test('triangle crossing constrained seam rejects', async () => {
  const f = await meshFixture({ points: [[0, 0], [10, 0], [0, 10], [5, -1], [5, 10]], islands: Array(5).fill(0), seams: [[3, 4]] });
  await assert.rejects(new AuthoringStore().commit({ records: f.records, blobs: f.blobs }), e => e.code === 'SEAM_BRIDGE');
});
test('long acyclic histories stay bounded without recursion overflow; cycles reject', () => {
  assert.doesNotThrow(() => assertAcyclic(Array.from({ length: 20000 }, (_, i) => [i, i + 1])));
  assert.throws(() => assertAcyclic([[1, 2], [2, 1]]), e => e.code === 'GRAPH_CYCLE');
});
