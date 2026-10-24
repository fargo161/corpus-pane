import { RECORD_SCHEMAS } from './contracts.mjs';
import { assertSafeValue, ContractError } from './safety.mjs';
import { utcDateTime } from './formats.mjs';

// Deterministic interpreter for the small, explicitly emitted Draft2020-12 keyword set.
// No coercion, remote resolution, eval, mutation or schema-supplied executable code.
export function validateSchema(value, schema, { root = schema } = {}) {
  assertSafeValue(value);
  const errors = [];
  const canonical = v => v && typeof v === 'object' ? (Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`) : JSON.stringify(v);
  const equal = (a, b) => canonical(a) === canonical(b);
  function walk(v, s, path, out) {
    if (s.$ref) {
      if (!s.$ref.startsWith('#/')) throw new ContractError('REMOTE_SCHEMA', 'Remote schema resolution forbidden');
      const target = s.$ref.slice(2).split('/').reduce((n, k) => n?.[k], root);
      if (!target) throw new ContractError('SCHEMA_REF', `Unresolved schema reference ${s.$ref}`);
      return walk(v, target, path, out);
    }
    const error = message => out.push(`${path}: ${message}`);
    if (s.anyOf) { if (!s.anyOf.some(branch => { const e = []; walk(v, branch, path, e); return !e.length; })) error('does not match any allowed type'); return; }
    if ('const' in s && !equal(v, s.const)) error(`must equal ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.some(item => equal(v, item))) error('unknown enum value');
    if (s.type) {
      const valid = s.type === 'null' ? v === null : s.type === 'array' ? Array.isArray(v) : s.type === 'object' ? !!v && typeof v === 'object' && !Array.isArray(v) : s.type === 'integer' ? Number.isSafeInteger(v) : typeof v === s.type;
      if (!valid) { error(`expected ${s.type}`); return; }
    }
    if (typeof v === 'string') {
      if (s.minLength !== undefined && [...v].length < s.minLength) error('string too short');
      if (s.maxLength !== undefined && [...v].length > s.maxLength) error('string too long');
      if (s.pattern && !new RegExp(s.pattern).test(v)) error('string pattern mismatch');
      if (s.format === 'date-time') {
        if (!utcDateTime(v)) error('invalid UTC date-time');
      }
    }
    if (typeof v === 'number') {
      if (s.minimum !== undefined && v < s.minimum) error('below minimum');
      if (s.maximum !== undefined && v > s.maximum) error('above maximum');
      if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum) error('below exclusive minimum');
    }
    if (Array.isArray(v)) {
      if (s.minItems !== undefined && v.length < s.minItems) error('too few items');
      if (s.maxItems !== undefined && v.length > s.maxItems) error('too many items');
      if (s.uniqueItems && new Set(v.map(canonical)).size !== v.length) error('duplicate item');
      if (s.items) v.forEach((item, i) => walk(item, s.items, `${path}/${i}`, out));
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const key of s.required ?? []) if (!Object.hasOwn(v, key)) error(`missing ${key}`);
      if (s.maxProperties !== undefined && Object.keys(v).length > s.maxProperties) error('too many properties');
      for (const [key, item] of Object.entries(v)) {
        if (s.properties && Object.hasOwn(s.properties, key)) walk(item, s.properties[key], `${path}/${key}`, out);
        else if (s.additionalProperties === false) error(`unknown field ${key}; use extensions for optional data`);
        else if (s.additionalProperties && typeof s.additionalProperties === 'object') walk(item, s.additionalProperties, `${path}/${key}`, out);
      }
    }
  }
  walk(value, schema, '$', errors);
  if (errors.length) throw new ContractError('SCHEMA_INVALID', 'Record violates schema', errors);
  return true;
}
export function validateRecord(record) {
  const schema = RECORD_SCHEMAS[record?.type];
  if (!schema) throw new ContractError('UNKNOWN_RECORD_TYPE', `Unsupported required record type ${record?.type}`);
  return validateSchema(record, schema);
}
