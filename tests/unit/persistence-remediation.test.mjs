import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { populatedStore, make } from './fixture.mjs';
import { AuthoringStore } from '../../src/storage/memory-store.mjs';
import { restoreStore } from '../../src/storage/indexed-db.mjs';
import { ReviewAuthority } from '../../src/domain/review.mjs';
import { parseJSON, stringifyJSON, sha256 } from '../../src/domain/safety.mjs';
import { frameKey } from '../../src/domain/frames.mjs';
import { assertReferenceDescriptorCoverage, REFERENCE_DESCRIPTORS, validateReferences } from '../../src/domain/references.mjs';
import { RECORD_TYPES } from '../../src/domain/contracts.mjs';
import { inspectLegacySnapshot } from '../../src/legacy/snapshot.mjs';
import { exportBundle, importBundle } from '../../src/storage/bundle.mjs';

async function readBoundaryFixture(store) {
  const snapshot = await store.snapshot(), legacyHash = snapshot.legacy ? await sha256(snapshot.legacy) : null;
  const head = { bundleId: snapshot.bundleId, generation: snapshot.generation, recordIds: snapshot.records.map(r => r.revisionId), recordDigests: snapshot.records.map(r => { const record = parseJSON(r.bytes); return { revisionId: r.revisionId, entityId: record.entityId, type: record.type, sha256: r.sha256, byteLength: r.bytes.length }; }), blobHashes: snapshot.blobs.map(b => b.sha256), heads: snapshot.heads, legacyHash, opaqueFiles: [], notices: [] };
  head.manifestHash = await sha256(stringifyJSON(head));
  const data = { bundleHeads: new Map([[snapshot.bundleId, head]]), recordRevisions: new Map(snapshot.records.map(r => [r.revisionId, r.bytes.slice()])), blobs: new Map(snapshot.blobs.map(b => [b.sha256, b.bytes.slice()])) };
  if (snapshot.legacy) data.blobs.set(legacyHash, snapshot.legacy);
  const db = { transaction(names, mode) { assert.equal(mode, 'readonly'); return { objectStore(name) { return { get(key) { const req = {}; queueMicrotask(() => { req.result = data[name].get(key); req.onsuccess?.(); }); return req; } }; } }; } };
  return { data, db, head };
}
test('AUD-M01-002: restore verifies committed record digests before publishing even valid JSON under the same revision', async () => {
  const { store, fixture: f } = await populatedStore(), saved = await readBoundaryFixture(store);
  const good = await restoreStore(saved.db, store.bundleId); assert.deepEqual(good.store.getRecordBytes(f.person.revisionId), store.getRecordBytes(f.person.revisionId)); assert.equal(good.persistedGeneration, store.generation);
  const changed = parseJSON(saved.data.recordRevisions.get(f.person.revisionId)); changed.payload.label = 'tampered valid JSON under immutable revision';
  const badBytes = stringifyJSON(changed); saved.data.recordRevisions.set(changed.revisionId, badBytes);
  await assert.rejects(restoreStore(saved.db, store.bundleId), e => e.code === 'STORAGE_CORRUPT');
  assert.deepEqual(saved.data.recordRevisions.get(changed.revisionId), badBytes, 'read failure preserves corrupt bytes for independent recovery');
  saved.head.heads[0][1] = crypto.randomUUID();
  await assert.rejects(restoreStore(saved.db, store.bundleId), e => e.code === 'STORAGE_CORRUPT');
});
test('reference descriptors exhaustively classify UUID positions of all35 schemas', () => {
  assert.equal(Object.keys(REFERENCE_DESCRIPTORS).length, RECORD_TYPES.length); assert.equal(assertReferenceDescriptorCoverage(), true);
});
test('every revision/entity descriptor resolves its positive target and rejects dangling/wrong-kind/wrong-type targets', () => {
  const record = type => ({ type, entityId: crypto.randomUUID(), revisionId: crypto.randomUUID(), parentRevisionIds: [], derivedFrom: [], payload: {} });
  const assign = (target, path, value) => { const fields = path.split('.'); let at = target; for (let i = 0; i < fields.length; i++) { const key = fields[i] === '*' ? '0' : fields[i]; if (i === fields.length - 1) at[key] = value; else at = at[key] ??= {}; } };
  let checked = 0;
  for (const [type, paths] of Object.entries(REFERENCE_DESCRIPTORS)) for (const [path, descriptor] of Object.entries(paths)) {
    if (descriptor.kind === 'INTERNAL') continue;
    const source = record(type), target = record(descriptor.types[0]), id = descriptor.kind === 'ENTITY' ? target.entityId : target.revisionId;
    assign(source.payload, path, id); assert.doesNotThrow(() => validateReferences([source, target], new Map()), `${type}.${path} positive reference-layer probe`);
    assert.throws(() => validateReferences([source], new Map()), e => e.code === 'REFERENCE_TYPE', `${type}.${path} dangling`);
    const swapped = structuredClone(source); assign(swapped.payload, path, descriptor.kind === 'ENTITY' ? target.revisionId : target.entityId);
    assert.throws(() => validateReferences([swapped, target], new Map()), e => e.code === 'REFERENCE_TYPE', `${type}.${path} revision/entity mix`);
    const wrongType = RECORD_TYPES.find(other => !descriptor.types.includes(other));
    if (wrongType) assert.throws(() => validateReferences([source, { ...target, type: wrongType }], new Map()), e => e.code === 'REFERENCE_TYPE', `${type}.${path} wrong type`);
    checked++;
  }
  assert.ok(checked > 100, `Expected complete nested reference-layer inventory; checked ${checked}`);
});
test('native frame identity cannot collide through colon delimiters, null strings or omitted dimensions', async () => {
  const { fixture: f } = await populatedStore(), frame = f.f0.payload.frameRef;
  const a = { ...frame, decoderIdentity: { ...frame.decoderIdentity, name: 'decoder:variant', version: '1' } }, b = { ...frame, decoderIdentity: { ...frame.decoderIdentity, name: 'decoder', version: 'variant:1' } };
  assert.notEqual(frameKey(a), frameKey(b)); assert.notEqual(frameKey(frame), frameKey({ ...frame, width: frame.width + 1 }));
  assert.notEqual(frameKey(frame), frameKey({ ...frame, decoderIdentity: { ...frame.decoderIdentity, codeSha256: 'null' } }));
});
test('exact bound review can retry after atomic failure; legitimate owner same-scope revocation works', async () => {
  const { fixture: f } = await populatedStore(), authority = new ReviewAuthority([{ actorId: 'owner', role: 'OWNER', scopes: ['FAMILY'] }]), store = new AuthoringStore({ authority });
  await store.commit({ records: f.records, blobs: f.blobs, headUpdates: new Map(f.records.map(r => [r.entityId, r.revisionId])), expectedHeads: new Map(f.records.map(r => [r.entityId, null])) });
  const event = make('ReviewEvent', { targetRevisionRefs: [f.family.revisionId], scope: 'FAMILY', decision: 'ACCEPTED', actor: { actorId: 'owner', claimedRole: 'OWNER', issuer: 'local' }, evidenceRefs: [], testRefs: [], previousEventRef: null }, { actorId: 'owner' });
  const token = authority.issue({ record: event, userInitiated: true });
  await assert.rejects(store.commit({ records: [event], reviewCommands: new Map([[event.revisionId, token]]), failBeforeCommit: true }), e => e.code === 'INJECTED_CRASH'); assert.equal(store.isApplicableAcceptance(event), false);
  await store.commit({ records: [event], reviewCommands: new Map([[event.revisionId, token]]) }); assert.equal(store.isApplicableAcceptance(event), true);
  const revoked = make('ReviewEvent', { ...event.payload, decision: 'REVOKED', previousEventRef: event.revisionId }, { actorId: 'owner' });
  await store.commit({ records: [revoked], reviewCommands: new Map([[revoked.revisionId, authority.issue({ record: revoked, userInitiated: true })]]) }); assert.equal(store.isApplicableAcceptance(event), false);
});
test('unchanged real13-clip baseline backup with normal ZIP directory entries attaches and survives portable reopen', async () => {
  const bytes = new Uint8Array(await readFile(new URL('../../baseline/02.2.5/starter/Arm_Shoulder_Torso_Acceptance_Reliability_02_2_5.corpus.zip', import.meta.url)));
  assert.equal(await sha256(bytes), 'd95fc1f02f06aa4d69901669d679d97c4235fbc4b98b3128a978fa8191b137a3');
  const inventory = await inspectLegacySnapshot(bytes); assert.equal(inventory.manifest.clips.length, 13); assert.equal(inventory.acceptanceChanged, false);
  const store = new AuthoringStore(); await store.commit({ legacy: bytes });
  const { store: reopened } = await importBundle((await exportBundle(store)).bytes);
  assert.deepEqual(reopened.getLegacy(), bytes); assert.equal(await sha256(reopened.getLegacy()), inventory.sha256);
});
