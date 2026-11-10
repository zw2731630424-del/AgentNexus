"""Package the M2.0 local-mode delivery without changing historical releases."""
from pathlib import Path
import argparse, datetime, difflib, hashlib, json, shutil, zipfile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'deliverables/AgentNexus-M2.0'
SOURCE = OUT / 'source'
BASELINE = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4.2/source'
RUNTIME = ROOT / '.workflow-kit/runtime/AgentNexus-M2.0'
IGNORED = {'node_modules', 'dist', '__pycache__', '.git'}

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def put(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def files(root, source=False):
    return [p for p in sorted(root.rglob('*')) if p.is_file() and not p.is_symlink()
            and (not source or not (set(p.relative_to(root).parts) & IGNORED))]

def manifest(root, source=False):
    return [{'path': p.relative_to(root).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in files(root, source)]

def copy_evidence():
    for group in ['verification', 'desktop-e2e', 'baseline-comparison']:
        folder = RUNTIME / group
        if not folder.exists():
            continue
        for run in sorted(folder.iterdir()):
            if not run.is_dir():
                continue
            target = OUT / 'evidence' / group / run.name
            target.mkdir(parents=True, exist_ok=True)
            for item in sorted(run.iterdir()):
                if item.is_file() and item.suffix in {'.txt', '.json', '.png', '.exe', '.tap'}:
                    shutil.copyfile(item, target / item.name)
    review = RUNTIME / 'independent-review'
    if review.exists():
        target = OUT / 'evidence/independent-review'
        target.mkdir(parents=True, exist_ok=True)
        for item in sorted(review.iterdir()):
            if item.is_file() and item.suffix in {'.txt', '.json', '.tap', '.mjs', '.py'}:
                shutil.copyfile(item, target / item.name)
    for name in ['governance-check.txt', 'test-link-cleanup.json', 'cleanup-created-links.ps1']:
        path = RUNTIME / name
        if path.exists():
            shutil.copyfile(path, OUT / 'evidence' / name)
    shutil.copyfile(ROOT / '.workflow-kit/tasks/AgentNexus-M2.0/request.txt', OUT / 'request.txt')
    shutil.copyfile(Path(__file__), OUT / 'evidence/m20-delivery.py')

def history_check():
    before = json.loads((OUT / 'evidence/history-before.json').read_text(encoding='utf-8'))['files']
    known = {r['path']: r for r in before}
    current = {}
    for name in ['AgentNexus-M1.8.3-Q4.1', 'AgentNexus-M1.8.3-Q4.2']:
        for p in files(ROOT / 'deliverables' / name):
            if 'node_modules' not in p.parts:
                current[p.relative_to(ROOT).as_posix()] = {'bytes': p.stat().st_size, 'sha256': sha(p)}
    changed = [path for path, row in known.items() if path in current and (row['sha256'] != current[path]['sha256'] or row['bytes'] != current[path]['bytes'])]
    result = {'scope': 'ALL_Q4_1_AND_Q4_2_FILES_EXCEPT_NODE_MODULES', 'checked_files': len(known), 'current_files': len(current),
              'changed': changed, 'missing': sorted(set(known) - set(current)), 'added': sorted(set(current) - set(known))}
    result['status'] = 'PASS' if not any(result[k] for k in ['changed', 'missing', 'added']) else 'FAIL'
    put(OUT / 'evidence/history-verification.json', result)
    if result['status'] != 'PASS':
        raise RuntimeError('Historical release changed: ' + json.dumps(result))
    return result

def prepare():
    copy_evidence()
    history = history_check()
    rows = manifest(SOURCE, True)
    digest = hashlib.sha256(''.join(r['path']+'\0'+r['sha256']+'\n' for r in rows).encode()).hexdigest()
    put(OUT / 'source-manifest.json', {'schema': 'agentnexus/m20/source-manifest/1', 'source_tree_sha256': digest, 'files': rows})
    review_path = OUT / 'evidence/independent-review/source-manifest-final.json'
    if review_path.exists():
        review = json.loads(review_path.read_text(encoding='utf-8'))
        expected = {r['path']: r['sha256'] for r in review['files']}
        actual = {r['path']: r['sha256'] for r in rows}
        mismatch = [p for p, h in expected.items() if actual.get(p) != h]
        supplemental = [p for p in actual if p not in expected]
        extra_changed = [p for p in supplemental if not (BASELINE/p).is_file() or sha(BASELINE/p) != actual[p]]
        consistency = {'status': 'PASS' if not mismatch and not extra_changed else 'FAIL', 'reviewed_files': len(expected), 'delivery_source_files': len(actual),
                       'reviewed_tree_sha256': review['source_tree_sha256'], 'complete_source_tree_sha256': digest, 'mismatches': mismatch,
                       'supplemental_unchanged_baseline_files': supplemental, 'supplemental_changed_files': extra_changed}
        put(OUT / 'evidence/source-review-consistency.json', consistency)
        if consistency['status'] != 'PASS':
            raise RuntimeError('Source differs from independent review')
    old = {r['path']: r for r in manifest(BASELINE, True)}
    new = {r['path']: r for r in rows}
    changed = [p for p in sorted(set(old) | set(new)) if old.get(p, {}).get('sha256') != new.get(p, {}).get('sha256')]
    put(OUT / 'source-changes.json', {'baseline': 'M1.8.3-Q4.2', 'changed': changed,
                                    'removed': sorted(set(old) - set(new)), 'same_core_runtime': True})
    patch = []
    for name in changed:
        try:
            a = (BASELINE / name).read_text(encoding='utf-8').splitlines(keepends=True) if (BASELINE / name).exists() else []
            b = (SOURCE / name).read_text(encoding='utf-8').splitlines(keepends=True) if (SOURCE / name).exists() else []
        except UnicodeError:
            continue
        patch.extend(difflib.unified_diff(a, b, fromfile='a/' + name, tofile='b/' + name))
    (OUT / 'source-changes.patch').write_text(''.join(patch), encoding='utf-8')
    (OUT / 'Start-AgentNexus.cmd').write_bytes(b'@echo off\r\ncd /d "%~dp0source"\r\nnode tools\\agentnexus\\launch-desktop.mjs\r\n')
    return {'source_files': len(rows), 'changed_source_files': len(changed), 'history': history}

def finalize():
    state = prepare()
    for name in ['reports/independent-review.md', 'reports/independent-review.json', 'acceptance-report.md', 'acceptance.json']:
        if not (OUT / name).is_file():
            raise RuntimeError('Required delivery file missing: ' + name)
    if 'Governance check: PASS' not in (OUT / 'evidence/governance-check.txt').read_text(encoding='utf-8-sig'):
        raise RuntimeError('Full workspace governance has not passed')
    source_zip = OUT / 'AgentNexus-M2.0-source.zip'
    with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for item in files(SOURCE, True):
            archive.write(item, item.relative_to(SOURCE).as_posix())
    skipped = {'SHA256SUMS', 'package-manifest.json', 'AgentNexus-M2.0-complete.zip', 'AgentNexus-M2.0-complete.zip.sha256'}
    rows = [r for r in manifest(OUT) if r['path'] not in skipped]
    put(OUT / 'package-manifest.json', {'schema': 'agentnexus/m20/package-manifest/1', 'files': rows,
        'hash_exclusions': sorted(skipped), 'dependency_policy': 'Pinned third-party runtimes are not redistributed. Workspace uses existing pinned tools; standalone npm ci is documented.'})
    rows.append({'path': 'package-manifest.json', 'sha256': sha(OUT / 'package-manifest.json')})
    (OUT / 'SHA256SUMS').write_text(''.join(r['sha256'] + '  ' + r['path'] + '\n' for r in sorted(rows, key=lambda r: r['path'])), encoding='utf-8')
    bundle = OUT / 'AgentNexus-M2.0-complete.zip'
    with zipfile.ZipFile(bundle, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for item in files(OUT):
            if item.name not in {'AgentNexus-M2.0-complete.zip', 'AgentNexus-M2.0-complete.zip.sha256'}:
                archive.write(item, item.relative_to(OUT).as_posix())
    (OUT / 'AgentNexus-M2.0-complete.zip.sha256').write_text(sha(bundle) + '  ' + bundle.name + '\n', encoding='utf-8')
    return {**state, 'bundle': str(bundle), 'bundle_bytes': bundle.stat().st_size, 'bundle_sha256': sha(bundle)}

def verify():
    mismatches = []
    sums = (OUT / 'SHA256SUMS').read_text(encoding='utf-8').splitlines()
    for row in sums:
        expected, name = row.split('  ', 1)
        path = OUT / name
        if not path.is_file() or sha(path) != expected:
            mismatches.append(name)
    bundle = OUT / 'AgentNexus-M2.0-complete.zip'
    expected_bundle = (OUT / (bundle.name + '.sha256')).read_text().split()[0]
    if sha(bundle) != expected_bundle:
        mismatches.append(bundle.name)
    with zipfile.ZipFile(bundle) as archive:
        if archive.testzip() is not None:
            mismatches.append('ZIP_CRC')
        for row in sums:
            expected, name = row.split('  ', 1)
            if hashlib.sha256(archive.read(name)).hexdigest() != expected:
                mismatches.append('ZIP:' + name)
    return {'status': 'PASS' if not mismatches else 'FAIL', 'checked_content_files': len(sums), 'mismatches': mismatches, 'bundle_sha256': expected_bundle}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['prepare', 'finalize', 'verify'])
    action = parser.parse_args().action
    result = {'prepare': prepare, 'finalize': finalize, 'verify': verify}[action]()
    print(json.dumps(result, ensure_ascii=False))
