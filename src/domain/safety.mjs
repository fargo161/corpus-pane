export class ContractError extends Error {
  constructor(code, message, details = []) { super(message); this.name = 'ContractError'; this.code = code; this.details = details; }
}
export const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
export const LIMITS = Object.freeze({ jsonBytes: 16 * 1024 * 1024, depth: 64, nodes: 1000000, arrayItems: 100000, recordCount: 10000, archiveEntries: 20000, archiveBytes: 256 * 1024 * 1024, planePixels: 16777216 });
export const bytesOf = value => value instanceof Uint8Array ? value : new Uint8Array(value);
export const encode = value => new TextEncoder().encode(value);
export const decode = value => new TextDecoder('utf-8', { fatal: true }).decode(value);

// JSON.parse discards duplicate keys. Parse before construction so collisions and unsafe
// keys fail closed, including escaped spellings such as "\u005f_proto__".
export function parseJSON(input, limits = LIMITS) {
  const data = typeof input === 'string' ? encode(input) : bytesOf(input);
  if (data.byteLength > limits.jsonBytes) throw new ContractError('JSON_LIMIT', 'JSON byte limit exceeded');
  let text;
  try { text = decode(data); } catch { throw new ContractError('JSON_UTF8', 'Invalid UTF-8'); }
  let i = 0, nodes = 0;
  const fail = reason => { throw new ContractError('JSON_SYNTAX', `${reason} at offset ${i}`); };
  const ws = () => { while (/[\t\n\r ]/.test(text[i] ?? '\0')) i++; };
  function string() {
    const start = i++;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i++] === '"') {
        try { return JSON.parse(text.slice(start, i)); } catch { fail('Invalid string'); }
      }
    }
    fail('Unterminated string');
  }
  function value(depth) {
    if (depth > limits.depth || ++nodes > limits.nodes) throw new ContractError('JSON_LIMIT', 'JSON depth/node limit exceeded');
    ws(); const c = text[i];
    if (c === '"') return string();
    if (c === '{') {
      i++; ws(); const result = {}; const seen = new Set();
      if (text[i] === '}') { i++; return result; }
      while (true) {
        ws(); if (text[i] !== '"') fail('Expected key');
        const key = string();
        if (seen.has(key)) throw new ContractError('DUPLICATE_KEY', `Duplicate JSON key: ${key}`);
        if (FORBIDDEN_KEYS.has(key)) throw new ContractError('UNSAFE_KEY', `Unsafe JSON key: ${key}`);
        seen.add(key); ws(); if (text[i++] !== ':') fail('Expected colon');
        result[key] = value(depth + 1); ws();
        if (text[i] === '}') { i++; return result; }
        if (text[i++] !== ',') fail('Expected comma');
      }
    }
    if (c === '[') {
      i++; ws(); const result = [];
      if (text[i] === ']') { i++; return result; }
      while (true) {
        if (result.length >= limits.arrayItems) throw new ContractError('JSON_LIMIT', 'Array item limit exceeded');
        result.push(value(depth + 1)); ws();
        if (text[i] === ']') { i++; return result; }
        if (text[i++] !== ',') fail('Expected comma');
      }
    }
    for (const [word, literal] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(word, i)) { i += word.length; return literal; }
    }
    const token = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (!token) fail('Expected JSON value');
    i += token[0].length; const number = Number(token[0]);
    if (!Number.isFinite(number)) throw new ContractError('NON_FINITE', 'Non-finite JSON number');
    return number;
  }
  const result = value(0); ws(); if (i !== text.length) fail('Trailing content'); return result;
}

export function assertSafeValue(value, depth = 0, counter = { nodes: 0 }) {
  if (depth > LIMITS.depth || ++counter.nodes > LIMITS.nodes) throw new ContractError('JSON_LIMIT', 'Object limit exceeded');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new ContractError('NON_FINITE', 'Non-finite value');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return;
  if (typeof value !== 'object') throw new ContractError('NOT_JSON', 'Only JSON values may be persisted');
  if (Array.isArray(value)) {
    if (value.length > LIMITS.arrayItems) throw new ContractError('JSON_LIMIT', 'Array limit exceeded');
    for (const item of value) assertSafeValue(item, depth + 1, counter);
  } else {
    if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new ContractError('NOT_JSON', 'Non-plain object');
    for (const [key, item] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) throw new ContractError('UNSAFE_KEY', `Unsafe key: ${key}`);
      assertSafeValue(item, depth + 1, counter);
    }
  }
}
export function stringifyJSON(value) { assertSafeValue(value); const bytes = encode(JSON.stringify(value)); if (bytes.length > LIMITS.jsonBytes) throw new ContractError('JSON_LIMIT', 'JSON byte limit exceeded'); return bytes; }
export const cloneJSON = value => parseJSON(stringifyJSON(value));
export function safePath(path) {
  if (typeof path !== 'string' || !path.length || path.length > 1024 || /[\\\0:\u0000-\u001f]/.test(path) || path.startsWith('/') || path.endsWith('/') || path.split('/').some(p => p === '..' || p === '.' || !p || /[ .]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) throw new ContractError('UNSAFE_PATH', `Unsafe archive path: ${path}`);
  return path;
}
export async function sha256(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytesOf(bytes)))].map(n => n.toString(16).padStart(2, '0')).join('');
}
export function equalBytes(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }
