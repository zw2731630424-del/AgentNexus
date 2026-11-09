import { boundedJson, canonical, invariant, sha256, validateIdentity, } from './types.js';
export const ZERO_HASH = '0'.repeat(64);
export const MAX_FRAME_BYTES = 64 * 1024;
export const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function string(value, max = 512) {
    invariant(typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= max, 'INVALID_RECORD');
}
function nullableString(value, max = 512) { if (value !== null)
    string(value, max); }
function fields(value, names) {
    invariant(Object.keys(value).length === names.length && names.every(k => Object.hasOwn(value, k)), 'INVALID_RECORD_FIELDS');
}
function strings(value) {
    invariant(Array.isArray(value) && value.length <= 256, 'INVALID_RECORD');
    for (const v of value)
        string(v, 128);
}
export function validateArtifactRef(value) {
    invariant(value !== null && typeof value === 'object' && !Array.isArray(value), 'INVALID_ARTIFACT_REF');
    const v = value;
    fields(v, ['artifact_id', 'sha256', 'bytes', 'codec', 'stored_sha256', 'stored_bytes', 'media_type', 'sensitivity']);
    invariant(typeof v.artifact_id === 'string' && UUID.test(v.artifact_id), 'INVALID_ARTIFACT_REF');
    invariant(typeof v.sha256 === 'string' && HASH.test(v.sha256) && typeof v.stored_sha256 === 'string' && HASH.test(v.stored_sha256), 'INVALID_ARTIFACT_REF');
    invariant(Number.isSafeInteger(v.bytes) && v.bytes >= 0 && v.bytes <= MAX_ARTIFACT_BYTES, 'INVALID_ARTIFACT_REF');
    invariant(Number.isSafeInteger(v.stored_bytes) && v.stored_bytes > 0 && v.stored_bytes <= MAX_ARTIFACT_BYTES + 8 * 1024 * 1024, 'INVALID_ARTIFACT_REF');
    invariant(v.codec === 'zstd' && v.sensitivity === 'NORMAL', 'SECRET_UNSUPPORTED');
    string(v.media_type, 200);
    invariant(!/[\x00-\x1f\x7f]/.test(v.media_type), 'INVALID_ARTIFACT_REF');
}
function refs(value) {
    invariant(Array.isArray(value) && value.length <= 256, 'INVALID_RECORD');
    for (const ref of value)
        validateArtifactRef(ref);
}
export function validateInput(domain, input) {
    // Canonicalize before property access: reject accessors, cycles, prototypes and large envelopes.
    const body = JSON.parse(boundedJson(input, MAX_FRAME_BYTES - 1024));
    invariant(body !== null && typeof body === 'object' && !Array.isArray(body), 'INVALID_RECORD');
    validateIdentity(body);
    for (const k of ['event_id', 'operation_id', 'observed_at'])
        string(body[k], 128);
    invariant(Number.isFinite(Date.parse(body.observed_at)), 'INVALID_RECORD_TIME');
    const base = ['agent_id', 'project_id', 'task_id', 'session_id', 'event_id', 'operation_id', 'observed_at'];
    if (domain === 'audit') {
        fields(body, [...base, 'operation_type', 'phase', 'cwd', 'parameters', 'parameters_ref', 'before_state_ref',
            'policy_decision_ref', 'authorization_ref', 'execution_status', 'exit_code', 'stdout_ref', 'stderr_ref',
            'after_state_ref', 'artifact_refs', 'context_event_refs', 'decision_refs', 'applicability', 'detail']);
        string(body.operation_type, 128);
        string(body.phase, 128);
        string(body.execution_status, 128);
        nullableString(body.cwd, 4096);
        nullableString(body.policy_decision_ref);
        nullableString(body.authorization_ref);
        invariant(body.exit_code === null || Number.isSafeInteger(body.exit_code), 'INVALID_RECORD');
        for (const k of ['parameters_ref', 'before_state_ref', 'stdout_ref', 'stderr_ref', 'after_state_ref'])
            if (body[k] !== null)
                validateArtifactRef(body[k]);
        refs(body.artifact_refs);
        strings(body.context_event_refs);
        strings(body.decision_refs);
    }
    else if (domain === 'context') {
        fields(body, [...base, 'kind', 'payload_ref', 'audit_event_refs']);
        string(body.kind, 128);
        validateArtifactRef(body.payload_ref);
        strings(body.audit_event_refs);
    }
    else {
        invariant(domain === 'decision', 'INVALID_DOMAIN');
        fields(body, [...base, 'decision_id', 'status', 'authority_ref', 'supersedes', 'evidence_refs', 'decision']);
        string(body.decision_id, 128);
        string(body.authority_ref);
        nullableString(body.supersedes, 128);
        invariant(['PROPOSED', 'ACCEPTED', 'SUPERSEDED', 'REJECTED'].includes(body.status), 'INVALID_RECORD');
        refs(body.evidence_refs);
    }
    return body;
}
export function artifactRefs(domain, body) {
    const b = body;
    if (domain === 'context')
        return [b.payload_ref];
    if (domain === 'decision')
        return b.evidence_refs;
    return [b.parameters_ref, b.before_state_ref, b.stdout_ref, b.stderr_ref, b.after_state_ref,
        ...b.artifact_refs].filter(x => x !== null);
}
export function recordHash(record) { return sha256(canonical(record)); }
export function frame(record) {
    const bytes = Buffer.from(boundedJson(record, MAX_FRAME_BYTES - 1) + '\n');
    invariant(bytes.length <= MAX_FRAME_BYTES, 'FRAME_TOO_LARGE');
    return bytes;
}
export function validateRecord(input) {
    const value = JSON.parse(boundedJson(input, MAX_FRAME_BYTES));
    fields(value, ['seq', 'domain', 'event_id', 'operation_id', 'project_id', 'task_id', 'previous_hash', 'hash', 'body']);
    invariant(Number.isSafeInteger(value.seq) && value.seq > 0, 'RECORD_CORRUPT');
    invariant(['audit', 'context', 'decision'].includes(value.domain), 'RECORD_CORRUPT');
    invariant(HASH.test(value.previous_hash) && HASH.test(value.hash), 'RECORD_CORRUPT');
    const body = validateInput(value.domain, value.body);
    invariant(value.event_id === body.event_id && value.operation_id === body.operation_id && value.project_id === body.project_id && value.task_id === body.task_id, 'RECORD_CORRUPT');
    const { hash, ...withoutHash } = value;
    invariant(hash === recordHash(withoutHash), 'RECORD_CORRUPT');
    return value;
}
