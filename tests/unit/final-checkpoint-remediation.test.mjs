import test from 'node:test';
import assert from 'node:assert/strict';
import { mixedFixture, make, populatedStore } from './fixture.mjs';
import { AuthoringStore } from '../../src/storage/memory-store.mjs';
import { ReviewAuthority } from '../../src/domain/review.mjs';
import { reviseRecord } from '../../src/domain/identity.mjs';
import { exportBundle, importBundle } from '../../src/storage/bundle.mjs';
import { stringifyJSON, encode } from '../../src/domain/safety.mjs';

test('F01: concrete review intent is bound to its real store and preexisting immutable target bytes', async () => {
  const f = await mixedFixture(), authority = new ReviewAuthority([{ actorId: 'owner', role: 'OWNER', scopes: ['FAMILY'] }]), a = new AuthoringStore({ authority }), b = new AuthoringStore({ authority });
  const heads = new Map(f.records.map(r => [r.entityId, r.revisionId])), expected = new Map(f.records.map(r => [r.entityId, null]));
  await a.commit({ records: f.records, blobs: f.blobs, headUpdates: heads, expectedHeads: expected });
  const changed = structuredClone(f.family); changed.payload.calibrationProcedure.instructions = 'Different immutable target bytes under the same copied UUID in another store';
  await b.commit({ records: f.records.map(r => r.revisionId === changed.revisionId ? changed : r), blobs: f.blobs, headUpdates: heads, expectedHeads: expected });
  const event = make('ReviewEvent', { targetRevisionRefs: [f.family.revisionId], scope: 'FAMILY', decision: 'ACCEPTED', actor: { actorId: 'owner', claimedRole: 'OWNER', issuer: 'local' }, evidenceRefs: [], testRefs: [], previousEventRef: null }, { actorId: 'owner' });
  assert.throws(() => authority.issue({ record: event, userInitiated: true }), e => e.code === 'REVIEW_STORE_REQUIRED');
  const token = authority.issue({ store: a, record: event, userInitiated: true });
  await a.commit({ records: [event], reviewCommands: new Map([[event.revisionId, token]]) }); assert.equal(a.isApplicableAcceptance(event), true);
  const before = b.generation;
  await assert.rejects(b.commit({ records: [event], reviewCommands: new Map([[event.revisionId, token]]) }), e => e.code === 'REVIEW_AUTHORITY'); assert.equal(b.generation, before); assert.equal(b.isApplicableAcceptance(event), false);
  await a.commit({ records: [event], reviewCommands: new Map([[event.revisionId, token]]) }); assert.equal(a.isApplicableAcceptance(event), true, 'same-store identical revision is idempotent');
  const fresh = new AuthoringStore({ authority }), future = make('ReviewEvent', event.payload, { actorId: 'owner' });
  assert.throws(() => authority.issue({ store: fresh, record: future, userInitiated: true }), e => e.code === 'REVIEW_TARGET_MISSING');
  const { store: imported } = await importBundle((await exportBundle(a)).bytes); assert.equal(imported.isApplicableAcceptance(event), false);
});
test('F02: a process cannot consume the current inferred surface revision it produces', async () => {
  const f = await mixedFixture();
  f.process.payload.inputRefs = [f.surface.revisionId]; f.process.payload.outputRefs = [f.surface.revisionId];
  for (const records of [f.records, [...f.records].reverse()]) { const store = new AuthoringStore(); await assert.rejects(store.commit({ records, blobs: f.blobs }), e => e.code === 'GRAPH_CYCLE'); assert.equal(store.generation, 0); }
});
test('F02: legitimate source→process→output backlink and prior-surface revision ancestry remain valid', async () => {
  const f = await mixedFixture(); f.process.payload.outputRefs = [f.surface.revisionId];
  const store = new AuthoringStore(); await store.commit({ records: f.records, blobs: f.blobs });
  const process2 = make('DerivationProcess', { ...f.process.payload, inputRefs: [f.surface.revisionId], outputRefs: [] });
  const surface2 = reviseRecord(f.surface, f.surface.payload, { actorId: 'fixture-author', derivedFrom: [f.surface.revisionId, process2.revisionId] }); process2.payload.outputRefs = [surface2.revisionId];
  await store.commit({ records: [process2, surface2] }); assert.deepEqual(store.getRecord(surface2.revisionId), surface2);
  const { store: reopened } = await importBundle((await exportBundle(store)).bytes); assert.deepEqual(reopened.getRecord(f.surface.revisionId), f.surface); assert.deepEqual(reopened.getRecord(surface2.revisionId), surface2);
});
test('F03: unselected multi-revision ownership never depends on record serialization order', async () => {
  const f = await mixedFixture(), other = make('PersonIdentity', { ...f.person.payload, sourceContextId: crypto.randomUUID(), label: 'Other participant' });
  const changed = reviseRecord(f.component, { ...f.component.payload, personEntityId: other.entityId }, { actorId: 'fixture-author' }), all = [...f.records, other, changed];
  for (const records of [all, [...all].reverse()]) { const store = new AuthoringStore(); await assert.rejects(store.commit({ records, blobs: f.blobs }), e => e.code === 'AMBIGUOUS_ENTITY_HEAD'); assert.equal(store.recordCount, 0); }
  for (const records of [all, [...all].reverse()]) { const store = new AuthoringStore(); await store.commit({ records, blobs: f.blobs, headUpdates: new Map([[f.component.entityId, f.component.revisionId]]), expectedHeads: new Map([[f.component.entityId, null]]) }); assert.equal(store.recordCount, all.length); }
});
test('F03: explicit typed record-level bindings retain old and new ownership revisions losslessly', async () => {
  const f = await mixedFixture(), other = make('PersonIdentity', { ...f.person.payload, sourceContextId: crypto.randomUUID(), label: 'Other participant' }), changed = reviseRecord(f.component, { ...f.component.payload, personEntityId: other.entityId }, { actorId: 'fixture-author' });
  f.track.entityRevisionBindings = [{ entityId: f.component.entityId, revisionId: f.component.revisionId }];
  f.surface.entityRevisionBindings = [{ entityId: f.component.entityId, revisionId: f.component.revisionId }];
  const otherTrack = make('ComponentTrack', { ...f.track.payload, personEntityId: other.entityId, ownershipHypotheses: [] }, { entityRevisionBindings: [{ entityId: changed.entityId, revisionId: changed.revisionId }] });
  const records = [...f.records, other, changed, otherTrack], store = new AuthoringStore();
  for (const ordered of [records, [...records].reverse()]) { const unselected = new AuthoringStore(); await unselected.commit({ records: ordered, blobs: f.blobs }); assert.equal(unselected.heads.size, 0, 'exact context bindings do not silently select global heads'); }
  await store.commit({ records: [...records].reverse(), blobs: f.blobs, headUpdates: new Map([[changed.entityId, changed.revisionId]]), expectedHeads: new Map([[changed.entityId, null]]) });
  const { store: reopened } = await importBundle((await exportBundle(store)).bytes);
  for (const r of records) assert.deepEqual(reopened.getRecordBytes(r.revisionId), stringifyJSON(r));
  assert.equal(reopened.heads.get(changed.entityId), changed.revisionId);
  const bad = structuredClone(otherTrack); bad.revisionId = crypto.randomUUID(); bad.entityId = crypto.randomUUID(); bad.entityRevisionBindings = [{ entityId: f.component.entityId, revisionId: other.revisionId }];
  await assert.rejects(store.commit({ records: [bad] }), e => e.code === 'ENTITY_BINDING');
  bad.entityRevisionBindings = [{ entityId: changed.entityId, revisionId: crypto.randomUUID() }];
  await assert.rejects(store.commit({ records: [bad] }), e => e.code === 'ENTITY_BINDING');
  bad.entityRevisionBindings = [{ entityId: changed.entityId, revisionId: changed.revisionId }, { entityId: changed.entityId, revisionId: f.component.revisionId }];
  await assert.rejects(store.commit({ records: [bad] }), e => e.code === 'ENTITY_BINDING');
});
test('F04: complete portable file namespace rejects file/ancestor and reserved-directory collisions atomically', async () => {
  for (const path of ['manifest.json/child.bin', 'MANIFEST.JSON/child.bin', 'records', 'blobs', 'legacy', 'notices']) {
    const store = new AuthoringStore(); await assert.rejects(store.commit({ opaqueFiles: [{ path, bytes: encode('reserved prefix') }] }), e => e.code === 'RESERVED_FILE_PATH'); assert.equal(store.generation, 0); await exportBundle(store);
  }
  for (const paths of [['future/file', 'future/file/child'], ['future/file/child', 'future/file']]) {
    const store = new AuthoringStore(); await assert.rejects(store.commit({ opaqueFiles: paths.map(path => ({ path, bytes: encode('prefix') })) }), e => e.code === 'RESERVED_FILE_PATH'); assert.equal(store.generation, 0);
  }
  const store = new AuthoringStore(); await store.commit({ opaqueFiles: [{ path: 'future/valid/child.bin', bytes: encode('retained unknown data') }] }); const { store: reopened } = await importBundle((await exportBundle(store)).bytes); assert.equal((await reopened.snapshot()).opaqueFiles[0].path, 'future/valid/child.bin');
});
