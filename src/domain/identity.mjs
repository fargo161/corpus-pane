import { SCHEMA_VERSION } from './contracts.mjs';
import { cloneJSON, ContractError } from './safety.mjs';
import { validateRecord } from './schema-validator.mjs';

export function createRecord(type, payload, { actorId, entityId = crypto.randomUUID(), revisionId = crypto.randomUUID(), parentRevisionIds = [], derivedFrom = [], createdAt = new Date().toISOString(), extensions = {} } = {}) {
  const record = { schemaVersion: SCHEMA_VERSION, type, entityId, revisionId, parentRevisionIds, createdAt, actorId, payload, derivedFrom, extensions };
  validateRecord(record);
  return cloneJSON(record);
}
export function reviseRecord(previous, payload, { actorId, derivedFrom = previous.derivedFrom, createdAt } = {}) {
  if (!previous || !actorId) throw new ContractError('REVISION_ACTOR', 'Revision requires previous record and explicit actor');
  return createRecord(previous.type, payload, { actorId, entityId: previous.entityId, parentRevisionIds: [previous.revisionId], derivedFrom, extensions: previous.extensions, createdAt });
}
