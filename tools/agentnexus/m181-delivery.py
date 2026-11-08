"""Append-only M1.8.1 baseline and packaging. Never mutates past deliveries."""
from __future__ import annotations
import datetime, hashlib, json, pathlib, runpy, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'deliverables/AgentNexus-M1.8.1'
RUN = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8.1'
NAMES = ('src', 'tests', 'tools', 'config', 'package.json', 'package-lock.json', 'tsconfig.json')

def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda: f.read(1024*1024), b''): h.update(block)
    return h.hexdigest()

def inventory(root, names=None):
    rows = []
    for name in names or sorted(p.name for p in root.iterdir()):
        p = root/name
        if not p.exists(): continue
        for f in [p] if p.is_file() else sorted(p.rglob('*')):
            if f.is_symlink() or f.is_junction(): raise ValueError('LINK_REFUSED:'+str(f))
            if f.is_file() and '__pycache__' not in f.parts:
                rows.append(dict(path=f.relative_to(root).as_posix(),bytes=f.stat().st_size,sha256=digest(f)))
    return sorted(rows,key=lambda x:x['path'])

def source_set(rows):
    return hashlib.sha256(''.join(r['path']+'\0'+r['sha256']+'\n' for r in rows).encode()).hexdigest()

def write(p, data):
    p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('x',encoding='utf-8',newline='\n') as f: json.dump(data,f,ensure_ascii=False,indent=2); f.write('\n')

def freeze():
    base = ROOT/'deliverables/AgentNexus-M1.8'
    rows = inventory(base/'source',NAMES)
    assert source_set(rows)=='cddca8b1cc71876d8a078018aaac09fc8804df7ce0453b8fd455d150ed5475dc'
    # M1.8's manifest predates a later publication-text update. Preserve, report; never repair history.
    mismatches=[]; checked=0
    for line in (base/'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        if not line.strip(): continue
        h,rel=line.split('  ',1); p=base/rel; checked+=1
        if not p.is_file() or digest(p)!=h: mismatches.append(rel)
    names=['deliverables/'+p.name for p in (ROOT/'deliverables').iterdir() if p.name!='AgentNexus-M1.8.1']
    history=inventory(ROOT,names+['src','tests','config','README.md','package.json','AGENTS.md'])
    def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
    record=dict(schema='agentnexus/m1.8.1/baseline/1',created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        branch=git('branch','--show-current'),head=git('rev-parse','HEAD'),status=git('status','--short'),
        source_set_sha256=source_set(rows),baseline_source=rows,history=history,
        prior_manifest=dict(checked=checked,mismatches=mismatches,status='PASS' if not mismatches else 'DRIFT'),
        authorization=dict(provider='deepseek',total_input_output_tokens=100000000,source_upload=False,os_security_changes=False,commit_push=False))
    write(RUN/'baseline.json',record)
    OUT.mkdir(parents=True,exist_ok=False)
    shutil.copytree(base/'source',OUT/'source')
    assert inventory(OUT/'source',NAMES)==rows
    write(OUT/'evidence/baseline.json',record)
    print(json.dumps(dict(status='PASS',files=len(rows),history_files=len(history),source_set_sha256=source_set(rows),prior_manifest=record['prior_manifest'])))

def preserve():
    b=json.loads((RUN/'baseline.json').read_text(encoding='utf-8'))
    changed=[r['path'] for r in b['history'] if not (ROOT/r['path']).is_file() or digest(ROOT/r['path'])!=r['sha256']]
    result=dict(status='FAIL' if changed else 'PASS',checked_files=len(b['history']),changed=changed)
    print(json.dumps(result))
    return result

def prepare():
    source=OUT/'source'
    text=(source/'tools/agentnexus/verify-m18.mjs').read_text(encoding='utf-8')
    text=text.replace('m1.8','m1.8.1').replace("['all', 'm18']","['all', 'm181', 'model']").replace('all|m18','all|m181|model')
    text=text.replace("(suite === 'all' || name.startsWith('m18-'))", "(suite === 'all' || (suite === 'm181' ? name.startsWith('m181-') : /^m18(?:1)?-/.test(name)))")
    with (source/'tools/agentnexus/verify-m181.mjs').open('x',encoding='utf-8',newline='\n') as f:f.write(text)
    for name in ['package.json','package-lock.json']:
        path=source/name;data=json.loads(path.read_text(encoding='utf-8'));data['version']='0.4.0-m1.8.1'
        if name=='package.json':data['scripts']['verify:m181']='node tools/agentnexus/verify-m181.mjs'
        else:data['packages']['']['version']='0.4.0-m1.8.1'
        path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(dict(status='PASS',verifier=str(source/'tools/agentnexus/verify-m181.mjs'))))

def package():
    result=preserve(); assert result['status']=='PASS'
    write(OUT/'evidence/history-preservation.json',result)
    rows=inventory(OUT/'source',NAMES)
    write(OUT/'source.manifest.json',dict(files=rows,set_sha256=source_set(rows),encoding='UTF8(path + NUL + sha256 + LF)'))
    b=json.loads((RUN/'baseline.json').read_text(encoding='utf-8'))
    old={r['path']:r['sha256'] for r in b['baseline_source']}
    write(OUT/'evidence/source-changes.json',dict(changed=[r for r in rows if old.get(r['path'])!=r['sha256']],removed=sorted(set(old)-{r['path'] for r in rows})))
    # The original full-root gate has finished. Its resulting evidence and the
    # final hash manifest are new deliverable files: validate these final paths
    # with the unmodified governance path/classification functions as well.
    sys.dont_write_bytecode=True
    govern=runpy.run_path(str(ROOT/'ai-workflow-kit-v4/tools/govern.py'),run_name='m181_final_delta')
    policy=json.loads((ROOT/'.workflow-kit/governance/policy.json').read_text(encoding='utf-8'))
    state=json.loads((ROOT/'.workflow-kit/governance/baseline.json').read_text(encoding='utf-8'))
    pending=['SHA256SUMS.txt','evidence/governance/final-delta.json']
    paths=sorted({r['path'] for r in inventory(OUT)}|set(pending));checked=[]
    for path in paths:
        rel='deliverables/AgentNexus-M1.8.1/'+path
        govern['path_at'](ROOT,rel)
        category=govern['classify'](rel,policy,state)
        assert category=='deliverable',(rel,category)
        checked.append(dict(path=rel,category=category))
    write(OUT/'evidence/governance/final-delta.json',dict(status='PASS',full_root_log='root-check.txt',
        scope='All final M1.8.1 delivery paths, including expected hash manifest; original path_at/classify functions, no skips/overrides',checked=checked))
    shutil.copy2(pathlib.Path(__file__),OUT/'build-tools/m181-delivery.py')
    files=inventory(OUT)
    with (OUT/'SHA256SUMS.txt').open('x',encoding='utf-8',newline='\n') as f:
        f.write(''.join(r['sha256']+'  '+r['path']+'\n' for r in files))
    print(json.dumps(dict(status='PASS',source_files=len(rows),set_sha256=source_set(rows),delivery_files=len(files))))

if __name__=='__main__':
    {'freeze':freeze,'preserve':preserve,'prepare':prepare,'package':package}[sys.argv[1]]()
