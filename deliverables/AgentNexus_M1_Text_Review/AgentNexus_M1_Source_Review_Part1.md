# AgentNexus M1 Source Review — Part 1

原件逐字节嵌入，保留CRLF/BOM/末尾换行。原始内容不格式化。每节标记中的bytes只计原文件；无末尾LF时补的分隔换行属于包装。integrity库仅测试导入，不是Host模块；JSON是运行数据，runner是测试入口。

## src/agentnexus/gateway.ts

类别：`current_native_implementation`；原始字节数：18759。

源文件 SHA256：

```text
85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0001","path":"src/agentnexus/gateway.ts","bytes":18759,"sha256":"85ab9f4312f17783ad5a2101c6582e769378489a29f3d62e0919cd3bdb1ff5ec","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/gateway.ts"}} -->
```typescript
import { auditEvent, boundedJson, canonical, freezeJson, invariant, NexusError, now, sha256, uid, validateIdentity } from './types.ts';
import type { ArtifactRef, Identity, Json, Scope, Status, ValidationResult } from './types.ts';
import type { AdminCheck, MutationGate } from './control.ts';
import { clockFor, metadata } from './control.ts';
import type { KernelStore } from './storage.ts';
import { performance } from 'node:perf_hooks';
import type { FeatureRegistry } from './features.ts';
import type { Evaluation, PolicyEngine } from './policy.ts';

export type ToolRequest = {
  call_id: string; tool_id: string; tool_version: string; arguments: Json;
  approval_id?: string; expected_feature_epoch?: number; expected_policy_epoch?: number;
};
export type ToolOutput = { data: Json; stdout?: AsyncIterable<Uint8Array> | Iterable<Uint8Array>; stderr?: AsyncIterable<Uint8Array> | Iterable<Uint8Array>; exit_code?: number | null; artifact_refs?: ArtifactRef[] };
export type ToolContext = { identity: Identity; operation_id: string; signal: AbortSignal; validation: ValidationResult | null; store: KernelStore };
export type ToolDefinition = {
  id: string; version: string; feature_id: string; policy_ids: string[]; requires_sandbox: boolean;
  timeout_ms?: number;
  schema: (args: Json) => void;
  validate?: (args: Json, signal: AbortSignal, identity: Identity) => Promise<ValidationResult>;
  writer_resource?: (args: Json, identity: Identity) => string;
  execute: (args: Json, context: ToolContext) => Promise<ToolOutput> | ToolOutput;
};
export type ToolResult = {
  status: Status; reason: string; operation_id: string; intent_hash: string;
  data: Json; stdout_ref: ArtifactRef | null; stderr_ref: ArtifactRef | null;
  audit_event_id: string | null; permit_id: string | null;
};

export function intentHash(identity: Identity, request: ToolRequest): string {
  return sha256(canonical({ identity, call_id: request.call_id, tool_id: request.tool_id, tool_version: request.tool_version, arguments: request.arguments }));
}

export class ToolGateway {
  #store: KernelStore; #features: FeatureRegistry; #policy: PolicyEngine; #admin: AdminCheck; #gate: MutationGate;
  #tools = new Map<string, ToolDefinition>();
  #activeRequests = 0;
  constructor(store: KernelStore, features: FeatureRegistry, policy: PolicyEngine, checkAdmin: AdminCheck, gate: MutationGate) {
    this.#store = store; this.#features = features; this.#policy = policy; this.#admin = checkAdmin; this.#gate = gate;
  }
  register(admin: unknown, definition: ToolDefinition): void {
    this.#admin(admin); invariant(!this.#tools.has(definition.id), 'TOOL_ALREADY_REGISTERED');
    invariant(/^[A-Za-z0-9_.:-]{1,128}$/.test(definition.id) && definition.version.length <= 64, 'INVALID_TOOL');
    invariant(definition.timeout_ms === undefined || (Number.isSafeInteger(definition.timeout_ms) && definition.timeout_ms >= 10 && definition.timeout_ms <= 30000), 'INVALID_TOOL_TIMEOUT');
    this.#tools.set(definition.id, Object.freeze({ ...definition, policy_ids: Object.freeze([...definition.policy_ids]) as unknown as string[] }));
  }
  describe(): { id: string; version: string; feature_id: string; requires_sandbox: boolean }[] {
    return [...this.#tools.values()].map(d => ({ id: d.id, version: d.version, feature_id: d.feature_id, requires_sandbox: d.requires_sandbox }));
  }
  async run(identity: Identity, request: ToolRequest): Promise<ToolResult> {
    invariant(this.#activeRequests < 32, 'GATEWAY_BACKPRESSURE'); this.#activeRequests++;
    try { return await this.#run(identity, request); }
    catch (error) {
      const code = error instanceof NexusError ? error.code : 'INVALID_REQUEST';
      const operation = uid(); let event: string | null = null;
      try {
        validateIdentity(identity);
        const record = this.#store.audit(auditEvent(identity, { operation_id: operation, operation_type: 'TOOL', phase: 'REJECTED', execution_status: 'BLOCKED', parameters: { reason: code }, cwd: this.#store.root }));
        event = record.event_id; await this.#store.flush();
      } catch { /* No side effect was attempted. The caller receives a blocked result. */ }
      return { status: 'BLOCKED', reason: code, operation_id: operation, intent_hash: '', data: null, stdout_ref: null, stderr_ref: null, audit_event_id: event, permit_id: null };
    } finally { this.#activeRequests--; }
  }
  async #run(identity: Identity, request: ToolRequest): Promise<ToolResult> {
    validateIdentity(identity); boundedJson(request);
    invariant(Object.keys(request).every(k => ['call_id','tool_id','tool_version','arguments','approval_id','expected_feature_epoch','expected_policy_epoch'].includes(k)), 'INVALID_TOOL_REQUEST');
    invariant(typeof request.call_id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(request.call_id), 'INVALID_CALL_ID');
    const def = this.#tools.get(request.tool_id); invariant(def && def.version === request.tool_version, 'UNKNOWN_TOOL_VERSION');
    // Snapshot before the first await. Caller mutation cannot change the approved/executed arguments.
    const input = JSON.parse(boundedJson(request)) as ToolRequest;
    const identitySnapshot = Object.freeze(JSON.parse(canonical(identity))) as Identity;
    const args = freezeJson(JSON.parse(canonical(input.arguments)) as Json);
    def.schema(args);
    const op = uid(), hash = intentHash(identitySnapshot, input), key = canonical({ identity: identitySnapshot, call_id: input.call_id });
    const scope: Scope = { project_id: identitySnapshot.project_id, agent_id: identitySnapshot.agent_id, task_id: identitySnapshot.task_id };
    let lease: ReturnType<FeatureRegistry['acquire']> | null = null;
    let inputRef: ArtifactRef | null = null, outputRef: ArtifactRef | null = null, stdoutRef: ArtifactRef | null = null, stderrRef: ArtifactRef | null = null;
    let permit: string | null = null, auditId: string | null = null, registered = false, invoked = false, resultRecorded = false;
    let resource: string | null = null; let decision: Evaluation | null = null;
    let handlerDone = false, deferredLease = false;
    let completion: Promise<{ ok: true; output: ToolOutput } | { ok: false; error: unknown }> | null = null;
    const emit = (phase: string, extras: Partial<ReturnType<typeof auditEvent>> = {}) => {
      const r = this.#store.audit(auditEvent(identitySnapshot, { operation_id: op, operation_type: 'TOOL', phase, cwd: this.#store.root,
        parameters_ref: inputRef, parameters: { tool_id: def.id, tool_version: def.version, intent_hash: hash }, authorization_ref: input.approval_id ?? null,
        ...extras })); auditId = r.event_id; return r;
    };
    try {
      invariant(!this.#gate.busy, 'CONFIG_QUIESCING');
      const existing = this.#store.db.prepare('SELECT operation_id FROM control_operations WHERE request_key=?').get(key) as { operation_id: string } | undefined;
      if (existing) return { status: 'BLOCKED', reason: 'DUPLICATE_OPERATION', operation_id: existing.operation_id, intent_hash: hash, data: null, stdout_ref: null, stderr_ref: null, audit_event_id: null, permit_id: null };
      inputRef = await this.#store.artifacts.putBytes(Buffer.from(canonical(input)), { media_type: 'application/json', maxBytes: 65536 });
      this.#store.transaction(() => {
        this.#store.db.prepare('INSERT INTO control_operations(operation_id,request_key,intent_hash,subject,state) VALUES(?,?,?,?,?)').run(op, key, hash, identitySnapshot.agent_id, 'PREPARED');
        const event = emit('RECEIVED');
        this.#store.context({ ...identitySnapshot, event_id: uid(), operation_id: op, observed_at: now(), kind: 'tool.request', payload_ref: inputRef!, audit_event_refs: [event.event_id] });
      }); registered = true;
      await this.#store.flush();
      lease = this.#features.acquire(def.feature_id, scope);
      const m = metadata(this.#store);
      if (input.expected_feature_epoch !== undefined) invariant(input.expected_feature_epoch === m.feature_epoch, 'FEATURE_EPOCH_STALE');
      if (input.expected_policy_epoch !== undefined) invariant(input.expected_policy_epoch === m.policy_epoch, 'POLICY_EPOCH_STALE');
      // No arbitrary execution backend is admitted in M1. A policy bypass never changes this owner check.
      invariant(!def.requires_sandbox, 'SANDBOX_NOT_VERIFIED');
      const validation = def.validate ? await def.validate(args, lease.signal, identitySnapshot) : null;
      if (validation) { emit('VALIDATED', { detail: { status: validation.status, reason: validation.reason, dimensions: validation.dimensions, source_sha256: validation.source_sha256 } as Json }); await this.#store.flush(); }
      this.#features.assertEpoch(lease.epoch); invariant(!lease.signal.aborted && !this.#gate.busy, 'EXECUTION_REVOKED');
      decision = this.#policy.evaluate(def.policy_ids, { identity: identitySnapshot, intent_hash: hash, approval_id: input.approval_id, validation_ok: validation?.status === 'PASS' });
      const decisionEvent = emit('POLICY_DECISION', { detail: decision as unknown as Json, execution_status: decision.allowed ? 'AUTHORIZED' : 'BLOCKED' });
      await this.#store.flush();
      invariant(decision.allowed, 'POLICY_DENIED');
      permit = uid();
      this.#store.transaction(() => {
        const meta = metadata(this.#store);
        invariant(meta.feature_epoch === lease!.epoch && meta.policy_epoch === decision!.policy_epoch, 'EPOCH_STALE');
        const clockLease = clockFor(this.#store).issue(30000);
        this.#store.db.prepare('INSERT INTO control_permits(id,operation_id,intent_hash,subject,expires_at,feature_epoch,policy_epoch,consumed,boot_id,deadline_mono,issued_wall) VALUES(?,?,?,?,?,?,?,0,?,?,?)').run(permit!, op, hash, identitySnapshot.agent_id, clockLease.expires_at, lease!.epoch, decision!.policy_epoch, clockLease.boot_id, clockLease.deadline_mono, clockLease.issued_wall);
        this.#store.db.prepare('UPDATE control_operations SET permit_id=? WHERE operation_id=?').run(permit!, op);
        emit('PERMIT_ISSUED', { policy_decision_ref: decisionEvent.event_id, detail: { permit_id: permit } });
      }); await this.#store.flush();
      resource = def.writer_resource ? def.writer_resource(args, identitySnapshot) : null;
      if (resource !== null) invariant(typeof resource === 'string' && resource.startsWith(identitySnapshot.project_id + ':') && resource.length <= 256, 'INVALID_WRITER_RESOURCE');
      this.#policy.assertModesCurrent(def.policy_ids, identitySnapshot.project_id, decision.policy_epoch);
      this.#store.transaction(() => {
        invariant(!this.#gate.busy && !lease!.signal.aborted, 'EXECUTION_REVOKED'); this.#features.assertEpoch(lease!.epoch);
        const meta = metadata(this.#store); invariant(meta.policy_epoch === decision!.policy_epoch, 'POLICY_EPOCH_STALE');
        invariant(this.#features.resolve(def.feature_id, scope).effective === 'ON', 'FEATURE_OFF');
        if (input.approval_id) {
          invariant(this.#policy.approvalValid(input.approval_id, hash, identitySnapshot), 'APPROVAL_INVALID');
          invariant(this.#store.db.prepare('UPDATE control_approvals SET consumed=1 WHERE id=? AND consumed=0').run(input.approval_id).changes === 1, 'APPROVAL_REPLAY');
        }
        const permitRow = this.#store.db.prepare('SELECT boot_id,issued_wall,expires_at,deadline_mono FROM control_permits WHERE id=?').get(permit!) as any;
        invariant(permitRow && clockFor(this.#store).valid(permitRow), 'PERMIT_REPLAY_OR_EXPIRED');
        invariant(this.#store.db.prepare('UPDATE control_permits SET consumed=1 WHERE id=? AND consumed=0 AND intent_hash=? AND subject=? AND expires_at>? AND feature_epoch=? AND policy_epoch=?').run(permit!, hash, identitySnapshot.agent_id, Date.now(), meta.feature_epoch, meta.policy_epoch).changes === 1, 'PERMIT_REPLAY_OR_EXPIRED');
        if (resource) {
          invariant(!this.#store.db.prepare('SELECT 1 FROM control_writers WHERE resource=?').get(resource), 'WORKSPACE_BUSY');
          this.#store.db.prepare('INSERT INTO control_writers VALUES(?,?,?)').run(resource, op, meta.feature_epoch + 1);
        }
        this.#store.db.prepare("UPDATE control_operations SET state='CLAIMED',workspace=? WHERE operation_id=?").run(resource, op);
        emit('CLAIMED', { execution_status: 'CLAIMED', policy_decision_ref: decisionEvent.event_id, detail: { permit_id: permit, resource } });
      }); await this.#store.flush(); // Required durable-intent barrier; no execution before this completes.
      this.#store.transaction(() => {
        emit('START_INTENT', { execution_status: 'CLAIMED', policy_decision_ref: decisionEvent.event_id, detail: { backend: 'BROKER_ONLY', os_process: false, execution_not_yet_observed: true } });
      });
      await this.#store.flush();
      invariant(!this.#gate.busy && !lease.signal.aborted, 'EXECUTION_REVOKED');
      this.#features.assertEpoch(lease.epoch); invariant(metadata(this.#store).policy_epoch === decision.policy_epoch, 'POLICY_EPOCH_STALE');
      this.#policy.assertModesCurrent(def.policy_ids, identitySnapshot.project_id, decision.policy_epoch);
      const startPermit = this.#store.db.prepare('SELECT * FROM control_permits WHERE id=?').get(permit!) as any;
      invariant(startPermit?.consumed === 1 && clockFor(this.#store).valid(startPermit), 'PERMIT_EXPIRED_BEFORE_START');
      if (input.approval_id) invariant(this.#policy.approvalValid(input.approval_id, hash, identitySnapshot, 1), 'APPROVAL_EXPIRED_BEFORE_START');
      // No await is permitted between the last fence and invoking this trusted registered handler.
      invoked = true;
      const deadline = performance.now() + (def.timeout_ms ?? 10000);
      completion = Promise.resolve(def.execute(args, { identity: identitySnapshot, operation_id: op, signal: lease.signal, validation, store: this.#store }))
        .then(output => { handlerDone = true; return { ok: true as const, output }; }, error => { handlerDone = true; return { ok: false as const, error }; });
      this.#store.transaction(() => {
        this.#store.db.prepare("UPDATE control_operations SET state='STARTED' WHERE operation_id=?").run(op);
        emit('STARTED', { execution_status: 'STARTED', detail: { backend: 'BROKER_ONLY', os_process: false, handler_invocation_observed: true } });
      }); await this.#store.flush();
      let handlerTimer: ReturnType<typeof setTimeout> | undefined;
      let settled: Awaited<NonNullable<typeof completion>>;
      try {
        settled = await Promise.race([completion, new Promise<never>((_, reject) => {
          handlerTimer = setTimeout(() => { lease!.cancel(new NexusError('TOOL_TIMEOUT')); reject(new NexusError('TOOL_TIMEOUT')); }, Math.max(1, deadline - performance.now()));
        })]);
      } finally { if (handlerTimer) clearTimeout(handlerTimer); }
      if (!settled.ok) throw settled.error;
      const output = settled.output;
      const data = JSON.parse(boundedJson(output.data)) as Json;
      const code = output.exit_code ?? null;
      invariant(code === null || Number.isSafeInteger(code), 'INVALID_EXIT_CODE');
      stdoutRef = await this.#store.artifacts.put(output.stdout ?? [Buffer.from(canonical(data))], { maxBytes: 67108864, media_type: 'application/octet-stream', signal: lease.signal });
      stderrRef = await this.#store.artifacts.put(output.stderr ?? [], { maxBytes: 67108864, media_type: 'application/octet-stream', signal: lease.signal });
      const artifactRefs = output.artifact_refs ?? [];
      const status: Status = code !== null && code !== 0 ? 'FAIL' : 'PASS';
      outputRef = await this.#store.artifacts.putBytes(Buffer.from(canonical({ data, exit_code: code, stdout_ref: stdoutRef, stderr_ref: stderrRef, artifact_refs: artifactRefs })), { maxBytes: 65536, media_type: 'application/json' });
      this.#store.transaction(() => {
        this.#store.db.prepare("UPDATE control_operations SET state='RESULT_RECORDED',detail=? WHERE operation_id=?").run(boundedJson({ output_ref: outputRef, status }), op);
        const event = emit('RESULT', { execution_status: status === 'PASS' ? 'SUCCEEDED' : 'FAILED', exit_code: code, stdout_ref: stdoutRef, stderr_ref: stderrRef, artifact_refs: [outputRef!, ...artifactRefs], detail: { data_ref: outputRef, backend: 'BROKER_ONLY', diagnostic_status_is_separate: true } as Json });
        this.#store.context({ ...identitySnapshot, event_id: uid(), operation_id: op, observed_at: now(), kind: 'tool.result', payload_ref: outputRef!, audit_event_refs: [event.event_id] });
      });
      await this.#store.flush(); resultRecorded = true;
      this.#store.transaction(() => {
        this.#store.db.prepare('UPDATE control_operations SET state=? WHERE operation_id=?').run(status === 'PASS' ? 'SUCCEEDED' : 'FAILED', op);
        this.#store.db.prepare('DELETE FROM control_writers WHERE operation_id=?').run(op);
        emit('ACK_READY', { execution_status: status === 'PASS' ? 'SUCCEEDED' : 'FAILED', exit_code: code, stdout_ref: stdoutRef, stderr_ref: stderrRef, detail: { result_ref: outputRef, writer_released: true } as Json });
      }); await this.#store.flush();
      return { status, reason: 'BROKER_OPERATION_COMPLETE', operation_id: op, intent_hash: hash, data, stdout_ref: stdoutRef, stderr_ref: stderrRef, audit_event_id: auditId, permit_id: permit };
    } catch (error) {
      const reason = error instanceof NexusError ? error.code : error instanceof Error ? 'TOOL_FAILED' : 'UNKNOWN_FAILURE';
      if (completion && !handlerDone && lease) {
        lease.cancel(error); deferredLease = true;
        // A timeout is not proof that work stopped. Keep the owned lease until this actual handler settles.
        const held = lease; completion.then(() => held.release());
      }
      if (registered) {
        try {
          this.#store.transaction(() => {
            this.#store.db.prepare('UPDATE control_operations SET state=? WHERE operation_id=?').run(invoked && !resultRecorded ? 'INDETERMINATE' : resultRecorded ? 'RESULT_RECORDED' : 'BLOCKED', op);
            if (!invoked) this.#store.db.prepare('DELETE FROM control_writers WHERE operation_id=?').run(op);
            emit('FAILED', { execution_status: invoked && !resultRecorded ? 'INDETERMINATE' : 'BLOCKED', stdout_ref: stdoutRef, stderr_ref: stderrRef, detail: { reason, invoked, result_recorded: resultRecorded } });
          }); await this.#store.flush();
        } catch { /* Persistence fault is never converted to successful execution. */ }
      }
      return { status: invoked ? 'INCONCLUSIVE' : 'BLOCKED', reason, operation_id: op, intent_hash: hash, data: null, stdout_ref: stdoutRef, stderr_ref: stderrRef, audit_event_id: auditId, permit_id: permit };
    } finally { if (!deferredLease) lease?.release(); }
  }
}
```
<!-- agentnexus-export-end -->

## src/agentnexus/policy.ts

类别：`current_native_implementation`；原始字节数：13815。

源文件 SHA256：

```text
98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0002","path":"src/agentnexus/policy.ts","bytes":13815,"sha256":"98cadd7673c9d523733bb9fe1d1d62a036516aa63c9c0441a758dc39a14d18d2","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/policy.ts"}} -->
```typescript
import { performance } from 'node:perf_hooks';
import { boundedJson, canonical, invariant, NexusError, sha256, uid } from './types.ts';
import type { Identity, Json, PolicyDefinition, Scope } from './types.ts';
import { acquireMutation, adminEvent, clockFor, getChallenge, markChallengeConsumed, metadata, newChallenge, scopeKey } from './control.ts';
import type { AdminCheck, MutationGate } from './control.ts';
import type { KernelStore } from './storage.ts';

export type PolicyMode = 'ENFORCE' | 'AUDIT_ONLY' | 'DISABLED';
export type ModeRequest = { scope: Scope; mode: PolicyMode; policy_ids: string[]; reason: string; expires_at: string | null };
type ModeState = ModeRequest & { state: PolicyMode | 'ENFORCE_PENDING_PREFLIGHT'; boot_id: string; created_wall: number; deadline_mono: number; challenge_id: string };
export type Verdict = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
export type PolicyFact = { policy_id: string; mode: PolicyMode; original_verdict: Verdict | 'NOT_EVALUATED'; result: Verdict | 'BYPASSED' | 'WOULD_DENY'; enforced: boolean };
export type Evaluation = { allowed: boolean; facts: PolicyFact[]; policy_epoch: number };
export type PolicyContext = { identity: Identity; intent_hash: string; approval_id?: string; validation_ok?: boolean };
export type RuleEvaluator = (definition: PolicyDefinition, context: PolicyContext, approved: boolean) => Verdict;

export class PolicyEngine {
  #store: KernelStore; #definitions: Map<string, PolicyDefinition>; #admin: AdminCheck; #gate: MutationGate;
  #active: () => number; #boot = uid(); #lastWall = Date.now(); #evaluator: RuleEvaluator;
  constructor(store: KernelStore, definitions: PolicyDefinition[], checkAdmin: AdminCheck, gate: MutationGate, active: () => number, evaluator?: RuleEvaluator) {
    this.#store = store; this.#definitions = new Map(definitions.map(d => [d.id, JSON.parse(canonical(d))]));
    invariant(this.#definitions.size === definitions.length, 'DUPLICATE_POLICY');
    this.#admin = checkAdmin; this.#gate = gate; this.#active = active;
    this.#evaluator = evaluator ?? ((d, c, approved) => d.level === 'L1' ? (approved ? 'ALLOW' : 'REQUIRE_APPROVAL') : d.level === 'L2' ? (c.validation_ok === true ? 'ALLOW' : 'DENY') : 'ALLOW');
  }
  async onBoot(): Promise<void> {
    // Any resumed permissive configuration requires explicit recovery preflight; never extend its lease.
    let offset = 0;
    while (true) {
      const page = this.#store.db.prepare('SELECT scope_key,value FROM control_modes ORDER BY scope_key LIMIT 100 OFFSET ?').all(offset) as { scope_key: string; value: string }[];
      if (!page.length) break;
      for (const row of page) {
        const state = JSON.parse(row.value) as ModeState;
        if (state.state !== 'ENFORCE') this.#freeze(row.scope_key, state, 'RESTART_REQUIRES_PREFLIGHT');
      }
      offset += page.length;
    }
    await this.#store.flush();
  }
  #definition(id: string): PolicyDefinition { const d = this.#definitions.get(id); invariant(d, 'UNKNOWN_POLICY'); return d; }
  async prepare(admin: unknown, request: ModeRequest, expectedRevision: number) {
    this.#admin(admin); boundedJson(request);
    invariant(Object.keys(request).sort().join(',') === 'expires_at,mode,policy_ids,reason,scope', 'INVALID_MODE_REQUEST');
    invariant(!request.scope.agent_id && !request.scope.task_id, 'INVALID_MODE_SCOPE'); scopeKey(request.scope);
    invariant(['ENFORCE', 'AUDIT_ONLY', 'DISABLED'].includes(request.mode), 'INVALID_MODE');
    invariant(typeof request.reason === 'string' && request.reason.trim().length > 0 && request.reason.length <= 1024, 'MODE_REASON_REQUIRED');
    invariant(Array.isArray(request.policy_ids) && request.policy_ids.length > 0 && request.policy_ids.length <= 64, 'INVALID_POLICY_SELECTION');
    invariant(new Set(request.policy_ids).size === request.policy_ids.length, 'DUPLICATE_POLICY');
    for (const id of request.policy_ids) { const d = this.#definition(id); if (request.mode !== 'ENFORCE') invariant(d.degradable && d.level !== 'L0', 'NON_DEGRADABLE_POLICY'); }
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
      if (!row) continue; const state = JSON.parse(row.value) as ModeState;
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
    const facts: PolicyFact[] = []; let allowed = true;
    const approved = this.approvalValid(context.approval_id, context.intent_hash, context.identity);
    for (const id of ids) {
      const definition = this.#definition(id);
      // Independent owner invariants are checked by Tool/Archive/Sandbox/etc, never by this optional PDP.
      invariant(definition.degradable && definition.level !== 'L0', 'INDEPENDENT_POLICY_OWNER');
      const mode = this.modeFor(id, { project_id: context.identity.project_id });
      if (mode === 'DISABLED') { facts.push({ policy_id: id, mode, original_verdict: 'NOT_EVALUATED', result: 'BYPASSED', enforced: false }); continue; }
      let verdict: Verdict;
      try { verdict = this.#evaluator(definition, context, approved); }
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
    this.#admin(admin); invariant(/^[a-f0-9]{64}$/.test(hash), 'INVALID_INTENT_HASH');
    invariant(reason.trim() && reason.length <= 1024 && lifetimeMs > 0 && lifetimeMs <= 300000, 'APPROVAL_REASON_OR_EXPIRY');
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
```
<!-- agentnexus-export-end -->

## src/agentnexus/control.ts

类别：`current_native_implementation`；原始字节数：7027。

源文件 SHA256：

```text
b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0003","path":"src/agentnexus/control.ts","bytes":7027,"sha256":"b222860935358032aabcae570865d6d09bca1d22f9b94fcc1961624c895bdccc","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/control.ts"}} -->
```typescript
import { auditEvent, boundedJson, canonical, invariant, now, uid } from './types.ts';
import type { Identity, Json, Scope } from './types.ts';
import type { KernelStore } from './storage.ts';
import { performance } from 'node:perf_hooks';

export const ADMIN: Identity = Object.freeze({ agent_id: 'host-admin', project_id: 'host', task_id: 'administration', session_id: 'host-control' });
export type AdminCheck = (candidate: unknown) => void;
export type MutationGate = { busy: boolean };
class LeaseClock {
  readonly boot_id = uid();
  #lastWall = Date.now();
  issue(lifetime: number) {
    const wall = Date.now(); invariant(wall >= this.#lastWall - 100, 'CLOCK_INVALID'); this.#lastWall = Math.max(wall, this.#lastWall);
    return { boot_id: this.boot_id, issued_wall: wall, expires_at: wall + lifetime, deadline_mono: performance.now() + lifetime };
  }
  valid(row: { boot_id: string; issued_wall: number; expires_at: number; deadline_mono: number }): boolean {
    const wall = Date.now(), rollback = wall < this.#lastWall - 100; this.#lastWall = Math.max(wall, this.#lastWall);
    return !rollback && row.boot_id === this.boot_id && wall >= row.issued_wall && wall < row.expires_at && performance.now() < row.deadline_mono;
  }
}
const clocks = new WeakMap<KernelStore, LeaseClock>();
export function clockFor(store: KernelStore): LeaseClock {
  let clock = clocks.get(store); if (!clock) { clock = new LeaseClock(); clocks.set(store, clock); } return clock;
}

export function initializeControl(store: KernelStore): void {
  store.db.exec(`
    CREATE TABLE IF NOT EXISTS control_meta(singleton INTEGER PRIMARY KEY CHECK(singleton=1), feature_revision INTEGER NOT NULL, feature_epoch INTEGER NOT NULL, policy_revision INTEGER NOT NULL, policy_epoch INTEGER NOT NULL);
    INSERT OR IGNORE INTO control_meta VALUES(1,0,0,0,0);
    CREATE TABLE IF NOT EXISTS control_features(feature_id TEXT NOT NULL,scope_key TEXT NOT NULL,value TEXT NOT NULL CHECK(value IN ('ON','OFF','INHERIT')),PRIMARY KEY(feature_id,scope_key));
    CREATE TABLE IF NOT EXISTS control_modes(scope_key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS control_challenges(id TEXT PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL,hash TEXT NOT NULL,stage INTEGER NOT NULL,expires_at INTEGER NOT NULL,revision INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS control_approvals(id TEXT PRIMARY KEY,intent_hash TEXT NOT NULL,subject TEXT NOT NULL,project_id TEXT NOT NULL,expires_at INTEGER NOT NULL,feature_epoch INTEGER NOT NULL,policy_epoch INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS control_operations(operation_id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,intent_hash TEXT NOT NULL,subject TEXT NOT NULL,state TEXT NOT NULL,permit_id TEXT UNIQUE,workspace TEXT,detail TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE IF NOT EXISTS control_permits(id TEXT PRIMARY KEY,operation_id TEXT UNIQUE NOT NULL,intent_hash TEXT NOT NULL,subject TEXT NOT NULL,expires_at INTEGER NOT NULL,feature_epoch INTEGER NOT NULL,policy_epoch INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS control_writers(resource TEXT PRIMARY KEY,operation_id TEXT UNIQUE NOT NULL,fence INTEGER NOT NULL);
  `);
  // Explicit local M1 schema upgrade. Historical grants have empty boot identity and cannot revive.
  for (const table of ['control_challenges','control_approvals','control_permits']) {
    const columns = new Set((store.db.prepare(`PRAGMA table_info(${table})`).all() as {name: string}[]).map(x => x.name));
    for (const [name, sql] of [['boot_id',"TEXT NOT NULL DEFAULT ''"],['deadline_mono','REAL NOT NULL DEFAULT 0'],['issued_wall','INTEGER NOT NULL DEFAULT 0']])
      if (!columns.has(name)) store.db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${sql}`);
  }
  clockFor(store);
}
export function metadata(store: KernelStore) {
  return store.db.prepare('SELECT * FROM control_meta WHERE singleton=1').get() as {
    feature_revision: number; feature_epoch: number; policy_revision: number; policy_epoch: number;
  };
}
export function scopeKey(scope: Scope): string {
  invariant(scope !== null && typeof scope === 'object', 'INVALID_SCOPE');
  invariant(Object.keys(scope).every(x => ['project_id', 'agent_id', 'task_id'].includes(x)), 'INVALID_SCOPE');
  invariant(!scope.agent_id || !!scope.project_id, 'INVALID_SCOPE');
  invariant(!scope.task_id || !!scope.agent_id, 'INVALID_SCOPE');
  for (const value of Object.values(scope)) invariant(typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value), 'INVALID_SCOPE');
  return canonical(scope);
}
export function scopeLevel(scope: Scope): 'G' | 'P' | 'A' | 'T' {
  scopeKey(scope); return scope.task_id ? 'T' : scope.agent_id ? 'A' : scope.project_id ? 'P' : 'G';
}
export function ancestors(scope: Scope): Scope[] {
  scopeKey(scope); const out: Scope[] = [{}];
  if (scope.project_id) out.push({ project_id: scope.project_id });
  if (scope.agent_id) out.push({ project_id: scope.project_id, agent_id: scope.agent_id });
  if (scope.task_id) out.push({ ...scope });
  return out;
}
export function contains(parent: Scope, child: Scope): boolean {
  return Object.entries(parent).every(([k, v]) => child[k as keyof Scope] === v);
}
export function adminEvent(store: KernelStore, type: string, phase: string, parameters: Json, detail: Json = null) {
  return store.audit(auditEvent(ADMIN, { operation_type: type, phase, parameters, detail, cwd: store.root }));
}
export function newChallenge(store: KernelStore, kind: string, payload: Json, hash: string, revision: number, expiresAt = Date.now() + 300000) {
  const id = uid();
  const lease = clockFor(store).issue(Math.min(300000, expiresAt - Date.now()));
  store.db.prepare('INSERT INTO control_challenges(id,kind,payload,hash,stage,expires_at,revision,boot_id,deadline_mono,issued_wall) VALUES(?,?,?,?,0,?,?,?,?,?)')
    .run(id, kind, boundedJson(payload), hash, lease.expires_at, revision, lease.boot_id, lease.deadline_mono, lease.issued_wall);
  return id;
}
export function getChallenge(store: KernelStore, id: string, kind: string) {
  const row = store.db.prepare('SELECT * FROM control_challenges WHERE id=? AND kind=?').get(id, kind) as
    { id: string; kind: string; payload: string; hash: string; stage: number; expires_at: number; revision: number; consumed: number; boot_id: string; deadline_mono: number; issued_wall: number } | undefined;
  invariant(row && !row.consumed, 'CHALLENGE_REPLAY');
  invariant(clockFor(store).valid(row), 'CHALLENGE_EXPIRED');
  return row;
}
export function acquireMutation(gate: MutationGate): () => void {
  invariant(!gate.busy, 'CONFIG_BUSY'); gate.busy = true;
  return () => { gate.busy = false; };
}
export function markChallengeConsumed(store: KernelStore, id: string): void {
  const r = store.db.prepare('UPDATE control_challenges SET consumed=1 WHERE id=? AND consumed=0').run(id);
  invariant(r.changes === 1, 'CHALLENGE_REPLAY');
}
```
<!-- agentnexus-export-end -->

## src/agentnexus/storage.ts

类别：`current_native_implementation`；原始字节数：33030。

源文件 SHA256：

```text
172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0004","path":"src/agentnexus/storage.ts","bytes":33030,"sha256":"172d0af0556640f6048b74543715841700aaab9938656d7c48298e6f6472ec7d","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/storage.ts"}} -->
```typescript
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, readFileSync } from 'node:fs';
import { mkdir, open, opendir, lstat, rename, unlink, rmdir } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress, createZstdDecompress, constants } from 'node:zlib';
import { ArtifactStore, CHUNK_BYTES, ensureDirectory, isFileFailure, syncDirectory, writeNewJson } from './artifacts.ts';
import { artifactRefs, frame, MAX_FRAME_BYTES, recordHash, validateInput, validateRecord, ZERO_HASH } from './records.ts';
import { canonical, invariant, NexusError, sha256 } from './types.ts';
import type { AuditInput, ContextInput, DecisionInput, Domain, Json, QueryOptions, StoredRecord } from './types.ts';

type Row = Record<string, unknown>;
type Options = { maxPendingBytes?: number; segmentBytes?: number };
type Segment = { name: string; index: number; bytes: number; first: number; last: number; count: number; rawHash: string; tailBytes: number };
type SegmentManifest = { schema: string; file: string; codec: string; node: string; first_seq: number; last_seq: number; records: number;
  bytes: number; sha256: string; stored_bytes: number; stored_sha256: string; previous_segment_hash: string; hash: string };
type Owner = { schema: string; pid: number; hostname: string; token: string; created_at: string };
const SEGMENT = /^segment-(\d{8})\.jsonl$/;
const DOMAINS: Domain[] = ['audit', 'context', 'decision'];

async function writeAll(handle: FileHandle, data: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < data.byteLength) {
    const { bytesWritten } = await handle.write(data, offset, data.byteLength - offset);
    invariant(bytesWritten > 0, 'STORAGE_IO'); offset += bytesWritten;
  }
}
function storageError(error: unknown): NexusError {
  if (error instanceof NexusError) return error;
  return new NexusError('STORAGE_FAILURE', (error as Error)?.message ?? 'Persistent storage failure');
}
function persistentFailure(error: unknown): boolean {
  if (isFileFailure(error)) return true;
  const e = error as { errcode?: number; code?: string };
  if (typeof e?.errcode === 'number') return ![5, 6, 19].includes(e.errcode & 255); // BUSY, LOCKED, CONSTRAINT are request failures.
  return e?.code === 'ERR_SQLITE_ERROR' || e?.code === 'ERR_INVALID_STATE';
}
async function readOwner(root: string): Promise<{ owner: Owner; raw: string }> {
  const directory = await lstat(join(root, 'writer.lock'));
  invariant(directory.isDirectory() && !directory.isSymbolicLink(), 'STORE_LOCKED');
  const path = join(root, 'writer.lock', 'owner.json'), stat = await lstat(path);
  invariant(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 4096, 'STORE_LOCKED');
  const raw = readFileSync(path, 'utf8'); let owner: Owner;
  try { owner = JSON.parse(raw) as Owner; } catch { throw new NexusError('STORE_LOCKED'); }
  invariant(owner.schema === 'agentnexus/writer-lock/1' && Number.isSafeInteger(owner.pid) && owner.pid > 0 &&
    typeof owner.token === 'string' && /^[a-f0-9-]{36}$/.test(owner.token) && typeof owner.hostname === 'string', 'STORE_LOCKED');
  invariant(raw === canonical(owner) + '\n', 'STORE_LOCKED'); return { owner, raw };
}

export class KernelStore {
  readonly root: string;
  readonly db: DatabaseSync;
  readonly artifacts: ArtifactStore;
  private owner: Owner;
  private pendingLimit: number;
  private segmentLimit: number;
  private inTransaction = false;
  private transactionContext = new AsyncLocalStorage<{ active: boolean }>();
  private closed = false;
  private closing = false;
  private closePromise: Promise<void> | null = null;
  private failure: unknown = null;
  private maintenance = false;
  private flushing: Promise<void> | null = null;
  private active: Segment | null = null;
  private activeHandle: FileHandle | null = null;
  private nextSegment = 1;
  private lastOnDisk = 0;
  private previousSegmentHash = ZERO_HASH;

  private constructor(root: string, db: DatabaseSync, owner: Owner, options: Options) {
    this.root = root; this.db = db; this.owner = owner;
    this.pendingLimit = options.maxPendingBytes ?? 4 * 1024 * 1024;
    this.segmentLimit = options.segmentBytes ?? 16 * 1024 * 1024;
    this.artifacts = new ArtifactStore(join(root, 'artifacts'), { beforeWrite: () => this.assertWritable(), onFault: error => this.freeze(error) });
  }
  get faulted(): boolean { return this.failure !== null; }

  static async open(rootPath: string, options: Options = {}): Promise<KernelStore> {
    const pending = options.maxPendingBytes ?? 4 * 1024 * 1024, segment = options.segmentBytes ?? 16 * 1024 * 1024;
    invariant(Number.isSafeInteger(pending) && pending >= 4096 && pending <= 4 * 1024 * 1024, 'INVALID_STORAGE_LIMIT');
    invariant(Number.isSafeInteger(segment) && segment >= 4096 && segment <= 16 * 1024 * 1024, 'INVALID_STORAGE_LIMIT');
    const root = resolve(rootPath); await ensureDirectory(root);
    invariant(!existsSync(join(root, 'writer.recovery')), 'STORE_LOCKED');
    try { await mkdir(join(root, 'writer.lock')); } catch (error) {
      if ((error as { code?: string }).code === 'EEXIST') throw new NexusError('STORE_LOCKED', 'Existing writer lock requires explicit owner-death recovery.');
      throw error;
    }
    const owner: Owner = { schema: 'agentnexus/writer-lock/1', pid: process.pid, hostname: hostname(), token: randomUUID(), created_at: new Date().toISOString() };
    let db: DatabaseSync | undefined, store: KernelStore | undefined;
    try {
      await writeNewJson(join(root, 'writer.lock', 'owner.json'), owner); await syncDirectory(root);
      invariant(!existsSync(join(root, 'writer.recovery')), 'STORE_LOCKED');
      await ensureDirectory(join(root, 'segments')); await ensureDirectory(join(root, 'recovery'));
      db = new DatabaseSync(join(root, 'kernel.sqlite'));
      const version = String((db.prepare('SELECT sqlite_version() AS version').get() as Row).version).split('.').map(Number);
      invariant(version[0] > 3 || (version[0] === 3 && (version[1] > 51 || (version[1] === 51 && version[2] >= 3))), 'SQLITE_VERSION_BLOCKED');
      db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; PRAGMA trusted_schema=OFF;
        CREATE TABLE IF NOT EXISTS anx_records (
          seq INTEGER PRIMARY KEY, domain TEXT NOT NULL CHECK(domain IN ('audit','context','decision')),
          event_id TEXT NOT NULL UNIQUE, operation_id TEXT NOT NULL, project_id TEXT NOT NULL, task_id TEXT NOT NULL,
          previous_hash TEXT NOT NULL, hash TEXT NOT NULL UNIQUE, body TEXT NOT NULL, frame_bytes INTEGER NOT NULL CHECK(frame_bytes>0)
        ) STRICT;
        CREATE INDEX IF NOT EXISTS anx_records_domain_seq ON anx_records(domain,seq);
        CREATE INDEX IF NOT EXISTS anx_records_task_seq ON anx_records(task_id,seq);
        CREATE INDEX IF NOT EXISTS anx_records_project_task_seq ON anx_records(project_id,task_id,seq);
        CREATE INDEX IF NOT EXISTS anx_records_identity_seq ON anx_records(domain,project_id,task_id,json_extract(body,'$.agent_id'),json_extract(body,'$.session_id'),seq);
        CREATE TABLE IF NOT EXISTS anx_outbox (seq INTEGER PRIMARY KEY REFERENCES anx_records(seq), frame_bytes INTEGER NOT NULL) STRICT;
        CREATE TABLE IF NOT EXISTS anx_exports (seq INTEGER PRIMARY KEY REFERENCES anx_records(seq), segment TEXT NOT NULL, end_offset INTEGER NOT NULL, hash TEXT NOT NULL) STRICT;
        CREATE TRIGGER IF NOT EXISTS anx_records_no_update BEFORE UPDATE ON anx_records BEGIN SELECT RAISE(ABORT,'append only'); END;
        CREATE TRIGGER IF NOT EXISTS anx_records_no_delete BEFORE DELETE ON anx_records BEGIN SELECT RAISE(ABORT,'append only'); END;`);
      await syncDirectory(root);
      store = new KernelStore(root, db, owner, options); await store.artifacts.initialize(); await store.recover(); return store;
    } catch (error) {
      if (store) { store.failure = error; await store.close().catch(() => {}); }
      else {
        db?.close();
        if (existsSync(join(root, 'writer.lock', 'owner.json'))) {
          const current = await readOwner(root).catch(() => null);
          if (current?.owner.token === owner.token) { await unlink(join(root, 'writer.lock', 'owner.json')); await rmdir(join(root, 'writer.lock')); }
        }
      }
      throw storageError(error);
    }
  }

  static async recoverAbandonedLock(rootPath: string): Promise<{ recovered: boolean; evidence_path?: string }> {
    const root = resolve(rootPath); await ensureDirectory(root);
    const guard = join(root, 'writer.recovery');
    try { await mkdir(guard); } catch { throw new NexusError('STORE_LOCKED', 'Another recovery or an uncertain recovery lock exists.'); }
    try {
      if (!existsSync(join(root, 'writer.lock'))) return { recovered: false };
      const first = await readOwner(root);
      invariant(first.owner.hostname === hostname() && first.owner.pid !== process.pid, 'STORE_LOCKED');
      let dead = false;
      try { process.kill(first.owner.pid, 0); } catch (error) { dead = (error as { code?: string }).code === 'ESRCH'; }
      invariant(dead, 'STORE_LOCKED', 'OS did not confirm that the recorded process is absent.');
      const second = await readOwner(root); invariant(first.raw === second.raw, 'STORE_LOCKED');
      const entries: string[] = []; for await (const e of await opendir(join(root, 'writer.lock'))) entries.push(e.name);
      invariant(entries.length === 1 && entries[0] === 'owner.json', 'STORE_LOCKED');
      await ensureDirectory(join(root, 'recovery'));
      const evidence = join(root, 'recovery', 'abandoned-lock-' + first.owner.token + '-' + randomUUID());
      await rename(join(root, 'writer.lock'), evidence); await syncDirectory(root);
      return { recovered: true, evidence_path: evidence };
    } finally { await rmdir(guard); }
  }

  private freeze(error: unknown): void { if (this.failure === null) this.failure = error; }
  private assertWritable(): void {
    const context = this.transactionContext.getStore(); invariant(!context || context.active, 'ASYNC_TRANSACTION');
    invariant(!this.closed && !this.closing, 'STORE_CLOSED'); invariant(!this.faulted, 'STORE_FAULTED');
    invariant(!this.maintenance, 'STORE_BUSY');
  }

  transaction<T>(fn: () => T): T {
    this.assertWritable(); invariant(!this.inTransaction, 'NESTED_TRANSACTION');
    invariant(fn.constructor.name !== 'AsyncFunction', 'ASYNC_TRANSACTION');
    let begun = false; const context = { active: true };
    try {
      this.db.exec('BEGIN IMMEDIATE'); begun = true; this.inTransaction = true;
      const result = this.transactionContext.run(context, fn);
      if (result !== null && (typeof result === 'object' || typeof result === 'function') && typeof (result as { then?: unknown }).then === 'function') {
        void Promise.resolve(result).catch(() => {}); throw new NexusError('ASYNC_TRANSACTION');
      }
      this.db.exec('COMMIT'); begun = false; return result;
    } catch (error) {
      if (begun) { try { this.db.exec('ROLLBACK'); } catch (rollbackError) { this.freeze(rollbackError); } }
      if (persistentFailure(error)) this.freeze(error); throw error;
    } finally { context.active = false; this.inTransaction = false; }
  }

  private append(domain: Domain, input: AuditInput | ContextInput | DecisionInput): StoredRecord {
    this.assertWritable(); const body = validateInput(domain, input);
    for (const ref of artifactRefs(domain, body as unknown as Json)) this.artifacts.assertPublished(ref);
    if (!this.inTransaction) return this.transaction(() => this.append(domain, body));
    const pending = Number((this.db.prepare('SELECT COALESCE(SUM(frame_bytes),0) AS n FROM anx_outbox').get() as Row).n);
    const seq = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS seq FROM anx_records').get() as Row).seq);
    invariant(Number.isSafeInteger(seq) && seq > 0, 'SEQUENCE_EXHAUSTED');
    const tail = this.db.prepare('SELECT hash FROM anx_records WHERE domain=? ORDER BY seq DESC LIMIT 1').get(domain) as Row | undefined;
    const without = { seq, domain, event_id: body.event_id, operation_id: body.operation_id, project_id: body.project_id,
      task_id: body.task_id, previous_hash: String(tail?.hash ?? ZERO_HASH), body: body as unknown as Json };
    const record: StoredRecord = { ...without, hash: recordHash(without) }, encoded = frame(record);
    invariant(pending + encoded.length <= this.pendingLimit, 'BACKPRESSURE', 'Durable outbox budget is full; flush before admitting another record.');
    this.db.prepare('INSERT INTO anx_records(seq,domain,event_id,operation_id,project_id,task_id,previous_hash,hash,body,frame_bytes) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(seq, domain, record.event_id, record.operation_id, record.project_id, record.task_id, record.previous_hash, record.hash, canonical(body), encoded.length);
    this.db.prepare('INSERT INTO anx_outbox(seq,frame_bytes) VALUES(?,?)').run(seq, encoded.length); return record;
  }
  audit(input: AuditInput): StoredRecord { return this.append('audit', input); }
  context(input: ContextInput): StoredRecord { return this.append('context', input); }
  decision(input: DecisionInput): StoredRecord { return this.append('decision', input); }

  private row(row: Row): StoredRecord {
    const body = JSON.parse(String(row.body)); invariant(canonical(body) === row.body, 'RECORD_CORRUPT');
    const record = validateRecord({ seq: row.seq, domain: row.domain, event_id: row.event_id, operation_id: row.operation_id,
      project_id: row.project_id, task_id: row.task_id, previous_hash: row.previous_hash, hash: row.hash, body });
    if (row.frame_bytes !== undefined) invariant(frame(record).length === Number(row.frame_bytes), 'RECORD_CORRUPT');
    return record;
  }

  query(domain: Domain, options: QueryOptions = {}): StoredRecord[] {
    invariant(!this.closed, 'STORE_CLOSED'); invariant(DOMAINS.includes(domain), 'INVALID_DOMAIN');
    return this.queryRows(domain, options);
  }
  private queryRows(domain: Domain | null, options: QueryOptions): StoredRecord[] {
    const limit = options.limit ?? 100, after = options.after ?? 0;
    invariant(Number.isSafeInteger(limit) && limit >= 1 && limit <= 100 && Number.isSafeInteger(after) && after >= 0, 'INVALID_QUERY');
    for (const key of ['task_id', 'project_id', 'agent_id', 'session_id'] as const) if (options[key] !== undefined)
      invariant(typeof options[key] === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(options[key]!), 'INVALID_QUERY');
    const clauses = ['seq>?'], values: (string | number)[] = [after];
    if (domain) { clauses.push('domain=?'); values.push(domain); }
    for (const key of ['task_id', 'project_id'] as const) if (options[key] !== undefined) { clauses.push(key + '=?'); values.push(options[key]!); }
    for (const key of ['agent_id', 'session_id'] as const) if (options[key] !== undefined) {
      clauses.push("json_extract(body,'$." + key + "')=?"); values.push(options[key]!);
    }
    values.push(limit);
    try { return (this.db.prepare('SELECT * FROM anx_records WHERE ' + clauses.join(' AND ') + ' ORDER BY seq LIMIT ?').all(...values) as Row[]).map(r => this.row(r)); }
    catch (error) { this.freeze(error); throw storageError(error); }
  }
  reconstructTask(taskId: string, options: { project_id?: string; after?: number; limit?: number } = {}): { records: StoredRecord[]; next_cursor: number | null } {
    invariant(!this.closed, 'STORE_CLOSED');
    const records = this.queryRows(null, { ...options, task_id: taskId });
    return { records, next_cursor: records.length ? records[records.length - 1].seq : null };
  }

  async flush(): Promise<void> {
    this.assertWritable(); invariant(!this.inTransaction, 'TRANSACTION_ACTIVE');
    const target = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_records').get() as Row).n);
    await this.flushThrough(target);
  }
  private async flushThrough(target: number): Promise<void> {
    while (this.lastOnDisk < target) {
      invariant(!this.faulted, 'STORE_FAULTED');
      if (!this.flushing) {
        this.flushing = this.flushInternal(target).catch(error => { this.freeze(error); throw storageError(error); }).finally(() => { this.flushing = null; });
      }
      await this.flushing;
    }
  }
  private async flushInternal(target = Number.MAX_SAFE_INTEGER): Promise<void> {
    while (true) {
      const row = this.db.prepare('SELECT r.* FROM anx_outbox o JOIN anx_records r USING(seq) WHERE r.seq<=? ORDER BY r.seq LIMIT 1').get(target) as Row | undefined;
      if (!row) break;
      const record = this.row(row), data = frame(record);
      invariant(record.seq === this.lastOnDisk + 1, 'EXPORT_SEQUENCE_CORRUPT');
      if (this.active && this.active.bytes > 0 && this.active.bytes + data.length > this.segmentLimit) await this.sealActive();
      if (!this.active) {
        const name = 'segment-' + String(this.nextSegment).padStart(8, '0') + '.jsonl';
        invariant(this.nextSegment <= 99999999, 'STORAGE_SCAN_LIMIT');
        this.active = { name, index: this.nextSegment, bytes: 0, first: record.seq, last: record.seq - 1, count: 0, rawHash: '', tailBytes: 0 };
        this.activeHandle = await open(join(this.root, 'segments', name), 'ax', 0o600);
        await syncDirectory(join(this.root, 'segments'));
      } else if (!this.activeHandle) this.activeHandle = await open(join(this.root, 'segments', this.active.name), 'a');
      const stat = await this.activeHandle.stat(); invariant(stat.isFile() && stat.size === this.active.bytes, 'EXPORT_CHANGED');
      await writeAll(this.activeHandle, data); await this.activeHandle.sync();
      if (this.active.count === 0) this.active.first = record.seq;
      this.active.bytes += data.length; this.active.last = record.seq; this.active.count++;
      this.acknowledge(record, this.active.name, this.active.bytes); this.lastOnDisk = record.seq;
    }
  }
  private acknowledge(record: StoredRecord, segment: string, endOffset: number): void {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO anx_exports(seq,segment,end_offset,hash) VALUES(?,?,?,?)').run(record.seq, segment, endOffset, record.hash);
      this.db.prepare('DELETE FROM anx_outbox WHERE seq=?').run(record.seq); this.db.exec('COMMIT');
    } catch (error) { try { this.db.exec('ROLLBACK'); } catch {} throw error; }
  }

  private async *rawFrames(path: string): AsyncGenerator<{ data: Buffer; offset: number }, Buffer> {
    let carry = Buffer.alloc(0), offset = 0;
    for await (const chunk of createReadStream(path, { highWaterMark: CHUNK_BYTES })) {
      let data = carry.length ? Buffer.concat([carry, chunk]) : chunk as Buffer;
      let start = 0, end: number;
      while ((end = data.indexOf(10, start)) >= 0) {
        invariant(end + 1 - start <= MAX_FRAME_BYTES, 'EXPORT_CORRUPT');
        const line = data.subarray(start, end + 1); offset += line.length; yield { data: line, offset }; start = end + 1;
      }
      carry = Buffer.from(data.subarray(start)); invariant(carry.length < MAX_FRAME_BYTES, 'EXPORT_CORRUPT');
    }
    return carry;
  }

  private async scanSegment(name: string, previousSeq: number, repair: boolean): Promise<Segment> {
    const path = join(this.root, 'segments', name), info = await lstat(path);
    invariant(info.isFile() && !info.isSymbolicLink(), 'EXPORT_CORRUPT');
    const hash = createHash('sha256'); let bytes = 0, first = 0, last = previousSeq, count = 0;
    const iterator = this.rawFrames(path); let tail = Buffer.alloc(0);
    try {
      while (true) {
        const item = await iterator.next();
        if (item.done) { tail = item.value; break; }
        const { data, offset } = item.value;
        const record = validateRecord(JSON.parse(data.subarray(0, -1).toString('utf8')));
        invariant(record.seq === last + 1 && frame(record).equals(data), 'EXPORT_CORRUPT');
        const dbRow = this.db.prepare('SELECT * FROM anx_records WHERE seq=?').get(record.seq) as Row | undefined;
        invariant(dbRow && frame(this.row(dbRow)).equals(data), 'EXPORT_CORRUPT');
        const receipt = this.db.prepare('SELECT * FROM anx_exports WHERE seq=?').get(record.seq) as Row | undefined;
        if (receipt) invariant(receipt.segment === name && Number(receipt.end_offset) === offset && receipt.hash === record.hash, 'EXPORT_CORRUPT');
        hash.update(data); bytes = offset; if (!count) first = record.seq; last = record.seq; count++;
      }
    } finally { await iterator.return(Buffer.alloc(0)); }
    if (tail.length) {
      const receipt = Number((this.db.prepare('SELECT COALESCE(MAX(end_offset),0) AS n FROM anx_exports WHERE segment=?').get(name) as Row).n);
      invariant(receipt <= bytes && !existsSync(path + '.manifest.json'), 'ACKNOWLEDGED_TAIL_CORRUPT');
      invariant(repair, 'RECOVERY_REQUIRED');
      const saved = await open(join(this.root, 'recovery', name + '.' + randomUUID() + '.tail'), 'wx', 0o600);
      try { await writeAll(saved, tail); await saved.sync(); } finally { await saved.close(); }
      const handle = await open(path, 'r+'); try { await handle.truncate(bytes); await handle.sync(); } finally { await handle.close(); }
    }
    return { name, index: Number(SEGMENT.exec(name)![1]), bytes, first, last, count, rawHash: hash.digest('hex'), tailBytes: tail.length };
  }

  private async verifyCompressed(path: string, expected: SegmentManifest): Promise<void> {
    const raw = createHash('sha256'), stored = createHash('sha256'); let bytes = 0, storedBytes = 0;
    await pipeline(createReadStream(path, { highWaterMark: CHUNK_BYTES }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
        storedBytes += chunk.length; if (storedBytes > expected.stored_bytes) return callback(new NexusError('SEGMENT_CORRUPT'));
        stored.update(chunk); callback(null, chunk);
      } }), createZstdDecompress({ chunkSize: CHUNK_BYTES }),
      new Writable({ highWaterMark: CHUNK_BYTES, write(chunk, _encoding, callback) {
        bytes += chunk.length; if (bytes > expected.bytes) return callback(new NexusError('SEGMENT_CORRUPT'));
        raw.update(chunk); callback();
      } }));
    invariant(bytes === expected.bytes && storedBytes === expected.stored_bytes && raw.digest('hex') === expected.sha256 && stored.digest('hex') === expected.stored_sha256, 'SEGMENT_CORRUPT');
  }

  private async scanSegments(repair: boolean): Promise<{ segments: number; tail_bytes: number }> {
    const names: string[] = []; let nameBytes = 0;
    for await (const entry of await opendir(join(this.root, 'segments'))) {
      invariant(entry.isFile() && !entry.isSymbolicLink(), 'EXPORT_CORRUPT');
      if (SEGMENT.test(entry.name)) { names.push(entry.name); nameBytes += entry.name.length; invariant(nameBytes <= 1024 * 1024, 'STORAGE_SCAN_LIMIT'); }
      else invariant(/^segment-\d{8}\.jsonl\.(?:zst|manifest\.json|[a-f0-9-]{36}\.part|zst\.[a-f0-9-]{36}\.part|manifest\.[a-f0-9-]{36}\.part)$/.test(entry.name), 'EXPORT_CORRUPT');
    }
    names.sort(); let last = 0, previous = ZERO_HASH, tails = 0; this.active = null;
    for (let i = 0; i < names.length; i++) {
      invariant(Number(SEGMENT.exec(names[i])![1]) === i + 1, 'EXPORT_CORRUPT');
      const segment = await this.scanSegment(names[i], last, repair); tails += segment.tailBytes;
      invariant(segment.tailBytes === 0 || i === names.length - 1, 'EXPORT_CORRUPT');
      const manifestPath = join(this.root, 'segments', segment.name + '.manifest.json');
      if (existsSync(manifestPath)) {
        const stat = await lstat(manifestPath); invariant(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 4096, 'SEGMENT_CORRUPT');
        const raw = readFileSync(manifestPath, 'utf8'), manifest = JSON.parse(raw) as SegmentManifest;
        const { hash, ...body } = manifest;
        invariant(raw === canonical(manifest) + '\n' && manifest.schema === 'agentnexus/segment/1' && manifest.codec === 'zstd' && manifest.file === segment.name &&
          manifest.first_seq === segment.first && manifest.last_seq === segment.last && manifest.records === segment.count &&
          manifest.bytes === segment.bytes && manifest.sha256 === segment.rawHash && manifest.previous_segment_hash === previous && hash === sha256(canonical(body)), 'SEGMENT_CORRUPT');
        await this.verifyCompressed(join(this.root, 'segments', segment.name + '.zst'), manifest); previous = hash;
      } else { invariant(i === names.length - 1, 'EXPORT_CORRUPT'); this.active = segment; }
      last = segment.last;
    }
    const receipt = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_exports').get() as Row).n);
    invariant(receipt <= last, 'ACKNOWLEDGED_EXPORT_MISSING');
    this.lastOnDisk = last; this.previousSegmentHash = previous;
    this.nextSegment = this.active ? this.active.index : names.length + 1;
    return { segments: names.length, tail_bytes: tails };
  }

  private verifyDatabase(): number {
    const check = this.db.prepare('PRAGMA quick_check(1)').get() as Row;
    invariant(Object.values(check)[0] === 'ok', 'DATABASE_CORRUPT');
    const previous: Record<Domain, string> = { audit: ZERO_HASH, context: ZERO_HASH, decision: ZERO_HASH };
    let after = 0, count = 0;
    while (true) {
      const rows = this.db.prepare('SELECT * FROM anx_records WHERE seq>? ORDER BY seq LIMIT 32').all(after) as Row[];
      if (!rows.length) break;
      for (const row of rows) {
        const record = this.row(row);
        invariant(record.seq === after + 1 && record.previous_hash === previous[record.domain], 'RECORD_CHAIN_CORRUPT');
        previous[record.domain] = record.hash; after = record.seq; count++;
        for (const ref of artifactRefs(record.domain, record.body)) this.artifacts.assertPublished(ref);
        const outbox = this.db.prepare('SELECT frame_bytes FROM anx_outbox WHERE seq=?').get(record.seq) as Row | undefined;
        const receipt = this.db.prepare('SELECT hash FROM anx_exports WHERE seq=?').get(record.seq) as Row | undefined;
        invariant(Boolean(outbox) !== Boolean(receipt), 'OUTBOX_CORRUPT');
        if (outbox) invariant(Number(outbox.frame_bytes) === Number(row.frame_bytes), 'OUTBOX_CORRUPT');
        if (receipt) invariant(receipt.hash === record.hash, 'OUTBOX_CORRUPT');
      }
    }
    const total = Number((this.db.prepare('SELECT (SELECT COUNT(*) FROM anx_outbox)+(SELECT COUNT(*) FROM anx_exports) AS n').get() as Row).n);
    invariant(total === count, 'OUTBOX_CORRUPT'); return count;
  }

  async verify(): Promise<{ records: number; segments: number; pending: number; objects: number; incomplete: number }> {
    invariant(!this.closed && !this.inTransaction && !this.maintenance && !this.flushing, 'STORE_BUSY');
    this.maintenance = true;
    try {
      const records = this.verifyDatabase(), segments = await this.scanSegments(false), artifacts = await this.artifacts.verify();
      const pending = Number((this.db.prepare('SELECT COUNT(*) AS n FROM anx_outbox').get() as Row).n);
      return { records, segments: segments.segments, pending, objects: artifacts.objects, incomplete: artifacts.incomplete };
    } catch (error) { this.freeze(error); throw storageError(error); }
    finally { this.maintenance = false; }
  }

  async recover(): Promise<{ records: number; exported: number; recovered_tail_bytes: number; objects: number; incomplete: number }> {
    invariant(!this.closed && !this.closing && !this.inTransaction && !this.maintenance && !this.flushing, 'STORE_BUSY');
    this.maintenance = true;
    try {
      if (this.activeHandle) { await this.activeHandle.close(); this.activeHandle = null; }
      const records = this.verifyDatabase(), segments = await this.scanSegments(true), artifacts = await this.artifacts.verify();
      // A complete line may have reached the file before its SQLite receipt. Sync it
      // again before acknowledging; the DB outbox is the source of pending facts.
      const names: string[] = [];
      for await (const e of await opendir(join(this.root, 'segments'))) if (SEGMENT.test(e.name)) names.push(e.name);
      names.sort();
      for (const name of names) {
        const path = join(this.root, 'segments', name), handle = await open(path, 'r+');
        try { await handle.sync(); } finally { await handle.close(); }
        const iterator = this.rawFrames(path);
        try {
          while (true) {
            const next = await iterator.next(); if (next.done) break;
            const record = validateRecord(JSON.parse(next.value.data.subarray(0, -1).toString('utf8')));
            if (this.db.prepare('SELECT 1 FROM anx_outbox WHERE seq=?').get(record.seq)) this.acknowledge(record, name, next.value.offset);
          }
        } finally { await iterator.return(Buffer.alloc(0)); }
      }
      await this.flushInternal(); this.failure = null;
      return { records, exported: this.lastOnDisk, recovered_tail_bytes: segments.tail_bytes, objects: artifacts.objects, incomplete: artifacts.incomplete };
    } catch (error) { this.freeze(error); throw storageError(error); }
    finally { this.maintenance = false; }
  }

  private async sealActive(): Promise<void> {
    if (!this.active || !this.active.count) return;
    if (this.activeHandle) { await this.activeHandle.sync(); await this.activeHandle.close(); this.activeHandle = null; }
    const segment = this.active, path = join(this.root, 'segments', segment.name);
    const expected = await this.scanSegment(segment.name, segment.first - 1, false);
    const rawHash = createHash('sha256'), storedHash = createHash('sha256'); let rawBytes = 0, storedBytes = 0;
    const compressed = path + '.zst', temporary = compressed + '.' + randomUUID() + '.part';
    await pipeline(createReadStream(path, { highWaterMark: CHUNK_BYTES }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) { rawBytes += chunk.length; rawHash.update(chunk); callback(null, chunk); } }),
      createZstdCompress({ chunkSize: CHUNK_BYTES, params: { [constants.ZSTD_c_checksumFlag]: 1 } }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) { storedBytes += chunk.length; storedHash.update(chunk); callback(null, chunk); } }),
      createWriteStream(temporary, { flags: 'wx', mode: 0o600, highWaterMark: CHUNK_BYTES, flush: true }));
    const hashRaw = rawHash.digest('hex'); invariant(rawBytes === expected.bytes && hashRaw === expected.rawHash, 'EXPORT_CHANGED');
    if (existsSync(compressed)) await rename(compressed, join(this.root, 'recovery', segment.name + '.unacknowledged-' + randomUUID() + '.zst'));
    await rename(temporary, compressed); await syncDirectory(join(this.root, 'segments'));
    const body = { schema: 'agentnexus/segment/1', file: segment.name, codec: 'zstd', node: process.version,
      first_seq: expected.first, last_seq: expected.last, records: expected.count, bytes: rawBytes, sha256: hashRaw,
      stored_bytes: storedBytes, stored_sha256: storedHash.digest('hex'), previous_segment_hash: this.previousSegmentHash };
    const manifest = { ...body, hash: sha256(canonical(body)) };
    const pending = path + '.manifest.' + randomUUID() + '.part';
    await writeNewJson(pending, manifest); await rename(pending, path + '.manifest.json'); await syncDirectory(join(this.root, 'segments'));
    this.previousSegmentHash = manifest.hash; this.nextSegment = segment.index + 1; this.active = null;
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closing = true; this.closePromise = this.closeInternal(); return this.closePromise;
  }
  private async closeInternal(): Promise<void> {
    let error: unknown = null;
    try {
      await this.artifacts.waitForIdle(); if (this.flushing) await this.flushing;
      if (!this.faulted) {
        const target = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_records').get() as Row).n);
        await this.flushThrough(target); await this.sealActive();
      }
    } catch (e) { this.freeze(e); error = e; }
    finally {
      await this.activeHandle?.close().catch(() => {}); this.activeHandle = null; await this.artifacts.close();
      try { this.db.close(); } catch (e) { error ??= e; }
      this.closed = true;
      const current = await readOwner(this.root).catch(() => null);
      if (current?.owner.token === this.owner.token) {
        await unlink(join(this.root, 'writer.lock', 'owner.json')); await rmdir(join(this.root, 'writer.lock')); await syncDirectory(this.root);
      } else error ??= new NexusError('STORE_LOCK_CHANGED');
    }
    if (error) throw storageError(error);
  }
}
```
<!-- agentnexus-export-end -->

## src/agentnexus/artifacts.ts

类别：`current_native_implementation`；原始字节数：15666。

源文件 SHA256：

```text
f89cd95c7c373e1551d509f82596e54e203f0bb02b2934e1c2108040ef48bc49
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0005","path":"src/agentnexus/artifacts.ts","bytes":15666,"sha256":"f89cd95c7c373e1551d509f82596e54e203f0bb02b2934e1c2108040ef48bc49","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_native_implementation","kind":"original","origin":{"kind":"workspace","path":"src/agentnexus/artifacts.ts"}} -->
```typescript
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, lstatSync, readFileSync } from 'node:fs';
import { mkdir, open, rename, lstat, opendir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress, createZstdDecompress, constants } from 'node:zlib';
import { canonical, invariant, NexusError } from './types.ts';
import type { ArtifactRef } from './types.ts';
import { MAX_ARTIFACT_BYTES, validateArtifactRef } from './records.ts';

export const CHUNK_BYTES = 64 * 1024;
export type ArtifactOptions = { maxBytes?: number; media_type?: string; sensitivity?: 'NORMAL'; signal?: AbortSignal };
const IO_CODES = new Set(['EIO', 'ENOSPC', 'EDQUOT', 'EACCES', 'EPERM', 'EROFS', 'ENOENT', 'EMFILE', 'ENFILE', 'EISDIR', 'ENOTDIR', 'EEXIST', 'EBADF']);
export function isFileFailure(error: unknown): boolean { return IO_CODES.has((error as { code?: string })?.code ?? ''); }

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
  const info = await lstat(path);
  invariant(info.isDirectory() && !info.isSymbolicLink(), 'UNSAFE_STORAGE_PATH');
}

// Node on Windows does not expose a portable directory fsync handle. File syncs are
// real; hard-power-loss / directory durability remains an explicitly untested limit.
export async function syncDirectory(path: string): Promise<boolean> {
  if (process.platform === 'win32') return false;
  const handle = await open(path, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
  return true;
}

export async function writeNewJson(path: string, value: unknown): Promise<void> {
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(canonical(value) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
}

export class ArtifactStore {
  readonly root: string;
  readonly objects: string;
  readonly partials: string;
  readonly stats = { activePuts: 0, maxActivePuts: 0, maxInputChunk: 0, drains: 0, inputBytes: 0, directorySyncSupported: process.platform !== 'win32' };
  private onFault: (error: unknown) => void;
  private beforeWrite: () => void;
  private active = new Set<Promise<ArtifactRef>>();
  private closed = false;

  constructor(root: string, options: { onFault?: (error: unknown) => void; beforeWrite?: () => void } = {}) {
    this.root = resolve(root); this.objects = join(this.root, 'objects'); this.partials = join(this.root, 'partials');
    this.onFault = options.onFault ?? (() => {}); this.beforeWrite = options.beforeWrite ?? (() => {});
  }
  async initialize(): Promise<void> { await ensureDirectory(this.objects); await ensureDirectory(this.partials); }

  put(source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, options: ArtifactOptions = {}): Promise<ArtifactRef> {
    try {
      invariant(!this.closed, 'STORE_CLOSED'); this.beforeWrite();
      invariant(this.active.size < 2, 'BACKPRESSURE', 'At most two artifact streams may be active; retry after a stream settles.');
      invariant(options.sensitivity === undefined || options.sensitivity === 'NORMAL', 'SECRET_UNSUPPORTED');
      const max = options.maxBytes ?? 64 * 1024 * 1024;
      invariant(Number.isSafeInteger(max) && max >= 0 && max <= MAX_ARTIFACT_BYTES, 'INVALID_ARTIFACT_LIMIT');
      const media = options.media_type ?? 'application/octet-stream';
      invariant(typeof media === 'string' && media.length > 0 && Buffer.byteLength(media) <= 200 && !/[\x00-\x1f\x7f]/.test(media), 'INVALID_MEDIA_TYPE');
      const pending = this.putStream(source, { ...options, maxBytes: max, media_type: media });
      this.active.add(pending); this.stats.activePuts = this.active.size; this.stats.maxActivePuts = Math.max(this.stats.maxActivePuts, this.active.size);
      void pending.then(() => { this.active.delete(pending); this.stats.activePuts = this.active.size; }, () => { this.active.delete(pending); this.stats.activePuts = this.active.size; });
      return pending;
    } catch (error) { return Promise.reject(error); }
  }

  async putBytes(bytes: Uint8Array, options: ArtifactOptions = {}): Promise<ArtifactRef> {
    invariant(bytes instanceof Uint8Array, 'INVALID_ARTIFACT_CHUNK');
    function* chunks() { for (let i = 0; i < bytes.byteLength; i += CHUNK_BYTES) yield bytes.subarray(i, i + CHUNK_BYTES); }
    return this.put(chunks(), options);
  }

  private async putStream(source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, options: ArtifactOptions & { maxBytes: number; media_type: string }): Promise<ArtifactRef> {
    const id = randomUUID(), partial = join(this.partials, id + '.part');
    const object = join(this.objects, id + '.zst'), manifest = join(this.objects, id + '.json');
    const rawHash = createHash('sha256'), storedHash = createHash('sha256');
    let rawBytes = 0, storedBytes = 0, stage = 'PARTIAL';
    let inputDone = false, cleanupRequested = false, cleanupConfirmed = false, pendingNext = false, interruptedNext = false;
    let pipelineFailure: unknown = null;
    const iterable = source as AsyncIterable<Uint8Array> & Iterable<Uint8Array>;
    const iterator = iterable[Symbol.asyncIterator]?.() ?? iterable[Symbol.iterator]?.();
    invariant(iterator && typeof iterator.next === 'function', 'INVALID_ARTIFACT_SOURCE');
    const cancellation = new AbortController();
    const stop = (error: unknown) => {
      pipelineFailure ??= error;
      if (isFileFailure(error)) this.onFault(error);
      if (!cancellation.signal.aborted) cancellation.abort(error);
    };
    const forwardAbort = () => stop(options.signal!.reason);
    options.signal?.addEventListener('abort', forwardAbort, { once: true });
    if (options.signal?.aborted) forwardAbort();
    let rejectAbort!: () => void;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = () => { interruptedNext ||= pendingNext; reject(cancellation.signal.reason ?? new DOMException('Aborted', 'AbortError')); };
      if (cancellation.signal.aborted) rejectAbort(); else cancellation.signal.addEventListener('abort', rejectAbort, { once: true });
    });
    void aborted.catch(() => {});
    const requestCleanup = () => {
      if (inputDone || cleanupRequested) return;
      cleanupRequested = true;
      try {
        // Request iterator cleanup, but never let an uncontrolled return() hold a
        // Store file handle or close barrier forever. This is not OS process exit.
        const returned = iterator.return?.();
        if (returned) void Promise.resolve(returned).then(result => { cleanupConfirmed = result.done === true; }, () => {});
      } catch { /* INCOMPLETE metadata below preserves UNKNOWN cleanup. */ }
    };
    const owner = this;
    async function* bounded() {
      try {
        while (true) {
          cancellation.signal.throwIfAborted(); pendingNext = true;
          let next: IteratorResult<Uint8Array>;
          try { next = await Promise.race([Promise.resolve().then(() => iterator.next()), aborted]); }
          finally { pendingNext = false; }
          cancellation.signal.throwIfAborted();
          if (next.done) { inputDone = true; break; }
          const incoming = next.value;
          invariant(incoming instanceof Uint8Array && incoming.byteLength <= CHUNK_BYTES, 'INVALID_ARTIFACT_CHUNK');
          invariant(rawBytes + incoming.byteLength <= options.maxBytes, 'ARTIFACT_LIMIT');
          // Snapshot each bounded chunk before yielding across an asynchronous boundary.
          const chunk = Buffer.from(incoming); rawBytes += chunk.byteLength; rawHash.update(chunk);
          owner.stats.maxInputChunk = Math.max(owner.stats.maxInputChunk, chunk.byteLength); owner.stats.inputBytes += chunk.byteLength;
          yield chunk;
        }
      } finally { requestCleanup(); }
    }
    const storedLimit = options.maxBytes + Math.ceil(options.maxBytes / 128) + CHUNK_BYTES;
    const digest = new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
      storedBytes += chunk.length;
      if (storedBytes > storedLimit) { callback(new NexusError('ARTIFACT_STORED_LIMIT')); return; }
      storedHash.update(chunk); callback(null, chunk);
    } });
    const output = createWriteStream(partial, { flags: 'wx', mode: 0o600, highWaterMark: CHUNK_BYTES, flush: true });
    output.on('drain', () => { this.stats.drains++; });
    const input = Readable.from(bounded(), { objectMode: false, highWaterMark: CHUNK_BYTES });
    const compression = createZstdCompress({ chunkSize: CHUNK_BYTES, readableHighWaterMark: CHUNK_BYTES, writableHighWaterMark: CHUNK_BYTES,
      params: { [constants.ZSTD_c_checksumFlag]: 1 } });
    for (const stream of [input, compression, digest, output]) stream.once('error', stop);
    try {
      await pipeline(input, compression, digest, output, { signal: cancellation.signal });
      const ref: ArtifactRef = { artifact_id: id, sha256: rawHash.digest('hex'), bytes: rawBytes, codec: 'zstd',
        stored_sha256: storedHash.digest('hex'), stored_bytes: storedBytes, media_type: options.media_type, sensitivity: 'NORMAL' };
      validateArtifactRef(ref);
      await rename(partial, object); stage = 'OBJECT_WITHOUT_MANIFEST'; await syncDirectory(this.objects);
      const pendingManifest = join(this.partials, id + '.manifest.part');
      await writeNewJson(pendingManifest, ref); await rename(pendingManifest, manifest); await syncDirectory(this.objects);
      return ref;
    } catch (error) {
      requestCleanup(); const failure = pipelineFailure ?? error;
      if (isFileFailure(failure)) this.onFault(failure);
      if (interruptedNext && !cleanupConfirmed) this.onFault(new NexusError('SOURCE_CLEANUP_UNKNOWN', 'Store stream stopped; source iterator cleanup was not confirmed.'));
      // Never delete the only partial bytes or return a complete Ref after failure.
      try { await writeNewJson(join(this.partials, id + '.incomplete.json'), {
        artifact_id: id, status: 'INCOMPLETE', stage, input_bytes_observed: rawBytes,
        compressed_bytes_observed: storedBytes, durable_offset: null,
        reason: (failure as { code?: string })?.code ?? (failure as Error)?.name ?? 'STREAM_FAILED',
        store_output_closed: output.closed,
        producer_cleanup: inputDone ? 'ITERATION_COMPLETE' : cleanupConfirmed ? 'ITERATOR_RETURN_ACKNOWLEDGED' : 'UNKNOWN',
        producer_exit: 'NOT_VERIFIED',
      }); } catch (recordError) { this.onFault(recordError); }
      throw failure;
    } finally {
      options.signal?.removeEventListener('abort', forwardAbort); cancellation.signal.removeEventListener('abort', rejectAbort);
    }
  }

  assertPublished(ref: ArtifactRef): void {
    validateArtifactRef(ref);
    const manifest = join(this.objects, ref.artifact_id + '.json');
    let raw: string;
    try {
      const info = lstatSync(manifest);
      invariant(info.isFile() && !info.isSymbolicLink() && info.size <= 4096, 'ARTIFACT_NOT_PUBLISHED');
      raw = readFileSync(manifest, 'utf8');
      invariant(raw === canonical(ref) + '\n', 'ARTIFACT_REF_MISMATCH');
      const object = lstatSync(join(this.objects, ref.artifact_id + '.zst'));
      invariant(object.isFile() && !object.isSymbolicLink() && object.size === ref.stored_bytes, 'ARTIFACT_NOT_PUBLISHED');
    } catch (error) {
      if (error instanceof NexusError) throw error;
      throw new NexusError('ARTIFACT_NOT_PUBLISHED');
    }
  }

  async *read(ref: ArtifactRef): AsyncGenerator<Uint8Array, void> {
    invariant(!this.closed, 'STORE_CLOSED'); validateArtifactRef(ref);
    let source: ReturnType<typeof createReadStream> | undefined;
    let digest: Transform | undefined, decompressor: ReturnType<typeof createZstdDecompress> | undefined;
    let flow: Promise<void> | undefined, finished = false;
    const rawHash = createHash('sha256'), storedHash = createHash('sha256');
    let rawBytes = 0, storedBytes = 0;
    try {
      this.assertPublished(ref);
      source = createReadStream(join(this.objects, ref.artifact_id + '.zst'), { highWaterMark: CHUNK_BYTES });
      digest = new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
        storedBytes += chunk.length;
        if (storedBytes > ref.stored_bytes) { callback(new NexusError('ARTIFACT_CORRUPT')); return; }
        storedHash.update(chunk); callback(null, chunk);
      } });
      decompressor = createZstdDecompress({ chunkSize: CHUNK_BYTES, readableHighWaterMark: CHUNK_BYTES, writableHighWaterMark: CHUNK_BYTES });
      flow = pipeline(source, digest, decompressor); void flow.catch(() => {});
      for await (const chunk of decompressor) {
        invariant(chunk.byteLength <= CHUNK_BYTES && rawBytes + chunk.byteLength <= ref.bytes, 'ARTIFACT_CORRUPT');
        rawBytes += chunk.byteLength; rawHash.update(chunk); yield chunk;
      }
      await flow;
      invariant(rawBytes === ref.bytes && storedBytes === ref.stored_bytes && rawHash.digest('hex') === ref.sha256 && storedHash.digest('hex') === ref.stored_sha256, 'ARTIFACT_CORRUPT');
      finished = true;
    } catch (error) {
      this.onFault(error);
      throw new NexusError('ARTIFACT_CORRUPT', 'Artifact stream or hash validation failed; preserve the object and recover explicitly.');
    } finally {
      source?.destroy(); digest?.destroy(); decompressor?.destroy();
      if (flow) await flow.catch(() => {});
      // Early iterator return intentionally skips the final verification barrier.
      // Bytes already yielded must not be described as a verified complete object.
      if (!finished) { /* no verified completion is returned */ }
    }
  }

  async verify(): Promise<{ objects: number; bytes: number; incomplete: number }> {
    let objects = 0, bytes = 0, entries = 0;
    const incompleteIds = new Set<string>(), compressedIds = new Set<string>(), completeIds = new Set<string>();
    const directory = await opendir(this.objects);
    for await (const entry of directory) {
      invariant(++entries <= 200000, 'STORAGE_SCAN_LIMIT');
      invariant(entry.isFile() && !entry.isSymbolicLink(), 'ARTIFACT_CORRUPT');
      if (entry.name.endsWith('.zst')) {
        invariant(/^[a-f0-9-]{36}\.zst$/.test(entry.name), 'ARTIFACT_CORRUPT');
        compressedIds.add(entry.name.slice(0, 36)); continue;
      }
      invariant(/^[a-f0-9-]{36}\.json$/.test(entry.name), 'ARTIFACT_CORRUPT');
      const path = join(this.objects, entry.name), info = await lstat(path);
      invariant(info.size <= 4096, 'ARTIFACT_CORRUPT');
      const ref = JSON.parse(readFileSync(path, 'utf8')) as ArtifactRef; validateArtifactRef(ref);
      invariant(entry.name === ref.artifact_id + '.json', 'ARTIFACT_CORRUPT');
      for await (const _chunk of this.read(ref)) { /* streamed verification */ }
      completeIds.add(ref.artifact_id); objects++; bytes += ref.bytes;
    }
    const partialDirectory = await opendir(this.partials);
    for await (const entry of partialDirectory) {
      invariant(++entries <= 200000 && entry.isFile() && !entry.isSymbolicLink(), 'STORAGE_SCAN_LIMIT');
      invariant(/^[a-f0-9-]{36}\.(?:part|manifest\.part|incomplete\.json)$/.test(entry.name), 'ARTIFACT_CORRUPT');
      incompleteIds.add(entry.name.slice(0, 36));
    }
    for (const id of compressedIds) if (!completeIds.has(id)) incompleteIds.add(id);
    return { objects, bytes, incomplete: incompleteIds.size };
  }

  async waitForIdle(): Promise<void> { await Promise.allSettled([...this.active]); }
  async close(): Promise<void> { this.closed = true; await this.waitForIdle(); }
}
```
<!-- agentnexus-export-end -->

