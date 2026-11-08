"""Freeze public project evidence before M1.3 edits. No credential discovery."""
import hashlib, json, subprocess, zipfile
from pathlib import Path
from datetime import datetime, timezone

root = Path(__file__).resolve().parents[2]
out = root / '.workflow-kit/runtime/AgentNexus-M1.3/baseline' / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
out.mkdir(parents=True, exist_ok=False)
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root).decode('utf-8').strip()
def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1048576), b''): h.update(chunk)
    return h.hexdigest()
old = root / 'deliverables/AgentNexus-M1.2'
manifest = json.loads((old / 'source-sha256.json').read_text('utf-8'))
run = old / 'evidence/runs' / manifest['final_test_run']
run_files = {f['path']: f for f in json.loads((run / 'source-manifest.json').read_text('utf-8'))['files']}
checks = [dict(path=f['path'], sha256=digest(root / f['path']), expected=f['sha256'], source_copy=digest(old / 'source' / f['path']), run_sha256=run_files[f['path']]['sha256']) for f in manifest['files']]
assert all(c['sha256'] == c['expected'] == c['source_copy'] == c['run_sha256'] for c in checks), checks
tracked = []
for name in subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode('utf-8').split('\0'):
    if name and (root / name).is_file(): tracked.append(dict(path=name, sha256=digest(root / name), bytes=(root / name).stat().st_size))
with zipfile.ZipFile(out / 'm12-source.zip', 'x', zipfile.ZIP_DEFLATED) as z:
    for f in manifest['files']: z.write(root / f['path'], f['path'])
report = dict(schema='agentnexus/m1.3/baseline/1', at=datetime.now(timezone.utc).isoformat(), branch=git('branch','--show-current'), head=git('rev-parse','HEAD'), status=git('status','--porcelain=v1'), source=checks, historical_files=tracked, source_zip_sha256=digest(out / 'm12-source.zip'), m12_acceptance=json.loads((old / 'acceptance.json').read_text('utf-8')), m12_results_sha256=digest(run / 'results.json'), m12_tap_sha256=digest(run / 'all-tests.tap'))
(out / 'freeze.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps(dict(output=str(out), source_files=len(checks), tracked_files=len(tracked), head=report['head'], all_source_match=True)))
