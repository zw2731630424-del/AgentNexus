import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, opendir, readFile, realpath, writeFile } from 'node:fs/promises';
import type { BigIntStats } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { canonical, sha256 } from '../types.ts';

export type PilotCandidate = { root: string; files: { path: string; sha256: string; bytes: number }[] };
export type PilotCheckStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'INCONCLUSIVE';
export type PilotFinding = {
  path: string; line: number; description: string; reproduction: string;
  evidence: { command_id: string; excerpt: string; stdout_path: string; stderr_path: string };
};
export type PilotCommandResult = {
  id: string; kind: 'syntax' | 'types' | 'tests'; executable: string; executable_sha256: string;
  argv: string[]; cwd: string; environment_keys: string[]; status: PilotCheckStatus;
  started_at: string; ended_at: string; exit_code: number | null; signal: string | null;
  close_observed: boolean; timed_out: boolean; output_limit: boolean; termination_requested: boolean;
  spawn_error: string | null; stdout: string; stderr: string; stdout_bytes: number; stderr_bytes: number;
  io_errors:string[];
  stdout_sha256: string; stderr_sha256: string; observed_stdout_sha256: string; observed_stderr_sha256: string;
  output_truncated: boolean; stdout_path: string; stderr_path: string;
};
export type PilotCheckPhase = { status: PilotCheckStatus | 'NOT_RUN'; commands: PilotCommandResult[] };
export type PilotCheckReport = {
  schema: 'agentnexus/m17/pilot-check/1'; status: PilotCheckStatus;
  scope: 'LOCAL_TRUSTED_FIXED_RUNNER'; production_os_qualified: false; automatic_retry: false;
  candidate_hash: string; candidate_files: PilotCandidate['files']; root: string;
  evidence_directory: string | null; snapshot_root: string | null; scratch_directory: string | null; execution_started: boolean;
  syntax: PilotCheckPhase; types: PilotCheckPhase; tests: PilotCheckPhase;
  findings: PilotFinding[]; reason: string | null;
  toolchain: { node_version: string; node_sha256: string; typescript_version: string; node_types_version: string; files: { path: string; sha256: string }[] } | null;
  limitation: string;
};

const SOURCE_FILES = ['src/model.ts', 'src/analytics.ts', 'src/cli.ts', 'src/entry.ts'] as const;
const TEST_FILES = ['tests/model.test.ts', 'tests/analytics.test.ts', 'tests/cli.test.ts'] as const;
const REQUIRED = [...SOURCE_FILES, ...TEST_FILES, 'package.json', 'tsconfig.json'];
const ALLOWED = new Set([...REQUIRED, 'README.md']);
const FILE_LIMIT = 65536, TOTAL_LIMIT = 1048576;
const pendingCloses = new Set<string>();
class CheckBlocked extends Error {
  readonly code: string; readonly path: string;
  constructor(code: string, path = '', message = code) { super(message); this.code = code; this.path = path; }
}
function requireCheck(value: unknown, code: string, path = ''): asserts value {
  if (!value) throw new CheckBlocked(code, path);
}
const key = (path: string) => process.platform === 'win32' ? path.toLowerCase() : path;
function below(root: string, path: string): boolean {
  const r = relative(root, path); return r === '' || (!isAbsolute(r) && r !== '..' && !r.startsWith('..' + sep));
}
function identity(s: BigIntStats): string { return [s.dev, s.ino, s.mode, s.birthtimeNs].join(':'); }
async function hashFile(path:string):Promise<string>{const hash=createHash('sha256');for await(const chunk of createReadStream(path,{highWaterMark:65536}))hash.update(chunk);return hash.digest('hex');}
type Pin = { path: string; identity: string; real: string };

/** Only the trusted Host calls this function. Hash allow-list approval is for code
 * content, not merely a filename. This module is never registered as an Agent
 * READ_ONLY tool and does not turn a trusted Node process into an OS sandbox. */
async function pinPath(path: string, directory: boolean): Promise<Pin> {
  const s = await lstat(path, { bigint: true });
  requireCheck(!s.isSymbolicLink() && (directory ? s.isDirectory() : s.isFile()), 'NON_REGULAR_OR_LINK', path);
  const actual = await realpath(path);
  requireCheck(key(resolve(actual)) === key(resolve(path)), 'REALPATH_ALIAS', path);
  return { path, identity: identity(s), real: key(actual) };
}
async function ancestorPins(path: string): Promise<Pin[]> {
  const paths: string[] = []; for (let p = resolve(path);; p = dirname(p)) { paths.push(p); if (dirname(p) === p) break; }
  const pins: Pin[] = []; for (const p of paths.reverse()) pins.push(await pinPath(p, true)); return pins;
}
async function recheckPins(pins: Pin[]): Promise<void> {
  for (const p of pins) { const now = await pinPath(p.path, true); requireCheck(now.identity === p.identity && now.real === p.real, 'ANCESTOR_CHANGED', p.path); }
}
type Captured = { manifest: PilotCandidate['files']; bytes: Map<string, Buffer>; pins: Pin[] };
async function capture(candidate: PilotCandidate, allowed: ReadonlySet<string>): Promise<Captured> {
  requireCheck(typeof candidate.root === 'string' && isAbsolute(candidate.root), 'ABSOLUTE_CANDIDATE_ROOT_REQUIRED');
  requireCheck(Array.isArray(candidate.files) && candidate.files.length >= REQUIRED.length && candidate.files.length <= ALLOWED.size, 'EXACT_MANIFEST_REQUIRED');
  const names = new Set<string>(); let total = 0;
  for (const f of candidate.files) {
    requireCheck(f !== null && typeof f === 'object' && Object.keys(f).sort().join(',') === 'bytes,path,sha256', 'MANIFEST_FIELDS');
    requireCheck(typeof f.path === 'string' && ALLOWED.has(f.path) && !names.has(f.path), 'MANIFEST_PATH_OR_DUPLICATE', f.path);
    requireCheck(typeof f.sha256 === 'string' && /^[a-f0-9]{64}$/.test(f.sha256) && allowed.has(f.sha256), 'HOST_HASH_NOT_ALLOWED', f.path);
    requireCheck(Number.isSafeInteger(f.bytes) && f.bytes >= 0 && f.bytes <= FILE_LIMIT, 'FILE_LIMIT', f.path);
    names.add(f.path); total += f.bytes;
  }
  requireCheck(REQUIRED.every(p => names.has(p)) && total <= TOTAL_LIMIT, 'EXACT_MANIFEST_REQUIRED');
  const root = resolve(candidate.root), pins = await ancestorPins(root), actual: string[] = []; let discovered = 0;
  async function visit(directory: string): Promise<void> {
    for await (const entry of await opendir(directory)) {
      requireCheck(++discovered <= ALLOWED.size + 2, 'CANDIDATE_ENTRY_LIMIT');
      const path = join(directory, entry.name), rel = relative(root, path).split(sep).join('/');
      const stat = await lstat(path, { bigint: true });
      requireCheck(!stat.isSymbolicLink(), 'NON_REGULAR_OR_LINK', rel);
      if (stat.isDirectory()) {
        requireCheck(rel === 'src' || rel === 'tests', 'EXTRA_DIRECTORY', rel);
        pins.push(await pinPath(path, true)); await visit(path);
      } else {
        requireCheck(stat.isFile() && stat.nlink === 1n && stat.size <= BigInt(FILE_LIMIT), 'NON_REGULAR_LINK_OR_LIMIT', rel);
        await pinPath(path, false); actual.push(rel);
      }
    }
  }
  await visit(root); actual.sort();
  const manifest = candidate.files.map(f => ({ ...f })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  requireCheck(canonical(actual) === canonical(manifest.map(f => f.path)), 'MANIFEST_INCOMPLETE');
  const bytes = new Map<string, Buffer>();
  for (const f of manifest) {
    const path = join(root, f.path), before = await lstat(path, { bigint: true });
    requireCheck(before.size <= BigInt(FILE_LIMIT), 'FILE_LIMIT', f.path); await pinPath(path, false);
    // Check the opened object's identity before reading any data, and allocate
    // at most 64KiB+1 even if a trusted mutator grows/replaces a path meanwhile.
    const handle = await open(path, 'r'); let content: Buffer;
    try {
      const opened = await handle.stat({ bigint: true });
      requireCheck(opened.isFile() && opened.nlink === 1n && identity(opened) === identity(before) && opened.size === before.size && opened.mtimeNs === before.mtimeNs && opened.ctimeNs === before.ctimeNs, 'FILE_CHANGED_BEFORE_READ', f.path);
      const buffer = Buffer.alloc(FILE_LIMIT + 1); let used = 0;
      while (used < buffer.length) { const read = await handle.read(buffer, used, buffer.length - used, null); if (!read.bytesRead) break; used += read.bytesRead; }
      requireCheck(used <= FILE_LIMIT, 'FILE_LIMIT', f.path); content = Buffer.from(buffer.subarray(0, used));
      const settled = await handle.stat({ bigint: true });
      requireCheck(identity(settled) === identity(opened) && settled.size === opened.size && settled.mtimeNs === opened.mtimeNs && settled.ctimeNs === opened.ctimeNs, 'FILE_CHANGED_DURING_READ', f.path);
    } finally { await handle.close(); }
    const after = await lstat(path, { bigint: true });
    requireCheck(!after.isSymbolicLink() && after.isFile() && after.nlink === 1n && identity(before) === identity(after) && before.size === after.size && before.mtimeNs === after.mtimeNs && before.ctimeNs === after.ctimeNs, 'FILE_CHANGED', f.path);
    await pinPath(path, false);
    requireCheck(content.length === f.bytes && sha256(content) === f.sha256, 'CANDIDATE_HASH_OR_SIZE_CHANGED', f.path); bytes.set(f.path, content);
  }
  await recheckPins(pins);
  // The configuration files are approved content too, but never executable
  // configuration for the checker: tsc receives files and every option explicitly.
  const parse = (name: string): Record<string, unknown> => {
    try { const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.get(name)!)); requireCheck(value !== null && typeof value === 'object' && !Array.isArray(value), 'CONFIG_OBJECT_REQUIRED', name); return value as Record<string, unknown>; }
    catch (e) { if (e instanceof CheckBlocked) throw e; throw new CheckBlocked('INVALID_CONFIG_JSON', name); }
  };
  const pkg = parse('package.json'); requireCheck(pkg.type === 'module' && !('imports' in pkg) && !('exports' in pkg), 'FIXED_MODULE_PACKAGE_REQUIRED', 'package.json');
  const config = parse('tsconfig.json'), compiler = config.compilerOptions;
  requireCheck(compiler !== null && typeof compiler === 'object' && !Array.isArray(compiler), 'FIXED_NO_EMIT_CONFIG_REQUIRED', 'tsconfig.json');
  const forbidden = new Set(['extends', 'references', 'plugins', 'out', 'outDir', 'outFile', 'declarationDir', 'tsBuildInfoFile']);
  function configKeys(value: unknown): void {
    if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) {
      requireCheck(!forbidden.has(name) && !/^emit/i.test(name) && !(name === 'incremental' && child !== false) && !(name === 'declaration' && child !== false), 'UNSUPPORTED_CONFIG_OPTION', 'tsconfig.json'); configKeys(child);
    }
  }
  configKeys(config); requireCheck((compiler as Record<string, unknown>).noEmit === true, 'FIXED_NO_EMIT_CONFIG_REQUIRED', 'tsconfig.json');
  return { manifest, bytes, pins };
}

async function toolchain(typeRoot: string, root: string): Promise<NonNullable<PilotCheckReport['toolchain']> & { tsc: string; typeRoots: string }> {
  requireCheck(process.version === 'v24.15.0', 'NODE_VERSION_NOT_PINNED');
  requireCheck(typeof typeRoot === 'string' && isAbsolute(typeRoot) && !below(root, resolve(typeRoot)), 'TRUSTED_TYPE_TOOLS_REQUIRED');
  await ancestorPins(resolve(typeRoot)); await pinPath(process.execPath, false);
  const modules = join(resolve(typeRoot), 'node_modules'), tsc = join(modules, 'typescript/lib/tsc.js');
  const paths = [join(modules, 'typescript/package.json'), tsc, join(modules, 'typescript/lib/_tsc.js'), join(modules, '@types/node/package.json')];
  const files: { path: string; sha256: string }[] = [];
  for (const path of paths) { await ancestorPins(dirname(path)); await pinPath(path, false); files.push({ path, sha256: await hashFile(path) }); }
  const ts = JSON.parse(await readFile(paths[0]!, 'utf8')) as { version: string }, types = JSON.parse(await readFile(paths[3]!, 'utf8')) as { version: string };
  requireCheck(ts.version === '5.9.3' && types.version === '24.10.1', 'TYPE_TOOL_VERSION_NOT_PINNED');
  return { node_version: process.version, node_sha256: await hashFile(process.execPath), typescript_version: ts.version, node_types_version: types.version, files, tsc, typeRoots: join(modules, '@types') };
}

async function execute(kind: PilotCommandResult['kind'], argv: string[], cwd: string, evidence: string, nodeHash: string, timeout: number, maxOutput: number): Promise<PilotCommandResult> {
  const id = kind + '-' + randomUUID(), started = new Date().toISOString();
  const temporary = join(evidence, 'tmp');
  const env: NodeJS.ProcessEnv = { NODE_OPTIONS: '', NODE_PATH: '', TEMP: temporary, TMP: temporary, AGENTNEXUS_PILOT_SCRATCH: join(evidence, 'scratch') };
  if (process.platform === 'win32') { env.SystemRoot = process.env.SystemRoot ?? 'C:\\Windows'; env.WINDIR = process.env.WINDIR ?? env.SystemRoot; }
  let code: number | null = null, signal: string | null = null, closed = false, timedOut = false, outputLimit = false, terminated = false, spawnError: string | null = null;
  const ioErrors:string[]=[];
  const out: Buffer[] = [], err: Buffer[] = []; let outBytes = 0, errBytes = 0, retained = 0, sealed = false;
  const outHash = createHash('sha256'), errHash = createHash('sha256');
  let release!: () => void; const completion = new Promise<void>(r => { release = r; });
  const child = spawn(process.execPath, argv, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => { if (terminated || closed) return; terminated = true; try { child.kill(); } catch (e) { if(ioErrors.length<4)ioErrors.push('terminate: '+(e as Error).message.slice(0,512)); } closeTimer = setTimeout(release, 2000); };
  const collect = (channel: 'stdout' | 'stderr', bytes: Buffer) => {
    if (sealed) return;
    (channel === 'stdout' ? outHash : errHash).update(bytes);
    if (channel === 'stdout') outBytes += bytes.length; else errBytes += bytes.length;
    const keep = Math.min(bytes.length, Math.max(0, maxOutput - retained)); if (keep) (channel === 'stdout' ? out : err).push(Buffer.from(bytes.subarray(0, keep))); retained += keep;
    if (outBytes + errBytes > maxOutput) { outputLimit = true; stop(); }
  };
  child.stdout.on('data', (b: Buffer) => collect('stdout', b)); child.stderr.on('data', (b: Buffer) => collect('stderr', b));
  const pipeError=(channel:string,error:Error)=>{if(ioErrors.length<4)ioErrors.push(channel+': '+error.message.slice(0,512));if(child.pid!==undefined)stop();};
  // Failed Windows spawn may emit ENOTCONN on either pipe after the child error.
  // Observe it locally; a started process with incomplete output remains uncertain.
  child.stdout.on('error',(error:Error)=>pipeError('stdout',error));child.stderr.on('error',(error:Error)=>pipeError('stderr',error));
  child.on('error', (e: Error) => { spawnError = e.message; });
  child.once('close', (exit, why) => { code = exit; signal = why; closed = true; pendingCloses.delete(id); release(); });
  const timer = setTimeout(() => { timedOut = true; stop(); }, timeout);
  await completion; clearTimeout(timer); clearTimeout(closeTimer);
  if (!closed) { pendingCloses.add(id); child.stdout.pause(); child.stderr.pause(); }
  sealed = true;
  const stdout = Buffer.concat(out), stderr = Buffer.concat(err), stdoutPath = join(evidence, id + '.stdout.txt'), stderrPath = join(evidence, id + '.stderr.txt');
  await writeFile(stdoutPath, stdout, { flag: 'wx' }); await writeFile(stderrPath, stderr, { flag: 'wx' });
  const result: PilotCommandResult = {
    id, kind, executable: process.execPath, executable_sha256: nodeHash, argv: [...argv], cwd, environment_keys: Object.keys(env).sort(),
    status: !closed || (ioErrors.length>0&&child.pid!==undefined) ? 'INCONCLUSIVE' : spawnError ? 'BLOCKED' : ioErrors.length>0?'INCONCLUSIVE':timedOut || outputLimit || code !== 0 || signal !== null ? 'FAIL' : 'PASS',
    started_at: started, ended_at: new Date().toISOString(), exit_code: code, signal, close_observed: closed, timed_out: timedOut, output_limit: outputLimit, termination_requested: terminated, spawn_error: spawnError,
    io_errors:ioErrors,stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8'), stdout_bytes: outBytes, stderr_bytes: errBytes,
    stdout_sha256: sha256(stdout), stderr_sha256: sha256(stderr), observed_stdout_sha256: outHash.digest('hex'), observed_stderr_sha256: errHash.digest('hex'),
    output_truncated: outBytes + errBytes > retained, stdout_path: stdoutPath, stderr_path: stderrPath,
  };
  await writeFile(join(evidence, id + '.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); return result;
}

function commandFindings(command: PilotCommandResult, files: PilotCandidate['files']): PilotFinding[] {
  if (command.status === 'PASS' || command.timed_out || command.output_limit || command.spawn_error || command.io_errors.length>0 || !command.close_observed) return [];
  const text = (command.stderr + '\n' + command.stdout).replaceAll('\\', '/'), lines = text.split(/\r?\n/), findings: PilotFinding[] = [];
  const summary = lines.find(l => /error TS\d+|SyntaxError|AssertionError|error:|not ok/.test(l))?.trim() ?? (command.timed_out ? 'Fixed check exceeded its deadline' : command.output_limit ? 'Fixed check exceeded its output budget' : command.spawn_error ?? 'Fixed check did not pass');
  for (let index = 0; index < lines.length && findings.length < 32; index++) {
    for (const file of files.filter(f => f.path.endsWith('.ts'))) {
      const match = new RegExp(file.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?::|\\()(\\d+)(?=[:,)]|$)').exec(lines[index]!);
      if (!match || findings.some(f => f.path === file.path && f.line === Number(match[1]))) continue;
      findings.push({ path: file.path, line: Number(match[1]), description: /error TS\d+/.test(lines[index]!) ? lines[index]!.trim() : summary, reproduction: canonical({ executable: command.executable, argv: command.argv, cwd: command.cwd }), evidence: { command_id: command.id, excerpt: lines.slice(Math.max(0, index - 2), index + 7).join('\n').slice(0, 4096), stdout_path: command.stdout_path, stderr_path: command.stderr_path } });
    }
  }
  return findings;
}

export async function runPilotChecks(candidate: PilotCandidate, options: { allowed_hashes: ReadonlySet<string>; type_tools_root: string; timeout_ms?: number; max_output_bytes?: number }): Promise<PilotCheckReport> {
  const report: PilotCheckReport = {
    schema: 'agentnexus/m17/pilot-check/1', status: 'BLOCKED', scope: 'LOCAL_TRUSTED_FIXED_RUNNER', production_os_qualified: false, automatic_retry: false,
    candidate_hash: '', candidate_files: [], root: '', evidence_directory: null, snapshot_root: null, scratch_directory: null, execution_started: false,
    syntax: { status: 'NOT_RUN', commands: [] }, types: { status: 'NOT_RUN', commands: [] }, tests: { status: 'NOT_RUN', commands: [] }, findings: [], reason: null, toolchain: null,
    limitation: 'Host-approved code runs in a trusted local Node process. Node --check is recorded independently and does not replace mandatory strict TypeScript checking. No hostile-process sandbox, cumulative CPU qualification, descendant-tree exit or Agent PROCESS capability is claimed.',
  };
  try {
    // Own all caller-controlled data before the first await.
    const owned = JSON.parse(canonical(candidate)) as PilotCandidate, allowed = new Set(options.allowed_hashes), typeRoot = options.type_tools_root;
    const timeout = options.timeout_ms ?? 15000, maxOutput = options.max_output_bytes ?? 262144;
    requireCheck(Number.isSafeInteger(timeout) && timeout >= 1 && timeout <= 30000 && Number.isSafeInteger(maxOutput) && maxOutput >= 256 && maxOutput <= TOTAL_LIMIT, 'CHECK_BOUNDS');
    requireCheck(pendingCloses.size === 0, 'PRIOR_RUN_CLOSE_UNCONFIRMED');
    const captured = await capture(owned, allowed); report.root = resolve(owned.root); report.candidate_files = captured.manifest; report.candidate_hash = sha256(canonical(captured.manifest));
    const chain = await toolchain(typeRoot, report.root); report.toolchain = { node_version: chain.node_version, node_sha256: chain.node_sha256, typescript_version: chain.typescript_version, node_types_version: chain.node_types_version, files: chain.files };
    const evidence = join(dirname(report.root), 'checker-evidence-' + randomUUID()), snapshot = join(evidence, 'candidate');
    requireCheck(!below(report.root, evidence), 'EVIDENCE_INSIDE_CANDIDATE'); await recheckPins(captured.pins);
    await mkdir(evidence, { recursive: false }); report.evidence_directory = evidence; report.snapshot_root = snapshot; report.scratch_directory = join(evidence, 'scratch');
    await mkdir(snapshot); await mkdir(join(snapshot, 'src')); await mkdir(join(snapshot, 'tests')); await mkdir(join(evidence, 'tmp')); await mkdir(join(evidence, 'scratch'));
    for (const file of captured.manifest) await writeFile(join(snapshot, file.path), captured.bytes.get(file.path)!, { flag: 'wx' });
    await recheckPins(captured.pins); await capture(owned, allowed); await recheckPins(captured.pins); // Original identities/bytes must still agree after the private capture.
    const snapshotCandidate = { root: snapshot, files: captured.manifest };
    const run = async (kind: PilotCommandResult['kind'], argv: string[]): Promise<boolean> => {
      await capture(snapshotCandidate, allowed);
      requireCheck(await hashFile(process.execPath) === chain.node_sha256, 'NODE_EXECUTABLE_CHANGED');
      for (const file of chain.files) requireCheck(await hashFile(file.path) === file.sha256, 'TYPE_TOOL_CHANGED', file.path);
      report.execution_started = true;
      const result = await execute(kind, argv, snapshot, evidence, chain.node_sha256, timeout, maxOutput);
      report[kind].commands.push(result); report[kind].status = result.status; report.findings.push(...commandFindings(result, captured.manifest));
      if (result.status !== 'PASS') report.reason = result.timed_out ? 'CHECK_DEADLINE' : result.output_limit ? 'CHECK_OUTPUT_LIMIT' : !result.close_observed ? 'CHECK_CLOSE_UNCONFIRMED' : 'CHECK_COMMAND_FAILED: ' + result.id;
      await capture(snapshotCandidate, allowed); return result.status === 'PASS';
    };
    for (const file of [...SOURCE_FILES, ...TEST_FILES]) if (!await run('syntax', ['--check', file])) { report.status = report.syntax.status as PilotCheckStatus; return report; }
    if (!await run('types', [chain.tsc, '--noEmit', '--strict', '--target', 'ES2024', '--lib', 'ES2024', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--allowImportingTsExtensions', '--skipLibCheck', 'false', '--forceConsistentCasingInFileNames', 'true', '--types', 'node', '--typeRoots', chain.typeRoots, '--pretty', 'false', ...SOURCE_FILES, ...TEST_FILES])) { report.status = report.types.status as PilotCheckStatus; return report; }
    if (!await run('tests', ['--test', '--test-concurrency=1', ...TEST_FILES])) { report.status = report.tests.status as PilotCheckStatus; return report; }
    report.status = 'PASS'; return report;
  } catch (e) {
    report.status = report.execution_started ? 'INCONCLUSIVE' : 'BLOCKED'; report.reason = e instanceof CheckBlocked ? e.code + (e.path ? ': ' + e.path : '') : (e as Error).message;
    return report;
  } finally {
    if (report.evidence_directory) await writeFile(join(report.evidence_directory, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
}
