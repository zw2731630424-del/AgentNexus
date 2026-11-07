"""Build and verify the local M1.2 delivery without touching historical evidence."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'deliverables/AgentNexus-M1.2'
RUNTIME = ROOT / '.workflow-kit/runtime/AgentNexus-M1.2'


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def copy(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def sources(root):
    files = [root / 'package.json']
    for name in ['src', 'tests', 'tools', 'config']:
        files.extend(p for p in (root / name).rglob('*') if p.is_file())
    result = []
    for path in sorted(files):
        if path.is_symlink():
            raise ValueError('Non-regular source: ' + str(path))
        result.append({'path': path.relative_to(root).as_posix(), 'bytes': path.stat().st_size, 'sha256': digest(path)})
    return result


def source_zip(root, destination, rows):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for row in rows:
            archive.write(root / row['path'], row['path'])
    with zipfile.ZipFile(destination) as archive:
        if sorted(archive.namelist()) != sorted(x['path'] for x in rows):
            raise ValueError('Source ZIP file set mismatch')
        for row in rows:
            if hashlib.sha256(archive.read(row['path'])).hexdigest() != row['sha256']:
                raise ValueError('Source ZIP byte mismatch: ' + row['path'])
    destination.with_suffix(destination.suffix + '.sha256').write_text(digest(destination) + '  ' + destination.name + '\n', encoding='ascii')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', required=True, type=Path)
    parser.add_argument('--govern-log', required=True, type=Path)
    args = parser.parse_args()
    run = args.run.resolve()
    run.relative_to(RUNTIME / 'verification')
    current = sources(ROOT)
    tested = read(run / 'source-manifest.json')['files']
    if {x['path']: x['sha256'] for x in current} != {x['path']: x['sha256'] for x in tested}:
        raise ValueError('Current runtime candidate differs from the final tested source')
    results = read(run / 'results.json')
    if results['exit_code'] != 0 or results['summary']['counts']['failed'] != 0:
        raise ValueError('Final suite failed')
    baseline = read(RUNTIME / 'baseline/freeze.json')
    protected_deltas = [x['path'] for x in baseline['protected_files'] if not (ROOT / x['path']).is_file() or digest(ROOT / x['path']) != x['sha256']]
    if protected_deltas:
        raise ValueError('Protected historical bytes changed: ' + repr(protected_deltas))
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    if head != baseline['git_head']:
        raise ValueError('Git HEAD changed without authorization')
    preserved = ['src/agentnexus/' + x + '.ts' for x in ['storage', 'artifacts', 'records', 'features', 'diagnostics', 'integrity']]
    initial = {x['path']: x['sha256'] for x in baseline['candidate_files']}
    if any(digest(ROOT / p) != initial[p] for p in preserved):
        raise ValueError('Preserved M1.1 implementation changed')
    baseline_tap = (RUNTIME / 'baseline/all-tests.tap').read_text(encoding='utf-8-sig')
    baseline_cases = []
    for line in baseline_tap.splitlines():
        match = re.match(r'^(\s*)(ok|not ok) \d+ - (.*?)(?: # (SKIP|TODO)(?: (.*))?)?$', line)
        if match:
            # Node's TAP reporter escapes literal backslashes; JSON events contain
            # the original test name. Decode TAP quoting, never Unicode escapes.
            name = re.sub(r'\\([\\#])', r'\1', match[3])
            baseline_cases.append({'name': name, 'tap_name': match[3], 'status': 'NOT_RUN' if match[4] else 'PASS' if match[2] == 'ok' else 'FAIL', 'reason': match[5]})
    missing = Counter(x['name'] for x in baseline_cases) - Counter(x['name'] for x in results['cases'])
    if len(baseline_cases) != 135 or missing:
        raise ValueError('M1.1 regression cases missing: ' + repr(missing))
    review_path = RUNTIME / 'independent-review/review.json'
    review = read(review_path)
    reviewed = review['final_candidate_files']
    for row in reviewed:
        if digest(ROOT / row['path']) != row['sha256'].lower():
            raise ValueError('Independent review binding stale: ' + row['path'])
    if not args.govern_log.is_file() or 'Governance check: PASS' not in args.govern_log.read_text(encoding='utf-8-sig'):
        raise ValueError('Governance PASS evidence missing')
    for row in current:
        copy(ROOT / row['path'], DEST / 'source' / row['path'])
    source_zip(ROOT, DEST / 'AgentNexus-M1.2-source.zip', current)
    write(DEST / 'source-sha256.json', {'schema': 'agentnexus/m1.2/source-snapshot/1', 'version': read(ROOT / 'package.json')['version'], 'baseline_head': head, 'final_test_run': run.name, 'files': current})
    (DEST / 'SOURCE_SHA256SUMS.txt').write_text(''.join(x['sha256'] + '  ' + x['path'] + '\n' for x in current), encoding='ascii')
    for name in ['freeze.json', 'probes.mjs', 'probes.json', 'all-tests.tap', 'exit-code.txt']:
        copy(RUNTIME / 'baseline' / name, DEST / 'evidence/baseline' / name)
    write(DEST / 'evidence/baseline/results.json', {'schema': 'agentnexus/m1.2/baseline-test-results/1', 'counts': {'tests': 135, 'passed': 131, 'failed': 0, 'not_run': 4}, 'cases': baseline_cases})
    copy(ROOT / '.workflow-kit/tasks/AgentNexus-M1.2/phase1-review.md', DEST / 'independent-recheck.md')
    copy(ROOT / '.workflow-kit/tasks/AgentNexus-M1.2/user_request.txt', DEST / 'original-request.txt')
    for attempt in sorted((RUNTIME / 'verification').iterdir()):
        if not attempt.is_dir():
            continue
        for name in ['all-tests.tap', 'events.jsonl', 'results.json', 'source-manifest.json', 'runner.stdout.txt', 'runner.stderr.txt']:
            if (attempt / name).is_file():
                copy(attempt / name, DEST / 'evidence/runs' / attempt.name / name)
        if (attempt / 'source-manifest.json').is_file():
            source_zip(attempt / 'workspace', DEST / 'evidence/runs' / attempt.name / 'source-snapshot.zip', read(attempt / 'source-manifest.json')['files'])
    review_root = review_path.parent
    for file in review_root.rglob('*'):
        if file.is_file() and file.suffix in ['.json', '.mjs', '.tap', '.txt'] and not any(x in ['workspace', 'data', 'state', 'states', 'fixtures'] for x in file.relative_to(review_root).parts):
            copy(file, DEST / 'evidence/independent-review' / file.relative_to(review_root))
    copy(review_path, DEST / 'independent-code-review.json')
    data_root = Path(results['test_data_root'])
    data_root.resolve().relative_to(RUNTIME)
    for file in data_root.rglob('*'):
        if file.is_file() and (file.name in ['recovery-evidence.json', 'window.json', 'child-stderr.txt'] or file.name.startswith('verification') or file.name.startswith('test-results')):
            copy(file, DEST / 'evidence/final-test-data' / file.relative_to(data_root))
    copy(args.govern_log, DEST / 'evidence/governance-check.txt')
    copy(run / 'results.json', DEST / 'test-results.json')
    checks = {'baseline_24_byte_match': baseline['match'], 'protected_files_unchanged': len(baseline['protected_files']), 'preserved_implementation_files': preserved, 'git_head_unchanged': True,
              'final_test_source_equals_current': True, 'original_regression_cases_retained': len(baseline_cases), 'missing_original_cases': dict(missing),
              'independent_review_files_bound': len(reviewed), 'source_zip_roundtrip': True, 'governance': 'PASS',
              'static_type_check': 'NOT_RUN', 'os_admin_auth': 'NOT_RUN', 'arbitrary_execution_sandbox': 'BLOCKED', 'scientific_execution': 'NOT_RUN'}
    write(DEST / 'verification.json', {'schema': 'agentnexus/m1.2/delivery-verification/1', 'status': 'PASS_LOCAL_LIBRARY_SCOPE', 'checks': checks, 'test_counts': results['summary']['counts']})
    excluded = {'delivery-manifest.json', 'delivery-manifest.json.sha256', 'SHA256SUMS.txt'}
    payload = [{'path': p.relative_to(DEST).as_posix(), 'bytes': p.stat().st_size, 'sha256': digest(p)} for p in sorted(DEST.rglob('*')) if p.is_file() and p.relative_to(DEST).as_posix() not in excluded]
    write(DEST / 'delivery-manifest.json', {'schema': 'agentnexus/m1.2/delivery-manifest/1', 'self_hash_rule': 'Only these exact root-relative paths are excluded: ' + ', '.join(sorted(excluded)), 'files': payload})
    (DEST / 'delivery-manifest.json.sha256').write_text(digest(DEST / 'delivery-manifest.json') + '  delivery-manifest.json\n', encoding='ascii')
    checksum_files = sorted(p for p in DEST.rglob('*') if p.is_file() and p != DEST / 'SHA256SUMS.txt')
    (DEST / 'SHA256SUMS.txt').write_text(''.join(digest(p) + '  ' + p.relative_to(DEST).as_posix() + '\n' for p in checksum_files), encoding='utf-8')
    for row in payload:
        if digest(DEST / row['path']) != row['sha256']:
            raise ValueError('Delivery changed during verification: ' + row['path'])
    print(json.dumps({'delivery': str(DEST), 'source_files': len(current), 'delivery_payload_files': len(payload), 'checks': checks, 'tests': results['summary']['counts']}, ensure_ascii=True))


if __name__ == '__main__':
    main()
