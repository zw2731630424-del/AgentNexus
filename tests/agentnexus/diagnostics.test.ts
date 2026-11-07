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
