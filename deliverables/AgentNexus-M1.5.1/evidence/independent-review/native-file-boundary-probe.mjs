// Independent same-account native file primitive probe. Does not modify product,
// the original failed test, ACLs, accounts, profiles or any external project.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, renameSync, symlinkSync, unlinkSync, lstatSync, realpathSync, existsSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const [sourceArg, outArg] = process.argv.slice(2);
assert.ok(sourceArg && outArg);
const source = resolve(sourceArg), out = resolve(outArg);
mkdirSync(out, { recursive: true });
const base = mkdtempSync(join(out, 'case-'));
const root = join(base, 'root'), slot = join(root, 'slot'), saved = join(root, 'saved'), outside = join(base, 'outside');
for (const path of [root, slot, saved, outside]) {
  const r = relative(base, resolve(path)); assert.ok(r && !r.startsWith('..') && !isAbsolute(r), 'owned fixture paths must remain within assigned base');
}
mkdirSync(root); mkdirSync(slot); mkdirSync(outside);
const safe = Buffer.from('safe'), outsideBytes = Buffer.from('outside-canary-' + randomUUID());
writeFileSync(join(slot, 'value'), safe); writeFileSync(join(outside, 'value'), outsideBytes);
const expectedHash = createHash('sha256').update(safe).digest('hex');
const { EvidenceRpc } = await import(pathToFileURL(join(source, 'tests/agentnexus/m151-rpc.ts')).href);
const rpc = new EvidenceRpc(join(base, 'raw'));
const records = [];
let originalFileId, state = 'SAFE', swaps = 0, attempts = 0, timer;
const swapErrors = {}, denialCodes = {};
let baselinePassed = false, restoredPassed = false, completed = 0, safeRaceReads = 0, deniedRaceReads = 0;
const planned = 80;
function samePath(a, b) { return resolve(a).toLowerCase() === resolve(b).toLowerCase(); }
function validateSafe(packet, stage) {
  assert.equal(packet.ok, true, JSON.stringify(packet));
  assert.deepEqual(Object.keys(packet).sort(), ['id', 'ok', 'result']);
  const r = packet.result, bytes = Buffer.from(r.content_base64, 'base64');
  assert.equal(bytes.toString('base64'), r.content_base64);
  assert.deepEqual(bytes, safe, 'successful response must contain only original safe bytes');
  assert.equal(r.bytes, safe.length); assert.equal(r.sha256, expectedHash);
  if (originalFileId) assert.equal(r.file_id, originalFileId, 'successful response must retain original file identity');
  else originalFileId = r.file_id;
  assert.equal(r.ancestor_handles_pinned, true); assert.equal(r.ancestor_share_write, false); assert.equal(r.ancestor_share_delete, false);
  assert.equal(r.release_authority, false); assert.equal(r.source, 'REAL_WINDOWS_PRIMITIVE');
  records.push({ stage, id: packet.id, outcome: 'SAFE', file_id: r.file_id, sha256: r.sha256, bytes: r.bytes });
}
function validateDenial(packet, stage) {
  assert.equal(packet.ok, false, JSON.stringify(packet));
  assert.deepEqual(Object.keys(packet).sort(), ['error', 'id', 'ok'], 'denial must have no result or payload field');
  assert.deepEqual(Object.keys(packet.error).sort(), ['code', 'message']);
  assert.equal(typeof packet.error.code, 'string'); assert.equal(typeof packet.error.message, 'string');
  assert.ok(/^WIN32_[1-9][0-9]*$/.test(packet.error.code) || ['REPARSE_REJECTED', 'ACCESS_DENIED', 'FILE_VERSION', 'FILE_TYPE', 'HARDLINK_REJECTED', 'PATH_REJECTED', 'ROOT_REJECTED', 'FILE_LIMIT'].includes(packet.error.code), 'transport, invalid-request and deadline errors are not counted as security denials');
  const text = JSON.stringify(packet);
  assert.ok(!text.includes(outsideBytes.toString()) && !text.includes(outsideBytes.toString('base64')), 'denial must not disclose canary content in error text');
  denialCodes[packet.error.code] = (denialCodes[packet.error.code] ?? 0) + 1;
  records.push({ stage, id: packet.id, outcome: 'DENIED_NO_PAYLOAD', code: packet.error.code });
}
async function read(stage, expected) {
  const p = await rpc.call('file.read', { root, relative_path: 'slot\\value', max_bytes: 128 }, 2000);
  if (expected === 'SAFE') validateSafe(p, stage);
  else if (expected === 'DENIED') validateDenial(p, stage);
  else if (p.ok) { validateSafe(p, stage); safeRaceReads++; }
  else { validateDenial(p, stage); deniedRaceReads++; }
  return p;
}
function restore() {
  if (state === 'JUNCTION') { assert.equal(lstatSync(slot).isSymbolicLink(), true); unlinkSync(slot); state = 'MISSING'; }
  if (state === 'MISSING') { renameSync(saved, slot); state = 'SAFE'; }
}
function swap() {
  attempts++;
  try {
    if (state === 'MISSING') { restore(); return; }
    if (state === 'JUNCTION') { restore(); return; }
    renameSync(slot, saved); state = 'MISSING';
    try { symlinkSync(outside, slot, 'junction'); state = 'JUNCTION'; swaps++; }
    catch (error) { restore(); throw error; }
  } catch (error) { const code = error.code ?? error.name; swapErrors[code] = (swapErrors[code] ?? 0) + 1; }
}
const start = new Date().toISOString();
let failure;
try {
  await read('BASELINE', 'SAFE'); baselinePassed = true;
  renameSync(slot, saved); state = 'MISSING';
  await read('DETERMINISTIC_MISSING_COMPONENT', 'DENIED');
  symlinkSync(outside, slot, 'junction'); state = 'JUNCTION'; swaps++;
  assert.equal(lstatSync(slot).isSymbolicLink(), true);
  assert.ok(samePath(realpathSync(slot), outside), 'junction must actually resolve to the owned outside fixture');
  await read('DETERMINISTIC_REAL_JUNCTION', 'DENIED');
  restore(); await read('RESTORED_BEFORE_RACE', 'SAFE');
  timer = setInterval(swap, 2);
  try { for (let n = 1; n <= planned; n++) { await read('RACE_' + n, 'EITHER_SAFE_OR_STRUCTURAL_DENIAL'); completed++; } }
  finally { clearInterval(timer); restore(); }
  await read('RESTORED_AFTER_RACE', 'SAFE'); restoredPassed = true;
  assert.ok(attempts > 0 && swaps > 1, 'race must include real successful junction replacements');
  assert.equal(completed, planned); assert.equal(safeRaceReads + deniedRaceReads, planned);
  assert.equal(readFileSync(join(outside, 'value')).equals(outsideBytes), true);
  assert.equal(readFileSync(join(slot, 'value')).equals(safe), true);
} catch (error) { failure = { code: error.code ?? null, message: error.message, stack: error.stack }; }
finally { clearInterval(timer); try { restore(); } catch (error) { failure ??= { code: error.code ?? null, message: error.message, stack: error.stack }; } await rpc.close(); }
const result = {
  schema: 'agentnexus/m151/independent-native-file-boundary/1',
  started_at: start, ended_at: new Date().toISOString(),
  source, data: base, raw_log: rpc.log,
  source_set_sha256: '4825d2432a01a497a68971fab57909bc9613b38ff087346afbcceba56f7aa9fa',
  assurance: 'REAL_OS_CURRENT_ACCOUNT_FILE_PRIMITIVE; NO CROSS_ACCOUNT_OR_PRODUCTION_QUALIFICATION',
  criterion: 'Each successful read equals original safe bytes/hash/file identity; every error is a structural native denial without result/payload/canary. Baseline, recovery, real installed junctions and all predetermined attacks required.',
  status: failure ? 'FAIL_OR_INCONCLUSIVE' : 'PASS_LIMITED', failure: failure ?? null,
  planned_race_reads: planned, completed_race_reads: completed, baseline_passed: baselinePassed, restored_passed: restoredPassed,
  safe_race_reads: safeRaceReads, denied_race_reads: deniedRaceReads, actual_junction_installs: swaps, swap_attempts: attempts, swap_errors: swapErrors,
  native_denial_codes: denialCodes, original_file_id: originalFileId ?? null,
  original_failed_suite_test_changed: false, original_40_attack_sequence_reclassified: false,
  production_qualified: false, release_authority: false, accounts_acl_profiles_changed: false,
  records,
};
writeFileSync(join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify(result, null, 2) + '\n'); process.exitCode = failure ? 1 : 0;
