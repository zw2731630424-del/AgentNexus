import { boundedJson, canonical, invariant, now, sha256, uid } from '../types.ts';
import type { ArtifactRef, Identity, Json } from '../types.ts';
import { NativeState } from './state.ts';
import { identifier, snapshot } from './contracts.ts';
import type { Subject } from './contracts.ts';

export const GATES = Object.freeze({ g0: '需求', g1: '规划', g2: '实现', g3: '复核', g4: '验收', g5: '回归', g6: '交付' });
export type EvidenceStatus = 'PASS' | 'FAIL' | 'NOT_RUN' | 'BLOCKED' | 'INCONCLUSIVE' | 'SIMULATED' | 'BYPASSED';
export type GateInput = {
  gate_id: keyof typeof GATES; status: EvidenceStatus; candidate_hash: string; baseline: string;
  test_profile_hash: string; evidence_refs: ArtifactRef[]; reason: string;
  author_id: string; reviewer_id: string | null;
};
type GateRecord = GateInput & { id: string; revision: number; subject: Subject; observed_at: string; feature_enabled: boolean };
export type CheckpointInput = { task_revision: number; context_cursor: number; pending_operation_ids: string[]; reservation_ids: string[]; candidate_hash: string; note: string };
export type ChecklistInput={candidate_hash:string;items:{id:string;status:EvidenceStatus;reason:string;evidence_refs:ArtifactRef[]}[]};

function identity(actor: Subject): Identity { return { agent_id: actor.agent_id, project_id: actor.project_id, task_id: actor.task_id, session_id: actor.session_id }; }

export class WorkflowRuntime {
  #state: NativeState;
  constructor(state: NativeState) { this.#state = state; }
  async #evidence(refs: ArtifactRef[]): Promise<void> {
    invariant(Array.isArray(refs) && refs.length <= 16, 'WORKFLOW_EVIDENCE_LIMIT');
    let bytes = 0;
    for (const ref of refs) {
      bytes += ref.bytes; invariant(bytes <= 1048576 && ref.bytes > 0, 'WORKFLOW_EVIDENCE_LIMIT');
      // Consume the complete stream: ArtifactStore verifies hashes at EOF.
      for await (const _chunk of this.#state.store.artifacts.read(ref)) { /* verified streaming */ }
    }
  }
  async gate(admin: unknown, actor: Subject, input: GateInput): Promise<GateRecord> {
    this.#state.checkAdmin(admin); const data = snapshot(input); this.#state.require('wf.runtime',actor);
    invariant(Object.hasOwn(GATES,data.gate_id), 'WORKFLOW_GATE_ID');
    invariant(['PASS','FAIL','NOT_RUN','BLOCKED','INCONCLUSIVE','SIMULATED','BYPASSED'].includes(data.status), 'WORKFLOW_GATE_STATUS');
    invariant(/^[a-f0-9]{64}$/.test(data.candidate_hash) && /^[a-f0-9]{64}$/.test(data.test_profile_hash), 'WORKFLOW_VERSION_BINDING');
    identifier(data.author_id); if (data.reviewer_id !== null) identifier(data.reviewer_id);
    invariant(typeof data.baseline === 'string' && data.baseline.length > 0 && data.baseline.length <= 128 && data.reason.length > 0 && data.reason.length <= 2048, 'WORKFLOW_GATE_REASON');
    const enabled = this.#state.enabled('wf.gate.'+data.gate_id,actor);
    if (enabled) {
      this.#state.require('wf.evidence',actor);
      if (['PASS','FAIL','SIMULATED'].includes(data.status)) invariant(data.evidence_refs.length > 0, 'WORKFLOW_EVIDENCE_REQUIRED');
      if (data.gate_id === 'g3' && data.status === 'PASS') invariant(data.reviewer_id !== null && data.reviewer_id !== data.author_id && actor.agent_id === data.reviewer_id && actor.agent_type === 'BACKGROUND_REVIEWER', 'WORKFLOW_INDEPENDENT_REVIEW');
      await this.#evidence(data.evidence_refs);
    }
    const id = uid();
    return this.#state.change(actor,'WORKFLOW_GATE',() => {
      this.#state.require('wf.runtime',actor);
      const effective=enabled&&this.#state.enabled('wf.gate.'+data.gate_id,actor);
      if(effective)this.#state.require('wf.evidence',actor);
      const record:GateRecord={...data,id,revision:0,subject:snapshot(actor),status:effective?data.status:'BYPASSED',reason:effective?data.reason:'FEATURE_OFF_OR_UNVERIFIED:'+data.reason,feature_enabled:effective,observed_at:now()};
      this.#state.insert('GATE',id,actor,record.status,record);return snapshot(record);
    }, {gate_id:data.gate_id,candidate_hash:data.candidate_hash});
  }
  async checkpoint(admin: unknown, actor: Subject, input: CheckpointInput): Promise<string> {
    this.#state.checkAdmin(admin); this.#state.require('native.checkpoints-auto',actor);this.#state.require('wf.templates.checkpoint',actor);
    const data = snapshot(input); invariant(Number.isSafeInteger(data.task_revision) && data.task_revision >= 0 && Number.isSafeInteger(data.context_cursor) && data.context_cursor >= 0, 'WORKFLOW_CHECKPOINT');
    invariant(data.pending_operation_ids.length <= 32 && data.reservation_ids.length <= 32 && /^[a-f0-9]{64}$/.test(data.candidate_hash) && Buffer.byteLength(data.note) <= 4096, 'WORKFLOW_CHECKPOINT');
    for (const id of [...data.pending_operation_ids,...data.reservation_ids]) identifier(id);
    const id = uid(), payload = Buffer.from(boundedJson({ schema: 'agentnexus/checkpoint/1.6', subject: actor, ...data }));
    const ref = await this.#state.store.artifacts.putBytesQueued(payload,{media_type:'application/json',maxBytes:16384});
    await this.#state.change(actor,'WORKFLOW_CHECKPOINT',() => {
      this.#state.require('native.checkpoints-auto',actor);this.#state.require('wf.templates.checkpoint',actor);
      const previous = this.#state.get<{revision: number}>('CHECKPOINT',actor.task_id);
      const body = { id: actor.task_id, checkpoint_id: id, revision: previous ? previous.revision+1 : 0, payload_ref: ref, task_revision: data.task_revision, observed_at: now() };
      if (previous) this.#state.update('CHECKPOINT',actor.task_id,previous.revision,'RECORDED',body);
      else this.#state.insert('CHECKPOINT',actor.task_id,actor,'RECORDED',body);
      this.#state.store.context({ ...identity(actor), event_id: id, operation_id: uid(), observed_at: now(), kind: 'workflow.checkpoint', payload_ref: ref, audit_event_refs: [] });
    }, { checkpoint_id: id, payload_ref: ref });
    return id;
  }
  async decision(admin: unknown, actor: Subject, decision: Json, status: 'PROPOSED'|'ACCEPTED', evidence: ArtifactRef[] = []): Promise<string> {
    this.#state.checkAdmin(admin); this.#state.require('wf.decisions',actor);
    invariant(actor.agent_type === 'DEVELOPMENT', 'WORKFLOW_PROJECT_DECISION_SCOPE');
    invariant(['PROPOSED','ACCEPTED'].includes(status), 'WORKFLOW_DECISION_STATUS'); boundedJson(decision,8192); await this.#evidence(evidence);
    const id = uid();
    await this.#state.change(actor,'WORKFLOW_DECISION',() => {
      this.#state.require('wf.decisions',actor);
      this.#state.store.decision({ ...identity(actor), decision_id: id, event_id: uid(), operation_id: uid(), observed_at: now(), status,
        authority_ref: 'trusted-host-administration', supersedes: null, evidence_refs: evidence, decision });
    }, { decision_id: id, status, decision_sha256: sha256(canonical(decision)) });
    return id;
  }
  async checklist(admin:unknown,actor:Subject,input:ChecklistInput):Promise<string>{
    this.#state.checkAdmin(admin);this.#state.require('wf.checklists',actor);const data=snapshot(input);
    invariant(/^[a-f0-9]{64}$/.test(data.candidate_hash)&&data.items.length>0&&data.items.length<=16&&new Set(data.items.map(item=>item.id)).size===data.items.length,'WORKFLOW_CHECKLIST');
    for(const item of data.items){identifier(item.id);invariant(['PASS','FAIL','NOT_RUN','BLOCKED','INCONCLUSIVE','SIMULATED','BYPASSED'].includes(item.status)&&item.reason.length>0&&item.reason.length<=1024,'WORKFLOW_CHECKLIST');
      if(['PASS','FAIL','SIMULATED'].includes(item.status))invariant(item.evidence_refs.length>0,'WORKFLOW_EVIDENCE_REQUIRED');await this.#evidence(item.evidence_refs);}
    const id=uid();await this.#state.change(actor,'WORKFLOW_CHECKLIST',()=>{this.#state.require('wf.checklists',actor);this.#state.require('wf.evidence',actor);this.#state.insert('CHECKLIST',id,actor,'RECORDED',{id,revision:0,subject:actor,...data});},{checklist_id:id,candidate_hash:data.candidate_hash});return id;
  }
}
