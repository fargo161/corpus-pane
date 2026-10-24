import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { RECORD_SCHEMAS, BUNDLE_SCHEMA } from '../src/domain/contracts.mjs';
const root = new URL('../schemas/authoring/1.0.0/', import.meta.url);
await mkdir(root, { recursive: true });
for (const [name, schema] of Object.entries({ ...RECORD_SCHEMAS, bundle: BUNDLE_SCHEMA })) {
  const target = new URL(`${name}.schema.json`, root);
  const text = JSON.stringify(schema, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== text) throw Error(`Generated schema differs: ${name}`);
  } else await writeFile(target, text, 'utf8');
}
console.log(`${Object.keys(RECORD_SCHEMAS).length} record schemas and 1 bundle schema verified/generated.`);
