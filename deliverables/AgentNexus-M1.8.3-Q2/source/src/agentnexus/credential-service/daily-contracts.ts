import type { BrokerBinding } from './contracts.ts';

/** This is a description of service-held authority, never a bearer credential.
 * Actual runtime/channel authority must originate outside caller-controlled JSON. */
export type DailyGrant = Readonly<{
  schema: 'agentnexus.daily-grant.v1';
  grant_id: string; service_instance: string; runtime_identity: string;
  channel_binding: string; subject_hash: string; input_hash: string;
  token_budget: { input_limit: number; output_limit: number; total: number };
  binding: BrokerBinding;
}>;
export type DailyReservation = Readonly<{
  grant: DailyGrant; grant_hash: string;
  service_instance: string; runtime_identity: string; channel_binding: string;
}>;
export const DAILY_METHODS = Object.freeze(['snapshot', 'daily.prepare', 'daily.execute', 'request.cancel', 'stream.ack']);
export const DAILY_QUALIFICATION = Object.freeze({
  status: 'BLOCKED' as const,
  reason: 'DAILY_NATIVE_RUNTIME_AUTHENTICATION_NOT_IMPLEMENTED',
  medium_listener_created: false,
  uac_required: false,
  synthetic_protocol_available: true,
});
