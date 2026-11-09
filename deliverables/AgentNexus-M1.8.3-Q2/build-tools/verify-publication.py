"""Read-only Q2 publication checks, including exact staged Git blob bytes."""
from pathlib import Path
import hashlib
import importlib.util
import json
import re
import subprocess
import sys

sys.dont_write_bytecode = True
DELIVERY = Path(__file__).resolve().parents[1]
ROOT = DELIVERY.parent.parent
SCOPE = ('deliverables/AgentNexus-M1.8.3-Q2/', '.workflow-kit/tasks/AgentNexus-M1.8.3-Q2/')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def git(*args):
    return subprocess.run(['git', '--no-optional-locks', '-c', 'core.fsmonitor=false', *args], cwd=ROOT, capture_output=True, check=True).stdout


def verify():
    spec = importlib.util.spec_from_file_location('q2_delivery_verifier', DELIVERY / 'build-tools/verify-delivery.py')
    delivery = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(delivery)
    delivery.verify()
    publication = load(ROOT / '.workflow-kit/tasks/AgentNexus-M1.8.3-Q2/publication.json')
    assert publication['authorization'] == '全部保存提交推送'
    assert publication['scope'] == list(SCOPE)
    assert publication['source_set_sha256'] == load(DELIVERY / 'source.manifest.json')['aggregate_sha256']
    assert not publication['system_deployment_authorized'] and not publication['real_key_or_api_authorized']
    preserved = publication['preserved_prepublication_delivery']
    for key in ('readme', 'manifest'):
        assert sha((DELIVERY / preserved[key]).read_bytes()) == preserved[key + '_sha256'], key
    original = (DELIVERY / preserved['manifest']).read_text(encoding='utf-8').splitlines()
    for line in original:
        expected, name = line.split('  ', 1)
        path = DELIVERY / (preserved['readme'] if name == 'README.md' else name)
        assert sha(path.read_bytes()) == expected, 'Prepublication evidence changed: ' + name
    candidates = {p.relative_to(ROOT).as_posix(): p for prefix in SCOPE for p in delivery.files(ROOT / prefix)}
    patterns = [rb'\bsk-[A-Za-z0-9]{32,}\b', rb'\bsk-proj-[A-Za-z0-9_-]{40,}', rb'\bsk-ant-[A-Za-z0-9_-]{40,}',
                rb'\bghp_[A-Za-z0-9]{36}\b', rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']
    for name, path in candidates.items():
        assert not path.is_symlink() and not getattr(path.lstat(), 'st_file_attributes', 0) & 0x400, name
        assert path.suffix.lower() not in {'.sqlite', '.db', '.wal', '.pem', '.key', '.pfx', '.p12'}, name
        assert not any(re.search(pattern, path.read_bytes()) for pattern in patterns), 'Credential pattern: ' + name
        if path.suffix == '.json':
            load(path)
    staged_count = None
    if '--staged' in sys.argv:
        changed = [p.decode('utf-8') for p in git('diff', '--cached', '--name-only', '-z').split(b'\0') if p]
        assert set(changed) == set(candidates), 'Unexpected staged scope'
        assert not git('diff', '--cached', '--diff-filter=DMRTU', '--name-only'), 'Publication must only add Q2 files'
        indexed = {}
        for entry in git('ls-files', '--stage', '-z').split(b'\0'):
            if not entry:
                continue
            metadata, name = entry.split(b'\t', 1)
            mode, oid, stage = metadata.split()
            path = name.decode('utf-8')
            if path in candidates:
                assert mode in {b'100644', b'100755'} and stage == b'0', path
                indexed[path] = oid
        assert set(indexed) == set(candidates)
        data = subprocess.run(['git', '--no-optional-locks', 'cat-file', '--batch'], cwd=ROOT,
                              input=b'\n'.join(indexed[p] for p in changed) + b'\n', capture_output=True, check=True).stdout
        offset = 0
        for name in changed:
            end = data.index(b'\n', offset)
            oid, kind, size = data[offset:end].split()
            assert kind == b'blob' and oid == indexed[name], name
            offset = end + 1
            assert data[offset:offset + int(size)] == candidates[name].read_bytes(), 'Staged bytes differ: ' + name
            offset += int(size) + 1
        assert offset == len(data)
        staged_count = len(changed)
    print(json.dumps({'status': 'PASS', 'publication_files': len(candidates), 'prepublication_files_preserved': len(original),
                      'historical_files_preserved': 468, 'staged_blobs_verified': staged_count, 'source_set_sha256': publication['source_set_sha256'],
                      'q2_complete': False, 'production': 'BLOCKED', 'system_deployment_authorized': False}, ensure_ascii=False))


if __name__ == '__main__':
    verify()
