"""Read-only exact-byte closure, history and authority verification; never signs or deploys."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import zipfile
from baseline import ROOT,OUT,Q41,sha

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--skip-checksums',action='store_true')
args=parser.parse_args()
errors=[]; metrics={}
def require(ok,name):
    if not ok: errors.append(name)
def read(rel): return json.loads((OUT/rel).read_bytes())
baseline=read('evidence/baseline.json')
for name,history in baseline['historical'].items():
    base=ROOT/'deliverables'/name
    require(sha(base/'SHA256SUMS')==history['sha256sums_sha256'],'history-sums:'+name)
    for row in history['files']: require(sha(base/row['path'])==row['sha256'],'history:'+name+':'+row['path'])
metrics['historical_files']=sum(len(x['files']) for x in baseline['historical'].values())
for row in baseline['protected']:require(sha(ROOT/row['path'])==row['sha256'],'protected:'+row['path'])
require(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==baseline['head'],'head-changed')
require(subprocess.check_output(['git','status','--short','-uno'],cwd=ROOT,text=True)==baseline['tracked_worktree'],'tracked-worktree-changed')
source=read('source-manifest.json')['files'];expected={x['path']:x['sha256'] for x in source}
actual={p.relative_to(OUT/'source').as_posix():sha(p) for p in (OUT/'source').rglob('*') if p.is_file()}
require(actual==expected and len(actual)==264,'source-exact')
with zipfile.ZipFile(OUT/'AgentNexus-M1.8.3-Q4.2-source.zip') as archive:
    require({i.filename:hashlib.sha256(archive.read(i)).hexdigest() for i in archive.infolist() if not i.is_dir()}==expected,'source-zip-exact')
metrics['source_files']=len(actual)
staging=read('payload-staging-manifest.json')
payload={p.relative_to(OUT/'payload').as_posix():{'bytes':p.stat().st_size,'sha256':sha(p)} for p in (OUT/'payload').rglob('*') if p.is_file()}
require(payload=={r['path']:{'bytes':r['bytes'],'sha256':r['sha256']} for r in staging['files']} and len(payload)==194,'staging-exact')
old=json.loads((Q41/'approval/installation-manifest.json').read_bytes())
metrics['staging_changed_vs_q41']=[r['path'] for r in old['files'] if r['sha256']!=payload[r['path']]['sha256']]
require(set(metrics['staging_changed_vs_q41'])=={'AgentNexusCredential.exe','pipe-client.exe','trusted-credential-helper.exe','credential-launcher.exe'},'unintended-staging-changes')
metrics.update(staging_files=194,staging_bytes=sum(x['bytes'] for x in payload.values()))
for row in read('evidence/review-targets.json')['files']: require(sha(OUT/row['path'])==row['sha256'],'review-target:'+row['path'])
review_sha=sha(OUT/'evidence/review-targets.json')
a=read('evidence/independent-signer-audit.json');b=read('evidence/cms-cng-independent-review.json')
require(not a['open_implementation_findings'] and not b['open_blocking_findings'],'independent-open-findings')
require(a['review_targets_sha256']==review_sha==b['review_target_manifest_sha256'],'independent-review-binding')
for stage in read('evidence/build.json')['stages']:
    path=Path(next(x[5:] for x in stage['command'] if x.startswith('/out:')))
    require(stage['exit_code']==0 and sha(path)==stage['binary_sha256'],'build:'+stage['name'])
    require('/warnaserror+' in stage['command'] and not any('SIGNING_DIAGNOSTIC' in x for x in stage['command']),'release-build-flags')
    for kind in ['stdout','stderr']:
        require(sha(Path(read('evidence/build.json')['run'])/(stage['name']+'.'+kind+'.log'))==stage[kind+'_sha256'],'build-log:'+stage['name']+':'+kind)
sign=read('evidence/signing-tests.json');run=Path(sign['run'])
require(sign['status']=='PASS' and sign['tests']==107 and sign['passed']==107 and sign['failed']==0 and sign['assurance']=='SIMULATED','signing-status')
archive_root=OUT/'evidence/signing-tests'/run.name
for case in sign['cases']:
    for suffix,key in [('.input.json','input_sha256'),('.stdout.log','stdout_sha256'),('.stderr.log','stderr_sha256')]:
        name=case['id']+suffix
        require(sha(run/name)==case[key]==sha(archive_root/name),'signing-case:'+name)
rows=json.loads((archive_root/'runtime-evidence-manifest.json').read_bytes())['files']
with zipfile.ZipFile(archive_root/'SIMULATED-fixtures-and-exports.zip') as archive:
    require({i.filename for i in archive.infolist() if not i.is_dir()}=={r['path'] for r in rows},'simulated-archive-file-set')
    for row in rows:
        require(sha(run/row['path'])==row['sha256']==hashlib.sha256(archive.read(row['path'])).hexdigest(),'raw-simulation:'+row['path'])
metrics['simulated_tests']=107;metrics['raw_signing_files']=len(rows)
prep=read('evidence/preparation-tests.json');require(prep['status']=='PASS' and prep['tests']==14,'preparation-status')
prepared=Path(prep['run'])/'SIMULATED-194-files-NOT-USER-AUTHORITY'
sums={}
for line in (prepared/'SHA256SUMS').read_text('utf-8').splitlines():
    digest,rel=line.split('  ',1);sums[rel]=digest;require(sha(prepared/rel)==digest,'prepared-checksum:'+rel)
require({p.relative_to(prepared).as_posix() for p in prepared.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}==set(sums),'prepared-file-set')
metrics.update(preparation_tests=14,prepared_files=len(sums)+1,prepared_payload_bytes=prep['payload_bytes'])
reg=read('evidence/regression.json');require(reg['status']=='PASS' and reg['counts']=={'tests':229,'pass':224,'fail':0,'skipped':5} and reg['source_unchanged'],'regression-status')
reg_source=Path(reg['run'])/'sandbox/deliverables/AgentNexus-M1.8.3-Q3/source'
require(all(sha(reg_source/rel)==digest for rel,digest in actual.items()),'regression-final-source-snapshot')
metrics['regression_final_source_matches']=True
for stage in reg['stages']:
    for kind in ['stdout','stderr']:
        require(sha(Path(reg['run'])/(stage['name']+'.'+kind+'.log'))==stage[kind+'_sha256'],'regression-log')
for name in ['windows-attack-results.json','qualification-evidence-19.json']:require(sha(OUT/'tests'/name)==sha(Q41/'tests'/name),'historical-os-state:'+name)
matrix=read('tests/signing-requirement-matrix.json')['requirements'];require(len(matrix)==30 and all(x['offline_status']=='PASS' and x['actual_user_cng_tpm']=='NOT_RUN' for x in matrix),'30-requirements')
accept=read('acceptance.json')
require(accept['decision']=='UNSIGNED / NO-GO' and not accept['actual_candidate_created'],'authority-status')
require(all(value is False for value in accept['sections']['E_Deployment'].values()),'deployment-authority')
require(accept['sections']['B_Certificate']['actual_der_sha256_pin'] is None,'actual-pin-selected')
require(not (OUT/'approval').exists() and not (OUT/'preparation-complete.json').exists(),'toolkit-not-final-candidate')
require(read('approval-request/deployment-request.json')['installation_approved'] is False,'request-not-authority')
require(read('evidence/ui-preview.json')['signer_sha256']==sha(OUT/'signer/AgentNexus.Qualification.Signer.exe'),'ui-final-binary')
for p in OUT.rglob('*'):
    if p.is_file(): require(p.suffix.lower() not in {'.pfx','.p12','.key','.pem'},'private-file:'+str(p))
for p in [OUT/'README.md',OUT/'acceptance-report.md',*(OUT/'reports').glob('*.md'),OUT/'signer/README.md',*(OUT/'approval-request').glob('*.md')]:
    for target in re.findall(r'\]\(([^)]+)\)',p.read_text('utf-8')):
        if '://' not in target and not target.startswith('#'):require((p.parent/target.split('#')[0]).exists(),'broken-link:'+str(p)+':'+target)
governance=read('evidence/governance-result.json');require(governance['status']=='PASS','governance')
metrics['governance']='PASS'
if not args.skip_checksums:
    listed={}
    for line in (OUT/'SHA256SUMS').read_text('utf-8').splitlines():
        digest,rel=line.split('  ',1);require(rel not in listed,'duplicate-checksum');listed[rel]=digest;require(sha(OUT/rel)==digest,'checksum:'+rel)
    require({p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and p!=OUT/'SHA256SUMS'}==set(listed),'final-checksum-exact-file-set')
    metrics['checksum_files']=len(listed)
result={'schema':'agentnexus.q42.delivery-check.v1','status':'FAIL' if errors else 'PASS','errors':errors,'metrics':metrics,'review_targets_sha256':review_sha,'actual_user_signing':'NOT_RUN','installation_approved':False,'system_changes':False,'certificate_or_trust_store_changed':False,'private_user_key_used':False}
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(1 if errors else 0)
