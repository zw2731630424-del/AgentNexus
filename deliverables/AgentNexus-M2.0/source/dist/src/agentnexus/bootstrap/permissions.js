import { isAbsolute, relative, resolve } from 'node:path';
import { invariant } from '../types.js';
export function within(root, path) { const r = relative(resolve(root), resolve(path)); return r === '' || (!isAbsolute(r) && r !== '..' && !r.startsWith('..\\') && !r.startsWith('../')); }
const aliases = { SY: 'S-1-5-18', BA: 'S-1-5-32-544', WD: 'S-1-1-0', AU: 'S-1-5-11', BU: 'S-1-5-32-545', AC: 'S-1-15-2-1', AN: 'S-1-5-7', CO: 'S-1-3-0', OW: 'S-1-3-4', RC: 'S-1-5-12' };
const masks = { FA: 0x1f01ff, FR: 0x120089, FW: 0x120116, FX: 0x1200a0, GA: 0x10000000, GR: 0x80000000, GW: 0x40000000, GX: 0x20000000, RC: 0x20000, SD: 0x10000, WD: 0x40000, WO: 0x80000 };
function mask(rights) { if (/^0x[0-9a-f]{1,8}$/i.test(rights))
    return Number.parseInt(rights.slice(2), 16) >>> 0; invariant(rights.length > 0 && rights.length % 2 === 0, 'M15_SDDL_RIGHTS'); let value = 0; for (let i = 0; i < rights.length; i += 2) {
    const v = masks[rights.slice(i, i + 2)];
    invariant(v !== undefined, 'M15_SDDL_RIGHTS');
    value = (value | v) >>> 0;
} return value; }
/** Deliberately accepts only reviewed ordinary A/D ACEs; unknown SDDL never grants trust. */
export function validatePermissionPin(config, pin) {
    const launcher = within(config.launcher_root, pin.path), privatePath = launcher || within(config.host_root, pin.path) || within(config.broker_root, pin.path) || within(config.resource.root, pin.path);
    const trusted = new Set(['S-1-5-18', 'S-1-5-32-544', config.operator_sid, config.host_sid, ...(launcher ? [config.worker_sid] : [])]);
    invariant(trusted.has(pin.owner_sid), 'M15_PIN_OWNER_UNTRUSTED');
    invariant(/^O:[^:()]+G:[^:()]+D:P(?:AI|AR)?(?:\([^)]+\))+$/.test(pin.sddl), 'M15_SDDL_SUBSET');
    const aces = pin.sddl.match(/\([^)]+\)/g);
    for (const ace of aces) {
        const parts = ace.slice(1, -1).split(';');
        invariant(parts.length === 6 && ['A', 'D'].includes(parts[0]) && parts[3] === '' && parts[4] === '', 'M15_SDDL_ACE');
        const principal = aliases[parts[5]] ?? parts[5];
        invariant(/^S-1-\d+(?:-\d+)+$/.test(principal), 'M15_SDDL_PRINCIPAL');
        const rights = mask(parts[2]);
        if (parts[0] === 'A' && rights !== 0) {
            const write = (rights & (0x10000000 | 0x40000000 | 0x000d0156)) !== 0;
            invariant(!write || trusted.has(principal), 'M15_UNTRUSTED_WRITE_ACE');
            invariant(!privatePath || trusted.has(principal), 'M15_PRIVATE_READ_ACE');
        }
    }
}
