import { createHash, randomUUID } from 'node:crypto';
export class NexusError extends Error {
    code;
    constructor(code, message = code) { super(message); this.name = 'NexusError'; this.code = code; }
}
export function invariant(ok, code, message = code) {
    if (!ok)
        throw new NexusError(code, message);
}
export function canonical(value) {
    const seen = new Set();
    function normalize(v, depth) {
        invariant(depth <= 64, 'JSON_DEPTH');
        if (v === null || typeof v === 'string' || typeof v === 'boolean')
            return v;
        if (typeof v === 'number') {
            invariant(Number.isFinite(v), 'JSON_NUMBER');
            return v;
        }
        invariant(typeof v === 'object' && v !== null, 'JSON_TYPE');
        invariant(!seen.has(v), 'JSON_CYCLE');
        seen.add(v);
        let out;
        if (Array.isArray(v))
            out = v.map(x => normalize(x, depth + 1));
        else {
            invariant(Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null, 'JSON_PROTOTYPE');
            const result = Object.create(null);
            const properties = Object.getOwnPropertyDescriptors(v);
            for (const k of Object.keys(properties).sort()) {
                const d = properties[k];
                invariant('value' in d && d.enumerable, 'JSON_ACCESSOR');
                result[k] = normalize(d.value, depth + 1);
            }
            out = result;
        }
        seen.delete(v);
        return out;
    }
    return JSON.stringify(normalize(value, 0));
}
export function boundedJson(value, maxBytes = 65536) {
    const body = canonical(value);
    invariant(Buffer.byteLength(body) <= maxBytes, 'FRAME_TOO_LARGE');
    return body;
}
export function freezeJson(value) {
    if (value !== null && typeof value === 'object') {
        for (const child of Object.values(value))
            freezeJson(child);
        Object.freeze(value);
    }
    return value;
}
export function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
export function uid() { return randomUUID(); }
export function now() { return new Date().toISOString(); }
export function validateIdentity(identity) {
    for (const k of ['agent_id', 'project_id', 'task_id', 'session_id'])
        invariant(typeof identity[k] === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(identity[k]), 'INVALID_IDENTITY');
}
export function auditEvent(identity, data) {
    validateIdentity(identity);
    return {
        ...identity, operation_id: uid(), event_id: uid(), operation_type: data.operation_type, phase: data.phase,
        observed_at: now(), cwd: null, parameters: null, parameters_ref: null, before_state_ref: null,
        policy_decision_ref: null, authorization_ref: null, execution_status: 'NOT_STARTED', exit_code: null,
        stdout_ref: null, stderr_ref: null, after_state_ref: null, artifact_refs: [], context_event_refs: [], decision_refs: [],
        applicability: { nullable_fields: 'not applicable at this phase; terminal event supplies actual result or explicit uncertainty' },
        detail: null, ...data,
        // Never take identity from data supplied to this helper.
        ...identity,
    };
}
