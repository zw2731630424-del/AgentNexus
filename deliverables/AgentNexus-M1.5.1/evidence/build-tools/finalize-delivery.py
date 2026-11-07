import pathlib,json,hashlib,zipfile,re,datetime
BASE=pathlib.Path(__file__).resolve().parents[2]
ROOT=BASE.parents[1]
def digest(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
source=load(BASE/'source-sha256.json')
assert source['set_sha256']=='3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0'
for row in source['files']:assert digest(BASE/'source'/row['path'])==row['sha256'],row['path']
with zipfile.ZipFile(BASE/'AgentNexus-M1.5.1-source.zip') as z:
    assert sorted(z.namelist())==sorted(r['path'] for r in source['files'])
    for r in source['files']:assert hashlib.sha256(z.read(r['path'])).hexdigest()==r['sha256']
history=[]
for version in ['m12','m13','m14','m15']:
    manifest=load(BASE/('evidence/phase0/'+version+'-historical-manifest.json'))
    old=BASE.parent/('AgentNexus-M'+version[1]+'.'+version[2])
    differences=[r['path'] for r in manifest if not (old/r['path']).is_file() or digest(old/r['path'])!=r['sha256']]
    history.append({'version':version,'files':len(manifest),'changed_or_missing':differences})
    assert not differences,(version,differences)
tracked=load(BASE/'evidence/phase0/tracked-manifest.json')
changed=[r['path'] for r in tracked if not (ROOT/r['path']).is_file() or digest(ROOT/r['path'])!=r['sha256']]
assert not changed,changed
(BASE/'preservation-verification.json').write_text(json.dumps({'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'historical':history,'tracked_files':len(tracked),'tracked_changed':changed,'source_matches_freeze':True,'source_zip_all_members_verified':True},indent=2)+'\n',encoding='utf-8')

main_runs=[]
for p in sorted((BASE/'evidence/runs').glob('*/results.json')):
    r=load(p);main_runs.append({'run_id':p.parent.name,'source_set_sha256':r.get('source_set_sha256'),'counts':r.get('summary',{}).get('counts'),'tsc':r.get('tsc'),'exit_code':r.get('exit_code'),'raw':p.relative_to(BASE).as_posix()})
cpu_runs=[]
for p in sorted((BASE/'evidence/cpu-qualification').glob('*/report.json')):
    r=load(p);cpu_runs.append({'run_id':r['run_id'],'source_set_sha256':r['source_set_sha256'],'counts':r['counts'],'status':r['status'],'raw':p.relative_to(BASE).as_posix(),'exit_observed':sum(bool(c['exit_observed']) for c in r['cases']),'handle_cleanup_observed':sum(bool(c['handle_cleanup_observed']) for c in r['cases'])})
history_index={'main_regressions':main_runs,'cpu_qualifications':cpu_runs,'historical_m15_cpu':'evidence/phase0/m15-cpu-original/report.json','development_runs':['evidence/runs/m151-focus01','evidence/runs/m151-life01'],'all_failures_retained':True}
(BASE/'run-history.json').write_text(json.dumps(history_index,indent=2)+'\n',encoding='utf-8')
table='\n\n## 全部本轮完整运行\n\n| Run | 源集合前缀 | PASS / FAIL / NOT_RUN | exit |\n|---|---|---|---|\n'
for r in main_runs:
    c=r['counts'];table+=f"| {r['run_id']} | {r['source_set_sha256'][:12]} | {c['passed']} / {c['failed']} / {c['skipped']} | {r['exit_code']} |\n"
table+='\n| CPU Run | 源集合前缀 | PASS / FAIL | 根/树/EOF/历史闭合 | Job/process句柄关闭 |\n|---|---|---|---|---|\n'
for r in cpu_runs:table+=f"| {r['run_id']} | {r['source_set_sha256'][:12]} | {r['counts']['PASS']} / {r['counts']['FAIL']} | {r['exit_observed']}/58 | {r['handle_cleanup_observed']}/58 |\n"
table+='\n原始 M1.5 为 265 PASS / 1 FAIL / 23 NOT_RUN，CPU 0 PASS / 10 FAIL；所有历史标签保留。表中 PS5 工具选择失败不作产品资格，新源码通过的任何用例不覆盖旧失败。\n'
for name in ['overall-report.md','acceptance-report.md']:
    p=BASE/name;text=p.read_text(encoding='utf-8');text=text.split('\n\n## 全部本轮完整运行')[0];p.write_text(text.rstrip()+table,encoding='utf-8',newline='\n')

broken=[]
for p in BASE.glob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
        if re.match(r'^[a-z]+:',target) or target.startswith('#'):continue
        target=target.split('#')[0]
        if not (p.parent/target).exists():broken.append({'file':p.name,'target':target})
assert not broken,broken
acceptance=load(BASE/'acceptance.json')
assert acceptance['source_set_sha256']==source['set_sha256'] and acceptance['production_execution']=={'PROCESS':'BLOCKED','EXTERNAL_EFFECT':'BLOCKED'}
assert acceptance['cpu_qualification']=='FAIL'
assert (BASE/'evidence/independent-review/final-review.md').is_file()
assert (BASE/'evidence/independent-review/final-review.json').is_file()
verification={'schema':'agentnexus/delivery-verification/1.5.1','source_set_sha256':source['set_sha256'],'source_files':len(source['files']),'source_members_verified':True,'historical_preserved':True,'tracked_preserved':True,'markdown_links':'PASS','production':'BLOCKED','cpu':'FAIL','governance':'SEE evidence/governance-final.log'}
(BASE/'verification.json').write_text(json.dumps(verification,indent=2)+'\n',encoding='utf-8')
(BASE/'SOURCE_SHA256SUMS.txt').write_text(''.join(r['sha256']+'  '+r['path']+'\n' for r in source['files']),encoding='utf-8',newline='\n')
archive=BASE/'AgentNexus-M1.5.1-source.zip'
(BASE/'AgentNexus-M1.5.1-source.zip.sha256').write_text(digest(archive)+'  '+archive.name+'\n',encoding='utf-8')
# Manifests do not claim their own hashes; all content rows are independently verifiable.
excluded={'SHA256SUMS.txt','delivery-manifest.json','delivery-manifest.json.sha256'}
files=[]
for p in BASE.rglob('*'):
    if p.is_file() and p.name not in excluded and '__pycache__' not in p.parts:
        files.append({'path':p.relative_to(BASE).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)})
files.sort(key=lambda r:r['path'])
(BASE/'SHA256SUMS.txt').write_text(''.join(r['sha256']+'  '+r['path']+'\n' for r in files),encoding='utf-8',newline='\n')
(BASE/'delivery-manifest.json').write_text(json.dumps({'schema':'agentnexus/delivery-manifest/1.5.1','source_set_sha256':source['set_sha256'],'files':files,'self_exclusions':sorted(excluded),'status':'BLOCKED','regression':'FAIL','cpu':'FAIL'},indent=2)+'\n',encoding='utf-8')
(BASE/'delivery-manifest.json.sha256').write_text(digest(BASE/'delivery-manifest.json')+'  delivery-manifest.json\n',encoding='utf-8')
print(json.dumps({'files':len(files),'source_files':len(source['files']),'preserved_tracked':len(tracked),'source_set_sha256':source['set_sha256'],'links':'PASS'}))
