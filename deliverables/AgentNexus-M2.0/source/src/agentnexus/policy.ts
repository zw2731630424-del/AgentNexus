import { performance } from 'node:perf_hooks';
import { boundedJson, canonical, freezeJson, invariant, NexusError, sha256, uid, validateIdentity } from './types.ts';
import type { Identity, Json, PolicyDefinition, Scope, ValidationResult } from './types.ts';
import { POLICY_CONTRACTS } from './policy-contracts.ts';
import { acquireMutation, adminEvent, clockFor, getChallenge, markChallengeConsumed, metadata, newChallenge, scopeKey } from './control.ts';
import type { AdminCheck, MutationGate } from './control.ts';
import type { KernelStore } from './storage.ts';

export type PolicyMode = 'ENFORCE' | 'AUDIT_ONLY' | 'DISABLED';
export type ModeRequest = { scope: Scope; mode: PolicyMode; policy_ids: string[]; reason: string; expires_at: string | null };
type ModeState = ModeRequest & { state: PolicyMode | 'ENFORCE_PENDING_PREFLIGHT'; boot_id: string; created_wall: number; deadline_mono: number; challenge_id: string };
export type Verdict = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
export type PolicyFact = { policy_id: string; mode: PolicyMode; original_verdict: Verdict | 'NOT_EVALUATED'; result: Verdict | 'BYPASSED' | 'WOULD_DENY'; enforced: boolean };
export type Evaluation = { allowed: boolean; facts: PolicyFact[]; policy_epoch: number };
export type PolicyContext = { identity: Identity; intent_hash: string; approval_id?: string; validation?: ValidationResult | null };
export type RuleEvaluator = (definition: PolicyDefinition, context: PolicyContext, approved: boolean) => Verdict;

export function validatePolicyDefinitions(definitions: PolicyDefinition[]): PolicyDefinition[] {
  invariant(Array.isArray(definitions) && definitions.length <= 64, 'INVALID_POLICY_DEFINITIONS');
  const snapshot = JSON.parse(boundedJson(definitions, 262144)) as PolicyDefinition[];
  const ids = new Set<string>();
  const fields = new Set(['id','level','degradable','enforcement_owner','modes','version','default_mode','audit_requirements','failure','implementation_status','risk','scope','source','specific_test','test_cases','test_ids','test_status']);
  for (const d of snapshot) {
    invariant(d && typeof d === 'object' && !Array.isArray(d), 'INVALID_POLICY_DEFINITION');
    invariant(Object.keys(d).every(k => fields.has(k)), 'INVALID_POLICY_FIELDS');
    invariant(!Object.hasOwn(d, 'default_mode') || (d as any).default_mode === 'ENFORCE', 'INVALID_POLICY_DEFAULT_MODE');
    invariant(typeof d.id === 'string' && Object.hasOwn(POLICY_CONTRACTS, d.id), 'UNKNOWN_POLICY');
    invariant(!ids.has(d.id), 'DUPLICATE_POLICY'); ids.add(d.id);
    const [level, degradable, owner] = POLICY_CONTRACTS[d.id];
    invariant(d.level === level && d.degradable === degradable && d.enforcement_owner === owner, 'INVALID_POLICY_CONTRACT');
    invariant(d.modes && typeof d.modes === 'object' && !Array.isArray(d.modes) && Object.keys(d.modes).sort().join(',') === 'AUDIT_ONLY,DISABLED,ENFORCE', 'INVALID_POLICY_MODES');
    for (const value of Object.values(d.modes)) invariant(typeof value === 'string' && value.trim().length > 0 && value.length <= 4096, 'INVALID_POLICY_MODES');
    freezeJson(d as unknown as Json);
  }
  return snapshot;
}

export class PolicyEngine {
  #store: KernelStore; #definitions: Map<string, PolicyDefinition>; #admin: AdminCheck; #gate: MutationGate;
  #active: () => number; #boot = uid(); #lastWall = Date.now(); #evaluator?: RuleEvaluator;
  #security?:import('./security/controller.ts').SecurityHooks;
  constructor(store: KernelStore, definitions: PolicyDefinition[], checkAdmin: AdminCheck, gate: MutationGate, active: () => number, evaluator?: RuleEvaluator, security?:import('./security/controller.ts').SecurityHooks) {
    this.#security=security;
    this.#store = store; this.#definitions = new Map(validatePolicyDefinitions(definitions).map(d => [d.id, d]));
    this.#admin = checkAdmin; this.#gate = gate; this.#active = active;
    invariant(evaluator === undefined || typeof evaluator === 'function', 'INVALID_RULE_EVALUATOR'); this.#evaluator = evaluator;
  }
  async onBoot(): Promise<void> {
    // Any resumed permissive configuration requires explicit recovery preflight; never extend its lease.
    let offset = 0;
    while (true) {
      const page = this.#store.db.prepare('SELECT scope_key,value FROM control_modes ORDER BY scope_key LIMIT 100 OFFSET ?').all(offset) as { scope_key: string; value: string }[];
      if (!page.length) break;
      for (const row of page) {
        const state = this.#modeState(row.value, row.scope_key);
        if (state.state !== 'ENFORCE') this.#freeze(row.scope_key, state, 'RESTART_REQUIRES_PREFLIGHT');
      }
      offset += page.length;
    }
    await this.#store.flush();
  }
  #definition(id: string): PolicyDefinition { const d = this.#definitions.get(id); invariant(d, 'UNKNOWN_POLICY'); return d; }
  validateSelection(ids: string[]): void {
    invariant(Array.isArray(ids) && ids.length <= 64 && new Set(ids).size === ids.length, 'INVALID_POLICY_SELECTION');
    for (const id of ids) { const d = this.#definition(id); invariant(d.degradable && d.level !== 'L0', 'INDEPENDENT_POLICY_OWNER'); }
  }
  #modeState(raw: string, key: string): ModeState {
    const s = JSON.parse(raw) as ModeState;
    invariant(s && typeof s === 'object' && scopeKey(s.scope) === key && !s.scope.agent_id && !s.scope.task_id, 'INVALID_PERSISTED_MODE');
    invariant(['ENFORCE','AUDIT_ONLY','DISABLED'].includes(s.mode) && ['ENFORCE','AUDIT_ONLY','DISABLED','ENFORCE_PENDING_PREFLIGHT'].includes(s.state), 'INVALID_PERSISTED_MODE');
    this.validateSelection(s.policy_ids); invariant(s.policy_ids.length > 0, 'INVALID_PERSISTED_MODE');
    invariant(s.state === 'ENFORCE_PENDING_PREFLIGHT' || s.state === s.mode, 'INVALID_PERSISTED_MODE');
    invariant(typeof s.reason === 'string' && s.reason.trim().length > 0 && typeof s.boot_id === 'string' && typeof s.challenge_id === 'string', 'INVALID_PERSISTED_MODE');
    invariant(Number.isFinite(s.created_wall) && Number.isFinite(s.deadline_mono), 'INVALID_PERSISTED_MODE');
    invariant(s.mode === 'ENFORCE' ? s.expires_at === null : typeof s.expires_at === 'string' && Number.isFinite(Date.parse(s.expires_at)), 'INVALID_PERSISTED_MODE');
    return s;
  }
  #defaultVerdict(d: PolicyDefinition, c: PolicyContext, approved: boolean): Verdict {
    if (d.level === 'L1') return approved || this.#security&&!this.#security.requireWriteApproval() ? 'ALLOW' : 'REQUIRE_APPROVAL';
    if (d.level === 'L2') {
      const dimension = ({ 'P.DI_SYNTAX': 'syntax', 'P.DI_ARGUMENTS': 'args', 'P.DI_ENVIRONMENT': 'environment' } as const)[d.id];
      const m = metadata(this.#store), v = c.validation;
      return dimension && v && v.feature_epoch === m.feature_epoch && v.config_revision === m.feature_revision && v.dimensions?.[dimension]?.applicable === true && v.dimensions[dimension].status === 'PASS' ? 'ALLOW' : 'DENY';
    }
    return d.level === 'L3' && d.id === 'P.STYLE' ? 'ALLOW' : 'DENY';
  }
  async prepare(admin: unknown, request: ModeRequest, expectedRevision: number) {
    this.#admin(admin); boundedJson(request);
    invariant(Object.keys(request).sort().join(',') === 'expires_at,mode,policy_ids,reason,scope', 'INVALID_MODE_REQUEST');
    invariant(!request.scope.agent_id && !request.scope.task_id, 'INVALID_MODE_SCOPE'); scopeKey(request.scope);
    invariant(['ENFORCE', 'AUDIT_ONLY', 'DISABLED'].includes(request.mode), 'INVALID_MODE');
    invariant(typeof request.reason === 'string' && request.reason.trim().length > 0 && request.reason.length <= 1024, 'MODE_REASON_REQUIRED');
    invariant(Array.isArray(request.policy_ids) && request.policy_ids.length > 0 && request.policy_ids.length <= 64, 'INVALID_POLICY_SELECTION');
    invariant(new Set(request.policy_ids).size === request.policy_ids.length, 'DUPLICATE_POLICY');
    for (const id of request.policy_ids) { const d = this.#definition(id); invariant(d.degradable && d.level !== 'L0', 'NON_DEGRADABLE_POLICY'); }
    if (request.mode !== 'ENFORCE') {
      const deadline = Date.parse(request.expires_at ?? ''); const max = request.mode === 'AUDIT_ONLY' ? 7200000 : 1800000;
      invariant(Number.isFinite(deadline) && deadline > Date.now() && deadline <= Date.now() + max, 'INVALID_MODE_EXPIRY');
    } else invariant(request.expires_at === null, 'ENFORCE_HAS_NO_EXPIRY');
    invariant(metadata(this.#store).policy_revision === expectedRevision, 'REVISION_CONFLICT');
    const payload = JSON.parse(canonical(request)) as ModeRequest; payload.policy_ids.sort();
    const hash = sha256(canonical(payload)); let id = '';
    this.#store.transaction(() => { id = newChallenge(this.#store, 'MODE', payload as Json, hash, expectedRevision); adminEvent(this.#store, 'POLICY_MODE', 'PREPARED', payload as Json, { challenge_id: id, preview_hash: hash }); });
    await this.#store.flush(); return { challenge_id: id, preview_hash: hash, request: payload };
  }
  async confirm(admin: unknown, id: string, phase: 'PREVIEW_ACK' | 'RISK_ACK', previewHash: string): Promise<void> {
    this.#admin(admin);
    this.#store.transaction(() => {
      const c = getChallenge(this.#store, id, 'MODE'); invariant(c.hash === previewHash, 'PREVIEW_HASH_MISMATCH');
      invariant((c.stage === 0 && phase === 'PREVIEW_ACK') || (c.stage === 1 && phase === 'RISK_ACK'), 'CONFIRMATION_ORDER');
      this.#store.db.prepare('UPDATE control_challenges SET stage=stage+1 WHERE id=? AND stage=?').run(id, c.stage);
      adminEvent(this.#store, 'POLICY_MODE', phase, { challenge_id: id, preview_hash: previewHash });
    }); await this.#store.flush();
  }
  async commit(admin: unknown, id: string, previewHash: string): Promise<void> {
    this.#admin(admin); const release = acquireMutation(this.#gate);
    try {
      invariant(this.#active() === 0, 'ACTIVE_OPERATIONS');
      this.#store.transaction(() => {
        const c = getChallenge(this.#store, id, 'MODE'); invariant(c.stage === 2, 'DOUBLE_CONFIRM_REQUIRED');
        invariant(c.hash === previewHash, 'PREVIEW_HASH_MISMATCH');
        invariant(metadata(this.#store).policy_revision === c.revision, 'REVISION_CONFLICT');
        const request = JSON.parse(c.payload) as ModeRequest; const wall = Date.now();
        invariant(request.mode === 'ENFORCE' || Date.parse(request.expires_at!) > wall, 'MODE_EXPIRED');
        const state: ModeState = { ...request, state: request.mode, boot_id: this.#boot, created_wall: wall, deadline_mono: request.mode === 'ENFORCE' ? 0 : performance.now() + Date.parse(request.expires_at!) - wall, challenge_id: id };
        markChallengeConsumed(this.#store, id);
        this.#store.db.prepare('INSERT INTO control_modes VALUES(?,?) ON CONFLICT(scope_key) DO UPDATE SET value=excluded.value').run(scopeKey(request.scope), boundedJson(state));
        this.#store.db.exec('UPDATE control_meta SET policy_revision=policy_revision+1,policy_epoch=policy_epoch+1 WHERE singleton=1');
        adminEvent(this.#store, 'POLICY_MODE', 'COMMITTED', request as Json, { challenge_id: id, preview_hash: previewHash, mode: request.mode });
      }); await this.#store.flush();
    } finally { release(); }
  }
  #freeze(key: string, state: ModeState, reason: string): void {
    if (state.state === 'ENFORCE_PENDING_PREFLIGHT') return;
    this.#store.transaction(() => {
      state.state = 'ENFORCE_PENDING_PREFLIGHT';
      this.#store.db.prepare('UPDATE control_modes SET value=? WHERE scope_key=?').run(boundedJson(state), key);
      this.#store.db.exec('UPDATE control_meta SET policy_epoch=policy_epoch+1,policy_revision=policy_revision+1 WHERE singleton=1');
      adminEvent(this.#store, 'POLICY_MODE', 'ENFORCE_PENDING_PREFLIGHT', state as Json, { reason });
    });
  }
  modeFor(id: string, scope: Scope): PolicyMode {
    const d = this.#definition(id); if (!d.degradable || d.level === 'L0') return 'ENFORCE';
    const currentWall = Date.now(), rollback = currentWall < this.#lastWall - 100;
    this.#lastWall = Math.max(this.#lastWall, currentWall);
    const matches: PolicyMode[] = [];
    for (const s of [{}, ...(scope.project_id ? [{ project_id: scope.project_id }] : [])]) {
      const key = scopeKey(s); const row = this.#store.db.prepare('SELECT value FROM control_modes WHERE scope_key=?').get(key) as { value: string } | undefined;
      if (!row) continue; const state = this.#modeState(row.value, key);
      if (!state.policy_ids.includes(id)) continue;
      if (state.state !== 'ENFORCE' && state.state !== 'ENFORCE_PENDING_PREFLIGHT' && (rollback || state.boot_id !== this.#boot || currentWall < state.created_wall || currentWall >= Date.parse(state.expires_at!) || performance.now() >= state.deadline_mono)) this.#freeze(key, state, 'MODE_EXPIRED_OR_CLOCK_INVALID');
      invariant(state.state !== 'ENFORCE_PENDING_PREFLIGHT', 'ENFORCE_PENDING_PREFLIGHT');
      matches.push(state.state as PolicyMode);
    }
    if (matches.includes('ENFORCE')) return 'ENFORCE';
    if (matches.includes('AUDIT_ONLY')) return 'AUDIT_ONLY';
    return matches.includes('DISABLED') ? 'DISABLED' : 'ENFORCE';
  }
  evaluate(ids: string[], context: PolicyContext): Evaluation {
    this.validateSelection(ids); validateIdentity(context.identity);
    invariant(/^[a-f0-9]{64}$/.test(context.intent_hash), 'INVALID_INTENT_HASH');
    context = freezeJson(JSON.parse(boundedJson(context))) as PolicyContext;
    const facts: PolicyFact[] = []; let allowed = true;
    const approved = this.approvalValid(context.approval_id, context.intent_hash, context.identity);
    for (const id of ids) {
      const definition = this.#definition(id);
      // Independent owner invariants are checked by Tool/Archive/Sandbox/etc, never by this optional PDP.
      invariant(definition.degradable && definition.level !== 'L0', 'INDEPENDENT_POLICY_OWNER');
      const adaptive=this.#security;
      const mode:PolicyMode = adaptive ? !adaptive.feature('policy.engine')||adaptive.enforcement()==='OFF'?'DISABLED':adaptive.enforcement()==='ADVISORY'?'AUDIT_ONLY':'ENFORCE' : this.modeFor(id, { project_id: context.identity.project_id });
      if (mode === 'DISABLED') { facts.push({ policy_id: id, mode, original_verdict: 'NOT_EVALUATED', result: 'BYPASSED', enforced: false }); continue; }
      let verdict: Verdict;
      try {
        verdict = this.#defaultVerdict(definition, context, approved);
        if(adaptive&&!adaptive.defaultDeny()&&definition.level==='L3'&&verdict==='DENY')verdict='ALLOW';
        if (this.#evaluator) {
          const extension = this.#evaluator(definition, context, approved);
          invariant(['ALLOW','DENY','REQUIRE_APPROVAL'].includes(extension), 'POLICY_UNAVAILABLE');
          if (extension === 'DENY' || verdict === 'DENY') verdict = 'DENY';
          else if (extension === 'REQUIRE_APPROVAL' || verdict === 'REQUIRE_APPROVAL') verdict = 'REQUIRE_APPROVAL';
        }
      }
      catch { throw new NexusError('POLICY_UNAVAILABLE'); }
      invariant(['ALLOW', 'DENY', 'REQUIRE_APPROVAL'].includes(verdict), 'POLICY_UNAVAILABLE');
      const blocked = verdict !== 'ALLOW'; if (mode === 'ENFORCE' && blocked) allowed = false;
      facts.push({ policy_id: id, mode, original_verdict: verdict, result: mode === 'AUDIT_ONLY' && blocked ? 'WOULD_DENY' : verdict, enforced: mode === 'ENFORCE' });
    }
    return { allowed, facts, policy_epoch: metadata(this.#store).policy_epoch };
  }
  assertModesCurrent(ids: string[], projectId: string, expectedEpoch: number): void {
    for (const id of ids) this.modeFor(id, { project_id: projectId });
    invariant(metadata(this.#store).policy_epoch === expectedEpoch, 'POLICY_EPOCH_STALE');
  }
  approvalValid(id: string | undefined, hash: string, identity: Identity, expectedConsumed: 0 | 1 = 0): boolean {
    if (!id) return false;
    const r = this.#store.db.prepare('SELECT * FROM control_approvals WHERE id=?').get(id) as any;
    const m = metadata(this.#store);
    return !!r && r.consumed === expectedConsumed && r.intent_hash === hash && r.subject === identity.agent_id && r.project_id === identity.project_id && clockFor(this.#store).valid(r) && r.feature_epoch === m.feature_epoch && r.policy_epoch === m.policy_epoch;
  }
  async approve(admin: unknown, hash: string, identity: Identity, reason: string, lifetimeMs = 60000): Promise<string> {
    this.#admin(admin); validateIdentity(identity); invariant(/^[a-f0-9]{64}$/.test(hash), 'INVALID_INTENT_HASH');
    invariant(typeof reason === 'string' && reason.trim() && reason.length <= 1024 && Number.isSafeInteger(lifetimeMs) && lifetimeMs > 0 && lifetimeMs <= 300000, 'APPROVAL_REASON_OR_EXPIRY');
    const id = uid(), m = metadata(this.#store);
    const lease = clockFor(this.#store).issue(lifetimeMs);
    this.#store.transaction(() => {
      this.#store.db.prepare('INSERT INTO control_approvals(id,intent_hash,subject,project_id,expires_at,feature_epoch,policy_epoch,consumed,boot_id,deadline_mono,issued_wall) VALUES(?,?,?,?,?,?,?,0,?,?,?)').run(id, hash, identity.agent_id, identity.project_id, lease.expires_at, m.feature_epoch, m.policy_epoch, lease.boot_id, lease.deadline_mono, lease.issued_wall);
      adminEvent(this.#store, 'AUTHORIZATION', 'APPROVED', { intent_hash: hash, identity, reason, lifetime_ms: lifetimeMs } as Json, { approval_id: id });
    }); await this.#store.flush(); return id;
  }
  async completePreflight(admin: unknown, scope: Scope): Promise<void> {
    this.#admin(admin); const release = acquireMutation(this.#gate);
    try {
      invariant(this.#active() === 0, 'ACTIVE_OPERATIONS');
      invariant(!(this.#store.db.prepare("SELECT 1 FROM control_operations WHERE state IN ('CLAIMED','STARTED','INDETERMINATE') LIMIT 1").get()), 'UNRESOLVED_OPERATIONS');
      invariant(!this.#store.db.prepare('SELECT 1 FROM control_writers LIMIT 1').get(), 'WRITER_STILL_CLAIMED');
      await this.#store.verify(); // Real persisted-chain preflight, not a caller-supplied success boolean.
      const key = scopeKey(scope), row = this.#store.db.prepare('SELECT value FROM control_modes WHERE scope_key=?').get(key) as { value: string } | undefined;
      invariant(row && (JSON.parse(row.value) as ModeState).state === 'ENFORCE_PENDING_PREFLIGHT', 'NO_PREFLIGHT_PENDING');
      this.#store.transaction(() => {
        const state = JSON.parse(row.value) as ModeState;
        state.state = 'ENFORCE'; state.mode = 'ENFORCE'; state.expires_at = null;
        this.#store.db.prepare('UPDATE control_modes SET value=? WHERE scope_key=?').run(boundedJson(state), key);
        this.#store.db.exec('UPDATE control_meta SET policy_revision=policy_revision+1,policy_epoch=policy_epoch+1 WHERE singleton=1');
        adminEvent(this.#store, 'POLICY_MODE', 'PREFLIGHT_RESTORED_ENFORCE', state as Json);
      }); await this.#store.flush();
    } finally { release(); }
  }
}
