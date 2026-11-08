"""Read-only local publication verification; never opens a runtime credential store."""
from pathlib import Path
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import zipfile

DELIVERY = Path(__file__).resolve().parents[1]
ROOT = DELIVERY.parent.parent
SOURCE = DELIVERY / 'source'
EXCLUDED = {'node_modules', 'dist', '.git', 'test-results', '__pycache__'}
SCOPE = ('deliverables/AgentNexus-Model-Provider-UI/',
         'deliverables/AgentNexus-M1.8.2/evidence/reliability/',
         '.workflow-kit/tasks/AgentNexus-Model-Provider-UI/')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.run(['git', '-C', str(ROOT), *args], check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def files(folder):
    for base, dirs, names in os.walk(folder):
        dirs[:] = [d for d in dirs if d not in EXCLUDED]
        yield from (Path(base) / n for n in names)


def verify():
    checksums = (DELIVERY / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines()
    for line in checksums:
        expected, name = line.split('  ', 1)
        assert sha((DELIVERY / name).read_bytes()) == expected, 'SHA mismatch: ' + name

    manifest = json.loads((DELIVERY / 'raw/static-2026-11-08T14-02-23-332Z/source-manifest.json').read_text())
    for entry in manifest['files']:
        assert sha((SOURCE / entry['path']).read_bytes()) == entry['sha256'], entry['path']
    with zipfile.ZipFile(DELIVERY / 'AgentNexus-Model-Provider-UI-source.zip') as archive:
        assert len(archive.namelist()) == len(manifest['files'])
        for entry in manifest['files']:
            assert sha(archive.read('source/' + entry['path'])) == entry['sha256'], entry['path']

    baseline = json.loads((ROOT / '.workflow-kit/governance/baseline.json').read_text())
    policy_bytes = (ROOT / '.workflow-kit/governance/policy.json').read_bytes()
    assert sha(policy_bytes) == baseline['policy_sha256'], 'Governance policy changed'
    for name, expected in baseline['protected_rules'].items():
        assert sha((ROOT / name).read_bytes()) == expected, 'Protected rule changed: ' + name
    spec = importlib.util.spec_from_file_location('publication_govern', ROOT / 'ai-workflow-kit-v4/tools/govern.py')
    govern = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(govern)
    policy = json.loads(policy_bytes)
    candidates = [p for prefix in SCOPE for p in files(ROOT / prefix)]
    findings = []
    patterns = [rb'sk-proj-[A-Za-z0-9_-]{40,}', rb'sk-ant-[A-Za-z0-9_-]{40,}',
                rb'ghp_[A-Za-z0-9]{36}', rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']
    for path in candidates:
        relative = path.relative_to(ROOT).as_posix()
        assert govern.classify(relative, policy, baseline) is not None, relative
        govern.path_at(ROOT, relative)
        assert not path.is_symlink(), relative
        assert path.suffix.lower() not in {'.sqlite', '.db', '.wal', '.pem', '.key', '.pfx', '.p12'}, relative
        if path.suffix.lower() not in {'.zip', '.png', '.jpg', '.jpeg'}:
            data = path.read_bytes()
            if any(re.search(pattern, data) for pattern in patterns):
                findings.append(relative)
    assert not findings, 'Review credential-pattern matches in: ' + ', '.join(findings)

    staged = None
    if '--staged' in sys.argv:
        changed = [p.decode('utf-8') for p in git('diff', '--cached', '--name-only', '-z').split(b'\0') if p]
        assert changed and all(p.startswith(SCOPE) for p in changed), 'Unexpected staged scope'
        entries = {}
        for entry in git('ls-files', '--stage', '-z').split(b'\0'):
            if not entry:
                continue
            metadata, path = entry.split(b'\t', 1)
            mode, oid, stage = metadata.split()
            entries[path.decode('utf-8')] = (mode, oid, stage)
        assert {p.relative_to(ROOT).as_posix() for p in candidates} <= entries.keys(), 'Publication files missing from index'
        ids = []
        for name in changed:
            mode, oid, stage = entries[name]
            assert mode in (b'100644', b'100755') and stage == b'0', name
            ids.append(oid)
        result = subprocess.run(['git', '-C', str(ROOT), 'cat-file', '--batch'],
                                input=b'\n'.join(ids) + b'\n', check=True, stdout=subprocess.PIPE)
        offset = 0
        for name in changed:
            end = result.stdout.index(b'\n', offset)
            _, kind, size = result.stdout[offset:end].split()
            assert kind == b'blob', name
            size = int(size)
            data = result.stdout[end + 1:end + 1 + size]
            offset = end + size + 2
            assert sha(data) == sha((ROOT / name).read_bytes()), 'Staged bytes changed: ' + name
        staged = len(changed)
    return {'status': 'PASS', 'delivery_checksums': len(checksums),
            'frozen_source_files': len(manifest['files']),
            'source_set_sha256': manifest['source_set_sha256'],
            'archive_members_match': True, 'publication_files': len(candidates),
            'governance_classification': 'PASS_ORIGINAL_CLASSIFIER_AND_PATH_CHECKS',
            'protected_rules_unchanged': True, 'credential_pattern_findings': 0,
            'staged_blobs_match_working_bytes': staged,
            'scope': list(SCOPE), 'live': 'BLOCKED'}


if __name__ == '__main__':
    print(json.dumps(verify(), ensure_ascii=False, indent=2))
