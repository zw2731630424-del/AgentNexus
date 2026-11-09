import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, realpathSync, renameSync, rmdirSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { EvidenceRpc } from './m151-rpc.ts';
import { assertResourceExecutionQualified, WINDOWS_RESOURCE_MECHANISMS } from '../../src/agentnexus/production/resources.ts';
import { QualificationGate } from '../../src/agentnexus/production/qualification.ts';
import type { Runtime, Tool } from '../../src/agentnexus/production/contracts.ts';

type FileResult = { content_base64: string; file_id: string; sha256: string; bytes: number; ancestor_handles_pinned: boolean; ancestor_share_write: boolean; ancestor_share_delete: boolean; ancestor_versions: { file_id: string; handle_path: string }[]; source: string; release_authority: boolean };
type Paths = { base: string; root: string; slot: string; saved: string; outside: string };
type AttackResult = { id: number; ok: boolean; error?: { code: string; message: string }; state: { junction: boolean; saved_present: boolean; resolved_target: string | null }; stats: { attempts: number; swaps: number; restores: number; faults_recovered: number; errors: Record<string, number>; samples: unknown[] } };
const windows = process.platform === 'win32' && !!process.env.AGENTNEXUS_TEST_POWERSHELL_PATH;
const denied = new Set(['REPARSE_REJECTED', 'WIN32_1920', 'WIN32_1921', 'WIN32_4390', 'WIN32_2', 'WIN32_3', 'WIN32_5', 'WIN32_32']);
const reparseDenied = new Set(['REPARSE_REJECTED', 'WIN32_1920', 'WIN32_1921', 'WIN32_4390']);
const equalPath = (a: string, b: string) => resolve(a).toLowerCase() === resolve(b).toLowerCase();
function digest(path: string) { const bytes = readFileSync(path); const s = statSync(path, { bigint: true }); return { path, dev: s.dev.toString(), ino: s.ino.toString(), size: s.size.toString(), birthtime_ns: s.birthtimeNs.toString(), mtime_ns: s.mtimeNs.toString(), sha256: createHash('sha256').update(bytes).digest('hex') }; }
function errorDetail(error: unknown) { const e = error as NodeJS.ErrnoException; return { code: e.code ?? e.name, errno: e.errno ?? null, syscall: e.syscall ?? null, message: e.message }; }
function assertOwned(p: Paths) { for (const path of [p.root, p.slot, p.saved, p.outside]) { const r = relative(resolve(p.base), resolve(path)); assert.ok(r && !r.startsWith('..') && !isAbsolute(r)); } }
function recover(p: Paths) {
  assertOwned(p);
  if (existsSync(p.slot) && lstatSync(p.slot).isSymbolicLink()) { assert.ok(equalPath(realpathSync(p.slot), realpathSync(p.outside))); rmdirSync(p.slot); }
  if (existsSync(p.saved)) { assert.equal(existsSync(p.slot), false); assert.equal(lstatSync(p.saved).isSymbolicLink(), false); renameSync(p.saved, p.slot); }
  assert.ok(existsSync(p.slot) && lstatSync(p.slot).isDirectory() && !lstatSync(p.slot).isSymbolicLink());
}
class Attacker {
  worker: Worker; serial = 0; pending = new Map<number, { resolve: (r: AttackResult) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  constructor(p: Paths) {
    assertOwned(p);
    this.worker = new Worker(new URL('./m161-toctou-worker.mjs', import.meta.url), { workerData: p });
    this.worker.on('message', (r: AttackResult) => { const w = this.pending.get(r.id); if (w) { clearTimeout(w.timer); this.pending.delete(r.id); w.resolve(r); } });
    const fail = (e: Error) => { for (const w of this.pending.values()) { clearTimeout(w.timer); w.reject(e); } this.pending.clear(); };
    this.worker.on('error', fail); this.worker.on('exit', code => fail(Error(`Fixture worker exited ${code}`)));
  }
  async call(command: string) { const id = ++this.serial; const r = await new Promise<AttackResult>((resolveResult, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(Error('Attacker fixture deadline')); }, 5000); this.pending.set(id, { resolve: resolveResult, reject, timer }); this.worker.postMessage({ id, command }); }); assert.equal(r.ok, true, JSON.stringify(r)); return r; }
  terminate() { return this.worker.terminate(); }
}

test('M161 CPU qualification: strict Windows profiles fail closed before certificate lookup', () => {
  assert.equal(WINDOWS_RESOURCE_MECHANISMS.find(x => x.resource === 'CPU')?.qualification, 'FAIL');
  assert.throws(() => assertResourceExecutionQualified('REAL_WINDOWS'), { code: 'M151_CPU_HARD_LIMIT_NOT_QUALIFIED' });
  // An unqualified strict request must fail before reading any caller-supplied
  // profile, signed certificate, or resource setting. This is a program gate.
  const gate = new QualificationGate(generateKeyPairSync('ed25519').publicKey);
  const strict = new Proxy({ assurance: 'REAL_WINDOWS' }, { get(target, key) { if (key !== 'assurance') throw Error('Certificate/profile lookup occurred before fail-closed gate'); return target.assurance; } }) as Runtime;
  assert.throws(() => gate.admit(strict, {} as Tool, ''), { code: 'M151_CPU_HARD_LIMIT_NOT_QUALIFIED' });
});

test('M161 REAL_WINDOWS_PRIMITIVE: observed junction replacement is denied, concurrent swaps and interrupted fixture recover', { skip: windows ? false : 'NOT_RUN: real Windows and an explicit PowerShell fixture path are required' }, async t => {
  const output = resolve(process.env.AGENTNEXUS_TEST_DATA_ROOT ?? '.workflow-kit/runtime/AgentNexus-M1.6.1/historical-failures', 'm161-historical');
  mkdirSync(output, { recursive: true });
  const base = mkdtempSync(join(output, 'toctou-'));
  const p: Paths = { base, root: join(base, 'root'), slot: join(base, 'root', 'slot'), saved: join(base, 'root', 'saved'), outside: join(base, 'outside') };
  assertOwned(p); mkdirSync(p.root); mkdirSync(p.slot); mkdirSync(p.outside);
  writeFileSync(join(p.slot, 'value'), 'safe'); writeFileSync(join(p.outside, 'value'), 'outside-secret');
  const report: Record<string, unknown> = { schema: 'agentnexus/m161/toctou-evidence/1', started_at: new Date().toISOString(), scope: 'REAL_WINDOWS_SAME_ACCOUNT_PRIMITIVE', base, system_configuration_changed: false, historical_tests_modified: false, status: 'INCONCLUSIVE', before: { safe: digest(join(p.slot, 'value')), outside: digest(join(p.outside, 'value')) } };
  const rpc = new EvidenceRpc(join(base, 'native-rpc'));
  t.after(() => rpc.close());
  let attacker: Attacker | undefined;
  const assertSafe = (r: FileResult, baseline: FileResult) => { assert.equal(Buffer.from(r.content_base64, 'base64').toString(), 'safe'); assert.equal(r.sha256, baseline.sha256); assert.equal(r.file_id, baseline.file_id); assert.equal(r.ancestor_handles_pinned, true); assert.equal(r.ancestor_share_write, false); assert.equal(r.ancestor_share_delete, false); assert.equal(r.source, 'REAL_WINDOWS_PRIMITIVE'); assert.equal(r.release_authority, false); };
  const read = () => rpc.call('file.read', { root: p.root, relative_path: 'slot\\value', max_bytes: 128 }, 1000);
  try {
    const before = await rpc.good<FileResult>('file.read', { root: p.root, relative_path: 'slot\\value', max_bytes: 128 });
    assertSafe(before, before); report.native_before = before;

    // Preserve the old algorithm as an instrumented diagnostic only. Its old
    // source and swaps>0 assertion remain untouched in m151-boundaries.test.ts.
    let attempts = 0, swaps = 0, active = false, successes = 0, rejections = 0;
    const errors: Record<string, number> = {}, samples: unknown[] = [];
    const swap = () => { attempts++; let stage = active ? 'UNLINK_JUNCTION' : 'RENAME_SAFE_DIRECTORY'; try { if (active) { unlinkSync(p.slot); stage = 'RESTORE_SAFE_DIRECTORY'; renameSync(p.saved, p.slot); active = false; } else { renameSync(p.slot, p.saved); try { stage = 'CREATE_JUNCTION'; symlinkSync(p.outside, p.slot, 'junction'); active = true; swaps++; } catch (e) { const createError = errorDetail(e); renameSync(p.saved, p.slot); throw Object.assign(Error(createError.message), createError); } } } catch (e) { const detail = errorDetail(e); const key = `${stage}:${detail.code}`; errors[key] = (errors[key] ?? 0) + 1; if (samples.length < 64) samples.push({ at: new Date().toISOString(), stage, ...detail }); } };
    const timer = setInterval(swap, 2);
    try { for (let i = 0; i < 40; i++) { const r = await read(); if (r.ok) { assertSafe(r.result as FileResult, before); successes++; } else { assert.ok(denied.has(r.error?.code ?? ''), JSON.stringify(r)); rejections++; } } }
    finally { clearInterval(timer); recover(p); }
    report.legacy_diagnostic = { diagnostic_only: true, original_requirement: 'swaps > 0', original_attack_requirement_met: swaps > 0, attempts, swaps, successes, rejections, errors, samples, explanation: 'Errors are observed instead of swallowed; no result here replaces the original historical verdict.' };

    // Isolate deletion semantics from scheduling/sharing. No product read is
    // credited for this probe, and no target directory is deleted.
    const probe = join(p.root, 'probe-junction');
    try { symlinkSync(p.outside, probe, 'junction'); }
    catch (e) { const detail = errorDetail(e); if (['EPERM', 'EACCES'].includes(detail.code)) { report.status = 'NOT_RUN'; report.reason = { phase: 'CREATE_JUNCTION', ...detail }; t.skip(`NOT_RUN: OS denied actual junction creation (${detail.code}); no ACL or privilege changed`); return; } throw e; }
    let unlinkResult: unknown = { succeeded: true };
    try { unlinkSync(probe); } catch (e) { unlinkResult = { succeeded: false, ...errorDetail(e), junction_still_present: lstatSync(probe).isSymbolicLink(), target: readlinkSync(probe) }; }
    if (existsSync(probe)) { assert.ok(lstatSync(probe).isSymbolicLink() && equalPath(realpathSync(probe), realpathSync(p.outside))); rmdirSync(probe); }
    report.junction_deletion_probe = { unlink: unlinkResult, rmdir_cleanup_complete: !existsSync(probe), target_after: digest(join(p.outside, 'value')) };

    attacker = new Attacker(p);
    const interrupted = await attacker.call('fault.afterRename');
    assert.equal(interrupted.stats.faults_recovered, 1); assert.equal(interrupted.state.junction, false); assert.equal(interrupted.state.saved_present, false);
    assertSafe(await rpc.good<FileResult>('file.read', { root: p.root, relative_path: 'slot\\value', max_bytes: 128 }), before);
    report.rename_interruption = { injection: 'EXPLICIT_FIXTURE_EXCEPTION_AFTER_REAL_OS_RENAME', result: interrupted, restored_file: digest(join(p.slot, 'value')) };

    const installed = await attacker.call('install');
    assert.equal(installed.state.junction, true); assert.ok(equalPath(installed.state.resolved_target!, realpathSync(p.outside))); assert.ok(installed.stats.swaps > 0, 'fixture must actually install junction replacements');
    const stableDenial = await read();
    assert.equal(stableDenial.ok, false); assert.ok(reparseDenied.has(stableDenial.error?.code ?? ''), JSON.stringify(stableDenial));
    assert.equal('result' in stableDenial, false, 'a denied boundary response must not contain external bytes');
    report.installed_attack = { installed, native_rejection: stableDenial, verified_junction: { target: readlinkSync(p.slot), resolved_target: realpathSync(p.slot) } };
    await attacker.call('stop');

    const cycleStart = await attacker.call('cycle');
    let concurrentSafe = 0, concurrentDenied = 0;
    const codes: Record<string, number> = {};
    for (let i = 0; i < 120; i++) { const r = await read(); if (r.ok) { assertSafe(r.result as FileResult, before); concurrentSafe++; } else { assert.ok(denied.has(r.error?.code ?? ''), JSON.stringify(r)); assert.equal('result' in r, false); const code = r.error!.code; codes[code] = (codes[code] ?? 0) + 1; concurrentDenied++; } }
    const cycleEnd = await attacker.call('stop');
    assert.ok(cycleEnd.stats.attempts > cycleStart.stats.attempts); assert.ok(cycleEnd.stats.swaps > cycleStart.stats.swaps, 'concurrent fixture must actually install junction replacements');
    assert.equal(concurrentSafe + concurrentDenied, 120);
    report.concurrent_attack = { start: cycleStart, end: cycleEnd, safe_reads: concurrentSafe, denied_reads: concurrentDenied, rejection_codes: codes, outside_bytes_returned: false };

    const beforeTermination = await attacker.call('install');
    assert.equal(beforeTermination.state.junction, true);
    const terminationCode = await attacker.terminate(); attacker = undefined;
    assert.equal(lstatSync(p.slot).isSymbolicLink(), true); assert.equal(existsSync(p.saved), true);
    const stranded = { target: readlinkSync(p.slot), resolved_target: realpathSync(p.slot), saved_file: digest(join(p.saved, 'value')) };
    recover(p);
    const after = await rpc.good<FileResult>('file.read', { root: p.root, relative_path: 'slot\\value', max_bytes: 128 }); assertSafe(after, before);
    report.worker_termination_recovery = { kind: 'ACTUAL_WORKER_THREAD_TERMINATION_AFTER_OS_JUNCTION_INSTALL', termination_code: terminationCode, before_termination: beforeTermination, stranded, restored: after };
    report.after = { safe: digest(join(p.slot, 'value')), outside: digest(join(p.outside, 'value')) };
    assert.deepEqual((report.after as { safe: unknown }).safe, (report.before as { safe: unknown }).safe);
    assert.deepEqual((report.after as { outside: unknown }).outside, (report.before as { outside: unknown }).outside);
    report.status = 'PASS'; report.outside_bytes_returned = false;
  } catch (e) { report.status = 'FAIL'; report.failure = errorDetail(e); throw e; }
  finally {
    if (attacker) await attacker.terminate();
    try { recover(p); report.final_recovery_complete = true; } catch (e) { report.final_recovery_complete = false; report.final_recovery_error = errorDetail(e); }
    report.finished_at = new Date().toISOString(); report.rpc_log = rpc.log;
    writeFileSync(join(base, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    t.diagnostic(`TOCTOU raw evidence: ${join(base, 'report.json')}`);
  }
});
