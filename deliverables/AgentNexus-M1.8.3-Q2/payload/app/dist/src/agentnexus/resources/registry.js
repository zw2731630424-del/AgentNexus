import { invariant } from '../types.js';
import { snapshot } from '../harness/contracts.js';
/** Descriptions cannot mint an execution profile or override the M1.5.1 gate. */
export const RESOURCE_CAPABILITIES = snapshot([
    { id: 'cpu.bandwidth.windows', resource: 'CPU_BANDWIDTH', mechanism: 'Job CPU_RATE HARD_CAP', enforcement: 'OS_PRIMITIVE', qualification: 'NOT_RUN', scope: 'Job plus child Jobs', limitation: 'Scheduling interval bandwidth; no cumulative CPU termination guarantee; target deployment unqualified' },
    { id: 'cpu.consumption.windows.strict', resource: 'CPU_CONSUMPTION', mechanism: 'JOB_TIME', enforcement: 'UNSUPPORTED', qualification: 'BLOCKED', scope: 'Associated processes, user mode only', limitation: 'Periodic checking; unchanged 80+50/300+50/3000+150ms strict contract failed in M1.5.1' },
    { id: 'cpu.accounting.windows', resource: 'CPU_ACCOUNTING', mechanism: 'Job BasicAccounting plus retained GetProcessTimes', enforcement: 'OBSERVE_ONLY', qualification: 'NOT_RUN', scope: 'Active and terminated Job members', limitation: '100ns representation is not measurement precision; historical member reconciliation discrepancy remains unknown' },
    { id: 'cpu.bandwidth.linux', resource: 'CPU_BANDWIDTH', mechanism: 'cgroup v2 cpu.max', enforcement: 'OS_PRIMITIVE', qualification: 'NOT_RUN', scope: 'Hierarchy; scheduler class restrictions apply', limitation: 'Bandwidth replenishes by period; not a cumulative termination budget; Ubuntu was not accessed' },
    { id: 'cpu.consumption.linux.strict', resource: 'CPU_CONSUMPTION', mechanism: 'No implemented qualified backend', enforcement: 'UNSUPPORTED', qualification: 'BLOCKED', scope: 'None', limitation: 'cpu.stat plus kill is monitoring, not a proven cumulative OS upper bound' },
    { id: 'memory.windows', resource: 'RAM', mechanism: 'JOB_MEMORY/PROCESS_MEMORY', enforcement: 'OS_PRIMITIVE', qualification: 'NOT_RUN', scope: 'Committed bytes', limitation: 'Production composition unqualified; not all host physical RAM' },
    { id: 'process.windows', resource: 'PROCESS', mechanism: 'ACTIVE_PROCESS_LIMIT', enforcement: 'OS_PRIMITIVE', qualification: 'NOT_RUN', scope: 'Concurrent associated processes', limitation: 'Not lifetime spawn count or all external producers' },
    ...['disk', 'io', 'network', 'model', 'time'].map(resource => ({ id: resource + '.application', resource: resource.toUpperCase(), mechanism: 'Trusted admission and accounting ledger', enforcement: 'APPLICATION_BOUND', qualification: 'NOT_RUN', scope: 'Worker/Project/Platform', limitation: 'No OS hard capability or external provider qualification; termination/expiry never proves release' })),
]);
export function assertStrictCpuQualified(_backend) { invariant(false, 'M16_STRICT_CPU_BLOCKED'); }
