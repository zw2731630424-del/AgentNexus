// Independent offline review probes. No native credential protection is simulated as evidence.
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
const evidence = dirname(fileURLToPath(import.meta.url));
const source = new URL('../../../../deliverables/AgentNexus-M2.0/source/', import.meta.url);
const { openDesktopService } = await import(new URL('src/agentnexus/desktop/service.ts', source));
const { CredentialVault, SyntheticMemoryProtector, createVaultAdminCapability } = await import(new URL('src/agentnexus/model-runtime/vault.ts', source));
const { FixtureTransport, wireFixture } = await import(new URL('src/agentnexus/model-runtime/transport.ts', source));
const { SecurityController } = await import(new URL('src/agentnexus/security/controller.ts', source));
const { LocalDevelopmentHttpsTransport } = await import(new URL('src/agentnexus/security/local-transport.ts', source));
const findings = [];

// The import must inspect a newly submitted secret before its first import audit.
{
  const root = await mkdtemp(join(evidence, 'pending-secret-recheck-'));
  const protector = new SyntheticMemoryProtector();
  const service = await openDesktopService(root, { protector, syntheticCredentialFixture: true, syntheticTransport: new FixtureTransport(() => wireFixture(JSON.stringify({ kind: 'FINAL', text: 'OK' }))) });
  const op = service.openOperator(), secret = 'synthetic-test-review-pending-secret-abcdef';
  let saveError;
  try {
    await op.invoke('provider.save', { id: secret, name: 'Synthetic provider', preset_id: 'custom', protocol: 'openai-compatible', base_url: 'https://synthetic.invalid/v1', enabled: true, revision: -1 });
    await op.invoke('model.save', { provider_id: secret, model_id: 'review-model', name: 'Review model', enabled: true, context_tokens: 65536, output_tokens: 4096, capabilities: { reasoning: false, tools: false, json: true, streaming: true, multimodal: false }, revision: -1 });
    try { await op.invoke('credential.save', { provider_id: secret, name: 'Review key', notes: '', secret: Buffer.from(secret), max_concurrency: 1, requests_per_minute: 120 }); }
    catch (e) { saveError = e.code; }
  } finally { op.revoke(); await service.close(); protector.destroy(); }
  const db = new DatabaseSync(join(root, 'host/kernel.sqlite'), { readOnly: true });
  const rows = db.prepare("SELECT body FROM anx_records WHERE json_extract(body,'$.phase')='DESKTOP_CREDENTIAL_INTENT'").all();
  db.close();
  const leak = rows.some(r => r.body.includes(secret));
  findings.push({ probe: 'newly_submitted_secret_audit', assurance: 'SYNTHETIC_OFFLINE_ONLY', root, saveError, intentCount: rows.length, intentContainsSubmittedSecret: leak, status: !leak && !!saveError ? 'PASS' : 'FAIL' });
}

// Inject an external-store delete whose success acknowledgement is lost.
{
  const root = await mkdtemp(join(evidence, 'delete-failure-recheck-')), entries = new Map();
  const storage = {
    id: 'synthetic-reference-storage', protection: 'SYNTHETIC_REFERENCE_STORAGE',
    async protect(b) { const ref = randomUUID(); entries.set(ref, Buffer.from(b)); return Buffer.from(ref); },
    async unprotect(ref) { const v = entries.get(Buffer.from(ref).toString()); if (!v) throw Error('SYNTHETIC_ABSENT'); return Buffer.from(v); },
    async forget(ref) { entries.delete(Buffer.from(ref).toString()); throw Error('SYNTHETIC_DELETE_ACK_LOST'); },
  };
  const admin = createVaultAdminCapability(), vault = await CredentialVault.open({ root, admin, mode: 'SYNTHETIC', protector: storage });
  await vault.add(admin, { key_id: 'delete-me', provider_id: 'synthetic', models: ['model'], secret: Buffer.from('synthetic-test-deletion-candidate-abcdef'), max_concurrency: 1, requests_per_minute: 120 });
  let deletionError, reopenError, opened = false;
  try { await vault.removeStored(admin, 'delete-me'); } catch (e) { deletionError = e.message; }
  vault.close();
  try { const reopened = await CredentialVault.open({ root, admin: createVaultAdminCapability(), mode: 'SYNTHETIC', protector: storage }); opened = true; reopened.close(); }
  catch (e) { reopenError = e.code; }
  findings.push({ probe: 'delete_success_ack_lost', assurance: 'SYNTHETIC_FAULT_INJECTION_ONLY_NO_OS_PROTECTION_CLAIM', root, deletionError, storedReferences: entries.size, reopenError, opened, status: opened ? 'PASS' : 'FAIL' });
}

// Deletion is terminal even when its former expiry passes before restart.
{
  const root = await mkdtemp(join(evidence, 'delete-expiry-recheck-')), entries = new Map();
  const storage = {
    id: 'synthetic-reference-storage', protection: 'SYNTHETIC_REFERENCE_STORAGE',
    async protect(b) { const ref = randomUUID(); entries.set(ref, Buffer.from(b)); return Buffer.from(ref); },
    async unprotect(ref) { const v = entries.get(Buffer.from(ref).toString()); if (!v) throw Error('SYNTHETIC_ABSENT'); return Buffer.from(v); },
    async forget(ref) { entries.delete(Buffer.from(ref).toString()); throw Error('SYNTHETIC_DELETE_ACK_LOST'); },
  };
  const admin = createVaultAdminCapability(), vault = await CredentialVault.open({ root, admin, mode: 'SYNTHETIC', protector: storage });
  await vault.add(admin, { key_id: 'expiring-delete', provider_id: 'synthetic', models: ['model'], secret: Buffer.from('synthetic-test-expiring-delete-abcdef'), max_concurrency: 1, requests_per_minute: 120, expires_at: Date.now() + 50 });
  try { await vault.removeStored(admin, 'expiring-delete'); } catch { /* Lost external-store ACK is the injected fault. */ }
  await new Promise(resolve => setTimeout(resolve, 100));
  const pendingState = vault.list(admin)[0]?.state;
  try { vault.guard.assertSafe('synthetic-test-expiring-delete-abcdef', 'INDEPENDENT_DELETION_GUARD_RECHECK'); } catch { /* Guard must still refuse the deleted secret. */ }
  const afterGuardState = vault.list(admin)[0]?.state;
  vault.close();
  let reopenError, opened = false;
  try { const reopened = await CredentialVault.open({ root, admin: createVaultAdminCapability(), mode: 'SYNTHETIC', protector: storage }); opened = true; reopened.close(); }
  catch (e) { reopenError = e.code; }
  findings.push({ probe: 'pending_delete_expiry_and_guard', assurance: 'SYNTHETIC_FAULT_INJECTION_ONLY_NO_OS_PROTECTION_CLAIM', root, pendingState, afterGuardState, reopenError, opened, status: opened && pendingState === 'DELETING' && afterGuardState === 'DELETING' ? 'PASS' : 'FAIL' });
}

// Disabling reads must never silently turn the fixed known-secret guard into an accepting empty set.
{
  const root = await mkdtemp(join(evidence, 'storage-off-redaction-recheck-')), inner = new SyntheticMemoryProtector();
  let reads = 0;
  const protector = { id: inner.id, protection: inner.protection, protect: b => inner.protect(b), unprotect: b => { reads++; return inner.unprotect(b); } };
  const sentinel = 'synthetic-test-storage-off-existing-secret-abcdef', admin = createVaultAdminCapability();
  const vault = await CredentialVault.open({ root: join(root, 'local-vault'), admin, mode: 'LOCAL', protector });
  await vault.add(admin, { key_id: 'existing', provider_id: 'offline', models: ['model'], secret: Buffer.from(sentinel), max_concurrency: 1, requests_per_minute: 120 });
  vault.close();
  const controller = SecurityController.open(join(root, 'security'), () => ({ osStorage: true, storageAssurance: 'REAL', service: false, qualified: [] }));
  const profile = controller.profile(); profile.features['credentials.osStorage'] = false;
  const plan = controller.preview(profile, 0); controller.commit(plan.id, plan.hash, 'APPLY_SECURITY_CHANGE'); controller.close();
  reads = 0;
  const service = await openDesktopService(root, { security: true, protector }), op = service.openOperator();
  const baselineDb = new DatabaseSync(join(root, 'host/kernel.sqlite'), { readOnly: true });
  const capturedBefore = baselineDb.prepare("SELECT count(*) AS n FROM anx_records WHERE json_extract(body,'$.phase')='CONTEXT_CAPTURED'").get().n;
  baselineDb.close();
  let saveError, promptError;
  try { await op.invoke('provider.save', { id: sentinel, name: 'Existing key pasted into metadata', preset_id: 'custom', protocol: 'openai-compatible', base_url: 'https://synthetic.invalid/v1', enabled: true, revision: -1 }); }
  catch (e) { saveError = e.code; }
  try { await service.bindAgent('development').complete(sentinel); } catch (e) { promptError = e.code; }
  const snapshot = await op.invoke('snapshot');
  op.revoke(); await service.close(); inner.destroy();
  const db = new DatabaseSync(join(root, 'host/kernel.sqlite'), { readOnly: true });
  const rows = db.prepare("SELECT body FROM anx_records WHERE json_extract(body,'$.phase')='DESKTOP_PROVIDER_SAVED'").all();
  const capturedPromptRows = db.prepare("SELECT count(*) AS n FROM anx_records WHERE json_extract(body,'$.phase')='CONTEXT_CAPTURED'").get().n - capturedBefore;
  db.close();
  const leak = rows.some(r => r.body.includes(sentinel));
  findings.push({ probe: 'storage_disabled_known_redaction', assurance: 'SYNTHETIC_OFFLINE_ONLY_NOT_OS_PROTECTION_EVIDENCE', root, unprotectCalls: reads, saveError, promptError, capturedPromptRows, redactionStatus: snapshot.security.features.find(f => f.id === 'credentials.secretRedaction').status, auditContainsExistingSecret: leak, status: reads === 0 && !leak && !!saveError && !!promptError && capturedPromptRows === 0 ? 'PASS' : 'FAIL' });
}

// Exercise only admission/rejection. All send probes have an already-aborted
// signal as a second independent barrier; no HTTPS request is authorized here.
{
  const root = await mkdtemp(join(evidence, 'local-admission-recheck-'));
  const controller = SecurityController.open(root, () => ({ osStorage: true, storageAssurance: 'REAL', service: false, qualified: [] }));
  const endpoint = 'https://synthetic.invalid/v1/chat/completions';
  const transport = new LocalDevelopmentHttpsTransport(controller, () => endpoint, () => true);
  const base = { subject: { agent_id: 'review', project_id: 'review' }, model: { provider_id: 'review', model_id: 'review', price: { assurance: 'REAL' } }, request: { url: endpoint, method: 'POST', headers: { 'x-agentnexus-request-id': 'review-admit' }, body: '{}' }, input_tokens: 1, output_tokens: 1, estimated_cost_micros: 0, context_hash: '0'.repeat(64) };
  const checks = [];
  const reject = async (name, operation, expected) => { await assert.rejects(operation, e => e.code === expected); checks.push(name); };
  try {
    await reject('endpoint_restriction_on', () => transport.preflight({ ...base, request: { ...base.request, url: 'https://other.synthetic.invalid/v1/chat/completions' } }), 'SECURITY_NETWORK_ENDPOINT_DENIED');
    let profile = controller.profile(); profile.features['execution.networkRestriction'] = false;
    let plan = controller.preview(profile, controller.snapshot().revision); controller.commit(plan.id, plan.hash, 'APPLY_SECURITY_CHANGE');
    await transport.preflight({ ...base, request: { ...base.request, url: 'https://other.synthetic.invalid/v1/chat/completions' } }); transport.abandon('review-admit'); checks.push('endpoint_restriction_off_actual_preflight');
    await reject('https_always_required', () => transport.preflight({ ...base, request: { ...base.request, url: 'http://synthetic.invalid/v1/chat/completions' } }), 'SECURITY_LOCAL_HTTPS_REQUIRED');
    const noPrice = new LocalDevelopmentHttpsTransport(controller, () => endpoint, () => false);
    await reject('configured_price_required', () => noPrice.preflight(base), 'SECURITY_LOCAL_PRICE_REQUIRED');
    await transport.preflight(base);
    const abort = new AbortController(); abort.abort();
    await reject('envelope_tamper_rejected', () => transport.send({ ...base.request, body: '{"tampered":true}' }, 'Bearer synthetic-test-never-send', abort.signal), 'SECURITY_LOCAL_NETWORK_ADMISSION_REQUIRED');
    await transport.preflight(base);
    profile = controller.profile(); profile.features['audit.commands'] = false;
    plan = controller.preview(profile, controller.snapshot().revision); controller.commit(plan.id, plan.hash, 'APPLY_SECURITY_CHANGE');
    await reject('profile_revision_rejected', () => transport.send(base.request, 'Bearer synthetic-test-never-send', abort.signal), 'SECURITY_LOCAL_NETWORK_ADMISSION_REQUIRED');
    findings.push({ probe: 'local_https_admission', assurance: 'SYNTHETIC_ADMISSION_METADATA_ONLY_NOT_OS_OR_NETWORK_QUALIFICATION', root, checks, transportSendRejectionCalls: 2, networkRequestsStarted: 0, status: 'PASS' });
  } catch (error) { findings.push({ probe: 'local_https_admission', assurance: 'SYNTHETIC_ADMISSION_METADATA_ONLY_NOT_OS_OR_NETWORK_QUALIFICATION', root, checks, error: error.code ?? error.message, networkRequestsStarted: 0, status: 'FAIL' }); }
  finally { controller.close(); }
}

const output = { schema: 'agentnexus/independent-probes/1', timestamp: new Date().toISOString(), realProviderRequests: 0, realKeys: 0, osProtectionQualification: 'NOT_RUN', findings };
await writeFile(join(evidence, 'independent-probes-latest.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output));
process.exitCode = findings.every(f => f.status === 'PASS') ? 0 : 1;
