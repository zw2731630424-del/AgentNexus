import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { openHost } from '../../src/agentnexus/host.ts';
import { intentHash } from '../../src/agentnexus/gateway.ts';
import type { ToolDefinition, ToolRequest } from '../../src/agentnexus/gateway.ts';
import { validatePolicyDefinitions } from '../../src/agentnexus/policy.ts';
import type { Identity, PolicyDefinition, ValidationResult } from '../../src/agentnexus/types.ts';

const ID: Identity = { agent_id: 'security-worker', project_id: 'security-project', task_id: 'security-task', session_id: 'security-session' };
const catalog: PolicyDefinition[] = JSON.parse(readFileSync(new URL('../../config/agentnexus/policies.json', import.meta.url), 'utf8')).policies;
const policy = (id = 'P.COMMAND_RISK') => structuredClone(catalog.find(d => d.id === id)!);
const req = (call_id: string, tool_id = 'security.write'): ToolRequest => ({ call_id, tool_id, tool_version: '1', ...(tool_id === 'security.write' ? { resource_id: ID.project_id + ':resource' } : {}), arguments: { value: 1 } });
async function fixture(t: test.TestContext, options: Parameters<typeof openHost>[1] = {}) {
  const base = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'security'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'case-')); const host = await openHost(root, options); const agent = host.bindAgent(ID);
  t.after(async () => { await agent.close(); await host.close(); });
  return { host, agent, root };
}
async function signed(host: Awaited<ReturnType<typeof openHost>>, request: ToolRequest, lifetime = 60000) {
  return { ...request, approval_id: await host.administration.approve(intentHash(ID, request), ID, 'Exact local synthetic security test', lifetime) };
}
function writeTool(host: Awaited<ReturnType<typeof openHost>>, overrides: Partial<ToolDefinition> = {}) {
  host.store.db.exec('CREATE TABLE IF NOT EXISTS security_effects(n INTEGER); INSERT INTO security_effects SELECT 0 WHERE NOT EXISTS(SELECT 1 FROM security_effects)');
  const definition: ToolDefinition = { id: 'security.write', version: '1', feature_id: 'tool.test', capability: 'LOCAL_WRITE', policy_ids: ['P.COMMAND_RISK'], requires_sandbox: false,
    writer_resource: (_args, id) => id.project_id + ':resource', schema() {}, execute() { host.store.db.exec('UPDATE security_effects SET n=n+1'); return { data: null }; }, ...overrides };
  host.administration.registerTool(definition); return definition;
}
const count = (host: Awaited<ReturnType<typeof openHost>>) => (host.store.db.prepare('SELECT n FROM security_effects').get() as { n: number }).n;
async function disabled(host: Awaited<ReturnType<typeof openHost>>) {
  const p = await host.administration.prepareMode({ scope: {}, mode: 'DISABLED', policy_ids: ['P.COMMAND_RISK','P.STYLE'], reason: 'Explicit optional policy bypass test', expires_at: new Date(Date.now() + 60000).toISOString() }, host.administration.metadata().policy_revision);
  await host.administration.confirmMode(p.challenge_id, 'PREVIEW_ACK', p.preview_hash); await host.administration.confirmMode(p.challenge_id, 'RISK_ACK', p.preview_hash); await host.administration.commitMode(p.challenge_id, p.preview_hash);
}

test('M12-PE-CONFIG: closed policy identity and runtime contract reject malformed definitions', async t => {
  const variants: [string, (d: any) => any, string][] = [
    ['unknown ID', d => ({ ...d, id: 'P.UNKNOWN' }), 'UNKNOWN_POLICY'],
    ['unknown level', d => ({ ...d, level: 'L9' }), 'INVALID_POLICY_CONTRACT'],
    ['wrong known level', d => ({ ...d, level: 'L3' }), 'INVALID_POLICY_CONTRACT'],
    ['owner', d => ({ ...d, enforcement_owner: 'agent-controlled' }), 'INVALID_POLICY_CONTRACT'],
    ['degradable', d => ({ ...d, degradable: false }), 'INVALID_POLICY_CONTRACT'],
    ['missing field', d => { delete d.level; return d; }, 'INVALID_POLICY_CONTRACT'],
    ['empty modes', d => ({ ...d, modes: {} }), 'INVALID_POLICY_MODES'],
    ['unknown mode', d => ({ ...d, modes: { ...d.modes, YOLO: 'allow' } }), 'INVALID_POLICY_MODES'],
    ['invalid mode value', d => ({ ...d, modes: { ...d.modes, ENFORCE: true } }), 'INVALID_POLICY_MODES'],
    ['unknown authority field', d => ({ ...d, allow_without_permit: true }), 'INVALID_POLICY_FIELDS'],
    ['permissive default', d => ({ ...d, default_mode: 'DISABLED' }), 'INVALID_POLICY_DEFAULT_MODE'],
  ];
  for (const [name, change, code] of variants) await t.test(name, () => assert.throws(() => validatePolicyDefinitions([change(policy())]), { code }));
  assert.throws(() => validatePolicyDefinitions([policy(), policy()]), { code: 'DUPLICATE_POLICY' });
  assert.equal(validatePolicyDefinitions(catalog).length, 41); // Original 34 plus seven independent runtime owners.
  const base = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'security'); await mkdir(base, { recursive: true });
  await assert.rejects(openHost(await mkdtemp(join(base, 'bad-startup-')), { policies: [{ ...policy(), level: 'L9' } as any] }), { code: 'INVALID_POLICY_CONTRACT' });
});
test('M12-PE-LEVELS: L0 owner, L1 exact approval, L2 implemented dimension, L3 advisory have explicit semantics', async t => {
  const { host, agent } = await fixture(t);
  const context = { identity: ID, intent_hash: 'a'.repeat(64) };
  assert.throws(() => host.policy.evaluate(['P.UNKNOWN'], context), { code: 'UNKNOWN_POLICY' });
  assert.throws(() => host.policy.evaluate(['P.IDENTITY'], context), { code: 'INDEPENDENT_POLICY_OWNER' });
  assert.equal(host.policy.evaluate(['P.COMMAND_RISK'], context).allowed, false);
  const approval_id = await host.administration.approve(context.intent_hash, ID, 'Exact policy evaluation test');
  assert.equal(host.policy.evaluate(['P.COMMAND_RISK'], { ...context, approval_id }).allowed, true);
  assert.equal(host.policy.evaluate(['P.DI_SYNTAX'], { ...context, validation_ok: true } as any).allowed, false);
  const result = await agent.request({ call_id: 'diagnostic', tool_id: 'native.diagnostics', tool_version: '1', arguments: { language: 'json', source: '{}', document_uri: 'memory:security.json', version: 1 } });
  assert.equal(result.status, 'PASS');
  const validation = result.data as unknown as ValidationResult;
  assert.equal(host.policy.evaluate(['P.DI_SYNTAX'], { ...context, validation }).allowed, true);
  assert.equal(host.policy.evaluate(['P.DI_SYNTAX'], { ...context, validation: { ...validation, feature_epoch: validation.feature_epoch - 1 } }).allowed, false);
  for (const id of ['P.REVIEW_BINDING','P.WORKFLOW_GATES','P.SCIENTIFIC_CLAIM']) assert.equal(host.policy.evaluate([id], { ...context, validation }).allowed, false);
  assert.equal(host.policy.evaluate(['P.STYLE'], context).allowed, true);
});
test('M12-PE-INJECTION: trusted evaluator may only restrict and receives frozen policy/context', async t => {
  let frozen = false;
  const { host } = await fixture(t, { ruleEvaluator: (d, c) => { frozen = Object.isFrozen(d) && Object.isFrozen(d.modes) && Object.isFrozen(c) && Object.isFrozen(c.identity); return 'ALLOW'; } });
  const c = { identity: ID, intent_hash: 'a'.repeat(64) };
  assert.equal(host.policy.evaluate(['P.COMMAND_RISK'], c).allowed, false);
  assert.equal(host.policy.evaluate(['P.WORKFLOW_GATES'], c).allowed, false); assert.equal(frozen, true);
  assert.throws(() => host.gateway.register({ admin: true }, {} as any), { code: 'ADMIN_CAPABILITY_REQUIRED' });
});
test('M12-PE-REGISTER: unknown capability, missing declaration, empty effect policy and owner bypass rejected', async t => {
  const { host } = await fixture(t);
  const pure: ToolDefinition = { id: 'registration', version: '1', feature_id: 'tool.test', capability: 'PURE', policy_ids: [], requires_sandbox: false, schema() {}, execute: () => ({ data: null }) };
  for (const capability of [undefined, null, '', 'SHELL', 'ALLOW_ALL']) assert.throws(() => host.administration.registerTool({ ...pure, capability } as any), { code: 'UNKNOWN_TOOL_CAPABILITY' });
  assert.throws(() => host.administration.registerTool({ ...pure, capability: 'LOCAL_WRITE', writer_resource: () => 'p:x' }), { code: 'SIDE_EFFECT_POLICY_REQUIRED' });
  assert.throws(() => host.administration.registerTool({ ...pure, capability: 'LOCAL_WRITE', policy_ids: ['P.COMMAND_RISK'] }), { code: 'WRITER_RESOURCE_REQUIRED' });
  assert.throws(() => host.administration.registerTool({ ...pure, policy_ids: ['P.UNKNOWN'] }), { code: 'UNKNOWN_POLICY' });
  assert.throws(() => host.administration.registerTool({ ...pure, policy_ids: ['P.IDENTITY'] }), { code: 'INDEPENDENT_POLICY_OWNER' });
  host.administration.registerTool(pure);
  assert.throws(() => host.administration.registerTool(pure), { code: 'TOOL_ALREADY_REGISTERED' });
});
test('M12-PE-MODE-OWNER: even ENFORCE changes cannot persist an independent owner in the application mode table', async t => {
  const { host } = await fixture(t);
  await assert.rejects(host.administration.prepareMode({ scope: {}, mode: 'ENFORCE', policy_ids: ['P.IDENTITY'], reason: 'Attempt to mix independent owner with application modes', expires_at: null }, host.administration.metadata().policy_revision), { code: 'NON_DEGRADABLE_POLICY' });
  assert.equal(host.policy.modeFor('P.STYLE', {}), 'ENFORCE');
  assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_modes').get() as any).n, 0);
});
test('M12-PE-CONTEXT: tool sees no KernelStore, database, authorization or administration capability', async t => {
  const { host, agent } = await fixture(t);
  host.administration.registerTool({ id: 'context-inspect', version: '1', feature_id: 'tool.test', capability: 'PURE', policy_ids: [], requires_sandbox: false, schema() {}, execute(_args, context) {
    assert.deepEqual(Object.keys(context).sort(), ['identity','operation_id','resource_id','signal','validation']);
    assert.equal(Object.isFrozen(context), true); assert.equal(Object.isFrozen(context.identity), true);
    for (const key of ['store','db','administration','audit','approve','registerTool']) assert.equal((context as any)[key], undefined);
    assert.throws(() => { (context as any).store = host.store; }, TypeError); return { data: 'restricted' };
  } });
  assert.equal((await agent.request(req('context', 'context-inspect'))).data, 'restricted');
  for (const key of ['store','gateway','policy','administration','prepareReconciliation','bindAgent']) assert.equal((agent as any)[key], undefined);
  assert.equal((await agent.request({ ...req('forged'), capability: 'PURE', policy_ids: [], admin: true } as any)).reason, 'INVALID_TOOL_REQUEST');
});
test('M12-PE-MODE: disabled application PDP and advisory policy cannot bypass mandatory side-effect approval', async t => {
  const { host, agent } = await fixture(t, { ruleEvaluator: () => 'ALLOW' });
  writeTool(host, { policy_ids: ['P.STYLE'] }); await disabled(host);
  assert.equal((await agent.request(req('unsigned'))).reason, 'SIDE_EFFECT_APPROVAL_REQUIRED'); assert.equal(count(host), 0);
  const approved = await signed(host, req('signed')); const result = await agent.request(approved);
  assert.equal(result.status, 'PASS'); assert.equal(count(host), 1);
  assert.equal((await agent.request(approved)).reason, 'DUPLICATE_OPERATION');
  assert.equal((await agent.request({ ...approved, call_id: 'replayed-as-new' })).status, 'BLOCKED'); assert.equal(count(host), 1);
  const permit = host.store.db.prepare('SELECT consumed,intent_hash FROM control_permits WHERE id=?').get(result.permit_id!) as any;
  assert.equal(permit.consumed, 1); assert.equal(permit.intent_hash, intentHash(ID, approved));
});
test('M12-PE-SANDBOX: process/external capabilities stay blocked even if requires_sandbox is false and PDP disabled', async t => {
  const { host, agent } = await fixture(t); let executions = 0;
  for (const capability of ['PROCESS','EXTERNAL_EFFECT'] as const) {
    host.administration.registerTool({ id: capability, version: '1', feature_id: 'tool.test', capability, policy_ids: ['P.COMMAND_RISK'], requires_sandbox: false, writer_resource: () => ID.project_id + ':external', schema() {}, execute() { executions++; return { data: null }; } });
  }
  await disabled(host);
  for (const capability of ['PROCESS','EXTERNAL_EFFECT']) assert.equal((await agent.request(req(capability, capability))).reason, 'SANDBOX_NOT_VERIFIED');
  assert.equal(executions, 0); assert.equal(host.deployment.status, 'BLOCKED');
});
test('M12-PE-START: approval expiry at the durable START_INTENT barrier prevents invocation', async t => {
  const { host, agent } = await fixture(t); writeTool(host);
  const input = await signed(host, req('expired-before-call'), 250);
  const original = host.store.flush.bind(host.store); let delayed = false;
  host.store.flush = async () => { await original(); if (!delayed && host.store.db.prepare("SELECT 1 FROM anx_records WHERE json_extract(body,'$.phase')='START_INTENT' LIMIT 1").get()) { delayed = true; await delay(300); } };
  try { const r = await agent.request(input); assert.equal(r.reason, 'APPROVAL_EXPIRED_BEFORE_START'); assert.equal(r.status, 'BLOCKED'); assert.equal(count(host), 0); }
  finally { host.store.flush = original; }
});
test('M12-PE-EPOCH: policy change after permit issuance fences the old exact approval', async t => {
  const { host, agent } = await fixture(t); writeTool(host);
  const input = await signed(host, req('stale-epoch'));
  const original = host.store.flush.bind(host.store); let changed = false;
  host.store.flush = async () => { await original(); if (!changed && host.store.db.prepare('SELECT 1 FROM control_permits LIMIT 1').get()) { changed = true; host.store.db.exec('UPDATE control_meta SET policy_epoch=policy_epoch+1 WHERE singleton=1'); } };
  try { const r = await agent.request(input); assert.equal(r.reason, 'POLICY_EPOCH_STALE'); assert.equal(r.status, 'BLOCKED'); assert.equal(count(host), 0); }
  finally { host.store.flush = original; }
});
test('M12-PE-RESOURCE: approval binds the exact resource; late resolver changes cannot redirect execution', async t => {
  const { host, agent } = await fixture(t); let resource = ID.project_id + ':resource';
  writeTool(host, { writer_resource: () => resource });
  const original = req('resource-rebind'); const grant = await signed(host, original);
  assert.notEqual(intentHash(ID, original), intentHash(ID, { ...original, resource_id: ID.project_id + ':other' }));
  assert.equal((await agent.request({ ...grant, resource_id: ID.project_id + ':other' })).reason, 'RESOURCE_SCOPE_MISMATCH');
  const input = await signed(host, req('resource-before-start'));
  const flush = host.store.flush.bind(host.store); let changed = false;
  host.store.flush = async () => { await flush(); if (!changed && host.store.db.prepare("SELECT 1 FROM anx_records WHERE json_extract(body,'$.phase')='START_INTENT' LIMIT 1").get()) { changed = true; resource = ID.project_id + ':changed-after-approval'; } };
  try { assert.equal((await agent.request(input)).reason, 'RESOURCE_SCOPE_MISMATCH'); assert.equal(count(host), 0); }
  finally { host.store.flush = flush; }
});
