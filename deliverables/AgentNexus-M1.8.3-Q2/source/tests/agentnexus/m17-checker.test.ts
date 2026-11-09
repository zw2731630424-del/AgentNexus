import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import childProcess from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { syncBuiltinESMExports } from 'node:module';
import { canonical, sha256 } from '../../src/agentnexus/types.ts';
import { runPilotChecks } from '../../src/agentnexus/harness/pilot-checker.ts';
import type { PilotCandidate } from '../../src/agentnexus/harness/pilot-checker.ts';

const workspace = fileURLToPath(new URL('../../../../../', import.meta.url));
const dataRoot = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? join(workspace, '.workflow-kit/runtime/AgentNexus-M1.7/checker-unit'));
const typeRoot = resolve(process.env.AGENTNEXUS_TYPE_TOOLS ?? join(workspace, '.workflow-kit/runtime/AgentNexus-M1.5/type-tools'));
const good: Record<string, string> = {
  'package.json': '{"type":"module","private":true}\n',
  'tsconfig.json': '{"compilerOptions":{"strict":true,"noEmit":true,"module":"NodeNext"}}\n',
  'README.md': 'Trusted fixed checker fixture. No Provider or OS qualification.\n',
  'src/model.ts': 'export function double(value:number):number { return value * 2; }\n',
  'src/analytics.ts': "import { double } from './model.ts';\nexport function total(values:readonly number[]):number { return values.reduce((n,v)=>n+double(v),0); }\n",
  'src/cli.ts': "import { total } from './analytics.ts';\nexport function run(raw:string):string { const values:unknown=JSON.parse(raw); if(!Array.isArray(values)||!values.every(v=>typeof v==='number'&&Number.isFinite(v)))throw Error('invalid'); return JSON.stringify({total:total(values)}); }\n",
  'src/entry.ts': "import { run } from './cli.ts';\nlet input=''; for await(const bytes of process.stdin)input+=String(bytes); process.stdout.write(run(input)+'\\n');\n",
  'tests/model.test.ts': "import test from 'node:test'; import assert from 'node:assert/strict'; import {double} from '../src/model.ts';\ntest('double',()=>assert.equal(double(2),4));\n",
  'tests/analytics.test.ts': "import test from 'node:test'; import assert from 'node:assert/strict'; import {total} from '../src/analytics.ts';\ntest('total',()=>assert.equal(total([1,2]),6));\n",
  'tests/cli.test.ts': "import test from 'node:test'; import assert from 'node:assert/strict'; import {spawnSync} from 'node:child_process'; import {writeFileSync,readFileSync} from 'node:fs'; import {join} from 'node:path'; import {run} from '../src/cli.ts';\ntest('cli stdin json',()=>{ assert.equal(process.env.AGENTNEXUS_CHECKER_SENTINEL,undefined); assert.equal(process.env.NODE_OPTIONS,''); assert.ok(process.env.AGENTNEXUS_PILOT_SCRATCH); const file=join(process.env.AGENTNEXUS_PILOT_SCRATCH,'fixture.json'); writeFileSync(file,'external scratch'); assert.equal(readFileSync(file,'utf8'),'external scratch'); const r=spawnSync(process.execPath,['src/entry.ts'],{input:'[1,2]',encoding:'utf8',shell:false,windowsHide:true}); assert.equal(r.status,0,r.stderr); assert.equal(r.stdout.trim(),run('[1,2]')); });\n",
};
async function fixture(changes: Record<string, string> = {}) {
  await mkdir(dataRoot, { recursive: true }); const base = await mkdtemp(join(dataRoot, 'case-')), root = join(base, 'pilot');
  await mkdir(join(root, 'src'), { recursive: true }); await mkdir(join(root, 'tests'));
  const content = { ...good, ...changes }, files: PilotCandidate['files'] = [];
  for (const [path, text] of Object.entries(content)) { const bytes = Buffer.from(text); await writeFile(join(root, path), bytes, { flag: 'wx' }); files.push({ path, bytes: bytes.length, sha256: sha256(bytes) }); }
  return { base, candidate: { root, files }, options: { allowed_hashes: new Set(files.map(f => f.sha256)), type_tools_root: typeRoot } };
}

test('M17 CHECKER REAL_LOCAL: exact trusted snapshot runs fixed syntax/types/tests and retains hash-bound evidence', async () => {
  const f = await fixture(); const before = process.env.AGENTNEXUS_CHECKER_SENTINEL; process.env.AGENTNEXUS_CHECKER_SENTINEL = 'synthetic-must-not-inherit';
  try {
    const expectedHash = sha256(canonical([...f.candidate.files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)));
    const checking = runPilotChecks(f.candidate, f.options); f.candidate.files.length = 0; f.options.allowed_hashes.clear();
    const report = await checking;
    assert.equal(report.status, 'PASS', JSON.stringify(report)); assert.equal(report.candidate_hash, expectedHash);
    assert.equal(report.syntax.commands.length, 7); assert.equal(report.types.status, 'PASS'); assert.equal(report.tests.status, 'PASS'); assert.deepEqual(report.findings, []);
    assert.equal(report.scope, 'LOCAL_TRUSTED_FIXED_RUNNER'); assert.equal(report.production_os_qualified, false); assert.equal(report.automatic_retry, false);
    assert.ok(report.evidence_directory && !report.evidence_directory.startsWith(f.candidate.root));
    assert.equal(await readFile(join(report.scratch_directory!, 'fixture.json'), 'utf8'), 'external scratch');
    for (const result of [...report.syntax.commands, ...report.types.commands, ...report.tests.commands]) {
      assert.equal(result.close_observed, true); assert.equal(result.exit_code, 0); assert.ok(!result.environment_keys.includes('AGENTNEXUS_CHECKER_SENTINEL'));
      assert.equal(sha256(await readFile(result.stdout_path)), result.stdout_sha256); assert.equal(sha256(await readFile(result.stderr_path)), result.stderr_sha256);
    }
    const args = report.types.commands[0]!.argv; assert.ok(args.includes('--strict') && args.includes('--noEmit') && !args.includes('--project'));
    assert.deepEqual(report.tests.commands[0]!.argv, ['--test', '--test-concurrency=1', 'tests/model.test.ts', 'tests/analytics.test.ts', 'tests/cli.test.ts']);
  } finally { if (before === undefined) delete process.env.AGENTNEXUS_CHECKER_SENTINEL; else process.env.AGENTNEXUS_CHECKER_SENTINEL = before; }
});

test('M17 CHECKER ADMISSION: exact manifest and Host tools root cannot be expanded by candidate metadata', async () => {
  for (const attack of ['duplicate', 'escape', 'missing', 'candidate-tools']) {
    const f = await fixture();
    if (attack === 'duplicate') f.candidate.files.push({ ...f.candidate.files[0]! });
    if (attack === 'escape') f.candidate.files[0]!.path = '../package.json';
    if (attack === 'missing') f.candidate.files = f.candidate.files.filter(x => x.path !== 'src/entry.ts');
    const report = await runPilotChecks(f.candidate, { ...f.options, type_tools_root: attack === 'candidate-tools' ? f.candidate.root : typeRoot });
    assert.equal(report.status, 'BLOCKED'); assert.equal(report.execution_started, false); assert.equal(report.syntax.commands.length, 0);
  }
});

test('M17 CHECKER ADMISSION: unapproved hash, changed bytes and extra files never start a command', async () => {
  for (const attack of ['unapproved', 'changed', 'extra']) {
    const f = await fixture();
    if (attack === 'unapproved') f.options.allowed_hashes.clear();
    if (attack === 'changed') await writeFile(join(f.candidate.root, 'src/model.ts'), 'throw Error("changed");\n');
    if (attack === 'extra') await writeFile(join(f.candidate.root, 'extra.ts'), 'throw Error("not an input");\n');
    const report = await runPilotChecks(f.candidate, f.options); assert.equal(report.status, 'BLOCKED'); assert.equal(report.syntax.commands.length, 0); assert.equal(report.types.commands.length, 0); assert.equal(report.tests.commands.length, 0);
  }
});

test('M17 CHECKER ADMISSION: approved malicious config still cannot select plugins, extends or emit', async () => {
  for (const config of ['{"extends":"../outside.json","compilerOptions":{"noEmit":true}}', '{"compilerOptions":{"noEmit":true,"plugins":[{"name":"../outside.ts"}]}}', '{"compilerOptions":{"noEmit":false}}']) {
    const f = await fixture({ 'tsconfig.json': config }); const report = await runPilotChecks(f.candidate, f.options);
    assert.equal(report.status, 'BLOCKED'); assert.equal(report.syntax.commands.length, 0); assert.match(report.reason!, /CONFIG/);
  }
});

test('M17 CHECKER ADMISSION: symlink candidate file is rejected without following its target', async t => {
  const f = await fixture(), target = join(f.base, 'outside.ts'); await writeFile(target, good['src/model.ts']!); await unlink(join(f.candidate.root, 'src/model.ts'));
  try { await symlink(target, join(f.candidate.root, 'src/model.ts'), 'file'); }
  catch (e) { if (['EPERM','EACCES'].includes((e as NodeJS.ErrnoException).code ?? '')) { t.skip('NOT_RUN: OS refused the temporary symlink fixture; no privilege changes'); return; } throw e; }
  const report = await runPilotChecks(f.candidate, f.options); assert.equal(report.status, 'BLOCKED'); assert.match(report.reason!, /LINK|ALIAS/); assert.equal(report.syntax.commands.length, 0);
});

test('M17 CHECKER ADMISSION: junction or symlink root alias is rejected', async t => {
  const f = await fixture(), alias = join(f.base, 'aliased-pilot');
  try { await symlink(f.candidate.root, alias, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (e) { if (['EPERM','EACCES'].includes((e as NodeJS.ErrnoException).code ?? '')) { t.skip('NOT_RUN: OS refused the temporary directory link fixture; no privilege changes'); return; } throw e; }
  const report = await runPilotChecks({ ...f.candidate, root: alias }, f.options); assert.equal(report.status, 'BLOCKED'); assert.match(report.reason!, /LINK|ALIAS/); assert.equal(report.execution_started, false);
});

test('M17 CHECKER REAL_LOCAL: TypeScript diagnostic gives actual file, line and fixed reproduction', async () => {
  const f = await fixture({ 'src/model.ts': "export function double(value:number):number { return 'wrong'; }\n" }); const report = await runPilotChecks(f.candidate, f.options);
  assert.equal(report.status, 'FAIL', JSON.stringify(report)); assert.equal(report.syntax.status, 'PASS'); assert.equal(report.types.status, 'FAIL'); assert.equal(report.tests.status, 'NOT_RUN');
  const finding = report.findings.find(x => x.path === 'src/model.ts'); assert.ok(finding); assert.equal(finding.line, 1); assert.match(finding.description, /TS2322/); assert.match(finding.reproduction, /noEmit/); assert.match(finding.evidence.excerpt, /not assignable/);
});

test('M17 CHECKER REAL_LOCAL: syntax failure retains a real source line before type or test execution', async () => {
  const f = await fixture({ 'src/model.ts': 'const value = @;\n' }); const report = await runPilotChecks(f.candidate, f.options);
  assert.equal(report.status, 'FAIL', JSON.stringify(report)); assert.equal(report.syntax.status, 'FAIL'); assert.equal(report.types.status, 'NOT_RUN'); assert.equal(report.tests.status, 'NOT_RUN');
  assert.equal(report.findings[0]!.path, 'src/model.ts'); assert.equal(report.findings[0]!.line, 1); assert.match(report.findings[0]!.description, /SyntaxError/); assert.match(report.findings[0]!.reproduction, /--check/);
});

test('M17 CHECKER REAL_LOCAL: tests catch a type-correct wrong implementation', async () => {
  const f = await fixture({ 'src/model.ts': 'export function double(value:number):number { return value * 3; }\n' }); const report = await runPilotChecks(f.candidate, f.options);
  assert.equal(report.status, 'FAIL', JSON.stringify(report)); assert.equal(report.types.status, 'PASS'); assert.equal(report.tests.status, 'FAIL');
  assert.ok(report.findings.some(x => x.path.startsWith('tests/') && x.line > 0 && x.evidence.excerpt.length > 0));
});

test('M17 CHECKER REAL_LOCAL: output budget stops the fixed test process and observes close', async () => {
  const f = await fixture({ 'tests/model.test.ts': good['tests/model.test.ts']! + "console.log('x'.repeat(20000));\n" });
  const report = await runPilotChecks(f.candidate, { ...f.options, max_output_bytes: 256 }); assert.equal(report.status, 'FAIL', JSON.stringify(report));
  const command = [...report.syntax.commands, ...report.types.commands, ...report.tests.commands].find(x => x.output_limit); assert.ok(command); assert.equal(command.close_observed, true); assert.equal(command.termination_requested, true); assert.ok(Buffer.byteLength(command.stdout) + Buffer.byteLength(command.stderr) <= 256);
});

test('M17 CHECKER REAL_LOCAL: deadline termination waits for actual child close and does not retry', async () => {
  const f = await fixture(); const report = await runPilotChecks(f.candidate, { ...f.options, timeout_ms: 100 });
  assert.equal(report.status, 'FAIL', JSON.stringify(report)); const commands = [...report.syntax.commands, ...report.types.commands, ...report.tests.commands];
  const timed = commands.filter(x => x.timed_out); assert.equal(timed.length, 1); assert.equal(timed[0]!.close_observed, true); assert.equal(timed[0]!.termination_requested, true); assert.equal(commands.at(-1), timed[0]); assert.equal(report.automatic_retry, false);
});
test('M17 CHECKER INJECTED_IO_FAILURE: failed-spawn pipes are observed; started output loss is INCONCLUSIVE',async t=>{
  for(const started of [false,true]){const f=await fixture();let calls=0;
    t.mock.method(childProcess,'spawn',()=>{calls++;const fake=new EventEmitter() as unknown as ChildProcessWithoutNullStreams;
      Object.assign(fake,{stdout:new PassThrough(),stderr:new PassThrough(),pid:started?123:undefined,kill:()=>true});
      queueMicrotask(()=>{if(!started)fake.emit('error',Object.assign(Error('Injected spawn ENOENT'),{code:'ENOENT'}));fake.stdout.emit('error',Object.assign(Error('Injected read ENOTCONN'),{code:'ENOTCONN'}));fake.stderr.emit('error',Error('Injected pipe loss'));fake.emit('close',started?0:-4058,null);});return fake;});
    syncBuiltinESMExports();try{const report=await runPilotChecks(f.candidate,f.options);assert.equal(report.status,started?'INCONCLUSIVE':'BLOCKED');assert.equal(calls,1);assert.equal(report.automatic_retry,false);assert.equal(report.syntax.commands.length,1);assert.equal(report.syntax.commands[0].close_observed,true);assert.equal(report.syntax.commands[0].io_errors.length,2);assert.equal(report.types.status,'NOT_RUN');assert.equal(report.findings.length,0);}finally{t.mock.restoreAll();syncBuiltinESMExports();}
  }
});
