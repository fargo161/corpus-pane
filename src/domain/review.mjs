import { ContractError } from './safety.mjs';
const OWNER_SCOPES = new Set(['FAMILY', 'ASSET', 'ANCHOR', 'PAIR', 'RELEASE']);

// Tokens are process-local capabilities, not JSON actor claims. The host injects the
// trusted actor registry; imported events are historical assertions until reassociated.
export class ReviewAuthority {
  #actors; #tokens = new WeakMap();
  constructor(actors = []) { this.#actors = new Map(actors.map(a => [a.actorId, Object.freeze({ ...a, scopes: [...a.scopes] })])); }
  issue({ actorId, scope, decision, userInitiated }) {
    const actor = this.#actors.get(actorId);
    if (!userInitiated || !actor || !actor.scopes.includes(scope) || actor.role === 'PROVIDER' || (decision === 'ACCEPTED' && (OWNER_SCOPES.has(scope) ? actor.role !== 'OWNER' : !['OWNER', 'DIRECTOR'].includes(actor.role)))) throw new ContractError('REVIEW_AUTHORITY', 'Explicit trusted review authority is required');
    const token = Object.freeze({}); this.#tokens.set(token, { actorId, scope, decision, role: actor.role }); return token;
  }
  verify(token, record) {
    const claim = this.#tokens.get(token), p = record.payload;
    if (!claim || claim.actorId !== record.actorId || claim.scope !== p.scope || claim.decision !== p.decision || claim.role !== p.actor.claimedRole) throw new ContractError('REVIEW_AUTHORITY', 'Review command does not match its trusted capability');
    return Object.freeze({ ...claim });
  }
}
export function reviewIsFresh(event, heads, records) {
  return event.payload.targetRevisionRefs.every(ref => { const target = records.get(ref); return target && heads.get(target.entityId) === ref; });
}
