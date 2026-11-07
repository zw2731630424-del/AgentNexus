import hashlib, json, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OLD = ROOT / '.workflow-kit/tasks/AgentNexus-v0.4-M0'
OUT = Path(__file__).parent
def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as stream:
        for chunk in iter(lambda: stream.read(65536), b''): h.update(chunk)
    return h.hexdigest()
manifest = json.loads((OLD/'reports/delivery_manifest.json').read_text('utf-8-sig'))
errors = [r['path'] for r in manifest['files'] if sha(OLD/r['path']) != r['sha256'] or (OLD/r['path']).stat().st_size != r['bytes']]
files = [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(OLD.rglob('*')) if p.is_file()]
protected = [ROOT/'AGENTS.md', ROOT/'.workflow-kit/governance/policy.json']
protected += [p for p in (ROOT/'ai-workflow-kit-v4').rglob('*') if p.is_file()]
protected += [p for p in (ROOT/'inputs/AgentNexus-v0.4').rglob('*') if p.is_file()]
data = {'schema': 'agentnexus/m0.1-baseline/1', 'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'm0_manifest_verified': not errors, 'errors': errors, 'm0_files': files, 'protected': [{'path':p.relative_to(ROOT).as_posix(), 'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(protected)]}
(OUT/'baseline.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf-8')
print(json.dumps({'status':'PASS' if not errors else 'FAIL','m0_files':len(files),'protected':len(protected),'errors':errors}))
if errors: raise SystemExit(1)
