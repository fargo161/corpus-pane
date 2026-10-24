import test from 'node:test';
import assert from 'node:assert/strict';
import { RECORD_TYPES, RECORD_SCHEMAS } from '../../src/domain/contracts.mjs';
import { validateRecord } from '../../src/domain/schema-validator.mjs';
import { parseJSON, stringifyJSON, safePath } from '../../src/domain/safety.mjs';

import { sample } from './schema-sample.mjs';
for (const type of RECORD_TYPES) {
  test(`${type}: typed positive and every required payload field`, () => {
    const schema = RECORD_SCHEMAS[type], record = sample(schema, schema); assert.equal(validateRecord(record), true);
    for (const field of schema.properties.payload.required) { const bad = structuredClone(record); delete bad.payload[field]; assert.throws(() => validateRecord(bad), error => error.code === 'SCHEMA_INVALID', `${type}.${field} is required`); }
    const bad = structuredClone(record); bad.payload = []; assert.throws(() => validateRecord(bad));
    const unknown = structuredClone(record); unknown.payload.unregisteredCanonicalField = true; assert.throws(() => validateRecord(unknown));
    const optional = structuredClone(record); optional.extensions['future:roundtrip'] = { value: 7 }; assert.equal(validateRecord(optional), true);
  });
}
test('safe JSON rejects duplicate, escaped unsafe keys, nonfinite, deep and malformed input', () => {
  for (const input of ['{"a":1,"a":2}', '{"\\u005f_proto__":{}}', '{"constructor":1}', '[1e999]', '[01]', '[true,]', '{"a":"\\x"}', 'NaN']) assert.throws(() => parseJSON(input));
  assert.throws(() => parseJSON('['.repeat(66) + '0' + ']'.repeat(66)), e => e.code === 'JSON_LIMIT');
  assert.throws(() => stringifyJSON({ value: Infinity }));
  assert.deepEqual(parseJSON('{"future":{"ok":true},"n":-1.25e2}'), { future: { ok: true }, n: -125 });
});
test('strict UUID, UTC date and source-relative archive paths', () => {
  const schema = RECORD_SCHEMAS.PersonIdentity, record = sample(schema, schema);
  record.entityId = 'owner-provider-track-1'; assert.throws(() => validateRecord(record));
  record.entityId = crypto.randomUUID(); record.createdAt = '2026-02-30T01:00:00Z'; assert.throws(() => validateRecord(record));
  for (const path of ['../bad', '/bad', 'C:/bad', 'a\\b', 'a//b', 'a/./b', 'a/../b', 'a/']) assert.throws(() => safePath(path));
});
