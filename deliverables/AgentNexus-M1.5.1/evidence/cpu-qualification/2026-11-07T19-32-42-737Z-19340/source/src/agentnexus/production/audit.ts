import { auditEvent, canonical, sha256 } from '../types.ts';
import type { Json } from '../types.ts';
import type { KernelStore } from '../storage.ts';
import type { Grant, Runtime } from './contracts.ts';

export class ProductionAudit {
  readonly store:KernelStore;
  constructor(store:KernelStore) {this.store=store;}
  record(owner: 'host'|'broker'|'worker'|'ipc'|'sandbox'|'process'|'file'|'exit_proof'|'reconciliation', phase: string, binding: Runtime|Grant, operation: string, detail: Json = null, resource: string|null = null) {
    const {agent_id,project_id,task_id,session_id}=binding.logical;
    const identity={agent_id,project_id,task_id,session_id};
    return this.store.audit(auditEvent(identity,{
      operation_id:operation, operation_type:'M14_'+owner.toUpperCase(), phase, execution_status:phase,
      detail:{ runtime_identity:{runtime_id:binding.runtime_id,process:binding.process,host_boot_id:binding.host_boot_id,generation:binding.generation},
        worker_instance_id:binding.worker_instance_id, resource_id:resource, sandbox_profile_hash:binding.profile_hash,
        policy_decision:'policy_epoch' in binding?{policy_epoch:binding.policy_epoch,feature_epoch:binding.feature_epoch,approval_id:binding.approval_id,permit_id:binding.permit_id}:null,
        exit_proof:owner==='exit_proof'?detail:null, artifact_hash:detail===null?null:sha256(canonical(detail)), observation:detail },
    }));
  }
  async barrier(): Promise<void> { await this.store.flush(); }
}
