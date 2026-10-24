import { DATABASE_NAME, FORMAT, SCHEMA_VERSION } from '../domain/contracts.mjs';
import { parseJSON, stringifyJSON, sha256, equalBytes, bytesOf, safePath, ContractError, LIMITS } from '../domain/safety.mjs';
import { validateRecord } from '../domain/schema-validator.mjs';
import { validateGraph, assertPlane } from '../domain/semantics.mjs';
import { validateSpatialPlanes, validateMeshPlanes } from '../domain/spatial.mjs';
import { ReviewAuthority, reviewIsFresh } from '../domain/review.mjs';

export class AuthoringStore {
  #records = new Map(); #blobs = new Map(); #heads = new Map(); #generation = 0;
  #legacy = null; #opaque = new Map(); #notices = new Map(); #trustedReviews = new Map(); #historical = new Set();
  constructor({ bundleId = crypto.randomUUID(), authority = new ReviewAuthority(), initialGeneration = 0 } = {}) {
    if (!Number.isSafeInteger(initialGeneration) || initialGeneration < 0) throw new ContractError('GENERATION', 'Invalid starting generation');
    Object.defineProperty(this, 'bundleId', { value: bundleId, enumerable: true });
    Object.defineProperty(this, 'authority', { value: authority }); this.#generation = initialGeneration;
  }
  get databaseName() { return DATABASE_NAME; }
  get generation() { return this.#generation; }
  get heads() { return new Map(this.#heads); }
  get recordCount() { return this.#records.size; }
  getRecord(revisionId) { const entry = this.#records.get(revisionId); return entry ? parseJSON(entry.bytes) : null; }
  getRecordBytes(revisionId) { return this.#records.get(revisionId)?.bytes.slice() ?? null; }
  getBlob(hash) { return this.#blobs.get(hash)?.slice() ?? null; }
  getLegacy() { return this.#legacy?.slice() ?? null; }
  getAllRecords() { return [...this.#records.keys()].map(id => this.getRecord(id)); }
  isApplicableAcceptance(event) {
    const records = new Map(this.getAllRecords().map(r => [r.revisionId, r]));
    if (!this.#trustedReviews.has(event.revisionId) || event.payload.decision !== 'ACCEPTED' || !reviewIsFresh(event, this.#heads, records)) return false;
    return !this.getAllRecords().some(r => r.type === 'ReviewEvent' && r.payload.previousEventRef === event.revisionId && r.payload.decision === 'REVOKED' && this.#trustedReviews.has(r.revisionId));
  }
  async commit({ records = [], blobs = [], headUpdates = new Map(), expectedHeads = new Map(), legacy = undefined, opaqueFiles = [], notices = [], reviewCommands = new Map(), mode = 'LOCAL', failBeforeCommit = false } = {}) {
    if (!['LOCAL', 'IMPORT'].includes(mode)) throw new ContractError('COMMIT_MODE', 'Unknown transaction mode');
    const baseGeneration = this.#generation;
    const stagedRecords = new Map(this.#records), stagedBlobs = new Map(this.#blobs), stagedHeads = new Map(this.#heads), stagedTrust = new Map(this.#trustedReviews), historical = new Set(this.#historical);
    const stagedOpaque = new Map(this.#opaque), stagedNotices = new Map(this.#notices);
    for (const [entityId, nextRevision] of headUpdates) {
      if (!expectedHeads.has(entityId) || (this.#heads.get(entityId) ?? null) !== expectedHeads.get(entityId)) throw new ContractError('STALE_HEAD', 'Head changed or expected revision was omitted');
      stagedHeads.set(entityId, nextRevision);
    }
    for (const input of blobs) {
      if (bytesOf(input.bytes).byteLength > LIMITS.archiveBytes) throw new ContractError('BLOB_LIMIT', 'Blob exceeds default storage cap');
      const data = bytesOf(input.bytes).slice(), hash = await sha256(data);
      if (hash !== input.sha256) throw new ContractError('BLOB_INTEGRITY', 'Blob identity does not match bytes');
      const prior = stagedBlobs.get(hash);
      if (prior && !equalBytes(prior, data)) throw new ContractError('BLOB_COLLISION', 'Hash reused for different bytes');
      stagedBlobs.set(hash, data);
    }
    for (const input of records) {
      const bytes = input instanceof Uint8Array ? input.slice() : stringifyJSON(input);
      const record = parseJSON(bytes); validateRecord(record);
      const prior = stagedRecords.get(record.revisionId);
      if (prior && !equalBytes(prior.bytes, bytes)) throw new ContractError('REVISION_COLLISION', 'Revision ID reused for different exact bytes');
      stagedRecords.set(record.revisionId, { bytes, sha256: await sha256(bytes) });
      if (mode === 'IMPORT') historical.add(record.revisionId);
      if (!prior && mode === 'LOCAL' && record.type === 'ReviewEvent' && record.payload.decision !== 'PROPOSED') stagedTrust.set(record.revisionId, this.authority.verify(reviewCommands.get(record.revisionId), record));
    }
    if (stagedRecords.size > LIMITS.recordCount) throw new ContractError('RECORD_LIMIT', 'Record count exceeded');
    const all = [...stagedRecords.values()].map(e => parseJSON(e.bytes));
    const byId = new Map(all.map(r => [r.revisionId, r]));
    const entities = new Map();
    for (const r of all) { const info = entities.get(r.entityId) ?? { type: r.type, roots: 0 }; if (info.type !== r.type) throw new ContractError('ENTITY_TYPE', 'Entity identity cannot change record type'); if (!r.parentRevisionIds.length && ++info.roots > 1) throw new ContractError('ENTITY_COLLISION', 'Independent roots collide; explicitly fork logical identity'); entities.set(r.entityId, info); }
    const applicable = event => stagedTrust.has(event.revisionId) && event.payload.decision === 'ACCEPTED' && reviewIsFresh(event, stagedHeads, byId) && !all.some(r => r.type === 'ReviewEvent' && r.payload.previousEventRef === event.revisionId && r.payload.decision === 'REVOKED' && stagedTrust.has(r.revisionId));
    validateGraph(all, { heads: stagedHeads, isApplicableAcceptance: applicable, historicalRevisionIds: historical });
    const checkHash = (hash, size) => {
      const data = stagedBlobs.get(hash);
      if (!data || (size !== undefined && data.byteLength !== size)) throw new ContractError('BLOB_MISSING', `Missing/mismatched referenced blob ${hash}`);
    };
    async function visitPlanes(value) {
      if (!value || typeof value !== 'object') return;
      if (Object.hasOwn(value, 'sha256') && Object.hasOwn(value, 'dtype') && Object.hasOwn(value, 'encoding')) { assertPlane(value); checkHash(value.sha256, value.byteLength); }
      else for (const child of Object.values(value)) await visitPlanes(child);
    }
    for (const r of all) {
      await visitPlanes(r.payload);
      if (r.type === 'SourceAsset') checkHash(r.payload.containerSha256, r.payload.byteLength);
      if (r.type === 'FrameObservation') { r.payload.blobRefs.forEach(hash => checkHash(hash)); if (!r.payload.blobRefs.includes(r.payload.frameRef.pixelSha256)) throw new ContractError('FRAME_PIXELS', 'Frame must retain its decoded pixel blob'); checkHash(r.payload.frameRef.pixelSha256, r.payload.frameRef.width * r.payload.frameRef.height * 4); }
      if (r.type === 'RawProviderObservation') r.payload.rawBlobRefs.forEach(hash => checkHash(hash));
      if (r.type === 'MotionTrack' && r.payload.legacyTrackSnapshotHash) checkHash(r.payload.legacyTrackSnapshotHash);
      if (r.type === 'SpatialEvidence') await validateSpatialPlanes(r, byId.get(r.payload.contributorTableRef), stagedBlobs);
      if (r.type === 'Mesh') await validateMeshPlanes(r, stagedBlobs);
    }
    const stagedLegacy = legacy === undefined ? this.#legacy : bytesOf(legacy).slice();
    if (this.#legacy && stagedLegacy && !equalBytes(this.#legacy, stagedLegacy)) throw new ContractError('LEGACY_IMMUTABLE', 'Original legacy snapshot cannot be replaced');
    for (const [destination, inputs] of [[stagedOpaque, opaqueFiles], [stagedNotices, notices]]) for (const { path, bytes } of inputs) {
      safePath(path);
      const data = bytesOf(bytes).slice(), prior = destination.get(path);
      if (prior && !equalBytes(prior, data)) throw new ContractError('OPAQUE_COLLISION', 'Opaque optional file identity collision');
      destination.set(path, data);
    }
    if (failBeforeCommit) throw new ContractError('INJECTED_CRASH', 'Simulated crash before atomic head advance');
    if (baseGeneration !== this.#generation) throw new ContractError('STALE_GENERATION', 'Concurrent transaction committed first');
    this.#records = stagedRecords; this.#blobs = stagedBlobs; this.#heads = stagedHeads; this.#trustedReviews = stagedTrust; this.#historical = historical;
    this.#legacy = stagedLegacy; this.#opaque = stagedOpaque; this.#notices = stagedNotices; this.#generation++;
    return { generation: this.#generation, recordCount: this.#records.size, heads: this.heads };
  }
  async snapshot() {
    return { format: FORMAT, version: SCHEMA_VERSION, bundleId: this.bundleId, generation: this.#generation, records: [...this.#records].map(([revisionId, e]) => ({ revisionId, bytes: e.bytes.slice(), sha256: e.sha256 })), blobs: [...this.#blobs].map(([sha256, bytes]) => ({ sha256, bytes: bytes.slice() })), heads: [...this.#heads], legacy: this.getLegacy(), opaqueFiles: [...this.#opaque].map(([path, bytes]) => ({ path, bytes: bytes.slice() })), notices: [...this.#notices].map(([path, bytes]) => ({ path, bytes: bytes.slice() })) };
  }
}
