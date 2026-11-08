"""Verify delivery ZIPs without extracting or running candidate code."""
from pathlib import Path, PurePosixPath
import datetime, hashlib, json, re, zipfile, sys
ROOT=Path('I:/AI_AgentNexus'); OUT=ROOT/'deliverables/AgentNexus-M1.7'
def read(p): return json.loads(p.read_text(encoding='utf8'))
def hashed(stream):
    h=hashlib.sha256(); size=0
    for b in iter(lambda:stream.read(1024*1024),b''): h.update(b);size+=len(b)
    return size,h.hexdigest()
def sha(p):
    with p.open('rb') as f:return hashed(f)[1]
archives=[];total=0;rawbytes=0
cache_path=ROOT/'.workflow-kit/runtime/AgentNexus-M1.7/zip-verification-cache.json'
cache=read(cache_path) if cache_path.exists() else {'archives':[]}
cache_by_path={x['path']:x for x in cache['archives']}
targets=[OUT/'AgentNexus-M1.7-source.zip',*sorted((OUT/'evidence/raw').glob('*.zip'))]
for p in targets:
    external=read(p.with_suffix('.manifest.json'));assert sha(p)==external['zip_sha256'];assert p.stat().st_size==external['zip_bytes']
    prior=cache_by_path.get(p.relative_to(OUT).as_posix())
    if prior and prior['sha256']==external['zip_sha256'] and prior['external_manifest_sha256']==sha(p.with_suffix('.manifest.json')):
        archives.append(prior);total+=prior['files_verified'];rawbytes+=prior['uncompressed_bytes_verified'];continue
    with zipfile.ZipFile(p) as z:
        names=z.namelist();assert len(names)==len(set(names));m=json.loads(z.read('PACKAGING-MANIFEST.json'))
        assert m=={k:v for k,v in external.items() if k not in ['zip_sha256','zip_bytes']}
        assert set(names)=={f['path'] for f in m['files']}|{'PACKAGING-MANIFEST.json'}
        count=0;size=0
        for f in m['files']:
            rel=PurePosixPath(f['path']);assert not rel.is_absolute() and '..' not in rel.parts and ':' not in f['path'] and '\\' not in f['path']
            with z.open(f['path']) as stream: n,h=hashed(stream)
            assert n==f['bytes'] and h==f['sha256'],(str(p),f['path']);count+=1;size+=n
        total+=count;rawbytes+=size
        archives.append({'path':p.relative_to(OUT).as_posix(),'files_verified':count,'uncompressed_bytes_verified':size,'sha256':external['zip_sha256'],
          'external_manifest_sha256':sha(p.with_suffix('.manifest.json')),'links_not_followed':m['links_not_followed']})
    print(json.dumps({'verified_archive':p.name,'files':count}),flush=True)
cache_path.write_text(json.dumps({'schema':'agentnexus/m17/zip-verification-cache/1','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archives':archives},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if '--preflight' in sys.argv:
    print(json.dumps({'preflight':'PASS','archives':len(archives),'files_verified':total,'raw_bytes_verified':rawbytes}));sys.exit(0)
source=read(OUT/'source-sha256.json');rows=[]
for f in source['files']:
    p=OUT/'source'/f['path'];assert p.stat().st_size==f['bytes'] and sha(p)==f['sha256'];rows.append(f['path']+'\0'+f['sha256']+'\n')
assert hashlib.sha256(''.join(rows).encode()).hexdigest()==source['set_sha256']=='8167ce3e78c602f43bee2b3a4d792a5054f76d7121a6a7730b14cc37eb5c4c6c'
actual={p.relative_to(OUT/'source').as_posix() for p in (OUT/'source').rglob('*') if p.is_file()};assert actual=={f['path'] for f in source['files']}
for f in read(OUT/'pilot/export-manifest.json')['files']:
    p=OUT/f['export_path'];assert sha(p)==f['sha256'] and p.stat().st_size==f['bytes']
coverage=read(OUT/'evidence/baseline/read-coverage.json');assert coverage['files_with_read_ledger']==140 and not coverage['missing']
assert read(OUT/'evidence/history-preservation.json')['status']=='PASS'
assert read(OUT/'evidence/governance/check.json')['status']=='PASS'
a=read(OUT/'acceptance.json');assert a['delivery_status']=='COMPLETE_WITH_DECLARED_LIMITS';assert a['resident_two_hour']['status']=='PASS'
assert a['real_autonomous_development']=='SIMULATED' and a['strict_cumulative_cpu']=='BLOCKED'
links=[]
for p in [*OUT.glob('*.md'),*(OUT/'reports').glob('*.md')]:
    for href in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf8')):
        if '://' in href or href.startswith('#'):continue
        target=(p.parent/href.split('#',1)[0]).resolve()
        if target.name in {'SHA256SUMS.txt','delivery-manifest.json'} and target.parent==OUT.resolve():continue
        assert target.exists(),(str(p),href);links.append({'document':p.relative_to(OUT).as_posix(),'target':href})
report={'schema':'agentnexus/m17/package-verification/1','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS',
 'method':'Streaming SHA256 and ZIP CRC via standard Python libraries; no extraction, candidate execution, or engine import.',
 'archives':archives,'zip_payload_files_verified':total,'zip_payload_bytes_verified':rawbytes,'engine_source_files_verified':155,
 'pilot_exports_verified':10,'full_baseline_read_coverage':140,'relative_document_links_checked':len(links),
 'native_evidence_decoding':read(OUT/'evidence/native/evidence-decoding.json')['status'],
 'exclusions':'SHA256SUMS/delivery-manifest are finalized after this report to avoid checksum self-reference.'}
(OUT/'evidence/package-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='archives'},ensure_ascii=False))
