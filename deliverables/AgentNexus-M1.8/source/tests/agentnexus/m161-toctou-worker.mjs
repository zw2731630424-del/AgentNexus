import { parentPort, workerData } from 'node:worker_threads';
import { existsSync, lstatSync, readlinkSync, realpathSync, renameSync, rmdirSync, symlinkSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

// This is an attacker fixture, never a production file owner. It only renames
// its two owned sibling directories and removes its own verified junction.
const { base, slot, saved, outside } = workerData;
for (const path of [slot, saved, outside]) {
  const r = relative(resolve(base), resolve(path));
  if (!r || r.startsWith('..') || isAbsolute(r)) throw Error('FIXTURE_PATH_OUTSIDE_BASE');
}
const equalPath = (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase();
const stats = { attempts: 0, swaps: 0, restores: 0, rollbacks: 0, faults_recovered: 0, errors: {}, samples: [] };
let timer;
function recordError(stage, error) {
  const key = `${stage}:${error.code ?? error.name}`;
  stats.errors[key] = (stats.errors[key] ?? 0) + 1;
  if (stats.samples.length < 64) stats.samples.push({ at: new Date().toISOString(), stage, code: error.code ?? null, errno: error.errno ?? null, syscall: error.syscall ?? null, message: error.message });
}
function state() {
  const present = existsSync(slot);
  const junction = present && lstatSync(slot).isSymbolicLink();
  return { slot_present: present, saved_present: existsSync(saved), junction, target: junction ? readlinkSync(slot) : null, resolved_target: junction ? realpathSync(slot) : null };
}
function removeOwnJunction() {
  if (!lstatSync(slot).isSymbolicLink() || !equalPath(realpathSync(slot), realpathSync(outside))) throw Error('FIXTURE_UNEXPECTED_SLOT');
  // Windows directory junctions are removed with rmdir, without recursion.
  rmdirSync(slot);
}
function restore() {
  if (existsSync(slot) && lstatSync(slot).isSymbolicLink()) removeOwnJunction();
  if (existsSync(saved)) {
    if (existsSync(slot) || lstatSync(saved).isSymbolicLink() || !lstatSync(saved).isDirectory()) throw Error('FIXTURE_RESTORE_CONFLICT');
    renameSync(saved, slot);
    stats.restores++;
  }
  if (!existsSync(slot) || lstatSync(slot).isSymbolicLink()) throw Error('FIXTURE_RESTORE_INCOMPLETE');
}
function install(faultAfterRename = false) {
  if (existsSync(saved) || lstatSync(slot).isSymbolicLink() || !lstatSync(slot).isDirectory()) throw Error('FIXTURE_INSTALL_CONFLICT');
  let stage = 'RENAME_SAFE_DIRECTORY';
  try {
    renameSync(slot, saved);
    if (faultAfterRename) throw Object.assign(Error('Intentional fixture interruption after successful OS rename'), { code: 'INJECTED_AFTER_RENAME' });
    stage = 'CREATE_JUNCTION';
    symlinkSync(outside, slot, 'junction');
    const s = state();
    if (!s.junction || !equalPath(s.resolved_target, realpathSync(outside))) throw Error('FIXTURE_JUNCTION_NOT_INSTALLED');
    stats.swaps++;
  } catch (error) {
    recordError(stage, error);
    // An interrupted rename/create sequence is recovered explicitly. A failed
    // recovery is surfaced; it is not silently called an OS sharing denial.
    restore();
    stats.rollbacks++;
    if (error.code === 'INJECTED_AFTER_RENAME') { stats.faults_recovered++; return; }
    throw error;
  }
}
function stop() { if (timer) clearInterval(timer); timer = undefined; }
parentPort.on('message', ({ id, command }) => {
  try {
    if (command === 'install') { stop(); stats.attempts++; install(); }
    else if (command === 'fault.afterRename') { stop(); stats.attempts++; install(true); }
    else if (command === 'cycle') {
      stop();
      timer = setInterval(() => {
        stats.attempts++;
        try { if (existsSync(saved)) restore(); else install(); }
        catch (error) { recordError('CONCURRENT_TOGGLE', error); }
      }, 1);
    } else if (command === 'stop') { stop(); restore(); }
    else throw Error('FIXTURE_UNKNOWN_COMMAND');
    parentPort.postMessage({ id, ok: true, state: state(), stats: structuredClone(stats) });
  } catch (error) {
    recordError(command, error);
    parentPort.postMessage({ id, ok: false, error: { code: error.code ?? error.name, message: error.message }, state: state(), stats: structuredClone(stats) });
  }
});
