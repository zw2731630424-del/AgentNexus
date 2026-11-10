import { invariant } from '../types.js';
import { snapshot } from '../harness/contracts.js';
export const RESOURCE_KEYS = Object.freeze(['cpu_user_us', 'cpu_kernel_us', 'memory_bytes', 'disk_bytes', 'processes', 'io_read_bytes', 'io_write_bytes', 'log_bytes', 'network_connections', 'network_bytes', 'model_tokens', 'model_requests', 'model_cost_micros', 'wall_ms', 'workers']);
export const CAPACITY_KEYS = Object.freeze(['memory_bytes', 'disk_bytes', 'processes', 'network_connections', 'workers']);
export const RESOURCE_LIMITS = Object.freeze({ budgets: 256, reservations: 4096, waiting: 64, closures: 4096, page: 32 });
export function vector(input = {}) {
    invariant(input !== null && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).every(k => RESOURCE_KEYS.includes(k)), 'RESOURCE_VECTOR');
    const out = {};
    for (const key of RESOURCE_KEYS) {
        const value = Object.hasOwn(input, key) ? input[key] : 0;
        invariant(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'RESOURCE_AMOUNT');
        out[key] = value;
    }
    return snapshot(out);
}
export function add(a, b) { const n = a + b; invariant(Number.isSafeInteger(n) && n >= 0, 'RESOURCE_ACCOUNTING_OVERFLOW'); return n; }
export function heldFor(r, key) { return CAPACITY_KEYS.includes(key) ? r.amounts[key] : Math.max(0, r.amounts[key] - r.accounted[key]); }
