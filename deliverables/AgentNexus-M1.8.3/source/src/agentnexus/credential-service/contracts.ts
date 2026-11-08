import type { Subject } from '../harness/contracts.ts';
import type { AssembledContext } from '../harness/context.ts';
import type { HttpEnvelope, ModelSpec, ProviderResponse, DataGuard, Assurance } from '../model-runtime/protocol.ts';
import type { CredentialInfo } from '../model-runtime/vault.ts';

export type ServiceKey = Omit<CredentialInfo, 'classification'> & {
  classification: 'SYNTHETIC' | 'SECRET'; name: string; notes: string; created_at: string;
  tokens: number; requests: number; errors: number; health: string;
};
export type BrokerInput = {
  subject: Subject; request: HttpEnvelope; model: ModelSpec; context: AssembledContext;
  context_hash: string; input_tokens: number; output_tokens: number;
};
export type BrokerResult = {
  response: ProviderResponse; key_handle_id: string; cost_micros: number;
  reservation_id: string; assurance: Assurance;
};
export type BrokerBinding = {
  request_id: string; operation_id: string; agent_id: string; runtime_identity: string;
  task_id: string; project_id: string; provider_id: string; model_id: string;
  credential_handle_id: string | null; request_body_hash: string; context_hash: string;
  data_egress_decision: string; data_classification: 'PUBLIC' | 'SYNTHETIC';
  token_reservation_id: string; deadline: number; nonce: string; policy_epoch: number;
};
export type ServiceSnapshot = {
  qualification: { live: 'BLOCKED' | 'QUALIFIED'; credential_service: 'BLOCKED' | 'QUALIFIED'; real_key_entry: boolean; synthetic_key_entry?: boolean; mode: Assurance; reason: string };
  keys: ServiceKey[]; usage: any; policy_epoch: number; service_instance: string;
};
/** This port has no decrypt, export, arbitrary URL, or callback-with-secret method. */
export interface CredentialServicePort {
  readonly assurance: Assurance;
  readonly guard: DataGuard;
  invoke(method: string, params?: unknown): Promise<any>;
  snapshot(): Promise<ServiceSnapshot>;
  execute(input: BrokerInput, signal?: AbortSignal, onDelta?: (text: string) => Promise<void>): Promise<BrokerResult>;
  close(): Promise<void>;
}
