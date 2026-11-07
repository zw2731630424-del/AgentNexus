"""Reproducible local M1 acceptance; never executes upstream code, models or Git."""
import ast, datetime, hashlib, json, re, subprocess, sys, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
RUN=Path(__file__).parent
DOC=ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0.1'
BASE=json.loads((ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.json').read_text('utf-8'))
checks=[]
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(65536),b''):h.update(b)
 return h.hexdigest()
def write(p,v):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n','utf-8')
def check(name,ok,scope,detail=None):
 checks.append({'id':name,'status':'PASS' if ok else 'FAIL','scope':scope,'detail':detail})
def files():
 paths=[ROOT/'package.json']
 for rel in ['src/agentnexus','tests/agentnexus','config/agentnexus','tools/agentnexus']:
  paths.extend(p for p in (ROOT/rel).rglob('*') if p.is_file())
 return sorted(paths)
def manifest(paths):return [{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in paths]
if '--finalize-delivery' in sys.argv:
 result=json.loads((RUN/'final-verification.json').read_text('utf-8'))
 assert result['status']=='PASS'
 assert manifest(files())==result['candidate_files'], 'Final candidate changed after acceptance'
 control_review=json.loads((RUN/'reviews/control-review.json').read_text('utf-8'))
 storage_review=json.loads((RUN/'reviews/storage-integrity-review.v3.json').read_text('utf-8'))
 assert control_review['status'].startswith('PASS'), control_review['status']
 assert storage_review['status']=='PASS'
 for x in BASE['m0_files']+BASE['protected']:assert sha(ROOT/x['path'])==x['sha256'],x['path']
 totals=result['tests']
 for name,text in [('M1_report.md',f"\n\n<!-- final-results:start -->\n最终本地验收：**{totals['pass']} PASS、{totals['skipped']} NOT_RUN（OS链接权限）、0 FAIL**，共{totals['tests']} tests；{len(result['checks'])}项证据/源码/目录/治理检查通过，候选{len(result['candidate_files'])}文件。真实测试时间UTC：{result['test_run_utc']}；治理超时后仅续跑收尾，原测试日志及第一次源码ZIP均保留。受限本地切片PASS，完整安全部署BLOCKED。\n<!-- final-results:end -->\n"),('M0.1_report.md',f"\n\nM0.1准入后已实际推进[M1受限内核](M1_report.md)，最终真实计数为{totals['pass']}通过/{totals['skipped']}OS链接未运行/0失败；具体范围、未接入生产者和部署阻断见独立M1报告，未改写原M0。\n")]:
  p=DOC/'reports'/name
  body=p.read_text('utf-8')
  if name=='M1_report.md':body=re.sub(r'\n*<!-- final-results:start -->[\s\S]*?<!-- final-results:end -->\n*','',body)
  else:body=re.sub(r'\n*M0\.1准入后已实际推进\[M1受限内核\][\s\S]*$','',body)
  p.write_text(body+text,'utf-8')
 history={'schema':'agentnexus/m1-run-history/1','records':[{'phase':'module_initial_runs','status':'PASS','scope':'Original author module runs retained, not final integrated acceptance','paths':['storage/verification.json','diagnostics/verification.json','integrity/test-run.json']},{'phase':'gateway_initial_integration','status':'FAIL','observed_tests':15,'pass':14,'fail':1,'failure':'AT-REPLAY peer session saw two context records before SQL identity filters were connected','source':'Actual execution transcript chunk 88be73; root added regression and integrated Store filters. Not recast as PASS.'},{'phase':'first_complete_acceptance','status':'PASS','path':'final-run-1/final-verification.json','scope':'Before one-line Store-fault health display clarification; source ZIP and 8 logs preserved'},{'phase':'second_complete_tests','status':'PASS','test_run_utc':result['test_run_utc'],'tests':totals,'tap_sha256':sha(RUN/'all-tests.tap')},{'phase':'governance_60_second_budget','status':'INCONCLUSIVE','reason':'Actual subprocess timeout during final scanning; tests already completed, old final JSON was not used as new acceptance'},{'phase':'resume_governance_and_finalize','status':'PASS','verification_sha256':sha(RUN/'final-verification.json'),'exact_tested_candidate_rechecked':True,'tests_rerun':False,'governance_log_sha256':sha(RUN/'govern-final.log')},{'phase':'storage_v2','status':'NOT_RUN','reason':'Only empty paths were reserved; no test execution or PASS claimed'}]}
 write(RUN/'run-history.json',history)
 changes={'schema':'agentnexus/m01-m1-change-manifest/1','delivery_version':'0.4-m01-m1.1','catalog_revision':2,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'m0_history_preserved':True,'baseline_manifest':{'path':'.workflow-kit/tasks/AgentNexus-v0.4-M0/reports/delivery_manifest.json','sha256':sha(ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0/reports/delivery_manifest.json')},'initial_baseline':{'path':'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.json','sha256':sha(ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.json')},'prior_design_snapshot':'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/design-freeze-v1/admission.json','catalog_changes':{'old_features':108,'current_features':142,'old_policies':22,'current_policies':34,'details':'catalog_changes.json','revision_2_clarifications':['SQL prepare/PRAGMA exclusion consistent across plan/catalog','historical implementation status normalized to NOT_RUN for full current contracts; M0 unchanged']},'product_source_changes':[{'kind':'ADD',**x} for x in result['candidate_files']],'design_changes':['Four requested independent designs','Versioned catalogs and protocols/implementation plan','ADR006-009 and limited UUID artifact layout decision','Source/rights recheck and primary technical evidence'],'fixes':{'control_review':'.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-review.json','control_findings':8,'storage_review':'.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json','storage_findings':3,'additional_root_guards':['Mode/Permit/Approval validity rechecked immediately before effect','Feature health BLOCKED/FAILED while required storage is faulted']},'prohibited_actions_performed':{'research_projects_modified_or_run':False,'formal_experiments':False,'git_commit_or_push':False,'hooks_installed':False,'api_key_scan':False,'os_accounts_acl_firewall_modified':False,'npm_install_or_third_party_product_source_copy':False},'run_history':'.workflow-kit/runtime/AgentNexus-v0.4-M1/run-history.json'}
 write(DOC/'reports/change_manifest.json',changes)
 # Append one final engineering checkpoint before hashing the journal into delivery.
 checkpoint=subprocess.run([sys.executable,'-X','utf8','.workflow-kit/runtime/AgentNexus-v0.4-M0.1/record_change.py','M01_M1_FINAL_ACCEPTANCE',
  '.workflow-kit/tasks/AgentNexus-v0.4-M0.1/architecture','.workflow-kit/tasks/AgentNexus-v0.4-M0.1/reports/M1_report.md','src/agentnexus','tests/agentnexus','config/agentnexus','package.json',
  '.workflow-kit/runtime/AgentNexus-v0.4-M1/final-verification.json','.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/control-review.json','.workflow-kit/runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.v3.json'],cwd=ROOT,capture_output=True,text=True,check=True)
 evidence=[RUN/n for n in ['all-tests.tap','test-results.json','final-verification.json','syntax.json','demo.json','demo.stderr.txt','govern-final.log','license-closure.json','m1-source-final.zip','run-history.json','reviews/control-review.json','reviews/storage-integrity-review.json','reviews/storage-integrity-review.v3.json','storage/verification.json','storage/verification.v3.json','diagnostics/verification.json','diagnostics/verification.v2.json','integrity/implementation.json','integrity/test-run.json']]
 evidence += [ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0.1'/n for n in ['baseline.json','admission.json','engineering-events.jsonl','design-freeze-v1/admission.json']]
 payload=[p for p in DOC.rglob('*') if p.is_file() and p!=DOC/'reports/delivery_manifest.json']+files()+evidence+[ROOT/'inputs/AgentNexus-v0.4-M0.1/user_request.txt']
 payload=sorted(set(payload))
 assert all(p.exists() for p in payload),[str(p) for p in payload if not p.exists()]
 delivery={'schema':'agentnexus/m01-m1-delivery/1','delivery_version':'0.4-m01-m1.1','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'path_base':'I:/AI_AgentNexus','excludes':'Only this exact manifest path; not a basename exclusion','previous_manifest':changes['baseline_manifest'],'files':manifest(payload),'status':'PASS','scope':'Restricted local M0.1/M1 delivery; full deployment remains BLOCKED','deployment_status':'BLOCKED','tests':totals}
 write(DOC/'reports/delivery_manifest.json',delivery)
 assert all(sha(ROOT/x['path'])==x['sha256'] and (ROOT/x['path']).stat().st_size==x['bytes'] for x in delivery['files'])
 assert all(p.stat().st_size>0 for p in DOC.rglob('*') if p.is_file()),'Empty delivery document'
 errors=[]
 for p in DOC.rglob('*.md'):
  for target in re.findall(r'\]\(([^\)]+)\)',p.read_text('utf-8')):
   target=target.strip('<>')
   if re.match(r'(https?://|#)',target):continue
   target=re.sub(r':\d+$','',target.split('#')[0]);dest=Path(target) if re.match(r'^[A-Za-z]:[/\\]',target) else p.parent/target
   if not dest.exists():errors.append([str(p),target])
 assert not errors,errors
 print(json.dumps({'status':'PASS','payload_files':len(payload),'candidate_files':len(result['candidate_files']),'tests':totals,'manifest_sha256':sha(DOC/'reports/delivery_manifest.json'),'engineering_checkpoint':json.loads(checkpoint.stdout)},ensure_ascii=False))
 raise SystemExit(0)
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
reuse='--reuse-local-results' in sys.argv
version=subprocess.run(['node','-e','console.log(JSON.stringify({node:process.version,sqlite:process.versions.sqlite,zstd:process.versions.zstd,platform:process.platform}))'],cwd=ROOT,capture_output=True,text=True,check=True)
versions=json.loads(version.stdout)
check('RUNTIME',versions['node']=='v24.15.0' and tuple(map(int,versions['sqlite'].split('.'))) >= (3,51,3),'Actual installed binding, not a model or OS sandbox test',versions)
changed=[x['path'] for x in BASE['m0_files']+BASE['protected'] if not (ROOT/x['path']).is_file() or sha(ROOT/x['path'])!=x['sha256']]
check('M0_AND_PROTECTED_UNCHANGED',not changed,'24 historical deliverables + 112 original rules/inputs/Kit files',changed)
# Recheck the larger read-only M0 source cache if its frozen prior manifest is available.
preserve=ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0.1/integrity/preservation_before.json'
pd=json.loads(preserve.read_text('utf-8'))
preserved_errors=[]
for rel,info in pd['files'].items():
 p=ROOT/rel
 if not p.is_file() or sha(p)!=info['sha256']:preserved_errors.append(rel)
check('COMPLETE_M0_EVIDENCE_UNCHANGED',not preserved_errors,'11,784 protected M0 source/cache/input/rule files, actual file hashes',{'checked':len(pd['files']),'errors':preserved_errors})
before=manifest(files())
if reuse:
 certificate=json.loads((RUN/'license-closure.json').read_text('utf-8'))
 frozen=[{k:x[k] for k in ['path','bytes','sha256']} for x in certificate['files']]
 check('CACHED_CANDIDATE_MATCH',frozen==before,'Resume only if the exact already-tested source candidate still matches its post-test closure certificate')
 if frozen!=before:raise SystemExit('Cannot resume: source candidate changed')
syntax=[]
for p in files():
 if p.suffix in ['.ts','.mjs','.js']:
  r=subprocess.run(['node','--check',str(p)],cwd=ROOT,capture_output=True,text=True)
  syntax.append({'path':p.relative_to(ROOT).as_posix(),'exit_code':r.returncode,'stderr':r.stderr[:4096]})
 elif p.suffix=='.py':
  try:ast.parse(p.read_text('utf-8'));syntax.append({'path':p.relative_to(ROOT).as_posix(),'exit_code':0,'scope':'Python AST of trusted checker only'})
  except Exception as e:syntax.append({'path':str(p),'exit_code':1,'error':str(e)})
write(RUN/'syntax.json',syntax)
check('SOURCE_SYNTAX',all(x['exit_code']==0 for x in syntax),'Node erasable TypeScript syntax and Python AST; static TypeScript type checking NOT_RUN',{'checked':len(syntax)})
tap=RUN/'all-tests.tap'
if reuse:
 cached_results=json.loads((RUN/'test-results.json').read_text('utf-8'))
 if sha(tap)!=cached_results['tap_sha256']:raise SystemExit('Cannot resume: test log hash mismatch')
 test_exit=cached_results['exit_code']
else:
 with tap.open('wb') as output:
  r=subprocess.run(['node','tools/agentnexus/run-tests.mjs'],cwd=ROOT,stdout=output,stderr=subprocess.STDOUT,timeout=60)
 test_exit=r.returncode
raw=tap.read_text('utf-8',errors='strict')
totals={name:int(re.search(r'^# '+name+r' (\d+)\s*$',raw,re.M).group(1)) for name in ['tests','pass','fail','cancelled','skipped','todo']}
cases=[]
for m in re.finditer(r'^( *)(ok|not ok) (\d+) - (.*)$',raw,re.M):
 tail=m.group(4);name,_,skip=tail.partition(' # SKIP')
 cases.append({'ordinal':len(cases)+1,'tap_local_ordinal':int(m.group(3)),'tap_indent':len(m.group(1)),'name':name,'status':'NOT_RUN' if skip else 'PASS' if m.group(2)=='ok' else 'FAIL','reason':skip.strip() or None})
check('LOCAL_M1_TESTS',test_exit==0 and totals['fail']==totals['cancelled']==totals['todo']==0 and totals['tests']==len(cases),'Real native code/SQLite/Zstd/filesystem/known parser/process tests with synthetic inputs; no real model'+('; reused exact recorded run' if reuse else ''),totals)
if not reuse:write(RUN/'test-results.json',{'utc':stamp,'command':['node','tools/agentnexus/run-tests.mjs'],'exit_code':test_exit,'totals':totals,'cases':cases,'tap_sha256':sha(tap),'scope':'Real local implementations with synthetic data; OS sandbox and models NOT_RUN'})
if reuse:
 demo_exit='recorded run, not rerun'
else:
 with (RUN/'demo.json').open('wb') as out, (RUN/'demo.stderr.txt').open('wb') as err:
  demo=subprocess.run(['node','src/agentnexus/cli.ts','demo'],cwd=ROOT,stdout=out,stderr=err,timeout=30)
 demo_exit=demo.returncode
try:
 d=json.loads((RUN/'demo.json').read_text('utf-8')); demo_ok=(reuse or demo_exit==0) and (RUN/'demo.stderr.txt').stat().st_size==0 and d['echo']['status']=='PASS' and d['diagnostics']['data']['status']=='FAIL' and d['verification']['pending']==0 and d['deployment']['status']=='BLOCKED'
except Exception:d={};demo_ok=False
check('NATIVE_DEMO',demo_ok,'Actual local Tool/Audit/Context/Artifact + JSON checker, explicitly no model/Shell'+('; recorded execution retained' if reuse else ''),{'exit_code':demo_exit,'root':d.get('root'),'verification':d.get('verification')})
after=manifest(files());check('CANDIDATE_STABLE',before==after,'Exact source candidate unchanged throughout all checks')
defs=json.loads((ROOT/'config/agentnexus/features.json').read_text('utf-8'))
policies=json.loads((ROOT/'config/agentnexus/policies.json').read_text('utf-8'))
check('CATALOG_COPY',sha(ROOT/'config/agentnexus/features.json')==sha(DOC/'architecture/feature_catalog.json') and sha(ROOT/'config/agentnexus/policies.json')==sha(DOC/'architecture/policy_catalog.json'),'Runtime receives the reviewed versioned definitions; executable availability separate',{'features':len(defs['features']),'policies':len(policies['policies'])})
pkg=json.loads((ROOT/'package.json').read_text('utf-8'))
imports=[];external=[];bad_local=[]
for p in files():
 if p.suffix not in ['.ts','.mjs','.js']:continue
 for spec in re.findall(r'(?:from\s*|import\s*\(|import\s*)[\'\"]([^\'\"]+)[\'\"]',p.read_text('utf-8')):
  imports.append({'file':p.relative_to(ROOT).as_posix(),'specifier':spec})
  if spec.startswith('.'):
   target=(p.parent/spec).resolve()
   if target not in files():bad_local.append({'file':str(p),'specifier':spec})
  elif not spec.startswith('node:'):external.append(spec)
closure={'schema':'agentnexus/m1-actual-candidate-provenance/1','status':'PASS' if not external and not bad_local and not pkg.get('dependencies') and not pkg.get('devDependencies') else 'FAIL','scope':'Complete introduced local source/test/config/tool/package candidate; no runtime binary redistribution','files':[{**x,'provenance':'independently authored AgentNexus source or generated own catalog','imported_third_party_source':False,'distribution_license':'NOT_SELECTED; no public grant inferred'} for x in after],'javascript_import_edges':imports,'unresolved_imports':external+bad_local,'external_runtime_edges':[{'component':'Node','version':versions['node'],'use':'Installed executable and node:* builtins; SQLite/Zstd embedded','bundled':False,'redistribution_admission':'BLOCKED_PENDING_FULL_DISTRIBUTION_CLOSURE'},{'component':'Python','version':'3.12.10','use':'Host-explicit installed parser; direct stdlib imports ast/json/platform/sys; -I -B -S startup','bundled':False},{'component':'PowerShell','version':'7.6.9','use':'Host-explicit installed Language.Parser/.NET assemblies','bundled':False}],'workflow_kit_code_or_templates_imported':False,'project_public_license_selected':False,'runtime_binary_distribution_closure':'BLOCKED','note':'Source ownership is not inferred from user-supplied Kit; no third-party product expression imported. This is source-candidate closure, not a legal opinion or whole installed runtime audit.'}
write(RUN/'license-closure.json',closure)
check('M1_SOURCE_DEPENDENCY_CLOSURE',closure['status']=='PASS','Zero npm dependencies, complete actually introduced source candidate and node:* edges; external runtime redistribution BLOCKED',{'files':len(after),'import_edges':len(imports),'unresolved':external+bad_local})
links=[]
for p in DOC.rglob('*.md'):
 for target in re.findall(r'\]\(([^\)]+)\)',p.read_text('utf-8')):
  target=target.strip('<>')
  if re.match(r'(https?://|#)',target):continue
  target=re.sub(r':\d+$','',target.split('#')[0])
  dest=Path(target) if re.match(r'^[A-Za-z]:[/\\]',target) else p.parent/target
  if not dest.exists():links.append({'file':p.relative_to(ROOT).as_posix(),'target':target})
check('DELIVERY_LINKS',not links,'Local references in new delivery',links)
with (RUN/'govern-final.log').open('wb') as out:
 gov=subprocess.run([sys.executable,'-X','utf8','ai-workflow-kit-v4/tools/govern.py','check','--target','.'],cwd=ROOT,stdout=out,stderr=subprocess.STDOUT,timeout=240)
check('GOVERNANCE',gov.returncode==0,'Existing lite gates only; no rule edits, hooks, commits or push',{'exit_code':gov.returncode,'log':str((RUN/'govern-final.log').relative_to(ROOT))})
# Candidate is reviewable/recoverable even without Git. Do not overwrite earlier frozen source evidence.
source_manifest={'schema':'agentnexus/m1-source-snapshot/1','utc':stamp,'files':after,'scope':'Only own product/test/config/tools/package source; excludes Kit, caches, runtime binaries and credentials'}
write(DOC/'reports/source_snapshot_manifest.json',source_manifest)
snapshot=RUN/'m1-source-final.zip'
with zipfile.ZipFile(snapshot,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for x in after:z.write(ROOT/x['path'],x['path'])
source_manifest['archive']={'path':snapshot.relative_to(ROOT).as_posix(),'sha256':sha(snapshot),'bytes':snapshot.stat().st_size}
write(DOC/'reports/source_snapshot_manifest.json',source_manifest)
testmap={'schema':'agentnexus/m1-test-matrix/1','scope':'Actual final cases and remaining full policy/OS contracts are separate','totals':totals,'actual_cases':cases,'catalog_policy_contracts':[{'policy_id':x['id'],'full_policy_status':'BLOCKED' if x['level']=='L0' else 'NOT_RUN','reason':'Full owner/OS/model/workflow acceptance not inferred from local kernel tests','test_ids':x['test_ids']} for x in policies['policies']],'not_run':[{'item':s,'status':'NOT_RUN'} for s in ['real provider/model/billing','OS administrator/worker identities','Windows/Ubuntu sandbox adversarial matrix','real external Harness','LSP/SQL/Roslyn/TS/Ruff/YAML/Dockerfile integration','hard power loss and long soak','static TypeScript compiler type check','real scientific experiments (not authorized)']]}
write(DOC/'reports/M1_test_matrix.json',testmap)
result={'schema':'agentnexus/m01-m1-final-verification/1','utc':stamp,'status':'PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL','checks':checks,'tests':totals,'versions':versions,'candidate_files':after,'reused_recorded_tests':reuse,'test_run_utc':cached_results['utc'] if reuse else stamp,'scope':'M0.1 evidence and restricted local M1 kernel only; full deployment BLOCKED','blocked':['unlicensed Kit reuse/distribution','runtime binary redistribution','OS admin authentication and arbitrary execution'],'model_validation':'NOT_RUN','static_type_check':'NOT_RUN'}
write(RUN/'final-verification.json',result)
rows=['# M0.1 / M1 本轮验证','','本记录只验证列明的本地内核和设计证据。操作系统管理员身份、任意执行沙箱、真实模型及长期运行未通过准入。','',f"实际总计：{totals['tests']} tests；{totals['pass']} PASS、{totals['fail']} FAIL、{totals['skipped']} NOT_RUN（测试框架skip）。",'','| 检查 | 状态 | 范围 |','|---|---|---|']
for c in checks:rows.append(f"| {c['id']} | {c['status']} | {c['scope']} |")
rows+=['','四项链接用例若因OS权限未运行，只保留NOT_RUN，不折成PASS。完整日志和机器记录：', '', '- [TAP](../../../runtime/AgentNexus-v0.4-M1/all-tests.tap)', '- [逐项结果](../../../runtime/AgentNexus-v0.4-M1/test-results.json)', '- [总验证JSON](../../../runtime/AgentNexus-v0.4-M1/final-verification.json)', '- [真实本地演示](../../../runtime/AgentNexus-v0.4-M1/demo.json)', '- [实际源码依赖闭包](../../../runtime/AgentNexus-v0.4-M1/license-closure.json)', '- [源码快照](source_snapshot_manifest.json)', '- [测试矩阵与未测项](M1_test_matrix.json)', '', '独立审查发现及修前探针保留在runtime/reviews，修复和最终候选绑定另见M1报告。Node --check/原生类型擦除不是tsc类型检查；后者NOT_RUN。所有输入为自造数据，真实执行的是SQLite/文件/Zstd/固定解析器等，不含模型或正式科研实验。']
(DOC/'reports/verification.md').write_text('\n'.join(rows)+'\n','utf-8')
print(json.dumps({'status':result['status'],'tests':totals,'checks':[(x['id'],x['status']) for x in checks]},ensure_ascii=False))
raise SystemExit(result['status']!='PASS')
