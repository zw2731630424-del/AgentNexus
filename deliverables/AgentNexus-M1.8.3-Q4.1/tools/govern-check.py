"""Execute the unchanged, previously reviewed full governance metadata-cache wrapper."""
import datetime as dt
import json
from pathlib import Path
import subprocess
import sys
from baseline import ROOT, OUT, sha, write

run=ROOT/'.workflow-kit/runtime/AgentNexus-M1.8.3-Q4.1'/('govern-'+dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
run.mkdir(parents=True)
wrapper=ROOT/'.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/govern-cached.py'
write(OUT/'evidence/governance-result.json',{'status':'NOT_RUN','mode':'PENDING_ORIGINAL_FULL_CHECK_WITH_REVIEWED_CACHE','wrapper_sha256':sha(wrapper)})
with (run/'stdout.log').open('wb') as out, (run/'stderr.log').open('wb') as err:
    code=subprocess.run([sys.executable,'-B',str(wrapper)],cwd=ROOT,stdout=out,stderr=err,creationflags=subprocess.CREATE_NO_WINDOW).returncode
lines=(run/'stdout.log').read_text('utf-8',errors='replace').splitlines()
try:metrics=json.loads(lines[-1])
except (ValueError,IndexError):metrics=None
result={'schema':'agentnexus.q41.governance.v1','status':'PASS' if code==0 and metrics and metrics['unchanged_governor_exit']==0 and metrics['fresh_revalidation_changes']==[] else 'FAIL','exit_code':code,'run':str(run),'wrapper_sha256':sha(wrapper),'governor_sha256':sha(ROOT/'ai-workflow-kit-v4/tools/govern.py'),'stdout_sha256':sha(run/'stdout.log'),'stderr_sha256':sha(run/'stderr.log'),'metrics':metrics,'policy_or_baseline_modified':False,'limitation':'Frozen topology metadata memoization; not a general concurrent filesystem equivalence or OS boundary proof.'}
dest=OUT/'evidence/governance';dest.mkdir(parents=True,exist_ok=True)
for name in ['stdout.log','stderr.log']:(dest/name).write_bytes((run/name).read_bytes())
write(OUT/'evidence/governance-result.json',result);print(json.dumps(result),flush=True)
raise SystemExit(0 if result['status']=='PASS' else 1)
