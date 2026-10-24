import { DATABASE_NAME } from '../domain/contracts.mjs';
import { AuthoringStore } from './memory-store.mjs';
import { sha256, equalBytes, ContractError } from '../domain/safety.mjs';
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
  const head = { bundleId: snapshot.bundleId, generation: snapshot.generation, recordIds: snapshot.records.map(r => r.revisionId), blobHashes: snapshot.blobs.map(b => b.sha256), heads: snapshot.heads, legacyHash, opaqueFiles: extraBlobs.filter(b => b.field === 'opaqueFiles').map(({ path, sha256 }) => ({ path, sha256 })), notices: extraBlobs.filter(b => b.field === 'notices').map(({ path, sha256 }) => ({ path, sha256 })) };
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
  // Start all reads in this task while the transaction is active.
  const recordRequests = head.recordIds.map(id => request(tx.objectStore('recordRevisions').get(id)));
  const hashes = [...new Set([...head.blobHashes, ...(head.legacyHash ? [head.legacyHash] : []), ...head.opaqueFiles.map(f => f.sha256), ...head.notices.map(f => f.sha256)])];
  const blobRequests = hashes.map(hash => request(tx.objectStore('blobs').get(hash)));
  const records = (await Promise.all(recordRequests)).map(bytes => new Uint8Array(bytes));
  const data = new Map((await Promise.all(blobRequests)).map((bytes, i) => [hashes[i], bytes === undefined ? undefined : new Uint8Array(bytes)]));
  if ([...data.values()].some(bytes => bytes === undefined)) throw new ContractError('STORAGE_CORRUPT', 'Saved bundle has missing immutable bytes');
  for (const [hash, bytes] of data) if (await sha256(bytes) !== hash) throw new ContractError('STORAGE_CORRUPT', 'Saved blob hash mismatch');
  const store = new AuthoringStore({ bundleId, initialGeneration: Math.max(0, head.generation - 1) });
  await store.commit({ records, blobs: head.blobHashes.map(sha256 => ({ sha256, bytes: data.get(sha256) })), legacy: head.legacyHash ? data.get(head.legacyHash) : undefined, opaqueFiles: head.opaqueFiles.map(f => ({ path: f.path, bytes: data.get(f.sha256) })), notices: head.notices.map(f => ({ path: f.path, bytes: data.get(f.sha256) })), headUpdates: new Map(head.heads), expectedHeads: new Map(head.heads.map(([id]) => [id, null])), mode: 'IMPORT' });
  return { store, persistedGeneration: head.generation, warnings: ['Restored review assertions need trusted local reassociation before acceptance applicability.'] };
}
