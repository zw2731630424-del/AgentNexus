import { canonical, invariant } from '../types.ts';

export type SecurityMode = 'LOCAL_DEVELOPMENT_MODE' | 'HARDENED_DEPLOYMENT_MODE';
export type Enforcement = 'OFF' | 'ADVISORY' | 'ENFORCED';
export type FeatureStatus = 'ENABLED' | 'DISABLED' | 'BLOCKED' | 'NOT_AVAILABLE' | 'NOT_QUALIFIED';
export type Verification = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN' | 'SIMULATED' | 'INCONCLUSIVE';
export type Classification = 'PUBLIC' | 'SYNTHETIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SECRET';
type Definition = { id: string; group: string; name: string; dependencies: string[]; local: boolean; hardened: boolean; implementation: 'ACTIVE' | 'QUALIFIED' | 'UNAVAILABLE'; restart?: boolean; fixed?: boolean; reason?: string };
const feature = (id: string, group: string, name: string, local: boolean, hardened: boolean, dependencies: string[] = [], implementation: Definition['implementation'] = 'ACTIVE', extra: Partial<Definition> = {}): Definition => ({ id, group, name, dependencies, local, hardened, implementation, ...extra });
export const SECURITY_FEATURES: readonly Definition[] = Object.freeze([
  feature('credentials.osStorage', 'Credential Security', 'OS Credential Storage', true, false, [], 'ACTIVE', { restart: true }),
  feature('credentials.isolatedService', 'Credential Security', 'Isolated Credential Service', false, true, [], 'QUALIFIED', { restart: true }),
  feature('credentials.helper', 'Credential Security', 'Trusted Credential Helper', false, true, ['credentials.isolatedService'], 'QUALIFIED', { restart: true }),
  feature('credentials.accessRestriction', 'Credential Security', 'Host Credential Capability Boundary', true, true, [], 'ACTIVE', { fixed: true, reason: 'Host-only capability; does not claim same-SID isolation' }),
  feature('credentials.secretRedaction', 'Credential Security', 'Known Secret Leak Prevention', true, true, [], 'ACTIVE', { fixed: true, reason: 'Keys must never enter prompts, archives or logs' }),
  feature('credentials.audit', 'Credential Security', 'Credential Operation Audit', true, true),
  feature('policy.engine', 'Policy Security', 'Policy Engine', true, true),
  feature('policy.enforcement', 'Policy Security', 'Policy Enforcement', true, true, ['policy.engine']),
  feature('policy.defaultDeny', 'Policy Security', 'Default Deny for Unmatched Rules', true, true, ['policy.engine']),
  feature('policy.toolPermission', 'Policy Security', 'Tool Capability / Permission Check', true, true, [], 'ACTIVE', { fixed: true }),
  feature('policy.resourceAuthorization', 'Policy Security', 'Exact Resource Authorization', true, true, [], 'ACTIVE', { fixed: true }),
  feature('policy.approval', 'Policy Security', 'Local File Write Approval', true, true),
  feature('data.classification', 'Data Security', 'Host Data Classification', true, true),
  feature('data.egress', 'Data Security', 'Data Egress Enforcement', true, true, ['data.classification']),
  feature('data.secretScanning', 'Data Security', 'Generic Secret Pattern Scan', true, true),
  feature('data.provenance', 'Data Security', 'Context Provenance', true, true, [], 'ACTIVE', { fixed: true }),
  feature('data.fileAccess', 'Data Security', 'File Access Control', true, true, [], 'ACTIVE', { fixed: true }),
  feature('execution.sandbox', 'Execution Security', 'Sandbox', false, true, ['deployment.runtimeIsolation'], 'QUALIFIED', { restart: true }),
  feature('execution.restrictedProcess', 'Execution Security', 'Restricted Process', false, true, ['deployment.osQualification'], 'QUALIFIED', { restart: true }),
  feature('execution.commandValidation', 'Execution Security', 'Registered Tool Command Validation', true, true),
  feature('execution.shellApproval', 'Execution Security', 'Shell Approval', false, true, ['execution.sandbox'], 'UNAVAILABLE', { reason: 'Arbitrary shell remains unavailable; no new execution backend' }),
  feature('execution.fileWriteApproval', 'Execution Security', 'File Write Approval', true, true, ['policy.approval']),
  feature('execution.networkRestriction', 'Execution Security', 'Provider Endpoint Restriction', true, true),
  feature('execution.resourceLimits', 'Execution Security', 'OS Resource Limits', false, true, ['deployment.osQualification'], 'QUALIFIED'),
  feature('audit.commands', 'Audit Security', 'Additional Command Audit', true, true),
  feature('audit.tools', 'Audit Security', 'Additional Tool Audit', true, true),
  feature('audit.files', 'Audit Security', 'Additional File Modification Audit', true, true),
  feature('audit.providers', 'Audit Security', 'Additional Provider Request Audit', true, true),
  feature('audit.messages', 'Audit Security', 'Additional Agent Message Audit', true, true),
  feature('audit.policy', 'Audit Security', 'Additional Policy Decision Audit', true, true),
  feature('deployment.credentialService', 'Deployment Security', 'Credential Service Deployment', false, true, ['credentials.isolatedService'], 'QUALIFIED', { restart: true }),
  feature('deployment.tpmCng', 'Deployment Security', 'TPM / CNG Signing Key', false, false, [], 'QUALIFIED', { restart: true }),
  feature('deployment.signer', 'Deployment Security', 'Qualification Signer', false, false, [], 'QUALIFIED', { restart: true }),
  feature('deployment.cmsQualification', 'Deployment Security', 'CMS Qualification Signature', false, false, ['deployment.signer'], 'QUALIFIED', { restart: true }),
  feature('deployment.cmsApproval', 'Deployment Security', 'CMS Deployment Approval', false, false, ['deployment.signer'], 'QUALIFIED', { restart: true }),
  feature('deployment.osQualification', 'Deployment Security', 'OS Identity Qualification', false, true, [], 'QUALIFIED', { restart: true }),
  feature('deployment.runtimeIsolation', 'Deployment Security', 'Trusted Runtime / Daily IPC Isolation', false, true, ['credentials.isolatedService', 'deployment.osQualification'], 'QUALIFIED', { restart: true }),
  ...['global', 'project', 'agent', 'task', 'provider', 'keyPool', 'cost', 'rate'].map(id => feature('budget.' + id, 'Budget Controls', id + ' Budget Enforcement', true, true)),
  feature('budget.costDisplay', 'Budget Controls', 'Cost Display', true, true),
]);
export type SecurityProfile = {
  version: 1; mode: SecurityMode; features: Record<string, boolean>;
  policy: { enforcement: Enforcement; advisoryConfirmation: boolean };
  dataEgress: { enforcement: Enforcement; classification: Classification; defaultDecision: 'ALLOW' | 'DENY'; scopes: { scope: 'PROVIDER' | 'PROJECT' | 'AGENT'; id: string; classification: Classification; decision: 'ALLOW' | 'DENY' | 'APPROVAL' }[] };
  budgets: { globalTokens: number; projectTokens: number; providerTokens: number; keyPoolTokens: number; costMicros: number; requestsPerMinute: number };
};
export const CLASSIFICATIONS: Classification[] = ['PUBLIC', 'SYNTHETIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET'];
export function defaultProfile(mode: SecurityMode = 'LOCAL_DEVELOPMENT_MODE'): SecurityProfile {
  invariant(['LOCAL_DEVELOPMENT_MODE', 'HARDENED_DEPLOYMENT_MODE'].includes(mode), 'SECURITY_MODE');
  return { version: 1, mode, features: Object.fromEntries(SECURITY_FEATURES.map(d => [d.id, mode === 'LOCAL_DEVELOPMENT_MODE' ? d.local : d.hardened])), policy: { enforcement: 'ENFORCED', advisoryConfirmation: false },
    dataEgress: { enforcement: 'ENFORCED', classification: 'INTERNAL', defaultDecision: 'DENY', scopes: [] },
    budgets: { globalTokens: 100000000, projectTokens: 100000000, providerTokens: 100000000, keyPoolTokens: 100000000, costMicros: 1000000000, requestsPerMinute: 120 } };
}
function fields(value: any, keys: string[]) { invariant(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'SECURITY_SCHEMA'); }
export function validateProfile(value: unknown): SecurityProfile {
  invariant(Buffer.byteLength(canonical(value)) <= 65536, 'SECURITY_PROFILE_SIZE');
  const p = JSON.parse(canonical(value)) as SecurityProfile;
  fields(p, ['version', 'mode', 'features', 'policy', 'dataEgress', 'budgets']);
  invariant(p.version === 1 && ['LOCAL_DEVELOPMENT_MODE', 'HARDENED_DEPLOYMENT_MODE'].includes(p.mode), 'SECURITY_VERSION_OR_MODE');
  fields(p.features, SECURITY_FEATURES.map(d => d.id));
  for (const d of SECURITY_FEATURES) { invariant(typeof p.features[d.id] === 'boolean', 'SECURITY_FEATURE_VALUE'); invariant(!d.fixed || p.features[d.id], 'SECURITY_FIXED_BOUNDARY'); }
  fields(p.policy, ['enforcement', 'advisoryConfirmation']);
  invariant(['OFF', 'ADVISORY', 'ENFORCED'].includes(p.policy.enforcement) && typeof p.policy.advisoryConfirmation === 'boolean', 'SECURITY_POLICY');
  invariant(p.features['policy.enforcement'] === (p.policy.enforcement !== 'OFF') && (p.policy.enforcement === 'OFF' || p.features['policy.engine']), 'SECURITY_POLICY_DEPENDENCY');
  invariant(p.features['execution.fileWriteApproval'] === p.features['policy.approval'], 'SECURITY_APPROVAL_DEPENDENCY');
  fields(p.dataEgress, ['enforcement', 'classification', 'defaultDecision', 'scopes']);
  invariant(['OFF', 'ADVISORY', 'ENFORCED'].includes(p.dataEgress.enforcement) && CLASSIFICATIONS.includes(p.dataEgress.classification) && ['ALLOW', 'DENY'].includes(p.dataEgress.defaultDecision), 'SECURITY_EGRESS');
  invariant(p.features['data.egress'] === (p.dataEgress.enforcement !== 'OFF'), 'SECURITY_EGRESS_DEPENDENCY');
  invariant(!p.features['data.egress'] || p.features['data.classification'], 'SECURITY_EGRESS_DEPENDENCY');
  invariant(Array.isArray(p.dataEgress.scopes) && p.dataEgress.scopes.length <= 128, 'SECURITY_EGRESS_SCOPES');
  const seen = new Set<string>();
  for (const s of p.dataEgress.scopes) { fields(s, ['scope', 'id', 'classification', 'decision']); invariant(['PROVIDER', 'PROJECT', 'AGENT'].includes(s.scope) && /^[A-Za-z0-9_.:-]{1,128}$/.test(s.id) && CLASSIFICATIONS.includes(s.classification) && ['ALLOW', 'DENY', 'APPROVAL'].includes(s.decision), 'SECURITY_EGRESS_SCOPE'); const id = s.scope + ':' + s.id; invariant(!seen.has(id), 'SECURITY_DUPLICATE_SCOPE'); seen.add(id); }
  fields(p.budgets, ['globalTokens', 'projectTokens', 'providerTokens', 'keyPoolTokens', 'costMicros', 'requestsPerMinute']);
  for (const [key, n] of Object.entries(p.budgets)) invariant(Number.isSafeInteger(n) && n > 0 && n <= (key.endsWith('Tokens') ? 100000000 : Number.MAX_SAFE_INTEGER), 'SECURITY_BUDGET');
  invariant(p.budgets.requestsPerMinute<=1000000, 'SECURITY_RATE_LIMIT');
  if (p.mode === 'HARDENED_DEPLOYMENT_MODE') {
    invariant(p.features['credentials.isolatedService'] && !p.features['credentials.osStorage'] && p.policy.enforcement === 'ENFORCED' && p.dataEgress.enforcement === 'ENFORCED', 'SECURITY_HARDENED_NO_DOWNGRADE');
    for (const id of ['deployment.osQualification', 'deployment.runtimeIsolation', 'policy.defaultDeny', 'policy.approval', 'audit.commands', 'audit.tools', 'audit.providers', 'audit.policy']) invariant(p.features[id], 'SECURITY_HARDENED_REQUIRED');
  }
  invariant(!(p.features['credentials.osStorage'] && p.features['credentials.isolatedService']), 'SECURITY_CREDENTIAL_BACKEND_CONFLICT');
  return p;
}
/** Explicit migration only. Never touches a ledger, key, policy file or deployment record. */
export function migrateProfile(value: unknown): { profile: SecurityProfile; from: number } {
  const v = value as any;
  if (v?.version === 1) return { profile: validateProfile(v), from: 1 };
  fields(v, ['version', 'mode']); invariant(v.version === 0, 'SECURITY_MIGRATION_UNSUPPORTED');
  return { profile: validateProfile(defaultProfile(v.mode)), from: 0 };
}
export type Environment = { osStorage: boolean; storageAssurance: 'REAL' | 'SIMULATED' | 'NOT_RUN'; service: boolean; qualified: readonly string[] };
export type SecurityFeatureState = { id: string; group: string; name: string; desired: boolean; status: FeatureStatus; verification: Verification; reason: string; dependencies: string[]; toggleable: boolean; restart: boolean };
export function resolveFeatures(profile: SecurityProfile, env: Environment): SecurityFeatureState[] {
  const resolved = new Map<string, SecurityFeatureState>();
  function resolve(d: Definition): SecurityFeatureState {
    if (resolved.has(d.id)) return resolved.get(d.id)!;
    let status: FeatureStatus = !profile.features[d.id] ? 'DISABLED' : 'ENABLED', verification: Verification = 'NOT_RUN', reason = d.reason ?? 'HOST_RUNTIME_INTEGRATED';
    if (status === 'ENABLED') {
      if (d.implementation === 'UNAVAILABLE') status = 'NOT_AVAILABLE';
      else if (d.id === 'credentials.osStorage' && !env.osStorage) { status = 'NOT_AVAILABLE'; reason = 'PLATFORM_CREDENTIAL_ADAPTER_UNAVAILABLE'; }
      else if (d.id === 'credentials.osStorage' && env.storageAssurance === 'SIMULATED') { status = 'BLOCKED'; verification = 'SIMULATED'; reason = 'SIMULATED_STORAGE_IS_NOT_OS_PROTECTION'; }
      else if (d.implementation === 'QUALIFIED' && !env.qualified.includes(d.id)) { status = d.id === 'credentials.isolatedService' && !env.service ? 'BLOCKED' : 'NOT_QUALIFIED'; reason = 'REAL_QUALIFICATION_NOT_ESTABLISHED'; }
      if (d.id === 'credentials.secretRedaction' && resolve(SECURITY_FEATURES.find(f=>f.id==='credentials.osStorage')!).status !== 'ENABLED' && resolve(SECURITY_FEATURES.find(f=>f.id==='credentials.isolatedService')!).status !== 'ENABLED') { status='BLOCKED';reason='CREDENTIAL_GUARD_UNAVAILABLE_METADATA_WRITES_BLOCKED'; }
      if (status === 'ENABLED' && d.dependencies.some(id => resolve(SECURITY_FEATURES.find(f => f.id === id)!).status !== 'ENABLED')) { status = 'BLOCKED'; reason = 'DEPENDENCY_NOT_ENABLED'; }
    }
    // An unbound remote owner cannot acknowledge either enable or disable.
    if (profile.mode === 'HARDENED_DEPLOYMENT_MODE' && d.group === 'Budget Controls') { status='BLOCKED';reason='REMOTE_PROFILE_BUDGET_BINDING_NOT_AVAILABLE'; }
    if (d.id === 'credentials.osStorage' && status === 'ENABLED') verification = env.storageAssurance === 'SIMULATED' ? 'SIMULATED' : 'NOT_RUN';
    const r:SecurityFeatureState = { id: d.id, name: d.name, group: d.group, desired: profile.features[d.id], status, verification, reason, dependencies: [...d.dependencies], toggleable: !d.fixed, restart: !!d.restart }; resolved.set(d.id, r); return r;
  }
  return SECURITY_FEATURES.map(resolve);
}
