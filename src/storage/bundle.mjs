import { FORMAT, SCHEMA_VERSION, SKELETON, BUNDLE_SCHEMA, RECORD_TYPES } from '../domain/contracts.mjs';
import { stringifyJSON, parseJSON, sha256, safePath, ContractError } from '../domain/safety.mjs';
import { validateSchema } from '../domain/schema-validator.mjs';
import { AuthoringStore } from './memory-store.mjs';
import { encodeZip, decodeZip } from './zip.mjs';

const metadata = async (path, bytes) => ({ path: safePath(path), sha256: await sha256(bytes), byteLength: bytes.length });
export async function exportBundle(store, { createdAt = new Date().toISOString() } = {}) {
  const snapshot = await store.snapshot(), files = new Map(), manifest = { format: FORMAT, version: SCHEMA_VERSION, bundleId: snapshot.bundleId, generation: snapshot.generation, createdAt, skeletonRef: { ...SKELETON }, records: [], blobs: [], heads: snapshot.heads.map(([entityId, revisionId]) => ({ entityId, revisionId })), legacy: null, opaqueFiles: [], notices: [] };
  const add = (path, bytes) => { safePath(path); if (files.has(path)) throw new ContractError('BUNDLE_PATH_COLLISION', 'Manifest entries collide'); files.set(path, bytes); };
  for (const entry of snapshot.records) { const record = parseJSON(entry.bytes), path = `records/${record.revisionId}.json`; add(path, entry.bytes); manifest.records.push({ ...await metadata(path, entry.bytes), revisionId: record.revisionId, entityId: record.entityId, type: record.type, required: true }); }
  for (const entry of snapshot.blobs) { const path = `blobs/sha256/${entry.sha256}`; add(path, entry.bytes); manifest.blobs.push({ ...await metadata(path, entry.bytes) }); }
  if (snapshot.legacy) { const path = 'legacy/original.corpus.zip'; add(path, snapshot.legacy); manifest.legacy = { ...await metadata(path, snapshot.legacy), format: 'sprite-foundry/corpus-package', version: 1 }; }
  for (const field of ['opaqueFiles', 'notices']) for (const entry of snapshot[field]) { add(entry.path, entry.bytes); manifest[field].push(await metadata(entry.path, entry.bytes)); }
  validateSchema(manifest, BUNDLE_SCHEMA); add('manifest.json', stringifyJSON(manifest));
  return { bytes: encodeZip(files), manifest };
}
export async function importBundle(input, { into = null } = {}) {
  const files = await decodeZip(input);
  if (!files.has('manifest.json')) throw new ContractError('BUNDLE_MANIFEST', 'Missing authoring manifest');
  const manifest = parseJSON(files.get('manifest.json')); validateSchema(manifest, BUNDLE_SCHEMA);
  const declared = new Set(['manifest.json']), records = [], blobs = [], opaqueFiles = [], notices = [];
  async function take(entry) {
    safePath(entry.path); if (declared.has(entry.path)) throw new ContractError('BUNDLE_DUPLICATE', 'Duplicate manifest path'); declared.add(entry.path);
    const bytes = files.get(entry.path);
    if (!bytes || bytes.length !== entry.byteLength || await sha256(bytes) !== entry.sha256) throw new ContractError('BUNDLE_INTEGRITY', `Missing/changed entry ${entry.path}`);
    return bytes;
  }
  for (const entry of manifest.records) {
    if (entry.path !== `records/${entry.revisionId}.json`) throw new ContractError('BUNDLE_RECORD_PATH', 'Record path must match revision ID');
    const bytes = await take(entry), record = parseJSON(bytes);
    if (record.entityId !== entry.entityId || record.revisionId !== entry.revisionId || record.type !== entry.type) throw new ContractError('BUNDLE_RECORD_ID', 'Record envelope/manifest identity mismatch');
    if (!RECORD_TYPES.includes(entry.type) || record.schemaVersion !== SCHEMA_VERSION) {
      if (entry.required) throw new ContractError('REQUIRED_SCHEMA', 'Unsupported required schema/type');
      opaqueFiles.push({ path: entry.path, bytes });
    } else records.push(bytes);
  }
  for (const entry of manifest.blobs) { if (entry.path !== `blobs/sha256/${entry.sha256}`) throw new ContractError('BUNDLE_BLOB_PATH', 'CAS path/hash mismatch'); blobs.push({ sha256: entry.sha256, bytes: await take(entry) }); }
  const legacy = manifest.legacy ? await take(manifest.legacy) : undefined;
  for (const entry of manifest.opaqueFiles) opaqueFiles.push({ path: entry.path, bytes: await take(entry) });
  for (const entry of manifest.notices) notices.push({ path: entry.path, bytes: await take(entry) });
  if (files.size !== declared.size) throw new ContractError('BUNDLE_UNDECLARED', 'Undeclared archive entries are not silently imported');
  const store = into ?? new AuthoringStore({ bundleId: manifest.bundleId });
  const heads = new Map(manifest.heads.map(h => [h.entityId, h.revisionId]));
  if (heads.size !== manifest.heads.length) throw new ContractError('HEAD_DUPLICATE', 'Duplicate entity head');
  const expectedHeads = new Map([...heads.keys()].map(id => [id, store.heads.get(id) ?? null]));
  // Import preserves review assertions but does not transfer local trusted authority.
  await store.commit({ records, blobs, legacy, opaqueFiles, notices, headUpdates: heads, expectedHeads, mode: 'IMPORT' });
  return { store, manifest, warnings: ['Imported review claims are historical assertions; trusted acceptance requires explicit local association/review.'] };
}
