import { cp, lstat, mkdir, open, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { outsideSource } from './output-root.ts';

// Trusted engineering runner. Test successes do not qualify an OS boundary.
const SOURCE_NAMES = ['src', 'tests', 'tools', 'config', 'package.json', 'package-lock.json', 'tsconfig.json'];
const TIMEOUT_MS = 600000, CLOSE_GRACE_MS = 10000, OUTPUT_BYTES = 8 * 1024 * 1024;
const EXPECTED = { node: '24.15.0', typescript: '5.9.3', node_types: '24.10.1' };

/** @param {string} a @param {string} b */
function codepoint(a, b) {
  const left = [...a], right = [...b];
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const delta = /** @type {number} */ (left[i].codePointAt(0)) - /** @type {number} */ (right[i].codePointAt(0));
    if (delta) return delta;
  }
  return left.length - right.length;
}
/** @param {unknown} error */
const message = error => (error instanceof Error ? error.message : String(error)).slice(0, 4096);
/** @param {string} path @param {unknown} value */
const json = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
/** @param {string} path @param {unknown} value */
async function jsonIfMissing(path, value) {
  try { await json(path, value); } catch (error) { if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EEXIST') throw error; }
}
/** @param {{path:string,sha256:string}[]} files */
const sourceSet = files => createHash('sha256').update(files.map(file => file.path + '\0' + file.sha256 + '\n').join('')).digest('hex');

/** @param {string} root */
async function inventory(root) {
  /** @type {{path:string,bytes:number,sha256:string}[]} */
  const files = [];
  /** @param {string} path */
  async function visit(path) {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw Error('Linked source refused: ' + relative(root, path));
    if (stat.isDirectory()) {
      for (const name of (await readdir(path)).sort(codepoint)) await visit(join(path, name));
    } else if (stat.isFile()) {
      const hash = createHash('sha256'); let bytes = 0;
      for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length; }
      files.push({ path: relative(root, path).replaceAll('\\', '/'), bytes, sha256: hash.digest('hex') });
    } else throw Error('Nonregular source refused: ' + relative(root, path));
  }
  for (const name of SOURCE_NAMES) await visit(join(root, name));
  return files.sort((a, b) => codepoint(a.path, b.path));
}

/** @param {string} name @param {'file'|'directory'} kind */
async function configuredPath(name, kind) {
  const value = process.env[name];
  if (!value || !isAbsolute(value)) throw Error('Set ' + name + ' to an explicit absolute trusted ' + kind);
  const path = await realpath(value), stat = await lstat(path);
  if (kind === 'file' ? !stat.isFile() : !stat.isDirectory()) throw Error('Invalid trusted tool path: ' + name);
  return path;
}

/**
 * @param {string} node @param {string[]} argv
 * @param {{cwd:string,env:NodeJS.ProcessEnv,stdout:string,stderr:string,timeout_ms:number}} options
 */
async function runBounded(node, argv, options) {
  const startedAt = new Date().toISOString(), start = Date.now();
  const stdout = await open(options.stdout, 'wx');
  const stderr = await open(options.stderr, 'wx').catch(async error => { await stdout.close(); throw error; });
  /** @type {ReturnType<typeof spawn>|undefined} */ let child;
  /** @type {number|null} */ let exitCode = null;
  /** @type {NodeJS.Signals|null} */ let signal = null;
  /** @type {string|null} */ let error = null;
  /** @type {string|null} */ let stopReason = null;
  let timedOut = false, closeObserved = false, exitObserved = false, killRequested = false;
  /** @type {boolean|null} */ let killReturned = null;
  /** @type {NodeJS.Timeout|undefined} */ let deadline, grace;
  /** @type {(()=>void)|undefined} */ let finish;
  const finished = new Promise(resolveDone => { finish = () => resolveDone(undefined); });
  /** @param {string} reason */
  function stop(reason) {
    if (killRequested || closeObserved) return;
    killRequested = true; stopReason = reason;
    try { killReturned = child?.kill() ?? false; } catch (failure) { error = message(failure); }
    grace = setTimeout(() => finish?.(), CLOSE_GRACE_MS);
  }
  /** @param {import('node:stream').Readable|null|undefined} stream @param {import('node:fs/promises').FileHandle} file */
  async function capture(stream, file) {
    const hash = createHash('sha256'); let bytes = 0, observedBytes = 0, truncated = false;
    try {
      if (stream) for await (const raw of stream) {
        const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        observedBytes += chunk.length;
        const retained = chunk.subarray(0, Math.max(0, OUTPUT_BYTES - bytes));
        if (retained.length) { await file.writeFile(retained); hash.update(retained); bytes += retained.length; }
        if (retained.length !== chunk.length) { truncated = true; stop('OUTPUT_LIMIT'); }
      }
    } catch (failure) { error = message(failure); stop('OUTPUT_CAPTURE_ERROR'); }
    return { bytes, observed_bytes: observedBytes, sha256: hash.digest('hex'), truncated };
  }
  try {
    child = spawn(node, argv, { cwd: options.cwd, env: options.env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.once('error', failure => { error = message(failure); });
    child.once('exit', (code, term) => { exitObserved = true; exitCode = code; signal = term; });
    child.once('close', (code, term) => { closeObserved = true; exitCode = code; signal = term; finish?.(); });
    deadline = setTimeout(() => { timedOut = true; stop('TIMEOUT'); }, options.timeout_ms);
    const captures = [capture(child.stdout, stdout), capture(child.stderr, stderr)];
    await finished;
    if (!closeObserved) {
      // A missing close stays INCONCLUSIVE. No automatic retry or process-tree claim.
      child.stdout?.destroy(); child.stderr?.destroy(); child.unref();
    }
    const [out, err] = await Promise.all(captures);
    const status = !closeObserved ? 'INCONCLUSIVE' : timedOut || error || out.truncated || err.truncated || exitCode !== 0 || signal ? 'FAIL' : 'PASS';
    return { status, executable: node, argv, started_at: startedAt, ended_at: new Date().toISOString(), elapsed_ms: Date.now() - start,
      exit_code: exitCode, signal, exit_observed: exitObserved, close_observed: closeObserved, timed_out: timedOut,
      timeout_ms: options.timeout_ms, kill_requested: killRequested, kill_returned: killReturned, stop_reason: stopReason, error,
      stdout: { path: options.stdout, ...out }, stderr: { path: options.stderr, ...err } };
  } finally {
    clearTimeout(deadline); clearTimeout(grace); await stdout.close(); await stderr.close();
  }
}

/** @param {string} raw @param {string} destination */
async function parseEvents(raw, destination) {
  const output = await open(destination, 'wx');
  /** @type {Record<string,any>[]} */ const cases = [];
  /** @type {Record<string,any>|null} */ let summary = null;
  /** @type {string[]} */ const diagnostics = [], errors = [];
  let eventCount = 0, diagnosticLines = 0;
  try {
    for await (const line of createInterface({ input: createReadStream(raw), crlfDelay: Infinity })) {
      if (Buffer.byteLength(line) > 65536) { errors.push('TEST_EVENT_LINE_LIMIT'); continue; }
      if (!line.trim().startsWith('{')) { if (line.trim()) { diagnosticLines++; if (diagnostics.length < 16) diagnostics.push(line.slice(0, 4096)); } continue; }
      /** @type {Record<string,any>} */ let event;
      try { event = JSON.parse(line); } catch { errors.push('MALFORMED_TEST_EVENT'); continue; }
      if (!event || !['test:pass', 'test:fail', 'test:summary'].includes(event.type)) { errors.push('UNEXPECTED_TEST_EVENT'); continue; }
      if (++eventCount > 10000) { errors.push('TEST_EVENT_COUNT_LIMIT'); break; }
      await output.writeFile(JSON.stringify(event) + '\n');
      if (event.type === 'test:summary' && !event.file) summary = event;
      if (event.type === 'test:pass' || event.type === 'test:fail') cases.push(event);
    }
  } finally { await output.close(); }
  if (!summary || !Number.isSafeInteger(summary.counts?.tests) || summary.counts.tests <= 0 || !cases.length) errors.push('NO_COMPLETE_NONEMPTY_TEST_SUMMARY');
  return { summary, cases, errors: [...new Set(errors)], reporter_diagnostics: { lines: diagnosticLines, samples: diagnostics }, event_count: eventCount };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--output-root' || args[2] !== '--suite' || !['all', 'm181', 'model'].includes(args[3])) throw Error('Use --output-root <outside source> --suite all|m181|model');
  const suite = args[3], source = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
  const outputRoot = await outsideSource(source, args[1]);
  await mkdir(outputRoot, { recursive: true });
  const runId = randomUUID(), startedAt = new Date().toISOString();
  const out = join(outputRoot, 'r-' + runId.replaceAll('-', '').slice(0, 12));
  await mkdir(out); // Exclusive creation: all retained artifacts below use wx.
  await json(join(out, 'run.json'), { schema: 'agentnexus/m1.8.1/verification-run/1', run_id: runId,
    started_at: startedAt, pid: process.pid, suite, source, output_root: outputRoot, attempt_directory: out });
  const workspace = join(out, 'workspace'), data = join(out, 'data'), tmp = join(data, 'tmp'), eventOutput = join(data, 'm17-event-output');
  await mkdir(workspace); await mkdir(data); await mkdir(tmp); await mkdir(eventOutput);
  /** @type {Record<string,any>} */
  const result = { schema: 'agentnexus/m1.8.1/verification/1', run_id: runId, suite, started_at: startedAt, node: process.version, platform: process.platform,
    status: 'BLOCKED', exit_code: 1, execution_started: false, source_set_sha256: null, source_snapshot_stable: false, test_files: [], summary: null, cases: [],
    syntax_pass: false, tsc: 'NOT_RUN', tests: 'NOT_RUN', workspace, data,
    limits: { command_timeout_ms: TIMEOUT_MS, close_grace_ms: CLOSE_GRACE_MS, bytes_per_output_stream: OUTPUT_BYTES, no_automatic_retry: true },
    security_assurance: 'TRUSTED_LOCAL_ENGINEERING_RUNNER; PER_CASE_EXPLICIT; NOT_RUN AND SIMULATED ARE NOT OS EVIDENCE',
    production_deployment: 'BLOCKED', linux: 'NOT_RUN', os_reboot: 'NOT_RUN', cpu_qualification: 'SEPARATE_RAW_REPORT_REQUIRED; INHERITED_TEST_PASS_DOES_NOT_QUALIFY',
    errors: [] };
  let emittedEvents = false, emittedTap = false;
  try {
    const before = await inventory(source);
    for (const name of SOURCE_NAMES) await cp(join(source, name), join(workspace, name), { recursive: true, errorOnExist: true, force: false, dereference: false });
    const files = await inventory(workspace), set = sourceSet(files), after = await inventory(source);
    result.source_set_sha256 = set;
    await json(join(out, 'source-manifest.json'), { schema: 'agentnexus/m1.8.1/source/1', files, set_sha256: set,
      ordering: 'UNICODE_CODEPOINT_PATH', set_encoding: 'UTF8(path + NUL + lowercase_sha256 + LF)' });
    if (sourceSet(before) !== set || sourceSet(after) !== set) throw Error('SOURCE_CHANGED_DURING_SNAPSHOT');
    result.source_snapshot_stable = true;
    const tests = (await readdir(join(workspace, 'tests/agentnexus')))
      .filter(name => name.endsWith('.test.ts') && (suite === 'all' || (suite === 'm181' ? name.startsWith('m181-') : /^m18(?:1)?-/.test(name))))
      .sort(codepoint).map(name => 'tests/agentnexus/' + name);
    result.test_files = tests;
    if (!tests.length) throw Error('NO_TESTS_SELECTED');
    if (process.versions.node !== EXPECTED.node) throw Error('Node ' + EXPECTED.node + ' required');
    const node = await realpath(process.execPath);
    if (!isAbsolute(node)) throw Error('NODE_EXECUTABLE_NOT_ABSOLUTE');
    const typeTools = await configuredPath('AGENTNEXUS_TYPE_TOOLS', 'directory');
    const python = await configuredPath('AGENTNEXUS_TEST_PYTHON_PATH', 'file');
    const powershell = await configuredPath('AGENTNEXUS_TEST_POWERSHELL_PATH', 'file');
    const git = await configuredPath('AGENTNEXUS_TEST_GIT_PATH', 'file');
    const modules = join(typeTools, 'node_modules'), compiler = join(modules, 'typescript/lib/tsc.js');
    const ts = JSON.parse(await readFile(join(modules, 'typescript/package.json'), 'utf8'));
    const nodeTypes = JSON.parse(await readFile(join(modules, '@types/node/package.json'), 'utf8'));
    if (ts.version !== EXPECTED.typescript || nodeTypes.version !== EXPECTED.node_types || !(await lstat(compiler)).isFile()) throw Error('PINNED_TYPE_TOOLS_MISMATCH');
    /** @type {NodeJS.ProcessEnv} */
    const env = { NODE_OPTIONS: '', NODE_PATH: '', TEMP: tmp, TMP: tmp, AGENTNEXUS_TYPE_TOOLS: typeTools,
      AGENTNEXUS_TEST_PYTHON_PATH: python, AGENTNEXUS_TEST_POWERSHELL_PATH: powershell, AGENTNEXUS_TEST_GIT_PATH: git,
      AGENTNEXUS_TEST_DATA_ROOT: data, AGENTNEXUS_M17_EVENT_OUTPUT: eventOutput };
    for (const key of ['SystemRoot', 'WINDIR']) if (process.env[key]) env[key] = process.env[key];
    result.environment = { node_executable: node, type_tools: typeTools, python, powershell, git, tmp, m17_event_output: eventOutput,
      child_environment_keys: Object.keys(env).sort(codepoint), inherited_environment: 'SystemRoot/WINDIR only; no credential lookup' };
    await mkdir(join(out, 'syntax'));
    const syntax = [];
    result.execution_started = true;
    for (const [i, file] of files.filter(file => /\.(ts|mjs)$/.test(file.path)).entries()) {
      const command = await runBounded(node, ['--check', file.path], { cwd: workspace, env, timeout_ms: 10000,
        stdout: join(out, 'syntax', i + '.stdout.txt'), stderr: join(out, 'syntax', i + '.stderr.txt') });
      syntax.push({ path: file.path, ...command });
      if (!command.close_observed) break;
    }
    result.syntax_pass = syntax.length === files.filter(file => /\.(ts|mjs)$/.test(file.path)).length && syntax.every(command => command.status === 'PASS');
    await json(join(out, 'syntax.json'), { kind: 'NODE_SYNTAX_ONLY', source_set_sha256: set, checks: syntax });
    if (syntax.some(command => !command.close_observed)) { result.status = 'INCONCLUSIVE'; throw Error('SYNTAX_PROCESS_CLOSE_NOT_CONFIRMED'); }
    const typed = await runBounded(node, [compiler, '--project', join(workspace, 'tsconfig.json'), '--typeRoots', join(modules, '@types'),
      '--pretty', 'false', '--noEmit', '--strict', '--skipLibCheck', 'false'], { cwd: workspace, env, timeout_ms: 60000,
      stdout: join(out, 'tsc.stdout.txt'), stderr: join(out, 'tsc.stderr.txt') });
    result.tsc = typed.status;
    await json(join(out, 'typecheck.json'), { kind: 'STRICT_TSC_NO_EMIT', source_set_sha256: set, node: EXPECTED.node,
      typescript: EXPECTED.typescript, node_types: EXPECTED.node_types, tools_path: typeTools, command: typed });
    if (!typed.close_observed) { result.status = 'INCONCLUSIVE'; throw Error('TSC_PROCESS_CLOSE_NOT_CONFIRMED'); }
    const tested = await runBounded(node, ['--test', '--test-concurrency=1', '--test-reporter=tap',
      '--test-reporter=./tools/agentnexus/json-reporter.mjs', '--test-reporter-destination=stdout', '--test-reporter-destination=stderr', ...tests],
    { cwd: workspace, env, timeout_ms: TIMEOUT_MS, stdout: join(out, 'all-tests.tap'), stderr: join(out, 'runner.stderr.txt') });
    emittedTap = true; result.test_command = tested;
    result.exit_code = tested.exit_code && tested.exit_code > 0 ? tested.exit_code : 1;
    const events = await parseEvents(join(out, 'runner.stderr.txt'), join(out, 'events.jsonl')); emittedEvents = true;
    Object.assign(result, events);
    result.tests = !tested.close_observed ? 'INCONCLUSIVE' : tested.status === 'PASS' && !events.errors.length && events.summary?.success === true ? 'PASS' : 'FAIL';
    const post = sourceSet(await inventory(workspace));
    result.source_snapshot_after_sha256 = post;
    if (post !== set) result.errors.push('WORKSPACE_SOURCE_CHANGED_DURING_TESTS');
    result.errors.push(...events.errors);
    result.status = !tested.close_observed ? 'INCONCLUSIVE' : result.syntax_pass && typed.status === 'PASS' && tested.status === 'PASS' &&
      !result.errors.length && events.summary?.success === true ? 'PASS' : 'FAIL';
    // Preserve an observed nonzero test exit code; never turn failed cases into PASS.
    result.exit_code = result.status === 'PASS' ? 0 : tested.exit_code && tested.exit_code > 0 ? tested.exit_code : 1;
  } catch (failure) {
    result.errors.push(message(failure));
    if (result.status !== 'INCONCLUSIVE') result.status = result.execution_started ? 'FAIL' : 'BLOCKED';
  } finally {
    await jsonIfMissing(join(out, 'source-manifest.json'), { schema: 'agentnexus/m1.8.1/source/1', status: 'BLOCKED', files: [], set_sha256: null });
    await jsonIfMissing(join(out, 'syntax.json'), { kind: 'NODE_SYNTAX_ONLY', status: 'NOT_RUN', checks: [] });
    await jsonIfMissing(join(out, 'typecheck.json'), { kind: 'STRICT_TSC_NO_EMIT', status: 'NOT_RUN', command: null });
    if (!emittedTap) await writeFile(join(out, 'all-tests.tap'), '', { flag: 'wx' }).catch(() => {});
    if (!emittedEvents) await writeFile(join(out, 'events.jsonl'), '', { flag: 'wx' }).catch(() => {});
    result.ended_at = new Date().toISOString();
    await json(join(out, 'results.json'), result);
    console.log(JSON.stringify({ out, status: result.status, exit_code: result.exit_code, sourceSet: result.source_set_sha256,
      summary: result.summary?.counts ?? null, syntax_pass: result.syntax_pass, tsc: result.tsc, tests: result.tests }));
    process.exitCode = result.exit_code;
  }
}

await main().catch(error => { console.error(JSON.stringify({ status: 'BLOCKED', error: message(error) })); process.exitCode = 1; });
