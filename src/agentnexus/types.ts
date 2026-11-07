import { createHash, randomUUID } from 'node:crypto';

// Independently authored M1 contracts. Trusted library, not an OS authentication boundary.
export type Status = 'PASS' | 'FAIL' | 'NOT_RUN' | 'INCONCLUSIVE' | 'BLOCKED' | 'BYPASSED';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Identity = { agent_id: string; project_id: string; task_id: string; session_id: string };
export type Scope = { project_id?: string; agent_id?: string; task_id?: string };
export type Domain = 'audit' | 'context' | 'decision';
export type ArtifactRef = {
  artifact_id: string; sha256: string; bytes: number; codec: 'zstd';
  stored_sha256: string; stored_bytes: number; media_type: string; sensitivity: 'NORMAL';
};
export type AuditInput = Identity & {
  operation_id: string; event_id: string; operation_type: string; phase: string;
  observed_at: string; cwd: string | null;
  parameters: Json; parameters_ref: ArtifactRef | null;
  before_state_ref: ArtifactRef | null; policy_decision_ref: string | null;
  authorization_ref: string | null; execution_status: string; exit_code: number | null;
  stdout_ref: ArtifactRef | null; stderr_ref: ArtifactRef | null;
  after_state_ref: ArtifactRef | null; artifact_refs: ArtifactRef[];
  context_event_refs: string[]; decision_refs: string[];
  applicability: Json; detail: Json;
};
export type ContextInput = Identity & {
  event_id: string; operation_id: string; observed_at: string; kind: string;
  payload_ref: ArtifactRef; audit_event_refs: string[];
};
export type DecisionInput = Identity & {
  event_id: string; operation_id: string; observed_at: string; decision_id: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'SUPERSEDED' | 'REJECTED';
  authority_ref: string; supersedes: string | null; evidence_refs: ArtifactRef[]; decision: Json;
};
export type StoredRecord = {
  seq: number; domain: Domain; event_id: string; operation_id: string;
  project_id: string; task_id: string; previous_hash: string; hash: string; body: Json;
};
export type QueryOptions = { task_id?: string; project_id?: string; agent_id?: string; session_id?: string; after?: number; limit?: number };

export class NexusError extends Error {
  code: string;
  constructor(code: string, message = code) { super(message); this.name = 'NexusError'; this.code = code; }
}
export function invariant(ok: unknown, code: string, message = code): asserts ok {
  if (!ok) throw new NexusError(code, message);
}
export function canonical(value: unknown): string {
  const seen = new Set<object>();
  function normalize(v: unknown, depth: number): Json {
    invariant(depth <= 64, 'JSON_DEPTH');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') { invariant(Number.isFinite(v), 'JSON_NUMBER'); return v; }
    invariant(typeof v === 'object' && v !== null, 'JSON_TYPE');
    invariant(!seen.has(v), 'JSON_CYCLE'); seen.add(v);
    let out: Json;
    if (Array.isArray(v)) out = v.map(x => normalize(x, depth + 1));
    else {
      invariant(Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null, 'JSON_PROTOTYPE');
      const result: { [key: string]: Json } = Object.create(null);
      const properties = Object.getOwnPropertyDescriptors(v);
      for (const k of Object.keys(properties).sort()) {
        const d = properties[k]; invariant('value' in d && d.enumerable, 'JSON_ACCESSOR');
        result[k] = normalize(d.value, depth + 1);
      }
      out = result;
    }
    seen.delete(v); return out;
  }
  return JSON.stringify(normalize(value, 0));
}
export function boundedJson(value: unknown, maxBytes = 65536): string {
  const body = canonical(value); invariant(Buffer.byteLength(body) <= maxBytes, 'FRAME_TOO_LARGE'); return body;
}
export function freezeJson<T extends Json>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeJson(child);
    Object.freeze(value);
  }
  return value;
}
export function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
export function uid(): string { return randomUUID(); }
export function now(): string { return new Date().toISOString(); }
export function validateIdentity(identity: Identity): void {
  for (const k of ['agent_id', 'project_id', 'task_id', 'session_id'] as const)
    invariant(typeof identity[k] === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(identity[k]), 'INVALID_IDENTITY');
}
export function auditEvent(identity: Identity, data: Partial<AuditInput> & { operation_type: string; phase: string }): AuditInput {
  validateIdentity(identity);
  return {
    ...identity, operation_id: uid(), event_id: uid(), operation_type: data.operation_type, phase: data.phase,
    observed_at: now(), cwd: null, parameters: null, parameters_ref: null, before_state_ref: null,
    policy_decision_ref: null, authorization_ref: null, execution_status: 'NOT_STARTED', exit_code: null,
    stdout_ref: null, stderr_ref: null, after_state_ref: null, artifact_refs: [], context_event_refs: [], decision_refs: [],
    applicability: { nullable_fields: 'not applicable at this phase; terminal event supplies actual result or explicit uncertainty' },
    detail: null, ...data,
    // Never take identity from data supplied to this helper.
    ...identity,
  };
}

export type FeatureDefinition = {
  id: string; kind: 'CORE' | 'OPTIONAL' | 'MODE'; default: 'ON' | 'OFF'; scopes: string[];
  depends_on: string[]; conflicts: string[]; config_schema?: Json;
};
export type FeatureResolution = {
  id: string; desired: 'ON' | 'OFF'; effective: 'ON' | 'OFF' | 'BLOCKED';
  reason: string; revision: number; epoch: number; health: string;
};
export type PolicyDefinition = {
  id: string; level: 'L0' | 'L1' | 'L2' | 'L3'; degradable: boolean;
  enforcement_owner: string; modes: Record<string, string>;
};
export type Dimension = { status: Status; reason: string; coverage: string; applicable: boolean };
export type DiagnosticRequest = {
  language: string; source: string; document_uri: string; version: number; dialect?: string;
};
export type Diagnostic = {
  code: string; severity: 'error' | 'warning' | 'information'; message: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } } | null;
};
export type ValidationResult = {
  request_id: string; uri: string; version: number; source_sha256: string;
  checker_id: string; checker_version: string; feature_epoch: number; config_revision: number;
  dimensions: Record<'syntax' | 'args' | 'environment' | 'safety' | 'authorization', Dimension>;
  status: Status; reason: string; diagnostics: Diagnostic[]; evidence_refs: ArtifactRef[];
  timing: { started_at: string; elapsed_ms: number };
};
