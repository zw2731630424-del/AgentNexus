import type { KeyObject } from 'node:crypto';
import { invariant } from '../types.ts';
import { hash, keys, snapshot } from '../runtime/contracts.ts';
import { authenticated } from './contracts.ts';
import type { Assurance, Runtime, Signed, Tool } from './contracts.ts';
import type { ProcessIdentity } from '../runtime/contracts.ts';

export const COMBINATION_CHECKS=Object.freeze(['distinct_standard_accounts','peer_identity','restricted_token_readback','appcontainer_zero_network','filesystem_boundary','host_database_denied','cross_project_denied','job_before_resume','child_escape_denied','complete_tree_evidence','producer_eof','resource_limits','file_and_disk_hard_limits','restart_quarantine','audit_failure_closed']);
export type Qualification={schema:'agentnexus/qualification/1';profile_hash:string;helper_hash:string;tool_hash:string;host_sid:string;worker_sid:string;os_version:string;assurance:Assurance;checks:string[];evidence_hash:string;expires_at:number};
export class QualificationGate {
  #entries:Qualification[];
  #host:ProcessIdentity|null;
  constructor(key:KeyObject,certificates:Signed<Qualification>[]=[],hostProcess:ProcessIdentity|null=null) {
    this.#host=hostProcess===null?null:snapshot(hostProcess);
    this.#entries=certificates.map(packet=>{
      const q=authenticated(packet,key);keys(q,['schema','profile_hash','helper_hash','tool_hash','host_sid','worker_sid','os_version','assurance','checks','evidence_hash','expires_at']);
      for(const h of [q.profile_hash,q.helper_hash,q.tool_hash,q.evidence_hash])hash(h);
      invariant(q.schema==='agentnexus/qualification/1'&&['SIMULATED','REAL_WINDOWS'].includes(q.assurance),'M14_QUALIFICATION');
      invariant(Array.isArray(q.checks)&&new Set(q.checks).size===q.checks.length&&q.checks.every(c=>COMBINATION_CHECKS.includes(c)),'M14_QUALIFICATION');
      invariant(Number.isSafeInteger(q.expires_at),'M14_QUALIFICATION');return snapshot(q);
    });
  }
  admit(r:Runtime,tool:Tool,helperHash:string):Qualification {
    const q=this.#entries.find(q=>q.profile_hash===r.profile_hash&&q.tool_hash===tool.executable_hash&&q.helper_hash===helperHash&&q.worker_sid===r.process.principal&&(r.assurance==='SIMULATED'||q.host_sid===this.#host?.principal)&&q.os_version===r.profile.os_version&&q.assurance===r.assurance&&q.expires_at>Date.now());
    invariant(q&&COMBINATION_CHECKS.every(c=>q.checks.includes(c)),'M14_COMBINATION_NOT_QUALIFIED');
    if(q.assurance==='REAL_WINDOWS')invariant(q.host_sid!==q.worker_sid,'M14_DISTINCT_IDENTITIES_REQUIRED');
    return snapshot(q);
  }
}
