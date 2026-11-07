import hashlib, json, pathlib, shutil, subprocess, datetime

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / 'deliverables/AgentNexus-M1.4'
BASE = ROOT / 'deliverables/AgentNexus-M1.3'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open('x', encoding='utf-8', newline='\n') as f: json.dump(value, f, ensure_ascii=False, indent=2); f.write('\n')
def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8').strip()

source = json.loads((BASE/'source-sha256.json').read_text('utf-8'))
checks = []
for item in source['files']:
    for label, base in [('root', ROOT), ('frozen', BASE/'source')]:
        p = base / item['path']
        assert p.stat().st_size == item['bytes'] and digest(p) == item['sha256'], str(p)
        checks.append({'path': item['path'], 'location': label, 'status': 'PASS'})
set_hash = hashlib.sha256(''.join(f['path']+'\0'+f['sha256']+'\n' for f in sorted(source['files'], key=lambda f:f['path'])).encode()).hexdigest()
assert set_hash == source['set_sha256']
manifest = json.loads((BASE/'delivery-manifest.json').read_text('utf-8'))
for item in manifest['files']:
    p = BASE / item['path']
    assert p.stat().st_size == item['bytes'] and digest(p) == item['sha256'], str(p)
assert digest(BASE/'delivery-manifest.json') == (BASE/'delivery-manifest.json.sha256').read_text().split()[0]
tracked = []
for rel in git('ls-files').splitlines():
    p = ROOT/rel
    tracked.append({'path': rel, 'bytes': p.stat().st_size, 'sha256': digest(p)})
run = BASE/'evidence/runs/2026-11-07T06-20-28-431Z-15440/source-manifest.json'
tested = json.loads(run.read_text('utf-8'))
assert {f['path']: (f['bytes'], f['sha256']) for f in source['files']} == {f['path']: (f['bytes'], f['sha256']) for f in tested['files']}
evidence = OUT/'evidence/phase0'
write(evidence/'freeze.json', {'schema':'agentnexus/m1.4/baseline/1','frozen_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'initial_tracked_status':git('status','--short','--untracked-files=no'),'m13_source_files':len(source['files']),'m13_source_set_sha256':set_hash,'m13_test_manifest_sha256':digest(run),'m13_delivery_files_verified':len(manifest['files']),'source_checks':checks,'tracked':tracked,'system_modifications':False})
for f in source['files']:
    p=OUT/'source'/f['path']; p.parent.mkdir(parents=True,exist_ok=True)
    assert not p.exists(), str(p)
    shutil.copyfile(BASE/'source'/f['path'],p)
shutil.copyfile(BASE/'source-sha256.json', evidence/'m13-source-sha256.json')
print(json.dumps({'status':'PASS','head':git('rev-parse','HEAD'),'m13_set_hash':set_hash,'verified_m13_delivery_files':len(manifest['files']),'frozen_tracked':len(tracked),'candidate':str(OUT/'source')}))
