"""Read-only audit of delivered evidence; writes only this review's JSON record."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import zipfile

BASE = Path(__file__).resolve().parents[2]
DEST = Path(__file__).resolve().parent

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def read(path):
    return json.loads(path.read_bytes())

errors = []
result = read(BASE / 'evidence/signing-tests.json')
run = Path(result['run'])
delivered = BASE / 'evidence/signing-tests' / run.name
checks = []
for case in result['cases']:
    for suffix, field in [('input.json', 'input_sha256'), ('stdout.log', 'stdout_sha256'), ('stderr.log', 'stderr_sha256')]:
        name = case['id'] + '.' + suffix
        expected = case[field]
        observed = sha(run / name)
        delivered_hash = sha(delivered / name)
        checks.append({'file': name, 'expected': expected, 'actual': observed, 'delivered': delivered_hash})
        if expected != observed or expected != delivered_hash:
            errors.append(name)
    stdout = (run / (case['id'] + '.stdout.log')).read_text('utf-8').strip()
    stderr = (run / (case['id'] + '.stderr.log')).read_text('utf-8').strip()
    if stdout != case['actual'] or stdout != case['expected'] or stderr or case['status'] != 'PASS' or case['assurance'] != 'SIMULATED':
        errors.append(case['id'] + ':content-or-status')

manifest = read(delivered / 'runtime-evidence-manifest.json')
manifest_checks = []
for row in manifest['files']:
    path = run / row['path']
    observed = sha(path)
    ok = observed == row['sha256'] and path.stat().st_size == row['bytes']
    manifest_checks.append({'path': row['path'], 'actual': observed, 'ok': ok})
    if not ok:
        errors.append('runtime-manifest:' + row['path'])

archive_checks = []
raw_archive = delivered / 'SIMULATED-fixtures-and-exports.zip'
with zipfile.ZipFile(raw_archive) as archive:
    for name in archive.namelist():
        if name.endswith('/'):
            continue
        observed = hashlib.sha256(archive.read(name)).hexdigest()
        expected = sha(run / name)
        ok = observed == expected
        archive_checks.append({'path': name, 'sha256': observed, 'ok': ok})
        if not ok:
            errors.append('raw-fixture-archive:' + name)
    expected_names = {p.relative_to(run).as_posix() for p in run.rglob('*') if p.is_file()}
    actual_names = {name for name in archive.namelist() if not name.endswith('/')}
    if actual_names != expected_names:
        errors.append('raw-fixture-archive-file-set')

source_rows = read(BASE / 'source-manifest.json')['files']
source_checks = []
with zipfile.ZipFile(BASE / 'AgentNexus-M1.8.3-Q4.1-source.zip') as archive:
    actual_names = {name for name in archive.namelist() if not name.endswith('/')}
    if actual_names != {row['path'] for row in source_rows}:
        errors.append('source-zip-file-set')
    for row in source_rows:
        path = BASE / 'source' / row['path']
        observed = sha(path)
        archived = hashlib.sha256(archive.read(row['path'])).hexdigest()
        ok = observed == row['sha256'] == archived and path.stat().st_size == row['bytes']
        source_checks.append({'path': row['path'], 'sha256': observed, 'archived_sha256': archived, 'ok': ok})
        if not ok:
            errors.append('source:' + row['path'])

payload_rows = read(BASE / 'approval/installation-manifest.json')['files']
payload_checks = []
actual_names = {p.relative_to(BASE / 'payload').as_posix() for p in (BASE / 'payload').rglob('*') if p.is_file()}
if actual_names != {row['path'] for row in payload_rows}:
    errors.append('payload-file-set')
for row in payload_rows:
    path = BASE / 'payload' / row['path']
    observed = sha(path)
    ok = observed == row['sha256'] and path.stat().st_size == row['bytes'] and row['target'] == 'C:/Program Files/AgentNexus/' + row['path']
    payload_checks.append({'path': row['path'], 'sha256': observed, 'ok': ok})
    if not ok:
        errors.append('payload:' + row['path'])

plan = read(BASE / 'approval/qualification-plan.json')
approval = read(BASE / 'approval/deployment-approval.json')
request = read(BASE / 'approval/deployment-request.json')
bindings = {'installation_manifest_sha256': 'approval/installation-manifest.json', 'service_config_sha256': 'approval/candidate/service-config.json', 'signature_policy_sha256': 'approval/signature-policy.json', 'system_changes_sha256': 'approval/system-changes.json', 'installer_sha256': 'source/tools/agentnexus/install-q41-qualification.ps1', 'verifier_sha256': 'signer/AgentNexus.Qualification.Verifier.exe', 'signer_tool_sha256': 'signer/AgentNexus.Qualification.Signer.exe'}
for key, rel in bindings.items():
    if not plan[key] == approval[key] == request[key] == sha(BASE / rel):
        errors.append('binding:' + key)
if plan['payload_files'] != len(payload_rows) or plan['payload_bytes'] != sum(row['bytes'] for row in payload_rows):
    errors.append('payload-totals')
for key in ['real_import', 'live_provider', 'production_release', 'real_ledger_migration', 'real_import_enabled', 'live_enabled']:
    if plan[key] is not False or approval[key] is not False:
        errors.append('permission:' + key)
for name in ['qualification-plan.p7s', 'deployment-approval.p7s']:
    if (BASE / 'approval' / name).exists():
        errors.append('unexpected-actual-cms:' + name)
if approval['deployment_approved'] is not False or approval['user_confirmed'] is not False or approval['start_service'] is not False:
    errors.append('unexpected-actual-approval')
q4 = BASE.parent / 'AgentNexus-M1.8.3-Q4'
q3 = BASE.parent / 'AgentNexus-M1.8.3-Q3'
old_payload = {row['path']: row['sha256'] for row in read(q3 / 'approval/installation-manifest.json')['files']}
payload_changes = [row['path'] for row in payload_rows if old_payload.get(row['path']) != row['sha256']]
if set(payload_changes) != {'AgentNexusCredential.exe', 'pipe-client.exe', 'trusted-credential-helper.exe', 'credential-launcher.exe', 'launcher-plan.json'}:
    errors.append('unexpected-Q3-payload-change-set')
baseline = read(BASE / 'evidence/baseline.json')
preserved_hash_checks = []
for row in baseline['checks']:
    path = BASE.parent / row['bundle'] / 'SHA256SUMS'
    actual = sha(path)
    ok = actual == row['sha256sums_sha256']
    preserved_hash_checks.append({'path': str(path), 'sha256': actual, 'ok': ok})
    if not ok:
        errors.append('historical-checksum-list:' + row['bundle'])
for row in baseline['protected']:
    path = BASE.parents[1] / row['path']
    actual = sha(path)
    ok = actual == row['sha256']
    preserved_hash_checks.append({'path': str(path), 'sha256': actual, 'ok': ok})
    if not ok:
        errors.append('protected-rule-adr:' + row['path'])
os_preservation = []
for name in ['windows-attack-results.json', 'qualification-evidence-19.json']:
    equal = (BASE / 'tests' / name).read_bytes() == (q4 / 'tests' / name).read_bytes()
    os_preservation.append({'path': 'tests/' + name, 'byte_identical_to_Q4': equal})
    if not equal:
        errors.append('original-os-evidence-changed:' + name)

log_checks = []
for rel, key in [('evidence/regression.json', 'stages'), ('evidence/readonly-checks.json', 'checks')]:
    summary = read(BASE / rel)
    raw = Path(summary['run'])
    for stage in summary[key]:
        for suffix in ['stdout', 'stderr']:
            path = raw / (stage['name'] + '.' + suffix + '.log')
            observed = sha(path)
            ok = observed == stage[suffix + '_sha256']
            log_checks.append({'path': str(path), 'sha256': observed, 'ok': ok})
            if not ok:
                errors.append('log:' + str(path))

build = read(BASE / 'evidence/build.json')
for stage in build['stages']:
    target = BASE / ('signer' if stage['name'] in ['signer', 'verifier'] else 'payload') / Path(stage['command'][stage['command'].index(next(x for x in stage['command'] if x.startswith('/out:')))][5:]).name
    if sha(target) != stage['binary_sha256']:
        errors.append('build-binary:' + stage['name'])
build_dir = BASE / 'evidence/build' / Path(build['run']).name
for row in read(build_dir / 'log-manifest.json')['files']:
    observed = sha(build_dir / row['path'])
    ok = observed == row['sha256']
    log_checks.append({'path': str(build_dir / row['path']), 'sha256': observed, 'ok': ok})
    if not ok:
        errors.append('build-log:' + row['path'])
governance = read(BASE / 'evidence/governance-result.json')
for stream in ['stdout', 'stderr']:
    path = Path(governance['run']) / (stream + '.log')
    actual = sha(path)
    copied = sha(BASE / 'evidence/governance' / (stream + '.log'))
    ok = actual == copied == governance[stream + '_sha256']
    log_checks.append({'path': str(path), 'sha256': actual, 'ok': ok})
    if not ok:
        errors.append('governance-log:' + stream)

critical = [
    'source/native/qualification-signer/SigningContracts.cs',
    'source/native/qualification-signer/QualificationSigner.cs',
    'source/native/qualification-signer/Verifier.cs',
    'source/native/qualification-signer/ContractHarness.cs',
    'source/native/qualification-signer/user-create-certificate.ps1',
    'source/native/credential-service/Common.cs',
    'source/tools/agentnexus/install-q41-qualification.ps1',
    'tools/test-signing.py', 'tools/sign-fixtures.ps1', 'tools/freeze.py',
    'evidence/signing-tests.json', 'evidence/regression.json', 'evidence/build.json',
    'evidence/host-preflight.json', 'approval/qualification-plan.json',
    'approval/deployment-approval.json', 'approval/installation-manifest.json',
    'approval/signature-policy.json', 'approval/certificate-pin.json',
    'evidence/readonly-checks.json', 'source-manifest.json',
    'AgentNexus-M1.8.3-Q4.1-source.zip', 'acceptance.json',
    'README.md', 'acceptance-report.md', 'deployment-report.md',
    'contracts/local-qualification.md', 'contracts/production-release.md',
    'reports/certificate-design.md', 'reports/private-key-protection.md',
    'reports/testing.md', 'reports/deployment-runbook.md',
    'signer/README.md', 'approval/deployment-request.md',
    'approval/deployment-request.json', 'approval/rollback-plan.json',
    'evidence/governance-result.json', 'reports/governance.md',
    'evidence/independent-review/readonly-final.json',
]
critical_hashes = [{'path': rel, 'sha256': sha(BASE / rel)} for rel in critical]
record = {
    'schema': 'agentnexus.q41.independent-evidence-audit.v1',
    'observed_at_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
    'status': 'FAIL' if errors else 'PASS',
    'assurance': 'INDEPENDENT_READ_ONLY_HASH_AUDIT_OF_SIMULATED_RESULTS',
    'signing_test_count': len(result['cases']),
    'signing_tests_rerun_by_reviewer': False,
    'signing_run': str(run),
    'result_copy_matches_runtime': (BASE / 'evidence/signing-tests.json').read_bytes() == (run / 'result.json').read_bytes(),
    'case_file_checks': checks,
    'runtime_manifest_checks': manifest_checks,
    'raw_archive_sha256': sha(raw_archive),
    'raw_archive_checks': archive_checks,
    'source_file_checks': source_checks,
    'payload_file_checks': payload_checks,
    'payload_total_bytes': sum(row['bytes'] for row in payload_rows),
    'os_evidence_preservation': os_preservation,
    'Q3_payload_changed_paths': payload_changes,
    'historical_and_rule_hash_checks': preserved_hash_checks,
    'log_checks': log_checks,
    'critical_hashes': critical_hashes,
    'errors': errors,
    'actual_user_key_qualification': 'NOT_RUN',
    'os_qualification': 'NOT_RUN',
    'system_changes': False,
}
if not record['result_copy_matches_runtime']:
    record['errors'].append('result-copy-mismatch')
    record['status'] = 'FAIL'
(DEST / 'evidence-audit.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', 'utf-8')
decision = {
    'schema': 'agentnexus.q41.independent-review-decision.v1',
    'observed_at_utc': record['observed_at_utc'],
    'review_status': 'COMPLETE_FOR_UNSIGNED_PREDEPLOY_PREPARATION' if record['status'] == 'PASS' else 'REQUIRES_ATTENTION',
    'deployment_decision': 'NO-GO',
    'candidate_signature_status': 'UNSIGNED',
    'installation_manifest_sha256': sha(BASE / 'approval/installation-manifest.json'),
    'report_sha256': sha(BASE / 'reports/independent-security-review.md'),
    'evidence_audit_sha256': sha(DEST / 'evidence-audit.json'),
    'independent_readonly_final_sha256': sha(DEST / 'readonly-final.json'),
    'closed_findings': [{'id': 'Q41-IR-01', 'priority': 'P2', 'status': 'CLOSED_STATIC_AND_SIMULATED', 'subject': 'Certificate lifetime and human/provider/export wait time guards', 'evidence': ['certificate-shorter-than-plan', 'runtime-detached-valid', 'runtime-certificate-window-denied', 'final Signer/Verifier/Export time guards']}],
    'open_implementation_findings': [],
    'signing_tests': {'cases': len(result['cases']), 'status': result['status'], 'assurance': 'SIMULATED', 'rerun_by_reviewer': False, 'run': str(run)},
    'source_files_verified': len(source_checks),
    'payload_files_verified': len(payload_checks),
    'payload_total_bytes': record['payload_total_bytes'],
    'raw_archive_files_verified': len(archive_checks),
    'actual_user_signing': 'NOT_RUN',
    'actual_user_certificate_pin': None,
    'actual_user_private_key_accessed': False,
    'actual_same_sid_key_isolation': 'INCONCLUSIVE',
    'actual_apply': 'NOT_RUN',
    'windows_os_tests': {'PASS': 0, 'NOT_RUN': 70},
    'production_evidence_categories': {'PASS': 0, 'NOT_RUN': 19},
    'signed_os_production_qualification': 'BLOCKED',
    'governance_full_check_rerun_by_reviewer': False,
    'governance_observed_status': governance['status'],
    'final_sha256sums_review': 'NOT_REVIEWED_NOT_YET_FROZEN_AT_REPORT_TIME',
    'system_changes': False,
    'real_key_or_provider': False,
    'no_deployment_authority_granted': True,
}
(DEST / 'review-decision.json').write_text(json.dumps(decision, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print(json.dumps({key: record[key] for key in ['status', 'signing_test_count', 'result_copy_matches_runtime', 'errors']}))
