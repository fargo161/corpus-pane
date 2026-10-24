export function sample(schema, root) {
  if (schema.$ref) return sample(schema.$ref.slice(2).split('/').reduce((o, k) => o[k], root), root);
  if ('const' in schema) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.anyOf) return sample(schema.anyOf[0], root);
  if (schema.type === 'null') return null;
  if (schema.type === 'boolean') return false;
  if (schema.type === 'number' || schema.type === 'integer') return schema.minimum ?? (schema.exclusiveMinimum === undefined ? 0 : schema.exclusiveMinimum + 1);
  if (schema.type === 'string') {
    if (schema.format === 'date-time') return '2026-10-24T00:00:00.000Z';
    if (schema.pattern?.includes('4[0-9a-f]')) return crypto.randomUUID();
    if (schema.pattern?.includes('{64}')) return 'a'.repeat(64);
    if (schema.pattern?.includes('{40}')) return 'a'.repeat(40);
    if (schema.pattern?.includes('[1-9]')) return '0';
    return 'sample';
  }
  if (schema.type === 'array') return Array.from({ length: schema.minItems ?? 0 }, () => sample(schema.items, root));
  if (schema.type === 'object') return Object.fromEntries((schema.required ?? []).map(key => [key, sample(schema.properties[key], root)]));
  throw Error('No sample implementation');
}
