import { DATABASE_NAME } from '../domain/contracts.mjs';
import { AuthoringStore } from './memory-store.mjs';
import { sha256, equalBytes, stringifyJSON, parseJSON, ContractError } from '../domain/safety.mjs';
export const STORES = Object.freeze(['bundleHeads', 'recordRevisions', 'entityHeads', 'blobs', 'rawObservations', 'jobs', 'reviewEvents', 'stagedImports', 'migrations']);
const request = req => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
export async function openAuthoringDatabase({ indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) throw new ContractError('STORAGE_UNAVAILABLE', 'IndexedDB unavailable; use portable bundle export');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE_NAME, 1);
    req.onupgradeneeded = () => { for (const name of STORES) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name); };
    req.onerror = () => reject(req.error); req.onblocked = () => reject(new ContractError('STORAGE_BLOCKED', 'Close conflicting authoring database connections'));
    req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); resolve(req.result); };
  });
}
export async function persistStore(db, store, { expectedPersistedGeneration = null } = {}) {
  const snapshot = await store.snapshot();
  const legacyHash = snapshot.legacy ? await sha256(snapshot.legacy) : null;
  const extraBlobs = [];
  for (const field of ['opaqueFiles', 'notices']) for (const file of snapshot[field]) extraBlobs.push({ sha256: await sha256(file.bytes), bytes: file.bytes, field, path: file.path });
  if (snapshot.legacy) extraBlobs.push({ sha256: legacyHash, bytes: snapshot.legacy });
  const head = { bundleId: snapshot.bundleId, generation: snapshot.generation, recordIds: snapshot.records.map(r => r.revisionId), recordDigests: snapshot.records.map(r => { const record = parseJSON(r.bytes); return { revisionId: r.revisionId, entityId: record.entityId, type: record.type, sha256: r.sha256, byteLength: r.bytes.length }; }), blobHashes: snapshot.blobs.map(b => b.sha256), heads: snapshot.heads, legacyHash, opaqueFiles: extraBlobs.filter(b => b.field === 'opaqueFiles').map(({ path, sha256 }) => ({ path, sha256 })), notices: extraBlobs.filter(b => b.field === 'notices').map(({ path, sha256 }) => ({ path, sha256 })) };
  head.manifestHash = await sha256(stringifyJSON(head));
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite'); let failure = null;
    const abort = error => { failure = error; tx.abort(); };
    tx.oncomplete = () => resolve(head.generation); tx.onabort = () => reject(failure ?? tx.error ?? new ContractError('STORAGE_ABORT', 'Authoring transaction aborted'));
    const req = tx.objectStore('bundleHeads').get(snapshot.bundleId);
    req.onsuccess = () => {
      if ((req.result?.generation ?? null) !== expectedPersistedGeneration) return abort(new ContractError('STALE_STORAGE', 'Persisted bundle head changed'));
      const writes = [...snapshot.records.map(r => ({ name: 'recordRevisions', key: r.revisionId, value: r.bytes })), ...[...snapshot.blobs, ...extraBlobs].map(b => ({ name: 'blobs', key: b.sha256, value: b.bytes }))];
      let remaining = writes.length;
      const finish = () => {
        for (const [entityId, revisionId] of snapshot.heads) tx.objectStore('entityHeads').put({ entityId, revisionId, bundleId: snapshot.bundleId }, `${snapshot.bundleId}:${entityId}`);
        // All writes and the head pointer share one transaction. Browser crash/abort
        // cannot expose a committed head referencing a partially written revision.
        tx.objectStore('bundleHeads').put(head, snapshot.bundleId);
      };
      if (!remaining) return finish();
      for (const item of writes) {
        const existing = tx.objectStore(item.name).get(item.key);
        existing.onsuccess = () => { if (existing.result && !equalBytes(new Uint8Array(existing.result), item.value)) return abort(new ContractError('STORAGE_COLLISION', 'Stored immutable bytes differ')); tx.objectStore(item.name).put(item.value, item.key); if (--remaining === 0) finish(); };
      }
    };
  });
}
export async function restoreStore(db, bundleId) {
  const tx = db.transaction(['bundleHeads', 'recordRevisions', 'blobs'], 'readonly');
  const head = await request(tx.objectStore('bundleHeads').get(bundleId));
  if (!head) throw new ContractError('STORAGE_MISSING', 'No saved authoring bundle');
  if (typeof head !== 'object' || !Array.isArray(head.recordIds) || !Array.isArray(head.recordDigests) || !Array.isArray(head.blobHashes) || !Array.isArray(head.heads) || !Array.isArray(head.opaqueFiles) || !Array.isArray(head.notices) || head.recordIds.length > 10000 || !Number.isSafeInteger(head.generation) || head.generation < 1 || new Set(head.recordIds).size !== head.recordIds.length) throw new ContractError('STORAGE_CORRUPT', 'Invalid bounded saved-head metadata; bytes preserved');
  const { manifestHash, ...headPayload } = head;
  if (head.bundleId !== bundleId || !Array.isArray(head.recordDigests) || head.recordDigests.length !== head.recordIds.length || await sha256(stringifyJSON(headPayload)) !== manifestHash) throw new ContractError('STORAGE_CORRUPT', 'Saved bundle manifest changed; stored bytes retained for quarantine/recovery');
  // Hashing above can finish after this readonly transaction becomes inactive;
  // start a fresh transaction for the immutable payload reads.
  const dataTx = db.transaction(['recordRevisions', 'blobs'], 'readonly');
  // Start all reads in this task while the transaction is active.
  const recordRequests = head.recordIds.map(id => request(dataTx.objectStore('recordRevisions').get(id)));
  const hashes = [...new Set([...head.blobHashes, ...(head.legacyHash ? [head.legacyHash] : []), ...head.opaqueFiles.map(f => f.sha256), ...head.notices.map(f => f.sha256)])];
  const blobRequests = hashes.map(hash => request(dataTx.objectStore('blobs').get(hash)));
  const records = (await Promise.all(recordRequests)).map(bytes => new Uint8Array(bytes));
  for (let i = 0; i < records.length; i++) { const expected = head.recordDigests[i]; if (!expected || expected.revisionId !== head.recordIds[i] || records[i].length !== expected.byteLength || await sha256(records[i]) !== expected.sha256) throw new ContractError('STORAGE_CORRUPT', 'Saved record bytes differ from their committed digest; original store preserved for quarantine'); const record = parseJSON(records[i]); if (record.revisionId !== expected.revisionId || record.entityId !== expected.entityId || record.type !== expected.type) throw new ContractError('STORAGE_CORRUPT', 'Saved record envelope differs from its immutable descriptor'); }
  const data = new Map((await Promise.all(blobRequests)).map((bytes, i) => [hashes[i], bytes === undefined ? undefined : new Uint8Array(bytes)]));
  if ([...data.values()].some(bytes => bytes === undefined)) throw new ContractError('STORAGE_CORRUPT', 'Saved bundle has missing immutable bytes');
  for (const [hash, bytes] of data) if (await sha256(bytes) !== hash) throw new ContractError('STORAGE_CORRUPT', 'Saved blob hash mismatch');
  const store = new AuthoringStore({ bundleId, initialGeneration: Math.max(0, head.generation - 1) });
  await store.commit({ records, blobs: head.blobHashes.map(sha256 => ({ sha256, bytes: data.get(sha256) })), legacy: head.legacyHash ? data.get(head.legacyHash) : undefined, opaqueFiles: head.opaqueFiles.map(f => ({ path: f.path, bytes: data.get(f.sha256) })), notices: head.notices.map(f => ({ path: f.path, bytes: data.get(f.sha256) })), headUpdates: new Map(head.heads), expectedHeads: new Map(head.heads.map(([id]) => [id, null])), mode: 'IMPORT' });
  return { store, persistedGeneration: head.generation, warnings: ['Restored review assertions need trusted local reassociation before acceptance applicability.'] };
}
