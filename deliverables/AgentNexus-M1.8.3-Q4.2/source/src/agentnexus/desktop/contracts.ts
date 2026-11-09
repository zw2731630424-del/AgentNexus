export type Protocol = 'openai-compatible' | 'anthropic-compatible' | 'google-native';
export type ConnectionStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'REVOKED' | 'INVALID_KEY' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'PROVIDER_UNAVAILABLE' | 'INVALID_ENDPOINT' | 'MODEL_UNAVAILABLE' | 'TIMEOUT' | 'INCONCLUSIVE' | 'NOT_TESTED' | 'BLOCKED' | 'NOT_CONFIGURED' | 'CREDENTIAL_SAVED' | 'PROVIDER_CONNECTED' | 'SERVICE_UNAVAILABLE' | 'IPC_BLOCKED' | 'DATA_EGRESS_BLOCKED' | 'BUDGET_EXCEEDED';
export type ProviderPreset = { id: string; name: string; monogram: string; color: string; protocol: Protocol; base_url: string; source: string; models?: { model_id: string; name: string; source: string }[] };
export type ProviderConfig = { revision: number; id: string; name: string; preset_id: string; protocol: Protocol; base_url: string; enabled: boolean; default_model: string | null; state: 'ACTIVE' | 'DELETED' };
export type ModelConfig = { revision: number; id: string; provider_id: string; model_id: string; name: string; enabled: boolean; context_tokens: number; output_tokens: number; capabilities: { reasoning: boolean; tools: boolean; json: boolean; streaming: boolean; multimodal: boolean }; origin: 'MANUAL' | 'OFFICIAL_CATALOG' | 'PROVIDER_RETURNED'; source: string; verified: 'NOT_TESTED' | 'SIMULATED' | 'VERIFIED'; state: 'ACTIVE' | 'DELETED' };
export type Binding = { revision: number; id: string; primary: string | null; fallbacks: string[]; auto_route: boolean; failover: boolean; budget_tokens: number; state: 'ACTIVE' };
export type Connection = { revision: number; id: string; status: ConnectionStatus; reason: string; tested_at: string; assurance: 'SIMULATED' | 'REAL'; request_id: string | null; simulation_passed: boolean; state: 'ACTIVE' };
export const METHODS = ['snapshot', 'provider.save', 'provider.delete', 'model.save', 'model.delete', 'model.default', 'credential.entry', 'credential.save', 'credential.state', 'credential.delete', 'connection.test', 'binding.save', 'selection.save', 'preference.save', 'chat.send'] as const;
export type DesktopMethod = typeof METHODS[number];
export class DesktopError extends Error { readonly code: string; constructor(code: string) { super(code); this.code = code; this.name = 'DesktopError'; } }
export function requireThat(value: unknown, code = 'INVALID_INPUT'): asserts value { if (!value) throw new DesktopError(code); }
export function object(value: unknown, keys: string[], required = keys): asserts value is Record<string, any> { requireThat(!!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => keys.includes(k)) && required.every(k => Object.hasOwn(value, k))); }
export function textValue(value: unknown, max = 128): asserts value is string { requireThat(typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\x00-\x1f]/.test(value)); }
export function idValue(value: unknown): asserts value is string { requireThat(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/.test(value)); }
export function integer(value: unknown, max: number, min = 0): asserts value is number { requireThat(Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max); }
export function bool(value: unknown): asserts value is boolean { requireThat(typeof value === 'boolean'); }
export function endpoint(base: string): string {
  try { const u = new URL(base); requireThat(u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && !u.port && !/\s/.test(base) && !/\/chat\/completions\/?$/.test(u.pathname), 'INVALID_ENDPOINT'); return u.href.replace(/\/$/, '') + '/chat/completions'; }
  catch { throw new DesktopError('INVALID_ENDPOINT'); }
}
export function connectionStatus(input: { status?: number; timeout?: boolean; complete?: boolean; reason?: string }): ConnectionStatus {
  if (input.timeout) return 'TIMEOUT';
  if (input.status === 401) return 'INVALID_KEY';
  if (input.status === 403) return 'UNAUTHORIZED';
  if (input.status === 429) return 'RATE_LIMITED';
  if (input.status === 404 || input.status === 422) return 'MODEL_UNAVAILABLE';
  if ((input.status ?? 0) >= 500) return 'PROVIDER_UNAVAILABLE';
  if (input.reason === 'INVALID_ENDPOINT') return 'INVALID_ENDPOINT';
  return input.status === 200 && input.complete === true ? 'CONNECTED' : 'INCONCLUSIVE';
}
