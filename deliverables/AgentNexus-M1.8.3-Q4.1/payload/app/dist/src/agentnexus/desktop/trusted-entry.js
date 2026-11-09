import { object, requireThat } from './contracts.js';
export const ENTRY_ACTIONS = ['ADD', 'ROTATE', 'ENABLE', 'DISABLE', 'DELETE', 'MODELS'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const emptyUuid = '00000000-0000-0000-0000-000000000000';
const modelIds = new Set(['deepseek-flash', 'deepseek-v4-pro']);
export function entryIntent(input) {
    object(input, ['provider_id', 'model_ids', 'action', 'name', 'credential_id', 'operation_id'], ['provider_id', 'model_ids', 'action', 'name', 'operation_id']);
    requireThat(input.provider_id === 'deepseek', 'TRUSTED_ENTRY_SCOPE_BLOCKED');
    requireThat(ENTRY_ACTIONS.includes(input.action));
    requireThat(typeof input.operation_id === 'string' && input.operation_id.length === 36 && input.operation_id !== emptyUuid && uuid.test(input.operation_id));
    requireThat(typeof input.name === 'string' && input.name.length <= 80 && !/[\uD800-\uDFFF]/.test(input.name) && input.name === input.name.trim() && /^[\p{L}\p{N} ._-]{1,80}$/u.test(input.name));
    requireThat(Array.isArray(input.model_ids) && input.model_ids.length <= 2 && new Set(input.model_ids).size === input.model_ids.length && input.model_ids.every((id) => typeof id === 'string' && modelIds.has(id)));
    const target = input.action !== 'ADD';
    requireThat(target ? typeof input.credential_id === 'string' && input.credential_id.length === 40 && input.credential_id.startsWith('key.') && input.credential_id.slice(4) !== emptyUuid && uuid.test(input.credential_id.slice(4)) : !Object.hasOwn(input, 'credential_id'));
    requireThat(!['ADD', 'ROTATE', 'ENABLE'].includes(input.action) || input.model_ids.length > 0, 'ADD_MODEL_FIRST');
    return Object.freeze({ provider_id: 'deepseek', model_ids: Object.freeze([...input.model_ids].sort()), action: input.action, name: input.name, operation_id: input.operation_id, ...(target ? { credential_id: input.credential_id } : {}) });
}
/** Discard port-owned output fields; only the finite result vocabulary reaches the Renderer. */
export function entryResult(value, action) {
    if (!value || typeof value !== 'object')
        return { status: 'INCONCLUSIVE', reason: 'HELPER_CANCELLED_OR_UNKNOWN' };
    const status = value.status;
    if (status === 'IPC_BLOCKED')
        return { status, reason: 'TRUSTED_ENTRY_BLOCKED' };
    if (status === 'INCONCLUSIVE')
        return { status, reason: 'HELPER_CANCELLED_OR_UNKNOWN' };
    if (status === 'CREDENTIAL_SAVED' || status === 'REVOKED')
        return { status: action === 'DELETE' ? 'REVOKED' : 'CREDENTIAL_SAVED', reason: 'HELPER_COMPLETED_REFRESH_REQUIRED' };
    return { status: 'INCONCLUSIVE', reason: 'HELPER_CANCELLED_OR_UNKNOWN' };
}
export const unavailableEntry = () => ({ status: 'IPC_BLOCKED', reason: 'TRUSTED_ENTRY_UNAVAILABLE' });
