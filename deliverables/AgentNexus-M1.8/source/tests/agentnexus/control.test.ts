import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { openHost } from '../../src/agentnexus/host.ts';
import { canonical, NexusError } from '../../src/agentnexus/types.ts';
import type { FeatureDefinition, Identity, PolicyDefinition } from '../../src/agentnexus/types.ts';
import type { ModeRequest } from '../../src/agentnexus/policy.ts';

const ID: Identity = { agent_id: 'agent-a', project_id: 'project-a', task_id: 'task-a', session_id: 'session-a' };
const scopes = ['G','P','A','T'];
function definition(id: string, state: 'ON'|'OFF' = 'ON', deps: string[] = [], conflicts: string[] = []): FeatureDefinition {
  return { id, kind: 'OPTIONAL', default: state, scopes, depends_on: deps, conflicts };
}
const POLICY: PolicyDefinition[] = JSON.parse(readFileSync(new URL('../../config/agentnexus/policies.json', import.meta.url), 'utf8')).policies.filter((d: PolicyDefinition) => ['P.DI_SYNTAX','P.COMMAND_RISK','P.IDENTITY'].includes(d.id));
async function fixture(t: test.TestContext, definitions = [definition('f.free')], extra: Record<string, unknown> = {}) {
  const base = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'controls'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'case-'));
  const host = await openHost(root, { definitions, policies: POLICY, ...extra });
  for (const d of definitions) host.administration.registerModule(d.id);
  t.after(async () => { await host.close(); });
  return { host, root };
}
async function feature(host: Awaited<ReturnType<typeof openHost>>, changes: any[]) {
  const p = await host.administration.previewFeatures(changes, host.administration.metadata().feature_revision);
  await host.administration.commitFeatures(p.challenge_id, p.preview_hash); return p;
}
async function mode(host: Awaited<ReturnType<typeof openHost>>, mode: ModeRequest['mode'], ids = ['P.DI_SYNTAX'], scope = {}, lifetime = 60000) {
  const p = await host.administration.prepareMode({ scope, mode, policy_ids: ids, reason: 'Explicit synthetic kernel verification', expires_at: mode === 'ENFORCE' ? null : new Date(Date.now() + lifetime).toISOString() }, host.administration.metadata().policy_revision);
  await host.administration.confirmMode(p.challenge_id, 'PREVIEW_ACK', p.preview_hash);
  await host.administration.confirmMode(p.challenge_id, 'RISK_ACK', p.preview_hash);
  await host.administration.commitMode(p.challenge_id, p.preview_hash); return p;
}
const context = () => ({ identity: ID, intent_hash: 'a'.repeat(64), validation: null });

test('FT-RESOLVE: defaults, child narrowing, ancestor veto, explicit INHERIT', async t => {
  const { host } = await fixture(t);
  const project = { project_id: ID.project_id };
  assert.equal(host.features.resolve('f.free', project).effective, 'ON');
  await feature(host, [{ id: 'f.free', scope: project, state: 'OFF' }]);
  assert.equal(host.features.resolve('f.free', project).effective, 'OFF');
  assert.equal(host.features.resolve('f.free', { project_id: 'other' }).effective, 'ON');
  await feature(host, [{ id: 'f.free', scope: project, state: 'INHERIT' }]);
  assert.equal(host.features.resolve('f.free', project).effective, 'ON');
  await feature(host, [{ id: 'f.free', scope: {}, state: 'OFF' }, { id: 'f.free', scope: project, state: 'ON' }]);
  assert.equal(host.features.resolve('f.free', project).effective, 'OFF');
});
test('FT: unknown IDs, illegal scopes and non-admin payloads rejected', async t => {
  const { host } = await fixture(t, [{ ...definition('f.free'), scopes: ['G'] }]);
  assert.throws(() => host.features.resolve('invented'), { code: 'UNKNOWN_FEATURE' });
  await assert.rejects(host.administration.previewFeatures([{ id: 'f.free', scope: { project_id: 'p' }, state: 'OFF' }], 0), { code: 'INVALID_SCOPE' });
  await assert.rejects(host.features.preview({ admin: true }, [{ id: 'f.free', scope: {}, state: 'OFF' }], 0), { code: 'ADMIN_CAPABILITY_REQUIRED' });
  assert.equal(host.features.resolve('f.free').effective, 'ON');
});
test('FT-DEPENDENCY: rejects partial disable and does not enable a dependency implicitly', async t => {
  const { host } = await fixture(t, [definition('parent'), definition('child', 'ON', ['parent']), definition('off-parent','OFF'), definition('off-child','OFF',['off-parent'])]);
  await assert.rejects(host.administration.previewFeatures([{ id: 'parent', scope: {}, state: 'OFF' }], 0), { code: 'DEPENDENCY_CHANGE_REQUIRED' });
  await assert.rejects(host.administration.previewFeatures([{ id: 'off-child', scope: {}, state: 'ON' }], 0), { code: 'DEPENDENCY_CHANGE_REQUIRED' });
  assert.equal(host.features.resolve('off-parent').effective, 'OFF');
  await feature(host, [{ id: 'parent', scope: {}, state: 'OFF' }, { id: 'child', scope: {}, state: 'OFF' }]);
  assert.equal(host.features.resolve('child').effective, 'OFF');
});
test('FT: mutual conflict, wrong preview hash and stale revision cannot commit', async t => {
  const { host } = await fixture(t, [definition('a','OFF',[],['b']), definition('b','OFF',[],['a'])]);
  await assert.rejects(host.administration.previewFeatures([{ id:'a',scope:{},state:'ON' }, { id:'b',scope:{},state:'ON' }], 0), { code:'DEPENDENCY_CHANGE_REQUIRED' });
  const p = await host.administration.previewFeatures([{id:'a',scope:{},state:'ON'}],0);
  await assert.rejects(host.administration.commitFeatures(p.challenge_id,'0'.repeat(64)), {code:'PREVIEW_HASH_MISMATCH'});
  await host.administration.recoverModule('a');
  await feature(host,[{id:'b',scope:{},state:'OFF'}]);
  await assert.rejects(host.administration.commitFeatures(p.challenge_id,p.preview_hash),{code:'REVISION_CONFLICT'});
});
test('FT-OFF: live work aborts; failure remains FAILED until explicit recovery', async t => {
  const { host } = await fixture(t);
  const lease = host.features.acquire('f.free');
  const p = await host.administration.previewFeatures([{ id:'f.free',scope:{},state:'OFF'}],0);
  await assert.rejects(host.administration.commitFeatures(p.challenge_id,p.preview_hash), {code:'MODULE_STILL_RUNNING'});
  assert.equal(lease.signal.aborted,true);
  assert.equal(host.features.resolve('f.free').effective,'BLOCKED');
  assert.equal(host.features.resolve('f.free').health,'FAILED');
  await assert.rejects(host.administration.recoverModule('f.free'),{code:'MODULE_STILL_RUNNING'});
  lease.release(); await host.administration.recoverModule('f.free');
  assert.equal(host.features.resolve('f.free').effective,'ON');
  await feature(host,[{id:'f.free',scope:{},state:'OFF'}]);
  assert.throws(()=>host.features.acquire('f.free'),{code:'FEATURE_OFF'});
});
test('FT-RETAIN: configuration survives real reopen, facts remain and old epoch is invalid', async t => {
  const base = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'controls'); await mkdir(base,{recursive:true});
  const root = await mkdtemp(join(base,'restart-')); const defs=[definition('f.free')];
  let host=await openHost(root,{definitions:defs,policies:POLICY}); host.administration.registerModule('f.free');
  const epoch=host.administration.metadata().feature_epoch;
  await feature(host,[{id:'f.free',scope:{},state:'OFF'}]); const before=host.store.query('audit',{}).length;
  await host.close(); host=await openHost(root,{definitions:defs,policies:POLICY}); host.administration.registerModule('f.free');
  t.after(()=>host.close());
  assert.equal(host.features.resolve('f.free').effective,'OFF');
  assert.ok(host.store.query('audit',{}).length>=before);
  assert.throws(()=>host.features.assertEpoch(epoch),{code:'FEATURE_EPOCH_STALE'});
});
test('FT-INHERIT-OFF: ON to INHERIT must quiesce when default is OFF', async t => {
  const {host}=await fixture(t,[definition('f.free','OFF')]);
  await feature(host,[{id:'f.free',scope:{},state:'ON'}]);
  const lease=host.features.acquire('f.free');
  const p=await host.administration.previewFeatures([{id:'f.free',scope:{},state:'INHERIT'}],host.administration.metadata().feature_revision);
  try { await assert.rejects(host.administration.commitFeatures(p.challenge_id,p.preview_hash),{code:'MODULE_STILL_RUNNING'});assert.equal(lease.signal.aborted,true);assert.equal(host.features.resolve('f.free').effective,'BLOCKED'); }
  finally { lease.release(); }
  await host.administration.recoverModule('f.free');
  await feature(host,[{id:'f.free',scope:{},state:'INHERIT'}]);assert.equal(host.features.resolve('f.free').effective,'OFF');
});
test('FT-LATE-STOP: timeout cannot recover or enable until the old stop actually settles',async t=>{
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'controls');await mkdir(base,{recursive:true});
  const host=await openHost(await mkdtemp(join(base,'stop-race-')),{definitions:[definition('late')],policies:POLICY});
  let finish!:()=>void,ready=true,preflights=0;const pending=new Promise<void>(r=>finish=r);
  host.administration.registerModule('late',{stop:async()=>{await pending;ready=false;},preflight:async()=>{preflights++;ready=true;}});
  t.after(async()=>{finish();await delay(1);await host.close();});
  const p=await host.administration.previewFeatures([{id:'late',scope:{},state:'OFF'}],0);
  await assert.rejects(host.administration.commitFeatures(p.challenge_id,p.preview_hash),{code:'DRAIN_TIMEOUT'});
  await assert.rejects(host.administration.recoverModule('late'),{code:'MODULE_STOP_PENDING'});
  assert.equal(preflights,0);assert.equal(host.features.resolve('late').health,'FAILED');
  finish();await delay(1);assert.equal(ready,false);await host.administration.recoverModule('late');
  assert.equal(ready,true);assert.equal(host.features.resolve('late').effective,'ON');
});
test('FT catalog is capacity, unimplemented module never becomes enabled from default ON', async t => {
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'controls');await mkdir(base,{recursive:true});
  const host=await openHost(await mkdtemp(join(base,'catalog-')));t.after(()=>host.close());
  const r=host.features.resolve('native.harness');
  assert.equal(r.desired,'ON');assert.equal(r.effective,'BLOCKED');assert.equal(r.reason,'NOT_IMPLEMENTED');
});
test('P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected', async t => {
  const {host}=await fixture(t);
  const req:ModeRequest={scope:{},mode:'AUDIT_ONLY',policy_ids:['P.DI_SYNTAX'],reason:'verification',expires_at:new Date(Date.now()+60000).toISOString()};
  await assert.rejects(host.policy.prepare({admin:true},req,0),{code:'ADMIN_CAPABILITY_REQUIRED'});
  await assert.rejects(host.administration.prepareMode({...req,policy_ids:['P.IDENTITY']},0),{code:'NON_DEGRADABLE_POLICY'});
  await assert.rejects(host.administration.prepareMode({...req,reason:''},0),{code:'MODE_REASON_REQUIRED'});
  assert.equal(host.policy.modeFor('P.DI_SYNTAX',{}),'ENFORCE');
});
test('P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay', async t => {
  const {host}=await fixture(t);const req:ModeRequest={scope:{},mode:'AUDIT_ONLY',policy_ids:['P.DI_SYNTAX'],reason:'verification',expires_at:new Date(Date.now()+60000).toISOString()};
  const p=await host.administration.prepareMode(req,0);
  await assert.rejects(host.administration.commitMode(p.challenge_id,p.preview_hash),{code:'DOUBLE_CONFIRM_REQUIRED'});
  await assert.rejects(host.administration.confirmMode(p.challenge_id,'RISK_ACK',p.preview_hash),{code:'CONFIRMATION_ORDER'});
  await host.administration.confirmMode(p.challenge_id,'PREVIEW_ACK',p.preview_hash);
  await assert.rejects(host.administration.confirmMode(p.challenge_id,'PREVIEW_ACK',p.preview_hash),{code:'CONFIRMATION_ORDER'});
  await host.administration.confirmMode(p.challenge_id,'RISK_ACK',p.preview_hash);
  await host.administration.commitMode(p.challenge_id,p.preview_hash);
  await assert.rejects(host.administration.commitMode(p.challenge_id,p.preview_hash),{code:'CHALLENGE_REPLAY'});
});
test('P.MODE: same denied request has distinct enforce/audit/disabled behavior', async t => {
  let calls=0;
  const {host}=await fixture(t,undefined,{ruleEvaluator:()=>{calls++;return 'DENY';}});
  assert.equal(host.policy.evaluate(['P.DI_SYNTAX'],context()).allowed,false);assert.equal(calls,1);
  await mode(host,'AUDIT_ONLY');const audit=host.policy.evaluate(['P.DI_SYNTAX'],context());
  assert.equal(audit.allowed,true);assert.equal(audit.facts[0].result,'WOULD_DENY');assert.equal(calls,2);
  await mode(host,'DISABLED');const disabled=host.policy.evaluate(['P.DI_SYNTAX'],context());
  assert.equal(disabled.allowed,true);assert.equal(disabled.facts[0].result,'BYPASSED');assert.equal(disabled.facts[0].original_verdict,'NOT_EVALUATED');assert.equal(calls,2);
  assert.throws(()=>host.policy.evaluate(['P.IDENTITY'],context()),{code:'INDEPENDENT_POLICY_OWNER'});
});
test('P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap', async t => {
  const {host}=await fixture(t);
  await mode(host,'DISABLED',['P.DI_SYNTAX']);
  assert.equal(host.policy.modeFor('P.COMMAND_RISK',{project_id:ID.project_id}),'ENFORCE');
  await mode(host,'ENFORCE',['P.DI_SYNTAX'],{project_id:ID.project_id});
  assert.equal(host.policy.modeFor('P.DI_SYNTAX',{project_id:ID.project_id}),'ENFORCE');
  assert.equal(host.policy.modeFor('P.DI_SYNTAX',{project_id:'other'}),'DISABLED');
});
test('P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP', async t => {
  const {host}=await fixture(t,undefined,{ruleEvaluator:()=>{throw new Error('actual local evaluator failure');}});
  assert.throws(()=>host.policy.evaluate(['P.DI_SYNTAX'],context()),{code:'POLICY_UNAVAILABLE'});
  await mode(host,'AUDIT_ONLY');assert.throws(()=>host.policy.evaluate(['P.DI_SYNTAX'],context()),{code:'POLICY_UNAVAILABLE'});
  assert.equal(host.policy.modeFor('P.DI_SYNTAX',{}),'AUDIT_ONLY');
  await mode(host,'DISABLED');assert.equal(host.policy.evaluate(['P.DI_SYNTAX'],context()).allowed,true);
});
test('P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight', async t => {
  const {host}=await fixture(t);await mode(host,'AUDIT_ONLY',['P.DI_SYNTAX'],{},1000);
  await delay(1100);
  assert.throws(()=>host.policy.evaluate(['P.DI_SYNTAX'],context()),{code:'ENFORCE_PENDING_PREFLIGHT'});
  await host.store.flush();await host.administration.completePreflight({});
  assert.equal(host.policy.modeFor('P.DI_SYNTAX',{}),'ENFORCE');
  assert.equal(host.policy.evaluate(['P.DI_SYNTAX'],context()).allowed,false);
});
test('P.MODE-RECOVERY: reboot never restores a permissive lease without preflight', async t => {
  const base=resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.2/test-data', 'controls');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'mode-restart-'));const defs=[definition('f.free')];
  let host=await openHost(root,{definitions:defs,policies:POLICY});host.administration.registerModule('f.free');
  await mode(host,'DISABLED');await host.close();
  host=await openHost(root,{definitions:defs,policies:POLICY});t.after(()=>host.close());
  assert.throws(()=>host.policy.modeFor('P.DI_SYNTAX',{}),{code:'ENFORCE_PENDING_PREFLIGHT'});
  await host.administration.completePreflight({});assert.equal(host.policy.modeFor('P.DI_SYNTAX',{}),'ENFORCE');
});
test('P.APPROVAL: hash/identity/epoch/expiry bind grants and no self-reported approval', async t => {
  const {host}=await fixture(t);
  const id=await host.administration.approve('a'.repeat(64),ID,'explicit verification');
  assert.equal(host.policy.approvalValid(id,'a'.repeat(64),ID),true);
  assert.equal(host.policy.approvalValid(id,'b'.repeat(64),ID),false);
  assert.equal(host.policy.approvalValid(id,'a'.repeat(64),{...ID,agent_id:'other'}),false);
  assert.equal(host.policy.approvalValid('user-says-approved','a'.repeat(64),ID),false);
  await feature(host,[{id:'f.free',scope:{},state:'OFF'}]);
  assert.equal(host.policy.approvalValid(id,'a'.repeat(64),ID),false);
});
test('P.APPROVAL-EXPIRY: real expiry cannot revive under an in-process clock rollback',async t=>{
  const{host}=await fixture(t);const grant=await host.administration.approve('a'.repeat(64),ID,'Short synthetic grant',30);
  await delay(45);assert.equal(host.policy.approvalValid(grant,'a'.repeat(64),ID),false);
  const realNow=Date.now();const mock=t.mock.method(Date,'now',()=>realNow-10000);
  try{assert.equal(host.policy.approvalValid(grant,'a'.repeat(64),ID),false);}finally{mock.mock.restore();}
});
test('Json canonical contract rejects accessors/cycles/nonfinite numbers',()=>{
  assert.throws(()=>canonical({get key(){throw new Error('must not run getter');}}),{code:'JSON_ACCESSOR'});
  const cyclic:any={};cyclic.x=cyclic;assert.throws(()=>canonical(cyclic),{code:'JSON_CYCLE'});
  assert.throws(()=>canonical({a:NaN}),{code:'JSON_NUMBER'});
  assert.equal(canonical({b:1,a:2}),'\u007b"a":2,"b":1\u007d');
});
