"""Q4.2-S1 evidence capture. Reads frozen bundles; writes only this new runtime.
No certificate creation, private-key access, signing, elevation or deployment.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import zipfile

ROOT = Path('I:/AI_AgentNexus')
BASE = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4.2'
RUN = Path(__file__).resolve().parent
errors = []
commands = []

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def write(name, value):
    with (RUN / name).open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')

def command(name, argv, timeout=180):
    start = dt.datetime.now(dt.timezone.utc).isoformat()
    child = subprocess.run(argv, cwd=ROOT, capture_output=True, timeout=timeout,
                           creationflags=subprocess.CREATE_NO_WINDOW)
    for suffix, data in [('stdout', child.stdout), ('stderr', child.stderr)]:
        with (RUN / (name + '.' + suffix + '.log')).open('xb') as stream:
            stream.write(data)
    commands.append(dict(name=name, command=argv, exit_code=child.returncode,
                         started_at_utc=start, ended_at_utc=dt.datetime.now(dt.timezone.utc).isoformat(),
                         stdout_sha256=sha(RUN / (name + '.stdout.log')),
                         stderr_sha256=sha(RUN / (name + '.stderr.log'))))
    return child

def closure(base):
    rows = []
    expected = set()
    for line in (base / 'SHA256SUMS').read_text('utf-8').splitlines():
        digest, rel = line.split('  ', 1)
        parts = PurePosixPath(rel).parts
        if not re.fullmatch('[0-9a-f]{64}', digest) or rel in expected or not parts or any(p in ('..', '.') for p in parts) or ':' in rel or rel.startswith(('/', '\\')):
            raise ValueError('INVALID_CHECKSUM_PATH:' + rel)
        expected.add(rel)
        path = base / rel
        actual = sha(path) if path.is_file() and not path.is_symlink() else None
        rows.append(dict(path=rel, bytes=path.stat().st_size if actual else None,
                         expected_sha256=digest, actual_sha256=actual, matches=actual == digest))
    actual_set = {p.relative_to(base).as_posix() for p in base.rglob('*') if p.is_file() and p != base / 'SHA256SUMS'}
    result = dict(base=str(base), sha256sums_sha256=sha(base / 'SHA256SUMS'),
                  listed_files=len(rows), actual_files=len(actual_set),
                  total_listed_bytes=sum(r['bytes'] or 0 for r in rows),
                  missing=sorted(expected - actual_set), extra=sorted(actual_set - expected), files=rows)
    result['status'] = 'PASS' if not result['missing'] and not result['extra'] and all(r['matches'] for r in rows) else 'FAIL'
    if result['status'] != 'PASS':
        errors.append('CLOSURE:' + base.name)
    write(base.name + '.closure.json', result)
    print(json.dumps({k: v for k, v in result.items() if k != 'files'}), flush=True)
    return result

head = command('git-head', ['git', 'rev-parse', 'HEAD']).stdout.decode().strip()
status = command('git-status-before', ['git', '--no-optional-locks', 'status', '--porcelain=v1', '--untracked-files=normal']).stdout.decode('utf-8')
write('start.json', dict(head=head, worktree=status, started_at_utc=dt.datetime.now(dt.timezone.utc).isoformat()))
closures = [closure(ROOT / 'deliverables' / name) for name in
            ['AgentNexus-M1.8.3-Q3', 'AgentNexus-M1.8.3-Q4', 'AgentNexus-M1.8.3-Q4.1', 'AgentNexus-M1.8.3-Q4.2']]
source_expected = {r['path']: r['sha256'] for r in json.loads((BASE / 'source-manifest.json').read_bytes())['files']}
source_actual = {p.relative_to(BASE / 'source').as_posix(): sha(p) for p in (BASE / 'source').rglob('*') if p.is_file()}
with zipfile.ZipFile(BASE / 'AgentNexus-M1.8.3-Q4.2-source.zip') as archive:
    zip_actual = {i.filename: hashlib.sha256(archive.read(i)).hexdigest() for i in archive.infolist() if not i.is_dir()}
source_ok = source_expected == source_actual == zip_actual and len(source_actual) == 264
if not source_ok:
    errors.append('SOURCE_OR_SOURCE_ZIP')
payload = json.loads((BASE / 'payload-staging-manifest.json').read_bytes())['files']
payload_expected = {r['path']: (r['bytes'], r['sha256']) for r in payload}
payload_actual = {p.relative_to(BASE / 'payload').as_posix(): (p.stat().st_size, sha(p)) for p in (BASE / 'payload').rglob('*') if p.is_file()}
payload_ok = payload_actual == payload_expected and len(payload_actual) == 194
if not payload_ok:
    errors.append('PAYLOAD')
write('staging-file-hashes.json', dict(status='PASS' if payload_ok else 'FAIL', authority='STAGING_ONLY_NOT_A_USER_CANDIDATE', files=payload))
review = json.loads((BASE / 'evidence/review-targets.json').read_bytes())
review_ok = all(sha(BASE / r['path']) == r['sha256'] for r in review['files'])
if not review_ok:
    errors.append('REVIEW_TARGET_HASHES')
baseline = json.loads((BASE / 'evidence/baseline.json').read_bytes())
protected = [dict(path=r['path'], expected=r['sha256'], actual=sha(ROOT / r['path'])) for r in baseline['protected']]
write('protected-files.json', protected)
if not all(r['expected'] == r['actual'] for r in protected):
    errors.append('PROTECTED_RULES')
legacy = command('q42-verify-delivery', [sys.executable, '-B', str(BASE / 'tools/verify-delivery.py')], 300)
try:
    legacy_result = json.loads(legacy.stdout)
except ValueError:
    legacy_result = dict(status='UNPARSEABLE', errors=['NO_JSON_RESULT'])
lineage = command('baseline-ancestor', ['git', 'merge-base', '--is-ancestor', baseline['head'], head])
changes = command('baseline-to-head', ['git', 'diff', '--name-status', baseline['head'], head])
describe = command('verifier-describe', [str(BASE / 'signer/AgentNexus.Qualification.Verifier.exe'), '--describe'])
identity = command('verifier-identity', [str(BASE / 'signer/AgentNexus.Qualification.Verifier.exe'), '--identity'])
if describe.returncode or identity.returncode:
    errors.append('VERIFIER_ENTRY')
else:
    write('target-identity.observed.json', json.loads(identity.stdout))
signer = command('signer-automatic-arguments-rejected', [str(BASE / 'signer/AgentNexus.Qualification.Signer.exe'), '--approve', '--automatic'], 15)
if signer.returncode != 21:
    errors.append('SIGNER_ARGUMENT_REJECTION')

# Only public certificate metadata; no CNG associated-key handles are opened.
host_script = r'''
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$id=[Security.Principal.WindowsIdentity]::GetCurrent()
$report=[ordered]@{host=$env:COMPUTERNAME;operator_name=$id.Name;operator_sid=$id.User.Value;session_id=[Diagnostics.Process]::GetCurrentProcess().SessionId;administrator_enabled=([Security.Principal.WindowsPrincipal]::new($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);observed_at_utc=[DateTime]::UtcNow.ToString('o');selected_signing_environment='USER_SELECTED_SEPARATE_WINDOWS_DEVICE_AGENT_INACCESSIBLE';separate_device_inspected_by_agent=$false;independent_environment_readiness='PENDING_USER_EVIDENCE';private_key_opened=$false;certificate_store_modified=$false;system_changes=$false}
$stores=@()
foreach($location in @([Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser,[Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine)){
 $store=[Security.Cryptography.X509Certificates.X509Store]::new([Security.Cryptography.X509Certificates.StoreName]::My,$location)
 try{
  $store.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly -bor [Security.Cryptography.X509Certificates.OpenFlags]::OpenExistingOnly)
  $certs=$store.Certificates;$candidates=@()
  foreach($cert in $certs){
   try{
    $ekus=@($cert.Extensions | Where-Object {$_ -is [Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]} | ForEach-Object {$_.EnhancedKeyUsages} | ForEach-Object {$_.Value})
    if($ekus -contains '1.3.6.1.5.5.7.3.36'){$candidates += [ordered]@{subject=$cert.Subject;issuer=$cert.Issuer;der_sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($cert.RawData)).ToLowerInvariant();not_before_utc=$cert.NotBefore.ToUniversalTime().ToString('o');not_after_utc=$cert.NotAfter.ToUniversalTime().ToString('o');has_private_key_metadata_only=$cert.HasPrivateKey;eku=$ekus;selected_or_trusted=$false}}
   }finally{$cert.Dispose()}
  }
  $stores += [ordered]@{location=$location.ToString();status='READ_ONLY_METADATA';total_certificates=$certs.Count;document_signing_candidates=$candidates}
 }catch{$stores += [ordered]@{location=$location.ToString();status='INCONCLUSIVE';reason=$_.Exception.Message}}finally{$store.Dispose()}
}
$report.certificate_stores=$stores
try{$tpm=Get-Tpm -ErrorAction Stop;$report.tpm=[ordered]@{status='READ_ONLY_METADATA';present=$tpm.TpmPresent;ready=$tpm.TpmReady;actual_cng_tpm_signing='NOT_RUN'}}catch{$report.tpm=[ordered]@{status='INCONCLUSIVE';reason=$_.Exception.Message;actual_cng_tpm_signing='NOT_RUN'}}
$sc=@(& 'C:\Windows\System32\sc.exe' queryex AgentNexusCredential 2>&1);$report.service_query=[ordered]@{exit_code=$LASTEXITCODE;raw=$sc}
$sid=@(& 'C:\Windows\System32\sc.exe' showsid AgentNexusCredential 2>&1);$report.service_sid_query=[ordered]@{exit_code=$LASTEXITCODE;raw=$sid}
$report.target_paths=@(foreach($p in @('C:\Program Files\AgentNexus','C:\ProgramData\AgentNexusCredential')){[ordered]@{path=$p;exists=(Test-Path -LiteralPath $p)}})
$report | ConvertTo-Json -Depth 20
'''
host = command('host-public-preflight', ['pwsh', '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', host_script])
if host.returncode:
    errors.append('HOST_PUBLIC_PREFLIGHT')
else:
    write('host-preflight.json', json.loads(host.stdout))
command('whoami-groups', ['C:/Windows/System32/whoami.exe', '/groups'])
command('session-query', ['C:/Windows/System32/query.exe', 'user'])
legacy_errors = legacy_result.get('errors', [])
if legacy_errors != ['head-changed'] or lineage.returncode:
    errors.append('LEGACY_CHECK_UNEXPECTED_RESULT')
write('commands.json', commands)
result = dict(schema='agentnexus.q42-s1.preflight.v1',
              status='PASS_WITH_HISTORICAL_HEAD_GUARD_MISMATCH' if not errors else 'FAIL', errors=errors,
              head=head, start_worktree=status, baseline_head=baseline['head'], baseline_is_ancestor=lineage.returncode == 0,
              historical_checker=dict(exit_code=legacy.returncode, status=legacy_result.get('status'), errors=legacy_errors,
                                      unchanged=True, hash_failure_waived=False),
              closures=[{k: v for k, v in r.items() if k != 'files'} for r in closures],
              source_files=len(source_actual), source_and_zip_match=source_ok,
              review_targets_match=review_ok, review_target_count=len(review['files']),
              payload_files=len(payload_actual), payload_bytes=sum(r[0] for r in payload_actual.values()), payload_matches=payload_ok,
              key_files={p:sha(BASE / p) for p in ['SHA256SUMS','source-manifest.json','payload-staging-manifest.json','signer/AgentNexus.Qualification.Signer.exe','signer/AgentNexus.Qualification.Verifier.exe','source/native/qualification-signer/user-create-certificate.ps1','tools/freeze.py','tools/build.py','source/tools/agentnexus/install-q41-qualification.ps1']},
              actual_certificate=None, actual_der_sha256_pin=None, actual_candidate='NOT_RUN', qualification_plan_signing='NOT_RUN',
              deployment_approval_signing='NOT_RUN', target_signed_verification='NOT_RUN', installation_approved=False,
              start_service=False, os_qualification=dict(passed=0, not_run=70), production_vault='BLOCKED',
              private_key_accessed=False, system_changes=False, real_api_keys_imported=0, real_provider_requests=0,
              completed_at_utc=dt.datetime.now(dt.timezone.utc).isoformat())
write('preflight-result.json', result)
print(json.dumps(result, ensure_ascii=False), flush=True)
raise SystemExit(1 if errors else 0)
