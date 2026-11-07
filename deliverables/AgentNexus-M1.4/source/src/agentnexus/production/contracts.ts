import { sign, verify, randomBytes } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { canonical, invariant, sha256 } from '../types.ts';
import type { Identity, Json } from '../types.ts';
import { hash, id, keys, profileHash, snapshot, validateLogical, validateProcess } from '../runtime/contracts.ts';
import type { LogicalIdentity, ProcessIdentity, SandboxProfile } from '../runtime/contracts.ts';
import { intentHash } from '../gateway.ts';
import type { ToolRequest } from '../gateway.ts';
import { performance } from 'node:perf_hooks';

/** Remote signatures carry wall time, so each receiver additionally keeps a local monotonic fence. */
export class DeadlineGuard {
  #anchor=Date.now();#mono=performance.now();#last=this.#anchor;#invalid=false;
  check(issued:number,expires:number):void {
    const wall=Date.now();if(wall<this.#last)this.#invalid=true;this.#last=Math.max(this.#last,wall);
    invariant(!this.#invalid,'M14_CLOCK_INVALID');
    const effective=Math.max(wall,this.#anchor+performance.now()-this.#mono);
    invariant(effective>=issued&&effective<expires,'M14_GRANT_EXPIRED');
  }
}

export const REQUIRED_FEATURES = Object.freeze([
  'runtime.host.production','runtime.worker.production','runtime.broker.production',
  'runtime.ipc.windows.production','runtime.sandbox.windows.production','runtime.file_broker',
  'runtime.process_supervisor','runtime.exit_proof.production','runtime.resource_release.production',
  'audit.producer.broker','audit.producer.file','audit.producer.process',
]);
export const RESOURCE_KINDS = Object.freeze(['WRITER','WORKSPACE_LOCK','PROCESS_SLOT','WORKER_QUOTA','SANDBOX_RESERVATION'] as const);
export type Assurance = 'SIMULATED' | 'REAL_WINDOWS';
export type Runtime = {
  runtime_id: string; logical: LogicalIdentity; process: ProcessIdentity; parent: ProcessIdentity;
  worker_instance_id: string; host_boot_id: string; broker_boot_id: string; generation: number;
  profile: SandboxProfile; profile_hash: string; state: 'ACTIVE' | 'REVOKED' | 'UNKNOWN_QUARANTINED';
  assurance: Assurance;
};
export type Grant = {
  schema: 'agentnexus/remote-permit/1'; permit_id: string; approval_id: string;
  operation_id: string; intent_hash: string; logical: LogicalIdentity; runtime_id: string;
  worker_instance_id: string; host_boot_id: string; broker_boot_id: string; generation: number;
  process: ProcessIdentity; parent: ProcessIdentity; tool_id: string; tool_version: string;
  resource_id: string; profile_hash: string; policy_epoch: number; feature_epoch: number;
  issued_at: number; expires_at: number; nonce: string; arguments_hash: string;
};
export type Signed<T> = { body: T; signature: string };
export type Epochs = { feature_epoch: number; policy_epoch: number };
export type Tool = { id: string; version: string; feature_id: string; policy_ids: string[]; capability: 'PROCESS' | 'EXTERNAL_EFFECT'; profile_hash: string; executable_hash: string };
export function nonce(): string { return randomBytes(32).toString('hex'); }
export function signed<T>(body: T, key: KeyObject): Signed<T> {
  const frozen = snapshot(body);
  return snapshot({ body: frozen, signature: sign(null,Buffer.from(canonical(frozen)),key).toString('hex') });
}
export function authenticated<T>(value: Signed<T>, key: KeyObject, maxBytes = 65536): T {
  const packet = snapshot(value,maxBytes); keys(packet,['body','signature']);
  invariant(typeof packet.signature === 'string' && /^[a-f0-9]{128}$/.test(packet.signature), 'M14_SIGNATURE');
  invariant(verify(null,Buffer.from(canonical(packet.body)),key,Buffer.from(packet.signature,'hex')), 'M14_SIGNATURE');
  return packet.body;
}
export function validateRuntime(r: Runtime): void {
  keys(r,['runtime_id','logical','process','parent','worker_instance_id','host_boot_id','broker_boot_id','generation','profile','profile_hash','state','assurance']);
  for(const v of [r.runtime_id,r.worker_instance_id,r.host_boot_id,r.broker_boot_id])id(v);
  validateLogical(r.logical); validateProcess(r.process); validateProcess(r.parent);
  invariant(r.process.os === 'windows' && r.parent.os === 'windows' && r.profile.os === 'windows' && r.profile.principal === r.process.principal, 'M14_OS_BINDING');
  invariant(r.profile_hash === profileHash(r.profile) && Number.isSafeInteger(r.generation) && r.generation > 0, 'M14_RUNTIME_BINDING');
  invariant(['ACTIVE','REVOKED','UNKNOWN_QUARANTINED'].includes(r.state) && ['SIMULATED','REAL_WINDOWS'].includes(r.assurance),'M14_RUNTIME_STATE');
}
export function target(r: Runtime) {
  validateRuntime(r);
  return { runtime_id:r.runtime_id, worker_instance_id:r.worker_instance_id, host_boot_id:r.host_boot_id,
    broker_boot_id:r.broker_boot_id, generation:r.generation, process:r.process, parent:r.parent, profile_hash:r.profile_hash };
}
export function productionIntent(identity: Identity, request: ToolRequest, runtime: Runtime): string {
  return sha256(canonical({ m13_intent_hash:intentHash(identity,request), execution:target(runtime) }));
}
export function validateGrant(g: Grant): void {
  keys(g,['schema','permit_id','approval_id','operation_id','intent_hash','logical','runtime_id','worker_instance_id','host_boot_id','broker_boot_id','generation','process','parent','tool_id','tool_version','resource_id','profile_hash','policy_epoch','feature_epoch','issued_at','expires_at','nonce','arguments_hash']);
  invariant(g.schema === 'agentnexus/remote-permit/1','M14_GRANT_SCHEMA'); validateLogical(g.logical);
  for(const v of [g.permit_id,g.approval_id,g.operation_id,g.runtime_id,g.worker_instance_id,g.host_boot_id,g.broker_boot_id,g.tool_id])id(v);
  for(const v of [g.intent_hash,g.profile_hash,g.arguments_hash,g.nonce])hash(v);
  validateProcess(g.process); validateProcess(g.parent);
  invariant(typeof g.tool_version==='string' && g.tool_version.length>0 && g.tool_version.length<=64,'M14_TOOL_VERSION');
  invariant(typeof g.resource_id==='string' && g.resource_id.startsWith(g.logical.project_id+':') && g.resource_id.length<=256,'M14_RESOURCE');
  for(const v of [g.policy_epoch,g.feature_epoch,g.issued_at,g.expires_at,g.generation])invariant(Number.isSafeInteger(v)&&v>=0,'M14_GRANT_NUMBER');
  invariant(g.generation>0 && g.expires_at>g.issued_at && g.expires_at-g.issued_at<=30000,'M14_GRANT_EXPIRY');
}
export function grantMatches(g: Grant,r: Runtime,epochs: Epochs,now=Date.now()): void {
  validateGrant(g); validateRuntime(r);
  invariant(r.state==='ACTIVE' && canonical(g.logical)===canonical(r.logical),'M14_IDENTITY_REVOKED');
  invariant(canonical(target(r))===canonical({runtime_id:g.runtime_id,worker_instance_id:g.worker_instance_id,host_boot_id:g.host_boot_id,broker_boot_id:g.broker_boot_id,generation:g.generation,process:g.process,parent:g.parent,profile_hash:g.profile_hash}),'M14_RUNTIME_MISMATCH');
  invariant(epochs.feature_epoch===g.feature_epoch && epochs.policy_epoch===g.policy_epoch,'M14_EPOCH_STALE');
  invariant(now>=g.issued_at && now<g.expires_at,'M14_GRANT_EXPIRED');
}
export function json<T>(value: T): Json { return value as unknown as Json; }
