import pathlib,json,hashlib,shutil,zipfile,subprocess,collections,stat,datetime
R=pathlib.Path(__file__).resolve().parents[3];D=R/'deliverables/AgentNexus-M1.4';S=D/'source';T=R/'.workflow-kit/runtime/AgentNexus-M1.4'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(65536),b''):h.update(b)
 return h.hexdigest()
def dump(p,obj):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def copy(a,b):
 b.parent.mkdir(parents=True,exist_ok=True)
 if b.exists():assert sha(a)==sha(b),f'Historical evidence collision: {b}'
 else:shutil.copyfile(a,b)
def reviewcopy(a,b):
 if b.exists() and sha(a)!=sha(b):
  prior=D/'evidence/independent-review/intermediate'/('sha256-'+sha(b)+'-'+b.name)
  copy(b,prior);shutil.copyfile(a,b)
 else:copy(a,b)
def files(root):
 out=[]
 def walk(folder):
  for p in sorted(folder.iterdir()):
   info=p.lstat()
   if stat.S_ISLNK(info.st_mode) or getattr(info,'st_file_attributes',0)&stat.FILE_ATTRIBUTE_REPARSE_POINT:continue
   if stat.S_ISDIR(info.st_mode):walk(p)
   elif stat.S_ISREG(info.st_mode):out.append(p)
 walk(root)
 return out
def inventory(root):return [{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files(root)]
def sethash(entries):return hashlib.sha256(''.join(f['path']+'\0'+f['sha256']+'\n' for f in sorted(entries,key=lambda f:f['path'])).encode()).hexdigest()
def archive(root,destination):
 items=files(root)
 if not destination.exists():
  destination.parent.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(destination,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
   for p in items:z.write(p,p.relative_to(root).as_posix())
 with zipfile.ZipFile(destination) as z:
  assert sorted(z.namelist())==sorted(p.relative_to(root).as_posix() for p in items)
  for p in items:assert hashlib.sha256(z.read(p.relative_to(root).as_posix())).hexdigest()==sha(p),str(p)

runs=[p for p in sorted((T/'verification').iterdir()) if (p/'results.json').exists()]
last=runs[-1];result=json.loads((last/'results.json').read_text('utf-8'));tested=json.loads((last/'source-manifest.json').read_text('utf-8'))
current=inventory(S);assert {f['path']:(f['bytes'],f['sha256']) for f in current}=={f['path']:(f['bytes'],f['sha256']) for f in tested['files']},'Candidate differs from final tested source'
assert sethash(current)==result['source_set_sha256']
for run in runs:
 for name in ['all-tests.tap','events.jsonl','results.json','runner.stdout.txt','runner.stderr.txt','source-manifest.json','syntax.json']:copy(run/name,D/'evidence/runs'/run.name/name)
 archive(run/'workspace',D/'evidence/runs'/run.name/'source-snapshot.zip')
for p in sorted(T.iterdir()):
 if p.is_file() and p.suffix in ('.log','.tap'):copy(p,D/'evidence/development'/p.name)
for name in ['freeze-m14.py','update-catalogs.py','package-m14.py']:
 copy(T/name,D/'evidence/build-tools'/name)
for name in ['whitespace-final.json','powershell-syntax.json']:
 if (T/name).exists():copy(T/name,D/'evidence/development'/name)
for name in ['final-review.md','final-review.json']:
 reviewcopy(T/'independent-review'/name,D/('independent-security-review.md' if name.endswith('.md') else 'independent-security-review.json'))
 reviewcopy(T/'independent-review'/name,D/'evidence/independent-review'/name)
reviewcopy(T/'independent-review/final-review.json',D/'final-review.json')
copy(T/'independent-review/targeted-probe.mjs',D/'evidence/independent-review/targeted-probe.mjs')
probe=T/'independent-review/node-review-6hxiXS'
for p in files(probe):
 if p.name in ['probe-results.json','probe.mjs']:copy(p,D/'evidence/independent-review'/p.name)
archive(last/'data',D/'evidence/final-test-data.zip')
dump(D/'evidence/final-test-data-manifest.json',{'root':str(last/'data'),'files':inventory(last/'data'),'links_not_followed':True})
dump(D/'source-sha256.json',{'schema':'agentnexus/m1.4/source/1','version':'0.4.0-m1.4','files':current,'set_sha256':sethash(current),'algorithm':'SHA256(sorted(path + NUL + lowercase SHA256 + LF))','final_test_run':last.name})
(D/'SOURCE_SHA256SUMS.txt').write_text(''.join(f["sha256"]+'  '+f['path']+'\n' for f in current),encoding='utf-8',newline='\n')
archive(S,D/'AgentNexus-M1.4-source.zip');(D/'AgentNexus-M1.4-source.zip.sha256').write_text(sha(D/'AgentNexus-M1.4-source.zip')+'  AgentNexus-M1.4-source.zip\n',encoding='utf-8')
baseline=json.loads((D/'evidence/phase0/freeze.json').read_text('utf-8'))
changed=[]
for f in baseline['tracked']:
 p=R/f['path']
 if not p.is_file() or sha(p)!=f['sha256']:changed.append(f['path'])
assert not changed,changed
m13=json.loads((R/'deliverables/AgentNexus-M1.3/source-sha256.json').read_text('utf-8'))
intentional=[f['path'] for f in m13['files'] if sha(S/f['path'])!=f['sha256']]
oldf=json.loads((R/'config/agentnexus/features.json').read_text('utf-8'))['features'];newf=json.loads((S/'config/agentnexus/features.json').read_text('utf-8'))['features']
oldp=json.loads((R/'config/agentnexus/policies.json').read_text('utf-8'))['policies'];newp=json.loads((S/'config/agentnexus/policies.json').read_text('utf-8'))['policies']
assert newf[:len(oldf)]==oldf and newp[:len(oldp)]==oldp
old_result=json.loads((R/'deliverables/AgentNexus-M1.3/test-results.json').read_text('utf-8'))
old_names=collections.Counter(c['name'] for c in old_result['cases']);new_names=collections.Counter(c['name'] for c in result['cases']);assert not old_names-new_names
counts=result['summary']['counts'];skipped=[c['name'] for c in result['cases'] if c.get('skip')]
dump(D/'test-results.json',result)
verification={'schema':'agentnexus/m1.4/integrity/1','head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=R,text=True).strip(),'original_tracked_files':len(baseline['tracked']),'original_tracked_unchanged':not changed,'m13_source_set_sha256':m13['set_sha256'],'source_files':len(current),'source_set_sha256':sethash(current),'source_matches_final_run':True,'source_zip_roundtrip':True,'final_data_zip_roundtrip':True,'intentional_m14_candidate_changes_to_cloned_files':intentional,'old_catalog_objects_unchanged':True,'feature_count':len(newf),'policy_count':len(newp),'old_m13_test_names_preserved':True,'system_configuration_changes':False,'commit_push':'NOT_PERFORMED','tsc':'NOT_RUN'}
verification['governance']='PASS' if (T/'governance-final.log').exists() and 'Governance check: PASS' in (T/'governance-final.log').read_text('utf-8') else 'NOT_RUN'
verification['git_whitespace']='PASS_NO_DIAGNOSTICS' if (T/'whitespace-final.log').exists() and (T/'whitespace-final.log').stat().st_size==0 else 'NOT_RUN'
dump(D/'verification.json',verification)
matrix=[
 ('phase0','PASS','Rules, full baseline read/freeze and hash verification'),
 ('host_runtime_identity','BLOCKED','SIMULATED contracts pass; distinct Windows accounts absent'),
 ('remote_permit','PASS','Limited protocol/SQLite/crypto evidence including independent OS Broker fixture; security observation SIMULATED'),
 ('production_broker_deployment','BLOCKED','Production startup/long-lived protected IPC bootstrap not fully deployed'),
 ('windows_native_token_job_file_pipe','PASS','Limited identity, restricted clone, pipe, handle-file and suspended Job tests; CPU qualification is separate'),
 ('cpu_time_hard_limit','INCONCLUSIVE','Historical real FAIL and later PASS; not a stable qualified production guarantee'),
 ('windows_combined_sandbox','BLOCKED','Approved distinct identities/profile and composition evidence absent'),
 ('process_tree_exit','INCONCLUSIVE','Real root/Job/output observations; native historical membership incomplete'),
 ('file_broker','PASS','Limited signed model + real root-relative file owner/adapter; 24KiB native RPC'),
 ('cross_project_host_db_network','NOT_RUN','Actual cross-account composed adversarial tests require deployment'),
 ('production_exit_proof','BLOCKED','Native membership_complete=false and missing isolation facts'),
 ('production_resource_release','BLOCKED','No complete trusted production proof; five claims remain held when uncertain'),
 ('sqlite_reopen_recovery','PASS','Model/real local persistence reopen; no automatic replay or unknown release'),
 ('os_reboot_recovery','NOT_RUN','No machine reboot/hard power-loss test'),
 ('audit_producers','INCONCLUSIVE','Model services integrated; raw native events retained; sustained cross-account production wiring incomplete'),
 ('ubuntu','NOT_RUN','Specification only; no server modifications'),
]
dump(D/'acceptance.json',{'schema':'agentnexus/m1.4/acceptance/1','status':'BLOCKED','source_set_sha256':sethash(current),'test_run':last.name,'test_counts':counts,'scope_status':'PASS' if counts['failed']==0 else 'FAIL','scope':'LIMITED_PROTOCOL_AND_SEPARATE_WINDOWS_PRIMITIVES_NOT_PRODUCTION_COMPOSITION','capabilities':[{'id':a,'status':b,'scope':c} for a,b,c in matrix],'not_run_cases':skipped,'historical_failures_preserved':True,'system_changes':False})
lines=['# M1.4 最终限定验收报告','','**完整Windows生产执行链：BLOCKED。** Phase 0完成；已实现并验证候选协议/控制/原生模块，不能宣称完整安全部署。','',f"最终隔离源码运行 `{last.name}`：**{counts['tests']}项，{counts['passed']} PASS / {counts['skipped']} NOT_RUN / {counts['failed']} FAIL**，exit {result['exit_code']}，未超时。来源按每个用例明确REAL_WINDOWS、REAL_OS_PROCESS/SIMULATED_SECURITY或SIMULATED。",'',f"源码{len(current)}文件集合SHA256：`{sethash(current)}`。Node语法检查通过（不是tsc）；C#经现有PowerShell Add-Type编译和真实测试。历史1829 tracked文件全部原字节保全，原M1.3的206个测试名全部保留，M1.2/M1.3原件不修改。",'','| 能力 | 裁定 | 限定 |','|---|---|---|']
lines += [f'| {a} | {b} | {c} |' for a,b,c in matrix]
lines+=['','## 最终未运行用例','']+['- '+n for n in skipped]
lines+=['','## 已实现及修复','','候选源码包含原审批/Permit的精确桥接、独立消费账本/服务循环/Host门面、Runtime Registry、MAC端点、有界观察/撤销/期限、组合启动候选、真实prepare-resume、目录句柄File Owner、流式Artifact输出、ExitProof签名原件与资源owner桥接。独立Broker进程实际运行固定OS Worker，但peer/Job/qualification仍SIMULATED，不能拼接成真实组合通过。','','独立审查发现的审计字段、输入跨await变更、时钟回拨、未settled配额、循环父链、期限/关闭fence、旧boot/资源版本释放、未验证active遗失、断连operation归属、Artifact导入截止、错误原operation关联及签名原件保全已修复并复核。审查者早期执行限定模型探针；修后主要是只读源码复核，作者执行回归。','','## 仍阻断的边界','','两标准账户与Profile未部署；生产entrypoint/持久IPC私有bootstrap、完整历史成员/父链、网络/其他项目/管理库拒绝、文件/磁盘硬限制、稳定CPU硬预算及真实OS重启缺完整证据。Native始终membership_complete=false，WindowsSupervisor把未实测隔离事实保留false，不能发生产release。系统审批并非这些代码/证据缺口的自动豁免。','','CPU原始记录有真实FAIL和PASS，最终运行中的通过不能覆盖历史不稳定。Token权限缺陷曾真实失败，修复clone句柄权限后隔离内外复测通过；原始失败保留。初次开发依赖/fixture失败与后续回归分别保存，未选择性抹掉失败。','','本轮没有创建账户、修改已有ACL/Profile/防火墙/服务或Ubuntu，没有Provider/API Key/科研执行，没有commit/push。系统修改只按[精确审批清单](deployment-approval.md)另批；Task/生产启用仍标NOT_READY。','','证据：test-results.json、evidence/runs/*（全部原始TAP/JSON/source快照）、evidence/development/*（早期失败与原生CPU/token诊断）、evidence/final-test-data.zip（含实际原生JSONL与合成状态数据）、independent-security-review.md/JSON、verification.json及SHA清单。']
(D/'acceptance-report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
(D/'README.md').write_text(f'''# AgentNexus M1.4 — 独立候选交付

**完整生产部署 BLOCKED。** 最终限定测试{counts['tests']}项：{counts['passed']} PASS / {counts['skipped']} NOT_RUN / {counts['failed']} FAIL。模拟与真实Windows原语严格区分，历史CPU不稳定仍阻断资格。

- [最终验收](acceptance-report.md) · [机器裁定](acceptance.json)
- [Phase 0冻结](phase0-report.md) · [总体设计](design.md) · [协议](protocols.md) · [ADR](adr.md)
- [完整候选源码/测试/工具](source/) · [源码ZIP](AgentNexus-M1.4-source.zip) · [源码SHA](source-sha256.json)
- [Audit覆盖](audit-producer-matrix.md) · [Feature/Policy](feature-policy-catalog.md)
- [资源核实](resource-reconciliation.md) · [24项安全测试矩阵](security-test-matrix.md)
- [独立安全审查](independent-security-review.md) · [完整性核验](verification.json)
- [部署审批](deployment-approval.md) · [Ubuntu规格](ubuntu-adapter-spec.md) · [后续建议与缺口](m15-recommendations.md)
- [原始证据](evidence/) · [交付SHA](SHA256SUMS.txt)

根产品仍为M1.3，1829个原tracked文件不改。本目录source可独立验证；无需npm install。以已存在可信Python/PowerShell的绝对路径设置AGENTNEXUS_TEST_PYTHON_PATH/AGENTNEXUS_TEST_POWERSHELL_PATH，再从source运行 `node tools/agentnexus/verify-m14.mjs --output-root <M1.4临时目录>`。原生测试受宿主/登录环境影响，应保留实际结果；不授予系统配置权限。
''',encoding='utf-8',newline='\n')
dump(D/'change-record.json',{'baseline_head':baseline['head'],'modified_original_files':changed,'candidate_cloned_files_changed':intentional,'new_source_files':[f['path'] for f in current if f['path'] not in {x['path'] for x in m13['files']}],'review':'independent-security-review.json','test_runs':[p.name for p in runs]})
exclude={'SHA256SUMS.txt','delivery-manifest.json','delivery-manifest.json.sha256'}
entries=[f for f in inventory(D) if f['path'] not in exclude]
dump(D/'delivery-manifest.json',{'schema':'agentnexus/m1.4/delivery/1','source_set_sha256':sethash(current),'exact_root_exclusions':sorted(exclude),'files':entries})
(D/'delivery-manifest.json.sha256').write_text(sha(D/'delivery-manifest.json')+'  delivery-manifest.json\n',encoding='utf-8')
(D/'SHA256SUMS.txt').write_text(''.join(f['sha256']+'  '+f['path']+'\n' for f in entries)+sha(D/'delivery-manifest.json')+'  delivery-manifest.json\n',encoding='utf-8',newline='\n')
print(json.dumps({'status':'PACKAGED_BLOCKED','source_files':len(current),'source_hash':sethash(current),'test_counts':counts,'historical_files_unchanged':len(baseline['tracked']),'delivery_files':len(entries),'final_run':last.name}))
