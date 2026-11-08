import { invariant } from '../types.ts';
import type { Assurance } from './contracts.ts';

export type ResourceKind = 'CPU' | 'RAM' | 'DISK' | 'PROCESS' | 'IO' | 'NETWORK' | 'MODEL' | 'TIME';
export type ResourceScope = 'WORKER' | 'PROJECT' | 'PLATFORM';
export type ResourceMechanism = Readonly<{
  resource: ResourceKind;
  mechanism: string;
  semantics: string;
  qualification: 'FAIL' | 'NOT_RUN';
}>;

/** Describes the current implementation, not certificates supplied by a caller.
 * JOB_TIME is a periodic user-mode limit. Neither a successful Set/Query nor
 * CPU_RATE_CONTROL_HARD_CAP proves a bounded cumulative execution-time budget.
 * No application poller substitutes for the missing OS hard guarantee.
 */
export const WINDOWS_RESOURCE_MECHANISMS: readonly ResourceMechanism[] = Object.freeze([
  Object.freeze({resource:'CPU', mechanism:'JOB_TIME', semantics:'Periodic cumulative user-mode check; bounded overshoot not qualified; kernel time excluded', qualification:'FAIL'} as const),
  Object.freeze({resource:'RAM', mechanism:'JOB_MEMORY/PROCESS_MEMORY', semantics:'Committed memory limits; production composition not qualified', qualification:'NOT_RUN'} as const),
  Object.freeze({resource:'DISK', mechanism:'FILE_BROKER_BYTE_LIMIT', semantics:'Broker operation bound only; no OS disk quota', qualification:'NOT_RUN'} as const),
  Object.freeze({resource:'PROCESS', mechanism:'ACTIVE_PROCESS_LIMIT', semantics:'Concurrent Job members; no lifetime process-count budget', qualification:'NOT_RUN'} as const),
  Object.freeze({resource:'IO', mechanism:'BOUNDED_OUTPUT_STREAM', semantics:'Bounded output and backpressure; no OS disk throughput cap', qualification:'NOT_RUN'} as const),
  Object.freeze({resource:'NETWORK', mechanism:'ZERO_CAPABILITY_APPCONTAINER_CANDIDATE', semantics:'Requires distinct deployed identity and actual deny tests', qualification:'NOT_RUN'} as const),
  Object.freeze({resource:'MODEL', mechanism:'NONE', semantics:'Token/rate/cost reservation design only', qualification:'NOT_RUN'} as const),
  Object.freeze({resource:'TIME', mechanism:'SUPERVISOR_DEADLINE', semantics:'Termination request plus observed exit; no release on a timer', qualification:'NOT_RUN'} as const),
]);

/** A signed combination certificate cannot override a known failed native
 * capability in this release. Model protocol tests retain their explicit scope.
 * There is intentionally no config switch, Policy mode, or feature override.
 */
export function assertResourceExecutionQualified(assurance: Assurance): void {
  invariant(assurance === 'SIMULATED', 'M151_CPU_HARD_LIMIT_NOT_QUALIFIED');
}
