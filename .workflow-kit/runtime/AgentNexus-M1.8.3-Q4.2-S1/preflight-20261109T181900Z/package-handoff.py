"""Package the unchanged Q4.2 toolkit and public S1 evidence; never create a candidate."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile

ROOT = Path('I:/AI_AgentNexus')
RUN = Path(__file__).resolve().parent
BASE = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4.2'
OUT = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4.2-S1'
TASK = ROOT / '.workflow-kit/tasks/AgentNexus-M1.8.3-Q4.2-S1'

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def write(path, value):
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')

preflight = json.loads((RUN / 'preflight-result.json').read_bytes())
assert preflight['errors'] == [] and preflight['historical_checker']['errors'] == ['head-changed']
assert preflight['payload_matches'] and preflight['source_and_zip_match']
source_request = Path('C:/Users/28642/.codex/attachments/3d31dcea-3870-43ec-b004-13ff53f95fec/已粘贴的文本.txt')
with (TASK / 'original-request.txt').open('xb') as target:
    target.write(source_request.read_bytes())
write(OUT / 'environment-assessment.json', dict(
    schema='agentnexus.q42-s1.environment-assessment.v1',
    status='WAITING_USER_PUBLIC_CERTIFICATE_UNSIGNED_NO_GO',
    user_answers=[
        '另一台由我控制、Codex 无法访问的 Windows 设备（推荐）',
        '拟新建 TPM_CNG 证书，设备须支持且不能回退软件'],
    chosen_method='TPM_CNG', software_fallback_allowed=False,
    separate_device_readiness='PENDING_USER_OBSERVATION_NOT_AGENT_VERIFIED',
    current_host_tpm='INCONCLUSIVE_NO_NONEMPTY_PRESENT_READY_VALUES',
    raw_tpm_label_is_not_hardware_evidence=True,
    actual_certificate_creation='NOT_RUN', actual_private_key_use='NOT_RUN', actual_pin=None,
    candidate_freeze='NOT_RUN', qualification_plan_signing='NOT_RUN', deployment_approval_signing='NOT_RUN',
    target_signed_verification='NOT_RUN', final_precise_deployment_request='NOT_RUN',
    os_counts=json.loads((BASE / 'tests/windows-attack-results.json').read_bytes())['counts'],
    independent_pin_or_target_confirmation_received=False,
    system_changes=False, installation_approved=False, start_service=False,
    governance_new_attempt='Original govern.py new was attempted; it was interrupted during prolonged full inventory before creating the requested file. New files were then created in approved task/runtime/deliverable classes; full unchanged governance check is required below.',
    client_date='2026-11-10', timezone='Asia/Shanghai'))
identity = RUN / 'target-identity.observed.json'
with (OUT / identity.name).open('xb') as target:
    target.write(identity.read_bytes())

closure = json.loads((RUN / 'AgentNexus-M1.8.3-Q4.2.closure.json').read_bytes())
expected = {r['path']: r['expected_sha256'] for r in closure['files']}
expected['SHA256SUMS'] = closure['sha256sums_sha256']
members = []
archive_path = OUT / 'AgentNexus-Q42-S1-offline-handoff.zip'

def add_bytes(archive, name, data, expected_digest=None):
    digest = hashlib.sha256(data).hexdigest()
    if expected_digest is not None and digest != expected_digest:
        raise ValueError('SOURCE_CHANGED:' + name)
    archive.writestr(name, data)
    members.append(dict(path=name, bytes=len(data), sha256=digest))

with zipfile.ZipFile(archive_path, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as archive:
    for rel, digest in sorted(expected.items()):
        path = BASE / rel
        name = 'deliverables/AgentNexus-M1.8.3-Q4.2/' + rel
        actual_hash = hashlib.sha256()
        size = 0
        with path.open('rb') as source, archive.open(name, 'w', force_zip64=True) as destination:
            while block := source.read(4194304):
                actual_hash.update(block)
                size += len(block)
                destination.write(block)
        if actual_hash.hexdigest() != digest:
            raise ValueError('FROZEN_SOURCE_CHANGED:' + rel)
        members.append(dict(path=name, bytes=size, sha256=digest))
    guide = (TASK / 'README.md').read_bytes().replace(b'../../runtime/', b'.workflow-kit/runtime/')
    add_bytes(archive, 'START-HERE.md', guide)
    for name in ['public-inputs.pending.json', 'environment-assessment.json', 'target-identity.observed.json']:
        add_bytes(archive, name, (OUT / name).read_bytes())
    raw_paths = sorted(set(RUN.glob('*.json')) | set(RUN.glob('*.log')) | {RUN / 'run-preflight.py'})
    for path in raw_paths:
        add_bytes(archive, path.relative_to(ROOT).as_posix(), path.read_bytes())

expected_members = {r['path']: r for r in members}
with zipfile.ZipFile(archive_path) as archive:
    assert len(archive.infolist()) == len(expected_members)
    assert set(archive.namelist()) == set(expected_members)
    for info in archive.infolist():
        with archive.open(info) as stream:
            actual = hashlib.file_digest(stream, 'sha256').hexdigest()
        assert actual == expected_members[info.filename]['sha256']
        assert info.file_size == expected_members[info.filename]['bytes']
write(RUN / 'archive-members.json', dict(status='PASS', files=members))
result = dict(schema='agentnexus.q42-s1.offline-handoff.v1', status='TOOL_HANDOFF_VERIFIED_NOT_A_CANDIDATE',
              archive=str(archive_path), archive_bytes=archive_path.stat().st_size, archive_sha256=sha(archive_path),
              archive_members=len(members), original_q42_files_including_sha256sums=len(expected),
              original_q42_sha256sums_sha256=closure['sha256sums_sha256'],
              every_archive_member_reopened_and_sha256_verified=True,
              original_q42_files_unchanged=True, actual_candidate='NOT_RUN', actual_certificate=None,
              qualification_plan_signing='NOT_RUN', deployment_approval_signing='NOT_RUN',
              target_signed_verification='NOT_RUN', installation_approved=False, system_changes=False,
              created_at_utc=dt.datetime.now(dt.timezone.utc).isoformat())
write(OUT / 'offline-handoff.json', result)
print(json.dumps(result, ensure_ascii=False), flush=True)
