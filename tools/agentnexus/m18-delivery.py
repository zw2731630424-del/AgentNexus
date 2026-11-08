"""M1.8: append-only freeze, inventory and packaging; never changes history."""
from __future__ import annotations
import argparse, hashlib, json, pathlib, shutil, subprocess, datetime

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'deliverables/AgentNexus-M1.8'
RUN = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8'
NAMES = ('src', 'tests', 'tools', 'config', 'package.json', 'package-lock.json', 'tsconfig.json')

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def inventory(root, names=None):
    files = []
    for name in names or [p.name for p in root.iterdir()]:
        target = root / name
        if not target.exists():
            continue
        for p in ([target] if target.is_file() else sorted(target.rglob('*'))):
            if p.is_symlink():
                raise ValueError('LINKED_SOURCE_REFUSED')
            if p.is_file() and '__pycache__' not in p.parts:
                files.append(dict(path=p.relative_to(root).as_posix(), bytes=p.stat().st_size, sha256=digest(p)))
    return sorted(files, key=lambda v: v['path'])

def source_set(files):
    return hashlib.sha256(''.join(f['path']+'\0'+f['sha256']+'\n' for f in files).encode()).hexdigest()

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def freeze():
    baseline = ROOT / 'deliverables/AgentNexus-M1.7/source'
    files = inventory(baseline, NAMES)
    assert source_set(files) == '8167ce3e78c602f43bee2b3a4d792a5054f76d7121a6a7730b14cc37eb5c4c6c'
    # Only original deliverables, root product and task documents. Runtime evidence
    # remains at its original path; delivered historical evidence is also hashed.
    old = [p.name for p in (ROOT/'deliverables').iterdir() if p.name != 'AgentNexus-M1.8']
    history = inventory(ROOT, ['deliverables/'+n for n in old] + ['src','tests','config','README.md','package.json','AGENTS.md'])
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
    record = dict(schema='agentnexus/m1.8/baseline/1', created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  branch=git('branch','--show-current'), head=git('rev-parse','HEAD'),
                  status=git('status','--short','--untracked-files=normal'),
                  baseline_source=files, source_set_sha256=source_set(files), history=history,
                  authorization=dict(real_provider=False, credential_read=False, spending=False, commit_push=False, os_security_changes=False))
    write(RUN/'baseline.json', record)
    dest = OUT/'source'
    dest.mkdir(parents=True, exist_ok=False)
    for name in NAMES:
        p = baseline/name
        if p.is_dir(): shutil.copytree(p, dest/name)
        else: shutil.copy2(p, dest/name)
    assert inventory(dest, NAMES) == files
    print(json.dumps(dict(status='PASS', baseline_files=len(files), history_files=len(history), source_set_sha256=source_set(files))))

def preserve():
    data = json.loads((RUN/'baseline.json').read_text(encoding='utf-8'))
    changed = [f['path'] for f in data['history'] if not (ROOT/f['path']).is_file() or digest(ROOT/f['path']) != f['sha256']]
    result = dict(status='FAIL' if changed else 'PASS', checked_files=len(data['history']), changed=changed)
    print(json.dumps(result))
    if changed: raise SystemExit(1)

def prepare():
    source = OUT/'source'
    verifier = (ROOT/'deliverables/AgentNexus-M1.7/source/tools/agentnexus/verify-m17.mjs').read_text(encoding='utf-8')
    verifier = verifier.replace('m1.7', 'm1.8').replace("'m17'", "'m18'").replace('all|m17', 'all|m18').replace("name.startsWith('m17-')", "name.startsWith('m18-')")
    target = source/'tools/agentnexus/verify-m18.mjs'
    with target.open('x', encoding='utf-8', newline='\n') as f: f.write(verifier)
    for name in ['package.json','package-lock.json']:
        path=source/name
        data=json.loads(path.read_text(encoding='utf-8'))
        data['version']='0.4.0-m1.8'
        if name=='package.json': data['scripts']['verify:m18']='node tools/agentnexus/verify-m18.mjs'
        else: data['packages']['']['version']='0.4.0-m1.8'
        path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps(dict(status='PASS', verifier=str(target))))

def soak():
    source=OUT/'source'
    text=(source/'tools/agentnexus/soak-m17.ts').read_text(encoding='utf-8')
    text=text.replace('duration<=7200000','duration<=86400000').replace('elapsed>=7200000','elapsed>=86400000').replace('agentnexus/m17/','agentnexus/m18/')
    text=text.replace('Math.min(60000,remaining)','Math.min(Math.max(60000,Math.ceil(duration/100)),remaining)')
    text=text.replace('if(untilNext>0)await new Promise<void>(resolve=>setTimeout(resolve,untilNext));',
                      'if(untilNext>0){const idleUntil=performance.now()+untilNext;while(performance.now()<idleUntil)await new Promise<void>(resolve=>setTimeout(resolve,Math.min(60000,Math.max(1,idleUntil-performance.now()))));}')
    text=text.replace("let failure:string|null=null;", "const source_before=await sourceManifest();await writeFile(join(output,'source-before.json'),JSON.stringify(source_before,null,2)+'\\n',{flag:'wx'});\nlet failure:string|null=null;")
    text=text.replace("await h.administration.idleEvents();await h.store.verify();await checkpoint('FINAL');", "await h.administration.idleEvents();await h.store.verify();await checkpoint('FINAL');invariant(JSON.stringify(await sourceManifest())===JSON.stringify(source_before),'SOAK_SOURCE_CHANGED');")
    text += '''
async function sourceManifest(){
  const files:{path:string;sha256:string}[]=[];
  async function visit(folder:string,relative:string){for(const item of await readdir(folder,{withFileTypes:true})){const p=join(folder,item.name),r=relative+'/'+item.name;if(item.isDirectory())await visit(p,r);else if(item.isFile()){const hash=createHash('sha256');for await(const block of createReadStream(p))hash.update(block);files.push({path:r,sha256:hash.digest('hex')});}else throw Error('SOAK_LINKED_SOURCE');}}
  for(const name of ['src','tests','tools','config'])await visit(join(source,name),name);
  for(const name of ['package.json','package-lock.json','tsconfig.json']){const hash=createHash('sha256');for await(const block of createReadStream(join(source,name)))hash.update(block);files.push({path:name,sha256:hash.digest('hex')});}
  return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
'''
    with (source/'tools/agentnexus/soak-m18.ts').open('x',encoding='utf-8',newline='\n') as f:f.write(text)
    print(json.dumps(dict(status='PASS',duration_limit_ms=86400000,max_planned_events=101,provider='SIMULATED')))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['freeze','preserve','prepare','soak'])
    args = parser.parse_args()
    {'freeze':freeze,'preserve':preserve,'prepare':prepare,'soak':soak}[args.action]()
