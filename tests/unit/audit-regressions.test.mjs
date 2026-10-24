// Regression scenarios derived from independent AUD-M01 findings, implemented by
// Builder for remediation. Independent Auditor reruns remain a separate gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { populatedStore, mixedFixture, make, I, domain } from './fixture.mjs';
import { AuthoringStore } from '../../src/storage/memory-store.mjs';
import { ReviewAuthority } from '../../src/domain/review.mjs';
import { exportBundle } from '../../src/storage/bundle.mjs';
import { sha256, encode } from '../../src/domain/safety.mjs';

async function authorityFixture() {
  const { store: original, fixture: f } = await populatedStore(), authority = new ReviewAuthority([{ actorId: 'owner-local', role: 'OWNER', scopes: ['FAMILY'] }, { actorId: 'pixel-reviewer', role: 'REVIEWER', scopes: ['PIXEL_EVIDENCE'] }]);
  const store = new AuthoringStore({ authority });
  await store.commit({ records: f.records, blobs: f.blobs, headUpdates: original.heads, expectedHeads: new Map([...original.heads.keys()].map(id => [id, null])) });
  const event = make('ReviewEvent', { targetRevisionRefs: [f.family.revisionId], scope: 'FAMILY', decision: 'ACCEPTED', actor: { actorId: 'owner-local', claimedRole: 'OWNER', issuer: 'local-ui' }, evidenceRefs: [], testRefs: [], previousEventRef: null }, { actorId: 'owner-local' });
  const token = authority.issue({ record: event, userInitiated: true });
  await store.commit({ records: [event], reviewCommands: new Map([[event.revisionId, token]]) });
  return { store, f, authority, event, token };
}
test('AUD-M01-001: exact event capability cannot be replayed for a second target or mutated after issuance', async () => {
  const { store, f, authority, event, token } = await authorityFixture();
  const secondFamily = make('FamilyProfile', f.family.payload); await store.commit({ records: [secondFamily] });
  const second = make('ReviewEvent', { ...event.payload, targetRevisionRefs: [secondFamily.revisionId] }, { actorId: 'owner-local' });
  await assert.rejects(store.commit({ records: [second], reviewCommands: new Map([[second.revisionId, token]]) }), e => e.code === 'REVIEW_AUTHORITY');
  const bound = authority.issue({ record: second, userInitiated: true }); second.payload.targetRevisionRefs = [f.family.revisionId];
  await assert.rejects(store.commit({ records: [second], reviewCommands: new Map([[second.revisionId, bound]]) }), e => e.code === 'REVIEW_AUTHORITY');
  assert.equal(store.isApplicableAcceptance(event), true);
  assert.throws(() => authority.issue({ actorId: 'owner-local', scope: 'FAMILY', decision: 'ACCEPTED', userInitiated: true }), e => e.code === 'REVIEW_TARGET_REQUIRED');
});
test('AUD-M01-001: forged event object cannot borrow a trusted revision or change applicability claims', async () => {
  const { store, event } = await authorityFixture();
  const forged = structuredClone(event); forged.payload.scope = 'RELEASE'; forged.payload.actor.actorId = 'intruder';
  assert.equal(store.isApplicableAcceptance(forged), false); assert.equal(store.isApplicableAcceptance(event), true); assert.equal(store.isApplicableAcceptance(event.revisionId), true);
});
test('AUD-M01-001: lower-authority cross-scope and cross-target revocations cannot invalidate owner family acceptance', async () => {
  const { store, f, authority, event } = await authorityFixture();
  const revoke = make('ReviewEvent', { targetRevisionRefs: [f.f0.revisionId], scope: 'PIXEL_EVIDENCE', decision: 'REVOKED', actor: { actorId: 'pixel-reviewer', claimedRole: 'REVIEWER', issuer: 'local-ui' }, evidenceRefs: [], testRefs: [], previousEventRef: event.revisionId }, { actorId: 'pixel-reviewer' });
  const token = authority.issue({ record: revoke, userInitiated: true });
  await assert.rejects(store.commit({ records: [revoke], reviewCommands: new Map([[revoke.revisionId, token]]) }), e => e.code === 'REVIEW_CHAIN_SCOPE');
  assert.equal(store.isApplicableAcceptance(event), true);
});
test('T11: even an owner FAMILY capability cannot accept a PersonIdentity as family evidence', async () => {
  const { store, f, authority } = await authorityFixture(), before = store.generation;
  const wrong = make('ReviewEvent', { targetRevisionRefs: [f.person.revisionId], scope: 'FAMILY', decision: 'ACCEPTED', actor: { actorId: 'owner-local', claimedRole: 'OWNER', issuer: 'local-ui' }, evidenceRefs: [], testRefs: [], previousEventRef: null }, { actorId: 'owner-local' });
  const token = authority.issue({ record: wrong, userInitiated: true });
  await assert.rejects(store.commit({ records: [wrong], reviewCommands: new Map([[wrong.revisionId, token]]) }), e => e.code === 'REFERENCE_TYPE'); assert.equal(store.generation, before); assert.equal(store.isApplicableAcceptance(wrong), false);
});
test('AUD-M01-003: invalid claimed legacy snapshot fails before any revision/head/generation becomes visible', async () => {
  const store = new AuthoringStore();
  await assert.rejects(store.commit({ legacy: encode('Not a ZIP archive') })); assert.equal(store.generation, 0); assert.equal(store.getLegacy(), null);
  assert.doesNotThrow(() => store.snapshot()); await exportBundle(store);
});
test('AUD-M01-004: reserved/case-folded opaque and notice paths fail atomically and leave store exportable', async () => {
  for (const path of ['manifest.json', 'MANIFEST.JSON', 'legacy/original.corpus.zip', `blobs/sha256/${'a'.repeat(64)}`]) {
    const store = new AuthoringStore(); await assert.rejects(store.commit({ opaqueFiles: [{ path, bytes: encode('collision') }] }), e => e.code === 'RESERVED_FILE_PATH'); assert.equal(store.generation, 0); await exportBundle(store);
  }
  const store = new AuthoringStore(); await assert.rejects(store.commit({ opaqueFiles: [{ path: 'future/keep.bin', bytes: encode('x') }], notices: [{ path: 'future/KEEP.bin', bytes: encode('x') }] }), e => e.code === 'RESERVED_FILE_PATH'); assert.equal(store.generation, 0);
});
test('AUD-M01-005: canonical surface rejects contributor view or coordinate-domain mismatch', async () => {
  for (const patch of [{ viewId: 'BACK' }, { id: 'unrelated-domain' }, { units: 'NORMALIZED_HEIGHT' }]) {
    const f = await mixedFixture(); f.table.payload.coordinateDomain = { ...f.table.payload.coordinateDomain, ...patch };
    await assert.rejects(new AuthoringStore().commit({ records: f.records, blobs: f.blobs }), e => e.code === 'SURFACE_DOMAIN');
  }
});
test('AUD-M01-005: unrelated/wrong-scope/proposed visibility review is not visible source proof', async () => {
  const f = await mixedFixture();
  const proof = make('ReviewEvent', { targetRevisionRefs: [f.surface.revisionId], scope: 'PIXEL_EVIDENCE', decision: 'PROPOSED', actor: { actorId: 'fixture-author', claimedRole: 'IMPORT', issuer: 'foreign' }, evidenceRefs: [], testRefs: [], previousEventRef: null });
  f.table.payload.sets[1][0].visibilityEvidenceRef = proof.revisionId;
  await assert.rejects(new AuthoringStore().commit({ records: [...f.records, proof], blobs: f.blobs }), e => e.code === 'VISIBILITY_REVIEW');
});
test('AUD-M01-006: nested view variants and structural anchor evidence must resolve exact revisions', async () => {
  const f = await mixedFixture(), socket = make('AttachmentSocket', { hostPartRef: f.surface.revisionId, name: 'neck', local3x3: I, semanticRole: 'HEAD_NECK', compatibleAttachmentTypes: ['HEAD_IDENTITY'] });
  const missing = crypto.randomUUID(), head = make('HeadIdentity', { headSurfaceRef: f.surface.revisionId, structuralLayers: [], structuralAnchors: [], neckSocketRef: socket.revisionId, headSpace: domain, viewVariants: [{ viewId: 'FRONT', surfaceRefs: [missing], bindingRefs: [missing], supported: true, reason: null }] });
  await assert.rejects(new AuthoringStore().commit({ records: [...f.records, socket, head], blobs: f.blobs }), e => e.code === 'REFERENCE_TYPE');
  head.payload.viewVariants = []; head.payload.structuralAnchors = [{ name: 'nose', xy: [1, 0], anatomicalSide: 'MIDLINE', evidenceRefs: [missing] }];
  await assert.rejects(new AuthoringStore().commit({ records: [...f.records, socket, head], blobs: f.blobs }), e => e.code === 'REFERENCE_TYPE');
});
test('AUD-M01-007: raw f32 warp and other numeric planes reject NaN/Infinity before persistence', async () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    const bytes = new Uint8Array(8), data = new DataView(bytes.buffer); data.setFloat32(0, value, true);
    const hash = await sha256(bytes), reg = make('Registration', { fromSpace: 'source', toSpace: 'destination', transformType: 'WARP_2D', warpBlob: { sha256: hash, byteLength: 8, width: 1, height: 1, channels: 2, dtype: 'f32', endian: 'LITTLE', encoding: 'RAW' }, anchors: [], weights: [], residuals: [], excludedRegions: [] }), store = new AuthoringStore();
    await assert.rejects(store.commit({ records: [reg], blobs: [{ sha256: hash, bytes }] }), e => e.code === 'NON_FINITE_PLANE'); assert.equal(store.generation, 0);
  }
});
