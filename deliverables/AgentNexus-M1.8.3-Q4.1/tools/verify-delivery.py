"""Read-only exact-byte delivery/history/contract verification. No signing or deployment."""
import json
from pathlib import Path
import re
import subprocess
import zipfile
from baseline import ROOT, OUT, Q3, Q4, sha

errors=[]
def require(ok,name):
    if not ok:errors.append(name)
def read(rel):return json.loads((OUT/rel).read_bytes())
historical={}
for base in [Q3,Q4]:
    lines=(base/'SHA256SUMS').read_text('utf-8-sig').splitlines()
    for line in lines:
        expected,rel=line.split('  ',1);require(sha(base/rel)==expected,'history:'+base.name+':'+rel)
    historical[base.name]=len(lines)
for row in read('evidence/baseline.json')['protected']:
    require(sha(ROOT/row['path'])==row['sha256'],'protected:'+row['path'])
source=read('source-manifest.json')['files']
actual={p.relative_to(OUT/'source').as_posix():sha(p) for p in (OUT/'source').rglob('*') if p.is_file()}
expected={r['path']:r['sha256'] for r in source}
require(actual==expected,'source-exact-file-set-hashes')
with zipfile.ZipFile(OUT/'AgentNexus-M1.8.3-Q4.1-source.zip') as z:
    require({i.filename:__import__('hashlib').sha256(z.read(i)).hexdigest() for i in z.infolist() if not i.is_dir()}==expected,'source-zip-exact')
manifest=read('approval/installation-manifest.json')
payload={p.relative_to(OUT/'payload').as_posix():{'bytes':p.stat().st_size,'sha256':sha(p)} for p in (OUT/'payload').rglob('*') if p.is_file()}
require(payload=={r['path']:{'bytes':r['bytes'],'sha256':r['sha256']} for r in manifest['files']},'payload-exact')
plan=read('approval/qualification-plan.json');approval=read('approval/deployment-approval.json')
require(plan['payload_files']==len(payload)==194 and plan['payload_bytes']==sum(r['bytes'] for r in payload.values()),'payload-totals')
for key,rel in {'installation_manifest_sha256':'approval/installation-manifest.json','service_config_sha256':'approval/candidate/service-config.json','signature_policy_sha256':'approval/signature-policy.json','system_changes_sha256':'approval/system-changes.json','installer_sha256':'source/tools/agentnexus/install-q41-qualification.ps1','verifier_sha256':'signer/AgentNexus.Qualification.Verifier.exe','signer_tool_sha256':'signer/AgentNexus.Qualification.Signer.exe'}.items():
    require(plan[key]==sha(OUT/rel),'plan-binding:'+key)
    require(approval[key]==plan[key],'approval-binding:'+key)
for name in ['windows-attack-results.json','qualification-evidence-19.json']:
    require(sha(OUT/'tests'/name)==sha(Q4/'tests'/name),'historical-os-state:'+name)
for rel in ['approval/qualification-plan.json','approval/candidate/service-config.json','approval/deployment-approval.json']:
    d=read(rel)
    for key in ['real_import','live_provider','production_release','real_ledger_migration','real_import_enabled','live_enabled']:require(d[key] is False,rel+':'+key)
require(approval['deployment_approved'] is False and approval['start_service'] is False,'unsigned-approval')
require(read('approval/certificate-pin.json')['certificate_der_sha256'] is None,'no-user-pin-selected')
require(not (OUT/'approval/qualification-plan.p7s').exists() and not (OUT/'approval/deployment-approval.p7s').exists(),'no-user-signature-fabricated')
test=read('evidence/signing-tests.json');reg=read('evidence/regression.json');build=read('evidence/build.json')
require(test['status']=='PASS' and test['failed']==0 and test['assurance']=='SIMULATED','signing-tests')
require(reg['status']=='PASS' and reg['counts']['fail']==0 and reg['source_unchanged'],'regression')
for stage in build['stages']:
    location='signer' if stage['name'] in ['verifier','signer'] else 'payload'
    name=next(x for x in stage['command'] if x.startswith('/out:'))[5:]
    require(sha(Path(name))==stage['binary_sha256'],'built-bytes:'+stage['name'])
for p in OUT.rglob('*'):
    if p.is_file():require(p.suffix.lower() not in {'.pfx','.p12','.key','.pem'},'private-key-file:'+str(p))
for path in OUT.rglob('*.md'):
    for target in re.findall(r'\]\(([^)]+)\)',path.read_text('utf-8')):
        if '://' not in target and not target.startswith('#'):
            require((path.parent/target.split('#')[0]).exists(),'broken-link:'+str(path.relative_to(OUT))+':'+target)
checksum=OUT/'SHA256SUMS';checksums=0
if checksum.exists() and checksum.read_text('utf-8').strip():
    listed={}
    for line in checksum.read_text('utf-8').splitlines():
        digest,rel=line.split('  ',1);listed[rel]=digest;require(sha(OUT/rel)==digest,'checksum:'+rel)
    current={p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}
    require(current==set(listed),'checksum-exact-file-set');checksums=len(listed)
result={'schema':'agentnexus.q41.delivery-check.v1','status':'FAIL' if errors else 'PASS','errors':errors,'historical_checksums':historical,'source_files':len(source),'payload_files':len(payload),'payload_bytes':plan['payload_bytes'],'bundle_checksum_files':checksums,'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'system_changes':False,'actual_user_signing':'NOT_RUN','os_qualification':'BLOCKED','real_key':False,'live_provider':False}
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(1 if errors else 0)
