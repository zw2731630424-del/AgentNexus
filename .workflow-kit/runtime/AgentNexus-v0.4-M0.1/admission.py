import json,hashlib,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).parent
NEW=ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0.1'
BASE=json.loads((HERE/'baseline.json').read_text('utf-8'))
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(65536),b''):h.update(b)
 return h.hexdigest()
issues=[]
for x in BASE['m0_files']+BASE['protected']:
 p=ROOT/x['path']
 if not p.is_file() or sha(p)!=x['sha256']:issues.append('changed baseline: '+x['path'])
required=['audit_trail_design.md','development_intelligence_design.md','platform_security_windows_linux.md','workflow_license_remediation.md','feature_catalog.md','feature_catalog.json','policy_catalog.md','policy_catalog.json','internal_protocols.md','implementation_plan.md']
for rel in required:
 p=NEW/'architecture'/rel
 if not p.is_file() or p.stat().st_size<400:issues.append('incomplete design: '+rel)
for rel in ['diagnostic_sources.json','platform_sources.json','license_recheck.json']:
 p=NEW/'research'/rel
 if not p.is_file() or p.stat().st_size<400:issues.append('incomplete source evidence: '+rel)
 else:json.loads(p.read_text('utf-8'))
f=json.loads((NEW/'architecture/feature_catalog.json').read_text('utf-8'))['features']
p=json.loads((NEW/'architecture/policy_catalog.json').read_text('utf-8'))['policies']
oldf=json.loads((ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0/architecture/feature_catalog.json').read_text('utf-8'))['features']
oldp=json.loads((ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0/architecture/policy_catalog.json').read_text('utf-8'))['policies']
fm={x['id']:x for x in f};pm={x['id']:x for x in p}
if len(fm)!=len(f) or len(pm)!=len(p):issues.append('duplicate catalog id')
if not set(x['id'] for x in oldf)<=fm.keys() or not set(x['id'] for x in oldp)<=pm.keys():issues.append('missing historical ID')
done=set()
def walk(i,stack):
 if i in stack:issues.append('dependency cycle '+i);return
 if i in done:return
 if i not in fm:issues.append('unknown feature '+i);return
 for dep in fm[i]['depends_on']:walk(dep,stack|{i})
 done.add(i)
for x in f:
 for k in ['description','default','scopes','depends_on','conflicts','config_schema','off_behavior','degradation','recovery','health','audit_requirements','tests']:
  if k not in x:issues.append(x['id']+' missing '+k)
 if any(c not in fm for c in x['conflicts']):issues.append('unknown conflict '+x['id'])
 walk(x['id'],set())
for x in p:
 if set(x['modes'])!={'ENFORCE','AUDIT_ONLY','DISABLED'}:issues.append('mode missing '+x['id'])
 if set(x['test_cases'])!={'positive','negative','bypass','concurrency','recovery','upgrade'}:issues.append('test cases missing '+x['id'])
 if x['level'] not in ['L0','L1','L2','L3']:issues.append('invalid level '+x['id'])
snapshot=[{'path':x.relative_to(ROOT).as_posix(),'bytes':x.stat().st_size,'sha256':sha(x)} for x in sorted((NEW/'architecture').rglob('*')) if x.is_file()]
out={'schema':'agentnexus/m01-admission/1','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'FAIL' if issues else 'PASS','issues':issues,'scope':'Design/baseline admission only, not product acceptance','feature_count':len(f),'policy_count':len(p),'checks':{'m0_immutable':'PASS' if not any('baseline' in x for x in issues) else 'FAIL','catalog_structure':'PASS' if not issues else 'FAIL','independent_local_m1_library':'PASS' if not issues else 'BLOCKED','workflow_kit_code_copy':'BLOCKED','runtime_redistribution_license_closure':'BLOCKED','windows_admin_and_arbitrary_execution':'BLOCKED','ubuntu_admin_and_arbitrary_execution':'BLOCKED','real_model':'NOT_RUN'},'design_snapshot':snapshot}
(HERE/'admission.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf-8')
print(json.dumps({k:out[k] for k in ['status','issues','feature_count','policy_count','checks']},ensure_ascii=False))
raise SystemExit(bool(issues))
