import { boundedJson, canonical, freezeJson, invariant, sha256, validateIdentity } from '../types.js';
export const LIMITS = Object.freeze({ frame: 65536, connections: 32, identities: 256, requests: 4096, capabilities: 4096, resources: 1024 });
export function id(value) {
    invariant(typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value), 'RUNTIME_INVALID_ID');
}
export function hash(value) { invariant(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'RUNTIME_INVALID_HASH'); }
export function keys(value, fields) {
    invariant(value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...fields].sort().join(','), 'RUNTIME_INVALID_FIELDS');
}
export function snapshot(value, max = LIMITS.frame) { return freezeJson(JSON.parse(boundedJson(value, max))); }
export function validateProcess(p) {
    keys(p, ['os', 'principal', 'pid', 'start_id', 'os_session']);
    invariant(['windows', 'linux'].includes(p.os) && typeof p.principal === 'string' && p.principal.length > 0 && p.principal.length <= 256, 'RUNTIME_INVALID_PROCESS');
    invariant(Number.isSafeInteger(p.pid) && p.pid > 0 && /^\d{1,32}$/.test(p.start_id) && /^\d{1,32}$/.test(p.os_session), 'RUNTIME_INVALID_PROCESS');
    invariant(p.os !== 'windows' || /^S-1-\d+(?:-\d+)+$/.test(p.principal), 'RUNTIME_INVALID_PRINCIPAL');
    invariant(p.os !== 'linux' || /^\d+$/.test(p.principal), 'RUNTIME_INVALID_PRINCIPAL');
}
export function sameProcess(a, b) { return canonical(a) === canonical(b); }
export function validateLogical(p) { keys(p, ['agent_id', 'project_id', 'task_id', 'session_id', 'role']); validateIdentity(p); id(p.role); }
export function validateProfile(p) {
    keys(p, ['id', 'version', 'os', 'os_version', 'principal', 'accessible', 'read_only', 'writable', 'network', 'limits', 'lifetime', 'exit_requirement']);
    id(p.id);
    invariant(Number.isSafeInteger(p.version) && p.version > 0 && ['windows', 'linux'].includes(p.os) && typeof p.os_version === 'string' && p.os_version.length > 0 && p.os_version.length <= 128 && typeof p.principal === 'string', 'RUNTIME_INVALID_PROFILE');
    for (const paths of [p.accessible, p.read_only, p.writable]) {
        invariant(Array.isArray(paths) && paths.length <= 16 && new Set(paths).size === paths.length, 'RUNTIME_INVALID_PROFILE');
        for (const path of paths)
            invariant(typeof path === 'string' && path.length > 0 && path.length <= 2048 && !/[\x00-\x1f]/.test(path), 'RUNTIME_INVALID_PROFILE');
    }
    // Paths are declarative here: enforcement still needs a verified native filesystem owner.
    invariant(p.network === 'DENY' && p.lifetime === 'ONE_OPERATION' && p.exit_requirement === 'COMPLETE_PROCESS_TREE', 'RUNTIME_INVALID_PROFILE');
    keys(p.limits, ['memory_bytes', 'cpu_ms', 'wall_ms', 'file_bytes', 'processes', 'output_bytes']);
    for (const value of Object.values(p.limits))
        invariant(Number.isSafeInteger(value) && value > 0 && value <= 1073741824, 'RUNTIME_INVALID_LIMIT');
    invariant(p.limits.wall_ms <= 30000 && p.limits.processes <= 16 && p.limits.output_bytes <= 67108864, 'RUNTIME_INVALID_LIMIT');
}
export function profileHash(p) { validateProfile(p); return sha256(canonical(p)); }
export function validateEnvelope(e) {
    keys(e, ['schema', 'request_id', 'agent_id', 'project_id', 'task_id', 'session_id', 'runtime_id', 'runtime_session_id', 'worker_instance_id', 'operation_id', 'capability_id', 'resource_id', 'policy_epoch', 'feature_epoch', 'payload_hash', 'nonce', 'deadline', 'connection_id', 'profile_hash', 'payload']);
    invariant(e.schema === 'agentnexus/ipc/1', 'IPC_VERSION');
    validateIdentity(e);
    for (const k of ['request_id', 'runtime_id', 'runtime_session_id', 'worker_instance_id', 'operation_id', 'capability_id', 'connection_id'])
        id(e[k]);
    invariant(typeof e.resource_id === 'string' && e.resource_id.length <= 256 && e.resource_id.startsWith(e.project_id + ':'), 'IPC_RESOURCE_SCOPE');
    hash(e.payload_hash);
    hash(e.profile_hash);
    invariant(sha256(canonical(e.payload)) === e.payload_hash, 'IPC_PAYLOAD_CHANGED');
    invariant(/^[a-f0-9]{64}$/.test(e.nonce), 'IPC_NONCE');
    for (const n of [e.policy_epoch, e.feature_epoch, e.deadline])
        invariant(Number.isSafeInteger(n) && n >= 0, 'IPC_INVALID_NUMBER');
}
