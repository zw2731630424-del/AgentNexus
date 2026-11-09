"""Read-only Q2 delivery checks. Never opens a live Vault or changes Windows."""
from pathlib import Path
import hashlib
import importlib.util
import json
import zipfile

DELIVERY = Path(__file__).resolve().parents[1]
ROOT = DELIVERY.parent.parent
SKIP = {'node_modules', '.git', 'raw', '__pycache__'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def files(tree):
    return sorted(p for p in tree.rglob('*') if p.is_file() and not p.is_relative_to(DELIVERY / 'source/dist') and not any(s in SKIP for s in p.relative_to(tree).parts))


def read(name):
    return json.loads((DELIVERY / name).read_text(encoding='utf-8'))


def verify():
    manifest = read('source.manifest.json')
    actual = [{'path': p.relative_to(DELIVERY / 'source').as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p.read_bytes())} for p in files(DELIVERY / 'source')]
    assert actual == manifest['files'], 'source manifest differs'
    aggregate = sha(''.join(e['path'] + '\0' + e['sha256'] + '\n' for e in sorted(actual, key=lambda e: e['path'])).encode('utf-8'))
    assert aggregate == manifest['aggregate_sha256']
    with zipfile.ZipFile(DELIVERY / 'AgentNexus-M1.8.3-Q2-source.zip') as archive:
        assert len(archive.namelist()) == len(actual)
        for entry in actual:
            assert sha(archive.read('AgentNexus-M1.8.3-Q2/source/' + entry['path'])) == entry['sha256'], entry['path']
    historical = read('evidence/baseline-freeze.json')
    for entry in historical['historical_files']:
        assert sha((ROOT / entry['path']).read_bytes()) == entry['sha256'], 'historical delivery changed: ' + entry['path']
    for entry in historical['files']:
        assert sha((ROOT / 'deliverables/AgentNexus-M1.8.3/source' / entry['path']).read_bytes()) == entry['sha256']
    assert read('deployment-plan.json')['can_execute'] is False
    installation = read('approval/installation-manifest.json')
    assert installation['can_execute'] is False and installation['missing_payload_or_authority']
    for entry in installation['files']:
        assert entry['target'].startswith('C:\\Program Files\\AgentNexus\\')
        assert sha((DELIVERY / entry['source']).read_bytes()) == entry['sha256'], entry['source']
    application = read('approval/app-manifest.json')
    app_actual = {p.relative_to(DELIVERY / 'payload').as_posix(): sha(p.read_bytes()) for p in (DELIVERY / 'payload/app').rglob('*') if p.is_file()}
    assert app_actual == {entry['path']: entry['sha256'] for entry in application['files']}
    assert read('acceptance.json')['q2_complete'] is False
    qualification = read('tests/windows-qualification.json')
    assert qualification['overall_status'] == 'BLOCKED' and qualification['os_attack_pass_count'] == 0
    assert read('evidence/governance-root-extended.json')['exit_code'] == 0
    spec = importlib.util.spec_from_file_location('q2_govern_readonly', ROOT / 'ai-workflow-kit-v4/tools/govern.py')
    govern = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(govern)
    policy = json.loads((ROOT / '.workflow-kit/governance/policy.json').read_text(encoding='utf-8'))
    state = json.loads((ROOT / '.workflow-kit/governance/baseline.json').read_text(encoding='utf-8'))
    for name, expected in state['protected_rules'].items():
        assert sha((ROOT / name).read_bytes()) == expected, 'rules changed'
    checksums = {}
    for line in (DELIVERY / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        digest, name = line.split('  ', 1)
        assert name not in checksums
        checksums[name] = digest
    delivered = {p.relative_to(DELIVERY).as_posix(): p for p in files(DELIVERY)}
    assert set(checksums) == set(delivered) - {'SHA256SUMS.txt'}, 'incomplete delivery checksums'
    for name, p in delivered.items():
        assert not p.is_symlink(), name
        assert govern.classify(p.relative_to(ROOT).as_posix(), policy, state) is not None, name
        assert p.suffix not in {'.sqlite', '.db', '.wal', '.pfx', '.p12', '.pem', '.key'}, name
        if name != 'SHA256SUMS.txt':
            assert sha(p.read_bytes()) == checksums[name], name
    print(json.dumps({'status': 'PASS', 'source_files': len(actual), 'source_set_sha256': aggregate, 'delivery_files': len(delivered),
                      'historical_files_preserved': len(historical['historical_files']), 'q2_complete': False, 'production': 'BLOCKED'}, indent=2))


if __name__ == '__main__':
    verify()
