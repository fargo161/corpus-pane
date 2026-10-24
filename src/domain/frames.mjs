import { ContractError } from './safety.mjs';
export function compareTime(a, b) {
  const left = BigInt(a.ptsTicks) * BigInt(a.timeBaseNum) * BigInt(b.timeBaseDen);
  const right = BigInt(b.ptsTicks) * BigInt(b.timeBaseNum) * BigInt(a.timeBaseDen);
  return left < right ? -1 : left > right ? 1 : 0;
}
export function frameKey(f) { return JSON.stringify({ sourceSha256: f.sourceSha256, streamIndex: f.streamIndex, decodeIndex: f.decodeIndex, ptsTicks: f.ptsTicks, timeBaseNum: f.timeBaseNum, timeBaseDen: f.timeBaseDen, pixelSha256: f.pixelSha256, width: f.width, height: f.height, decoderIdentity: { name: f.decoderIdentity.name, version: f.decoderIdentity.version, codeSha256: f.decoderIdentity.codeSha256, configSha256: f.decoderIdentity.configSha256 } }); }
export function compareFrames(a, b) {
  if (a.sourceSha256 !== b.sourceSha256 || a.streamIndex !== b.streamIndex) throw new ContractError('FRAME_DOMAIN', 'Cannot order frames across sources or streams');
  return compareTime(a, b) || a.decodeIndex - b.decodeIndex;
}
export function assertInterval(interval) {
  if (compareTime(interval.start, interval.end) > 0 || (compareTime(interval.start, interval.end) === 0 && (!interval.includeStart || !interval.includeEnd))) throw new ContractError('TIME_INTERVAL', 'Invalid or empty native-time interval');
}
