import { bytesOf, encode, decode, safePath, ContractError, LIMITS } from '../domain/safety.mjs';
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { let n = i; for (let j = 0; j < 8; j++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
export function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
function checkPaths(entries, allowDirectories = false) {
  const seen = new Set();
  for (const [path] of entries) { const checked = allowDirectories && path.endsWith('/') ? path.slice(0, -1) : path; safePath(checked); const key = checked.normalize('NFC').toLowerCase(); if (seen.has(key)) throw new ContractError('ZIP_PATH_COLLISION', 'Duplicate/case-folded archive path'); seen.add(key); }
}
export function encodeZip(input) {
  const entries = [...input].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0); checkPaths(entries);
  if (entries.length > LIMITS.archiveEntries) throw new ContractError('ZIP_LIMIT', 'Archive entry count exceeded');
  let localSize = 0, centralSize = 0;
  const info = entries.map(([path, inputBytes]) => { const name = encode(path), bytes = bytesOf(inputBytes); const entry = { name, bytes, crc: crc32(bytes), offset: localSize }; localSize += 30 + name.length + bytes.length; centralSize += 46 + name.length; return entry; });
  const total = localSize + centralSize + 22;
  if (total > LIMITS.archiveBytes) throw new ContractError('ZIP_LIMIT', 'Archive byte cap exceeded');
  const result = new Uint8Array(total), view = new DataView(result.buffer); let at = 0;
  for (const item of info) {
    view.setUint32(at, 0x04034b50, true); view.setUint16(at + 4, 20, true); view.setUint16(at + 6, 0x800, true);
    view.setUint16(at + 12, 0x21, true); view.setUint32(at + 14, item.crc, true); view.setUint32(at + 18, item.bytes.length, true); view.setUint32(at + 22, item.bytes.length, true); view.setUint16(at + 26, item.name.length, true);
    result.set(item.name, at + 30); result.set(item.bytes, at + 30 + item.name.length); at += 30 + item.name.length + item.bytes.length;
  }
  const centralOffset = at;
  for (const item of info) {
    view.setUint32(at, 0x02014b50, true); view.setUint16(at + 4, 20, true); view.setUint16(at + 6, 20, true); view.setUint16(at + 8, 0x800, true); view.setUint16(at + 14, 0x21, true); view.setUint32(at + 16, item.crc, true); view.setUint32(at + 20, item.bytes.length, true); view.setUint32(at + 24, item.bytes.length, true); view.setUint16(at + 28, item.name.length, true); view.setUint32(at + 42, item.offset, true); result.set(item.name, at + 46); at += 46 + item.name.length;
  }
  view.setUint32(at, 0x06054b50, true); view.setUint16(at + 8, entries.length, true); view.setUint16(at + 10, entries.length, true); view.setUint32(at + 12, centralSize, true); view.setUint32(at + 16, centralOffset, true);
  return result;
}
async function inflateBounded(bytes, expected) {
  let stream;
  try { stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')); } catch { throw new ContractError('ZIP_COMPRESSION', 'Deflate unsupported by this runtime'); }
  const reader = stream.getReader(), result = new Uint8Array(expected); let at = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; if (at + value.length > expected) { await reader.cancel(); throw new ContractError('ZIP_BOMB', 'Expanded entry exceeds declared bounded size'); } result.set(value, at); at += value.length; }
  } catch (error) { if (error instanceof ContractError) throw error; throw new ContractError('ZIP_DEFLATE', 'Invalid compressed ZIP entry'); }
  if (at !== expected) throw new ContractError('ZIP_LENGTH', 'Expanded ZIP length mismatch'); return result;
}
export async function decodeZip(input) {
  const bytes = bytesOf(input);
  if (bytes.length < 22 || bytes.length > LIMITS.archiveBytes) throw new ContractError('ZIP_LIMIT', 'Invalid archive size');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== view.getUint16(end + 10, true)) throw new ContractError('ZIP_DIRECTORY', 'Missing/unsupported ZIP directory');
  const count = view.getUint16(end + 10, true), centralSize = view.getUint32(end + 12, true), centralOffset = view.getUint32(end + 16, true);
  if (count > LIMITS.archiveEntries || centralOffset + centralSize !== end) throw new ContractError('ZIP_LIMIT', 'Invalid bounded ZIP directory');
  const entries = [], occupied = []; let at = centralOffset, total = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50) throw new ContractError('ZIP_ENTRY', 'Truncated central entry');
    const flags = view.getUint16(at + 8, true), method = view.getUint16(at + 10, true), crc = view.getUint32(at + 16, true), compressed = view.getUint32(at + 20, true), size = view.getUint32(at + 24, true), nameSize = view.getUint16(at + 28, true), extraSize = view.getUint16(at + 30, true), commentSize = view.getUint16(at + 32, true), disk = view.getUint16(at + 34, true), attr = view.getUint32(at + 38, true), offset = view.getUint32(at + 42, true);
    if (flags & ~0x808 || ![0, 8].includes(method) || disk || compressed === 0xffffffff || size === 0xffffffff || offset === 0xffffffff || ((attr >>> 16) & 0xf000) === 0xa000) throw new ContractError('ZIP_FEATURE', 'Encrypted, ZIP64, symlink or unsupported ZIP entry');
    const entryEnd = at + 46 + nameSize + extraSize + commentSize;
    if (entryEnd > end) throw new ContractError('ZIP_ENTRY', 'Central field exceeds directory');
    const nameBytes = bytes.slice(at + 46, at + 46 + nameSize);
    if (!(flags & 0x800) && nameBytes.some(b => b >= 128)) throw new ContractError('ZIP_NAME', 'Non-UTF8 archive name unsupported');
    const path = decode(nameBytes), directory = path.endsWith('/'); safePath(directory ? path.slice(0, -1) : path);
    if (directory && size !== 0) throw new ContractError('ZIP_DIRECTORY_DATA', 'Directory entry contains file data');
    if (offset + 30 > centralOffset || view.getUint32(offset, true) !== 0x04034b50) throw new ContractError('ZIP_LOCAL', 'Invalid local header');
    const localNameSize = view.getUint16(offset + 26, true), localExtraSize = view.getUint16(offset + 28, true), start = offset + 30 + localNameSize + localExtraSize, stop = start + compressed;
    const localCRC = view.getUint32(offset + 14, true), localCompressed = view.getUint32(offset + 18, true), localSize = view.getUint32(offset + 22, true);
    if (view.getUint16(offset + 6, true) !== flags || view.getUint16(offset + 8, true) !== method || (!(flags & 8) && (localCRC !== crc || localCompressed !== compressed || localSize !== size)) || ((flags & 8) && ((localCRC && localCRC !== crc) || (localCompressed && localCompressed !== compressed) || (localSize && localSize !== size))) || decode(bytes.slice(offset + 30, offset + 30 + localNameSize)) !== path || stop > centralOffset) throw new ContractError('ZIP_LOCAL', 'Local/central entry disagreement');
    let occupiedEnd = stop;
    if (flags & 8) { let descriptor = stop; if (descriptor + 4 <= centralOffset && view.getUint32(descriptor, true) === 0x08074b50) descriptor += 4; if (descriptor + 12 > centralOffset || view.getUint32(descriptor, true) !== crc || view.getUint32(descriptor + 4, true) !== compressed || view.getUint32(descriptor + 8, true) !== size) throw new ContractError('ZIP_DESCRIPTOR', 'Invalid bounded data descriptor'); occupiedEnd = descriptor + 12; }
    if (occupied.some(([a, b]) => offset < b && occupiedEnd > a)) throw new ContractError('ZIP_OVERLAP', 'Overlapping ZIP entries'); occupied.push([offset, occupiedEnd]);
    total += size; if (total > LIMITS.archiveBytes) throw new ContractError('ZIP_BOMB', 'Uncompressed archive size cap exceeded');
    entries.push({ path, directory, method, crc, compressed, size, start, stop }); at = entryEnd;
  }
  if (at !== end) throw new ContractError('ZIP_DIRECTORY', 'Unexpected directory bytes'); checkPaths(entries.map(e => [e.path]), true);
  const result = new Map();
  for (const e of entries) { const content = e.method === 0 ? bytes.slice(e.start, e.stop) : await inflateBounded(bytes.slice(e.start, e.stop), e.size); if (content.length !== e.size || crc32(content) !== e.crc) throw new ContractError('ZIP_CRC', 'Archive CRC/length check failed'); if (!e.directory) result.set(e.path, content); }
  return result;
}
