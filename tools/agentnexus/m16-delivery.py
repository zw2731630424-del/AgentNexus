"""M1.6 additive freeze/package helper; never writes historical deliveries."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'deliverables/AgentNexus-M1.6'
SOURCE = OUT / 'source'

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def inventory(base):
    files = [{'path': p.relative_to(base).as_posix(), 'bytes': p.stat().st_size, 'sha256': digest(p)}
            for p in base.rglob('*') if p.is_file() and 'node_modules' not in p.parts and '__pycache__' not in p.parts]
    return sorted(files, key=lambda f: f['path'])

def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(data, stream, ensure_ascii=False, indent=2)
        stream.write('\n')

def aggregate(files):
    return hashlib.sha256(''.join(f['path'] + '\0' + f['sha256'] + '\n' for f in files).encode()).hexdigest()

def freeze():
    if SOURCE.exists():
        raise RuntimeError('M1.6 source already exists; refusing overwrite')
    evidence = OUT / 'evidence/phase0'
    historical = []
    for base in [ROOT / 'deliverables', ROOT / '.workflow-kit/tasks']:
        for child in sorted(base.iterdir()):
            if child.is_dir() and child.name != 'AgentNexus-M1.6':
                for f in inventory(child):
                    f['path'] = child.relative_to(ROOT).as_posix() + '/' + f['path']
                    historical.append(f)
    save(evidence / 'historical-manifest.json', {'files': historical, 'set_sha256': aggregate(historical)})
    baseline = ROOT / 'deliverables/AgentNexus-M1.5.1/source'
    files = inventory(baseline)
    save(evidence / 'm151-source-manifest.json', {'files': files, 'set_sha256': aggregate(files)})
    git = lambda *args: subprocess.check_output(['git', *args], cwd=ROOT).decode().strip()
    save(evidence / 'git-baseline.json', {'branch': git('branch', '--show-current'), 'head': git('rev-parse', 'HEAD'),
        'status_at_freeze': git('status', '--short'), 'root_runtime_version': json.loads((ROOT / 'package.json').read_text())['version'],
        'selected_runtime_version': json.loads((baseline / 'package.json').read_text())['version']})
    shutil.copytree(baseline, SOURCE)
    assert inventory(SOURCE) == files
    task = ROOT / '.workflow-kit/tasks/AgentNexus-M1.6'
    task.mkdir(parents=True, exist_ok=True)
    request = Path('C:/Users/28642/.codex/attachments/0a835a32-8cb3-497f-a51b-a5c2aa0d61da/已粘贴的文本.txt')
    shutil.copyfile(request, task / 'original-request.txt')
    print(json.dumps({'frozen_files': len(files), 'baseline_sha256': aggregate(files), 'historical_files': len(historical)}))

def preserve():
    frozen = json.loads((OUT / 'evidence/phase0/historical-manifest.json').read_text(encoding='utf-8'))
    changed = [f['path'] for f in frozen['files'] if not (ROOT / f['path']).is_file() or digest(ROOT / f['path']) != f['sha256']]
    return {'status': 'PASS' if not changed else 'FAIL', 'checked_files': len(frozen['files']), 'changed': changed}

def package():
    proof = preserve()
    if proof['changed']:
        raise RuntimeError(proof)
    files = inventory(SOURCE)
    for name in ['source-sha256.json', 'preservation-verification.json']:
        path = OUT / name
        if path.exists():
            path.unlink()
    save(OUT / 'source-sha256.json', {'files': files, 'set_sha256': aggregate(files)})
    save(OUT / 'preservation-verification.json', proof)
    archive = OUT / 'AgentNexus-M1.6-source.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(SOURCE / f['path'], f['path'])
    with zipfile.ZipFile(archive) as z:
        assert len(z.infolist()) == len(files)
        for f in files:
            h = hashlib.sha256()
            with z.open(f['path']) as stream:
                for chunk in iter(lambda: stream.read(1048576), b''):
                    h.update(chunk)
            assert h.hexdigest() == f['sha256']
    (OUT / 'AgentNexus-M1.6-source.zip.sha256').write_text(digest(archive) + '  ' + archive.name + '\n', encoding='ascii')
    excluded = {'delivery-manifest.json', 'SHA256SUMS.txt'}
    delivery = [f for f in inventory(OUT) if f['path'] not in excluded]
    path = OUT / 'delivery-manifest.json'
    if path.exists():
        path.unlink()
    save(path, {'files': delivery, 'set_sha256': aggregate(delivery), 'self_excluded': sorted(excluded)})
    (OUT / 'SHA256SUMS.txt').write_text(''.join(f['sha256']+'  '+f['path']+'\n' for f in delivery), encoding='utf-8')
    print(json.dumps({'source_files': len(files), 'source_sha256': aggregate(files), 'preservation': proof, 'zip_verified': True}))

if __name__ == '__main__':
    {'freeze': freeze, 'package': package, 'preserve': lambda: print(json.dumps(preserve()))}[sys.argv[1]]()
