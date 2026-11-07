// Independently authored protocol model. Every OS identity and observation below is
// synthetic, including values named REAL_WINDOWS. No native process is created.
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [sourceArg, dataArg] = process.argv.slice(2);
assert.ok(sourceArg && dataArg, 'source and reviewer data directories required');
const source = resolve(sourceArg), dataRoot = resolve(dataArg);
await mkdir(dataRoot, { recursive: true });
const load = path => import(pathToFileURL(join(source, path)).href);
const { canonical, invariant, sha256, uid, NexusError } = await load('src/agentnexus/types.ts');
const { openHost } = await load('src/agentnexus/host.ts');
const { KernelStore } = await load('src/agentnexus/storage.ts');
const { initializeControl, clockFor } = await load('src/agentnexus/control.ts');
const { intentHash } = await load('src/agentnexus/gateway.ts');
const { profileHash } = await load('src/agentnexus/runtime/contracts.ts');
const { signed, nonce } = await load('src/agentnexus/production/contracts.ts');
const { QualificationGate, COMBINATION_CHECKS } = await load('src/agentnexus/production/qualification.ts');
const { buildExitProof } = await load('src/agentnexus/production/exit.ts');
const { ProductionExecutionBroker } = await load('src/agentnexus/production/broker.ts');
const { ProductionAudit } = await load('src/agentnexus/production/audit.ts');
const { TrustedEndpoint } = await load('src/agentnexus/production/transport.ts');
const { encodeFrame, decodeFrame } = await load('src/agentnexus/runtime/ipc.ts');
const { BootstrapReservations } = await load('src/agentnexus/bootstrap/reservations.ts');
const { ExitClosureOwner } = await load('src/agentnexus/bootstrap/exit-closure.ts');

const cases = [];
async function check(id, work) {
  try { const detail = await work(); cases.push({ id, passed: true, assurance: 'SIMULATED_SECURITY_REAL_LOCAL_CRYPTO_SQLITE_ARTIFACT', detail }); }
  catch (error) { cases.push({ id, passed: false, error: { code: error.code ?? null, message: error.message, stack: error.stack } }); }
}
const keys = generateKeyPairSync('ed25519'), brokerKeys = generateKeyPairSync('ed25519');
const logical = { agent_id: 'independent-model', project_id: 'ir-project', task_id: 'task', session_id: 'session', role: 'worker' };
const identity = { agent_id: logical.agent_id, project_id: logical.project_id, task_id: logical.task_id, session_id: logical.session_id };
const processId = { os: 'windows', principal: 'S-1-5-21-10-20-30-1002', pid: 4242, start_id: '1234567890', os_session: '2' };
const parent = { ...processId, pid: 4241, start_id: '1234567800', principal: 'S-1-5-21-10-20-30-1001' };
const profile = { id: 'ir-model', version: 1, os: 'windows', os_version: 'SIMULATED_OS_RECORD', principal: processId.principal, accessible: [], read_only: [], writable: [], network: 'DENY', limits: { memory_bytes: 67108864, cpu_ms: 80, wall_ms: 1000, file_bytes: 4096, processes: 1, output_bytes: 4096 }, lifetime: 'ONE_OPERATION', exit_requirement: 'COMPLETE_PROCESS_TREE' };
const runtime = { runtime_id: uid(), logical, process: processId, parent, worker_instance_id: uid(), host_boot_id: uid(), broker_boot_id: uid(), generation: 1, profile, profile_hash: profileHash(profile), state: 'ACTIVE', assurance: 'SIMULATED' };
const tool = { id: 'ir.fixed', version: '1', feature_id: 'tool.test', policy_ids: ['P.COMMAND_RISK'], capability: 'PROCESS', profile_hash: runtime.profile_hash, executable_hash: sha256('SYNTHETIC_FIXED_EXECUTABLE') };
const helperHash = sha256('SYNTHETIC_NATIVE_HELPER'), qualifiedHash = sha256('SYNTHETIC_QUALIFICATION_NOT_OS_EVIDENCE');
function certificate(assurance) { return { schema: 'agentnexus/qualification/1', profile_hash: runtime.profile_hash, helper_hash: helperHash, tool_hash: tool.executable_hash, host_sid: parent.principal, worker_sid: processId.principal, os_version: profile.os_version, assurance, checks: [...COMBINATION_CHECKS], evidence_hash: qualifiedHash, expires_at: Date.now() + 30000 }; }
let gate;
await check('GATE_CONSTRUCTOR_ALLOWS_CONTROL_PLANE_INITIALIZATION', () => {
  gate = new QualificationGate(keys.publicKey, [signed(certificate('REAL_WINDOWS'), keys.privateKey), signed(certificate('SIMULATED'), keys.privateKey)], parent);
  assert.ok(gate); return { constructed: true, native_work: 0 };
});
await check('VALID_SIGNED_FULL_CHECKS_CANNOT_OVERRIDE_REAL_WINDOWS_BLOCKER', () => {
  assert.throws(() => gate.admit({ ...runtime, assurance: 'REAL_WINDOWS' }, tool, helperHash), { code: 'M151_CPU_HARD_LIMIT_NOT_QUALIFIED' });
  return { rejected_with: 'M151_CPU_HARD_LIMIT_NOT_QUALIFIED', signed_checks: COMBINATION_CHECKS.length };
});
await check('SIMULATED_CERTIFICATE_REMAINS_MODEL_ONLY', () => {
  assert.equal(gate.admit(runtime, tool, helperHash).assurance, 'SIMULATED');
  assert.throws(() => gate.admit({ ...runtime, assurance: 'UNRECOGNIZED' }, tool, helperHash), { code: 'M151_CPU_HARD_LIMIT_NOT_QUALIFIED' });
  return { model_admitted: true, unknown_assurance_rejected: true };
});

const host = await openHost(await mkdtemp(join(dataRoot, 'host-')));
try {
  await check('LEGACY_PROCESS_EXTERNAL_EFFECT_STAY_BLOCKED_WITH_EXACT_APPROVAL_AND_DISABLED_PDP', async () => {
    const p = await host.administration.prepareMode({ scope: {}, mode: 'DISABLED', policy_ids: ['P.COMMAND_RISK'], reason: 'Independent synthetic policy boundary check', expires_at: new Date(Date.now() + 30000).toISOString() }, host.administration.metadata().policy_revision);
    await host.administration.confirmMode(p.challenge_id, 'PREVIEW_ACK', p.preview_hash);
    await host.administration.confirmMode(p.challenge_id, 'RISK_ACK', p.preview_hash);
    await host.administration.commitMode(p.challenge_id, p.preview_hash);
    let invoked = 0; const result = [];
    const agent = host.bindAgent(identity);
    try {
      for (const capability of ['PROCESS', 'EXTERNAL_EFFECT']) {
        host.administration.registerTool({ id: 'ir.' + capability, version: '1', feature_id: 'tool.test', capability, policy_ids: ['P.COMMAND_RISK'], requires_sandbox: false, schema() {}, writer_resource: () => 'ir-project:resource', execute() { invoked++; return { data: null }; } });
        const req = { call_id: uid(), tool_id: 'ir.' + capability, tool_version: '1', resource_id: 'ir-project:resource', arguments: {} };
        const approval_id = await host.administration.approve(intentHash(identity, req), identity, 'Exact synthetic approval does not qualify OS execution');
        const r = await agent.request({ ...req, approval_id });
        assert.equal(r.status, 'BLOCKED'); assert.equal(r.reason, 'SANDBOX_NOT_VERIFIED'); result.push({ capability, status: r.status, reason: r.reason });
      }
      assert.equal(invoked, 0); return { invoked, result };
    } finally { await agent.close(); }
  });
  const out = await host.store.artifacts.putBytes(Buffer.alloc(0)), err = await host.store.artifacts.putBytes(Buffer.alloc(0));
  const grant = { schema: 'agentnexus/remote-permit/1', permit_id: uid(), approval_id: uid(), operation_id: uid(), intent_hash: sha256('synthetic-intent'), logical, runtime_id: runtime.runtime_id, worker_instance_id: runtime.worker_instance_id, host_boot_id: runtime.host_boot_id, broker_boot_id: runtime.broker_boot_id, generation: 1, process: processId, parent, tool_id: tool.id, tool_version: tool.version, resource_id: 'ir-project:resource', profile_hash: runtime.profile_hash, policy_epoch: 0, feature_epoch: 0, issued_at: Date.now() - 100, expires_at: Date.now() + 10000, nonce: nonce(), arguments_hash: sha256(canonical({})) };
  const evidence = { source: 'REAL_WINDOWS', observation_id: uid(), process: processId, parent, job_id: 'SYNTHETIC_JOB', job_membership_verified: true, job_empty: true, membership_complete: true, unknown_members: false, members: [{ process: processId, parent, exited: true, exit_code: 0, handle_signaled: true }], root_exited: true, handles_closed: true, termination_requested_at: null, observed_at: new Date().toISOString(), sandbox: { profile_hash: runtime.profile_hash, token_verified: true, network_verified: true, filesystem_verified: true, limits_verified: true, settled: true }, outputs: { stdout: { eof: true, producer_closed: true, producer_id: 'synthetic-stdout' }, stderr: { eof: true, producer_closed: true, producer_id: 'synthetic-stderr' } } };
  await check('EACH_MISSING_ISOLATION_FACT_BLOCKS_EXIT_AUTHORITY', () => {
    const observed = [];
    for (const fact of ['network_verified', 'filesystem_verified', 'limits_verified']) {
      const proof = buildExitProof(grant, { ...evidence, sandbox: { ...evidence.sandbox, [fact]: false } }, out, err, qualifiedHash);
      assert.equal(proof.state, 'EXIT_UNVERIFIED'); assert.equal(proof.production_release_authority, false); observed.push({ fact, state: proof.state });
    }
    return { synthetic_real_source_string: true, observed };
  });
  await check('MODEL_UNKNOWN_MEMBERS_AND_UNSETTLED_OUTPUT_NEVER_RELEASE', () => {
    const variants = [ { ...evidence, source: 'SIMULATED' }, { ...evidence, unknown_members: true }, { ...evidence, outputs: { ...evidence.outputs, stdout: { ...evidence.outputs.stdout, producer_closed: false } } } ];
    for (const variant of variants) { const proof = buildExitProof(grant, variant, out, err, qualifiedHash); assert.equal(proof.state, 'EXIT_UNVERIFIED'); assert.equal(proof.production_release_authority, false); }
    return { rejected_variants: variants.length };
  });
  await check('DURABLE_BOOTSTRAP_AUDIT_FAILURE_PREVENTS_NATIVE_PREPARE', async () => {
    host.store.db.exec('CREATE TABLE m14_host_resources(resource TEXT,kind TEXT,state TEXT,revision INTEGER,operation TEXT)');
    const owner = new BootstrapReservations(host.store, () => true, parent, 'ir-project:resource', runtime.profile_hash);
    const original = host.store.flush.bind(host.store); let nativePrepares = 0;
    try { host.store.flush = async () => { throw new NexusError('IR_INJECTED_AUDIT_BARRIER_FAILURE'); }; await assert.rejects((async () => { await owner.claim(logical, {}); nativePrepares++; })(), { code: 'IR_INJECTED_AUDIT_BARRIER_FAILURE' }); }
    finally { host.store.flush = original; }
    assert.equal(nativePrepares, 0); assert.equal(host.store.db.prepare('SELECT state FROM m15_bootstrap_prepares').get().state, 'PREPARING');
    return { nativePrepares, retained_state: 'PREPARING', failure: 'INJECTED_NOT_REAL_DISK_FAILURE' };
  });
  await check('UNKNOWN_CLOSURE_RETAINS_ALL_FIVE_RESOURCE_CLAIMS', async () => {
    const proof = buildExitProof(grant, { ...evidence, source: 'SIMULATED' }, out, err, qualifiedHash);
    host.store.db.exec('CREATE TABLE m14_verified_exit_proofs(operation TEXT,hash TEXT,body TEXT)');
    host.store.db.prepare('INSERT INTO m14_verified_exit_proofs VALUES(?,?,?)').run(grant.operation_id, proof.evidence_hash, canonical(proof));
    const kinds = ['WRITER', 'WORKSPACE_LOCK', 'PROCESS_SLOT', 'WORKER_QUOTA', 'SANDBOX_RESERVATION'];
    for (const kind of kinds) host.store.db.prepare('INSERT INTO m14_host_resources VALUES(?,?,?,?,?)').run('synthetic-resource', kind, 'HELD', 0, grant.operation_id);
    const owner = new ExitClosureOwner(host.store);
    const r = await owner.close(proof, { source: 'REAL_WINDOWS', ipc: { connection_revoked: true, pending: 0, unknown: 1 }, sandbox_closed: true, owners: kinds.map(kind => ({ kind, resource: 'synthetic-resource', revision: 0, release_condition_verified: true })) });
    assert.equal(r.state, 'EXIT_UNVERIFIED'); assert.throws(() => owner.assertRelease(grant.operation_id, proof.evidence_hash), { code: 'M15_COMPLETE_EXIT_CLOSURE_REQUIRED' });
    assert.equal(host.store.db.prepare("SELECT COUNT(*) n FROM m14_host_resources WHERE state='HELD'").get().n, 5);
    return { closure_state: r.state, claims_held: 5, real_windows_label_is_synthetic: true };
  });
} finally { await host.close(); }

async function brokerProbe(assurance, injectAudit) {
  const store = await KernelStore.open(await mkdtemp(join(dataRoot, 'broker-'))); initializeControl(store);
  const current = { ...runtime, broker_boot_id: clockFor(store).boot_id, assurance };
  const endpoint = new TrustedEndpoint({ peer: async () => processId, close() {} }, () => current, new ProductionAudit(store));
  const connection = await endpoint.admit(current.runtime_id, {});
  let starts = 0, preparations = 0;
  const supervisor = { helper_hash: helperHash, ready: async () => { preparations++; }, start() { starts++; throw Error('Independent negative probe must not start work'); } };
  const broker = new ProductionExecutionBroker({ store, host_key: keys.publicKey, broker_key: brokerKeys.privateKey, endpoint, gate, supervisor, runtime: () => current, epochs: () => ({ policy_epoch: 0, feature_epoch: 0 }), features: () => true, hostFence: async () => {}, tools: [tool] });
  const args = {}, g = { schema: 'agentnexus/remote-permit/1', permit_id: uid(), approval_id: uid(), operation_id: uid(), intent_hash: sha256('synthetic-intent'), logical, runtime_id: current.runtime_id, worker_instance_id: current.worker_instance_id, host_boot_id: current.host_boot_id, broker_boot_id: current.broker_boot_id, generation: 1, process: processId, parent, tool_id: tool.id, tool_version: tool.version, resource_id: 'ir-project:resource', profile_hash: current.profile_hash, policy_epoch: 0, feature_epoch: 0, issued_at: Date.now() - 100, expires_at: Date.now() + 10000, nonce: nonce(), arguments_hash: sha256(canonical(args)) };
  const payload = { grant: signed(g, keys.privateKey), arguments: args };
  const envelope = { schema: 'agentnexus/ipc/1', ...identity, request_id: uid(), runtime_id: current.runtime_id, runtime_session_id: current.worker_instance_id, worker_instance_id: current.worker_instance_id, operation_id: g.operation_id, capability_id: g.permit_id, resource_id: g.resource_id, policy_epoch: 0, feature_epoch: 0, payload_hash: sha256(canonical(payload)), nonce: nonce(), deadline: g.expires_at, connection_id: connection.connection_id, profile_hash: current.profile_hash, payload };
  const body = encodeFrame(envelope, connection.secret).subarray(4), original = store.flush.bind(store);
  try {
    if (injectAudit) {
      let flushes = 0; store.flush = async () => { if (++flushes === 2) throw new NexusError('IR_INJECTED_BROKER_AUDIT_FAILURE'); return original(); };
      await assert.rejects(broker.dispatch(connection.handle, body), { code: 'IR_INJECTED_BROKER_AUDIT_FAILURE' }); store.flush = original;
      assert.equal(store.db.prepare('SELECT state FROM m14_broker_operations').get().state, 'UNKNOWN_QUARANTINED');
      await assert.rejects(broker.dispatch(connection.handle, body), { code: 'M14_PERMIT_REPLAY' });
    } else {
      await assert.rejects(broker.dispatch(connection.handle, body), { code: 'M151_CPU_HARD_LIMIT_NOT_QUALIFIED' });
      assert.equal(store.db.prepare('SELECT COUNT(*) n FROM m14_broker_operations').get().n, 0);
    }
    assert.equal(starts, 0); assert.equal(preparations, 0);
    const packet = JSON.parse(body); packet.envelope.payload.arguments = { changed: true }; packet.envelope.payload_hash = sha256(canonical(packet.envelope.payload));
    assert.throws(() => decodeFrame(Buffer.from(canonical(packet)), connection.secret), { code: 'IPC_MAC' });
    return { starts, preparations, consumed: injectAudit, replay_rejected: injectAudit, audit_failure_injected: injectAudit, assurance_is_synthetic: true, changed_payload_mac_rejected: true };
  } finally { store.flush = original; broker.close(); await store.close(); }
}
await check('BROKER_AUDIT_FAILURE_QUARANTINES_AND_REPLAY_CANNOT_START', () => brokerProbe('SIMULATED', true));
await check('BROKER_REAL_CERTIFICATE_BLOCKED_BEFORE_CONSUMPTION_OR_START', () => brokerProbe('REAL_WINDOWS', false));
const result = { schema: 'agentnexus/m1.5.1/independent-boundary-probe/1', generated_at: new Date().toISOString(), node: process.version, source, data_root: dataRoot, assurance: 'ALL_OS_OBSERVATIONS_SIMULATED; REAL_WINDOWS_IS_A_TEST_LABEL', native_processes_started: 0, cpu_busy_loops: 0, cases, passed: cases.filter(x => x.passed).length, failed: cases.filter(x => !x.passed).length, production_qualification: false };
process.stdout.write(JSON.stringify(result, null, 2) + '\n'); process.exitCode = result.failed ? 1 : 0;
