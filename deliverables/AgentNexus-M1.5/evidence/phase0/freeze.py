import datetime, hashlib, json, pathlib, shutil, subprocess

ROOT = pathlib.Path('I:/AI_AgentNexus')
BASE = ROOT / 'deliverables/AgentNexus-M1.4'
OUT = ROOT / 'deliverables/AgentNexus-M1.5'
assert not OUT.exists(), 'Refuse overwrite of M1.5'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8').strip()
def write(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open('x', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2); f.write('\n')
source = json.loads((BASE/'source-sha256.json').read_text('utf-8'))
for f in source['files']:
    p = BASE/'source'/f['path']
    assert p.stat().st_size == f['bytes'] and digest(p) == f['sha256'], str(p)
set_hash = hashlib.sha256(''.join(f['path']+'\0'+f['sha256']+'\n' for f in sorted(source['files'], key=lambda f:f['path'])).encode()).hexdigest()
assert set_hash == source['set_sha256']
manifest = json.loads((BASE/'delivery-manifest.json').read_text('utf-8'))
for f in manifest['files']:
    p = BASE/f['path']; assert p.stat().st_size == f['bytes'] and digest(p) == f['sha256'], str(p)
assert digest(BASE/'delivery-manifest.json') == (BASE/'delivery-manifest.json.sha256').read_text().split()[0]
run = BASE/'evidence/runs/2026-11-07T08-30-22-409Z-37176/source-manifest.json'
tested = json.loads(run.read_text('utf-8'))
assert {f['path']:(f['bytes'],f['sha256']) for f in source['files']} == {f['path']:(f['bytes'],f['sha256']) for f in tested['files']}
tracked = []
for rel in git('ls-files').splitlines():
    p = ROOT/rel; tracked.append({'path':rel,'bytes':p.stat().st_size,'sha256':digest(p)})
historical = []
for version in ['AgentNexus-M1.2','AgentNexus-M1.3','AgentNexus-M1.4']:
    for p in sorted((ROOT/'deliverables'/version).rglob('*')):
        if p.is_file(): historical.append({'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
freeze = {'schema':'agentnexus/m1.5/baseline/1','frozen_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'initial_status':git('status','--short'),'tracked':tracked,'historical':historical,'m14_source_files':len(source['files']),'m14_source_set_sha256':set_hash,'m14_delivery_files_verified':len(manifest['files']),'m14_test_manifest_sha256':digest(run),'system_modifications':False}
write(OUT/'evidence/phase0/freeze.json',freeze)
shutil.copyfile(BASE/'source-sha256.json',OUT/'evidence/phase0/m14-source-sha256.json')
for f in source['files']:
    p = OUT/'source'/f['path']; p.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(BASE/'source'/f['path'],p)
shutil.copyfile(pathlib.Path(__file__),OUT/'evidence/phase0/freeze.py')
print(json.dumps({'status':'PASS','head':freeze['head'],'tracked':len(tracked),'historical':len(historical),'m14_source_set_sha256':set_hash,'copied':len(source['files']),'candidate':str(OUT/'source')}))
