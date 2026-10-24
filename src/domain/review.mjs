import { ContractError, equalBytes } from './safety.mjs';
import { validateRecord } from './schema-validator.mjs';
const OWNER_SCOPES = new Set(['FAMILY', 'ASSET', 'ANCHOR', 'PAIR', 'RELEASE']);

// Tokens are process-local capabilities, not JSON actor claims. The host injects the
// trusted actor registry; imported events are historical assertions until reassociated.
export class ReviewAuthority {
  #actors; #tokens = new WeakMap();
  constructor(actors = []) { this.#actors = new Map(actors.map(a => [a.actorId, Object.freeze({ ...a, scopes: [...a.scopes] })])); }
  issue({ record, store, userInitiated }) {
    if (!record || record.type !== 'ReviewEvent') throw new ContractError('REVIEW_TARGET_REQUIRED', 'A capability requires the complete concrete review event');
    validateRecord(record);
    const { actorId } = record, { scope, decision } = record.payload;
    const actor = this.#actors.get(actorId);
    if (!userInitiated || !actor || !actor.scopes.includes(scope) || actor.role === 'PROVIDER' || (['ACCEPTED', 'REVOKED'].includes(decision) && (OWNER_SCOPES.has(scope) ? actor.role !== 'OWNER' : decision === 'ACCEPTED' && !['OWNER', 'DIRECTOR'].includes(actor.role)))) throw new ContractError('REVIEW_AUTHORITY', 'Explicit trusted review authority is required');
    if (!store || store.authority !== this || typeof store.getRecordBytes !== 'function') throw new ContractError('REVIEW_STORE_REQUIRED', 'Explicit intent must name the actual receiving authoring store');
    const targets = record.payload.targetRevisionRefs.map(revisionId => { const bytes = store.getRecordBytes(revisionId), target = store.getRecord(revisionId); if (!bytes || !target) throw new ContractError('REVIEW_TARGET_MISSING', 'Stage the immutable target before requesting explicit review intent'); return { revisionId, entityId: target.entityId, head: store.heads.get(target.entityId) ?? null, bytes }; });
    const token = Object.freeze({}); this.#tokens.set(token, { actorId, scope, decision, role: actor.role, revisionId: record.revisionId, eventBytes: JSON.stringify(record), store, targets }); return token;
  }
  verify(token, record, store) {
    const claim = this.#tokens.get(token), p = record.payload;
    if (!claim || claim.store !== store || store?.authority !== this || claim.actorId !== record.actorId || claim.scope !== p.scope || claim.decision !== p.decision || claim.role !== p.actor.claimedRole || claim.revisionId !== record.revisionId || claim.eventBytes !== JSON.stringify(record) || claim.targets.some(target => { const bytes = store.getRecordBytes(target.revisionId); return !bytes || !equalBytes(bytes, target.bytes) || (store.heads.get(target.entityId) ?? null) !== target.head; })) throw new ContractError('REVIEW_AUTHORITY', 'Review command does not match its concrete store, immutable targets and exact event intent');
    const { store: boundStore, targets, ...receipt } = claim;
    return Object.freeze(receipt);
  }
}
export function reviewIsFresh(event, heads, records) {
  return event.payload.targetRevisionRefs.every(ref => { const target = records.get(ref); return target && heads.get(target.entityId) === ref; });
}
