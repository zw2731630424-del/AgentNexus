import { canonical, invariant, now, sha256 } from '../types.ts';
import { hostSubject, identifier, snapshot, subject as validateSubject } from '../harness/contracts.ts';
import type { Subject } from '../harness/contracts.ts';
import type { NativeState } from '../harness/state.ts';

export type UsageAssurance = 'SIMULATED' | 'REAL';
export type UsageScope = 'AGENT' | 'TASK' | 'PROJECT' | 'PLATFORM';
export type UsageAmounts = { tokens: number; requests: number; cost_micros: number };
export type UsageLimits = UsageAmounts & { scope: UsageScope; id: string; assurance: UsageAssurance };
export type UsageReserveInput = {
  request_id: string; input_tokens: number; output_tokens: number; cost_micros: number; requests?: number;
  assurance: UsageAssurance; context_hash: string; provider_id: string; model_id: string;
};
export type UsageSettlement = {
  input_tokens: number; output_tokens: number; reasoning_tokens: number | null; cost_micros: number;
  usage_source: 'SIMULATED' | 'PROVIDER' | 'ESTIMATED'; elapsed_ms: number;
  provider_request_id: string | null; retries: number; requests?: number;
};
export type UsageObservation = Omit<UsageSettlement, 'requests'> & { requests: number; estimated: boolean };
export type UsageTotals = {
  id: string; scope: UsageScope; assurance: UsageAssurance; limits: UsageAmounts;
  used: UsageAmounts; held: UsageAmounts; estimated: UsageAmounts; overrun: UsageAmounts; overdrawn: boolean;
};
type BudgetRecord = UsageTotals & { entity_id: string; revision: number };
export type UsageReservation = {
  request_id: string; revision: number; subject: Subject; assurance: UsageAssurance;
  state: 'RESERVED' | 'SENT' | 'SETTLED' | 'NOT_SENT' | 'UNKNOWN';
  request_hash: string; context_hash: string; provider_id: string; model_id: string;
  input_tokens: number; output_tokens: number; reserved: UsageAmounts; held: UsageAmounts;
  usage: UsageObservation | null; usage_hash: string | null; overrun: UsageAmounts;
  key_handle_id: string | null; reason: string; created_at: string; sent_at: string | null; completed_at: string | null;
};

export const MODEL_USAGE_LIMITS = Object.freeze({ records: 4096, budgets: 4096, attempts: 3 });
export const MODEL_USAGE_REASONS = Object.freeze([
  'PROVEN_NOT_SENT', 'KNOWN_NOT_SENT', 'CANCELLED_BEFORE_SEND', 'CANCELLED_AFTER_SEND',
  'TRANSPORT_UNKNOWN', 'PROVIDER_UNKNOWN', 'USAGE_UNAVAILABLE', 'MALFORMED_RESPONSE',
  'AUTH_REJECTED', 'RATE_LIMIT_REJECTED', 'REQUEST_FAILED', 'HOST_RESTART', 'USAGE_OVERRUN',
] as const);
const USAGE = 'MODEL18_USAGE', BUDGET = 'MODEL18_BUDGET';
const SCOPES: UsageScope[] = ['AGENT', 'TASK', 'PROJECT', 'PLATFORM'];
const AMOUNTS = ['tokens', 'requests', 'cost_micros'] as const;
const zero = (): UsageAmounts => ({ tokens: 0, requests: 0, cost_micros: 0 });

function fields(value: object, allowed: string[], required = allowed): void {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).every(key => allowed.includes(key)) && required.every(key => Object.hasOwn(value, key)), 'MODEL18_LEDGER_SCHEMA');
}
function natural(value: unknown, maximum = Number.MAX_SAFE_INTEGER): asserts value is number {
  invariant(Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum, 'MODEL18_LEDGER_AMOUNT');
}
function add(a: number, b: number): number { const result = a + b; natural(result); return result; }
function amounts(a: UsageAmounts, b: UsageAmounts, direction = 1): UsageAmounts {
  const next = zero(); for (const key of AMOUNTS) { next[key] = a[key] + direction * b[key]; natural(next[key]); } return next;
}
function assurance(value: unknown): asserts value is UsageAssurance {
  invariant(value === 'SIMULATED' || value === 'REAL', 'MODEL18_LEDGER_ASSURANCE');
}
function actor(value: Subject): Subject {
  const owned = snapshot(value); fields(owned, ['agent_id', 'project_id', 'task_id', 'session_id',
    'runtime_instance_id', 'agent_type', 'model_binding', 'resource_budget_id', 'policy_scope']);
  validateSubject(owned); return owned;
}
function scopeId(scope: UsageScope, id: string): void {
  invariant(SCOPES.includes(scope), 'MODEL18_LEDGER_SCOPE');
  invariant(typeof id === 'string' && /^[A-Za-z0-9_.:-]+$/.test(id) && id.length <= (scope === 'TASK' ? 257 : 128), 'MODEL18_LEDGER_SCOPE');
  invariant(scope !== 'PLATFORM' || id === 'platform', 'MODEL18_LEDGER_SCOPE');
}
function budgetId(scope: UsageScope, id: string, kind: UsageAssurance): string {
  return sha256(canonical({ scope, id, assurance: kind }));
}
export function modelTaskBudgetId(s:Pick<Subject,'project_id'|'task_id'>):string{return sha256(canonical({project_id:s.project_id,task_id:s.task_id}));}
function scopeBindings(s: Subject): [UsageScope, string][] {
  return [['AGENT', s.agent_id], ['TASK', modelTaskBudgetId(s)], ['PROJECT', s.project_id], ['PLATFORM', 'platform']];
}
function reasonCode(reason: string): string {
  invariant(typeof reason === 'string' && reason.length <= 96 && /^[A-Z][A-Z0-9_]*$/.test(reason) &&
    (MODEL_USAGE_REASONS as readonly string[]).includes(reason), 'MODEL18_LEDGER_REASON'); return reason;
}
function exceeds(a: UsageAmounts, b: UsageAmounts): boolean { return AMOUNTS.some(key => a[key] > b[key]); }

/** Host-only model accounting owner. REAL/SIMULATED ledgers never qualify OS resource enforcement. */
export class ModelUsageLedger {
  #state: NativeState;
  constructor(state: NativeState, admin: unknown) { state.checkAdmin(admin); this.#state = state; }
  #check(admin: unknown): void { this.#state.checkAdmin(admin); }
  #record(id: string, owner?: Subject): UsageReservation {
    identifier(id); const row = this.#state.get<UsageReservation>(USAGE, id);
    invariant(row, 'MODEL18_LEDGER_UNKNOWN');
    if (owner) invariant(canonical(owner) === canonical(row.subject), 'MODEL18_LEDGER_SUBJECT'); return row;
  }
  #budgets(s: Subject, kind: UsageAssurance): BudgetRecord[] {
    return scopeBindings(s).map(([scope, id]) => {
      const row = this.#state.get<BudgetRecord>(BUDGET, budgetId(scope, id, kind));
      invariant(row && row.scope === scope && row.id === id && row.assurance === kind, 'MODEL18_LEDGER_BUDGET_REQUIRED'); return row;
    });
  }
  #saveBudget(old: BudgetRecord, changes: Partial<BudgetRecord>): void {
    const next = { ...old, ...changes, revision: old.revision + 1 };
    this.#state.update(BUDGET, old.entity_id, old.revision, next.overdrawn ? 'OVERDRAWN' : 'CONFIGURED', next);
  }
  #save(old: UsageReservation, changes: Partial<UsageReservation>): UsageReservation {
    const next = { ...old, ...changes, revision: old.revision + 1 };
    this.#state.update(USAGE, old.request_id, old.revision, next.state, next); return snapshot(next);
  }
  async configure(admin: unknown, input: UsageLimits): Promise<UsageTotals> {
    this.#check(admin); const p = snapshot(input);
    fields(p, ['scope', 'id', 'assurance', ...AMOUNTS]); scopeId(p.scope, p.id); assurance(p.assurance);
    for (const key of AMOUNTS) natural(p[key]);
    const id = budgetId(p.scope, p.id, p.assurance), limits = { tokens: p.tokens, requests: p.requests, cost_micros: p.cost_micros };
    await this.#state.change(hostSubject(this.#state.boot_id), 'MODEL18_BUDGET_CONFIGURED', () => {
      const old = this.#state.get<BudgetRecord>(BUDGET, id);
      if (old) {
        invariant(!exceeds(amounts(old.used, old.held), limits), 'MODEL18_LEDGER_BUDGET_BELOW_COMMITTED');
        this.#saveBudget(old, { limits, overdrawn: false });
      } else {
        invariant(this.#state.count(BUDGET) < MODEL_USAGE_LIMITS.budgets, 'MODEL18_LEDGER_CAPACITY');
        const row: BudgetRecord = { entity_id: id, revision: 0, scope: p.scope, id: p.id, assurance: p.assurance,
          limits, used: zero(), held: zero(), estimated: zero(), overrun: zero(), overdrawn: false };
        this.#state.insert(BUDGET, id, hostSubject(this.#state.boot_id), 'CONFIGURED', row);
      }
    }, { scope: p.scope, scope_id: p.id, assurance: p.assurance, limits }, id);
    return this.totals(admin, p.scope, p.id, p.assurance);
  }
  async reserve(admin: unknown, subject: Subject, input: UsageReserveInput): Promise<string> {
    this.#check(admin); const s = actor(subject), p = snapshot(input);
    const required = ['request_id', 'input_tokens', 'output_tokens', 'cost_micros', 'assurance', 'context_hash', 'provider_id', 'model_id'];
    fields(p, [...required, 'requests'], required); identifier(p.request_id); identifier(p.provider_id); identifier(p.model_id); assurance(p.assurance);
    invariant(/^[a-f0-9]{64}$/.test(p.context_hash), 'MODEL18_LEDGER_CONTEXT');
    natural(p.input_tokens); natural(p.output_tokens); natural(p.cost_micros); const requests = p.requests ?? 1;
    natural(requests, MODEL_USAGE_LIMITS.attempts); invariant(requests > 0, 'MODEL18_LEDGER_AMOUNT');
    const reserved = { tokens: add(p.input_tokens, p.output_tokens), requests, cost_micros: p.cost_micros };
    const requestHash = sha256(canonical({ subject: s, ...p, requests }));
    return this.#state.change(s, 'MODEL18_USAGE_RESERVED', () => {
      const old = this.#state.get<UsageReservation>(USAGE, p.request_id);
      if (old) { invariant(old.request_hash === requestHash && canonical(old.subject) === canonical(s), 'MODEL18_LEDGER_REQUEST_CONFLICT'); return old.request_id; }
      invariant(this.#state.count(USAGE) < MODEL_USAGE_LIMITS.records, 'MODEL18_LEDGER_CAPACITY');
      const budgets = this.#budgets(s, p.assurance);
      for (const row of budgets) invariant(!row.overdrawn && !exceeds(amounts(amounts(row.used, row.held), reserved), row.limits), 'MODEL18_LEDGER_BUDGET_EXHAUSTED');
      for (const row of budgets) this.#saveBudget(row, { held: amounts(row.held, reserved) });
      const row: UsageReservation = { request_id: p.request_id, revision: 0, subject: s, assurance: p.assurance,
        state: 'RESERVED', request_hash: requestHash, context_hash: p.context_hash, provider_id: p.provider_id, model_id: p.model_id,
        input_tokens: p.input_tokens, output_tokens: p.output_tokens, reserved, held: reserved,
        usage: null, usage_hash: null, overrun: zero(), key_handle_id: null, reason: 'RESERVED', created_at: now(), sent_at: null, completed_at: null };
      this.#state.insert(USAGE, p.request_id, s, 'RESERVED', row); return p.request_id;
    }, { request_id: p.request_id, provider_id: p.provider_id, model_id: p.model_id, context_hash: p.context_hash, assurance: p.assurance, reserved }, p.request_id);
  }
  async markSent(admin: unknown, subject: Subject, id: string, input: { key_handle_id: string }): Promise<UsageReservation> {
    this.#check(admin); const s = actor(subject), p = snapshot(input); fields(p, ['key_handle_id']); identifier(p.key_handle_id);
    this.#record(id, s);
    return this.#state.change(s, 'MODEL18_USAGE_SENT', () => {
      const old = this.#record(id, s);
      if (old.state === 'SENT') { invariant(old.key_handle_id === p.key_handle_id, 'MODEL18_LEDGER_REQUEST_CONFLICT'); return old; }
      invariant(old.state === 'RESERVED', 'MODEL18_LEDGER_STATE');
      return this.#save(old, { state: 'SENT', key_handle_id: p.key_handle_id, sent_at: now(), reason: 'SENT' });
    }, { request_id: id, key_handle_id: p.key_handle_id }, id);
  }
  async settle(admin: unknown, subject: Subject, id: string, input: UsageSettlement): Promise<UsageReservation> {
    this.#check(admin); const s = actor(subject), p = snapshot(input);
    const required = ['input_tokens', 'output_tokens', 'reasoning_tokens', 'cost_micros', 'usage_source', 'elapsed_ms', 'provider_request_id', 'retries'];
    fields(p, [...required, 'requests'], required);
    for (const key of ['input_tokens', 'output_tokens', 'cost_micros', 'elapsed_ms', 'retries'] as const) natural(p[key]);
    natural(p.retries, MODEL_USAGE_LIMITS.attempts - 1);
    invariant(p.reasoning_tokens === null || (Number.isSafeInteger(p.reasoning_tokens) && p.reasoning_tokens >= 0 && p.reasoning_tokens <= p.output_tokens), 'MODEL18_LEDGER_REASONING');
    invariant(['SIMULATED', 'PROVIDER', 'ESTIMATED'].includes(p.usage_source), 'MODEL18_LEDGER_USAGE_SOURCE');
    if (p.provider_request_id !== null) invariant(typeof p.provider_request_id === 'string' && /^[A-Za-z0-9_.:/-]{1,128}$/.test(p.provider_request_id), 'MODEL18_LEDGER_PROVIDER_REQUEST');
    const requests = p.requests ?? p.retries + 1; natural(requests, MODEL_USAGE_LIMITS.attempts);
    invariant(requests>=1&&requests===p.retries+1,'MODEL18_LEDGER_ATTEMPTS');
    const usage: UsageObservation = { ...p, requests, estimated: p.usage_source === 'ESTIMATED' }, usageHash = sha256(canonical(usage));
    const observed = { tokens: add(p.input_tokens, p.output_tokens), requests, cost_micros: p.cost_micros };
    this.#record(id, s);
    return this.#state.change(s, 'MODEL18_USAGE_OBSERVED', () => {
      const old = this.#record(id, s);
      if (old.usage_hash) { invariant(old.usage_hash === usageHash, 'MODEL18_LEDGER_USAGE_CONFLICT'); return old; }
      invariant(old.state === 'SENT', 'MODEL18_LEDGER_STATE');
      invariant(requests <= old.reserved.requests, 'MODEL18_LEDGER_ATTEMPTS');
      invariant(old.assurance === 'SIMULATED' ? p.usage_source === 'SIMULATED' : p.usage_source !== 'SIMULATED', 'MODEL18_LEDGER_USAGE_SOURCE');
      const estimated = usage.estimated, overrun = zero();
      for (const key of AMOUNTS) overrun[key] = Math.max(0, observed[key] - old.reserved[key]);
      const exceeded = exceeds(observed, old.reserved), retained = estimated || exceeded;
      // An estimated receipt only establishes the HTTP attempt count. Unproven token/fee holds remain owned.
      const held = estimated ? { ...old.held, requests: old.held.requests - requests } : retained ? old.held : zero();
      const charged = estimated ? { tokens: 0, requests, cost_micros: 0 } : observed;
      for (const row of this.#budgets(s, old.assurance)) {
        const used = amounts(row.used, charged), nextHeld = amounts(amounts(row.held, old.held, -1), held);
        this.#saveBudget(row, { used, held: nextHeld,
          estimated: estimated ? amounts(row.estimated, { ...observed, requests: 0 }) : row.estimated,
          overrun: amounts(row.overrun, overrun), overdrawn: row.overdrawn || exceeded || exceeds(amounts(used, nextHeld), row.limits) });
      }
      // Overruns retain the original hold conservatively even though actual usage is recorded; explicit owner reconciliation is required.
      return this.#save(old, { state: retained ? 'UNKNOWN' : 'SETTLED', held, usage, usage_hash: usageHash, overrun,
        reason: exceeded ? 'USAGE_OVERRUN' : estimated ? 'USAGE_UNAVAILABLE' : 'SETTLED', completed_at: now() });
    }, { request_id: id, usage_source: usage.usage_source, estimated: usage.estimated, input_tokens: p.input_tokens,
      output_tokens: p.output_tokens, reasoning_tokens: p.reasoning_tokens, cost_micros: p.cost_micros, requests,
      elapsed_ms: p.elapsed_ms, provider_request_id: p.provider_request_id, retries: p.retries }, id);
  }
  async notSent(admin: unknown, subject: Subject, id: string, reason: string): Promise<UsageReservation> {
    this.#check(admin); const s = actor(subject), code = reasonCode(reason); this.#record(id, s);
    return this.#state.change(s, 'MODEL18_USAGE_NOT_SENT', () => {
      const old = this.#record(id, s); if (old.state === 'NOT_SENT') return old;
      invariant(old.state === 'RESERVED' && old.sent_at === null, 'MODEL18_LEDGER_ALREADY_SENT');
      for (const row of this.#budgets(s, old.assurance)) this.#saveBudget(row, { held: amounts(row.held, old.held, -1) });
      return this.#save(old, { state: 'NOT_SENT', held: zero(), reason: code, completed_at: now() });
    }, { request_id: id, reason: code }, id);
  }
  async unknown(admin: unknown, subject: Subject, id: string, reason: string): Promise<UsageReservation> {
    this.#check(admin); const s = actor(subject), code = reasonCode(reason); this.#record(id, s);
    return this.#state.change(s, 'MODEL18_USAGE_UNKNOWN', () => {
      const old = this.#record(id, s); if (old.state === 'UNKNOWN') return old;
      invariant(old.state === 'RESERVED' || old.state === 'SENT', 'MODEL18_LEDGER_STATE');
      return this.#save(old, { state: 'UNKNOWN', reason: code, completed_at: now() });
    }, { request_id: id, reason: code, automatic_retry: false, capacity_released: false }, id);
  }
  async recover(admin: unknown): Promise<number> {
    this.#check(admin); let after: string | undefined, count = 0;
    for (;;) {
      const page = this.#state.list<UsageReservation>(USAGE, { ...(after ? { after } : {}), limit: 100 }); if (!page.length) break;
      for (const row of page) if (row.state === 'RESERVED' || row.state === 'SENT') {
        const changed = await this.#state.change(hostSubject(this.#state.boot_id), 'MODEL18_USAGE_RECOVERED', () => {
          const current = this.#record(row.request_id); if (current.state !== 'RESERVED' && current.state !== 'SENT') return false;
          this.#save(current, { state: 'UNKNOWN', reason: 'HOST_RESTART', completed_at: now() }); return true;
        }, { request_id: row.request_id, reason: 'HOST_RESTART', automatic_retry: false, capacity_released: false }, row.request_id);
        if (changed) count++;
      }
      after = page.at(-1)!.request_id;
    }
    return count;
  }
  inspect(admin: unknown, id: string): UsageReservation { this.#check(admin); return this.#record(id); }
  totals(admin: unknown, scope: UsageScope, id: string, kind: UsageAssurance): UsageTotals {
    this.#check(admin); scopeId(scope, id); assurance(kind); const row = this.#state.get<BudgetRecord>(BUDGET, budgetId(scope, id, kind));
    invariant(row, 'MODEL18_LEDGER_BUDGET_REQUIRED');
    const { entity_id: _entity, revision: _revision, ...metadata } = row; return snapshot(metadata);
  }
}
