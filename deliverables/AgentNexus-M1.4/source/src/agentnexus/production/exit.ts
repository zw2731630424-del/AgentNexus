import type { KeyObject } from 'node:crypto';
import { canonical, invariant, sha256, uid } from '../types.ts';
import type { ArtifactRef } from '../types.ts';
import type { KernelStore } from '../storage.ts';
import { keys, sameProcess, snapshot, validateProcess } from '../runtime/contracts.ts';
import type { ProcessIdentity } from '../runtime/contracts.ts';
import { authenticated, json, signed } from './contracts.ts';
import type { Assurance, Grant, Signed } from './contracts.ts';
import { ProductionAudit } from './audit.ts';
import { clockFor } from '../control.ts';

export type ExitEvidence={
  source:Assurance;observation_id:string;process:ProcessIdentity;parent:ProcessIdentity;job_id:string;
  job_membership_verified:boolean;job_empty:boolean;membership_complete:boolean;unknown_members:boolean;
  members:{process:ProcessIdentity;parent:ProcessIdentity;exited:boolean;exit_code:number|null;handle_signaled:boolean}[];
  root_exited:boolean;handles_closed:boolean;termination_requested_at:string|null;observed_at:string;
  sandbox:{profile_hash:string;token_verified:boolean;network_verified:boolean;filesystem_verified:boolean;limits_verified:boolean;settled:boolean};
  outputs:{stdout:{eof:boolean;producer_closed:boolean;producer_id:string};stderr:{eof:boolean;producer_closed:boolean;producer_id:string}};
};
export type ExitProof={schema:'agentnexus/exit-proof/2';proof_id:string;grant:Grant;observation:ExitEvidence;stdout_ref:ArtifactRef|null;stderr_ref:ArtifactRef|null;states:string[];state:'EXIT_VERIFIED'|'EXIT_UNVERIFIED';production_release_authority:boolean;qualification_evidence_hash:string;evidence_hash:string};
export function buildExitProof(g:Grant,evidence:ExitEvidence,stdout:ArtifactRef|null,stderr:ArtifactRef|null,qualificationEvidenceHash:string):ExitProof {
  const e=snapshot(evidence);keys(e,['source','observation_id','process','parent','job_id','job_membership_verified','job_empty','membership_complete','unknown_members','members','root_exited','handles_closed','termination_requested_at','observed_at','sandbox','outputs']);
  validateProcess(e.process);validateProcess(e.parent);
  invariant(sameProcess(e.process,g.process)&&sameProcess(e.parent,g.parent),'M14_EXIT_IDENTITY');
  invariant(['SIMULATED','REAL_WINDOWS'].includes(e.source)&&typeof e.observation_id==='string'&&e.observation_id.length>0&&typeof e.job_id==='string'&&e.job_id.length>0,'M14_EXIT_SOURCE');
  for(const k of ['job_membership_verified','job_empty','membership_complete','unknown_members','root_exited','handles_closed'] as const)invariant(typeof e[k]==='boolean','M14_EXIT_FIELDS');
  invariant(Number.isFinite(Date.parse(e.observed_at)) && Date.parse(e.observed_at)>=g.issued_at && Date.parse(e.observed_at)<=Date.now()+1000,'M14_EXIT_TIME');
  invariant(e.termination_requested_at===null || (Number.isFinite(Date.parse(e.termination_requested_at))&&Date.parse(e.termination_requested_at)<=Date.parse(e.observed_at)),'M14_EXIT_TIME');
  invariant(Array.isArray(e.members)&&e.members.length>0&&e.members.length<=16,'M14_EXIT_MEMBERS');
  const seen=new Set<string>();
  for(const m of e.members){
    keys(m,['process','parent','exited','exit_code','handle_signaled']);validateProcess(m.process);validateProcess(m.parent);const k=canonical(m.process);
    invariant(!seen.has(k),'M14_EXIT_MEMBERS');seen.add(k);
    invariant(typeof m.exited==='boolean'&&typeof m.handle_signaled==='boolean'&&m.exited===m.handle_signaled&&(m.exited?Number.isSafeInteger(m.exit_code):m.exit_code===null),'M14_EXIT_CONTRADICTION');
  }
  const root=e.members.find(m=>sameProcess(m.process,g.process));
  invariant(root && root.exited===e.root_exited && (!e.job_empty || e.members.every(m=>m.exited)),'M14_EXIT_CONTRADICTION');
  for(const m of e.members)invariant(sameProcess(m.process,g.process)?sameProcess(m.parent,g.parent):e.members.some(parent=>sameProcess(parent.process,m.parent)),'M14_EXIT_PARENT');
  // Every descendant must have one finite ancestor path to the pinned root. Local parent existence is insufficient.
  const byIdentity=new Map(e.members.map(m=>[canonical(m.process),m]));
  for(const member of e.members){
    let cursor=member;const ancestors=new Set<string>();
    while(!sameProcess(cursor.process,g.process)){
      const identity=canonical(cursor.process);invariant(!ancestors.has(identity),'M14_EXIT_PARENT_CYCLE');ancestors.add(identity);
      const ancestor=byIdentity.get(canonical(cursor.parent));invariant(ancestor,'M14_EXIT_PARENT');cursor=ancestor;
    }
  }
  keys(e.sandbox,['profile_hash','token_verified','network_verified','filesystem_verified','limits_verified','settled']);invariant(e.sandbox.profile_hash===g.profile_hash,'M14_EXIT_PROFILE');
  for(const k of ['token_verified','network_verified','filesystem_verified','limits_verified','settled'] as const)invariant(typeof e.sandbox[k]==='boolean','M14_EXIT_FIELDS');
  keys(e.outputs,['stdout','stderr']);for(const o of Object.values(e.outputs)){keys(o,['eof','producer_closed','producer_id']);invariant(typeof o.eof==='boolean'&&typeof o.producer_closed==='boolean'&&typeof o.producer_id==='string'&&o.producer_id.length>0,'M14_EXIT_OUTPUTS');}
  const states:string[]=[];if(e.termination_requested_at)states.push('TERMINATION_REQUESTED');if(e.root_exited)states.push('PROCESS_EXITED');
  const tree=e.job_empty&&e.root_exited&&e.membership_complete&&!e.unknown_members&&e.job_membership_verified&&e.members.every(m=>m.exited&&m.handle_signaled);
  if(tree)states.push('PROCESS_TREE_EXITED');
  const outputs=Object.values(e.outputs).every(o=>o.eof&&o.producer_closed)&&!!stdout&&!!stderr;if(outputs)states.push('OUTPUT_PRODUCERS_SETTLED');
  const complete=tree&&outputs&&e.handles_closed&&Object.entries(e.sandbox).every(([k,v])=>k==='profile_hash'||v===true);
  const state=complete&&e.source==='REAL_WINDOWS'?'EXIT_VERIFIED':'EXIT_UNVERIFIED';states.push(state);
  const body={schema:'agentnexus/exit-proof/2' as const,proof_id:uid(),grant:g,observation:e,stdout_ref:stdout,stderr_ref:stderr,states,state,production_release_authority:state==='EXIT_VERIFIED',qualification_evidence_hash:qualificationEvidenceHash};
  return snapshot({...body,evidence_hash:sha256(canonical(body))});
}
/** Host-side verifier: only a pinned Broker signing key can submit a candidate. */
export class ExitProofVerifier {
  #store:KernelStore;#key:KeyObject;#audit:ProductionAudit;
  #reader:(ref:ArtifactRef)=>AsyncIterable<Uint8Array>;
  constructor(store:KernelStore,key:KeyObject,readBrokerArtifact?:(ref:ArtifactRef)=>AsyncIterable<Uint8Array>){this.#store=store;this.#key=key;this.#audit=new ProductionAudit(store);this.#reader=readBrokerArtifact??(ref=>store.artifacts.read(ref));
    store.db.exec(`CREATE TABLE IF NOT EXISTS m14_verified_exit_proofs(id TEXT PRIMARY KEY,operation TEXT UNIQUE NOT NULL,body TEXT NOT NULL,hash TEXT NOT NULL,imports TEXT NOT NULL,signed_packet TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS m14_proof_no_update BEFORE UPDATE ON m14_verified_exit_proofs BEGIN SELECT RAISE(ABORT,'append only'); END;
      CREATE TRIGGER IF NOT EXISTS m14_proof_no_delete BEFORE DELETE ON m14_verified_exit_proofs BEGIN SELECT RAISE(ABORT,'append only'); END;`);}
  async accept(packet:Signed<ExitProof>,expected:Grant,qualifiedEvidenceHash:string,signal?:AbortSignal):Promise<ExitProof>{
    signal?.throwIfAborted();
    const proof=authenticated(packet,this.#key);keys(proof,['schema','proof_id','grant','observation','stdout_ref','stderr_ref','states','state','production_release_authority','qualification_evidence_hash','evidence_hash']);
    invariant(canonical(proof.grant)===canonical(expected)&&proof.qualification_evidence_hash===qualifiedEvidenceHash,'M14_EXIT_OPERATION');
    const {evidence_hash,...body}=proof;invariant(sha256(canonical(body))===evidence_hash,'M14_EXIT_HASH');
    const rebuilt=buildExitProof(expected,proof.observation,proof.stdout_ref,proof.stderr_ref,qualifiedEvidenceHash);
    invariant(rebuilt.state===proof.state&&canonical(rebuilt.states)===canonical(proof.states)&&rebuilt.production_release_authority===proof.production_release_authority,'M14_EXIT_FORGED');
    // Validate immutable stream artifacts before accepting a settled producer claim.
    const imports:ArtifactRef[]=[];
    for(const ref of [proof.stdout_ref,proof.stderr_ref])if(ref){
      const imported=await this.#store.artifacts.put(this.#reader(ref),{maxBytes:ref.bytes,media_type:ref.media_type,signal});
      invariant(imported.sha256===ref.sha256&&imported.bytes===ref.bytes,'M14_REMOTE_ARTIFACT_CHANGED');imports.push(imported);
    }
    signal?.throwIfAborted();
    this.#store.transaction(()=>{
      this.#store.db.prepare('INSERT INTO m14_verified_exit_proofs VALUES(?,?,?,?,?,?)').run(proof.proof_id,expected.operation_id,canonical(proof),proof.evidence_hash,canonical(imports),canonical(packet));
      this.#audit.record('exit_proof',proof.state,expected,expected.operation_id,json({proof_id:proof.proof_id,evidence_hash:proof.evidence_hash,signed_packet_sha256:sha256(canonical(packet)),states:proof.states,imported_artifacts:imports}),expected.resource_id);
    });await this.#audit.barrier();return snapshot(proof);
  }
  async authorizeOwnerRelease(operation:string):Promise<void>{
    const row=this.#store.db.prepare('SELECT body,signed_packet FROM m14_verified_exit_proofs WHERE operation=?').get(operation) as any;invariant(row,'M14_EXIT_PROOF_REQUIRED');
    invariant(canonical(authenticated(JSON.parse(row.signed_packet) as Signed<ExitProof>,this.#key))===row.body,'M14_EXIT_SIGNATURE_REQUIRED');
    const p=JSON.parse(row.body) as ExitProof;invariant(p.state==='EXIT_VERIFIED'&&p.production_release_authority&&p.observation.source==='REAL_WINDOWS','M14_PRODUCTION_EXIT_REQUIRED');
    const remote=this.#store.db.prepare('SELECT grant_body,boot,state FROM m14_host_operations WHERE operation=?').get(operation) as any;
    invariant(remote&&remote.boot===clockFor(this.#store).boot_id&&p.grant.host_boot_id===remote.boot&&canonical(p.grant)===remote.grant_body&&['CLAIMED','STARTED','EXIT_VERIFIED'].includes(remote.state),'M14_RELEASE_RECOVERY_REQUIRED');
    const final=this.#store.db.prepare("SELECT outcome FROM control_reconciliations WHERE operation_id=? AND action='ADJUDICATE' AND outcome<>'UNKNOWN_QUARANTINED' ORDER BY revision DESC LIMIT 1").get(operation) as any;
    invariant(final,'FINAL_ADJUDICATION_REQUIRED');
    const versions=this.#store.db.prepare('SELECT resource,kind,state,revision FROM m14_host_resources WHERE operation=? ORDER BY resource,kind').all(operation) as any[];
    invariant(versions.length===5&&versions.every(v=>v.state==='HELD'),'M14_RESOURCE_QUARANTINED');
    this.#store.transaction(()=>{
      this.#store.db.prepare('INSERT INTO m14_release_authorizations VALUES(?,?,?,?,?,0)').run(operation,p.evidence_hash,p.grant.profile_hash,p.grant.host_boot_id,canonical(versions));
      this.#store.db.prepare("UPDATE control_operations SET executor_state='SETTLED' WHERE operation_id=? AND executor_state='UNKNOWN'").run(operation);
      this.#audit.record('reconciliation','OWNER_RELEASE_PREPARED',p.grant,operation,json({proof_hash:p.evidence_hash,owner_outcome:final.outcome,resources_released:false}),p.grant.resource_id);
    });await this.#audit.barrier();
  }
}
