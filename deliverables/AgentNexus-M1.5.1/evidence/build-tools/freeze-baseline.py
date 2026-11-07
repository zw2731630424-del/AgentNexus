import hashlib, json, pathlib, shutil, subprocess, datetime, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = ROOT / 'deliverables/AgentNexus-M1.5.1'
OLD = ROOT / 'deliverables/AgentNexus-M1.5'
PHASE = OUT / 'evidence/phase0'
PHASE.mkdir(parents=True, exist_ok=True)

def inventory(base):
    rows = []
    for p in sorted(base.rglob('*')):
        if p.is_symlink():
            raise RuntimeError(f'Source link: {p}')
        if p.is_file():
            rows.append({'path':p.relative_to(base).as_posix(), 'bytes':p.stat().st_size,
                         'sha256':hashlib.file_digest(p.open('rb'), 'sha256').hexdigest()})
    return sorted(rows, key=lambda row: row['path'])

def put(name, obj):
    with (PHASE / name).open('x', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8').strip()

rows = inventory(OLD / 'source')
set_hash = hashlib.sha256(''.join(r['path']+'\0'+r['sha256']+'\n' for r in rows).encode()).hexdigest()
assert set_hash == 'a55823fae02fd565249cf0d2af1f3257d2e107b798b05b078b74ba15eb0e109e', set_hash
put('m15-source-manifest.json', {'files':rows, 'set_sha256':set_hash})
put('baseline.json', {'schema':'agentnexus/m151/baseline/1','observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'branch':git('branch','--show-current'),'head':git('rev-parse','HEAD'),
    'status_at_freeze':git('status','--short'),'source_set_sha256':set_hash,
    'historical_test_run':'2026-11-07T10-56-36-121Z-10852',
    'historical_results':{'tests':289,'PASS':265,'NOT_RUN':23,'FAIL':1,'exit_code':1},
    'original_cpu_qualification':{'cases':10,'FAIL':10,'production_qualified':False}})
for version in ('M1.2','M1.3','M1.4','M1.5'):
    put(version.lower().replace('.','')+'-historical-manifest.json', inventory(ROOT / ('deliverables/AgentNexus-'+version)))
tracked = []
for name in git('ls-files').splitlines():
    p = ROOT / name
    if p.is_file():
        tracked.append({'path':name,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()})
put('tracked-manifest.json', tracked)
shutil.copytree(OLD / 'source', OUT / 'source')
with zipfile.ZipFile(PHASE/'m15-source-original.zip','x',compression=zipfile.ZIP_DEFLATED) as z:
    for r in rows:
        z.write(OLD/'source'/r['path'],r['path'])
shutil.copytree(OLD/'evidence/cpu/final', PHASE/'m15-cpu-original')
put('freeze-complete.json', {'source_set_sha256':set_hash,'source_files':len(rows),
    'copied_source_equal':rows == inventory(OUT/'source'),'historical_records_overwritten':False})
print(json.dumps({'source_files':len(rows),'set_sha256':set_hash,'copied':str(OUT/'source')}))
