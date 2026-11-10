import { invariant } from '../types.ts';
import { snapshot } from '../harness/contracts.ts';
import type { Subject } from '../harness/contracts.ts';

export const RESOURCE_KEYS = Object.freeze(['cpu_user_us','cpu_kernel_us','memory_bytes','disk_bytes','processes','io_read_bytes','io_write_bytes','log_bytes','network_connections','network_bytes','model_tokens','model_requests','model_cost_micros','wall_ms','workers'] as const);
export type ResourceKey = typeof RESOURCE_KEYS[number];
export type ResourceVector = Record<ResourceKey, number>;
export type ResourceAmounts = Partial<ResourceVector>;
export const CAPACITY_KEYS: readonly ResourceKey[] = Object.freeze(['memory_bytes','disk_bytes','processes','network_connections','workers']);
export const RESOURCE_LIMITS = Object.freeze({budgets:256,reservations:4096,waiting:64,closures:4096,page:32});
export type ResourceScope = 'WORKER'|'PROJECT'|'PLATFORM';
export type Budget = {id:string;revision:number;scope:ResourceScope;owner_id:string;limits:ResourceVector;held:ResourceVector;spent:ResourceVector;state:'OPEN'|'OVERDRAWN'};
export type BudgetInput = {id:string;scope:ResourceScope;owner_id:string;limits:ResourceAmounts};
export type BudgetIds = {worker:string;project:string;platform:string};
export type ReservationState = 'RESERVED'|'WAITING'|'REJECTED'|'ACTIVE'|'UNKNOWN_QUARANTINED'|'RELEASED';
export type ResourceMode = 'SIMULATED'|'APPLICATION_BOUND'|'STRICT_OS';
export type ReserveInput = {id:string;worker_budget_id:string;project_budget_id:string;platform_budget_id:string;amounts:ResourceAmounts;mode:ResourceMode;operation_id:string;wait:boolean;expires_at:number};
export type Reservation = {id:string;revision:number;state:ReservationState;subject:Subject;operation_id:string;boot_id:string;mode:ResourceMode;budget_ids:BudgetIds;amounts:ResourceVector;accounted:ResourceVector;sequence:number;expires_at:number;reason:string|null;last_evidence_hash:string|null;accounting_complete:boolean;accounting_source:Accounting['source']|null};
/** Values are cumulative per reservation, including capacity high-water marks. */
export type Accounting = {sequence:number;source:'SIMULATED'|'TRUSTED_APPLICATION'|'WINDOWS_JOB'|'LINUX_CGROUP';evidence_hash:string;values:ResourceAmounts;complete:boolean};
export type ClosureKind = 'NEVER_STARTED'|'SIMULATED_SETTLED';
export type Closure = {id:string;revision:number;reservation_id:string;reservation_revision:number;operation_id:string;boot_id:string;kind:ClosureKind;state:'ISSUED'|'CONSUMED'};

export function vector(input:ResourceAmounts = {}):ResourceVector {
  invariant(input !== null && typeof input === 'object' && !Array.isArray(input) && Object.keys(input).every(k=>RESOURCE_KEYS.includes(k as ResourceKey)), 'RESOURCE_VECTOR');
  const out = {} as ResourceVector;
  for (const key of RESOURCE_KEYS) { const value=Object.hasOwn(input,key)?input[key]:0; invariant(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0,'RESOURCE_AMOUNT'); out[key]=value; }
  return snapshot(out);
}
export function add(a:number,b:number):number { const n=a+b; invariant(Number.isSafeInteger(n)&&n>=0,'RESOURCE_ACCOUNTING_OVERFLOW'); return n; }
export function heldFor(r:Reservation,key:ResourceKey):number { return CAPACITY_KEYS.includes(key)?r.amounts[key]:Math.max(0,r.amounts[key]-r.accounted[key]); }
