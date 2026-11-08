"""Run the existing full governance check, unchanged, against the same root."""
from pathlib import Path
import datetime, hashlib, json, subprocess, sys, time
ROOT = Path('I:/AI_AgentNexus')
EXTENDED = Path('\\\\?\\I:\\AI_AgentNexus')
OUT = ROOT / 'deliverables/AgentNexus-M1.7/evidence/governance'
OUT.mkdir(parents=True, exist_ok=True)
def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()
normal, extended = ROOT.stat(), EXTENDED.stat()
assert (normal.st_dev, normal.st_ino) == (extended.st_dev, extended.st_ino)
assert not (getattr(normal,'st_file_attributes',0)&0x400)
command=[sys.executable,str(ROOT/'ai-workflow-kit-v4/tools/govern.py'),'check','--target',str(EXTENDED)]
protected=['AGENTS.md','.workflow-kit/governance/policy.json','.workflow-kit/governance/baseline.json']
before={n:sha(ROOT/n) for n in protected}
start=datetime.datetime.now(datetime.timezone.utc).isoformat(); timer=time.perf_counter()
with (OUT/'check.stdout.txt').open('wb') as out, (OUT/'check.stderr.txt').open('wb') as err:
    result=subprocess.run(command,cwd=ROOT,stdout=out,stderr=err)
after={n:sha(ROOT/n) for n in protected}
assert before==after
report={'schema':'agentnexus/m17/governance/1','status':'PASS' if result.returncode==0 else 'FAIL',
    'started_at':start,'ended_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'elapsed_seconds':time.perf_counter()-timer,'command':command,'exit_code':result.returncode,
    'scope':'Existing full root check, not staged-only. No policy, rules, hook, index or tool changes.',
    'extended_path_reason':'Normal Win32 directory enumeration failed at a 259-character retained test path; extended path enumerates the identical root inode without changing policy/scope.',
    'same_root_identity':True,'protected_before':before,'protected_after':after,
    'stdout_sha256':sha(OUT/'check.stdout.txt'),'stderr_sha256':sha(OUT/'check.stderr.txt')}
(OUT/'check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(report,ensure_ascii=False));sys.exit(result.returncode)
