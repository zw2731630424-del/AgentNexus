"""Read-only integrity and contract validation; never install or sign."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[3]
Q3 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q3'
Q4 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4'
errors = []


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def require(condition, message):
    if not condition:
        errors.append(message)


def read(path):
    return json.loads(path.read_bytes())


summary = {'schema': 'agentnexus.q4.delivery-verification.v1'}
for label, path in [('q3', Q3 / 'SHA256SUMS'), ('q2', ROOT / 'deliverables/AgentNexus-M1.8.3-Q2/SHA256SUMS.txt')]:
    lines = path.read_text('utf-8-sig').splitlines()
    for line in lines:
        expected, name = line.split('  ', 1)
        target = path.parent / name
        require(target.is_file() and sha(target) == expected, label + ':' + name)
    summary[label + '_historical_checksums'] = len(lines)
history = read(Q3 / 'evidence/baseline/original-freeze.json')['original_files']
for row in history:
    path = ROOT / row['path']
    require(path.is_file() and sha(path) == row['sha256'], 'historical:' + row['path'])
summary['historical_freeze_files'] = len(history)
source = read(Q3 / 'source-manifest.json')['files']
with zipfile.ZipFile(Q3 / 'AgentNexus-M1.8.3-Q3-source.zip') as archive:
    actual = {x.filename: hashlib.sha256(archive.read(x)).hexdigest() for x in archive.infolist() if not x.is_dir()}
    require(len(actual) == len(source) == 258, 'source_zip_count')
    require(actual == {x['path']: x['sha256'] for x in source}, 'source_zip_members')
for row in source:
    require(sha(Q3 / 'source' / row['path']) == row['sha256'], 'source:' + row['path'])
summary['source_zip_members'] = len(source)
manifest = read(Q3 / 'approval/installation-manifest.json')
require(sha(Q3 / 'approval/installation-manifest.json') == sha(Q4 / 'approval/installation-manifest.json'), 'baseline_manifest_copy')
require(len(manifest['files']) == 194 and sum(x['bytes'] for x in manifest['files']) == 468433910, 'payload_count_or_bytes')
summary['payload_files'] = len(manifest['files'])
summary['payload_bytes'] = sum(x['bytes'] for x in manifest['files'])
old_cases = read(Q3 / 'tests/windows-attack-tests.json')['cases']
new_cases = read(Q4 / 'tests/windows-attack-results.json')['cases']
require(len(new_cases) == 70, 'seventy_case_count')
for old, new in zip(old_cases, new_cases):
    for key in ['id', 'area', 'attack', 'expected', 'required_observation']:
        require(new[key] == old[key], 'case_contract:' + old['id'] + ':' + key)
    require(new['status'] == 'NOT_RUN' and new['evidence'] == [] and new['token'] is None, 'case_status:' + old['id'])
old_plan = read(Q3 / 'approval/candidate/qualification.json')
plan = read(Q4 / 'approval/qualification.UNSIGNED.json')
config = read(Q4 / 'approval/service-config.UNSIGNED.json')
request = read(Q4 / 'approval/deployment-request.json')
approval = read(Q4 / 'approval/deployment-approval.UNSIGNED.json')
categories = read(Q4 / 'tests/qualification-evidence-19.json')['categories']
names = [x['name'] for x in old_plan['tests']]
require(len(names) == 19 and names == [x['name'] for x in categories] == [x['name'] for x in plan['tests']], 'nineteen_exact_category_names')
require(all(x['status'] == 'NOT_RUN' and x['actual_evidence'] is None for x in categories), 'category_evidence')
require(plan['status'] == 'QUALIFICATION_ONLY' and plan['decision'] == 'BLOCKED', 'qualification_mode')
for label, document in [('plan', plan), ('config', config), ('request', request), ('approval', approval)]:
    for flag in ['real_import_enabled', 'live_enabled']:
        require(document[flag] is False, label + ':' + flag)
for document in [plan, config, request]:
    for flag in ['real_import_approval_ref', 'live_approval_ref', 'qualification_test_approval_ref']:
        require(document[flag] == '', 'unsigned_empty_authorization_ref:' + flag)
require(approval['deployment_approved'] is False and approval['start_service'] is False, 'unsigned_approval_flags')
require(approval['qualification_sha256'] == sha(Q4 / 'approval/qualification.UNSIGNED.json'), 'qualification_draft_hash')
require(approval['service_config_sha256'] == sha(Q4 / 'approval/service-config.UNSIGNED.json'), 'configuration_draft_hash')
require(request['deployment_approval_unsigned_sha256'] == sha(Q4 / 'approval/deployment-approval.UNSIGNED.json'), 'approval_draft_hash')
require(request['final_installation_manifest_sha256'] is None and request['decision'] == 'NO-GO', 'not_final_executable_approval')
require(request['requested_future_scope']['high_pipe'] == r'\\.\pipe\AgentNexus.Credential.v1', 'high_pipe_path')
require(request['requested_future_scope']['daily_pipe'] == r'\\.\pipe\AgentNexus.Daily.v1', 'daily_pipe_path')
for name in ['issued_at_utc', 'expires_at_utc']:
    require(re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{7}Z', plan[name]) is not None, 'strict_utc_roundtrip:' + name)
host = read(Q4 / 'evidence/host-medium/host-preflight.json')
facts = host['operator']['native_process_token']['observations'][0]
require(facts['sid'] == host['operator']['sid'] == request['operator_sid'], 'actual_operator_sid')
require(facts['integrity'] == 8192 and facts['elevated'] is False and facts['appcontainer'] is False, 'actual_medium_operator')
require(host['service_sid_query']['sc_query_exit'] == 1060 and host['target_services'] == [], 'service_absent_preflight')
for row in read(Q4 / 'evidence/host-evidence-manifest.json')['files']:
    require(sha(Q4 / row['path']) == row['sha256'], 'host_evidence_hash:' + row['path'])
offline = read(Q4 / 'evidence/offline-verification/result.json')
require(offline['status'] == 'PASS' and offline['source_unchanged'], 'offline_diagnostics')
for stage in offline['stages']:
    for key, hash_key in [('stdout_file', 'stdout_sha256'), ('stderr_file', 'stderr_sha256')]:
        path = Q4 / 'evidence/offline-verification' / Path(stage[key]).name
        require(sha(path) == stage[hash_key], 'offline_raw_log_hash:' + path.name)
for path in Q4.rglob('*.md'):
    for link in re.findall(r'\]\(([^)]+)\)', path.read_text('utf-8')):
        if '://' not in link and not link.startswith('#'):
            target = path.parent / link.split('#')[0]
            require(target.exists(), 'broken_link:' + str(path.relative_to(Q4)) + ':' + link)
checksum_path = Q4 / 'SHA256SUMS'
if checksum_path.is_file() and checksum_path.read_text('utf-8').strip():
    listed = set()
    for line in checksum_path.read_text('utf-8').splitlines():
        digest, name = line.split('  ', 1)
        listed.add(name)
        require(sha(Q4 / name) == digest, 'q4_checksum:' + name)
    actual_files = {x.relative_to(Q4).as_posix() for x in Q4.rglob('*') if x.is_file() and x.name != 'SHA256SUMS'}
    require(listed == actual_files, 'q4_checksum_exact_file_set')
    summary['q4_checksum_files'] = len(listed)
summary.update(status='FAIL' if errors else 'PASS', errors=errors,
               head=subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
               system_changes=False, real_key_imported=False, live_provider_requested=False,
               os_cases={'PASS': 0, 'NOT_RUN': 70}, qualification_categories={'PASS': 0, 'NOT_RUN': 19})
print(json.dumps(summary, ensure_ascii=False, indent=2))
raise SystemExit(1 if errors else 0)
