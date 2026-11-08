"""Read-only publication checks; never opens a runtime credential store."""
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
SCOPE = ('deliverables/AgentNexus-M1.8.3/', '.workflow-kit/tasks/AgentNexus-M1.8.3/')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def git(*args):
    return subprocess.run(['git', '-C', str(ROOT), *args], check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def files(folder):
    for base, dirs, names in os.walk(folder):
        dirs[:] = [d for d in dirs if d not in EXCLUDED]
        yield from (Path(base) / n for n in names)


def verify():
    publication = load(ROOT / '.workflow-kit/tasks/AgentNexus-M1.8.3/publication.json')
    candidates = [p for prefix in SCOPE for p in files(ROOT / prefix)]
    delivered = {p.relative_to(DELIVERY).as_posix() for p in files(DELIVERY)}
    checksums = (DELIVERY / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines()
    names = []
    for line in checksums:
        expected, name = line.split('  ', 1)
        assert name in delivered and name != 'SHA256SUMS.txt', name
        assert sha((DELIVERY / name).read_bytes()) == expected, 'SHA mismatch: ' + name
        names.append(name)
    assert len(names) == len(set(names)) and set(names) == delivered - {'SHA256SUMS.txt'}

    preserved = publication['preserved_original_delivery']
    for key in ('manifest', 'readme'):
        assert sha((DELIVERY / preserved[key]).read_bytes()) == preserved[key + '_sha256']
    original = (DELIVERY / preserved['manifest']).read_text(encoding='utf-8').splitlines()
    for line in original:
        expected, name = line.split('  ', 1)
        path = DELIVERY / (preserved['readme'] if name == 'README.md' else name)
        assert sha(path.read_bytes()) == expected, 'Original delivery changed: ' + name

    manifest = load(DELIVERY / 'source.manifest.json')
    entries = manifest['files']
    assert {e['path'] for e in entries} == {p.relative_to(SOURCE).as_posix() for p in files(SOURCE)}
    for entry in entries:
        data = (SOURCE / entry['path']).read_bytes()
        assert len(data) == entry['bytes'] and sha(data) == entry['sha256'], entry['path']
    aggregate = sha(''.join(e['path'] + '\0' + e['sha256'] + '\n'
                            for e in sorted(entries, key=lambda e: e['path'])).encode('utf-8'))
    assert aggregate == manifest['aggregate_sha256'] == publication['source_set_sha256']
    archive_path = ROOT / publication['explicit_archive']['path']
    assert sha(archive_path.read_bytes()) == publication['explicit_archive']['sha256']
    with zipfile.ZipFile(archive_path) as archive:
        assert len(archive.namelist()) == len(entries)
        for entry in entries:
            name = 'AgentNexus-M1.8.3/source/' + entry['path']
            assert sha(archive.read(name)) == entry['sha256'], name

    freeze = load(DELIVERY / 'evidence/baseline/freeze.json')
    for entry in freeze['entries']:
        assert sha((ROOT / entry['path']).read_bytes()) == entry['sha256'], entry['path']
    baseline = load(ROOT / '.workflow-kit/governance/baseline.json')
    policy_bytes = (ROOT / '.workflow-kit/governance/policy.json').read_bytes()
    assert sha(policy_bytes) == baseline['policy_sha256'] == freeze['policy_sha256']
    for name, expected in baseline['protected_rules'].items():
        assert sha((ROOT / name).read_bytes()) == expected, 'Protected rule changed: ' + name
    assert sha((ROOT / 'AGENTS.md').read_bytes()) == freeze['agents_sha256']
    assert load(DELIVERY / 'evidence/governance-root-extended.json')['exit_code'] == 0
    spec = importlib.util.spec_from_file_location('publication_govern', ROOT / 'ai-workflow-kit-v4/tools/govern.py')
    govern = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(govern)
    policy = json.loads(policy_bytes)
    patterns = [rb'\bsk-[A-Za-z0-9]{32,}\b', rb'sk-proj-[A-Za-z0-9_-]{40,}',
                rb'sk-ant-[A-Za-z0-9_-]{40,}', rb'ghp_[A-Za-z0-9]{36}',
                rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']
    findings = []
    for path in candidates:
        relative = path.relative_to(ROOT).as_posix()
        assert govern.classify(relative, policy, baseline) is not None, relative
        govern.path_at(ROOT, relative)
        assert not path.is_symlink(), relative
        assert path.suffix.lower() not in {'.sqlite', '.db', '.wal', '.pem', '.key', '.pfx', '.p12'}, relative
        if path.suffix.lower() not in {'.zip', '.exe', '.png', '.jpg', '.jpeg'}:
            if any(re.search(pattern, path.read_bytes()) for pattern in patterns):
                findings.append(relative)
    assert not findings, 'Review credential-pattern matches in: ' + ', '.join(findings)

    staged = None
    if '--staged' in sys.argv:
        changed = [p.decode('utf-8') for p in git('diff', '--cached', '--name-only', '-z').split(b'\0') if p]
        assert changed and set(changed) == {p.relative_to(ROOT).as_posix() for p in candidates}, 'Unexpected staged scope'
        indexed = {}
        for item in git('ls-files', '--stage', '-z').split(b'\0'):
            if not item:
                continue
            metadata, path = item.split(b'\t', 1)
            mode, oid, stage = metadata.split()
            indexed[path.decode('utf-8')] = (mode, oid, stage)
        ids = []
        for name in changed:
            mode, oid, stage = indexed[name]
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
            assert sha(data) == sha((ROOT / name).read_bytes()), 'Staged bytes differ: ' + name
        staged = len(changed)
    return {'status': 'PASS', 'delivery_checksums': len(checksums),
            'frozen_source_files': len(entries), 'source_set_sha256': aggregate,
            'archive_members_match': True, 'original_delivery_files_preserved': len(original),
            'historical_files_preserved': len(freeze['entries']), 'publication_files': len(candidates),
            'governance_classification': 'PASS_ORIGINAL_CLASSIFIER_AND_PATH_CHECKS',
            'protected_rules_unchanged': True, 'credential_pattern_findings': 0,
            'staged_blobs_match_working_bytes': staged, 'scope': list(SCOPE), 'live': 'BLOCKED'}


if __name__ == '__main__':
    print(json.dumps(verify(), ensure_ascii=False, indent=2))
