import { auditEvent, boundedJson, invariant } from '../types.ts';
import type { Identity, Json } from '../types.ts';
import type { KernelStore } from '../storage.ts';

export type Producer = 'host' | 'worker' | 'ipc' | 'broker' | 'sandbox' | 'process' | 'file' | 'policy' | 'approval' | 'reconciliation';
export type Phase = 'REQUESTED' | 'AUTHORIZED' | 'STARTED' | 'RESULT' | 'ACK' | 'INDETERMINATE' | 'OBSERVED' | 'REVOKED' | 'REJECTED';
export type Correlation = {
  operation_id: string; runtime_id: string | null; worker_instance_id: string | null;
  sandbox_profile_id: string | null; resource_id: string | null;
};
// Producer handles are minted only by bootstrap/owning services, never serialized to a Worker.
export class AuditProducerSDK {
  #store: KernelStore;
  constructor(store: KernelStore) { this.#store = store; }
  producer(owner: Producer, trustedResultOwner = false) {
    invariant(['host','worker','ipc','broker','sandbox','process','file','policy','approval','reconciliation'].includes(owner), 'AUDIT_PRODUCER_UNKNOWN');
    invariant(!trustedResultOwner || ['broker','process','file','reconciliation'].includes(owner), 'AUDIT_RESULT_OWNER');
    return Object.freeze({ emit: (identity: Identity, c: Correlation, phase: Phase, detail: Json = null) => {
      invariant(['REQUESTED','AUTHORIZED','STARTED','RESULT','ACK','INDETERMINATE','OBSERVED','REVOKED','REJECTED'].includes(phase), 'AUDIT_PHASE');
      invariant(phase !== 'RESULT' || trustedResultOwner, 'AUDIT_RESULT_OWNER');
      boundedJson(detail, 16384);
      const actor = { agent_id: identity.agent_id, project_id: identity.project_id, task_id: identity.task_id, session_id: identity.session_id };
      return this.#store.audit(auditEvent(actor, { operation_id: c.operation_id, operation_type: 'RUNTIME_' + owner.toUpperCase(), phase,
        execution_status: phase, detail: { ...c, policy_decision: null, before_evidence: null, after_evidence: null, exit_proof: null, observation: detail } }));
    } });
  }
}
