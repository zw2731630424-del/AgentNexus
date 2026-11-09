"""Independent review only: existing public fixtures/CMS, no signing or certificate-store access."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

BASE = Path(__file__).resolve().parents[2]
AUDIT = Path(__file__).resolve().parent
RUN = AUDIT / ('run-' + dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
RUN.mkdir(parents=True, exist_ok=False)
CREATE_NO_WINDOW = getattr(subprocess, 'CREATE_NO_WINDOW', 0)

def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()

def sha(path):
    return sha_bytes(Path(path).read_bytes())

def save(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def command(name, args, expected_code=0, expected_text=None, timeout=50, expected_stderr=''):
    child = subprocess.run([str(x) for x in args], capture_output=True, timeout=timeout, creationflags=CREATE_NO_WINDOW)
    out, err = RUN / (name + '.stdout.log'), RUN / (name + '.stderr.log')
    out.write_bytes(child.stdout)
    err.write_bytes(child.stderr)
    decoded = child.stdout.decode('utf-8', 'replace').strip()
    good = child.returncode == expected_code and child.stderr.decode('utf-8', 'replace').strip() == expected_stderr and (expected_text is None or decoded == expected_text)
    row = {'id': name, 'command': [str(x) for x in args], 'exit_code': child.returncode, 'expected_exit': expected_code,
           'stdout_sha256': sha(out), 'stderr_sha256': sha(err), 'status': 'PASS' if good else 'FAIL'}
    if expected_text is not None:
        row['expected_stdout'] = expected_text
    checks.append(row)
    return child

checks = []
targets_path = BASE / 'evidence/review-targets.json'
targets = json.loads(targets_path.read_bytes())
target_rows = []
for item in targets['files']:
    actual = sha(BASE / item['path'])
    target_rows.append({**item, 'actual_sha256': actual, 'match': actual == item['sha256']})
if not all(x['match'] for x in target_rows):
    save(RUN / 'target-mismatch.json', target_rows)
    raise SystemExit('REVIEW_TARGET_HASH_MISMATCH')
save(RUN / 'targets-before.json', {'review_targets_sha256': sha(targets_path), 'files': target_rows})

tests_path = BASE / 'evidence/signing-tests.json'
tests = json.loads(tests_path.read_bytes())
source_run = Path(tests['run'])
raw = BASE / 'evidence/signing-tests' / source_run.name
integrity = []
for case in tests['cases']:
    for suffix, key in [('.input.json', 'input_sha256'), ('.stdout.log', 'stdout_sha256'), ('.stderr.log', 'stderr_sha256')]:
        original, delivered = source_run / (case['id'] + suffix), raw / (case['id'] + suffix)
        integrity.append({'path': original.name, 'expected_sha256': case[key], 'original_sha256': sha(original), 'delivered_sha256': sha(delivered),
                          'match': sha(original) == sha(delivered) == case[key]})
runtime_manifest = json.loads((raw / 'runtime-evidence-manifest.json').read_bytes())
runtime_rows = []
for item in runtime_manifest['files']:
    original = source_run / item['path']
    runtime_rows.append({'path': item['path'], 'match': original.stat().st_size == item['bytes'] and sha(original) == item['sha256']})
archive_rows = []
with zipfile.ZipFile(raw / 'SIMULATED-fixtures-and-exports.zip') as archive:
    for item in runtime_manifest['files']:
        data = archive.read(item['path'])
        archive_rows.append({'path': item['path'], 'match': len(data) == item['bytes'] and sha_bytes(data) == item['sha256']})
save(RUN / 'historical-evidence-integrity.json', {'summary_source': str(tests_path), 'summary_sha256': sha(tests_path),
     'reported_tests': tests['tests'], 'reported_passed': tests['passed'], 'reported_failed': tests['failed'], 'raw_cases': integrity,
     'runtime_files': runtime_rows, 'archive_files': archive_rows})

# Compile the reviewed diagnostic harness, not the fixture-generation/signing script.
src = BASE / 'source/native'
harness = RUN / 'independent-contract-harness.exe'
csc = Path('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe')
flags = ['/nologo', '/target:exe', '/platform:x64', '/langversion:5', '/warn:4', '/warnaserror+', '/define:SIGNING_DIAGNOSTIC',
         '/r:System.Core.dll', '/r:System.ServiceProcess.dll', '/r:System.Security.dll', '/r:System.Web.Extensions.dll',
         '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll', '/out:' + str(harness), '/main:AgentNexus.CredentialBoundary.ContractHarness']
sources = [src / 'credential-service/Common.cs', *[src / 'qualification-signer' / x for x in ['SigningContracts.cs', 'Verifier.cs', 'QualificationSigner.cs', 'ContractHarness.cs']]]
child = command('compile-independent-harness', [csc, *flags, *sources])
if child.returncode:
    raise SystemExit('INDEPENDENT_HARNESS_COMPILE_FAILED')

allowed = {'cms', 'certificate', 'public-der', 'public-key-mismatch', 'missing-private-key', 'local-path', 'authorization-gate', 'cms-signature-oid',
           'runtime-detached', 'plan', 'approval', 'bundle', 'signed-plan', 'review', 'epoch', 'json'}
rerun = []
for case in tests['cases']:
    input_path = source_run / (case['id'] + '.input.json')
    data = json.loads(input_path.read_bytes())
    if data['action'] not in allowed:
        continue
    expected_code, expected_text = case['expected_exit'], case['expected']
    note = None
    if case['id'] == '01-correct-simulated-local-certificate' and (Path(data['root']) / 'payload/injected.txt').exists():
        expected_code, expected_text = 21, 'PAYLOAD_FILE_SET'
        note = 'Original positive fixture was intentionally mutated by the later added-after-review case; current rejection is expected. Exported approval supplies the independent positive control.'
    command('readonly-' + case['id'], [harness, input_path], expected_code, expected_text)
    rerun.append({'id': case['id'], 'action': data['action'], 'input_sha256': sha(input_path), 'original_expected': case['expected'], 'effective_expected': expected_text, 'note': note})

# The actual final production verifier only reads the unsigned candidate or existing PUBLIC simulated CMS.
verifier = BASE / 'signer/AgentNexus.Qualification.Verifier.exe'
command('release-verifier-describe', [verifier, '--describe'])
command('release-verifier-identity', [verifier, '--identity'])
command('release-verifier-toolkit-cannot-be-candidate', [verifier, '--inspect', BASE], 21, '', expected_stderr='DirectoryNotFoundException')
valid_input = json.loads((source_run / 'exported-bundle-reverified.input.json').read_bytes())
command('release-verifier-public-simulated-certificate', [verifier, '--public-certificate', source_run / 'SIMULATED-local-public.cer', valid_input['pin']])
command('release-verifier-simulated-bundle', [verifier, '--verify', valid_input['root'], valid_input['pin']])
command('release-pure-filesystem-probe', ['C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe', '-NoProfile', '-File', AUDIT / 'pure-filesystem-probe.ps1', '-BundleRoot', BASE, '-NewWorkRoot', RUN / 'pure-fs'])

after = []
for item in targets['files']:
    after.append({'path': item['path'], 'expected_sha256': item['sha256'], 'actual_sha256': sha(BASE / item['path']), 'match': sha(BASE / item['path']) == item['sha256']})
save(RUN / 'targets-after.json', after)
good = all(c['status'] == 'PASS' for c in checks) and all(x['match'] for x in integrity + runtime_rows + archive_rows + after)
result = {'status': 'PASS' if good else 'FAIL', 'run': str(RUN), 'review_targets_sha256': sha(targets_path), 'source_simulated_run': str(source_run),
          'target_files': target_rows, 'commands': checks, 'readonly_diagnostic_cases': rerun, 'historical_case_artifacts_checked': len(integrity),
          'historical_runtime_files_checked': len(runtime_rows), 'historical_archive_files_checked': len(archive_rows),
          'scope': 'SOURCE_PE_READONLY_PUBLIC_SIMULATED_CMS_AND_PURE_FILESYSTEM_ONLY',
          'new_signatures_created': False, 'user_private_keys_opened': False, 'certificate_store_modified': False, 'service_or_acl_operations': False,
          'actual_gui_cancel_or_signing': 'NOT_RUN', 'actual_cng_or_tpm': 'NOT_RUN'}
save(RUN / 'result.json', result)
print(json.dumps({'status': result['status'], 'run': str(RUN), 'commands': len(checks), 'readonly_cases': len(rerun),
                  'failed_commands': [c['id'] for c in checks if c['status'] != 'PASS'], 'case_artifacts': len(integrity), 'runtime_files': len(runtime_rows), 'archive_files': len(archive_rows)}))
raise SystemExit(0 if good else 1)
