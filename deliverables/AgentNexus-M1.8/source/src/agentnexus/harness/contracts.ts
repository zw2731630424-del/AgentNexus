import { boundedJson, freezeJson, invariant, validateIdentity } from '../types.ts';
import type { Identity, Json } from '../types.ts';

export type AgentType = 'RESIDENT' | 'DEVELOPMENT' | 'SUBAGENT' | 'BACKGROUND_REVIEWER' | 'COORDINATOR';
export type Subject = Identity & {
  runtime_instance_id: string; agent_type: AgentType; model_binding: string;
  resource_budget_id: string; policy_scope: string;
};
export const AGENT_TYPES = Object.freeze({
  RESIDENT: { feature: 'runtime.role.resident', model_strategy: 'EVENT_DRIVEN', read_only: true, project_decisions: false },
  DEVELOPMENT: { feature: 'runtime.role.lead', model_strategy: 'HIGH_CAPABILITY', read_only: false, project_decisions: true },
  SUBAGENT: { feature: 'runtime.role.subagent', model_strategy: 'LOW_COST', read_only: false, project_decisions: false },
  BACKGROUND_REVIEWER: { feature: 'runtime.role.reviewer', model_strategy: 'REASONING', read_only: true, project_decisions: false },
  COORDINATOR: { feature: 'runtime.role.coordinator', model_strategy: 'LOW_COST', read_only: true, project_decisions: false },
});
export function identifier(value: unknown): asserts value is string {
  invariant(typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value), 'NATIVE_INVALID_ID');
}
export function subject(value: Subject): void {
  validateIdentity(value);
  for (const key of ['runtime_instance_id','model_binding','resource_budget_id','policy_scope'] as const) identifier(value[key]);
  invariant(Object.hasOwn(AGENT_TYPES, value.agent_type), 'NATIVE_AGENT_TYPE');
}
export function snapshot<T>(value: T, bytes = 49152): T {
  return freezeJson(JSON.parse(boundedJson(value, bytes)) as Json) as T;
}
export function hostSubject(boot: string): Subject {
  return Object.freeze({ agent_id: 'host-admin', project_id: 'host', task_id: 'administration', session_id: 'host-control',
    runtime_instance_id: boot, agent_type: 'COORDINATOR', model_binding: 'mock', resource_budget_id: 'platform', policy_scope: 'host' });
}
export function identityOf(actor: Subject): Identity {
  return { agent_id: actor.agent_id, project_id: actor.project_id, task_id: actor.task_id, session_id: actor.session_id };
}
export type Lifecycle = 'CREATED' | 'INITIALIZING' | 'READY' | 'RUNNING' | 'WAITING' | 'RESUMING' | 'STOPPING' | 'STOPPED' | 'FAILED' | 'UNKNOWN_QUARANTINED';
export type TaskState = 'QUEUED' | 'WAITING_RESOURCES' | 'DISPATCHING' | 'RUNNING' | 'WAITING' | 'PAUSED' | 'STOPPING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT' | 'UNKNOWN_QUARANTINED';
