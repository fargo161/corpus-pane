import test from 'node:test';
import assert from 'node:assert/strict';
import { populatedStore, mixedFixture, make, legacyFixture, I } from './fixture.mjs';
import { AuthoringStore } from '../../src/storage/memory-store.mjs';
import { exportBundle, importBundle } from '../../src/storage/bundle.mjs';
import { decodeZip, encodeZip } from '../../src/storage/zip.mjs';
import { sha256, parseJSON, stringifyJSON, encode } from '../../src/domain/safety.mjs';
import { reviseRecord } from '../../src/domain/identity.mjs';
import { inspectLegacySnapshot, legacyExportLossInventory } from '../../src/legacy/snapshot.mjs';
import { ReviewAuthority } from '../../src/domain/review.mjs';
import { compareFrames, compareTime, frameKey } from '../../src/domain/frames.mjs';

test('mixed spatial origins, exact records/blobs and original legacy snapshot survive portable roundtrip', async () => {
  const { store, fixture } = await populatedStore();
  const { bytes, manifest } = await exportBundle(store, { createdAt: '2026-10-24T00:00:00.000Z' });
  assert.equal(manifest.format, 'corpus-pane/authoring-bundle'); assert.equal(manifest.records.length, 14);
  const { store: reopened } = await importBundle(bytes);
  for (const r of fixture.records) assert.deepEqual(reopened.getRecordBytes(r.revisionId), store.getRecordBytes(r.revisionId));
  for (const b of fixture.blobs) assert.deepEqual(reopened.getBlob(b.sha256), b.bytes);
  assert.deepEqual(reopened.getBlob(fixture.evidence.payload.originBlob.sha256), new Uint8Array([0, 1, 2, 3]));
  assert.deepEqual(reopened.getLegacy(), await legacyFixture());
  const loss = legacyExportLossInventory(reopened); assert.equal(loss.legacyModified, false); assert.equal(loss.requiresExplicitAcknowledgment, true);
  const report = await inspectLegacySnapshot(loss.originalBytes); assert.equal(report.header.reviewState, 'owner-pending'); assert.equal(report.header.unknownNamespace.preserved, true);
});
test('transaction rollback, immutable revisions, explicit forks and stale heads fail safely', async () => {
  const { store, fixture } = await populatedStore(), generation = store.generation;
  const next = reviseRecord(fixture.person, { ...fixture.person.payload, label: 'Changed candidate' }, { actorId: 'reviewer' });
  const transaction = { records: [next], headUpdates: new Map([[next.entityId, next.revisionId]]), expectedHeads: new Map([[next.entityId, fixture.person.revisionId]]) };
  await assert.rejects(store.commit({ ...transaction, failBeforeCommit: true }), e => e.code === 'INJECTED_CRASH');
  assert.equal(store.generation, generation); assert.equal(store.getRecord(next.revisionId), null); assert.equal(store.heads.get(next.entityId), fixture.person.revisionId);
  await store.commit(transaction); assert.equal(store.heads.get(next.entityId), next.revisionId);
  await assert.rejects(store.commit(transaction), e => e.code === 'STALE_HEAD');
  const mutation = structuredClone(fixture.person); mutation.payload.label = 'Reuse revision ID';
  await assert.rejects(store.commit({ records: [mutation] }), e => e.code === 'REVISION_COLLISION');
  const collision = make('PersonIdentity', { ...next.payload }, { entityId: next.entityId });
  await assert.rejects(store.commit({ records: [collision] }), e => e.code === 'ENTITY_COLLISION');
  const fork = make('PersonIdentity', { ...next.payload }); await store.commit({ records: [fork] });
  assert.notEqual(fork.entityId, next.entityId);
});
test('no data becomes visible after missing blob, wrong typed reference or invalid transform failure', async () => {
  const f = await mixedFixture(), empty = new AuthoringStore();
  await assert.rejects(empty.commit({ records: f.records, blobs: f.blobs.slice(1) }), e => e.code === 'BLOB_MISSING'); assert.equal(empty.recordCount, 0);
  const bad = structuredClone(f.surface); bad.payload.calibrationRef = f.person.revisionId;
  await assert.rejects(empty.commit({ records: f.records.map(r => r.revisionId === bad.revisionId ? bad : r), blobs: f.blobs }), e => e.code === 'REFERENCE_TYPE');
  const singular = structuredClone(f.registration); singular.payload.matrix = Array(9).fill(0);
  await assert.rejects(empty.commit({ records: f.records.map(r => r.revisionId === singular.revisionId ? singular : r), blobs: f.blobs }), e => e.code === 'SINGULAR_TRANSFORM');
});
test('cannot upgrade inferred/other-frame source texture, erase provenance or invent visibility', async () => {
  const f = await mixedFixture();
  for (const change of [
    table => { table.payload.sets[3][0].processRef = null; },
    table => { table.payload.sets[2][0].state = 'OBSERVED'; },
    table => { table.payload.sets[1][0].visible = false; },
    table => { table.payload.sets[2][0].registrationRef = null; },
    table => { table.payload.sets[1][0].weight = 0.3; }
  ]) {
    const bad = structuredClone(f.table); change(bad); const store = new AuthoringStore();
    await assert.rejects(store.commit({ records: f.records.map(r => r.revisionId === bad.revisionId ? bad : r), blobs: f.blobs })); assert.equal(store.recordCount, 0);
  }
  const originBytes = new Uint8Array([0, 1, 2, 1]), badEvidence = structuredClone(f.evidence), hash = await sha256(originBytes);
  badEvidence.payload.originBlob.sha256 = hash;
  await assert.rejects(new AuthoringStore().commit({ records: f.records.map(r => r.revisionId === badEvidence.revisionId ? badEvidence : r), blobs: [...f.blobs, { sha256: hash, bytes: originBytes }] }), e => e.code === 'ORIGIN_UPGRADE');
});
test('native rational time handles VFR, negative ticks, duplicate PTS and distinguishes source identity', async () => {
  assert.equal(compareTime({ ptsTicks: '10000000000000000000001', timeBaseNum: 1, timeBaseDen: 1000 }, { ptsTicks: '10000000000000000000000', timeBaseNum: 1, timeBaseDen: 1000 }), 1);
  assert.equal(compareTime({ ptsTicks: '-1', timeBaseNum: 1, timeBaseDen: 24 }, { ptsTicks: '-2', timeBaseNum: 1, timeBaseDen: 48 }), 0);
  const f = await mixedFixture(), a = f.f0.payload.frameRef, b = { ...a, decodeIndex: 1 };
  assert.equal(compareFrames(a, b), -1); assert.notEqual(frameKey(a), frameKey(b));
  assert.throws(() => compareFrames(a, { ...b, sourceSha256: 'a'.repeat(64) }), e => e.code === 'FRAME_DOMAIN');
  const reversed = structuredClone(f.track); reversed.payload.observationRefs.reverse();
  await assert.rejects(new AuthoringStore().commit({ records: f.records.map(r => r.revisionId === reversed.revisionId ? reversed : r), blobs: f.blobs }), e => e.code === 'TRACK_ORDER');
});
test('claimed owner is not trusted authority, trusted exact-revision review becomes stale, import does not promote', async () => {
  const f = await mixedFixture(), authority = new ReviewAuthority([{ actorId: 'local-owner', role: 'OWNER', scopes: ['ASSET'] }]), store = new AuthoringStore({ authority });
  await store.commit({ records: f.records, blobs: f.blobs, headUpdates: new Map(f.records.map(r => [r.entityId, r.revisionId])), expectedHeads: new Map(f.records.map(r => [r.entityId, null])) });
  const event = make('ReviewEvent', { targetRevisionRefs: [f.surface.revisionId], scope: 'ASSET', decision: 'ACCEPTED', actor: { actorId: 'local-owner', claimedRole: 'OWNER', issuer: 'local-ui' }, evidenceRefs: [], testRefs: [], previousEventRef: null }, { actorId: 'local-owner' });
  await assert.rejects(store.commit({ records: [event] }), e => e.code === 'REVIEW_AUTHORITY');
  assert.throws(() => authority.issue({ store, record: event, userInitiated: false }));
  const token = authority.issue({ store, record: event, userInitiated: true });
  await store.commit({ records: [event], reviewCommands: new Map([[event.revisionId, token]]) }); assert.equal(store.isApplicableAcceptance(event), true);
  const { store: imported } = await importBundle((await exportBundle(store)).bytes); assert.equal(imported.isApplicableAcceptance(event), false); assert.deepEqual(imported.getRecord(event.revisionId), event);
  const changed = reviseRecord(f.surface, { ...f.surface.payload }, { actorId: 'local-author' });
  await store.commit({ records: [changed], headUpdates: new Map([[changed.entityId, changed.revisionId]]), expectedHeads: new Map([[changed.entityId, f.surface.revisionId]]) }); assert.equal(store.isApplicableAcceptance(event), false);
});
test('bundle integrity, unsupported required schemas, unknown optional payloads and opaque extensions', async () => {
  const { store } = await populatedStore(), exported = await exportBundle(store), files = await decodeZip(exported.bytes);
  const manifest = parseJSON(files.get('manifest.json')), changedPath = manifest.records[0].path, changed = files.get(changedPath).slice(); changed[0] ^= 1; files.set(changedPath, changed);
  await assert.rejects(importBundle(encodeZip(files)), e => e.code === 'BUNDLE_INTEGRITY');
  const clean = await decodeZip(exported.bytes), future = { type: 'FutureOptional', schemaVersion: '2.0.0', entityId: crypto.randomUUID(), revisionId: crypto.randomUUID(), payload: { importantUnknown: [1, 2, 3] } }, futureBytes = stringifyJSON(future), path = `records/${future.revisionId}.json`;
  const futureEntry = { type: future.type, entityId: future.entityId, revisionId: future.revisionId, path, sha256: await sha256(futureBytes), byteLength: futureBytes.length, required: true };
  manifest.records.push(futureEntry); clean.set(path, futureBytes); clean.set('manifest.json', stringifyJSON(manifest));
  await assert.rejects(importBundle(encodeZip(clean)), e => e.code === 'REQUIRED_SCHEMA');
  futureEntry.required = false; clean.set('manifest.json', stringifyJSON(manifest));
  const { store: imported } = await importBundle(encodeZip(clean)), roundtrip = await decodeZip((await exportBundle(imported)).bytes);
  assert.deepEqual(roundtrip.get(path), futureBytes);
  const undeclared = await decodeZip(exported.bytes); undeclared.set('secret-unlisted.bin', encode('not declared'));
  await assert.rejects(importBundle(encodeZip(undeclared)), e => e.code === 'BUNDLE_UNDECLARED');
});
test('ZIP rejects CRC corruption, dangerous paths, case aliases and truncated directories', async () => {
  assert.throws(() => encodeZip(new Map([['../bad', encode('bad')]])));
  assert.throws(() => encodeZip(new Map([['A.txt', encode('a')], ['a.txt', encode('b')]])));
  const zipped = encodeZip(new Map([['safe.txt', encode('payload')]]));
  const broken = zipped.slice(); broken[30 + encode('safe.txt').length] ^= 1;
  await assert.rejects(decodeZip(broken), e => e.code === 'ZIP_CRC');
  await assert.rejects(decodeZip(zipped.slice(0, -5)));
});
