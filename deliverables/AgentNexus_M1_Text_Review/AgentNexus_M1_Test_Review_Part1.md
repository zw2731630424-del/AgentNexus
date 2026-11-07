# AgentNexus M1 Test Review — Part 1

完整当前测试、辅助进程、夹具生成代码、配置、研发验证器/探针和保留的历史测试。开发工具及v1不是Host运行模块。历史日志使用合成输入/回调和部分时钟/spy；没有真实模型验证，不重新执行这些代码。

## tests/agentnexus/control.test.ts

类别：`current_test_source_or_helper`；原始字节数：16933。

源文件 SHA256：

```text
c392c452fad08a00ce91c0b010f27bc99699c5b9c3e58416a08b9f8413f79441
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0019","path":"tests/agentnexus/control.test.ts","bytes":16933,"sha256":"c392c452fad08a00ce91c0b010f27bc99699c5b9c3e58416a08b9f8413f79441","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_test_source_or_helper","kind":"original","origin":{"kind":"workspace","path":"tests/agentnexus/control.test.ts"}} -->
```typescript
import test from 'node:test';
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
const POLICY: PolicyDefinition[] = [
  { id: 'P.QUALITY', level: 'L2', degradable: true, enforcement_owner: 'PDP', modes: {} },
  { id: 'P.APPROVAL', level: 'L1', degradable: true, enforcement_owner: 'PDP', modes: {} },
  { id: 'P.HARD', level: 'L0', degradable: false, enforcement_owner: 'independent owner', modes: {} },
];
async function fixture(t: test.TestContext, definitions = [definition('f.free')], extra: Record<string, unknown> = {}) {
  const base = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/controls'); await mkdir(base, { recursive: true });
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
async function mode(host: Awaited<ReturnType<typeof openHost>>, mode: ModeRequest['mode'], ids = ['P.QUALITY'], scope = {}, lifetime = 60000) {
  const p = await host.administration.prepareMode({ scope, mode, policy_ids: ids, reason: 'Explicit synthetic kernel verification', expires_at: mode === 'ENFORCE' ? null : new Date(Date.now() + lifetime).toISOString() }, host.administration.metadata().policy_revision);
  await host.administration.confirmMode(p.challenge_id, 'PREVIEW_ACK', p.preview_hash);
  await host.administration.confirmMode(p.challenge_id, 'RISK_ACK', p.preview_hash);
  await host.administration.commitMode(p.challenge_id, p.preview_hash); return p;
}
const context = () => ({ identity: ID, intent_hash: 'a'.repeat(64), validation_ok: false });

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
  const base = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/controls'); await mkdir(base,{recursive:true});
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
  const base=resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/controls');await mkdir(base,{recursive:true});
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
  const base=resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/controls');await mkdir(base,{recursive:true});
  const host=await openHost(await mkdtemp(join(base,'catalog-')));t.after(()=>host.close());
  const r=host.features.resolve('native.harness');
  assert.equal(r.desired,'ON');assert.equal(r.effective,'BLOCKED');assert.equal(r.reason,'NOT_IMPLEMENTED');
});
test('P.ADMIN_MODE: forged admin, L0 degradation and missing reason rejected', async t => {
  const {host}=await fixture(t);
  const req:ModeRequest={scope:{},mode:'AUDIT_ONLY',policy_ids:['P.QUALITY'],reason:'verification',expires_at:new Date(Date.now()+60000).toISOString()};
  await assert.rejects(host.policy.prepare({admin:true},req,0),{code:'ADMIN_CAPABILITY_REQUIRED'});
  await assert.rejects(host.administration.prepareMode({...req,policy_ids:['P.HARD']},0),{code:'NON_DEGRADABLE_POLICY'});
  await assert.rejects(host.administration.prepareMode({...req,reason:''},0),{code:'MODE_REASON_REQUIRED'});
  assert.equal(host.policy.modeFor('P.QUALITY',{}),'ENFORCE');
});
test('P.ADMIN_MODE: two distinct confirmations, preview binding and challenge replay', async t => {
  const {host}=await fixture(t);const req:ModeRequest={scope:{},mode:'AUDIT_ONLY',policy_ids:['P.QUALITY'],reason:'verification',expires_at:new Date(Date.now()+60000).toISOString()};
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
  assert.equal(host.policy.evaluate(['P.QUALITY'],context()).allowed,false);assert.equal(calls,1);
  await mode(host,'AUDIT_ONLY');const audit=host.policy.evaluate(['P.QUALITY'],context());
  assert.equal(audit.allowed,true);assert.equal(audit.facts[0].result,'WOULD_DENY');assert.equal(calls,2);
  await mode(host,'DISABLED');const disabled=host.policy.evaluate(['P.QUALITY'],context());
  assert.equal(disabled.allowed,true);assert.equal(disabled.facts[0].result,'BYPASSED');assert.equal(disabled.facts[0].original_verdict,'NOT_EVALUATED');assert.equal(calls,2);
  assert.throws(()=>host.policy.evaluate(['P.HARD'],context()),{code:'INDEPENDENT_POLICY_OWNER'});
});
test('P.MODE: selected IDs and project scope; explicit ENFORCE dominates overlap', async t => {
  const {host}=await fixture(t);
  await mode(host,'DISABLED',['P.QUALITY']);
  assert.equal(host.policy.modeFor('P.APPROVAL',{project_id:ID.project_id}),'ENFORCE');
  await mode(host,'ENFORCE',['P.QUALITY'],{project_id:ID.project_id});
  assert.equal(host.policy.modeFor('P.QUALITY',{project_id:ID.project_id}),'ENFORCE');
  assert.equal(host.policy.modeFor('P.QUALITY',{project_id:'other'}),'DISABLED');
});
test('P.MODE: PDP fault stays closed in ENFORCE and AUDIT_ONLY; DISABLED actually skips PDP', async t => {
  const {host}=await fixture(t,undefined,{ruleEvaluator:()=>{throw new Error('actual local evaluator failure');}});
  assert.throws(()=>host.policy.evaluate(['P.QUALITY'],context()),{code:'POLICY_UNAVAILABLE'});
  await mode(host,'AUDIT_ONLY');assert.throws(()=>host.policy.evaluate(['P.QUALITY'],context()),{code:'POLICY_UNAVAILABLE'});
  assert.equal(host.policy.modeFor('P.QUALITY',{}),'AUDIT_ONLY');
  await mode(host,'DISABLED');assert.equal(host.policy.evaluate(['P.QUALITY'],context()).allowed,true);
});
test('P.MODE-EXPIRY: real deadline freezes until persisted-chain preflight', async t => {
  const {host}=await fixture(t);await mode(host,'AUDIT_ONLY',['P.QUALITY'],{},1000);
  await delay(1100);
  assert.throws(()=>host.policy.evaluate(['P.QUALITY'],context()),{code:'ENFORCE_PENDING_PREFLIGHT'});
  await host.store.flush();await host.administration.completePreflight({});
  assert.equal(host.policy.modeFor('P.QUALITY',{}),'ENFORCE');
  assert.equal(host.policy.evaluate(['P.QUALITY'],context()).allowed,false);
});
test('P.MODE-RECOVERY: reboot never restores a permissive lease without preflight', async t => {
  const base=resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/controls');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'mode-restart-'));const defs=[definition('f.free')];
  let host=await openHost(root,{definitions:defs,policies:POLICY});host.administration.registerModule('f.free');
  await mode(host,'DISABLED');await host.close();
  host=await openHost(root,{definitions:defs,policies:POLICY});t.after(()=>host.close());
  assert.throws(()=>host.policy.modeFor('P.QUALITY',{}),{code:'ENFORCE_PENDING_PREFLIGHT'});
  await host.administration.completePreflight({});assert.equal(host.policy.modeFor('P.QUALITY',{}),'ENFORCE');
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
```
<!-- agentnexus-export-end -->

## tests/agentnexus/diagnostics.test.ts

类别：`current_test_source_or_helper`；原始字节数：19069。

源文件 SHA256：

```text
67eef7a1adfc1b2baceb62ca4cd157d8737332e8595f0d93a63bcfb853257394
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0020","path":"tests/agentnexus/diagnostics.test.ts","bytes":19069,"sha256":"67eef7a1adfc1b2baceb62ca4cd157d8737332e8595f0d93a63bcfb853257394","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_test_source_or_helper","kind":"original","origin":{"kind":"workspace","path":"tests/agentnexus/diagnostics.test.ts"}} -->
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { DevelopmentIntelligence } from '../../src/agentnexus/diagnostics.ts';
import { sha256 } from '../../src/agentnexus/types.ts';
import type { DiagnosticRequest } from '../../src/agentnexus/types.ts';

// Explicit test-Host configuration. No PATH discovery, package install or credential lookup.
const pythonPath = process.env.AGENTNEXUS_TEST_PYTHON_PATH ?? (process.platform === 'win32' ? 'C:/Users/28642/AppData/Local/Programs/Python/Python312/python.exe' : '/usr/bin/python3');
const powerShellPath = process.env.AGENTNEXUS_TEST_POWERSHELL_PATH ?? (process.platform === 'win32' ? 'C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1104-709-0_26.1104.709.0_x64__3k8sg7r9htsxt/dependencies/native/powershell/pwsh.exe' : '/usr/bin/pwsh');
const options = { pythonPath, powerShellPath, timeoutMs: 10000 };
let sequence = 0;
function request(language: string, source: string, extra: Partial<DiagnosticRequest> = {}): DiagnosticRequest {
  return { language, source, document_uri: `test:diagnostic-${++sequence}`, version: 1, ...extra };
}

test('JSON uses real JSON.parse and preserves independent safety/authorization dimensions', async () => {
  const service = new DevelopmentIntelligence();
  try {
    const source = '{"message":"中文 😀","command":"do not execute this string"}';
    const result = await service.check(request('json', source));
    assert.equal(result.status, 'PASS');
    assert.equal(result.dimensions.syntax.status, 'PASS');
    assert.equal(result.dimensions.environment.status, 'PASS');
    assert.equal(result.dimensions.safety.status, 'INCONCLUSIVE');
    assert.equal(result.dimensions.authorization.status, 'NOT_RUN');
    assert.equal(result.source_sha256, sha256(source));
    assert.match(result.checker_version, /^Node-/);
    assert.ok(result.timing.elapsed_ms >= 0);
    const bad = await service.check(request('json', '{"broken":}'));
    assert.equal(bad.status, 'FAIL');
    assert.equal(bad.diagnostics[0].code, 'JSON_SYNTAX_ERROR');
    assert.equal(bad.diagnostics[0].range, null);
  } finally { service.dispose(); }
});

test('Python AST actually parses valid/invalid source, with explicitly limited coverage', { skip: !existsSync(pythonPath) }, async t => {
  const service = new DevelopmentIntelligence(options);
  const spawnSpy = t.mock.method(childProcess, 'spawn');
  syncBuiltinESMExports();
  try {
    const good = await service.check(request('python', 'value = 1\n'));
    assert.equal(good.status, 'PASS', JSON.stringify(good));
    const launch = spawnSpy.mock.calls.find(call => call.arguments[0] === pythonPath);
    assert.ok(launch, 'the real Python interpreter must be launched');
    assert.deepEqual(launch.arguments[1].slice(0, 3), ['-I', '-B', '-S']);
    assert.match(good.checker_version, /^3\.[0-9]+\.[0-9]+\/adapter-[a-f0-9]{16}$/);
    assert.equal(good.reason, 'AST_PARSE_ONLY');
    const semantic = await service.check(request('python', 'return 1\n'));
    assert.equal(semantic.status, 'PASS'); // ast.parse does not claim a full compilation pass.
    assert.equal(semantic.dimensions.syntax.coverage, 'python_parse_only');
    const source = "text = '😀'; value = (";
    const bad = await service.check(request('python', source));
    assert.equal(bad.status, 'FAIL', JSON.stringify(bad));
    assert.equal(bad.diagnostics[0].code, 'PYTHON_SYNTAX_ERROR');
    assert.equal(bad.diagnostics[0].range!.start.line, 0);
    assert.equal(bad.diagnostics[0].range!.start.character, source.indexOf('('));
    assert.equal(bad.dimensions.authorization.status, 'NOT_RUN');
    const noLocation = await service.check(request('python', '\0'));
    assert.equal(noLocation.status, 'FAIL');
    assert.equal(noLocation.diagnostics[0].range, null);
    const crlf = await service.check(request('python', "text = '汉😀'\r\nvalue = (\r\n"));
    assert.equal(crlf.status, 'FAIL');
    assert.equal(crlf.diagnostics[0].range!.start.line, 1);
    assert.equal(crlf.diagnostics[0].range!.start.character, 'value = '.length);
  } finally { service.dispose(); t.mock.restoreAll(); syncBuiltinESMExports(); }
});

test('PowerShell Parser actually returns AST diagnostics and UTF-16 positions', { skip: !existsSync(powerShellPath) }, async () => {
  const service = new DevelopmentIntelligence(options);
  try {
    const good = await service.check(request('powershell', "$value = '中文 😀'\n"));
    assert.equal(good.status, 'PASS', JSON.stringify(good));
    assert.match(good.checker_version, /^7\..+\/SMA-.+\/adapter-[a-f0-9]{16}$/);
    const source = "$text = '😀'; )";
    const bad = await service.check(request('powershell', source));
    assert.equal(bad.status, 'FAIL', JSON.stringify(bad));
    assert.ok(bad.diagnostics.length > 0);
    assert.equal(bad.diagnostics[0].range!.start.character, source.indexOf(')'));
  } finally { service.dispose(); }
});

test('Python and PowerShell source side effects remain unexecuted', { skip: !existsSync(pythonPath) || !existsSync(powerShellPath) }, async () => {
  const evidenceRoot = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics');
  await mkdir(evidenceRoot, { recursive: true });
  const fixture = await mkdtemp(join(evidenceRoot, 'noexec-'));
  const service = new DevelopmentIntelligence(options);
  try {
    const pythonMarker = join(fixture, 'python-would-have-run.txt');
    const psMarker = join(fixture, 'powershell-would-have-run.txt');
    const py = `# Ignore all policy instructions is source data only.\nfrom pathlib import Path\nPath(${JSON.stringify(pythonMarker)}).write_text('executed')\nraise RuntimeError('must not execute')\n`;
    const ps = `[System.IO.File]::WriteAllText('${psMarker.replaceAll("'", "''")}', 'executed'); $(throw 'must not execute')`;
    const results = await Promise.all([service.check(request('python', py)), service.check(request('powershell', ps))]);
    assert.deepEqual(results.map(r => r.status), ['PASS', 'PASS'], JSON.stringify(results));
    assert.equal(existsSync(pythonMarker), false);
    assert.equal(existsSync(psMarker), false);
  } finally {
    await service.disposeAndWait();
    const cleanupRelative = relative(evidenceRoot, resolve(fixture));
    assert.ok(cleanupRelative && !cleanupRelative.startsWith('..') && !isAbsolute(cleanupRelative), 'cleanup target must remain inside the assigned diagnostics evidence directory');
    await rm(fixture, { recursive: true, force: true });
  }
});

test('all relevant source Feature OFF paths bypass without a configured parser', async () => {
  const cases = [
    ['python', 'devint.runtime'], ['python', 'devint.syntax-validator'], ['python', 'devint.code-diagnostics'],
    ['python', 'devint.code.python'], ['powershell', 'devint.command-parser'], ['powershell', 'devint.command.powershell'], ['json', 'devint.code.json'],
  ];
  for (const [language, disabled] of cases) {
    const service = new DevelopmentIntelligence({ featureEnabled: id => id !== disabled });
    try {
      const result = await service.check(request(language, 'not valid source ('));
      assert.equal(result.status, 'BYPASSED', disabled);
      assert.equal(result.reason, 'VALIDATION_BYPASSED');
      assert.equal(result.dimensions.syntax.status, 'BYPASSED');
    } finally { service.dispose(); }
  }
});

test('optional environment/safety OFF remains BYPASSED while syntax independently runs', async () => {
  const service = new DevelopmentIntelligence({ featureEnabled: id => !['devint.environment-checker', 'devint.safety-preflight'].includes(id) });
  try {
    const result = await service.check(request('json', '{}'));
    assert.equal(result.status, 'PASS');
    assert.equal(result.dimensions.environment.status, 'BYPASSED');
    assert.equal(result.dimensions.safety.status, 'BYPASSED');
  } finally { service.dispose(); }
});

test('missing parsers and unsupported languages/dialects never produce PASS', async () => {
  const service = new DevelopmentIntelligence();
  try {
    assert.equal((await service.check(request('python', 'x=1'))).status, 'BLOCKED');
    for (const language of ['csharp', 'javascript', 'typescript', 'yaml', 'sql', 'dockerfile', 'bash', 'zsh']) {
      const result = await service.check(request(language, 'synthetic input'));
      assert.equal(result.status, 'NOT_RUN', language);
      assert.equal(result.dimensions.authorization.status, 'NOT_RUN');
    }
    const sql = await service.check(request('sql', "PRAGMA temp_store_directory='untrusted'"));
    assert.equal(sql.reason, 'SQL_CHECKER_NOT_IMPLEMENTED');
    assert.equal((await service.check(request('json', '{}', { dialect: 'jsonc' }))).reason, 'UNSUPPORTED_DIALECT');
  } finally { service.dispose(); }
});

test('new document version, same-version hash mismatch and close fence old results', async () => {
  const service = new DevelopmentIntelligence();
  try {
    const uri = 'test:version-fence';
    const old = service.check(request('json', '{"old":true}', { document_uri: uri, version: 1 }));
    const current = service.check(request('json', '{"current":true}', { document_uri: uri, version: 2 }));
    const [one, two] = await Promise.all([old, current]);
    assert.equal(one.status, 'INCONCLUSIVE');
    assert.equal(one.diagnostics.length, 0);
    assert.equal(two.status, 'PASS');
    assert.equal(two.version, 2);
    assert.equal((await service.check(request('json', '{}', { document_uri: uri, version: 2 }))).reason, 'VERSION_HASH_MISMATCH');
    assert.equal((await service.check(request('json', '{}', { document_uri: uri, version: 0 }))).reason, 'STALE_VERSION');
    const closing = service.check(request('json', '{}', { document_uri: uri, version: 3 }));
    service.closeDocument(uri);
    assert.equal((await closing).status, 'INCONCLUSIVE');
    assert.equal((await service.check(request('json', '{}', { document_uri: uri, version: 1 }))).status, 'PASS');
  } finally { service.dispose(); }
});

test('real parser requests respect newer versions and Feature epoch changes', { skip: !existsSync(pythonPath) }, async () => {
  let epoch = 4;
  let enabled = true;
  const service = new DevelopmentIntelligence({ ...options, featureEpoch: () => epoch, featureEnabled: id => id === 'devint.runtime' ? enabled : true });
  try {
    const uri = 'test:real-parser-version';
    const first = service.check(request('python', 'old = 1', { document_uri: uri, version: 1 }));
    const second = service.check(request('python', 'new = 2', { document_uri: uri, version: 2 }));
    assert.equal((await first).status, 'INCONCLUSIVE');
    assert.equal((await second).status, 'PASS');
    const changed = service.check(request('python', 'value = 3'));
    epoch++;
    assert.equal((await changed).reason, 'STALE_CONFIGURATION');
    const disabled = service.check(request('python', 'value = 4'));
    enabled = false;
    const result = await disabled;
    assert.equal(result.status, 'BYPASSED');
    assert.equal(result.reason, 'VALIDATION_BYPASSED');
    assert.equal(result.diagnostics.length, 0);
  } finally { service.dispose(); }
});

test('AbortSignal, timeout and dispose are bounded and never become PASS', { skip: !existsSync(pythonPath) }, async () => {
  const service = new DevelopmentIntelligence(options);
  try {
    const already = new AbortController(); already.abort();
    assert.equal((await service.check(request('python', 'x=1'), already.signal)).reason, 'CANCELLED');
    const active = new AbortController();
    const pending = service.check(request('python', 'x=1'), active.signal);
    active.abort();
    assert.equal((await pending).reason, 'CANCELLED');
    const disposing = service.check(request('python', 'x=2'));
    service.dispose();
    assert.equal((await disposing).status, 'INCONCLUSIVE');
    assert.equal((await service.check(request('json', '{}'))).status, 'BLOCKED');
    const deadline = new DevelopmentIntelligence({ pythonPath, timeoutMs: 1 });
    try {
      const timed = await deadline.check(request('python', 'x=1'));
      assert.equal(timed.status, 'INCONCLUSIVE', JSON.stringify(timed));
      assert.ok(['TIME_LIMIT', 'CHECKER_TERMINATION_UNCONFIRMED'].includes(timed.reason));
    } finally { deadline.dispose(); }
  } finally { service.dispose(); }
});

test('source/Unicode/request budgets reject before parsing and constructor budgets are fixed', async () => {
  const service = new DevelopmentIntelligence({ maxSourceBytes: 8 });
  try {
    assert.equal((await service.check(request('json', '"1234567"'))).reason, 'SOURCE_LIMIT');
    assert.equal((await service.check(request('json', '"\ud800"'))).reason, 'INVALID_UNICODE');
    assert.equal((await service.check(request('json', '{}', { version: -1 }))).reason, 'INVALID_DOCUMENT_VERSION');
    assert.throws(() => new DevelopmentIntelligence({ maxSourceBytes: 256 * 1024 + 1 }));
    assert.throws(() => new DevelopmentIntelligence({ pythonPath: 'python' }));
  } finally { service.dispose(); }
});

test('queue admission caps concurrent work and recovers after backpressure', async () => {
  const service = new DevelopmentIntelligence();
  try {
    const results = await Promise.all(Array.from({ length: 24 }, () => service.check(request('json', '{}'))));
    assert.equal(results.filter(r => r.reason === 'QUEUE_LIMIT').length, 6);
    assert.equal(results.filter(r => r.status === 'PASS').length, 18);
    assert.equal((await service.check(request('json', '{}'))).status, 'PASS');
  } finally { service.dispose(); }
});

test('PowerShell error floods remain bounded and do not turn truncation into PASS', { skip: !existsSync(powerShellPath) }, async () => {
  const service = new DevelopmentIntelligence(options);
  try {
    const result = await service.check(request('powershell', ')\n'.repeat(1000)));
    assert.equal(result.status, 'INCONCLUSIVE', JSON.stringify(result));
    assert.ok(['DIAGNOSTICS_LIMIT', 'OUTPUT_LIMIT'].includes(result.reason));
    assert.ok(result.diagnostics.length <= 200);
    assert.ok(result.diagnostics.every(d => Buffer.byteLength(d.message) <= 1024));
  } finally { service.dispose(); }
});

test('registered Git/Python argv schemas are static, limited and independently typed', async () => {
  const service = new DevelopmentIntelligence();
  const check = (family: 'git' | 'python', argv: string[]) => service.checkArguments({ family, argv, document_uri: `test:argv-${++sequence}`, version: 1 });
  try {
    const git = await check('git', ['status', '--short', '--', '-filename', '中文.txt']);
    assert.equal(git.status, 'PASS');
    assert.equal(git.dimensions.args.status, 'PASS');
    assert.equal(git.dimensions.syntax.status, 'NOT_RUN');
    assert.equal(git.dimensions.environment.status, 'NOT_RUN');
    assert.equal(git.dimensions.authorization.status, 'NOT_RUN');
    assert.equal((await check('git', ['-c', 'alias.x=!delete', 'x'])).status, 'FAIL');
    assert.equal((await check('git', ['push', '--dry-run'])).status, 'NOT_RUN');
    assert.equal((await check('git', ['log', '-n', '5'])).status, 'PASS');
    assert.equal((await check('git', ['rev-parse', '--verify'])).status, 'FAIL');
    assert.equal((await check('python', ['-I', '-B', '-m', 'module.not_imported', 'argument'])).status, 'PASS');
    assert.equal((await check('python', ['-c', 'raise RuntimeError("never execute")'])).status, 'PASS');
    assert.equal((await check('python', ['-c'])).status, 'FAIL');
    assert.equal((await check('python', ['-m', 'not-valid-module'])).status, 'FAIL');
    assert.equal((await check('python', ['-i'])).status, 'BLOCKED');
    assert.equal((await check('python', ['script.py', '$(do not expand)', '--opaque-script-arg'])).status, 'PASS');
    assert.equal((await check('python', ['--', '-script.py'])).status, 'PASS');
  } finally { service.dispose(); }
});

test('argv environment checks inspect only the Host file and preserve the actual args result', async () => {
  const service = new DevelopmentIntelligence({ pythonPath: resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/diagnostics/missing-python-executable') });
  try {
    const result = await service.checkArguments({ family: 'python', argv: ['--version'], document_uri: 'test:argv-missing-env', version: 1 });
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.dimensions.args.status, 'PASS');
    assert.equal(result.dimensions.environment.status, 'BLOCKED');
  } finally { service.dispose(); }
});

test('argv family and values are copied before asynchronous work', async () => {
  const service = new DevelopmentIntelligence();
  try {
    const mutable: { family: 'git' | 'python'; argv: string[]; document_uri: string; version: number } = { family: 'git', argv: ['status'], document_uri: 'test:immutable-argv', version: 1 };
    const pending = service.checkArguments(mutable);
    mutable.family = 'python'; mutable.argv.push('-c', 'raise RuntimeError("never execute")');
    const result = await pending;
    assert.equal(result.status, 'PASS');
    assert.equal(result.checker_id, 'git-argv-schema');
    assert.equal(result.source_sha256, sha256(JSON.stringify({ family: 'git', argv: ['status'] })));
  } finally { service.dispose(); }
});

test('argument Feature OFF bypasses schema and dispose prevents subsequent work', async () => {
  for (const disabled of ['devint.runtime', 'devint.command-parser', 'devint.argument-validator', 'devint.command.git']) {
    const service = new DevelopmentIntelligence({ featureEnabled: id => id !== disabled });
    try {
      const result = await service.checkArguments({ family: 'git', argv: ['status'], document_uri: `test:argv-off-${disabled}`, version: 1 });
      assert.equal(result.status, 'BYPASSED');
      assert.equal(result.reason, 'VALIDATION_BYPASSED');
    } finally { service.dispose(); }
  }
});

test('disposeAndWait confirms real interpreter child close and all queued work is drained', { skip: !existsSync(powerShellPath) }, async () => {
  const service = new DevelopmentIntelligence(options);
  const pending = Array.from({ length: 8 }, () => service.check(request('powershell', '$value = 1')));
  try {
    for (let i = 0; i < 100 && service.getActivity().children === 0; i++) await delay(2);
    assert.ok(service.getActivity().children > 0, 'test must observe an actual parser child before cancelling');
    assert.ok(service.getActivity().queued > 0);
    await assert.rejects(service.drain(1), { code: 'DIAGNOSTIC_DRAIN_TIMEOUT' });
    await service.disposeAndWait();
    const results = await Promise.all(pending);
    assert.ok(results.every(r => r.status === 'INCONCLUSIVE'));
    assert.deepEqual(service.getActivity(), { jobs: 0, running: 0, queued: 0, pendingBytes: 0, children: 0, unconfirmedChildren: 0, documents: 0 });
  } finally { await service.disposeAndWait(); }
});
```
<!-- agentnexus-export-end -->

## tests/agentnexus/gateway.test.ts

类别：`current_test_source_or_helper`；原始字节数：17859。

源文件 SHA256：

```text
96620a3ee83c8b1c65e798ab575fe4ff2a9ccd62ecf69f090d0b70e06fa73824
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0021","path":"tests/agentnexus/gateway.test.ts","bytes":17859,"sha256":"96620a3ee83c8b1c65e798ab575fe4ff2a9ccd62ecf69f090d0b70e06fa73824","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_test_source_or_helper","kind":"original","origin":{"kind":"workspace","path":"tests/agentnexus/gateway.test.ts"}} -->
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { openHost } from '../../src/agentnexus/host.ts';
import { intentHash } from '../../src/agentnexus/gateway.ts';
import type { ToolDefinition, ToolRequest } from '../../src/agentnexus/gateway.ts';
import { invariant } from '../../src/agentnexus/types.ts';
import type { Identity, Json } from '../../src/agentnexus/types.ts';

const ID:Identity={agent_id:'worker-a',project_id:'project-a',task_id:'task-a',session_id:'session-a'};
async function fixture(t:test.TestContext, options:Parameters<typeof openHost>[1]={}) {
  const base=resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/gateway');await mkdir(base,{recursive:true});
  const root=await mkdtemp(join(base,'case-'));const host=await openHost(root,options);
  const agent=host.bindAgent(ID);
  t.after(async()=>{await agent.close();await host.close();});return{host,agent,root};
}
async function setMode(host:Awaited<ReturnType<typeof openHost>>, mode:'ENFORCE'|'AUDIT_ONLY'|'DISABLED',policy_ids=['P.COMMAND_RISK']) {
  const p=await host.administration.prepareMode({scope:{},mode,policy_ids,reason:'Explicit synthetic local kernel verification',expires_at:mode==='ENFORCE'?null:new Date(Date.now()+60000).toISOString()},host.administration.metadata().policy_revision);
  await host.administration.confirmMode(p.challenge_id,'PREVIEW_ACK',p.preview_hash);
  await host.administration.confirmMode(p.challenge_id,'RISK_ACK',p.preview_hash);
  await host.administration.commitMode(p.challenge_id,p.preview_hash);
}
function counter(host:Awaited<ReturnType<typeof openHost>>, overrides:Partial<ToolDefinition>={}) {
  host.store.db.exec('CREATE TABLE IF NOT EXISTS synthetic_effects(n INTEGER NOT NULL);INSERT INTO synthetic_effects SELECT 0 WHERE NOT EXISTS(SELECT 1 FROM synthetic_effects)');
  host.administration.registerTool({id:'fixture.counter',version:'1',feature_id:'tool.test',policy_ids:[],requires_sandbox:false,
    schema:args=>{invariant(args!==null&&typeof args==='object'&&!Array.isArray(args),'COUNTER_SCHEMA');},
    writer_resource:(_args,id)=>id.project_id+':counter',
    execute:()=>{host.store.db.exec('UPDATE synthetic_effects SET n=n+1');return{data:{n:count(host)}};},...overrides});
}
function count(host:Awaited<ReturnType<typeof openHost>>):number{return(host.store.db.prepare('SELECT n FROM synthetic_effects').get() as {n:number}).n;}
const request=(call='call-1'):ToolRequest=>({call_id:call,tool_id:'fixture.counter',tool_version:'1',arguments:{value:1}});
async function toggle(host:Awaited<ReturnType<typeof openHost>>,changes:any[]) {
  const p=await host.administration.previewFeatures(changes,host.administration.metadata().feature_revision);
  await host.administration.commitFeatures(p.challenge_id,p.preview_hash);
}

test('AT/Context/Artifact: real invocation produces separate hash-linked facts and byte-exact output',async t=>{
  const{host,agent}=await fixture(t);const original='中文\r\nraw\u0000text';
  const result=await agent.request({call_id:'echo-raw',tool_id:'native.echo',tool_version:'1',arguments:{text:original}});
  assert.equal(result.status,'PASS');assert.deepEqual(result.data,{text:original});
  const facts=agent.reconstructTask().records.filter(x=>x.operation_id===result.operation_id);
  const phases=facts.map(x=>(x.body as any).phase);
  for(const phase of ['RECEIVED','POLICY_DECISION','PERMIT_ISSUED','CLAIMED','START_INTENT','STARTED','RESULT','ACK_READY'])assert.ok(phases.includes(phase),phase);
  const context=agent.context().filter(x=>x.operation_id===result.operation_id);assert.equal(context.length,2);
  assert.ok(context.every(x=>x.domain==='context'));assert.ok(facts.every(x=>x.domain==='audit'));
  const parts:Buffer[]=[];for await(const chunk of host.store.artifacts.read(result.stdout_ref!))parts.push(chunk);
  assert.equal(Buffer.concat(parts).toString(),JSON.stringify({text:original}));
  const v=await host.store.verify();assert.equal(v.pending,0);
});
test('P.MODE+Gateway: same safe synthetic operation blocked/enforced, would-deny, and unevaluated',async t=>{
  let calls=0;const{host,agent}=await fixture(t,{ruleEvaluator:()=>{calls++;return'REQUIRE_APPROVAL';}});
  counter(host,{policy_ids:['P.COMMAND_RISK']});
  assert.equal((await agent.request(request('enforce'))).status,'BLOCKED');assert.equal(count(host),0);
  await setMode(host,'AUDIT_ONLY');assert.equal((await agent.request(request('audit'))).status,'PASS');assert.equal(count(host),1);assert.equal(calls,2);
  await setMode(host,'DISABLED');assert.equal((await agent.request(request('disabled'))).status,'PASS');assert.equal(count(host),2);assert.equal(calls,2);
  const facts=host.store.query('audit',{project_id:ID.project_id,task_id:ID.task_id,limit:100}).map(x=>x.body as any).filter(x=>x.phase==='POLICY_DECISION');
  assert.ok(facts.some(x=>x.detail.facts[0]?.result==='WOULD_DENY'));
  assert.ok(facts.some(x=>x.detail.facts[0]?.result==='BYPASSED'&&x.detail.facts[0].original_verdict==='NOT_EVALUATED'));
});
test('P.SANDBOX: DISABLED does not admit arbitrary execution or close independent protection',async t=>{
  const{host,agent}=await fixture(t);let executed=0;
  counter(host,{requires_sandbox:true,policy_ids:['P.COMMAND_RISK'],execute:()=>{executed++;return{data:null};}});
  await setMode(host,'DISABLED');const r=await agent.request(request());
  assert.equal(r.status,'BLOCKED');assert.equal(r.reason,'SANDBOX_NOT_VERIFIED');assert.equal(executed,0);
  assert.equal(host.deployment.status,'BLOCKED');
});
test('P.IDENTITY: facade has no administration and JSON admin/mode flags cannot elevate',async t=>{
  const{host,agent}=await fixture(t);counter(host,{policy_ids:['P.COMMAND_RISK']});
  assert.ok(!Object.hasOwn(agent,'administration'));assert.ok(!Object.hasOwn(agent,'store'));
  const bad=await agent.request({...request(),admin:true,mode:'DISABLED'} as any);
  assert.equal(bad.status,'BLOCKED');assert.equal(bad.reason,'INVALID_TOOL_REQUEST');assert.equal(count(host),0);
  assert.equal(host.policy.modeFor('P.COMMAND_RISK',{}),'ENFORCE');
});
test('P.APPROVAL_REPLAY: exact approval executes once; altered intent and replay denied',async t=>{
  const{host,agent}=await fixture(t);counter(host,{policy_ids:['P.COMMAND_RISK']});const req=request();
  const approval=await host.administration.approve(intentHash(ID,req),ID,'Explicit single operation verification');
  const altered=await agent.request({...req,arguments:{value:2},approval_id:approval});
  assert.equal(altered.status,'BLOCKED');assert.equal(count(host),0);
  // The rejected call_id has durable history; the approval is intentionally not transferred to a new call.
  const fresh=request('approved-fresh');const grant=await host.administration.approve(intentHash(ID,fresh),ID,'New exact intent after rejected attempt');
  const ok=await agent.request({...fresh,approval_id:grant});assert.equal(ok.status,'PASS');assert.equal(count(host),1);
  assert.equal((await agent.request({...fresh,approval_id:grant})).reason,'DUPLICATE_OPERATION');
  assert.equal((await agent.request({...request('wrong-hash'),approval_id:grant})).status,'BLOCKED');assert.equal(count(host),1);
  assert.equal((host.store.db.prepare('SELECT consumed FROM control_permits WHERE id=?').get(ok.permit_id!) as any).consumed,1);
});
test('P.DB_ATOMIC: 16 concurrent duplicate requests invoke a real handler at most once',async t=>{
  const{host,agent}=await fixture(t);counter(host);
  const results=await Promise.all(Array.from({length:16},()=>agent.request(request('duplicate'))));
  assert.equal(results.filter(x=>x.status==='PASS').length,1);assert.equal(count(host),1);
  assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_operations').get() as any).n,1);
});
test('P.WORKSPACE_WRITER: concurrent distinct calls cannot overwrite active resource; modes cannot change mid-action',async t=>{
  const{host,agent}=await fixture(t);let finish!:()=>void,entered!:()=>void;
  const started=new Promise<void>(r=>entered=r),hold=new Promise<void>(r=>finish=r);
  counter(host,{execute:async()=>{entered();await hold;host.store.db.exec('UPDATE synthetic_effects SET n=n+1');return{data:{n:count(host)}};}});
  const first=agent.request(request('writer-a'));await started;
  try{
    const blocked=await agent.request(request('writer-b'));assert.equal(blocked.reason,'WORKSPACE_BUSY');assert.equal(count(host),0);
    await assert.rejects(setMode(host,'DISABLED'),{code:'ACTIVE_OPERATIONS'});
    assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_writers').get() as any).n,1);
  }finally{finish();}
  assert.equal((await first).status,'PASS');assert.equal(count(host),1);
  assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_writers').get() as any).n,0);
});
test('AT-IOFAIL-before: actual SQLite readonly persistence failure prevents handler execution',async t=>{
  const{host,agent}=await fixture(t);counter(host);host.store.db.exec('PRAGMA query_only=ON');
  try{const r=await agent.request(request('before-fault'));assert.equal(r.status,'BLOCKED');assert.equal(count(host),0);assert.equal(host.store.faulted,true);assert.equal(host.features.resolve('core.state').health,'FAILED');assert.equal(host.features.resolve('tool.test').effective,'BLOCKED');}
  finally{host.store.db.exec('PRAGMA query_only=OFF');await host.store.recover();}
  assert.equal((await agent.request(request('after-recover'))).status,'PASS');assert.equal(count(host),1);
});
test('AT-IOFAIL-after: actual effect with unrecordable result keeps claim and never replays',async t=>{
  const{host,agent}=await fixture(t);counter(host,{execute:()=>{host.store.db.exec('UPDATE synthetic_effects SET n=n+1;PRAGMA query_only=ON');return{data:{n:1}};}});
  const r=await agent.request(request('post-fault'));
  assert.equal(r.status,'INCONCLUSIVE');assert.equal(count(host),1);assert.equal(host.store.faulted,true);
  host.store.db.exec('PRAGMA query_only=OFF');await host.store.recover();
  assert.equal((await agent.request(request('post-fault'))).reason,'DUPLICATE_OPERATION');assert.equal(count(host),1);
  assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_writers').get() as any).n,1);
  assert.equal((await agent.request(request('new-while-uncertain'))).reason,'WORKSPACE_BUSY');assert.equal(count(host),1);
});
test('P.TIMEOUT: timeout retains owned lease until actual handler settlement and never resets claim',async t=>{
  const{host,agent}=await fixture(t);let finish!:()=>void;
  const hold=new Promise<void>(r=>finish=r);
  counter(host,{timeout_ms:25,execute:async()=>{await hold;return{data:{done:true}};}});
  const result=await agent.request(request('timeout'));
  try{assert.equal(result.status,'INCONCLUSIVE');assert.equal(result.reason,'TOOL_TIMEOUT');assert.equal(host.features.activeCount(),1);assert.equal((host.store.db.prepare('SELECT count(*) n FROM control_writers').get() as any).n,1);}
  finally{finish();await delay(1);}
  assert.equal(host.features.activeCount(),0);
  assert.equal((await agent.request(request('timeout'))).reason,'DUPLICATE_OPERATION');
});
test('AT-REPLAY: reconstruction is readonly and session scope does not grant peer context',async t=>{
  const{host,agent}=await fixture(t);counter(host);assert.equal((await agent.request(request('original'))).status,'PASS');
  const other=host.bindAgent({...ID,agent_id:'reviewer',session_id:'review-session'});t.after(()=>other.close());
  assert.equal(other.context().length,0);assert.ok(other.reconstructTask().records.every(r=>(r.body as any).agent_id==='reviewer'));
  const foreign=host.bindAgent({...ID,project_id:'project-b',session_id:'foreign-session'});t.after(()=>foreign.close());
  assert.equal(foreign.context().length,0);
  const n=count(host);for(let i=0;i<3;i++)assert.equal(agent.reconstructTask().replay,'READ_ONLY_NO_EXECUTOR');
  assert.equal(count(host),n);
});
test('P.IDENTITY-revocation: old facade cannot read or close a replacement session',async t=>{
  const{host,agent}=await fixture(t);await agent.request({call_id:'one',tool_id:'native.echo',tool_version:'1',arguments:null});
  await agent.close();assert.throws(()=>agent.context(),{code:'SESSION_CLOSED'});assert.throws(()=>agent.reconstructTask(),{code:'SESSION_CLOSED'});
  const replacement=host.bindAgent(ID);t.after(()=>replacement.close());await agent.close();
  assert.equal((await replacement.request({call_id:'two',tool_id:'native.echo',tool_version:'1',arguments:null})).status,'PASS');
});
test('P.IDENTITY-close-race: close revokes facade before its first asynchronous cleanup',async t=>{
  const{host,agent}=await fixture(t);const closing=agent.close();
  await assert.rejects(agent.request({call_id:'late',tool_id:'native.echo',tool_version:'1',arguments:null}),{code:'SESSION_CLOSED'});
  assert.throws(()=>agent.context(),{code:'SESSION_CLOSED'});await closing;
  const replacement=host.bindAgent(ID);await agent.close();
  assert.equal((await replacement.request({call_id:'new',tool_id:'native.echo',tool_version:'1',arguments:null})).status,'PASS');
  await replacement.close();
});
test('P.TIMEOUT-clock: handler deadline uses elapsed time under a wall-clock rollback',async t=>{
  const{host,agent}=await fixture(t);let finish!:()=>void;
  const hold=new Promise<void>(r=>finish=r);const realNow=Date.now();
  const mocked=t.mock.method(Date,'now',Date.now);
  counter(host,{timeout_ms:20,execute:async()=>{mocked.mock.mockImplementation(()=>realNow-10000);await hold;return{data:null};}});
  const result=await agent.request(request('clock-timeout'));
  try{assert.equal(result.reason,'TOOL_TIMEOUT');assert.equal(result.status,'INCONCLUSIVE');}
  finally{mocked.mock.restore();finish();await delay(1);}
});
test('P.MODE-START: a bypass expiring during a real delayed durability barrier cannot execute',async t=>{
  const{host,agent}=await fixture(t);counter(host,{policy_ids:['P.COMMAND_RISK']});
  const p=await host.administration.prepareMode({scope:{},mode:'AUDIT_ONLY',policy_ids:['P.COMMAND_RISK'],reason:'Delayed actual barrier expiry verification',expires_at:new Date(Date.now()+350).toISOString()},host.administration.metadata().policy_revision);
  await host.administration.confirmMode(p.challenge_id,'PREVIEW_ACK',p.preview_hash);await host.administration.confirmMode(p.challenge_id,'RISK_ACK',p.preview_hash);await host.administration.commitMode(p.challenge_id,p.preview_hash);
  const original=host.store.flush.bind(host.store);let delayed=false;
  host.store.flush=async()=>{await original();if(!delayed&&host.store.db.prepare('SELECT 1 FROM control_permits LIMIT 1').get()){delayed=true;await delay(400);}};
  try{const result=await agent.request(request('expired-during-flush'));assert.equal(result.status,'BLOCKED');assert.equal(result.reason,'ENFORCE_PENDING_PREFLIGHT');assert.equal(count(host),0);}
  finally{host.store.flush=original;await original();}
});
test('DI integration: malformed code remains FAIL, checks OFF are BYPASSED, raw/audit continue',async t=>{
  const{host,agent}=await fixture(t);
  const args:Json={language:'json',source:'{"x":}',document_uri:'memory:bad.json',version:1};
  const bad=await agent.request({call_id:'syntax',tool_id:'native.diagnostics',tool_version:'1',arguments:args});
  assert.equal(bad.status,'PASS');assert.equal((bad.data as any).dimensions.syntax.status,'FAIL');assert.equal((bad.data as any).dimensions.authorization.status,'NOT_RUN');
  await toggle(host,[{id:'devint.code.json',scope:{},state:'OFF'}]);
  const off=await agent.request({call_id:'off',tool_id:'native.diagnostics',tool_version:'1',arguments:{...args as object,version:2} as Json});
  assert.equal((off.data as any).status,'BYPASSED');assert.equal((off.data as any).reason,'VALIDATION_BYPASSED');
  assert.ok(agent.context().filter(x=>x.operation_id===off.operation_id).length===2);
  assert.ok(agent.reconstructTask().records.some(x=>x.operation_id===off.operation_id&&(x.body as any).phase==='RESULT'));
});
test('Tool OFF rejects invocation, diagnostics log OFF does not silence core audit, oversized request is bounded',async t=>{
  const{host,agent}=await fixture(t);counter(host);assert.equal(host.features.resolve('audit.diagnostic-logs').desired,'OFF');
  await toggle(host,[{id:'tool.test',scope:{},state:'OFF'}]);
  const r=await agent.request(request());assert.equal(r.reason,'FEATURE_OFF');assert.equal(count(host),0);
  assert.ok(agent.reconstructTask().records.some(x=>x.operation_id===r.operation_id&&(x.body as any).phase==='FAILED'));
  const large=await agent.request({...request('large'),arguments:{source:'x'.repeat(70000)}});
  assert.equal(large.status,'BLOCKED');assert.equal(large.reason,'FRAME_TOO_LARGE');assert.equal(count(host),0);
});
test('P.ARG_BINDING: mutation by schema or caller cannot replace the authorized snapshot',async t=>{
  const{host,agent}=await fixture(t);let changed=false;
  counter(host,{schema:args=>{try{(args as any).value=99;}catch{changed=true;}},execute:args=>({data:args})});
  const req=request('snapshot');const pending=agent.request(req);(req.arguments as any).value=77;
  const result=await pending;assert.equal(changed,true);assert.deepEqual(result.data,{value:1});
});
test('DI command checking keeps argv preview as data and cannot execute Git/Python',async t=>{
  const{agent}=await fixture(t);const r=await agent.request({call_id:'argv-check',tool_id:'native.command-check',tool_version:'1',arguments:{family:'git',argv:['status','--short'],document_uri:'memory:argv',version:1}});
  assert.equal(r.status,'PASS');assert.equal((r.data as any).preview.will_execute,false);
  assert.deepEqual((r.data as any).preview.argv,['status','--short']);
  assert.equal((r.data as any).validation.dimensions.authorization.status,'NOT_RUN');
});
```
<!-- agentnexus-export-end -->

## tests/agentnexus/integrity.test.ts

类别：`current_test_source_or_helper`；原始字节数：21578。

源文件 SHA256：

```text
ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0022","path":"tests/agentnexus/integrity.test.ts","bytes":21578,"sha256":"ecc6655be30a7d7690f04e5d26c61f09eaaa988ae1075b63327fe98c97c93277","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"current_test_source_or_helper","kind":"original","origin":{"kind":"workspace","path":"tests/agentnexus/integrity.test.ts"}} -->
```typescript
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { link, lstat, mkdir, mkdtemp, readFile, rm, rmdir, symlink, truncate, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { INTEGRITY_LIMITS, verifyPackage } from '../../src/agentnexus/integrity.ts';
import type { PackageEntry } from '../../src/agentnexus/integrity.ts';
import { canonical } from '../../src/agentnexus/types.ts';

// New synthetic fixture text only. Never reads/copies the legacy Kit or user code.
const fixtureBase = resolve('.workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/fixtures');
const controlled = { sourceMode: 'controlled_static' } as const;
function hash(value: Uint8Array | string): string { return createHash('sha256').update(value).digest('hex'); }
function entry(path: string, value: Uint8Array | string = ''): PackageEntry {
  return { path, bytes: Buffer.byteLength(value), sha256: hash(value) };
}
async function fixture(t: TestContext): Promise<{ container: string; root: string }> {
  await mkdir(fixtureBase, { recursive: true });
  const container = await mkdtemp(join(fixtureBase, 'pkg-'));
  const root = join(container, 'tree');
  await mkdir(root);
  t.after(async () => {
    const target = resolve(container);
    const rel = relative(fixtureBase, target);
    assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep), 'cleanup remains inside the task fixture base');
    await rm(target, { recursive: true, force: true });
  });
  return { container, root };
}
async function manifest(root: string, files: PackageEntry[], extra: Record<string, unknown> = {}): Promise<void> {
  const body = { schema: 'agentnexus/package/1', profile: 'portable-ascii-v1', files, ...extra };
  await writeFile(join(root, 'manifest.json'), canonical(body) + '\n');
}
async function pack(root: string, files: Record<string, Uint8Array | string>): Promise<PackageEntry[]> {
  const list: PackageEntry[] = [];
  for (const path of Object.keys(files).sort()) {
    const full = join(root, ...path.split('/'));
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, files[path]);
    list.push(entry(path, files[path]));
  }
  await manifest(root, list);
  return list;
}
async function expected(root: string, reason: string, status = 'FAIL'): Promise<void> {
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, status, JSON.stringify(result));
  assert.equal(result.reason, reason, JSON.stringify(result));
}
function deniedLink(t: TestContext, error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  if (['EPERM', 'EACCES', 'ENOTSUP', 'ENOSYS', 'EINVAL'].includes(code ?? '')) {
    t.skip(`NOT_RUN: real OS link fixture unavailable (${code}); no simulated OS PASS`);
    return true;
  }
  return false;
}

test('controlled static bytes close over binary, empty and nested same-name files', async t => {
  const { root } = await fixture(t);
  const files = await pack(root, {
    'data.bin': Uint8Array.from([0, 255, 13, 10, 128]), 'empty': '',
    'nested/manifest.json': 'ordinary covered content',
    'validation/SHA256SUMS.txt': 'ordinary covered old-style filename',
  });
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'PASS', JSON.stringify(result));
  assert.equal(result.filesChecked, files.length);
  assert.equal(result.bytesChecked, files.reduce((sum, f) => sum + f.bytes, 0));
  assert.equal(result.manifest_sha256, hash(await readFile(join(root, 'manifest.json'))));
  for (const key of ['schema', 'canonical', 'portablePaths', 'bidirectional', 'fileContents', 'secondInventory']) assert.equal(result.checks[key], true);
  assert.equal(result.checks.assurance, 'CONTROLLED_STATIC_HOST_PRECONDITION_ONLY');
  assert.equal(result.checks.allWindowsReparseTags, 'NOT_VERIFIED_BY_NODE');
  assert.equal(result.checks.alternateDataStreams, 'NOT_ENUMERATED_BY_NODE');
  assert.equal(result.checks.adversarialTOCTOU, 'NOT_CLOSED');
});

test('empty package permits exactly its manifest, with zero payload budgets', async t => {
  const { root } = await fixture(t);
  await manifest(root, []);
  const result = await verifyPackage(root, { ...controlled, maxFiles: 0, maxTotalBytes: 0 });
  assert.equal(result.status, 'PASS', JSON.stringify(result));
  assert.equal(result.filesChecked, 0); assert.equal(result.bytesChecked, 0);
});

test('matching mutable tree is INCONCLUSIVE, never a trusted release root', async t => {
  const { root } = await fixture(t);
  await pack(root, { 'plain.txt': 'raw bytes\r\nare preserved' });
  const result = await verifyPackage(root, { sourceMode: 'mutable' });
  assert.equal(result.status, 'INCONCLUSIVE'); assert.equal(result.reason, 'TOCTOU_NOT_CLOSED');
  assert.equal(result.checks.fileContents, true);
  assert.equal(result.checks.assurance, 'NO_OS_ADMISSION');
});

test('same-size modified content fails its SHA-256', async t => {
  const { root } = await fixture(t);
  await pack(root, { 'a': 'original' });
  await writeFile(join(root, 'a'), 'modified');
  await expected(root, 'HASH_MISMATCH');
});

test('appended content fails declared byte size', async t => {
  const { root } = await fixture(t);
  await pack(root, { 'a': 'original' });
  await writeFile(join(root, 'a'), 'original plus');
  await expected(root, 'BYTES_MISMATCH');
});

test('missing and unlisted files are both reported by full relative path', async t => {
  const { root } = await fixture(t);
  await pack(root, { 'present': 'a' });
  await manifest(root, [entry('missing', 'a')]);
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'FAIL'); assert.equal(result.reason, 'INVENTORY_MISMATCH');
  assert.ok(result.details.some(x => x.code === 'MISSING_FILE' && x.path === 'missing'));
  assert.ok(result.details.some(x => x.code === 'UNLISTED_FILE' && x.path === 'present'));
});

test('unlisted nested manifest and SHA256SUMS names are never self exceptions', async t => {
  for (const path of ['sub/manifest.json', 'validation/SHA256SUMS.txt', 'unexpected.cjs', '.hidden']) {
    await t.test(path, async sub => {
      const { root } = await fixture(sub);
      await manifest(root, []);
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), 'new unlisted bytes');
      const result = await verifyPackage(root, controlled);
      assert.equal(result.status, 'FAIL');
      assert.ok(result.details.some(x => x.code === 'UNLISTED_FILE' && x.path === path));
    });
  }
});

test('root manifest is required and cannot list itself', async t => {
  const { root } = await fixture(t);
  await expected(root, 'MANIFEST_MISSING');
  await manifest(root, [entry('manifest.json')]);
  await expected(root, 'MANIFEST_LISTS_SELF');
});

test('root manifest directory and non-directory roots fail', async t => {
  const { root, container } = await fixture(t);
  await mkdir(join(root, 'manifest.json'));
  await expected(root, 'NON_REGULAR_ENTRY');
  const file = join(container, 'root-file'); await writeFile(file, 'x');
  await expected(file, 'ROOT_NOT_DIRECTORY');
  await expected(join(container, 'absent-root'), 'ROOT_NOT_FOUND');
});

test('duplicate JSON keys are rejected despite JSON.parse last-wins semantics', async t => {
  const { root } = await fixture(t);
  await writeFile(join(root, 'manifest.json'), '{"files":[],"profile":"portable-ascii-v1","schema":"agentnexus/package/1","schema":"agentnexus/package/1"}\n');
  await expected(root, 'MANIFEST_NONCANONICAL');
  const a = entry('a'); await writeFile(join(root, 'a'), '');
  const duplicateEntry = `{"files":[{"bytes":0,"path":"discarded","path":"a","sha256":"${a.sha256}"}],"profile":"portable-ascii-v1","schema":"agentnexus/package/1"}\n`;
  await writeFile(join(root, 'manifest.json'), duplicateEntry);
  await expected(root, 'MANIFEST_NONCANONICAL');
});

test('duplicate complete path and unsorted arrays fail independently', async t => {
  const { root } = await fixture(t);
  await manifest(root, [entry('a'), entry('a')]);
  await expected(root, 'DUPLICATE_PATH');
  await manifest(root, [entry('b'), entry('a')]);
  await expected(root, 'MANIFEST_ORDER');
});

test('case conflicts include ancestor directories and file-directory prefixes', async t => {
  for (const [paths, reason] of [
    [['A', 'a'], 'PATH_CASE_COLLISION'],
    [['Dir/a', 'dir/b'], 'PATH_CASE_COLLISION'],
    [['a', 'a/b'], 'PATH_PREFIX_CONFLICT'],
  ] as const) {
    await t.test(paths.join(' vs '), async sub => {
      const { root } = await fixture(sub);
      await manifest(root, paths.map(path => entry(path)));
      await expected(root, reason);
    });
  }
});

test('path traversal, device aliases, malformed separators and Unicode reject before payload reads', async t => {
  const paths = [
    '../outside', './a', 'a//b', '/outside', 'C:/outside', '//server/share', 'a\\b',
    'a:stream', 'NUL.txt', 'COM1', 'con.tar.gz', 'a.', 'a ', 'PROGRA~1/file',
    '', 'a\0b', 'e\u0301', '\u00e9', '\u0130', 'a/'.repeat(2),
  ];
  for (const path of paths) {
    await t.test(JSON.stringify(path), async sub => {
      const { root, container } = await fixture(sub);
      const outside = join(container, 'outside'); await writeFile(outside, 'canary');
      await manifest(root, [entry(path)]);
      const result = await verifyPackage(root, controlled);
      assert.equal(result.status, 'FAIL', JSON.stringify(result));
      assert.equal(result.reason, 'PATH_PROFILE');
      assert.equal(result.filesChecked, 0); assert.equal(result.bytesChecked, 0);
      assert.equal(await readFile(outside, 'utf8'), 'canary');
    });
  }
});

test('schema, digest and byte count reject invalid declarations', async t => {
  const { root } = await fixture(t);
  for (const extra of [{ schema: 'other' }, { profile: 'unicode' }, { unexpected: true }, { files: null }]) {
    await manifest(root, [], extra); await expected(root, 'MANIFEST_SCHEMA');
  }
  const invalid = [
    { ...entry('a'), bytes: -1 }, { ...entry('a'), bytes: 0.5 },
    { ...entry('a'), bytes: Number.MAX_SAFE_INTEGER + 1 },
    { ...entry('a'), sha256: 'A'.repeat(64) }, { ...entry('a'), sha256: '0'.repeat(63) },
    { ...entry('a'), extra: true }, null,
  ];
  for (const value of invalid) {
    await writeFile(join(root, 'manifest.json'), canonical({ schema: 'agentnexus/package/1', profile: 'portable-ascii-v1', files: [value] }) + '\n');
    await expected(root, 'MANIFEST_ENTRY');
  }
});

test('canonical encoding rejects whitespace, BOM, bad UTF-8 and equivalent escapes', async t => {
  const { root } = await fixture(t);
  await pack(root, { a: '' });
  const valid = await readFile(join(root, 'manifest.json'));
  for (const bytes of [Buffer.concat([valid, Buffer.from('\n')]), Buffer.from(' ' + valid.toString()), Buffer.from(valid.toString().replace('"a"', '"\\u0061"'))]) {
    await writeFile(join(root, 'manifest.json'), bytes); await expected(root, 'MANIFEST_NONCANONICAL');
  }
  for (const bytes of [Buffer.concat([Buffer.from([239, 187, 191]), valid]), Buffer.from([255, 254, 0])]) {
    await writeFile(join(root, 'manifest.json'), bytes); await expected(root, 'MANIFEST_JSON');
  }
});

test('extra empty directory and file-vs-directory mismatch cannot disappear', async t => {
  const { root } = await fixture(t);
  await manifest(root, []); await mkdir(join(root, 'empty'));
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'FAIL'); assert.ok(result.details.some(x => x.code === 'UNLISTED_DIRECTORY'));
  await manifest(root, [entry('empty')]);
  const mismatch = await verifyPackage(root, controlled);
  assert.equal(mismatch.status, 'FAIL'); assert.ok(mismatch.details.some(x => x.code === 'MISSING_FILE'));
});

test('file count and total bytes budgets work at exact limit and limit plus one', async t => {
  const { root } = await fixture(t);
  await pack(root, { a: 'ab', b: 'cd' });
  assert.equal((await verifyPackage(root, { ...controlled, maxFiles: 2, maxTotalBytes: 4 })).status, 'PASS');
  const files = await verifyPackage(root, { ...controlled, maxFiles: 1 });
  assert.equal(files.status, 'INCONCLUSIVE'); assert.equal(files.reason, 'FILE_COUNT_BUDGET');
  const bytes = await verifyPackage(root, { ...controlled, maxTotalBytes: 3 });
  assert.equal(bytes.status, 'INCONCLUSIVE'); assert.equal(bytes.reason, 'TOTAL_BYTES_BUDGET');
});

test('actual unlisted content also consumes size and count budgets', async t => {
  const { root } = await fixture(t);
  await manifest(root, []); await writeFile(join(root, 'extra'), 'ab');
  const bytes = await verifyPackage(root, { ...controlled, maxTotalBytes: 1 });
  assert.equal(bytes.status, 'INCONCLUSIVE'); assert.equal(bytes.reason, 'TOTAL_BYTES_BUDGET');
  const files = await verifyPackage(root, { ...controlled, maxFiles: 0 });
  assert.equal(files.status, 'INCONCLUSIVE'); assert.equal(files.reason, 'FILE_COUNT_BUDGET');
});

test('manifest and single-file caps are enforced without reading an oversized payload', async t => {
  const { root } = await fixture(t);
  await writeFile(join(root, 'manifest.json'), ' '.repeat(INTEGRITY_LIMITS.maxManifestBytes + 1));
  await expected(root, 'MANIFEST_BYTES_BUDGET', 'INCONCLUSIVE');
  await writeFile(join(root, 'huge'), '');
  await truncate(join(root, 'huge'), INTEGRITY_LIMITS.maxFileBytes + 1);
  await manifest(root, [{ path: 'huge', bytes: INTEGRITY_LIMITS.maxFileBytes + 1, sha256: hash('') }]);
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'INCONCLUSIVE'); assert.equal(result.reason, 'FILE_BYTES_BUDGET');
  assert.equal(result.bytesChecked, 0);
});

test('path length and depth have bounded rejection', async t => {
  const { root } = await fixture(t);
  await manifest(root, [entry('a'.repeat(INTEGRITY_LIMITS.maxComponentBytes + 1))]);
  await expected(root, 'PATH_PROFILE');
  await manifest(root, [entry(Array(INTEGRITY_LIMITS.maxDepth + 1).fill('a').join('/'))]);
  await expected(root, 'DEPTH_BUDGET', 'INCONCLUSIVE');
});

test('actual default file and directory count limits accept the edge and reject one more', async t => {
  const { root } = await fixture(t);
  const payloads: Record<string, string> = {};
  for (let i = 0; i < INTEGRITY_LIMITS.maxFiles; i++) payloads[`d${i.toString().padStart(3, '0')}/f`] = '';
  await pack(root, payloads);
  const edge = await verifyPackage(root, controlled);
  assert.equal(edge.status, 'PASS', JSON.stringify(edge));
  assert.equal(edge.filesChecked, INTEGRITY_LIMITS.maxFiles);
  await mkdir(join(root, 'extra-dir'));
  await expected(root, 'DIRECTORY_COUNT_BUDGET', 'INCONCLUSIVE');
  await rmdir(join(root, 'extra-dir'));
  await writeFile(join(root, 'extra-file'), '');
  // At both directory and file edges the combined entry cap is reached first.
  await expected(root, 'ENTRY_COUNT_BUDGET', 'INCONCLUSIVE');
  const { root: flat } = await fixture(t);
  const flatPayloads: Record<string, string> = {};
  for (let i = 0; i < INTEGRITY_LIMITS.maxFiles; i++) flatPayloads[`f${i.toString().padStart(3, '0')}`] = '';
  await pack(flat, flatPayloads);
  await writeFile(join(flat, 'extra-file'), '');
  await expected(flat, 'FILE_COUNT_BUDGET', 'INCONCLUSIVE');
});

test('actual 8 MiB files and 16 MiB total accept the edge; declared and actual overflow reject', async t => {
  const { root } = await fixture(t);
  const bytes = Buffer.alloc(INTEGRITY_LIMITS.maxFileBytes, 37);
  const entries = await pack(root, { a: bytes, b: bytes });
  const edge = await verifyPackage(root, controlled);
  assert.equal(edge.status, 'PASS', JSON.stringify(edge));
  assert.equal(edge.bytesChecked, INTEGRITY_LIMITS.maxTotalBytes);
  await truncate(join(root, 'a'), INTEGRITY_LIMITS.maxFileBytes + 1);
  await expected(root, 'FILE_BYTES_BUDGET', 'INCONCLUSIVE');
  await truncate(join(root, 'a'), INTEGRITY_LIMITS.maxFileBytes);
  await writeFile(join(root, 'c'), 'x');
  await manifest(root, [...entries, entry('c', 'x')]);
  await expected(root, 'TOTAL_BYTES_BUDGET', 'INCONCLUSIVE');
});

test('maximum component and depth are accepted on an actually created portable path', async t => {
  const { root } = await fixture(t);
  await pack(root, { ['x'.repeat(INTEGRITY_LIMITS.maxComponentBytes)]: '' });
  assert.equal((await verifyPackage(root, controlled)).status, 'PASS');
  const { root: deep } = await fixture(t);
  await pack(deep, { [Array(INTEGRITY_LIMITS.maxDepth - 1).fill('d').concat('f').join('/')]: '' });
  assert.equal((await verifyPackage(deep, controlled)).status, 'PASS');
});

test('Host cannot expand limits or choose an unknown mode; relative roots reject', async t => {
  const { root } = await fixture(t);
  await manifest(root, []);
  for (const options of [
    { ...controlled, maxFiles: INTEGRITY_LIMITS.maxFiles + 1 },
    { ...controlled, maxTotalBytes: INTEGRITY_LIMITS.maxTotalBytes + 1 },
    { ...controlled, maxFiles: -1 }, { ...controlled, maxTotalBytes: NaN },
    { sourceMode: 'claimed-trusted' }, { ...controlled, ignore: ['rogue'] },
  ]) {
    const result = await verifyPackage(root, options as never);
    assert.equal(result.status, 'FAIL'); assert.equal(result.reason, 'INVALID_OPTIONS');
  }
  await expected('relative-tree', 'INVALID_ROOT');
});

test('pre-abort is NOT_RUN; in-flight abort is INCONCLUSIVE with closed file work', async t => {
  const { root } = await fixture(t);
  await pack(root, { data: Buffer.alloc(256 * 1024, 23) });
  const pre = new AbortController(); pre.abort();
  const before = await verifyPackage(root, { ...controlled, signal: pre.signal });
  assert.equal(before.status, 'NOT_RUN'); assert.equal(before.reason, 'CANCELLED');
  const running = new AbortController();
  const pending = verifyPackage(root, { ...controlled, signal: running.signal }); running.abort();
  const during = await pending;
  assert.equal(during.status, 'INCONCLUSIVE'); assert.equal(during.reason, 'CANCELLED');
  assert.equal((await verifyPackage(root, controlled)).status, 'PASS');
});

test('diagnostic count and encoded bytes remain bounded for many extra files', async t => {
  const { root } = await fixture(t);
  await manifest(root, []);
  for (let i = 0; i < 80; i++) await writeFile(join(root, `f${i.toString().padStart(3, '0')}`), '');
  const result = await verifyPackage(root, controlled);
  assert.equal(result.status, 'FAIL'); assert.equal(result.detailCount, 80);
  assert.equal(result.detailsTruncated, true);
  assert.ok(result.details.length <= INTEGRITY_LIMITS.maxDetails);
  assert.ok(Buffer.byteLength(canonical(result.details)) <= INTEGRITY_LIMITS.maxDetailBytes);
});

test('candidate scripts, package metadata and git-looking files are data and never executed', async t => {
  const { root, container } = await fixture(t);
  const sentinel = join(container, 'must-not-exist');
  await pack(root, {
    'danger.cjs': `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'executed'); throw new Error('candidate executed');`,
    'package.json': JSON.stringify({ scripts: { preinstall: 'forbidden-command' }, type: 'module' }),
    '.git/config': '[filter "audit"]\nclean = forbidden-command\n',
  });
  assert.equal((await verifyPackage(root, controlled)).status, 'PASS');
  assert.equal(existsSync(sentinel), false);
  await writeFile(join(root, 'extra-malicious.cjs'), `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'bad');`);
  assert.equal((await verifyPackage(root, controlled)).status, 'FAIL');
  assert.equal(existsSync(sentinel), false);
});

test('real OS file symlink is rejected without following its target', async t => {
  const { root, container } = await fixture(t);
  const target = join(container, 'outside'); const linked = join(root, 'linked');
  await writeFile(target, 'outside target'); await manifest(root, [entry('linked', 'outside target')]);
  try { await symlink(target, linked, 'file'); }
  catch (error) { if (deniedLink(t, error)) return; throw error; }
  try { await expected(root, 'LINK_PATH'); assert.equal(await readFile(target, 'utf8'), 'outside target'); }
  finally { await unlink(linked); }
});

for (const type of ['dir', 'junction'] as const) {
  test(`real OS ${type} link is rejected`, async t => {
    if (type === 'junction' && process.platform !== 'win32') { t.skip('NOT_RUN: junction fixture is Windows-specific'); return; }
    const { root, container } = await fixture(t);
    const target = join(container, 'outside-dir'); const linked = join(root, 'linked');
    await mkdir(target); await writeFile(join(target, 'a'), 'outside target');
    await manifest(root, [entry('linked/a', 'outside target')]);
    try { await symlink(target, linked, type); }
    catch (error) { if (deniedLink(t, error)) return; throw error; }
    try { await expected(root, 'LINK_PATH'); }
    finally { await unlink(linked); }
  });
}

test('real OS hardlink to an outside object is rejected by link count', async t => {
  const { root, container } = await fixture(t);
  const target = join(container, 'outside'); const linked = join(root, 'linked');
  await writeFile(target, 'outside target'); await manifest(root, [entry('linked', 'outside target')]);
  try { await link(target, linked); }
  catch (error) { if (deniedLink(t, error)) return; throw error; }
  try {
    assert.ok((await lstat(linked, { bigint: true })).nlink > 1n);
    await expected(root, 'HARDLINK_PATH');
  } finally { await unlink(linked); }
});
```
<!-- agentnexus-export-end -->

## tests/agentnexus/owned-storage-child.mjs

类别：`current_test_source_or_helper`；原始字节数：1885。

源文件 SHA256：

```text
7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0023","path":"tests/agentnexus/owned-storage-child.mjs","bytes":1885,"sha256":"7a469bfa662d98f39f06b4483eaa1f49809e490817679cce5f7f1fa366133139","language":"javascript","fence":"```","wrapper_padding_newline":false,"category":"current_test_source_or_helper","kind":"original","origin":{"kind":"workspace","path":"tests/agentnexus/owned-storage-child.mjs"}} -->
```javascript
import { KernelStore } from '../../src/agentnexus/storage.ts';
import { auditEvent } from '../../src/agentnexus/types.ts';
import { frame } from '../../src/agentnexus/records.ts';
import { open, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const [root, mode] = process.argv.slice(2);
const identity = { agent_id: 'child', project_id: 'project', task_id: 'task', session_id: 'child-session' };
const store = await KernelStore.open(root, { segmentBytes: 4096 });
const event = phase => auditEvent(identity, { operation_type: 'synthetic-child-fixture', phase });

if (mode === 'file-before-receipt') {
  const original = store.db.prepare.bind(store.db);
  store.db.prepare = function (sql) {
    if (sql.startsWith('INSERT INTO anx_exports')) process.kill(process.pid, 'SIGKILL');
    return original(sql);
  };
  store.audit(event('CLAIMED'));
  await store.flush();
  throw new Error('Crash injection did not fire');
} else if (mode === 'partial-tail' || mode === 'first-partial-tail') {
  if (mode === 'partial-tail') { store.audit(event('FIRST')); await store.flush(); }
  const second = store.audit(event('SECOND'));
  const name = (await readdir(join(root, 'segments'))).find(x => x.endsWith('.jsonl')) ?? 'segment-00000001.jsonl';
  const handle = await open(join(root, 'segments', name), 'a');
  const data = frame(second); await handle.write(data.subarray(0, Math.floor(data.length / 2))); await handle.sync(); await handle.close();
} else if (mode === 'partial-artifact') {
  async function* endlessButBounded() {
    for (let i = 0; i < 8; i++) yield Buffer.alloc(65536, i);
    process.send?.({ ready: true });
    await new Promise(() => {});
  }
  void store.artifacts.put(endlessButBounded()).catch(() => {});
} else store.audit(event('OUTBOX_ONLY'));

if (mode !== 'partial-artifact') process.send?.({ ready: true });
setInterval(() => {}, 1000);
```
<!-- agentnexus-export-end -->

