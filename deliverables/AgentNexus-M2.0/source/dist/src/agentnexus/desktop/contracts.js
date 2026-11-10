export const METHODS = ['security.snapshot', 'security.export', 'security.preview', 'security.import', 'security.reset', 'security.commit', 'snapshot', 'provider.save', 'provider.delete', 'model.save', 'model.delete', 'model.default', 'credential.entry', 'credential.save', 'credential.state', 'credential.delete', 'connection.test', 'binding.save', 'selection.save', 'preference.save', 'chat.send'];
export class DesktopError extends Error {
    code;
    constructor(code) { super(code); this.code = code; this.name = 'DesktopError'; }
}
export function requireThat(value, code = 'INVALID_INPUT') { if (!value)
    throw new DesktopError(code); }
export function object(value, keys, required = keys) { requireThat(!!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => keys.includes(k)) && required.every(k => Object.hasOwn(value, k))); }
export function textValue(value, max = 128) { requireThat(typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\x00-\x1f]/.test(value)); }
export function idValue(value) { requireThat(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/.test(value)); }
export function integer(value, max, min = 0) { requireThat(Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max); }
export function bool(value) { requireThat(typeof value === 'boolean'); }
export function endpoint(base) {
    try {
        const u = new URL(base);
        requireThat(u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && !u.port && !/\s/.test(base) && !/\/chat\/completions\/?$/.test(u.pathname), 'INVALID_ENDPOINT');
        return u.href.replace(/\/$/, '') + '/chat/completions';
    }
    catch {
        throw new DesktopError('INVALID_ENDPOINT');
    }
}
export function connectionStatus(input) {
    if (input.timeout)
        return 'TIMEOUT';
    if (input.status === 401)
        return 'INVALID_KEY';
    if (input.status === 403)
        return 'UNAUTHORIZED';
    if (input.status === 429)
        return 'RATE_LIMITED';
    if (input.status === 404 || input.status === 422)
        return 'MODEL_UNAVAILABLE';
    if ((input.status ?? 0) >= 500)
        return 'PROVIDER_UNAVAILABLE';
    if (input.reason === 'INVALID_ENDPOINT')
        return 'INVALID_ENDPOINT';
    return input.status === 200 && input.complete === true ? 'CONNECTED' : 'INCONCLUSIVE';
}
