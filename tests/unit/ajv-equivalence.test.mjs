import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import { RECORD_SCHEMAS, BUNDLE_SCHEMA } from '../../src/domain/contracts.mjs';
import { validateSchema } from '../../src/domain/schema-validator.mjs';
import { utcDateTime } from '../../src/domain/formats.mjs';
import { sample } from './schema-sample.mjs';

const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
ajv.addFormat('date-time', { type: 'string', validate: utcDateTime });
for (const [name, schema] of Object.entries({ ...RECORD_SCHEMAS, bundle: BUNDLE_SCHEMA })) {
  test(`${name}: emitted schema compiles as Draft2020-12 and runtime agrees with Ajv`, () => {
    const compiled = ajv.compile(schema), good = sample(schema, schema), probes = [good];
    for (const field of schema.required) { const missing = structuredClone(good); delete missing[field]; probes.push(missing); }
    for (const [field, def] of Object.entries(schema.properties)) { const wrong = structuredClone(good); wrong[field] = def.type === 'string' ? [] : 'wrong'; probes.push(wrong); }
    if (good.payload) for (const field of schema.properties.payload.required) { const wrong = structuredClone(good); wrong.payload[field] = null; probes.push(wrong); }
    const unknown = structuredClone(good); unknown.unexpected = true; probes.push(unknown);
    const date = structuredClone(good); date.createdAt = '2026-02-30T00:00:00.000Z'; probes.push(date);
    for (const value of probes) {
      let local = true; try { validateSchema(value, schema); } catch { local = false; }
      assert.equal(local, compiled(value), `${name}: ${JSON.stringify(value).slice(0, 180)}; Ajv=${JSON.stringify(compiled.errors)}`);
    }
  });
}
