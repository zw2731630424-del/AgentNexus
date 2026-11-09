import { spawn } from 'node:child_process';
import { invariant } from '../types.ts';

const permits = new WeakSet<object>();
export const SERVICE_DATA_ROOT = 'C:\\ProgramData\\AgentNexusCredential\\engine';
export const QUALIFICATION_DATA_ROOT = 'C:\\ProgramData\\AgentNexusCredential\\qualification';
export type ServiceBoundary = Readonly<{ service_sid: string; evidence_sha256: string; policy_epoch: number; mode?: 'QUALIFIED' | 'QUALIFICATION_ONLY'; expires_at_utc?: string; real_import_enabled: boolean; live_enabled: boolean }>;
/** Only the fixed native attester can mint this process-local permit. The OS SID,
 * protected installation and signed evidence are the boundary, not this WeakSet. */
async function nativeRead(mode: '--attest-engine' | '--attest-consents', maximum: number): Promise<string> {
  invariant(process.platform === 'win32', 'CREDENTIAL_WINDOWS_REQUIRED');
  return new Promise<string>((resolve, reject) => {
    const child = spawn('C:\\Program Files\\AgentNexus\\AgentNexusCredential.exe', [mode], {
      shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows' },
    });
    let output = '', failed = false;
    const timer = setTimeout(() => { failed = true; child.kill(); }, 10000);
    child.on('error', () => { failed = true; });
    child.stdout.on('data', (b: Buffer) => { output += b.toString('utf8'); if (output.length > maximum) { failed = true; child.kill(); } });
    child.stderr.on('data', (b: Buffer) => { b.fill(0); failed = true; });
    child.on('close', code => { clearTimeout(timer); if (code === 0 && !failed) resolve(output); else reject(Error('CREDENTIAL_NATIVE_ATTESTATION_BLOCKED')); });
  });
}
export async function attestServiceBoundary(): Promise<ServiceBoundary> {
  const result = await nativeRead('--attest-engine', 4096);
  let value: any; try { value = JSON.parse(result); } catch { throw Error('CREDENTIAL_NATIVE_ATTESTATION_BLOCKED'); }
  invariant(((value.qualified === true && value.mode === 'QUALIFIED') || (value.qualified === false && value.mode === 'QUALIFICATION_ONLY' && value.real_import_enabled === false && value.live_enabled === false)) && /^S-1-5-80-(?:\d+-){4}\d+$/.test(value.service_sid) &&
    /^[a-f0-9]{64}$/.test(value.evidence_sha256) && Number.isSafeInteger(value.policy_epoch) && value.policy_epoch > 0 && Date.parse(value.expires_at_utc) > Date.now(),
  'CREDENTIAL_NATIVE_ATTESTATION_BLOCKED');
  const permit = Object.freeze({ service_sid: value.service_sid, evidence_sha256: value.evidence_sha256,
    policy_epoch: value.policy_epoch, mode: value.mode as 'QUALIFIED' | 'QUALIFICATION_ONLY', expires_at_utc: value.expires_at_utc, real_import_enabled: value.real_import_enabled === true, live_enabled: value.live_enabled === true });
  permits.add(permit); return permit;
}
export async function readApprovedConsents(boundary: ServiceBoundary): Promise<any> {
  assertServiceBoundary(boundary);
  let value: any; try { value = JSON.parse(await nativeRead('--attest-consents', 1024 * 1024)); } catch { throw Error('CREDENTIAL_CONSENT_ATTESTATION_BLOCKED'); }
  invariant(Array.isArray(value.consents) && value.consents.length <= 64, 'CREDENTIAL_CONSENT_ATTESTATION_BLOCKED');
  if (value.consents.length) invariant(Date.parse(value.expires_at_utc) > Date.now() && /^APPROVED-/.test(value.external_user_review_ref), 'CREDENTIAL_CONSENT_ATTESTATION_BLOCKED');
  return value;
}
export function assertServiceBoundary(value: unknown): asserts value is ServiceBoundary {
  invariant(!!value && typeof value === 'object' && permits.has(value as object), 'CREDENTIAL_SERVICE_BOUNDARY_REQUIRED');
}
