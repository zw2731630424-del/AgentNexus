"""Adversarial CMS/contract tests with in-memory, non-trusted synthetic certificates."""
import copy
import datetime as dt
import json
from pathlib import Path
import shutil
import subprocess
import uuid
import zipfile
from baseline import ROOT, OUT, sha, write
from freeze import utc

RUN = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8.3-Q4.1' / ('signing-tests-' + dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
RUN.mkdir(parents=True)
H = RUN / 'contract-harness.exe'
SRC = OUT / 'source/native'
flags = ['/nologo', '/target:exe', '/platform:x64', '/langversion:5', '/warn:4', '/warnaserror+', '/r:System.Core.dll', '/r:System.ServiceProcess.dll', '/r:System.Security.dll', '/r:System.Web.Extensions.dll']

def run(name, command):
    p = subprocess.run(list(map(str, command)), capture_output=True, timeout=90, creationflags=subprocess.CREATE_NO_WINDOW)
    (RUN / (name + '.stdout.log')).write_bytes(p.stdout)
    (RUN / (name + '.stderr.log')).write_bytes(p.stderr)
    return p.returncode, p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()

code, out, err = run('harness-compilation', ['C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe', *flags, '/out:' + str(H), '/main:AgentNexus.CredentialBoundary.ContractHarness', SRC / 'credential-service/Common.cs', SRC / 'qualification-signer/SigningContracts.cs', SRC / 'qualification-signer/Verifier.cs', SRC / 'qualification-signer/ContractHarness.cs'])
if code:
    raise SystemExit('HARNESS_COMPILE_FAILED: ' + out.encode('ascii', 'replace').decode())
write(RUN / 'identity.input.json', {'action': 'identity'})
code, out, err = run('identity', [H, RUN / 'identity.input.json'])
assert code == 0, out
identity = json.loads(out)
description = json.loads(subprocess.check_output([str(OUT / 'signer/AgentNexus.Qualification.Verifier.exe'), '--describe'], creationflags=subprocess.CREATE_NO_WINDOW))
plan_template = json.loads((OUT / 'approval/qualification-plan.json').read_bytes())
approval_template = json.loads((OUT / 'approval/deployment-approval.json').read_bytes())
mapping = {'service_sha256': 'AgentNexusCredential.exe', 'client_sha256': 'pipe-client.exe', 'helper_sha256': 'trusted-credential-helper.exe', 'launcher_sha256': 'credential-launcher.exe', 'node_sha256': 'node.exe', 'engine_sha256': 'app/dist/src/agentnexus/credential-service/engine.js', 'application_manifest_sha256': 'app-manifest.json'}
meta = {'installation_manifest_sha256': 'approval/installation-manifest.json', 'service_config_sha256': 'approval/candidate/service-config.json', 'signature_policy_sha256': 'approval/signature-policy.json', 'system_changes_sha256': 'approval/system-changes.json', 'installer_sha256': 'source/tools/agentnexus/install-q41-qualification.ps1', 'verifier_sha256': 'signer/AgentNexus.Qualification.Verifier.exe', 'signer_tool_sha256': 'signer/AgentNexus.Qualification.Signer.exe'}
fixtures, cases = [], []

def fixture(name, p_change=None, a_change=None, cert='local', same_ref=False):
    root = RUN / 'fixtures' / name
    for rel in list(mapping.values())[:-1] + ['app/package.json']:
        p = root / 'payload' / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(('SIMULATED NONEXECUTABLE ' + rel).encode())
    write(root / 'payload/app-manifest.json', {'schema': 'agentnexus.application-manifest.v1', 'files': [{'path': r, 'sha256': sha(root / 'payload' / r)} for r in ['app/dist/src/agentnexus/credential-service/engine.js', 'app/package.json']]})
    hashes = {k: sha(root / 'payload' / r) for k, r in mapping.items()}
    expires = utc(dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=2))
    deployment_id = str(uuid.uuid4())
    ref = 'APPROVED-SIMULATED-QUAL-' + deployment_id
    write(root / 'payload/launcher-plan.json', {'schema': 'agentnexus.launcher-plan.v1', 'machine_id': identity['machine_id'], 'operator_sid': identity['operator_sid'], 'policy_epoch': 4, 'expires_at_utc': expires, 'helper_sha256': hashes['helper_sha256'], 'launcher_sha256': hashes['launcher_sha256'], 'approval_ref': ref})
    files = [{'path': p.relative_to(root / 'payload').as_posix(), 'target': 'C:/Program Files/AgentNexus/' + p.relative_to(root / 'payload').as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted((root / 'payload').rglob('*')) if p.is_file()]
    write(root / 'approval/installation-manifest.json', {'schema': 'agentnexus.q3.installation-manifest.v1', 'scope': 'QUALIFICATION_ONLY', 'deployment_approved': False, 'production_qualified': False, 'files': files})
    config = json.loads((OUT / 'approval/candidate/service-config.json').read_bytes())
    config.update(hashes, qualification_test_approval_ref=ref)
    write(root / 'approval/candidate/service-config.json', config)
    write(root / 'approval/signature-policy.json', description['signature_policy'])
    write(root / 'approval/system-changes.json', description['system_changes'])
    for rel in list(meta.values())[4:]:
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(OUT / rel, p)
    p = copy.deepcopy(plan_template)
    p.update(hashes)
    p.update({k: identity[k] for k in ['machine_id', 'operator_sid', 'service_sid']})
    p.update(target_host=identity['host'], issued_at_utc=utc(dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=1)), expires_at_utc=expires, deployment_id=deployment_id, qualification_test_approval_ref=ref, user_confirmed=True, payload_files=len(files), payload_bytes=sum(r['bytes'] for r in files))
    p.update({k: sha(root / rel) for k, rel in meta.items()})
    p.update(p_change or {})
    write(root / 'approval/qualification-plan.json', p)
    a = copy.deepcopy(approval_template)
    a.update(deployment_approved=True, user_confirmed=True, approval_ref='APPROVED-SIMULATED-DEPLOY-' + deployment_id)
    write(root / 'approval/deployment-approval.json', a)
    fixtures.append({'root': str(root), 'certificate': cert, 'approval_overrides': a_change or {}, 'same_ref': same_ref})
    return root

def test(name, data, expected='ACCEPTED', exit_code=0):
    cases.append((name, data, expected, exit_code))

valid = fixture('valid')
test('01-correct-simulated-local-certificate', {'action': 'bundle', 'root': str(valid)})
for name, field, value, expected in [
    ('09-operator-sid', 'operator_sid', 'S-1-5-21-100-200-300-1001', 'OPERATOR_SID_MISMATCH'),
    ('10-host-machine', 'machine_id', '1'*64, 'HOST_MISMATCH'),
    ('11-service-sid', 'service_sid', 'S-1-5-80-1-2-3-4-5', 'SERVICE_SID_MISMATCH'),
    ('12-old-epoch', 'policy_epoch', 3, 'EPOCH_MISMATCH'),
    ('14-scope-expanded', 'status', 'QUALIFIED', 'LOCAL_QUALIFICATION_SCOPE_REQUIRED'),
    ('15-real-import', 'real_import', True, 'LOCAL_REAL_PERMISSION_DENIED:real_import'),
    ('16-live-provider', 'live_provider', True, 'LOCAL_REAL_PERMISSION_DENIED:live_provider'),
    ('17-production-release', 'production_release', True, 'LOCAL_REAL_PERMISSION_DENIED:production_release'),
    ('18-real-ledger', 'real_ledger_migration', True, 'LOCAL_REAL_PERMISSION_DENIED:real_ledger_migration'),
    ('flag-string', 'real_import', 'false', 'BOOLEAN_REQUIRED:real_import'),
    ('wrong-file-count', 'payload_files', 999, 'PAYLOAD_TOTALS_MISMATCH'),
    ('wrong-total-bytes', 'payload_bytes', 999, 'PAYLOAD_TOTALS_MISMATCH'),
    ('missing-plan-confirmation', 'user_confirmed', False, 'USER_CONFIRMATION_REQUIRED'),
    ('loose-date-format', 'expires_at_utc', (dt.datetime.now(dt.timezone.utc)+dt.timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%SZ'), 'STRICT_UTC_REQUIRED'),
    ('expired-plan', 'expires_at_utc', utc(dt.datetime.now(dt.timezone.utc)-dt.timedelta(seconds=1)), 'LOCAL_TIME_INVALID'),
    ('future-plan', 'issued_at_utc', utc(dt.datetime.now(dt.timezone.utc)+dt.timedelta(hours=1)), 'LOCAL_TIME_INVALID'),
]:
    r = fixture(name, {field: value})
    test(name, {'action': 'bundle', 'root': str(r)}, expected, 21)
for name, override, expected in [
    ('13-validity-mismatch', {'expires_at_utc': utc(dt.datetime.now(dt.timezone.utc)+dt.timedelta(hours=1))}, 'APPROVAL_BINDING_MISMATCH:expires_at_utc'),
    ('plan-does-not-approve-deployment', {'deployment_approved': False}, 'SEPARATE_DEPLOYMENT_CONFIRMATION_REQUIRED'),
    ('missing-deploy-confirmation', {'user_confirmed': False}, 'SEPARATE_DEPLOYMENT_CONFIRMATION_REQUIRED'),
    ('unapproved-service-start', {'start_service': True}, 'SERVICE_START_REQUIRES_SEPARATE_FUTURE_APPROVAL'),
    ('cross-host-approval', {'machine_id': '2'*64}, 'APPROVAL_BINDING_MISMATCH:machine_id'),
]:
    r = fixture(name, a_change=override)
    test(name, {'action': 'bundle', 'root': str(r)}, expected, 21)
r = fixture('same-reference', same_ref=True)
test('same-reference-not-independent', {'action': 'bundle', 'root': str(r)}, 'SEPARATE_DEPLOYMENT_CONFIRMATION_REQUIRED', 21)
r = fixture('certificate-short-window', cert='short')
test('certificate-shorter-than-plan', {'action': 'bundle', 'root': str(r), 'use_cert_pin': 'short'}, 'CERTIFICATE_PLAN_WINDOW_MISMATCH', 21)
for name, expected in [('06-signature-tamper', 'CMS_INVALID'), ('07-manifest-changed', 'CANDIDATE_HASH_MISMATCH:installation_manifest_sha256'), ('08-plan-changed', 'CMS_INVALID'), ('20-payload-changed', 'PAYLOAD_HASH_OR_BYTES'), ('21-dependency-replaced', 'PAYLOAD_HASH_OR_BYTES'), ('22-unsigned-deploy', 'FileNotFoundException'), ('missing-completion-marker', 'FileNotFoundException'), ('wrong-host-name', 'HOST_NAME_MISMATCH'), ('installer-replaced', 'CANDIDATE_HASH_MISMATCH:installer_sha256'), ('test-name-case', 'QUALIFICATION_TEST_REJECTED')]:
    r = fixture(name)
    test(name, {'action': 'bundle', 'root': str(r)}, expected, 21)
write(RUN / 'fixture-spec.json', {'fixtures': fixtures})
code, out, err = run('simulate-signatures', [shutil.which('pwsh'), '-NoProfile', '-File', OUT / 'tools/sign-fixtures.ps1', '-RunDirectory', RUN])
if code:
    raise SystemExit('SIMULATION_FAILED: ' + err)
certs = json.loads((RUN / 'SIMULATED-public-metadata.json').read_bytes())
pin = certs['local']['pin']
content, signature = valid / 'approval/qualification-plan.json', valid / 'approval/qualification-plan.p7s'
# Mutations made AFTER signing exercise actual cryptographic integrity failures.
def root_for(name):
    return RUN / 'fixtures' / name
def append(path):
    path.write_bytes(path.read_bytes()+b' ')
p = root_for('06-signature-tamper') / 'approval/qualification-plan.p7s'; b=bytearray(p.read_bytes()); b[-1] ^= 1; p.write_bytes(b)
append(root_for('07-manifest-changed') / 'approval/installation-manifest.json')
append(root_for('08-plan-changed') / 'approval/qualification-plan.json')
append(root_for('20-payload-changed') / 'payload/AgentNexusCredential.exe')
(root_for('21-dependency-replaced') / 'payload/app/package.json').write_bytes(b'REPLACED')
for name, rel in [('22-unsigned-deploy', 'approval/deployment-approval.p7s'), ('missing-completion-marker', 'approval/deployment-approval.signing-result.json')]:
    p = root_for(name) / rel; p.rename(str(p)+'.withheld')
append(root_for('installer-replaced') / 'source/tools/agentnexus/install-q41-qualification.ps1')
# Host name and test-name scenarios are tested as semantic validators directly;
# actual machine/SID binding already has freshly signed adversarial fixtures above.
cases = [x for x in cases if x[0] not in ['wrong-host-name', 'test-name-case']]

def cms(sig, cert='local', mode='LOCAL_QUALIFICATION'):
    return {'action': 'cms', 'content': str(content), 'signature': str(sig), 'pin': certs[cert]['pin'], 'subject': certs[cert]['subject'], 'mode': mode}
test('02-wrong-certificate', cms(RUN/'other.p7s'), 'CERTIFICATE_PIN_MISMATCH', 21)
d=cms(signature); d['pin']='0'*64; test('03-wrong-der-pin', d, 'CERTIFICATE_PIN_MISMATCH', 21)
d=cms(signature); d['pin']=certs['other']['pin']; test('04-certificate-replaced', d, 'CERTIFICATE_PIN_MISMATCH', 21)
test('05-expired-certificate', cms(RUN/'expired.p7s', 'expired'), 'CERTIFICATE_EXPIRED', 21)
for name, cert, expected in [('code', 'code', 'LOCAL_CERTIFICATE_PURPOSE'), ('weak', 'weak', 'LOCAL_CERTIFICATE_ALGORITHM'), ('sha1', 'local', 'CMS_SHA256_REQUIRED'), ('attached-same', 'local', 'DETACHED_CMS_REQUIRED'), ('attached-other', 'local', 'DETACHED_CMS_REQUIRED'), ('multiple-signers', 'local', 'CMS_SIGNER_COUNT_OR_ATTACHED_CONTENT')]:
    test(name, cms(RUN/(name+'.p7s'), cert), expected, 21)
test('local-cert-cannot-production', cms(signature, mode='PRODUCTION_RELEASE'), 'LOCAL_CERTIFICATE_CANNOT_RELEASE_PRODUCTION', 21)
test('untrusted-ca-cannot-production', cms(RUN/'code.p7s', 'code', 'PRODUCTION_RELEASE'), 'PRODUCTION_TRUST_CHAIN_REQUIRED', 21)
test('19-old-signature-replay', {'action': 'epoch', 'epoch': 4, 'receipt_exists': True}, 'EPOCH_ALREADY_CONSUMED', 21)
test('old-epoch-without-receipt', {'action': 'epoch', 'epoch': 3, 'receipt_exists': False}, 'EPOCH_MISMATCH', 21)
for name, flags in [('23-missing-confirmation', {'typed': ''}), ('missing-isolation', {'isolated': False}), ('missing-host-review', {'target_verified': False})]:
    d = dict(action='review', isolated=True, target_verified=True, typed='SIGN PLAN 123456789abc', expected='SIGN PLAN 123456789abc'); d.update(flags)
    test(name, d, 'EXPLICIT_USER_CONFIRMATION_REQUIRED', 21)
for name, text in [('duplicate-json', '{"real_import":false,"real_import":true}'), ('case-alias-json', '{"real_import":false,"Real_Import":true}'), ('escaped-duplicate-json', '{"real_import":false,"real_\\u0069mport":true}')]:
    p=RUN/(name+'.json'); p.write_text(text, 'utf-8'); test(name, {'action': 'json', 'content': str(p)}, 'DUPLICATE_JSON_KEY', 21)
test('held-dependency-mutation', {'action': 'locked-mutation', 'root': str(valid)})
test('runtime-detached-valid', {'action': 'runtime-detached', 'config': str(valid/'approval/candidate/service-config.json'), 'content': str(content), 'signature': str(signature)})
short = RUN/'fixtures/certificate-short-window'
test('runtime-certificate-window-denied', {'action': 'runtime-detached', 'config': str(short/'approval/candidate/service-config.json'), 'content': str(short/'approval/qualification-plan.json'), 'signature': str(short/'approval/qualification-plan.p7s')}, 'CERTIFICATE_PLAN_WINDOW_MISMATCH', 21)
plan_export, approval_export = RUN/'exported-plan', RUN/'exported-approval'
test('export-plan', {'action': 'export-plan', 'root': str(valid), 'output': str(plan_export), 'reviewed': str(content), 'signature': str(signature)})
test('export-approval', {'action': 'export-approval', 'root': str(plan_export), 'output': str(approval_export), 'reviewed': str(valid/'approval/deployment-approval.json'), 'signature': str(valid/'approval/deployment-approval.p7s')})
test('exported-bundle-reverified', {'action': 'bundle', 'root': str(approval_export)})
interrupted=RUN/'interrupted-output'
test('24-signer-abnormal-process-exit', {'action': 'interrupted-publish', 'output': str(interrupted), 'reviewed': str(content)}, 'SIMULATED_PROCESS_EXIT_BEFORE_SIGNATURE_PUBLICATION', 73)
test('24b-interrupted-output-refused', {'action': 'bundle', 'root': str(interrupted)}, 'DirectoryNotFoundException', 21)

results=[]
for name, data, expected, exit_code in cases:
    if data.get('action') == 'bundle':
        data['pin'] = certs[data.pop('use_cert_pin', 'local')]['pin']
    write(RUN/(name+'.input.json'), data)
    code, out, err = run(name, [H, RUN/(name+'.input.json')])
    ok = code == exit_code and out == expected and err == ''
    results.append({'id': name, 'status': 'PASS' if ok else 'FAIL', 'assurance': 'SIMULATED', 'expected': expected, 'actual': out, 'exit_code': code, 'expected_exit': exit_code,
                    'input_sha256': sha(RUN/(name+'.input.json')), 'stdout_sha256': sha(RUN/(name+'.stdout.log')), 'stderr_sha256': sha(RUN/(name+'.stderr.log'))})
    if not ok:
        print(json.dumps(results[-1]), flush=True)
result={'schema': 'agentnexus.q41.signing-tests.v1', 'status': 'PASS' if all(r['status']=='PASS' for r in results) else 'FAIL', 'assurance': 'SIMULATED', 'tests': len(results), 'passed': sum(r['status']=='PASS' for r in results), 'failed': sum(r['status']=='FAIL' for r in results), 'cases': results, 'run': str(RUN), 'certificate_store_modified': False, 'private_key_exported': False, 'user_signing_key_used': False, 'actual_local_signing_qualification': 'NOT_RUN', 'system_changes': False, 'real_import': False, 'live_provider': False}
write(RUN/'result.json', result)
write(OUT/'evidence/signing-tests.json', result)
raw = OUT/'evidence/signing-tests'/RUN.name
raw.mkdir(parents=True)
for p in RUN.iterdir():
    if p.is_file() and p.suffix != '.exe':
        shutil.copyfile(p, raw/p.name)
write(raw/'runtime-evidence-manifest.json', {'files': [{'path': p.relative_to(RUN).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(RUN.rglob('*')) if p.is_file()]})
with zipfile.ZipFile(raw/'SIMULATED-fixtures-and-exports.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for p in sorted(RUN.rglob('*')):
        if p.is_file(): archive.write(p,p.relative_to(RUN).as_posix())
print(json.dumps({k: result[k] for k in ['status','tests','passed','failed','run']}), flush=True)
raise SystemExit(0 if result['status']=='PASS' else 1)
