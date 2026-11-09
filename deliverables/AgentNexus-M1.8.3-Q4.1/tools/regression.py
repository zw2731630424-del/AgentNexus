"""Run the affected Q3 regression from a fresh Q4.1 sandbox; no historical writes."""
import datetime as dt
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from baseline import ROOT, OUT, sha, write

RUN=ROOT/'.workflow-kit/runtime/AgentNexus-M1.8.3-Q4.1'/('regression-'+dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
SRC=RUN/'sandbox/deliverables/AgentNexus-M1.8.3-Q3/source'
shutil.copytree(OUT/'source', SRC)
before={p.relative_to(SRC).as_posix(): sha(p) for p in SRC.rglob('*') if p.is_file()}
env=dict(os.environ)
env['AGENTNEXUS_TEST_DATA_ROOT']=str(RUN/'fixtures')
env['AGENTNEXUS_TYPE_TOOLS']=str(ROOT/'.workflow-kit/runtime/AgentNexus-M1.5/type-tools')
env['AGENTNEXUS_TEST_PYTHON_PATH']=shutil.which('python')
env['AGENTNEXUS_TEST_POWERSHELL_PATH']=shutil.which('pwsh')
env.pop('Q3_RUN_SYNTHETIC_HELPER_UI',None)
stages=[]
def run(name, args):
    p=subprocess.run(args,cwd=SRC,env=env,capture_output=True,timeout=300,creationflags=subprocess.CREATE_NO_WINDOW)
    (RUN/(name+'.stdout.log')).write_bytes(p.stdout); (RUN/(name+'.stderr.log')).write_bytes(p.stderr)
    stages.append({'name':name,'command':list(map(str,args)),'exit_code':p.returncode,'stdout_sha256':sha(RUN/(name+'.stdout.log')),'stderr_sha256':sha(RUN/(name+'.stderr.log'))})
    print(json.dumps({'stage':name,'exit_code':p.returncode}),flush=True)
    return p.stdout.decode('utf-8','replace')
run('strict-typecheck',[shutil.which('node'),'tools/agentnexus/typecheck-m15.mjs'])
names=['m18-vault','m18-ledger','m18-gateway','m18-secret-boundary','m18-authorization','m18-protocol','m18-review-fixes','m181-control','m181-adapter','m182-egress','m183-service','q2-daily','q3-stack']
files=['tests/agentnexus/'+name+'.test.ts' for name in names]+['tests/desktop/'+p.name for p in sorted((SRC/'tests/desktop').glob('*.test.ts'))]
tap=run('affected-regression',[shutil.which('node'),'--test','--test-reporter=tap','--test-concurrency=1',*files])
counts={k:int(v) for k,v in re.findall(r'^# (tests|pass|fail|skipped) (\d+)\s*$',tap,re.M)}
after={p.relative_to(SRC).as_posix():sha(p) for p in SRC.rglob('*') if p.is_file() and '__pycache__' not in p.parts}
unchanged=all(after.get(k)==v for k,v in before.items())
result={'schema':'agentnexus.q41.regression.v1','status':'PASS' if all(s['exit_code']==0 for s in stages) and counts.get('fail')==0 and unchanged else 'FAIL','run':str(RUN),'stages':stages,'counts':counts,'source_unchanged':unchanged,'os_qualification':'NOT_RUN','system_changes':False,'real_key':False,'live_provider':False}
write(RUN/'result.json',result); write(OUT/'evidence/regression.json',result)
dest=OUT/'evidence/regression'/RUN.name; dest.mkdir(parents=True)
for p in RUN.iterdir():
    if p.is_file():shutil.copyfile(p,dest/p.name)
print(json.dumps(result),flush=True)
raise SystemExit(0 if result['status']=='PASS' else 1)
