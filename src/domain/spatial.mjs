import { ContractError, sha256 } from './safety.mjs';
import { ORIGIN } from './contracts.mjs';
import { assertPlane } from './semantics.mjs';

export function summarizeContributors(set) {
  if (!set.length) return ORIGIN.UNKNOWN;
  if (set.some(c => c.state === 'INFERRED')) return ORIGIN.INFERRED;
  if (set.some(c => c.state === 'RECOVERED')) return ORIGIN.RECOVERED;
  return ORIGIN.OBSERVED;
}
export async function readPlane(descriptor, blobs, constraints = {}) {
  assertPlane(descriptor, constraints);
  const bytes = blobs.get(descriptor.sha256);
  if (!bytes || bytes.byteLength !== descriptor.byteLength || await sha256(bytes) !== descriptor.sha256) throw new ContractError('BLOB_INTEGRITY', 'Plane missing or hash/length mismatch');
  if (descriptor.encoding !== 'RAW') return bytes; // Encoded image verification belongs to the decoder adapter.
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (descriptor.dtype === 'u8') return bytes;
  const count = bytes.byteLength / 4;
  const result = descriptor.dtype === 'u32' ? new Uint32Array(count) : new Float32Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = descriptor.dtype === 'u32' ? data.getUint32(i * 4, true) : data.getFloat32(i * 4, true);
    if (!Number.isFinite(result[i])) throw new ContractError('NON_FINITE_PLANE', 'Non-finite plane sample');
  }
  return result;
}
export async function validateSpatialPlanes(record, contributorTable, blobs) {
  const p = record.payload;
  const shape = { width: p.width, height: p.height, channels: 1, rawOnly: true };
  const [coverage, origins, indices] = await Promise.all([readPlane(p.coverageBlob, blobs, { ...shape, dtype: 'u8' }), readPlane(p.originBlob, blobs, { ...shape, dtype: 'u8' }), readPlane(p.contributorIndexBlob, blobs, { ...shape, dtype: 'u32' })]);
  if (p.uncertaintyBlob) await readPlane(p.uncertaintyBlob, blobs, { ...shape, dtype: 'u8' });
  for (let i = 0; i < origins.length; i++) {
    if (coverage[i] !== 0 && coverage[i] !== 255) throw new ContractError('COVERAGE_CODE', 'Coverage is a binary valid-support plane (0/255), separate from alpha');
    if (origins[i] > 3 || indices[i] >= contributorTable.payload.sets.length) throw new ContractError('ORIGIN_CODE', 'Invalid origin or contributor index');
    const summary = summarizeContributors(contributorTable.payload.sets[indices[i]]);
    if (origins[i] !== summary) throw new ContractError('ORIGIN_UPGRADE', 'Spatial origin disagrees with retained contributors');
    if (!coverage[i] && (origins[i] !== ORIGIN.UNKNOWN || indices[i] !== 0)) throw new ContractError('COVERAGE_ORIGIN', 'Unresolved coverage cannot assert supported texture');
    if (coverage[i] && origins[i] === ORIGIN.UNKNOWN) throw new ContractError('UNKNOWN_COVERAGE', 'Unknown texture cannot assert valid support');
  }
}

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
function properCross(a, b, c, d) { return cross(a, b, c) * cross(a, b, d) < -1e-12 && cross(c, d, a) * cross(c, d, b) < -1e-12; }
function inside(point, ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
export async function validateMeshPlanes(record, blobs) {
  const p = record.payload;
  const xy = await readPlane(p.restXYBlob, blobs, { channels: 2, dtype: 'f32', rawOnly: true });
  await readPlane(p.uvBlob, blobs, { channels: 2, dtype: 'f32', rawOnly: true });
  const indices = await readPlane(p.triangleIndexBlob, blobs, { channels: 3, dtype: 'u32', rawOnly: true });
  const vertices = Array.from({ length: xy.length / 2 }, (_, i) => [xy[i * 2], xy[i * 2 + 1]]);
  const rings = p.constrainedRings.map(r => ({ ...r, points: r.indices.map(i => vertices[i]) }));
  for (const ring of rings) for (let i = 0; i < ring.points.length; i++) for (let j = i + 1; j < ring.points.length; j++) {
    if (properCross(ring.points[i], ring.points[(i + 1) % ring.points.length], ring.points[j], ring.points[(j + 1) % ring.points.length])) throw new ContractError('RING_INTERSECTION', 'Constraint ring self-intersects');
  }
  const triangleKeys = new Set();
  for (let i = 0; i < indices.length; i += 3) {
    const ids = [indices[i], indices[i + 1], indices[i + 2]];
    if (new Set(ids).size !== 3 || ids.some(id => id >= vertices.length)) throw new ContractError('TRIANGLE_INDEX', 'Invalid triangle indices');
    const key = [...ids].sort((a, b) => a - b).join(',');
    if (triangleKeys.has(key)) throw new ContractError('TRIANGLE_DUPLICATE', 'Duplicate triangle'); triangleKeys.add(key);
    const points = ids.map(id => vertices[id]), islandId = p.islandIds[ids[0]];
    if (ids.some(id => p.islandIds[id] !== islandId)) throw new ContractError('ISLAND_BRIDGE', 'Triangle bridges separate islands');
    if (cross(...points) <= 1e-8) throw new ContractError('TRIANGLE_INVERTED', 'Rest triangle inverted or degenerate; positive 2D winding required');
    const center = [(points[0][0] + points[1][0] + points[2][0]) / 3, (points[0][1] + points[1][1] + points[2][1]) / 3];
    const outers = rings.filter(r => r.islandId === islandId && r.kind === 'OUTER');
    if (!outers.length || !outers.some(r => inside(center, r.points))) throw new ContractError('OUTER_COVERAGE', 'Triangle lies outside constrained island');
    for (const ring of rings.filter(r => r.islandId === islandId)) {
      if (ring.kind === 'HOLE' && (inside(center, ring.points) || ring.points.some(point => !points.some(p => same(p, point)) && cross(points[0], points[1], point) > 1e-8 && cross(points[1], points[2], point) > 1e-8 && cross(points[2], points[0], point) > 1e-8))) throw new ContractError('HOLE_BRIDGE', 'Triangle covers constrained hole');
      for (let edge = 0; edge < 3; edge++) for (let j = 0; j < ring.points.length; j++) if (properCross(points[edge], points[(edge + 1) % 3], ring.points[j], ring.points[(j + 1) % ring.points.length])) throw new ContractError('RING_BRIDGE', 'Triangle crosses constraint boundary');
    }
    for (const seam of p.seamEdges) for (let edge = 0; edge < 3; edge++) if (properCross(points[edge], points[(edge + 1) % 3], vertices[seam[0]], vertices[seam[1]])) throw new ContractError('SEAM_BRIDGE', 'Triangle crosses constrained seam');
  }
}
