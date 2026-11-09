"""Prepare a NEW unsigned epoch-5 candidate using only an independently selected PUBLIC DER.
Never creates certificates/keys, opens a private key, changes a store, signs or installs.
Q4.1 candidates must not be signed. Missing certificate/pin/target identity fails closed.
"""
import argparse
import base64
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import subprocess
import uuid
from baseline import OUT
from local_files import PublicFiles, local

DENIED = ['real_import', 'live_provider', 'production_release', 'real_ledger_migration', 'real_import_enabled', 'live_enabled']
HASHES = {'service_sha256': 'AgentNexusCredential.exe', 'client_sha256': 'pipe-client.exe', 'helper_sha256': 'trusted-credential-helper.exe', 'launcher_sha256': 'credential-launcher.exe', 'node_sha256': 'node.exe', 'engine_sha256': 'app/dist/src/agentnexus/credential-service/engine.js', 'application_manifest_sha256': 'app-manifest.json'}
META = {'installation_manifest_sha256': 'approval/installation-manifest.json', 'service_config_sha256': 'approval/candidate/service-config.json', 'signature_policy_sha256': 'approval/signature-policy.json', 'system_changes_sha256': 'approval/system-changes.json', 'installer_sha256': 'source/tools/agentnexus/install-q41-qualification.ps1', 'verifier_sha256': 'signer/AgentNexus.Qualification.Verifier.exe', 'signer_tool_sha256': 'signer/AgentNexus.Qualification.Signer.exe'}

def utc(value):
    return value.astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + f'{value.microsecond:06d}0Z'

def inspect_public(verifier_bytes, der, pin):
    # Framework reflection loads the already hashed public PE snapshot. No path is reopened for execution.
    script = r'''
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$inputData=[Console]::In.ReadToEnd() | ConvertFrom-Json
$assembly=[Reflection.Assembly]::Load([Convert]::FromBase64String($inputData.verifier))
$der=[Convert]::FromBase64String($inputData.certificate)
$flags=[Reflection.BindingFlags]'Static,NonPublic'
$contract=$assembly.GetType('AgentNexus.CredentialBoundary.SigningContract',$true)
$cert=$contract.GetMethod('PublicCertificate',$flags).Invoke($null,[object[]]@(,$der))
try {
 [void]$contract.GetMethod('Certificate',$flags).Invoke($null,[object[]]@($cert,[string]$inputData.pin,[string]$cert.Subject,'LOCAL_QUALIFICATION',[DateTime]::UtcNow))
 $meta=$contract.GetMethod('CertificateMetadata',$flags).Invoke($null,[object[]]@($cert))
 $description=[Collections.Generic.Dictionary[string,object]]::new()
 $description.Add('signature_policy',$contract.GetMethod('Policy',$flags).Invoke($null,@()))
 $description.Add('system_changes',$contract.GetMethod('SystemChanges',$flags).Invoke($null,@()))
 $description.Add('service_sid',$contract.GetMethod('ServiceSid',$flags).Invoke($null,@()))
 $result=[Collections.Generic.Dictionary[string,object]]::new();$result.Add('metadata',$meta);$result.Add('description',$description)
 $json=$assembly.GetType('AgentNexus.CredentialBoundary.Json',$true)
 [Console]::WriteLine($json.GetMethod('Encode',$flags).Invoke($null,[object[]]@($result)))
} finally {$cert.Dispose()}
'''
    encoded = base64.b64encode(script.encode('utf-16-le')).decode('ascii')
    data = json.dumps({'verifier': base64.b64encode(verifier_bytes).decode('ascii'), 'certificate': base64.b64encode(der).decode('ascii'), 'pin': pin}).encode('utf-8')
    child = subprocess.run(['C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe','-NoProfile','-EncodedCommand',encoded], input=data,capture_output=True, timeout=90, creationflags=subprocess.CREATE_NO_WINDOW)
    if child.returncode:
        raise ValueError('READ_ONLY_VERIFIER_REFUSED:' + child.stderr.decode('utf-8', 'replace').strip())
    return json.loads(child.stdout)

def verify_toolkit(files):
    sums = OUT / 'SHA256SUMS'
    expected = {}
    for line in files.read(sums,4194304).decode('utf-8').splitlines():
        digest, rel = line.split('  ', 1)
        if rel in expected or Path(rel).is_absolute() or '..' in Path(rel).parts:
            raise ValueError('TOOLKIT_MANIFEST_PATH')
        expected[rel] = digest
    actual = {p.relative_to(OUT).as_posix() for p in files.tree(OUT) if p.name != 'SHA256SUMS'}
    if actual != set(expected):
        raise ValueError('TOOLKIT_HASH_OR_FILE_SET_MISMATCH')
    snapshots = {}; total=0
    for rel in expected:
        data=files.read(OUT/rel); total+=len(data)
        if total>805306368: raise ValueError('TOOLKIT_SNAPSHOT_SIZE_LIMIT')
        snapshots[rel]=data
    if any(hashlib.sha256(snapshots[rel]).hexdigest()!=digest for rel,digest in expected.items()):
        raise ValueError('TOOLKIT_HASH_OR_FILE_SET_MISMATCH')
    return snapshots

def prepare(certificate, pin, identity_path, destination):
    with PublicFiles() as files:
        return _prepare(files,certificate,pin,identity_path,destination)

def _prepare(files,certificate,pin,identity_path,destination):
    def put(path,value): files.write(path,(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
    digest = files.digest
    certificate, identity_path, destination = map(local, (certificate, identity_path, destination))
    if not re.fullmatch('[a-f0-9]{64}', pin or ''):
        raise ValueError('INDEPENDENT_DER_SHA256_PIN_REQUIRED')
    if destination == OUT or OUT in destination.parents:
        raise ValueError('NEW_OUTPUT_OUTSIDE_IMMUTABLE_TOOLKIT_REQUIRED')
    snapshots = verify_toolkit(files)
    public = inspect_public(snapshots['signer/AgentNexus.Qualification.Verifier.exe'],files.read(certificate,131072),pin)
    metadata,description = public['metadata'],public['description']
    target = json.loads(files.read(identity_path,16384))
    epoch = description['signature_policy']['policy_epoch']
    if epoch != 5 or not re.fullmatch('[a-f0-9]{64}', target['machine_id']) or not re.fullmatch(r'S-1-5-21-\d+-\d+-\d+-\d+', target['operator_sid']) or target['service_sid'] != description['service_sid'] or not re.fullmatch(r'[A-Za-z0-9_.-]{1,63}', target['host']):
        raise ValueError('TARGET_IDENTITY_REQUIRED')
    now = dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=2)
    before = dt.datetime.fromisoformat(metadata['not_before_utc'].replace('Z', '+00:00'))
    after = dt.datetime.fromisoformat(metadata['not_after_utc'].replace('Z', '+00:00'))
    now = max(now, before)
    end = min(now + dt.timedelta(days=3), after - dt.timedelta(seconds=1))
    if end <= now:
        raise ValueError('CERTIFICATE_WINDOW_INVALID')
    # All public input and policy validation above precedes exclusive native directory creation.
    files.create_root(destination)
    put(destination / 'preparation-INCOMPLETE.json', {'status': 'NOT_SIGNABLE_UNTIL_PREPARATION_COMPLETE'})
    # All copied bytes are from validated snapshots. Generated paths are omitted from this first copy.
    generated={'payload/launcher-plan.json','source/tools/agentnexus/install-q41-qualification.ps1'}
    for rel,data in snapshots.items():
        if rel.startswith(('source/','signer/','payload/')) and rel not in generated: files.write(destination/rel,data)
    deployment_id = str(uuid.uuid4())
    ref = 'APPROVED-Q42-QUAL-' + deployment_id
    hashes = {key: digest(destination / 'payload' / rel) for key, rel in HASHES.items()}
    launch = json.loads(snapshots['payload/launcher-plan.json'])
    launch.update(machine_id=target['machine_id'], operator_sid=target['operator_sid'], policy_epoch=epoch, expires_at_utc=utc(end), approval_ref=ref, helper_sha256=hashes['helper_sha256'], launcher_sha256=hashes['launcher_sha256'])
    put(destination / 'payload/launcher-plan.json', launch)
    manifest = json.loads(snapshots['reference/q41-approval/installation-manifest.json'])
    manifest['files'] = [{'path': p.relative_to(destination / 'payload').as_posix(), 'target': 'C:/Program Files/AgentNexus/' + p.relative_to(destination / 'payload').as_posix(), 'bytes': files.size(p), 'sha256': digest(p)} for p in sorted(files.outputs) if destination/'payload' in p.parents]
    if len(manifest['files']) != 194:
        raise ValueError('EXPECTED_194_PAYLOAD_FILES')
    put(destination / META['installation_manifest_sha256'], manifest)
    config = json.loads(snapshots['reference/q41-approval/candidate/service-config.json'])
    config.update(hashes)
    config.update(operator_sid=target['operator_sid'], signing_mode='LOCAL_QUALIFICATION', policy_epoch=epoch, qualification_test_approval_ref=ref, authority_certificate_sha256=pin, signer_id=metadata['subject'])
    config.update({k: False for k in DENIED})
    put(destination / META['service_config_sha256'], config)
    put(destination / META['signature_policy_sha256'], description['signature_policy'])
    put(destination / META['system_changes_sha256'], description['system_changes'])
    installer = destination / META['installer_sha256']
    text, count = re.subn(r"\$ExpectedVerifierSha256 = '[^']+'", "$ExpectedVerifierSha256 = '" + digest(destination / META['verifier_sha256']) + "'", snapshots[META['installer_sha256']].decode('utf-8'))
    if count != 1:
        raise ValueError('INSTALLER_VERIFIER_BINDING')
    files.write(installer,text.encode('utf-8'))
    plan = json.loads(snapshots['reference/q41-approval/qualification-plan.json'])
    plan.update(hashes)
    plan.update({k: digest(destination / rel) for k, rel in META.items()})
    plan.update(machine_id=target['machine_id'], operator_sid=target['operator_sid'], service_sid=target['service_sid'], target_host=target['host'], policy_epoch=epoch, deployment_id=deployment_id, issued_at_utc=utc(now), expires_at_utc=utc(end), qualification_test_approval_ref=ref, signer_id=metadata['subject'], signer_certificate_der_sha256=pin, user_confirmed=False, status='QUALIFICATION_ONLY', decision='NOT_RUN', payload_files=194, payload_bytes=sum(r['bytes'] for r in manifest['files']))
    plan.update({k: False for k in DENIED})
    for test in plan['tests']:
        test['observed_result'] = 'NOT_RUN'
    put(destination / 'approval/qualification-plan.json', plan)
    approval = json.loads(snapshots['reference/q41-approval/deployment-approval.json'])
    for key in approval.keys() & plan.keys() - {'schema', 'scope', 'confirmation_kind'}:
        approval[key] = plan[key]
    approval.update(deployment_approved=False, user_confirmed=False, start_service=False, approval_ref='APPROVED-Q42-DEPLOY-' + deployment_id, qualification_sha256=digest(destination / 'approval/qualification-plan.json'), qualification_signature_sha256=hashlib.sha256(b'').hexdigest())
    put(destination / 'approval/deployment-approval.json', approval)
    put(destination / 'approval/signer-certificate.json', metadata)
    put(destination / 'approval/certificate-pin.json', {'certificate_der_sha256': pin, 'status': 'USER_INPUT_REQUIRES_INDEPENDENT_SIGNER_CONFIRMATION', 'trusted_automatically': False})
    rollback = json.loads(snapshots['reference/q41-approval/rollback-plan.json'])
    rollback.update(deployment_id=deployment_id, installation_manifest_sha256=plan['installation_manifest_sha256'])
    put(destination / 'approval/rollback-plan.json', rollback)
    files.write(destination / 'README.md','# Q4.2 新的未签资格候选\n\nUNSIGNED / NO-GO。公开证书和 Pin 只绑定此候选，不构成签名或安装批准。\n两阶段须用户在独立环境操作；start_service=false，真实权限全部 false。\n阶段二将依据已签计划生成新的精确部署批准，不能签署此处仍为 false 的草案。\n'.encode('utf-8'))
    # Read-only target identity inspection on the preparing host is deliberately not substituted for the target.
    # Signer will revalidate this complete snapshot; target Verifier re-reads actual machine and operator.
    source = [{'path': p.relative_to(destination / 'source').as_posix(), 'bytes': files.size(p), 'sha256': digest(p)} for p in sorted(files.outputs) if destination/'source' in p.parents]
    put(destination / 'source-manifest.json', {'files': source})
    put(destination / 'approval/preparation-result.json', {'status': 'UNSIGNED_NO_GO', 'policy_epoch': epoch, 'deployment_id': deployment_id, 'certificate_der_sha256': pin, 'installation_manifest_sha256': plan['installation_manifest_sha256'], 'qualification_plan_sha256': digest(destination / 'approval/qualification-plan.json'), 'deployment_approval_draft_sha256': digest(destination / 'approval/deployment-approval.json'), 'payload_files': 194, 'payload_bytes': plan['payload_bytes'], 'user_confirmed': False, 'installation_approved': False, 'private_key_accessed': False, 'system_changes': False})
    # This is our own known incomplete marker, removed only after successful public-data preparation.
    complete = {'status': 'PREPARATION_COMPLETE_UNSIGNED_NO_INSTALLATION_AUTHORITY', 'deployment_id': deployment_id, 'policy_epoch': epoch, 'installation_manifest_sha256': plan['installation_manifest_sha256']}
    complete_bytes = (json.dumps(complete, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    files.check()
    rows = [(p.relative_to(destination).as_posix(), digest(p)) for p in sorted(files.outputs) if p.name not in {'SHA256SUMS', 'preparation-INCOMPLETE.json'}]
    rows.append(('preparation-complete.json', hashlib.sha256(complete_bytes).hexdigest()))
    files.write(destination / 'SHA256SUMS',''.join(f'{hash_value}  {rel}\n' for rel, hash_value in sorted(rows)).encode('utf-8'))
    files.remove_own_marker(destination / 'preparation-INCOMPLETE.json')
    files.write(destination / 'preparation-complete.json',complete_bytes)
    files.check()
    return {'status': 'UNSIGNED_NO_GO', 'destination': str(destination), 'deployment_id': deployment_id, 'epoch': epoch, 'files': 194, 'actual_signature': 'NOT_RUN', 'installation_approved': False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public-certificate', required=True)
    parser.add_argument('--independent-pin', required=True)
    parser.add_argument('--target-identity', required=True)
    parser.add_argument('--new-output', required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.public_certificate, args.independent_pin, args.target_identity, args.new_output)))

if __name__ == '__main__':
    main()
