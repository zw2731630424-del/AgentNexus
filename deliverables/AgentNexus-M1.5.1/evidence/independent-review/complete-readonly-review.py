"""Read-only final revision reconciliation. No test, native call or link creation."""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import base64
import difflib
import hashlib
import json
import zipfile

ROOT = Path('I:/AI_AgentNexus')
BASE = ROOT / 'deliverables/AgentNexus-M1.5.1'
OUT = BASE / 'evidence/independent-review'
SOURCE = BASE / 'source'
OLD = OUT / 'final-source'
OLD_SET = '4825d2432a01a497a68971fab57909bc9613b38ff087346afbcceba56f7aa9fa'
NEW_SET = '3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0'
NATIVE = 'src/agentnexus/production/windows/NativeRuntime.cs'
AT = (json.loads((OUT / 'readonly-final-byte-verification.json').read_text('utf-8'))['generated_at']
      if (OUT / 'readonly-final-byte-verification.json').exists() else datetime.now(timezone.utc).isoformat())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def record(path):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data), 'sha256': sha(data)}


def write_json(name, value):
    path = OUT / name
    encoded = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if path.exists():
        if path.read_text('utf-8') != encoded.decode('utf-8'):
            assert name in {'retained-evidence-recheck.json', 'final-reading-manifest.json', 'final-review.json', 'report-status.json'}, 'Preserve earlier reviewer evidence: ' + str(path)
            path.write_bytes(encoded)
    else:
        path.write_bytes(encoded)


def inventory(root):
    rows = []
    for path in root.rglob('*'):
        if 'node_modules' in path.relative_to(root).parts:
            continue
        assert not path.is_symlink() and not (getattr(path.lstat(), 'st_file_attributes', 0) & 0x400), path
        if path.is_file():
            data = path.read_bytes()
            rows.append({'path': path.relative_to(root).as_posix(), 'bytes': len(data), 'sha256': sha(data)})
    return sorted(rows, key=lambda r: r['path'])


def set_hash(rows):
    return sha(''.join(r['path'] + '\0' + r['sha256'] + '\n' for r in rows).encode('utf-8'))


old_manifest = read_json(OUT / 'final-source-manifest.json')
old_rows = inventory(OLD)
assert old_rows == old_manifest['files'] and set_hash(old_rows) == OLD_SET
new_rows = inventory(SOURCE)
author_manifest = read_json(BASE / 'source-sha256.json')
assert len(new_rows) == 100 and set_hash(new_rows) == NEW_SET
assert new_rows == sorted(author_manifest['files'], key=lambda r: r['path'])
assert author_manifest['set_sha256'] == NEW_SET
old_by = {r['path']: r for r in old_rows}
new_by = {r['path']: r for r in new_rows}
assert old_by.keys() == new_by.keys()
changed = [r['path'] for r in new_rows if old_by[r['path']] != r]
assert changed == [NATIVE], changed
source_zip = BASE / 'AgentNexus-M1.5.1-source.zip'
with zipfile.ZipFile(source_zip) as z:
    assert len(z.namelist()) == 100 and set(z.namelist()) == set(new_by)
    assert all(z.read(p) == (SOURCE / p).read_bytes() for p in z.namelist())
old_text = (OLD / NATIVE).read_text('utf-8')
new_text = (SOURCE / NATIVE).read_text('utf-8')
old_loop = 'long cleanupUntil=Math.Max(clock.ElapsedMilliseconds,deadline-80);while(clock.ElapsedMilliseconds<cleanupUntil){empty=JobMembers(job).Length==0;if(empty&&stdout.pump.IsCompleted&&stderr.pump.IsCompleted)break;Thread.Sleep(2);}'
new_loop = ('// Job accounting can reach zero before a terminating process\n'
            '                // handle is signaled. Keep the original cleanup deadline, and\n'
            '                // observe all retained identities before completing cleanup.\n'
            '                long cleanupUntil=Math.Max(clock.ElapsedMilliseconds,deadline-80);\n'
            '                while(clock.ElapsedMilliseconds<cleanupUntil){empty=JobMembers(job).Length==0;bool allExited=true;foreach(IntPtr h in pinned.Values)allExited&=WaitForSingleObject(h,0)==0;if(empty&&allExited&&stdout.pump.IsCompleted&&stderr.pump.IsCompleted)break;Thread.Sleep(2);}\n'
            '                ')
assert old_text.count(old_loop) == 1
assert old_text.replace(old_loop, new_loop) == new_text, 'Unexpected additional native edit'
diff = ''.join(difflib.unified_diff(old_text.splitlines(True), new_text.splitlines(True), fromfile=OLD_SET + '/' + NATIVE, tofile=NEW_SET + '/' + NATIVE, n=12))
if (OUT / 'readonly-final-diff.patch').exists():
    assert (OUT / 'readonly-final-diff.patch').read_text('utf-8') == diff
else:
    (OUT / 'readonly-final-diff.patch').write_text(diff, encoding='utf-8')
method_regions = [
    ('Relative', '    static IntPtr Relative(', '    public static object FileOperation('),
    ('FileOperation', '    public static object FileOperation(', '    // sandbox.run always'),
    ('FileBoundaryHelpersAndMethods', '    static string[] Components(', '    // sandbox.run always'),
]
method_records = []
for name, start, end in method_regions:
    a = old_text[old_text.index(start):old_text.index(end)]
    b = new_text[new_text.index(start):new_text.index(end)]
    assert a == b
    method_records.append({'region': name, 'unchanged': True, 'utf8_sha256': sha(b.encode('utf-8')), 'utf8_bytes': len(b.encode('utf-8')), 'final_start_line': new_text[:new_text.index(start)].count('\n') + 1})
assert (OLD / 'src/agentnexus/production/windows/runtime.ps1').read_bytes() == (SOURCE / 'src/agentnexus/production/windows/runtime.ps1').read_bytes()
byte_verification = {
    'schema': 'agentnexus/m151/independent-readonly-final-bytes/1', 'generated_at': AT,
    'previous_set_sha256': OLD_SET, 'final_set_sha256': NEW_SET, 'files': 100,
    'previous_snapshot_unchanged': True, 'author_manifest_matches': True, 'zip_members_match_exactly': True,
    'changed_paths_from_previous_freeze': changed, 'added_paths': [], 'removed_paths': [],
    'exact_native_change_is_cleanup_loop_only': True, 'unchanged_file_regions': method_records,
    'file_rpc_transport_unchanged': True, 'native_runtime_previous_sha256': old_by[NATIVE]['sha256'],
    'native_runtime_final_sha256': new_by[NATIVE]['sha256'], 'author_manifest': record(BASE / 'source-sha256.json'),
    'source_zip': record(source_zip), 'final_files': new_rows,
    'set_definition': 'SHA256 of sorted slash path + NUL + lowercase SHA256 + LF',
    'new_probe_runs_performed': False,
}
write_json('readonly-final-byte-verification.json', byte_verification)

# Read the two old raw frames directly; do not infer historical-member loss
# from the intentionally non-authoritative membership_complete=false field.
cpu_dir = BASE / 'evidence/cpu-qualification/2026-11-07T19-32-42-737Z-19340'
correction_rows = []
for case_id in ['seq-single-8', 'parallel-multi-4']:
    raw_path = cpu_dir / (case_id + '.stdout.jsonl')
    packets = [json.loads(s) for s in raw_path.read_text('utf-8').splitlines() if s]
    assert len(packets) == 1 and packets[0]['ok'] is True
    r = packets[0]['result']
    assert r['history_complete_observed'] is True
    assert r['historical_assigned_processes'] == r['historical_pinned_processes'] == len(r['members'])
    assert r['root_exit_observed'] is False and all(m['exited'] for m in r['members'])
    assert r['root_exit_code'] == 123 and r['tree_empty_observed'] is True and r['output_producers_settled'] is True
    assert r['proof_status'] == 'EXIT_UNVERIFIED' and r['release_authority'] is False
    correction_rows.append({
        'id': case_id, 'raw': record(raw_path), 'root_exit_observed': r['root_exit_observed'],
        'root_exit_observed_at': r['root_exit_observed_at'], 'root_exit_code': r['root_exit_code'],
        'tree_empty_observed': r['tree_empty_observed'], 'output_producers_settled': r['output_producers_settled'],
        'history_complete_observed': r['history_complete_observed'],
        'historical_assigned_processes': r['historical_assigned_processes'],
        'historical_pinned_processes': r['historical_pinned_processes'],
        'members_all_exited': all(m['exited'] for m in r['members']),
        'member_exit_codes': [m['exit_code'] for m in r['members']],
        'membership_complete': r['membership_complete'], 'proof_status': r['proof_status'],
        'release_authority': r['release_authority'],
    })
lifecycle = {
    'schema': 'agentnexus/m151/independent-lifecycle-observation-correction/1', 'generated_at': AT,
    'raw_source_set_sha256': OLD_SET, 'reviewed_final_set_sha256': NEW_SET, 'cases': correction_rows,
    'corrected_classification': 'PROCESS_LIFECYCLE_OBSERVATION_RACE; NOT_MISSING_HISTORICAL_MEMBERS',
    'cause': 'The old loop could stop at Job-empty and completed output pumps before retained process handles were signaled. The earlier root sample was false, while later member samples were true.',
    'reviewed_fix': 'The existing cleanup loop can break early only when the Job is empty, every retained process handle is signaled, and both output pumps completed.',
    'deadline_formula_unchanged': 'Math.Max(clock.ElapsedMilliseconds,deadline-80)',
    'retained_handles': 'Root handle is retained at creation; observed child handles are opened with QUERY|SYNCHRONIZE, retained in the same dictionary, and closed only in the existing finally block.',
    'qualification_unchanged': 'membership_complete=false; parentage_complete=false; proof_status=EXIT_UNVERIFIED; release_authority=false',
    'limits': 'This removes the identified premature-break path. Deadline exhaustion still permits unverified observations. Static review is not a new behavioral or timing qualification.',
    'new_os_or_process_tests_executed': False,
}
write_json('lifecycle-observation-correction.json', lifecycle)

# Reconcile the earlier independently executed file probe with every raw response.
probe = read_json(OUT / 'native-file-probe-u/data/result.json')
raw_path = Path(probe['raw_log'])
raw_rows = [json.loads(s) for s in raw_path.read_text('utf-8').splitlines() if s]
packets = [json.loads(r['raw_jsonl']) for r in raw_rows if r.get('direction') == 'RECEIVED']
assert len(packets) == len(probe['records']) == 85
assert len([r for r in raw_rows if r.get('direction') == 'SENT']) == 85
canary = (Path(probe['data']) / 'outside/value').read_bytes()
safe_count = 0
denials = Counter()
for p, observation in zip(packets, probe['records']):
    assert p['id'] == observation['id']
    if p['ok']:
        assert set(p) == {'id', 'ok', 'result'}
        r = p['result']
        assert base64.b64decode(r['content_base64'], validate=True) == b'safe'
        assert r['bytes'] == 4 and r['sha256'] == sha(b'safe') and r['file_id'] == probe['original_file_id']
        assert r['ancestor_handles_pinned'] is True and r['ancestor_share_delete'] is False and r['ancestor_share_write'] is False
        assert r['source'] == 'REAL_WINDOWS_PRIMITIVE' and r['release_authority'] is False
        assert observation['outcome'] == 'SAFE'
        safe_count += 1
    else:
        assert set(p) == {'id', 'ok', 'error'} and set(p['error']) == {'code', 'message'}
        assert observation['outcome'] == 'DENIED_NO_PAYLOAD'
        serialized = json.dumps(p)
        assert canary.decode('utf-8') not in serialized and base64.b64encode(canary).decode('ascii') not in serialized
        denials[p['error']['code']] += 1
assert safe_count == 30 and sum(denials.values()) == 55 and dict(denials) == probe['native_denial_codes']
assert probe['completed_race_reads'] == probe['planned_race_reads'] == 80 and probe['actual_junction_installs'] == 40
assert probe['source_set_sha256'] == OLD_SET and probe['status'] == 'PASS_LIMITED'
first_attempt = read_json(OUT / 'native-file-probe/data/result.json')
assert first_attempt['failure']['code'] == 'EPERM' and first_attempt['completed_race_reads'] == 0
model_run = read_json(OUT / 'probe-run.json')
model = read_json(OUT / 'boundary-probe.stdout.json')
assert model_run['source_set_sha256'] == OLD_SET and model_run['passed'] == model['passed'] == 10
assert model_run['failed'] == model['failed'] == 0 and model_run['exit_code'] == 0
for name, key in [('boundary-probe.mjs', 'script_sha256'), ('boundary-probe.stdout.json', 'stdout_sha256'), ('boundary-probe.stderr.txt', 'stderr_sha256')]:
    assert sha((OUT / name).read_bytes()) == model_run[key]
file_run = read_json(OUT / 'native-file-probe-u/run.json')
for name, key in [('native-file-boundary-probe.mjs', 'script_sha256'), ('native-file-probe-u/stdout.json', 'stdout_sha256'), ('native-file-probe-u/stderr.txt', 'stderr_sha256')]:
    assert sha((OUT / name).read_bytes()) == file_run[key]

# Recount the retained author regression and bind the archived workspace bytes.
run_dir = BASE / 'evidence/runs/final-2026-11-07T19-34-37-992Z-27356'
results = read_json(run_dir / 'results.json')
counts = dict(Counter(c['status'] for c in results['cases']))
assert counts == {'PASS': 295, 'NOT_RUN': 8, 'FAIL': 2}, counts
assert results['summary']['counts']['tests'] == 305 and results['exit_code'] == 1 and results['timedOut'] is False
assert results['source_set_sha256'] == OLD_SET
with zipfile.ZipFile(run_dir / 'workspace.zip') as z:
    assert len(z.namelist()) == 101 and set(z.namelist()) == set(old_by) | {'__capture_metadata__.json'}
    assert all(z.read(p) == (OLD / p).read_bytes() for p in old_by)
    capture_metadata = json.loads(z.read('__capture_metadata__.json').decode('utf-8-sig'))
    assert capture_metadata['files'] == old_rows
author_toc = read_json(OUT / 'author-tocTou-evidence.json')
assert author_toc['original_planned_40_attacks_completed'] is False and author_toc['original_failed_assertion_preserved'] is True
toc = author_toc['matching_members'][0]
with zipfile.ZipFile(run_dir / 'data.zip') as z:
    assert sha(z.read(toc['zip_member'])) == toc['sha256']
    cpu_member = 'm14-native/native-helper-1794080116952-06783303-d326-4eea-9ada-2d55387fb46a.jsonl'
    cpu_raw = z.read(cpu_member)
    cpu_packets = []
    for s in cpu_raw.decode('utf-8-sig').splitlines():
        if s:
            p = json.loads(s)
            p = p.get('frame', p)
            cpu_packets.append(json.loads(p['raw_jsonl']) if 'raw_jsonl' in p else p)
    integrated_cpu = next(p['result'] for p in cpu_packets if p.get('ok') and p.get('result', {}).get('job_total_cpu_100ns') == '29218750')
    assert integrated_cpu['job_user_cpu_100ns'] == '28125000' and integrated_cpu['job_kernel_cpu_100ns'] == '1093750'
    assert integrated_cpu['termination_reason'] == 'DEADLINE'
assert len(toc['responses']) == 18 and toc['successes'] == 8
cpu = read_json(OUT / 'cpu-evidence-recheck.json')
assert cpu['recomputed_counts'] == {'FAIL': 57, 'PASS': 1}
assert cpu['historical_membership_incomplete_ids'] == []
evidence_recheck = {
    'schema': 'agentnexus/m151/independent-retained-evidence-recheck/1', 'generated_at': AT,
    'source_set_sha256_for_all_executed_checks': OLD_SET, 'new_executions': 0,
    'model': {'passed': 10, 'failed': 0, 'exit_code': 0, 'run': record(OUT / 'probe-run.json')},
    'native_file_primitive': {
        'status': 'PASS_LIMITED', 'planned_race_reads': 80, 'completed_race_reads': 80,
        'safe_race_reads': 27, 'denied_race_reads': 53, 'actual_junction_installs': 40,
        'swap_attempts': 77, 'raw_response_count': 85, 'safe_responses_total': 30,
        'no_payload_denials_total': 55, 'denial_codes': dict(denials), 'raw': record(raw_path),
        'first_attempt': {'classification': 'HOST_RESTRICTED_INCONCLUSIVE', 'error': 'EPERM', 'completed_race_reads': 0, 'result': record(OUT / 'native-file-probe/data/result.json')},
        'reuse_for_final_revision': 'Only unchanged FileOperation/Relative and file RPC path are supported; no new whole-source/native/OS run is claimed.',
    },
    'author_previous_regression': {
        'source_set_sha256': OLD_SET, 'tests': 305, 'counts': counts, 'exit_code': 1, 'timed_out': False,
        'failures': [c for c in results['cases'] if c['status'] == 'FAIL'],
        'results': record(run_dir / 'results.json'), 'workspace_zip': record(run_dir / 'workspace.zip'),
        'workspace_matches_previous_snapshot': True, 'workspace_source_members': 100,
        'workspace_non_source_member': '__capture_metadata__.json (parsed; files match previous snapshot)',
        'data_zip': record(run_dir / 'data.zip'),
        'integrated_cpu': {'zip_member': cpu_member, 'member_sha256': sha(cpu_raw), 'job_total_cpu_ms': 2921.875, 'job_user_cpu_ms': 2812.5, 'job_kernel_cpu_ms': 109.375, 'termination_reason': 'DEADLINE'},
    },
    'author_previous_cpu': {'source_set_sha256': OLD_SET, 'planned_cases': 58, 'observed_cases': 58, 'counts': {'FAIL': 57, 'PASS': 1}, 'independent_arithmetic_recheck': record(OUT / 'cpu-evidence-recheck.json'), 'executed_by_reviewer': False},
    'author_original_tocTou': {'status': 'FAIL_RETAINED', 'rpc_responses': 18, 'attack_responses_after_baseline': 17, 'planned_attacks': 40, 'completed': False, 'safe_responses': 8, 'no_payload_denials': 10, 'denial_codes': toc['errors'], 'last_response': toc['responses'][-1], 'evidence': record(OUT / 'author-tocTou-evidence.json')},
    'new_final_revision_cpu_and_full_regression': 'NOT_REEXECUTED_OR_ATTESTED_BY_THIS_REVIEWER; parent-owned subsequent evidence',
}
write_json('retained-evidence-recheck.json', evidence_recheck)

# Full-vs-targeted reading is explicit for every final source file. Historical
# source hashes and rules/reports remain in the unchanged original manifest.
reading = read_json(OUT / 'reading-manifest.json')
baseline_prefix = 'deliverables/AgentNexus-M1.5/source/'
baseline_reads = {r['path'][len(baseline_prefix):]: r['reading_method'] for r in reading['files'] if r['path'].startswith(baseline_prefix)}
previous_review = read_json(OUT / 'independent-security-review-final.json')
added = {r['path'] for r in old_manifest['added']}
changed_from_original = {r['path'] for r in old_manifest['changed']}
coverage = []
for row in new_rows:
    p = row['path']
    if p == NATIVE:
        method = 'TARGETED_ALL_M151_CHANGED_LINES_AND_LAUNCH_CLEANUP_FILEBOUNDARY_CONTEXT; INHERITED_FULL_NATIVE_TEXT_PARENT_SCOPE'
    elif p == 'tools/agentnexus/cpu-qualify-m15.mjs':
        method = 'TARGETED_OLD_CPU_ADJUDICATION_LINES_1_18; REMAINDER_HASH_ONLY_PARENT_SCOPE'
    elif p == 'tests/agentnexus/m14-native.test.ts':
        method = 'TARGETED_CPU_ASSERTION_LINES_150_154; INHERITED_FULL_NATIVE_TEST_READ_PARENT_SCOPE'
    elif p in added or p in changed_from_original:
        method = 'FULL_TEXT_SEMANTIC_REVIEW_PRIOR_PHASE; BYTE_IDENTICAL_TO_4825_REVIEWED_FILE'
    elif p in baseline_reads:
        method = baseline_reads[p] + '; BYTE_IDENTICAL_TO_REVIEWED_M15_SOURCE'
    else:
        method = 'HASH_ONLY; INHERITED_NATIVE_OR_CPU_FIXTURE_SEMANTIC_REVIEW_PARENT_SCOPE'
    coverage.append({**row, 'reading_method': method})
write_json('final-reading-manifest.json', {
    'schema': 'agentnexus/m151/independent-final-reading/1', 'generated_at': AT,
    'final_set_sha256': NEW_SET, 'historical_input_manifest': record(OUT / 'reading-manifest.json'),
    'historical_input_entries': len(reading['files']), 'historical_reading': previous_review['historical_reading'],
    'final_source_files': coverage, 'catalogs': 'Fully parsed/traversed JSON structures, not literal prose review',
    'native_reading_limit': 'All final changed lines and adjacent launch/cleanup plus FileOperation/Relative reviewed; no claim of a fresh full inherited native C#/PowerShell or two native-only TS semantic read.',
    'late_raw_evidence_read': [record(OUT / n) for n in ['cpu-evidence-recheck.json', 'native-history-evidence-recheck.json', 'author-tocTou-evidence.json', 'lifecycle-observation-correction.json', 'retained-evidence-recheck.json']],
})

assert inventory(SOURCE) == new_rows and inventory(OLD) == old_rows, 'Source mutated during read-only reconciliation'
review = {
    'schema': 'agentnexus/m151/independent-final-review/2', 'reviewer': '/root/independent_review', 'generated_at': AT,
    'authoritative_report': True, 'replaces_conclusion_of': ['independent-security-review-final.md', 'independent-security-review-final.json'],
    'code_review_status': 'PASS_LIMITED', 'acceptance_status': 'FAIL/BLOCKED', 'production_qualified': False,
    'conclusion': 'No open reproducible product P0/P1 identified in the stated review scope. The final cleanup edit is narrowly consistent with the identified observation race. Known hard cumulative CPU failure, retained integrated TOCTOU test failure, and unqualified production boundaries prevent acceptance or release.',
    'final_source': byte_verification,
    'latest_scope': 'Read-only byte comparison and code review only. At parent request, no new OS experiment, link creation, process test, model run, CPU load or full regression was performed for the final 3f4c revision.',
    'independence': {'product_modified': False, 'historical_evidence_modified': False, 'recursive_delegation': False, 'system_account_acl_profile_service_firewall_changes': False, 'deployed_provider_keys_accessed': False, 'writes': 'Reviewer-owned independent-review artifacts and earlier owned fixtures only', 'prior_model_run': '10/10 at 4825', 'prior_native_file_run': '80/80 at 4825; first EPERM attempt preserved', 'final_revision_new_test_executions': 0},
    'coverage': {**previous_review['historical_reading'], 'manifest': record(OUT / 'final-reading-manifest.json'), 'historical_input_manifest': record(OUT / 'reading-manifest.json')},
    'unresolved_p0_p1_product_findings': [],
    'observations': [
        {'id': 'M151-IR-LIFECYCLE', 'kind': 'OBSERVATION_DEFECT', 'status': 'STATIC_FIX_REVIEWED; FINAL_BEHAVIOR_NOT_RETESTED_HERE', 'source': NATIVE, 'line': 269, 'reproduction': 'Old raw seq-single-8 and parallel-multi-4 show root_exit_observed=false, later members all exited=true, root exit code 123, complete historical counts and settled outputs.', 'cause': lifecycle['cause'], 'fix': lifecycle['reviewed_fix'], 'limits': lifecycle['limits'], 'evidence': record(OUT / 'lifecycle-observation-correction.json')},
        {'id': 'M151-IR-TOCTOU-FIXTURE', 'kind': 'VALIDATION_GAP', 'priority': 'P2', 'status': 'ORIGINAL_INTEGRATED_FAIL_RETAINED', 'source': 'tests/agentnexus/m151-boundaries.test.ts', 'line': 34, 'reproduction': 'Retained full-suite case stops at RPC m151-18 (baseline + 17 attack responses) because valid native refusal WIN32_1921 is outside the assertion whitelist. Error envelope has no result/payload.', 'security_disposition': 'No returned outside bytes or implementation escape observed in available frames. Incomplete original 40 attacks cannot be passed or closed by the separate probe.', 'remediation': 'Retain original failing test and raw evidence. Use the independent fixed-count semantic-denial probe as additional limited evidence. Any future fixture change must preserve safe-byte/file-identity and no-payload-denial criteria, with a separate auditable run.'},
        {'id': 'M151-IR-CPU', 'kind': 'CAPABILITY_BLOCKER', 'status': 'FAIL/BLOCKED', 'reproduction': 'Retained strict 58-case report independently recomputes to 57 FAIL, 1 PASS. Old integrated CPU test also fails with helper DEADLINE after 2921.875ms cumulative total CPU (2812.5ms user + 109.375ms kernel).', 'disposition': 'No budget, tolerance or deadline reduction in rigor; production REAL_WINDOWS admission through Host/Broker remains hard-blocked independent of signed certificates. Diagnostic native primitives remain TCB-only evidence, without a production fallback. The lifecycle edit does not alter Job CPU semantics.'},
    ],
    'lifecycle_correction': lifecycle,
    'retained_evidence': evidence_recheck,
    'reviewed_invariants': previous_review['reviewed_invariants'][:6] + ['Final 3f4c source differs from retained 4825 reviewer copy only in the bounded cleanup-loop condition; all 99 other files and the complete file-operation/RPC path are unchanged.'],
    'contract_hardening': previous_review['contract_hardening'],
    'remaining_production_blockers': ['Strict cumulative CPU budget is known unqualified. JOB_TIME/readback/rate cap or an incidental PASS cannot authorize production; final Host/Broker REAL_WINDOWS admission remains hard-blocked.'] + previous_review['remaining_production_blockers'][1:] + ['The original integrated TOCTOU fixture still fails and is incomplete; the separate successful file probe does not rewrite that outcome.', 'This reviewer has not executed or attested the subsequent 3f4c CPU or full-regression run.'],
    'limitations': [
        'Final review is static and read-only; the earlier 10 model and 80 native-file attacks belong to OLD_SET 4825, not to a new 3f4c whole-source execution.',
        'File evidence reuse is restricted to byte-identical Relative/FileOperation, helpers, transport and policy. It says nothing about the changed process cleanup path behavior.',
        'Synthetic gates/audit/ExitProof checks are model evidence, not OS qualification. The file primitive uses the current account and does not establish distinct-account isolation or production release.',
        'Inherited native C#/PowerShell and two native-only TS suites are not freshly fully read here; parent-owned semantic scope is explicitly distinguished from targeted reviewer reading.',
        'No new strict tsc/full regression/CPU/process/lifecycle/pipe/production Host/reboot/Ubuntu experiment was run in this final read-only phase.',
        'history_complete_observed=true and TotalProcesses==pinned do not imply exit closure or release authority. membership_complete=false is intentionally conservative and must not be misreported as proof that two members were missing.',
    ],
    'official_error_reference': {'url': 'https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1700-3999-', 'fact': '1921 is ERROR_CANT_RESOLVE_FILENAME'},
    'governance_note': previous_review['governance_note'],
}
artifact_names = ['reading-manifest.json', 'catalog-analysis.json', 'final-source-manifest.json', 'final-byte-verification.json', 'readonly-final-byte-verification.json', 'readonly-final-diff.patch', 'final-reading-manifest.json', 'lifecycle-observation-correction.json', 'retained-evidence-recheck.json', 'cpu-evidence-recheck.json', 'native-history-evidence-recheck.json', 'author-tocTou-evidence.json', 'boundary-probe.mjs', 'boundary-probe.stdout.json', 'boundary-probe.stderr.txt', 'probe-run.json', 'native-file-boundary-probe.mjs', 'native-file-probe/run.json', 'native-file-probe/data/result.json', 'native-file-probe/stdout.json', 'native-file-probe/stderr.txt', 'native-file-probe-u/run.json', 'native-file-probe-u/data/result.json', 'native-file-probe-u/stdout.json', 'native-file-probe-u/stderr.txt', 'complete-readonly-review.py']
review['artifacts'] = [record(OUT / n) for n in artifact_names] + [record(raw_path)]
write_json('final-review.json', review)

def link(label, path):
    return '[' + label + '](' + str(path.resolve()).replace('\\', '/') + ')'


md = f'''# AgentNexus M1.5.1 independent final code review

**Code review: PASS_LIMITED. Acceptance: FAIL/BLOCKED. Production qualification: false.** No open reproducible product P0/P1 was identified in the stated scope. Known cumulative CPU failure and the retained integrated TOCTOU fixture failure prevent acceptance. This is the final independent read-only opinion; earlier independently executed probes remain bound to their original source bytes.

## Exact revision and review scope

Final source: **100 files**, set SHA256 `{NEW_SET}`. Previous reviewer snapshot and all executed independent checks: `{OLD_SET}`. Author manifest, current source and all 100 ZIP members match the final set. The retained old reviewer snapshot is unchanged. Relative to the previous freeze, exactly one file changes: {link('NativeRuntime.cs', SOURCE / NATIVE)}; there are no additions or removals.

The only edit is the cleanup-loop comment and early-break condition. See {link('byte reconciliation', OUT / 'readonly-final-byte-verification.json')} and {link('exact patch', OUT / 'readonly-final-diff.patch')}. In this final phase, no new OS experiment, link, process test, CPU workload, model run or full regression was executed.

Baseline reading comprises all 43 product TypeScript files and 12 non-native-only test TypeScript files, the requested inherited non-native tools/checkers/fixtures, historical M1.2/M1.3/M1.4 reports and issue ledger, ADR001-029, and M1.5 original independent-review text. All new M1.5.1 files were fully read. NativeRuntime changed lines plus launch/cleanup and file-boundary context were reviewed; full inherited native C#/PowerShell and the two native-only TS suites remain parent semantic-review scope. The old CPU adjudicator received targeted reading only. Catalogs were fully parsed/traversed as JSON structures, not claimed as literal prose reading. Complete per-file reading methods and SHA256 are in {link('final reading manifest', OUT / 'final-reading-manifest.json')}, referencing the unchanged {link('111-entry historical input manifest', OUT / 'reading-manifest.json')}.

## Lifecycle observation correction

The old raw cases `seq-single-8` and `parallel-multi-4` both have `history_complete_observed=true`, assigned/pinned counts **2/2** and **6/6**, empty Job and settled output, but an earlier `root_exit_observed=false`; later member samples are all `exited=true`, with root exit code **123**. This is a **process-lifecycle observation race**, not evidence of two missing historical members. See {link('raw-bound correction', OUT / 'lifecycle-observation-correction.json')}.

The old cleanup loop could stop when the Job was empty and both output pumps completed. The new loop also requires `WaitForSingleObject(handle,0)==0` for every retained process handle. Root and observed child handles remain pinned and have synchronization access. The formula `Math.Max(clock.ElapsedMilliseconds,deadline-80)`, 2ms poll interval, CPU settings, termination policy and existing finally cleanup are unchanged. Wait failure/non-signaled results cannot satisfy the early-break condition. The fix addresses the identified premature-break path within the existing cutoff. At cutoff, unverified observations remain possible; static review does not prove new timing behavior.

The result still fixes `membership_complete=false`, `parentage_complete=false`, `proof_status=EXIT_UNVERIFIED` and `release_authority=false`. The patch grants no release authority or production qualification. This reviewer did not retest the changed process path.

## Preserved independent evidence and limited reuse

| Evidence | Original source | Result and limit |
|---|---|---|
| Independent boundary models | `4825...` | **10/10 PASS**, 0 FAIL. Synthetic OS observations; no production Host/Worker qualification. |
| First native file attempt | `4825...` | Host restriction `EPERM`; **0/80** attacks. Preserved as inconclusive, not discarded. |
| Independent file-boundary probe | `4825...` | **80/80** predetermined race reads; 27 safe, 53 denied; 40 actual junction installations. Before/after positive baselines and deterministic junction denial completed. |

The successful native file run contains **85 raw responses**: 30 successes, all exactly the original `safe` bytes/hash/file identity, and 55 denials with no result/payload. Denials are WIN32_2 x47, REPARSE_REJECTED x7, WIN32_1921 x1. All raw responses were rechecked read-only. It is current-account file-primitive evidence only. See {link('retained evidence reconciliation', OUT / 'retained-evidence-recheck.json')}, {link('file probe result', OUT / 'native-file-probe-u/data/result.json')} and {link('raw file responses', raw_path)}.

`Relative`, `FileOperation`, all adjacent file-boundary helpers, the file RPC transport and all other 99 files are byte-identical between freezes. This permits limited reuse for the unchanged file path. It does **not** constitute a 3f4c native/full-suite rerun or validate the changed process cleanup behavior. The earlier source snapshot, scripts, stdout/stderr and run metadata remain intact at their original paths.

## Retained author failures

The previous frozen author regression is independently recounted from its retained JSON and archived workspace: **305 tests = 295 PASS + 8 SKIP + 2 FAIL**, exit 1 (case JSON labels those eight skipped cases NOT_RUN). Both failures remain recorded. The CPU case accumulated **2921.875ms total CPU = 2812.5ms user + 109.375ms kernel** and required helper DEADLINE termination. The directory-replacement case stopped at RPC `m151-18` on `WIN32_1921`.

The latter raw log contains baseline plus **17 attack responses**, not the planned 40 attacks: 8 safe successes and 10 structural no-payload denials. The final denial is absent from the test whitelist. Microsoft identifies 1921 as `ERROR_CANT_RESOLVE_FILENAME`. [Microsoft system error reference](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1700-3999-) No outside bytes were observed in those responses. This is a validation expectation gap with an incomplete original attack sequence; it is not a demonstrated implementation escape. The original failed test and assertion are unchanged, and the independent 80-attack probe does not turn that original FAIL into PASS. See {link('original frame counts', OUT / 'author-tocTou-evidence.json')}.

The retained **58-case CPU qualification independently recomputes to 57 FAIL / 1 PASS**. All 58 historical-count observations were complete; `membership_complete=false` is intentionally conservative. No production guarantee follows from the one incidental PASS. The current patch does not change the CPU budget, tolerance, Job flags, deadlines or CPU semantics. See {link('58-case raw/arithmetic recheck', OUT / 'cpu-evidence-recheck.json')}.

The parent owns subsequent CPU and full regression on the new 3f4c source. Those are not rerun or attested by this reviewer. Earlier 4825 failures remain intermediate-freeze evidence and are not overwritten.

## Gates and acceptance boundary

The fixed resource capability gate rejects REAL_WINDOWS in `QualificationGate.admit` before certificate selection and in Host prepare before reservation/native creation; Broker repeats qualification before consume/start. Control-plane construction can initialize. A valid trusted TCB certificate cannot remove the current hard CPU block. The original PROCESS/EXTERNAL_EFFECT gate remains blocked. Earlier independent model checks also covered audit flush failure before prepare/start, permit replay, tampered MAC, false sandbox limits, unknown tree/output/IPC and held resource claims.

No confirmed product P0/P1 is open in this review scope. The CPU capability failure, original integrated TOCTOU FAIL, distinct-account/composed isolation, real ExitProof/release, reboot/hard-power-loss and Ubuntu gaps keep overall acceptance **FAIL/BLOCKED**. Same-account primitives and simulated models confer no production release authority. No account, ACL, profile, service, firewall or product changes were made by this reviewer.

Machine-readable authoritative report: {link('final-review.json', OUT / 'final-review.json')}.
'''
(OUT / 'final-review.md').write_text(md, encoding='utf-8')
write_json('report-status.json', {
    'schema': 'agentnexus/m151/independent-report-status/1', 'generated_at': AT,
    'authoritative': ['final-review.md', 'final-review.json'],
    'intermediate_reports_preserved': ['independent-security-review-final.md', 'independent-security-review-final.json'],
    'intermediate_source_set_sha256': OLD_SET, 'final_source_set_sha256': NEW_SET,
    'correction': 'Any earlier reference to two missing historical members is superseded by lifecycle-observation-correction.json: history_complete was true, but root and later member exit samples differed.',
    'final_report_files': [record(OUT / 'final-review.md'), record(OUT / 'final-review.json')],
})
print(json.dumps({'final_set_sha256': NEW_SET, 'changed_paths': changed, 'reports': ['final-review.md', 'final-review.json'], 'new_test_executions': 0, 'acceptance_status': 'FAIL/BLOCKED'}))
