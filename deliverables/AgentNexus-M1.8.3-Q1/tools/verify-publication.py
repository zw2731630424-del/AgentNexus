"""Read-only Q1 publication checks, including exact staged Git blob bytes."""
from __future__ import annotations
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
sys.dont_write_bytecode = True

DELIVERY = Path(__file__).resolve().parents[1]
ROOT = DELIVERY.parent.parent
SCOPE = ('deliverables/AgentNexus-M1.8.3-Q1/', '.workflow-kit/tasks/AgentNexus-M1.8.3-Q1/')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def git(*args):
    result = subprocess.run(['git', '--no-optional-locks', '-c', 'core.fsmonitor=false', *args], cwd=ROOT, capture_output=True, check=True)
    return result.stdout

def files(folder):
    for directory, dirs, names in os.walk(folder):
        dirs[:] = sorted(x for x in dirs if x not in {'node_modules', '__pycache__', '.git'})
        for name in sorted(names):
            yield Path(directory) / name

def verify():
    publication = load(ROOT / '.workflow-kit/tasks/AgentNexus-M1.8.3-Q1/publication.json')
    candidates = [p for prefix in SCOPE for p in files(ROOT / prefix)]
    relative = {p.relative_to(ROOT).as_posix(): p for p in candidates}
    delivered = {p.relative_to(DELIVERY).as_posix(): p for p in files(DELIVERY)}
    listed = {}
    for line in (DELIVERY / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        expected, name = line.split('  ', 1)
        assert name not in listed and name in delivered and name != 'SHA256SUMS.txt', name
        assert sha(delivered[name].read_bytes()) == expected, 'Checksum mismatch: ' + name
        listed[name] = expected
    assert set(listed) == set(delivered) - {'SHA256SUMS.txt'}, 'Incomplete Q1 manifest'
    preserved = publication['preserved_prepublication_delivery']
    for key in ('readme', 'manifest'):
        assert sha((DELIVERY / preserved[key]).read_bytes()) == preserved[key + '_sha256']
    original_names = []
    for line in (DELIVERY / preserved['manifest']).read_text(encoding='utf-8').splitlines():
        expected, name = line.split('  ', 1)
        p = DELIVERY / (preserved['readme'] if name == 'README.md' else name)
        assert sha(p.read_bytes()) == expected, 'Prepublication evidence changed: ' + name
        original_names.append(name)
    assert len(original_names) == 84, 'Unexpected prepublication manifest'
    history = load(DELIVERY / 'evidence/historical-preservation.before.json')['entries']
    for entry in history:
        assert sha((ROOT / entry['path']).read_bytes()) == entry['sha256'], 'Historical delivery changed: ' + entry['path']
    acceptance = load(DELIVERY / 'acceptance.json')
    plan = load(DELIVERY / 'deployment-plan.json')
    assert plan['ui_decision']['selected_option'] == 1 and acceptance['ui_decision'] == plan['ui_decision']
    assert not plan['deployment_approved'] and not plan['installation_authorized'] and not plan['start_authorized'] and not plan['executable_system_change_set']
    assert acceptance['production_vault'] == 'BLOCKED' and acceptance['q1_os_tests_executed'] == 0
    assert not any(acceptance[k] for k in ['real_api_keys', 'real_provider_requests', 'real_tokens', 'real_cost_usd'])
    assert not publication['system_deployment_authorized'] and not publication['real_key_or_api_authorized']
    policy_path = ROOT / '.workflow-kit/governance/policy.json'
    policy = load(policy_path)
    baseline = load(ROOT / '.workflow-kit/governance/baseline.json')
    assert sha(policy_path.read_bytes()) == baseline['policy_sha256']
    for name, expected in baseline['protected_rules'].items():
        assert sha((ROOT / name).read_bytes()) == expected, name
    spec = importlib.util.spec_from_file_location('q1_publication_govern', ROOT / 'ai-workflow-kit-v4/tools/govern.py')
    govern = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(govern)
    patterns = [rb'\bsk-[A-Za-z0-9_-]{32,}\b', rb'\bsk-proj-[A-Za-z0-9_-]{40,}',
                rb'\bsk-ant-[A-Za-z0-9_-]{40,}', rb'\bghp_[A-Za-z0-9]{36}\b',
                rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']
    for name, path in relative.items():
        assert not path.is_symlink() and not getattr(path.lstat(), 'st_file_attributes', 0) & 0x400, name
        govern.path_at(ROOT, name)
        assert govern.classify(name, policy, baseline) in {'deliverable', 'task'}, name
        assert path.suffix.lower() not in {'.sqlite', '.db', '.wal', '.pem', '.key', '.pfx', '.p12'}, name
        assert not any(re.search(pattern, path.read_bytes()) for pattern in patterns), 'Credential pattern: ' + name
        if path.suffix == '.json': load(path)
    staged_count = None
    if '--staged' in sys.argv:
        changed = [x.decode('utf-8') for x in git('diff', '--cached', '--name-only', '-z').split(b'\0') if x]
        assert set(changed) == set(relative), 'Unexpected staged scope'
        stage_entries = {}
        for entry in git('ls-files', '--stage', '-z').split(b'\0'):
            if not entry: continue
            metadata, name = entry.split(b'\t', 1)
            mode, oid, stage = metadata.split()
            if name.decode('utf-8') in relative:
                assert mode in {b'100644', b'100755'} and stage == b'0', name
                stage_entries[name.decode('utf-8')] = oid
        assert set(stage_entries) == set(relative)
        result = subprocess.run(['git', '--no-optional-locks', 'cat-file', '--batch'], cwd=ROOT,
                                input=b'\n'.join(stage_entries[n] for n in changed) + b'\n', capture_output=True, check=True)
        offset = 0
        for name in changed:
            end = result.stdout.index(b'\n', offset)
            oid, kind, size = result.stdout[offset:end].split()
            assert kind == b'blob' and oid == stage_entries[name], name
            offset = end + 1
            blob = result.stdout[offset:offset + int(size)]
            assert blob == relative[name].read_bytes(), 'Staged bytes differ: ' + name
            offset += int(size) + 1
        assert offset == len(result.stdout)
        staged_count = len(changed)
    print(json.dumps({'status':'PASS', 'publication_files':len(candidates), 'q1_checksum_entries':len(listed),
                      'prepublication_files_preserved':len(original_names), 'historical_files_preserved':len(history),
                      'original_rules_unchanged':True, 'credential_patterns_found':0, 'staged_blobs_verified':staged_count,
                      'production_vault':'BLOCKED', 'system_deployment_authorized':False}, ensure_ascii=False))

if __name__ == '__main__': verify()
