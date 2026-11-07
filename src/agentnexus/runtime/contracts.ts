import { boundedJson, canonical, freezeJson, invariant, sha256, validateIdentity } from '../types.ts';
import type { Identity, Json } from '../types.ts';

export type ProcessIdentity = { os: 'windows' | 'linux'; principal: string; pid: number; start_id: string; os_session: string };
export type LogicalIdentity = Identity & { role: string };
export type RuntimeState = 'CREATED' | 'AUTHENTICATED' | 'ACTIVE' | 'REVOKING' | 'REVOKED' | 'ABNORMAL_EXIT' | 'UNKNOWN_QUARANTINED';
export type SandboxProfile = {
  id: string; version: number; os: 'windows' | 'linux'; os_version: string; principal: string;
  accessible: string[]; read_only: string[]; writable: string[]; network: 'DENY';
  limits: { memory_bytes: number; cpu_ms: number; wall_ms: number; file_bytes: number; processes: number; output_bytes: number };
  lifetime: 'ONE_OPERATION'; exit_requirement: 'COMPLETE_PROCESS_TREE';
};
export type RuntimeBinding = {
  runtime_id: string; logical: LogicalIdentity; process: ProcessIdentity; parent: ProcessIdentity;
  worker_instance_id: string; runtime_session_id: string; host_boot_id: string; generation: number;
  profile: SandboxProfile; profile_hash: string; state: RuntimeState; revision: number;
};
export type CapabilityScope = {
  operation_id: string; resource_id: string; payload_hash: string;
  kind: 'PURE' | 'READ_ONLY' | 'LOCAL_WRITE' | 'PROCESS' | 'EXTERNAL_EFFECT';
};
export type Envelope = Identity & {
  schema: 'agentnexus/ipc/1'; request_id: string; runtime_id: string; runtime_session_id: string;
  worker_instance_id: string; operation_id: string; capability_id: string; resource_id: string;
  policy_epoch: number; feature_epoch: number; payload_hash: string; nonce: string; deadline: number;
  connection_id: string; profile_hash: string; payload: Json;
};
export type ExitObservation = {
  process: ProcessIdentity; parent: ProcessIdentity; container_id: string;
  members: { process: ProcessIdentity; exit_code: number | null; exited: boolean }[];
  termination_requested_at: string | null; root_exited: boolean; tree_empty: boolean;
  membership_complete: boolean; unknown_members: boolean; handles_closed: boolean; outputs_closed: boolean;
  observed_at: string; source: 'MODEL' | 'WINDOWS_PRIMITIVE';
};
export type ExitState = 'TERMINATION_REQUESTED' | 'PROCESS_EXITED' | 'PROCESS_TREE_EXITED' | 'EXIT_UNVERIFIED' | 'EXIT_FAILED';
// Constructor-injected transport/Supervisor belongs to the trusted bootstrap, never to a Worker.
// Neither available assurance admits arbitrary execution. No user-controlled verified boolean exists.
export type ObservationProvider = {
  readonly assurance: 'MODEL' | 'WINDOWS_PRIMITIVE';
  peer(channel: object, signal?: AbortSignal): Promise<ProcessIdentity>;
  exit(binding: Readonly<RuntimeBinding>, signal?: AbortSignal): Promise<ExitObservation>;
};
export const LIMITS = Object.freeze({ frame: 65536, connections: 32, identities: 256, requests: 4096, capabilities: 4096, resources: 1024 });
export function id(value: unknown): asserts value is string {
  invariant(typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value), 'RUNTIME_INVALID_ID');
}
export function hash(value: unknown): asserts value is string { invariant(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'RUNTIME_INVALID_HASH'); }
export function keys(value: unknown, fields: string[]): void {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...fields].sort().join(','), 'RUNTIME_INVALID_FIELDS');
}
export function snapshot<T>(value: T, max = LIMITS.frame): T { return freezeJson(JSON.parse(boundedJson(value, max))) as T; }
export function validateProcess(p: ProcessIdentity): void {
  keys(p, ['os','principal','pid','start_id','os_session']);
  invariant(['windows','linux'].includes(p.os) && typeof p.principal === 'string' && p.principal.length > 0 && p.principal.length <= 256, 'RUNTIME_INVALID_PROCESS');
  invariant(Number.isSafeInteger(p.pid) && p.pid > 0 && /^\d{1,32}$/.test(p.start_id) && /^\d{1,32}$/.test(p.os_session), 'RUNTIME_INVALID_PROCESS');
  invariant(p.os !== 'windows' || /^S-1-\d+(?:-\d+)+$/.test(p.principal), 'RUNTIME_INVALID_PRINCIPAL');
  invariant(p.os !== 'linux' || /^\d+$/.test(p.principal), 'RUNTIME_INVALID_PRINCIPAL');
}
export function sameProcess(a: ProcessIdentity, b: ProcessIdentity): boolean { return canonical(a) === canonical(b); }
export function validateLogical(p: LogicalIdentity): void { keys(p, ['agent_id','project_id','task_id','session_id','role']); validateIdentity(p); id(p.role); }
export function validateProfile(p: SandboxProfile): void {
  keys(p, ['id','version','os','os_version','principal','accessible','read_only','writable','network','limits','lifetime','exit_requirement']);
  id(p.id); invariant(Number.isSafeInteger(p.version) && p.version > 0 && ['windows','linux'].includes(p.os) && typeof p.os_version === 'string' && p.os_version.length > 0 && p.os_version.length <= 128 && typeof p.principal === 'string', 'RUNTIME_INVALID_PROFILE');
  for (const paths of [p.accessible,p.read_only,p.writable]) {
    invariant(Array.isArray(paths) && paths.length <= 16 && new Set(paths).size === paths.length, 'RUNTIME_INVALID_PROFILE');
    for (const path of paths) invariant(typeof path === 'string' && path.length > 0 && path.length <= 2048 && !/[\x00-\x1f]/.test(path), 'RUNTIME_INVALID_PROFILE');
  }
  // Paths are declarative here: enforcement still needs a verified native filesystem owner.
  invariant(p.network === 'DENY' && p.lifetime === 'ONE_OPERATION' && p.exit_requirement === 'COMPLETE_PROCESS_TREE', 'RUNTIME_INVALID_PROFILE');
  keys(p.limits, ['memory_bytes','cpu_ms','wall_ms','file_bytes','processes','output_bytes']);
  for (const value of Object.values(p.limits)) invariant(Number.isSafeInteger(value) && value > 0 && value <= 1073741824, 'RUNTIME_INVALID_LIMIT');
  invariant(p.limits.wall_ms <= 30000 && p.limits.processes <= 16 && p.limits.output_bytes <= 67108864, 'RUNTIME_INVALID_LIMIT');
}
export function profileHash(p: SandboxProfile): string { validateProfile(p); return sha256(canonical(p)); }
export function validateEnvelope(e: Envelope): void {
  keys(e, ['schema','request_id','agent_id','project_id','task_id','session_id','runtime_id','runtime_session_id','worker_instance_id','operation_id','capability_id','resource_id','policy_epoch','feature_epoch','payload_hash','nonce','deadline','connection_id','profile_hash','payload']);
  invariant(e.schema === 'agentnexus/ipc/1', 'IPC_VERSION'); validateIdentity(e);
  for (const k of ['request_id','runtime_id','runtime_session_id','worker_instance_id','operation_id','capability_id','connection_id'] as const) id(e[k]);
  invariant(typeof e.resource_id === 'string' && e.resource_id.length <= 256 && e.resource_id.startsWith(e.project_id + ':'), 'IPC_RESOURCE_SCOPE');
  hash(e.payload_hash); hash(e.profile_hash);
  invariant(sha256(canonical(e.payload)) === e.payload_hash, 'IPC_PAYLOAD_CHANGED');
  invariant(/^[a-f0-9]{64}$/.test(e.nonce), 'IPC_NONCE');
  for (const n of [e.policy_epoch,e.feature_epoch,e.deadline]) invariant(Number.isSafeInteger(n) && n >= 0, 'IPC_INVALID_NUMBER');
}
