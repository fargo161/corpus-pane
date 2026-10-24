import { ContractError } from './safety.mjs';
import { validateRecord } from './schema-validator.mjs';
const OWNER_SCOPES = new Set(['FAMILY', 'ASSET', 'ANCHOR', 'PAIR', 'RELEASE']);

// Tokens are process-local capabilities, not JSON actor claims. The host injects the
// trusted actor registry; imported events are historical assertions until reassociated.
export class ReviewAuthority {
  #actors; #tokens = new WeakMap();
  constructor(actors = []) { this.#actors = new Map(actors.map(a => [a.actorId, Object.freeze({ ...a, scopes: [...a.scopes] })])); }
  issue({ record, userInitiated }) {
    if (!record || record.type !== 'ReviewEvent') throw new ContractError('REVIEW_TARGET_REQUIRED', 'A capability requires the complete concrete review event');
    validateRecord(record);
    const { actorId } = record, { scope, decision } = record.payload;
    const actor = this.#actors.get(actorId);
    if (!userInitiated || !actor || !actor.scopes.includes(scope) || actor.role === 'PROVIDER' || (['ACCEPTED', 'REVOKED'].includes(decision) && (OWNER_SCOPES.has(scope) ? actor.role !== 'OWNER' : decision === 'ACCEPTED' && !['OWNER', 'DIRECTOR'].includes(actor.role)))) throw new ContractError('REVIEW_AUTHORITY', 'Explicit trusted review authority is required');
    const token = Object.freeze({}); this.#tokens.set(token, { actorId, scope, decision, role: actor.role, revisionId: record.revisionId, eventBytes: JSON.stringify(record) }); return token;
  }
  verify(token, record) {
    const claim = this.#tokens.get(token), p = record.payload;
    if (!claim || claim.actorId !== record.actorId || claim.scope !== p.scope || claim.decision !== p.decision || claim.role !== p.actor.claimedRole || claim.revisionId !== record.revisionId || claim.eventBytes !== JSON.stringify(record)) throw new ContractError('REVIEW_AUTHORITY', 'Review command does not match its exact event-bound trusted capability');
    return Object.freeze({ ...claim });
  }
}
export function reviewIsFresh(event, heads, records) {
  return event.payload.targetRevisionRefs.every(ref => { const target = records.get(ref); return target && heads.get(target.entityId) === ref; });
}
