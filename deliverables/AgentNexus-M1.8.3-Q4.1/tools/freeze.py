"""Freeze unsigned bytes only. Public DER + explicitly supplied pin may bind a NEW candidate.
Never generates a key/certificate, adds trust, signs, deploys, starts a service or resets a ledger.
"""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import uuid
from baseline import ROOT, OUT, Q3, sha, write

DENIED = ['real_import', 'live_provider', 'production_release', 'real_ledger_migration', 'real_import_enabled', 'live_enabled']

def utc(t):
    return t.astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') + f'{t.microsecond:06d}0Z'

def freeze(base, certificate=None, pin=None, refreeze=False):
    if any((base / 'approval' / name).exists() for name in ['qualification-plan.p7s', 'deployment-approval.p7s']):
        raise ValueError('SIGNED_CANDIDATE_IMMUTABLE_CREATE_NEW_CANDIDATE')
    if (base / 'approval/installation-manifest.json').exists() and not refreeze:
        raise ValueError('ALREADY_FROZEN_USE_NEW_CANDIDATE')
    if refreeze and (base / 'approval/installation-manifest.json').exists():
        archive = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8.3-Q4.1' / ('previous-unsigned-freeze-' + uuid.uuid4().hex)
        shutil.copytree(base / 'approval', archive)
    verifier = base / 'signer/AgentNexus.Qualification.Verifier.exe'
    describe = json.loads(subprocess.check_output([str(verifier), '--describe'], creationflags=subprocess.CREATE_NO_WINDOW))
    metadata = None
    if certificate:
        if not pin or not re.fullmatch('[a-f0-9]{64}', pin):
            raise ValueError('INDEPENDENT_PUBLIC_DER_PIN_REQUIRED')
        metadata = json.loads(subprocess.check_output([str(verifier), '--public-certificate', str(certificate.resolve()), pin], creationflags=subprocess.CREATE_NO_WINDOW))
    elif pin:
        raise ValueError('PUBLIC_CERTIFICATE_REQUIRED_WITH_PIN')
    # Preserve untouched Q3 third-party/application bytes; replace only rebuilt native binaries/launch plan.
    old_manifest = json.loads((Q3 / 'approval/installation-manifest.json').read_bytes())
    built = {'AgentNexusCredential.exe', 'pipe-client.exe', 'trusted-credential-helper.exe', 'credential-launcher.exe'}
    for row in old_manifest['files']:
        dest = base / 'payload' / row['path']
        if row['path'] in built or row['path'] == 'launcher-plan.json':
            continue
        if dest.exists():
            if sha(dest) != row['sha256']:
                raise ValueError('UNEXPECTED_CANDIDATE_APP_OR_DEPENDENCY_CHANGE:' + row['path'])
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(Q3 / 'payload' / row['path'], dest)
    host = json.loads((ROOT / 'deliverables/AgentNexus-M1.8.3-Q4/approval/deployment-request.json').read_bytes())
    now = dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=2)
    end = now + dt.timedelta(days=3)
    if metadata:
        notbefore = dt.datetime.fromisoformat(metadata['not_before_utc'].replace('Z', '+00:00'))
        notafter = dt.datetime.fromisoformat(metadata['not_after_utc'].replace('Z', '+00:00'))
        if now < notbefore:
            now = notbefore
        end = min(now + dt.timedelta(days=3), notafter)
        if end <= now:
            raise ValueError('CERTIFICATE_WINDOW_INVALID')
    deployment_id = str(uuid.uuid4())
    hashes = {key: sha(base / 'payload' / rel) for key, rel in {
        'service_sha256': 'AgentNexusCredential.exe', 'client_sha256': 'pipe-client.exe', 'helper_sha256': 'trusted-credential-helper.exe',
        'launcher_sha256': 'credential-launcher.exe', 'node_sha256': 'node.exe', 'engine_sha256': 'app/dist/src/agentnexus/credential-service/engine.js', 'application_manifest_sha256': 'app-manifest.json'}.items()}
    launch = json.loads((Q3 / 'payload/launcher-plan.json').read_bytes())
    launch.update(machine_id=host['machine_id'], operator_sid=host['operator_sid'], policy_epoch=4, expires_at_utc=utc(end),
                  approval_ref='APPROVED-Q41-QUAL-' + deployment_id, helper_sha256=hashes['helper_sha256'], launcher_sha256=hashes['launcher_sha256'])
    write(base / 'payload/launcher-plan.json', launch)
    manifest = dict(old_manifest)
    manifest['files'] = [{'path': p.relative_to(base / 'payload').as_posix(), 'target': 'C:/Program Files/AgentNexus/' + p.relative_to(base / 'payload').as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted((base / 'payload').rglob('*')) if p.is_file()]
    write(base / 'approval/installation-manifest.json', manifest)
    config = json.loads((Q3 / 'approval/candidate/service-config.json').read_bytes())
    config.update(hashes)
    config.update(signing_mode='LOCAL_QUALIFICATION', policy_epoch=4, qualification_test_approval_ref='APPROVED-Q41-QUAL-' + deployment_id,
                  authority_certificate_sha256=pin if metadata else 'BLOCKED_USER_PUBLIC_CERTIFICATE_REQUIRED', signer_id=metadata['subject'] if metadata else 'UNSELECTED USER SIGNER')
    for k in DENIED:
        config[k] = False
    write(base / 'approval/candidate/service-config.json', config)
    write(base / 'approval/signature-policy.json', describe['signature_policy'])
    write(base / 'approval/system-changes.json', describe['system_changes'])
    installer = base / 'source/tools/agentnexus/install-q41-qualification.ps1'
    text = installer.read_text('utf-8')
    text, count = re.subn(r"\$ExpectedVerifierSha256 = '[^']+'", "$ExpectedVerifierSha256 = '" + sha(verifier) + "'", text)
    assert count == 1
    installer.write_text(text, encoding='utf-8', newline='\n')
    plan = json.loads((Q3 / 'approval/candidate/qualification.json').read_bytes())
    plan.update(hashes)
    plan.update(status='QUALIFICATION_ONLY', decision='NOT_RUN', policy_epoch=4, operator_sid=host['operator_sid'], target_host=host['host'],
                issued_at_utc=utc(now), expires_at_utc=utc(end), qualification_test_approval_ref=config['qualification_test_approval_ref'], signing_mode='LOCAL_QUALIFICATION',
                payload_files=len(manifest['files']), payload_bytes=sum(r['bytes'] for r in manifest['files']), deployment_id=deployment_id,
                signer_id=config['signer_id'], signer_certificate_der_sha256=config['authority_certificate_sha256'], user_confirmed=False, confirmation_kind='QUALIFICATION_PLAN')
    for key, rel in {'installation_manifest_sha256': 'approval/installation-manifest.json', 'service_config_sha256': 'approval/candidate/service-config.json', 'signature_policy_sha256': 'approval/signature-policy.json', 'system_changes_sha256': 'approval/system-changes.json', 'installer_sha256': 'source/tools/agentnexus/install-q41-qualification.ps1', 'verifier_sha256': 'signer/AgentNexus.Qualification.Verifier.exe', 'signer_tool_sha256': 'signer/AgentNexus.Qualification.Signer.exe'}.items():
        plan[key] = sha(base / rel)
    for k in DENIED:
        plan[k] = False
    for test in plan['tests']:
        test['observed_result'] = 'NOT_RUN'
    write(base / 'approval/qualification-plan.json', plan)
    binding_fields = ['signing_mode', 'installation_manifest_sha256', 'service_config_sha256', 'signature_policy_sha256', 'system_changes_sha256', 'installer_sha256', 'verifier_sha256', 'signer_tool_sha256', 'payload_files', 'payload_bytes', 'machine_id', 'operator_sid', 'service_sid', 'target_host', 'policy_epoch', 'deployment_id', 'issued_at_utc', 'expires_at_utc', 'signer_id', 'signer_certificate_der_sha256', 'real_import', 'live_provider', 'production_release', 'real_ledger_migration', 'real_import_enabled', 'live_enabled', 'real_import_approval_ref', 'live_approval_ref']
    approval = {k: plan[k] for k in binding_fields}
    approval.update(schema='agentnexus.q41.deployment-approval.v1', scope='QUALIFICATION_ONLY', deployment_approved=False, start_service=False,
                    approval_ref='APPROVED-Q41-DEPLOY-' + deployment_id, qualification_sha256=sha(base / 'approval/qualification-plan.json'),
                    qualification_signature_sha256=hashlib.sha256(b'').hexdigest(), user_confirmed=False, confirmation_kind='DEPLOYMENT_APPROVAL')
    write(base / 'approval/deployment-approval.json', approval)
    write(base / 'approval/signer-certificate.json', metadata or {'status': 'BLOCKED', 'certificate_der_sha256': None, 'subject': None, 'private_key_accessed': False})
    write(base / 'approval/certificate-pin.json', {'signing_mode': 'LOCAL_QUALIFICATION', 'certificate_der_sha256': pin if metadata else None,
          'status': 'USER_INPUT_REQUIRES_INDEPENDENT_SIGNER_CONFIRMATION' if metadata else 'BLOCKED_NO_USER_CERTIFICATE', 'trusted_automatically': False, 'windows_store_modified': False})
    write(base / 'approval/installation-manifest-status.json', {'status': 'UNSIGNED', 'deployment_decision': 'NO-GO', 'manifest_sha256': plan['installation_manifest_sha256'],
          'files': plan['payload_files'], 'bytes': plan['payload_bytes'], 'candidate_bytes_frozen': True, 'final_signed_installation_manifest': False,
          'signature_ready': bool(metadata), 'cms_present': False, 'actual_user_certificate_pin': pin if metadata else None,
          'reason': 'User must independently select certificate/pin, sign plan, separately sign deployment approval, then separately approve actual installation.'})
    write(base / 'approval/rollback-plan.json', {'schema': 'agentnexus.q41.rollback-plan.v1', 'deployment_id': deployment_id, 'installation_manifest_sha256': plan['installation_manifest_sha256'],
          'system_changes_executed': False, 'install_stopped_only': True, 'failure': 'Preserve the consumed receipt, partial installation, Vault, Ledger incl. consistent WAL/SHM, audit and all approval material; do not retry automatically.',
          'stop_or_remove_approval': 'SEPARATE_PRECISE_USER_APPROVAL_REQUIRED', 'forbidden': ['delete data', 'remove receipt', 'reset ledger/budget', 'replay SENT/UNKNOWN', 'fallback to same-SID vault', 'automatic uninstall']})
    print(json.dumps({'status': 'UNSIGNED_NO_GO', 'files': plan['payload_files'], 'bytes': plan['payload_bytes'], 'manifest_sha256': plan['installation_manifest_sha256'], 'actual_pin': pin if metadata else None, 'system_changes': False}))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refreeze-unsigned', action='store_true')
    parser.add_argument('--public-certificate', type=Path)
    parser.add_argument('--independent-pin')
    parser.add_argument('--new-output', type=Path)
    args = parser.parse_args()
    base = OUT
    if args.public_certificate:
        if not args.new_output or not args.new_output.is_absolute() or args.new_output.exists():
            raise ValueError('PUBLIC_CERT_BINDING_REQUIRES_NEW_ABSOLUTE_OUTPUT')
        base = args.new_output
        # Copy public candidate material only. Never traverse or export a private-key store.
        for name in ['source', 'signer', 'payload']:
            shutil.copytree(OUT / name, base / name)
    elif args.new_output:
        raise ValueError('NEW_OUTPUT_REQUIRES_PUBLIC_CERTIFICATE_AND_INDEPENDENT_PIN')
    freeze(base, args.public_certificate, args.independent_pin, args.refreeze_unsigned)

if __name__ == '__main__':
    main()
