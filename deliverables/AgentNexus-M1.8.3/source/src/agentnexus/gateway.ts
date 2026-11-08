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
  resource_id?: string;
  approval_id?: string; expected_feature_epoch?: number; expected_policy_epoch?: number;
};
export type ToolOutput = { data: Json; stdout?: AsyncIterable<Uint8Array> | Iterable<Uint8Array>; stderr?: AsyncIterable<Uint8Array> | Iterable<Uint8Array>; exit_code?: number | null; artifact_refs?: ArtifactRef[] };
export type ToolCapability = 'PURE' | 'READ_ONLY' | 'LOCAL_WRITE' | 'EXTERNAL_EFFECT' | 'PROCESS';
export type ToolContext = { readonly identity: Readonly<Identity>; readonly operation_id: string; readonly resource_id: string | null; readonly signal: AbortSignal; readonly validation: ValidationResult | null };
export type ToolDefinition = {
  id: string; version: string; feature_id: string; policy_ids: string[]; requires_sandbox: boolean;
  capability: ToolCapability;
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
  return sha256(canonical({ identity, call_id: request.call_id, tool_id: request.tool_id, tool_version: request.tool_version, arguments: request.arguments, ...(request.resource_id !== undefined ? { resource_id: request.resource_id } : {}) }));
}

export class ToolGateway {
  #store: KernelStore; #features: FeatureRegistry; #policy: PolicyEngine; #admin: AdminCheck; #gate: MutationGate;
  #tools = new Map<string, ToolDefinition>();
  #activeRequests = 0;
  #running = new Set<string>();
  #requests = new Set<string>();
  constructor(store: KernelStore, features: FeatureRegistry, policy: PolicyEngine, checkAdmin: AdminCheck, gate: MutationGate) {
    this.#store = store; this.#features = features; this.#policy = policy; this.#admin = checkAdmin; this.#gate = gate;
  }
  register(admin: unknown, definition: ToolDefinition): void {
    this.#admin(admin); invariant(!this.#tools.has(definition.id), 'TOOL_ALREADY_REGISTERED');
    invariant(Object.keys(definition).every(k => ['id','version','feature_id','capability','policy_ids','requires_sandbox','timeout_ms','schema','validate','writer_resource','execute'].includes(k)), 'INVALID_TOOL_FIELDS');
    invariant(typeof definition.id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(definition.id) && typeof definition.version === 'string' && definition.version.length > 0 && definition.version.length <= 64, 'INVALID_TOOL');
    invariant(['PURE','READ_ONLY','LOCAL_WRITE','EXTERNAL_EFFECT','PROCESS'].includes(definition.capability), 'UNKNOWN_TOOL_CAPABILITY');
    invariant(typeof definition.requires_sandbox === 'boolean' && typeof definition.schema === 'function' && typeof definition.execute === 'function', 'INVALID_TOOL');
    invariant(definition.validate === undefined || typeof definition.validate === 'function', 'INVALID_TOOL');
    this.#features.resolve(definition.feature_id); this.#policy.validateSelection(definition.policy_ids);
    if (!['PURE','READ_ONLY'].includes(definition.capability)) {
      invariant(definition.policy_ids.length > 0, 'SIDE_EFFECT_POLICY_REQUIRED');
      invariant(typeof definition.writer_resource === 'function', 'WRITER_RESOURCE_REQUIRED');
    } else invariant(definition.writer_resource === undefined, 'CAPABILITY_RESOURCE_MISMATCH');
    invariant(definition.timeout_ms === undefined || (Number.isSafeInteger(definition.timeout_ms) && definition.timeout_ms >= 10 && definition.timeout_ms <= 30000), 'INVALID_TOOL_TIMEOUT');
    this.#tools.set(definition.id, Object.freeze({ ...definition, policy_ids: Object.freeze([...definition.policy_ids]) as unknown as string[] }));
  }
  executorRunning(operationId: string): boolean { return this.#running.has(operationId); }
  requestActive(operationId: string): boolean { return this.#requests.has(operationId); }
  describe(): { id: string; version: string; feature_id: string; requires_sandbox: boolean; capability: ToolCapability }[] {
    return [...this.#tools.values()].map(d => ({ id: d.id, version: d.version, feature_id: d.feature_id, requires_sandbox: d.requires_sandbox, capability: d.capability }));
  }
  preview(request: ToolRequest) {
    const input = JSON.parse(boundedJson(request)) as ToolRequest;
    const definition = this.#tools.get(input.tool_id);
    invariant(definition && definition.version === input.tool_version, 'UNKNOWN_TOOL_VERSION');
    definition.schema(freezeJson(input.arguments));
    return Object.freeze({ id: definition.id, version: definition.version, feature_id: definition.feature_id, capability: definition.capability, requires_sandbox: definition.requires_sandbox });
  }
  async run(identity: Identity, request: ToolRequest, trustedSignal?: AbortSignal): Promise<ToolResult> {
    invariant(this.#activeRequests < 32, 'GATEWAY_BACKPRESSURE'); this.#activeRequests++;
    try { return await this.#run(identity, request, trustedSignal); }
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
  async #run(identity: Identity, request: ToolRequest, trustedSignal?: AbortSignal): Promise<ToolResult> {
    invariant(!trustedSignal?.aborted, 'TASK_CANCEL_REQUESTED');
    validateIdentity(identity); boundedJson(request);
    invariant(Object.keys(request).every(k => ['call_id','tool_id','tool_version','arguments','resource_id','approval_id','expected_feature_epoch','expected_policy_epoch'].includes(k)), 'INVALID_TOOL_REQUEST');
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
    let executionTimer: ReturnType<typeof setTimeout> | undefined;
    const onCancellation = () => lease?.cancel(new NexusError('TASK_CANCEL_REQUESTED'));
    trustedSignal?.addEventListener('abort',onCancellation,{once:true});
    let deadline = Infinity, timedOut = false;
    const timeoutError = new NexusError('TOOL_TIMEOUT');
    const checkDeadline = () => {
      if (timedOut || performance.now() >= deadline) { timedOut = true; lease?.cancel(timeoutError); throw timeoutError; }
    };
    let completion: Promise<{ ok: true; output: ToolOutput } | { ok: false; error: unknown }> | null = null;
    const emit = (phase: string, extras: Partial<ReturnType<typeof auditEvent>> = {}) => {
      const r = this.#store.audit(auditEvent(identitySnapshot, { operation_id: op, operation_type: 'TOOL', phase, cwd: this.#store.root,
        parameters_ref: inputRef, parameters: { tool_id: def.id, tool_version: def.version, intent_hash: hash }, authorization_ref: input.approval_id ?? null,
        ...extras })); auditId = r.event_id; return r;
    };
    const observeSettled = () => {
      try {
        this.#store.transaction(() => {
          this.#store.db.prepare("UPDATE control_operations SET executor_state='SETTLED' WHERE operation_id=?").run(op);
          emit('EXECUTOR_SETTLED', { execution_status: 'SETTLED', detail: { observation: 'TRUSTED_LOCAL_HANDLER_AND_OUTPUTS', os_process_tree_verified: false } });
        });
      } catch { /* Missing exit evidence keeps reconciliation fail-closed. */ }
    };
    this.#requests.add(op);
    try {
      invariant(!this.#gate.busy, 'CONFIG_QUIESCING');
      const existing = this.#store.db.prepare('SELECT operation_id FROM control_operations WHERE request_key=?').get(key) as { operation_id: string } | undefined;
      if (existing) return { status: 'BLOCKED', reason: 'DUPLICATE_OPERATION', operation_id: existing.operation_id, intent_hash: hash, data: null, stdout_ref: null, stderr_ref: null, audit_event_id: null, permit_id: null };
      inputRef = await this.#store.artifacts.putBytesQueued(Buffer.from(canonical(input)), { media_type: 'application/json', maxBytes: 65536,signal:trustedSignal });
      this.#store.transaction(() => {
        this.#store.db.prepare("INSERT INTO control_operations(operation_id,request_key,intent_hash,subject,state,executor_state) VALUES(?,?,?,?,?,'NOT_INVOKED')").run(op, key, hash, identitySnapshot.agent_id, 'PREPARED');
        const event = emit('RECEIVED');
        this.#store.context({ ...identitySnapshot, event_id: uid(), operation_id: op, observed_at: now(), kind: 'tool.request', payload_ref: inputRef!, audit_event_refs: [event.event_id] });
      }); registered = true;
      await this.#store.flush();
      lease = this.#features.acquire(def.feature_id, scope);
      if(trustedSignal?.aborted)onCancellation();
      const m = metadata(this.#store);
      if (input.expected_feature_epoch !== undefined) invariant(input.expected_feature_epoch === m.feature_epoch, 'FEATURE_EPOCH_STALE');
      if (input.expected_policy_epoch !== undefined) invariant(input.expected_policy_epoch === m.policy_epoch, 'POLICY_EPOCH_STALE');
      // No arbitrary execution backend is admitted in M1. A policy bypass never changes this owner check.
      invariant(!def.requires_sandbox && !['EXTERNAL_EFFECT','PROCESS'].includes(def.capability), 'SANDBOX_NOT_VERIFIED');
      if (def.capability === 'LOCAL_WRITE') {
        invariant(typeof input.resource_id === 'string' && input.resource_id.startsWith(identitySnapshot.project_id + ':') && input.resource_id.length <= 256, 'EXACT_RESOURCE_REQUIRED');
        resource = input.resource_id;
        invariant(def.writer_resource!(args, identitySnapshot) === resource, 'RESOURCE_SCOPE_MISMATCH');
      } else invariant(input.resource_id === undefined, 'CAPABILITY_RESOURCE_MISMATCH');
      const validation = def.validate ? await def.validate(args, lease.signal, identitySnapshot) : null;
      if (validation) { emit('VALIDATED', { detail: { status: validation.status, reason: validation.reason, dimensions: validation.dimensions, source_sha256: validation.source_sha256 } as Json }); await this.#store.flush(); }
      this.#features.assertEpoch(lease.epoch); invariant(!lease.signal.aborted && !this.#gate.busy, 'EXECUTION_REVOKED');
      decision = this.#policy.evaluate(def.policy_ids, { identity: identitySnapshot, intent_hash: hash, ...(input.approval_id ? { approval_id: input.approval_id } : {}), validation });
      const decisionEvent = emit('POLICY_DECISION', { detail: decision as unknown as Json, execution_status: decision.allowed ? 'AUTHORIZED' : 'BLOCKED' });
      await this.#store.flush();
      invariant(decision.allowed, 'POLICY_DENIED');
      if (def.capability === 'LOCAL_WRITE') invariant(this.#policy.approvalValid(input.approval_id, hash, identitySnapshot), 'SIDE_EFFECT_APPROVAL_REQUIRED');
      permit = uid();
      this.#store.transaction(() => {
        const meta = metadata(this.#store);
        invariant(meta.feature_epoch === lease!.epoch && meta.policy_epoch === decision!.policy_epoch, 'EPOCH_STALE');
        const clockLease = clockFor(this.#store).issue(30000);
        this.#store.db.prepare('INSERT INTO control_permits(id,operation_id,intent_hash,subject,expires_at,feature_epoch,policy_epoch,consumed,boot_id,deadline_mono,issued_wall) VALUES(?,?,?,?,?,?,?,0,?,?,?)').run(permit!, op, hash, identitySnapshot.agent_id, clockLease.expires_at, lease!.epoch, decision!.policy_epoch, clockLease.boot_id, clockLease.deadline_mono, clockLease.issued_wall);
        this.#store.db.prepare('UPDATE control_operations SET permit_id=? WHERE operation_id=?').run(permit!, op);
        emit('PERMIT_ISSUED', { policy_decision_ref: decisionEvent.event_id, detail: { permit_id: permit } });
      }); await this.#store.flush();
      if (resource !== null) invariant(def.writer_resource!(args, identitySnapshot) === resource, 'RESOURCE_SCOPE_MISMATCH');
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
        this.#store.db.prepare("UPDATE control_operations SET executor_state='UNKNOWN' WHERE operation_id=?").run(op);
        emit('START_INTENT', { execution_status: 'CLAIMED', policy_decision_ref: decisionEvent.event_id, detail: { backend: 'BROKER_ONLY', os_process: false, execution_not_yet_observed: true } });
      });
      await this.#store.flush();
      // Complete callback/context work before the final clocks/epochs are checked.
      const context = Object.freeze({ identity: identitySnapshot, operation_id: op, resource_id: resource, signal: lease.signal, validation: validation ? freezeJson(JSON.parse(boundedJson(validation))) as unknown as ValidationResult : null });
      if (resource !== null) invariant(def.writer_resource!(args, identitySnapshot) === resource, 'RESOURCE_SCOPE_MISMATCH');
      invariant(def.capability !== 'LOCAL_WRITE' || !!input.approval_id, 'SIDE_EFFECT_APPROVAL_REQUIRED');
      invariant(!this.#gate.busy && !lease.signal.aborted && !trustedSignal?.aborted, 'EXECUTION_REVOKED');
      this.#features.assertEpoch(lease.epoch); invariant(metadata(this.#store).policy_epoch === decision.policy_epoch, 'POLICY_EPOCH_STALE');
      this.#policy.assertModesCurrent(def.policy_ids, identitySnapshot.project_id, decision.policy_epoch);
      const startPermit = this.#store.db.prepare('SELECT * FROM control_permits WHERE id=?').get(permit!) as any;
      invariant(startPermit?.consumed === 1 && clockFor(this.#store).valid(startPermit), 'PERMIT_EXPIRED_BEFORE_START');
      if (input.approval_id) invariant(this.#policy.approvalValid(input.approval_id, hash, identitySnapshot, 1), 'APPROVAL_EXPIRED_BEFORE_START');
      // No await is permitted between the last fence and invoking this trusted registered handler.
      invoked = true;
      this.#running.add(op);
      deadline = performance.now() + (def.timeout_ms ?? 10000);
      const expired = new Promise<never>((_resolve, reject) => {
        executionTimer = setTimeout(() => { timedOut = true; lease!.cancel(timeoutError); reject(timeoutError); }, Math.max(1, deadline - performance.now()));
      });
      void expired.catch(() => {});
      try {
        completion = Promise.resolve(def.execute(args, context)).then(output => {
          handlerDone = true; this.#running.delete(op);
          if (output && output.stdout === undefined && output.stderr === undefined) observeSettled();
          return { ok: true as const, output };
        }, error => { handlerDone = true; this.#running.delete(op); observeSettled(); return { ok: false as const, error }; });
      } catch (error) { handlerDone = true; this.#running.delete(op); observeSettled(); throw error; }
      this.#store.transaction(() => {
        this.#store.db.prepare("UPDATE control_operations SET state='STARTED' WHERE operation_id=?").run(op);
        emit('STARTED', { execution_status: 'STARTED', detail: { backend: 'BROKER_ONLY', os_process: false, handler_invocation_observed: true } });
      }); await this.#store.flush();
      const settled = await Promise.race([completion, expired]); checkDeadline();
      if (!settled.ok) throw settled.error;
      const output = settled.output;
      const data = JSON.parse(boundedJson(output.data)) as Json;
      const code = output.exit_code ?? null;
      invariant(code === null || Number.isSafeInteger(code), 'INVALID_EXIT_CODE');
      stdoutRef = await this.#store.artifacts.putQueued(output.stdout ?? [Buffer.from(canonical(data))], { maxBytes: 67108864, media_type: 'application/octet-stream', signal: lease.signal });
      stderrRef = await this.#store.artifacts.putQueued(output.stderr ?? [], { maxBytes: 67108864, media_type: 'application/octet-stream', signal: lease.signal });
      if (output.stdout !== undefined || output.stderr !== undefined) observeSettled();
      checkDeadline();
      const artifactRefs = output.artifact_refs ?? [];
      const status: Status = code !== null && code !== 0 ? 'FAIL' : 'PASS';
      outputRef = await this.#store.artifacts.putBytesQueued(Buffer.from(canonical({ data, exit_code: code, stdout_ref: stdoutRef, stderr_ref: stderrRef, artifact_refs: artifactRefs })), { maxBytes: 65536, media_type: 'application/json', signal: lease.signal });
      checkDeadline();
      this.#store.transaction(() => {
        this.#store.db.prepare("UPDATE control_operations SET state='RESULT_RECORDED',detail=? WHERE operation_id=?").run(boundedJson({ output_ref: outputRef, status }), op);
        const event = emit('RESULT', { execution_status: status === 'PASS' ? 'SUCCEEDED' : 'FAILED', exit_code: code, stdout_ref: stdoutRef, stderr_ref: stderrRef, artifact_refs: [outputRef!, ...artifactRefs], detail: { data_ref: outputRef, backend: 'BROKER_ONLY', diagnostic_status_is_separate: true } as Json });
        this.#store.context({ ...identitySnapshot, event_id: uid(), operation_id: op, observed_at: now(), kind: 'tool.result', payload_ref: outputRef!, audit_event_refs: [event.event_id] });
      });
      await this.#store.flush(); resultRecorded = true; checkDeadline();
      this.#store.transaction(() => {
        this.#store.db.prepare('UPDATE control_operations SET state=? WHERE operation_id=?').run(status === 'PASS' ? 'SUCCEEDED' : 'FAILED', op);
        this.#store.db.prepare('DELETE FROM control_writers WHERE operation_id=?').run(op);
        emit('ACK_READY', { execution_status: status === 'PASS' ? 'SUCCEEDED' : 'FAILED', exit_code: code, stdout_ref: stdoutRef, stderr_ref: stderrRef, detail: { result_ref: outputRef, writer_released: true } as Json });
      }); await this.#store.flush();
      checkDeadline();
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
            if (!invoked) {
              this.#store.db.prepare("UPDATE control_operations SET executor_state='NOT_INVOKED' WHERE operation_id=?").run(op);
              this.#store.db.prepare('DELETE FROM control_writers WHERE operation_id=?').run(op);
            }
            emit('FAILED', { execution_status: invoked ? resultRecorded ? 'RESULT_RECORDED' : 'INDETERMINATE' : 'BLOCKED', stdout_ref: stdoutRef, stderr_ref: stderrRef, detail: { reason, invoked, result_recorded: resultRecorded } });
          }); await this.#store.flush();
        } catch { /* Persistence fault is never converted to successful execution. */ }
      }
      return { status: invoked ? 'INCONCLUSIVE' : 'BLOCKED', reason, operation_id: op, intent_hash: hash, data: null, stdout_ref: stdoutRef, stderr_ref: stderrRef, audit_event_id: auditId, permit_id: permit };
    } finally { trustedSignal?.removeEventListener('abort',onCancellation); if (executionTimer) clearTimeout(executionTimer); this.#requests.delete(op); if (!deferredLease) lease?.release(); }
  }
}
