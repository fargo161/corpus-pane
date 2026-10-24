import { decodeZip } from '../storage/zip.mjs';
import { parseJSON, sha256, safePath, ContractError } from '../domain/safety.mjs';
// This adapter inventories an exported legacy backup, never the live legacy DB.
// Source bytes are retained verbatim, including unknown metadata and owner-pending states.
export async function inspectLegacySnapshot(bytes) {
  const files = await decodeZip(bytes), manifestBytes = files.get('manifest.json');
  if (!manifestBytes) throw new ContractError('LEGACY_FORMAT', 'Legacy backup has no manifest');
  const manifest = parseJSON(manifestBytes, { jsonBytes: 150 * 1024 * 1024, depth: 64, nodes: 1000000, arrayItems: 100000 });
  if (manifest.format !== 'sprite-foundry/corpus-package' || manifest.version !== 1) throw new ContractError('LEGACY_FORMAT', 'Expected immutable corpus package format 1');
  if (![manifest.contents, manifest.clips, manifest.media].every(Array.isArray)) throw new ContractError('LEGACY_MANIFEST', 'Incomplete legacy portable manifest');
  const declared = new Set();
  for (const entry of manifest.contents) {
    safePath(entry.path);
    if (declared.has(entry.path) || !/^[0-9a-f]{64}$/.test(entry.sha256) || !files.has(entry.path) || await sha256(files.get(entry.path)) !== entry.sha256) throw new ContractError('LEGACY_INTEGRITY', 'Legacy content checksum missing, repeated or changed');
    declared.add(entry.path);
  }
  const required = ['corpus.header.json', 'media/index.json', 'references/index.json', 'comparisons/index.json', ...manifest.clips.flatMap(clip => [clip.record, clip.track]), ...manifest.media.filter(media => media.file).map(media => media.file)];
  if (required.some(path => !declared.has(path))) throw new ContractError('LEGACY_CHECKSUM', 'Legacy required entry has no checksum');
  const clipIds = new Set();
  for (const clip of manifest.clips) {
    const record = parseJSON(files.get(clip.record)), track = parseJSON(files.get(clip.track));
    if (clipIds.has(clip.id) || record.id !== clip.id || track.format !== 'adventure-studio/unified-prep' || track.formatVersion !== 4 || track.schema?.id !== 'adventure-studio/universal-skeleton' || track.schema?.version !== '1.2.0') throw new ContractError('LEGACY_CLIP', 'Legacy clip/track identity or canonical language mismatch');
    clipIds.add(clip.id);
  }
  const mediaIndex = parseJSON(files.get('media/index.json'));
  for (const media of manifest.media) {
    if (media.file) {
      const source = files.get(media.file);
      if (!source || await sha256(source) !== media.sha256 || mediaIndex[media.sha256]?.bytes !== source.length) throw new ContractError('LEGACY_MEDIA', 'Legacy original media hash/size mismatch');
    } else if (media.available) throw new ContractError('LEGACY_MEDIA', 'Missing media cannot be marked available');
  }
  const inventory = [];
  for (const [path, content] of files) inventory.push({ path, byteLength: content.length, sha256: await sha256(content) });
  const header = files.has('corpus.header.json') ? parseJSON(files.get('corpus.header.json')) : null;
  return { sha256: await sha256(bytes), byteLength: bytes.length, manifest, header, inventory, missingMedia: manifest.media.filter(media => !media.file).map(media => media.sha256), migration: 'OPAQUE_PRESERVATION', acceptanceChanged: false, warnings: ['Inventory/integrity is not production acceptance; partial/pending legacy entries remain unchanged.'] };
}
export async function attachLegacySnapshot(store, bytes) { const report = await inspectLegacySnapshot(bytes); await store.commit({ legacy: bytes }); return report; }
export function legacyExportLossInventory(store) {
  return { originalBytes: store.getLegacy(), legacyModified: false, newAuthoringRecordCount: store.recordCount, lostIfOnlyLegacyKept: store.recordCount ? ['Revisioned authoring records, spatial contributor planes, layered modules and job/review history remain exclusively in the full .cp-authoring.zip.'] : [], requiresExplicitAcknowledgment: store.recordCount > 0 };
}
