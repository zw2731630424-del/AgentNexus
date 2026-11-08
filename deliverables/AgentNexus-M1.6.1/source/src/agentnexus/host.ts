import { readFile } from 'node:fs/promises';
import { KernelStore } from './storage.ts';
import { FeatureRegistry } from './features.ts';
import { PolicyEngine } from './policy.ts';
import type { ModeRequest, RuleEvaluator } from './policy.ts';
import { ToolGateway } from './gateway.ts';
import { OperationReconciliation } from './reconciliation.ts';
import type { ReconciliationRequest } from './reconciliation.ts';
import type { ToolDefinition, ToolRequest } from './gateway.ts';
import { DevelopmentIntelligence } from './diagnostics.ts';
import type { ArgumentCheckRequest } from './diagnostics.ts';
import { initializeControl, adminEvent, contains, metadata } from './control.ts';
import { auditEvent, boundedJson, canonical, invariant, now, sha256, uid, validateIdentity } from './types.ts';
import type { DiagnosticRequest, FeatureDefinition, Identity, Json, PolicyDefinition, Scope, ValidationResult } from './types.ts';
import type { FeatureChange, Module } from './features.ts';
import { RuntimeControl } from './runtime/control.ts';
import { ExecutionBroker } from './runtime/broker.ts';
import type { ObservationProvider } from './runtime/contracts.ts';

type DiagnosticLifetime = Pick<DevelopmentIntelligence, 'dispose'> & Partial<Pick<DevelopmentIntelligence, 'disposeAndWait'>>;

export type HostOptions = {
  pythonPath?: string; powerShellPath?: string; ruleEvaluator?: RuleEvaluator;
  definitions?: FeatureDefinition[]; policies?: PolicyDefinition[];
  runtimeObservationProvider?: ObservationProvider; // Trusted transport bootstrap only; never Agent input.
};

export async function openHost(root: string, options: HostOptions = {}) {
  const featureData = options.definitions ?? JSON.parse(await readFile(new URL('../../config/agentnexus/features.json', import.meta.url), 'utf8')).features;
  const policyData = options.policies ?? JSON.parse(await readFile(new URL('../../config/agentnexus/policies.json', import.meta.url), 'utf8')).policies;
  const store = await KernelStore.open(root);
  try {
    initializeControl(store);
    // This capability is created only in trusted bootstrap and never enters the Agent facade.
    // It is a library separation mechanism. OS peer authentication remains BLOCKED, not implemented here.
    const token = Object.freeze({ capability: uid() });
    const checkAdmin = (candidate: unknown) => invariant(candidate === token, 'ADMIN_CAPABILITY_REQUIRED');
    const gate = { busy: false };
    const features = new FeatureRegistry(store, featureData, checkAdmin, gate);
    const policy = new PolicyEngine(store, policyData, checkAdmin, gate, () => features.activeCount(), options.ruleEvaluator);
    const gateway = new ToolGateway(store, features, policy, checkAdmin, gate);
    const runtime = new RuntimeControl(store, checkAdmin, options.runtimeObservationProvider ?? {
      assurance: 'MODEL', peer: async () => { throw new Error('NATIVE_TRANSPORT_NOT_DEPLOYED'); }, exit: async () => { throw new Error('NATIVE_SUPERVISOR_NOT_DEPLOYED'); },
    }, id => { try { return features.resolve(id).effective === 'ON'; } catch { return false; } });
    const broker = new ExecutionBroker();
    type Binding = { identity: Identity; scope: Scope; diagnostics: DevelopmentIntelligence | null; active: number; closing: boolean; closePromise: Promise<void> | null };
    const bindings = new Map<string, Binding>();
    let closed = false;
    let hostClosePromise: Promise<void> | null = null;
    const makeDiagnostics = (scope: Scope) => new DevelopmentIntelligence({
      pythonPath: options.pythonPath, powerShellPath: options.powerShellPath,
      featureEnabled: id => {
        try { const r = features.resolve(id, scope); return r.desired === 'ON' && !['FAILED','QUIESCING','RECOVERING'].includes(r.health); }
        catch { return true; } // Unrecognized language is reported NOT_RUN by DIE, never executed.
      },
      featureEpoch: () => metadata(store).feature_epoch, configRevision: () => metadata(store).feature_revision,
    });
    const unavailableValidation = (r: {document_uri: string;version: number;source: string}, status: 'BLOCKED'|'BYPASSED', reason: string): ValidationResult => {
      const dimension = { status, reason, coverage: 'none', applicable: true };
      return { request_id: uid(), uri: r.document_uri, version: r.version, source_sha256: sha256(r.source), checker_id: 'unavailable', checker_version: 'none', feature_epoch: metadata(store).feature_epoch,
        config_revision: metadata(store).feature_revision, dimensions: { syntax: dimension, args: dimension, environment: dimension, safety: dimension, authorization: { status: 'NOT_RUN', reason: 'OWNER_TOOL_GATEWAY', coverage: 'none', applicable: false } },
        status, reason, diagnostics: [], evidence_refs: [], timing: { started_at: now(), elapsed_ms: 0 } };
    };
    const stopDiagnostics = async (scope: Scope) => {
      for (const b of bindings.values()) if (contains(scope, b.scope) && b.diagnostics) {
        const d = b.diagnostics as DiagnosticLifetime;
        if ('disposeAndWait' in d) await d.disposeAndWait!();
        else { d.dispose(); invariant(b.active === 0, 'DIAGNOSTICS_STILL_RUNNING'); }
        b.diagnostics = null;
      }
    };
    const preflightDiagnostics = async (scope: Scope) => {
      for (const b of bindings.values()) if (contains(scope, b.scope) && !b.diagnostics) b.diagnostics = makeDiagnostics(b.scope);
    };
    const nativeModules = ['core.identity','core.state','core.events','core.features','core.admin-audit','core.audit.trail','core.artifact.store','core.archive.raw','core.decision.ledger','policy.mode','tool.test',
      'devint.runtime','devint.command-parser','devint.syntax-validator','devint.argument-validator','devint.environment-checker','devint.command-preview','devint.code-diagnostics','devint.code.python','devint.code.json','devint.command.powershell','devint.command.git','devint.command.python-cli','audit.task-reconstruction'];
    for (const id of nativeModules) if (featureData.some((d: FeatureDefinition) => d.id === id)) features.register(token, id, id.startsWith('devint.') ? { stop: stopDiagnostics, preflight: preflightDiagnostics } : {});
    const reconciliation = new OperationReconciliation(store, checkAdmin, gate, id => gateway.executorRunning(id), id => gateway.requestActive(id));
    await runtime.recover();
    await reconciliation.recover();
    await policy.onBoot();
    if (featureData.some((d: FeatureDefinition) => d.id === 'tool.test')) {
      gateway.register(token, { id: 'native.echo', version: '1', feature_id: 'tool.test', capability: 'PURE', policy_ids: [], requires_sandbox: false,
        schema: args => { boundedJson(args); }, execute: args => ({ data: args }) });
      if (featureData.some((d: FeatureDefinition) => d.id === 'devint.runtime')) gateway.register(token, {
        id: 'native.diagnostics', version: '1', feature_id: 'tool.test', capability: 'READ_ONLY', policy_ids: [], requires_sandbox: false,
        schema: args => {
          invariant(args !== null && typeof args === 'object' && !Array.isArray(args), 'DIAGNOSTIC_SCHEMA');
          const r = args as any;
          invariant(Object.keys(r).every(k => ['language','source','document_uri','version','dialect'].includes(k)), 'DIAGNOSTIC_SCHEMA');
          invariant(typeof r.language === 'string' && typeof r.source === 'string' && typeof r.document_uri === 'string' && Number.isSafeInteger(r.version), 'DIAGNOSTIC_SCHEMA');
        },
        validate: async (args, signal, identity) => {
          const b = bindings.get(canonical(identity)); invariant(b, 'UNKNOWN_SESSION');
          const r = args as unknown as DiagnosticRequest;
          const featureIds = ['devint.runtime','devint.code-diagnostics','devint.syntax-validator',
            ...(r.language === 'powershell' ? ['devint.command-parser','devint.command.powershell'] : ['devint.code.' + r.language])];
          const failedModule = featureIds.find(id => {
            try { return ['FAILED','QUIESCING','RECOVERING'].includes(features.resolve(id, b.scope).health); } catch { return false; }
          });
          // An explicit OFF is evaluated by the checker without reactivating a disposed instance.
          if (failedModule || features.resolve('devint.runtime', b.scope).desired === 'OFF') {
            const reason = failedModule ? 'MODULE_UNAVAILABLE:' + failedModule : 'VALIDATION_BYPASSED';
            const status = failedModule ? 'BLOCKED' as const : 'BYPASSED' as const;
            return unavailableValidation(r, status, reason);
          }
          const service = b.diagnostics ?? makeDiagnostics(b.scope);
          if (!b.diagnostics) {
            // Explicit invocation of an enabled checker may recreate its empty service after an unrelated language was stopped.
            // No previously disabled checker or background work is enabled here.
            b.diagnostics = service;
          }
          return service.check(args as unknown as DiagnosticRequest, signal);
        },
        execute: (_args, context) => ({ data: context.validation as unknown as Json }),
      });
      if (featureData.some((d: FeatureDefinition) => d.id === 'devint.runtime')) gateway.register(token, {
        id: 'native.command-check', version: '1', feature_id: 'tool.test', capability: 'READ_ONLY', policy_ids: [], requires_sandbox: false,
        schema: args => {
          invariant(args !== null && typeof args === 'object' && !Array.isArray(args), 'COMMAND_CHECK_SCHEMA');
          const r = args as any;
          invariant(Object.keys(r).every(k => ['family','argv','document_uri','version'].includes(k)), 'COMMAND_CHECK_SCHEMA');
          invariant(['git','python'].includes(r.family) && Array.isArray(r.argv) && r.argv.length <= 128 && r.argv.every((x: unknown) => typeof x === 'string') && typeof r.document_uri === 'string' && Number.isSafeInteger(r.version), 'COMMAND_CHECK_SCHEMA');
        },
        validate: async (args, signal, identity) => {
          const b = bindings.get(canonical(identity)); invariant(b, 'UNKNOWN_SESSION');
          for (const id of ['devint.runtime','devint.command-parser','devint.argument-validator']) {
            const f = features.resolve(id, b.scope);
            const r = args as unknown as ArgumentCheckRequest;
            if (['FAILED','QUIESCING','RECOVERING'].includes(f.health)) return unavailableValidation({ ...r, source: canonical(r.argv) }, 'BLOCKED', 'MODULE_UNAVAILABLE:' + id);
            if (f.desired === 'OFF') return unavailableValidation({ ...r, source: canonical(r.argv) }, 'BYPASSED', 'VALIDATION_BYPASSED');
          }
          if (!b.diagnostics) b.diagnostics = makeDiagnostics(b.scope);
          return b.diagnostics.checkArguments(args as unknown as ArgumentCheckRequest, signal);
        },
        execute: (args, context) => ({ data: { validation: context.validation, preview: { family: (args as any).family, argv: (args as any).argv, cwd: 'task-resource-not-executed', will_execute: false } } as unknown as Json }),
      });
    }
    adminEvent(store, 'HOST_LIFECYCLE', 'LOCAL_LIBRARY_READY', { runtime: process.version, sqlite: process.versions.sqlite ?? 'unknown', modules: nativeModules.filter(id => featureData.some((d: FeatureDefinition) => d.id === id)), arbitrary_execution: 'BLOCKED', os_admin_auth: 'NOT_RUN' });
    await store.flush();
    const administration = Object.freeze({
      metadata: () => metadata(store),
      previewFeatures: (changes: FeatureChange[], revision: number) => features.preview(token, changes, revision),
      commitFeatures: (id: string, hash: string) => features.commit(token, id, hash),
      recoverModule: (id: string, scope: Scope = {}) => features.recover(token, id, scope),
      registerModule: (id: string, module: Module = {}) => features.register(token, id, module),
      prepareMode: (request: ModeRequest, revision: number) => policy.prepare(token, request, revision),
      confirmMode: (id: string, phase: 'PREVIEW_ACK' | 'RISK_ACK', hash: string) => policy.confirm(token, id, phase, hash),
      commitMode: (id: string, hash: string) => policy.commit(token, id, hash),
      completePreflight: (scope: Scope) => policy.completePreflight(token, scope),
      approve: (hash: string, identity: Identity, reason: string, lifetimeMs?: number) => policy.approve(token, hash, identity, reason, lifetimeMs),
      registerTool: (definition: ToolDefinition) => gateway.register(token, definition),
      recordReconciliationEvidence: (evidence: Parameters<OperationReconciliation['recordEvidence']>[1]) => reconciliation.recordEvidence(token, evidence),
      prepareReconciliation: (request: ReconciliationRequest) => reconciliation.prepare(token, request),
      commitReconciliation: (id: string, hash: string) => reconciliation.commit(token, id, hash),
      inspectOperation: (id: string) => reconciliation.inspect(token, id),
      runtime: Object.freeze({
        create: (...args: Parameters<RuntimeControl['create']> extends [unknown, ...infer R] ? R : never) => runtime.create(token, ...args),
        authenticate: (id: string, channel: object) => runtime.authenticate(token, id, channel),
        activate: (handle: object) => runtime.activate(token, handle),
        issue: (handle: object, scope: Parameters<RuntimeControl['issue']>[2], lifetime?: number) => runtime.issue(token, handle, scope, lifetime),
        revoke: (id: string, reason: string) => runtime.revoke(token, id, reason),
        inspect: (id: string) => runtime.inspect(token, id),
        observeExit: (id: string, operation: string) => runtime.observeExit(token, id, operation),
        reserve: (id: string, operation: string, resources: Parameters<RuntimeControl['reserve']>[3]) => runtime.reserve(token,id,operation,resources),
        release: (id: string, operation: string, proof: string) => runtime.release(token,id,operation,proof),
        brokerStatus: () => broker.status(),
      }),
      recordDecision: async (decision: Json, status: 'PROPOSED' | 'ACCEPTED', evidence: any[] = []) => {
        boundedJson(decision); const id = uid();
        const identity = { agent_id: 'host-admin', project_id: 'host', task_id: 'administration', session_id: 'host-control' };
        store.transaction(() => {
          const event = adminEvent(store, 'DECISION', status, { decision_id: id });
          store.decision({ ...identity, event_id: uid(), operation_id: event.operation_id, observed_at: now(), decision_id: id, status, authority_ref: 'trusted-bootstrap-capability', supersedes: null, evidence_refs: evidence, decision });
        }); await store.flush(); return id;
      },
    });
    function bindAgent(identity: Identity) {
      invariant(!closed, 'HOST_CLOSED'); validateIdentity(identity);
      const key = canonical(identity); invariant(!bindings.has(key), 'SESSION_ALREADY_BOUND'); invariant(bindings.size < 16, 'SESSION_LIMIT');
      const frozen = Object.freeze(JSON.parse(key)) as Identity;
      const scope = { project_id: frozen.project_id, agent_id: frozen.agent_id, task_id: frozen.task_id };
      const b: Binding = { identity: frozen, scope, diagnostics: makeDiagnostics(scope), active: 0, closing: false, closePromise: null };
      store.audit(auditEvent(frozen, { operation_type: 'AGENT_LIFECYCLE', phase: 'SESSION_BOUND', execution_status: 'BOUND', cwd: store.root, parameters: { binding_kind: 'LOCAL_TRUSTED_FACADE', os_agent_process: false } }));
      bindings.set(key, b);
      const assertBound = () => invariant(!closed && !b.closing && bindings.get(key) === b, 'SESSION_CLOSED');
      return Object.freeze({
        identity: frozen,
        request: async (request: ToolRequest, trustedSignal?: AbortSignal) => {
          assertBound(); b.active++;
          try { return await gateway.run(frozen, request, trustedSignal); } finally { b.active--; }
        },
        feature: (id: string) => { assertBound(); return features.resolve(id, scope); },
        reconstructTask: (after = 0, limit = 100) => {
          assertBound();
          const records = store.query('audit', { project_id: frozen.project_id, task_id: frozen.task_id, agent_id: frozen.agent_id, session_id: frozen.session_id, after, limit });
          return { records, next_cursor: records.at(-1)?.seq ?? after, replay: 'READ_ONLY_NO_EXECUTOR' };
        },
        context: (after = 0, limit = 100) => { assertBound(); return store.query('context', { project_id: frozen.project_id, task_id: frozen.task_id, agent_id: frozen.agent_id, session_id: frozen.session_id, after, limit }); },
        close: async () => {
          if (closed || bindings.get(key) !== b) return; // Idempotent stale close cannot revoke a replacement binding.
          if (b.closePromise) return b.closePromise;
          invariant(b.active === 0, 'SESSION_HAS_ACTIVE_OPERATIONS');
          b.closing = true; // Revoke before the first await; cleanup cannot open a new request window.
          b.closePromise = (async () => {
            let auditFailure: unknown = null;
            const operation = uid();
            try { await runtime.revokeScope(token, frozen, 'Logical Agent session is closing'); }
            catch (error) { auditFailure = error; }
            try { store.audit(auditEvent(frozen, { operation_id: operation, operation_type: 'AGENT_LIFECYCLE', phase: 'SESSION_REVOKING', execution_status: 'REVOKING', cwd: store.root })); await store.flush(); }
            catch (error) { auditFailure = error; }
            if (b.diagnostics) { const d = b.diagnostics as DiagnosticLifetime; if ('disposeAndWait' in d) await d.disposeAndWait!(); else d.dispose(); }
            if (bindings.get(key) === b) bindings.delete(key);
            try { store.audit(auditEvent(frozen, { operation_id: operation, operation_type: 'AGENT_LIFECYCLE', phase: 'SESSION_REVOKED', execution_status: 'REVOKED', cwd: store.root })); await store.flush(); }
            catch (error) { auditFailure ??= error; }
            if (auditFailure) throw auditFailure;
          })();
          return b.closePromise;
        },
      });
    }
    return Object.freeze({
      administration, bindAgent,
      deployment: Object.freeze({ status: 'BLOCKED', reason: 'OS_ADMIN_AUTH_AND_SANDBOX_NOT_VERIFIED', api: 'LOCAL_TRUSTED_LIBRARY_ONLY', no_network_listener: true }),
      // Trusted bootstrap/test inspection only; none of these objects are in the Agent facade.
      store, features, policy, gateway,
      close: async () => {
        if (hostClosePromise) return hostClosePromise;
        invariant(features.activeCount() === 0 && ![...bindings.values()].some(b => b.active !== 0), 'ACTIVE_OPERATIONS');
        closed = true;
        hostClosePromise = (async () => { await runtime.close(); await stopDiagnostics({}); bindings.clear(); await store.close(); })();
        return hostClosePromise;
      },
    });
  } catch (error) { await store.close(); throw error; }
}
