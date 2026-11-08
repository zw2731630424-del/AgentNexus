import { auditEvent, boundedJson, canonical, invariant, uid, validateIdentity } from '../types.ts';
import type { Identity, Json } from '../types.ts';
import type { KernelStore } from '../storage.ts';
import type { FeatureRegistry } from '../features.ts';
import { metadata } from '../control.ts';
import { identifier, snapshot, subject } from './contracts.ts';
import type { Subject } from './contracts.ts';
export type { Subject } from './contracts.ts';

type Filter = { project_id?: string; agent_id?: string; task_id?: string; state?: string; after?: string; limit?: number };
type Row = { body: string; revision: number; project_id: string; agent_id: string; task_id: string; state: string };

// A trusted projection owner over the existing durable store, never an Agent API.
export class NativeState {
  readonly store: KernelStore; readonly boot_id: string; readonly checkAdmin: (value: unknown) => void;
  #features: FeatureRegistry; #changing = false; #failure:unknown=null;
  get faulted():boolean{return this.#failure!==null||this.store.faulted;}
  constructor(store: KernelStore, features: FeatureRegistry, checkAdmin: (value: unknown) => void, boot: string) {
    identifier(boot); this.store = store; this.#features = features; this.checkAdmin = checkAdmin; this.boot_id = boot;
    store.db.exec(`CREATE TABLE IF NOT EXISTS m16_entities(
      kind TEXT NOT NULL,id TEXT NOT NULL,project_id TEXT NOT NULL,agent_id TEXT NOT NULL,task_id TEXT NOT NULL,
      state TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>=0),body TEXT NOT NULL CHECK(length(body)<=49152),
      PRIMARY KEY(kind,id)) STRICT;
      CREATE INDEX IF NOT EXISTS m16_entity_scope ON m16_entities(kind,project_id,agent_id,task_id,state,id);
      CREATE INDEX IF NOT EXISTS m16_entity_state ON m16_entities(kind,state,id);`);
  }
  enabled(feature: string, identity?: Identity): boolean {
    if(this.faulted)return false;
    try { return this.#features.resolve(feature, identity ? { project_id: identity.project_id, agent_id: identity.agent_id, task_id: identity.task_id } : {}).effective === 'ON'; }
    catch { return false; }
  }
  require(feature: string, identity?: Identity): void { invariant(this.enabled(feature, identity), 'NATIVE_FEATURE_BLOCKED:' + feature); }
  #read<T>(row: Row): T {
    const value = JSON.parse(row.body) as { revision: number };
    invariant(canonical(value) === row.body && value.revision === row.revision, 'NATIVE_PROJECTION_CORRUPT');
    return snapshot(value) as T;
  }
  get<T>(kind: string, id: string): T | null {
    identifier(kind); identifier(id);
    const row = this.store.db.prepare('SELECT * FROM m16_entities WHERE kind=? AND id=?').get(kind,id) as Row | undefined;
    return row ? this.#read<T>(row) : null;
  }
  #where(kind: string, filter: Filter): { sql: string; values: (string | number)[] } {
    identifier(kind); invariant(Object.keys(filter).every(k => ['project_id','agent_id','task_id','state','after','limit'].includes(k)), 'NATIVE_FILTER');
    const clauses = ['kind=?'], values: (string | number)[] = [kind];
    for (const field of ['project_id','agent_id','task_id','state'] as const) if (filter[field] !== undefined) {
      identifier(filter[field]); clauses.push(field + '=?'); values.push(filter[field]!);
    }
    if (filter.after !== undefined) { identifier(filter.after); clauses.push('id>?'); values.push(filter.after); }
    return { sql: clauses.join(' AND '), values };
  }
  list<T>(kind: string, filter: Filter = {}): T[] {
    const limit = filter.limit ?? 100; invariant(Number.isSafeInteger(limit) && limit >= 1 && limit <= 100, 'NATIVE_PAGE_LIMIT');
    const query = this.#where(kind,filter);
    return (this.store.db.prepare('SELECT * FROM m16_entities WHERE '+query.sql+' ORDER BY id LIMIT ?').all(...query.values,limit) as Row[]).map(row => this.#read<T>(row));
  }
  count(kind: string, filter: Filter = {}): number {
    const query = this.#where(kind,filter);
    return Number((this.store.db.prepare('SELECT COUNT(*) AS n FROM m16_entities WHERE '+query.sql).get(...query.values) as {n: number}).n);
  }
  insert(kind: string, id: string, identity: Identity, state: string, body: unknown): void {
    invariant(this.#changing, 'NATIVE_TRANSACTION_REQUIRED'); identifier(kind); identifier(id); identifier(state); validateIdentity(identity);
    const text = boundedJson(body,49152); invariant((JSON.parse(text) as {revision: number}).revision === 0, 'NATIVE_REVISION');
    this.store.db.prepare('INSERT INTO m16_entities VALUES(?,?,?,?,?,?,0,?)').run(kind,id,identity.project_id,identity.agent_id,identity.task_id,state,text);
  }
  update(kind: string, id: string, revision: number, state: string, body: unknown): void {
    invariant(this.#changing, 'NATIVE_TRANSACTION_REQUIRED'); identifier(kind); identifier(id); identifier(state);
    invariant(Number.isSafeInteger(revision) && revision >= 0, 'NATIVE_REVISION');
    const text = boundedJson(body,49152); invariant((JSON.parse(text) as {revision: number}).revision === revision+1, 'NATIVE_REVISION');
    invariant(this.store.db.prepare('UPDATE m16_entities SET state=?,revision=revision+1,body=? WHERE kind=? AND id=? AND revision=?').run(state,text,kind,id,revision).changes === 1, 'NATIVE_REVISION_CONFLICT');
  }
  async change<T>(actor: Subject, phase: string, fn: () => T, detail: unknown = null, operationId = uid()): Promise<T> {
    invariant(!this.faulted,'NATIVE_STATE_FAULTED');
    subject(actor); identifier(phase); identifier(operationId); invariant(!this.#changing, 'NATIVE_NESTED_CHANGE');
    const captured = snapshot(actor); const capturedDetail = JSON.parse(boundedJson(detail,16384)) as Json;
    const identity: Identity = { agent_id: captured.agent_id, project_id: captured.project_id, task_id: captured.task_id, session_id: captured.session_id };
    const result = this.store.transaction(() => {
      this.#changing = true;
      try {
        const value = fn();
        invariant(!value || typeof (value as {then?: unknown}).then !== 'function', 'NATIVE_ASYNC_TRANSACTION');
        const ownerPolicies=phase.startsWith('STORAGE')?['P.TOOL_CONTRACT','P.ARTIFACT_INTEGRITY','P.RESOURCE_ADMISSION','P.EVIDENCE_DOMAINS']:
          phase==='RESOURCE_STORAGE_ADOPTED'?['P.RESOURCE_ADMISSION','P.RESOURCE_RELEASE']:phase.startsWith('RESOURCE')?['P.RESOURCE_ADMISSION']:phase.startsWith('MESSAGE')?['P.MESSAGE_DELIVERY']:
          phase.startsWith('MODEL')?['P.MODEL_CREDENTIAL','P.RESOURCE_ADMISSION','P.CONTEXT_PROVENANCE']:
          phase.startsWith('CONTEXT')?['P.CONTEXT_PROVENANCE']:phase.startsWith('WORKFLOW')?['P.WORKFLOW_BINDING']:
          phase.startsWith('AGENT')?['P.NATIVE_IDENTITY','P.NATIVE_LIFECYCLE']:phase.startsWith('TASK')?['P.AGENT_SCOPE','P.RESOURCE_ADMISSION','P.NATIVE_LIFECYCLE']:['P.NATIVE_IDENTITY'];
        const epochs=metadata(this.store);
        this.store.audit(auditEvent(identity, { operation_id: operationId, operation_type: 'NATIVE_HARNESS', phase,
          execution_status: phase, parameters: { runtime_instance_id: captured.runtime_instance_id, agent_type: captured.agent_type,
            model_binding: captured.model_binding, resource_budget_id: captured.resource_budget_id, policy_scope: captured.policy_scope,
            host_boot_id: this.boot_id,policy_decision:{allowed:true,target:'CONTROL_STATE_CHANGE_ONLY',policy_ids:[...ownerPolicies,'P.AUDIT_REQUIRED'],enforcement:'INDEPENDENT_TRUSTED_OWNER',application_mode_can_disable:false},
            policy_epoch:epochs.policy_epoch,feature_epoch:epochs.feature_epoch,assurance: 'LOCAL_TRUSTED_LIBRARY' }, detail: capturedDetail }));
        return value;
      } finally { this.#changing = false; }
    });
    try{await this.store.flush();}catch(error){this.#failure=error;throw error;}return result;
  }
}
