# AgentNexus M1 Auxiliary and Historical Source — Part 1

独立列出的M0.1开发辅助与M1旧版源码。当前M1 Host不加载这些文件；不得与当前实现混淆，也不得因保留代码而把未运行合同标为通过。

## .workflow-kit/runtime/AgentNexus-v0.4-M0.1/admission.py

类别：`development_only_M01_utility`；原始字节数：3886。

源文件 SHA256：

```text
ff6b782bb523146559da458145f38a1ffbc27f460da12d048942b72ec14cbeba
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0035","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/admission.py","bytes":3886,"sha256":"ff6b782bb523146559da458145f38a1ffbc27f460da12d048942b72ec14cbeba","language":"python","fence":"```","wrapper_padding_newline":false,"category":"development_only_M01_utility","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/admission.py"}} -->
```python
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
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.py

类别：`development_only_M01_utility`；原始字节数：1516。

源文件 SHA256：

```text
92acd8c3a91b4481ee2562c2fa3d70cc5b7dd3411fc41b4ba1e5b987bdfefc98
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0036","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.py","bytes":1516,"sha256":"92acd8c3a91b4481ee2562c2fa3d70cc5b7dd3411fc41b4ba1e5b987bdfefc98","language":"python","fence":"```","wrapper_padding_newline":false,"category":"development_only_M01_utility","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/baseline.py"}} -->
```python
import hashlib, json, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OLD = ROOT / '.workflow-kit/tasks/AgentNexus-v0.4-M0'
OUT = Path(__file__).parent
def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as stream:
        for chunk in iter(lambda: stream.read(65536), b''): h.update(chunk)
    return h.hexdigest()
manifest = json.loads((OLD/'reports/delivery_manifest.json').read_text('utf-8-sig'))
errors = [r['path'] for r in manifest['files'] if sha(OLD/r['path']) != r['sha256'] or (OLD/r['path']).stat().st_size != r['bytes']]
files = [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in sorted(OLD.rglob('*')) if p.is_file()]
protected = [ROOT/'AGENTS.md', ROOT/'.workflow-kit/governance/policy.json']
protected += [p for p in (ROOT/'ai-workflow-kit-v4').rglob('*') if p.is_file()]
protected += [p for p in (ROOT/'inputs/AgentNexus-v0.4').rglob('*') if p.is_file()]
data = {'schema': 'agentnexus/m0.1-baseline/1', 'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'm0_manifest_verified': not errors, 'errors': errors, 'm0_files': files, 'protected': [{'path':p.relative_to(ROOT).as_posix(), 'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(protected)]}
(OUT/'baseline.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf-8')
print(json.dumps({'status':'PASS' if not errors else 'FAIL','m0_files':len(files),'protected':len(protected),'errors':errors}))
if errors: raise SystemExit(1)
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M0.1/build_catalogs.py

类别：`development_only_M01_utility`；原始字节数：17808。

源文件 SHA256：

```text
7e2a3c4ce49658145c5e1def89f1815bc88b3d22af43193aa2531d002e743c22
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0037","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/build_catalogs.py","bytes":17808,"sha256":"7e2a3c4ce49658145c5e1def89f1815bc88b3d22af43193aa2531d002e743c22","language":"python","fence":"```","wrapper_padding_newline":false,"category":"development_only_M01_utility","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/build_catalogs.py"}} -->
```python
import json, hashlib, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OLD=ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0'
NEW=ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0.1'
def dump(path,obj):
 p=NEW/path
 if not p.exists():
  subprocess.run(['python','-X','utf8',str(ROOT/'ai-workflow-kit-v4/tools/govern.py'),'new','--target',str(ROOT),'--path',p.relative_to(ROOT).as_posix()],check=True,capture_output=True)
 p.write_text((json.dumps(obj,ensure_ascii=False,indent=2) if not isinstance(obj,str) else obj)+'\n','utf-8')
def sha(b):return hashlib.sha256(b).hexdigest()
f=json.loads((OLD/'architecture/feature_catalog.json').read_text('utf-8'))
changes=[]
for x in f['features']:
 x['previous_definition_sha256']=sha(json.dumps(x,sort_keys=True,ensure_ascii=False).encode())
 x['audit_requirements']=['FEATURE_CHANGE_PREPARED','FEATURE_CHANGE_COMMITTED','FEATURE_CHANGE_FAILED','MODULE_RECOVERY','绑定可信actor/reason/scope/revision/epoch/impact_ref；核心操作审计不受本开关影响']
 x['degradation']=x['off_behavior']
 x['version']='0.2-design'
 x['implementation_status']='NOT_RUN'
 x['runtime_admission']='NOT_RUN: catalog definition does not register executable code'
 added_deps=[]
 if x['id'].startswith('tool.') or x['id']=='model.gateway': added_deps=['core.audit.trail','core.artifact.store']
 if x['id']=='core.archive.raw':added_deps=['core.artifact.store']
 if x['id']=='core.admin-audit':added_deps=['core.audit.trail']
 if x['id']=='wf.decisions':added_deps=['core.decision.ledger']
 x['depends_on']+= [i for i in added_deps if i not in x['depends_on']]
 changes.append({'kind':'SUPPLEMENT','id':x['id'],'changes':['version','implementation_status','previous_definition_sha256','audit_requirements','degradation','runtime_admission']+(['depends_on'] if added_deps else []),'added_dependencies':added_deps})
def add(i,desc,default,deps,off,recover,kind='OPTIONAL',scopes=None,limits=None):
 x={'id':i,'name':desc.split('；')[0],'description':desc,'version':'0.2-design','kind':kind,'implementation_status':'NOT_RUN','default':default,'scopes':scopes or (['G'] if kind=='CORE' else ['G','P','A','T']),'depends_on':deps,'conflicts':[], 'risk':'CRITICAL' if kind=='CORE' else 'HIGH' if i.startswith('sandbox.') else 'LOW','controller':'TRUSTED_ADMIN','agent_writable':False,'config_schema':{'type':'object','additionalProperties':False,'required':['state'],'properties':{'state':{'enum':['ON'] if kind=='CORE' else ['ON','OFF','INHERIT']},**(limits or {})}},'pre_enable':'预检依赖、后端版本/能力、作用域与授权；不自动安装依赖或启动替代模块','pre_disable':'冻结新派发、撤销epoch、取消并排空自有工作；失败保留QUIESCING/FAILED','off_behavior':off,'degradation':off,'recovery':recover,'admin_confirmation':kind=='CORE' or i.startswith('sandbox.'),'health':['ENABLED','DISABLED','DEGRADED','FAILED','RECOVERING','QUIESCING'],'observability':['config_revision','desired_state','effective_state','epoch','owned_processes','queue_bytes','last_error','last_switch_event'],'audit_requirements':['FEATURE_CHANGE_PREPARED','FEATURE_CHANGE_COMMITTED','FEATURE_CHANGE_FAILED','MODULE_RECOVERY','操作记录包含actor/project/task/session、参数安全Ref和配置版本；禁止此开关关闭核心审计'],'tests':[i+'-'+s for s in ['POS','NEG','OFF','BYPASS','RACE','RECOVERY']],'runtime_admission':'NOT_RUN: implementation evidence recorded separately'}
 f['features'].append(x);changes.append({'kind':'ADD','id':i})
for i,d in [('core.audit.trail','全操作事实审计；与交互原文分域，执行前耐久意图，结果失败保留不确定状态'),('core.artifact.store','流式内容寻址产物存储；对象hash/长度/敏感等级与引用，不向DB塞大日志'),('core.decision.ledger','正式决策账本；追加PROPOSED/ACCEPTED/SUPERSEDED，批准来自可信权限')]:
 add(i,d,'ON',['core.state'], '核心不可关闭；不可写时冻结相关动作并保留只读恢复','验证追加链/对象/索引后由管理员恢复，不重放历史动作',kind='CORE')
for i,d,default,off in [
 ('audit.task-reconstruction','按Task还原执行时间线；只读分页连接操作/交互/产物/决策','ON','停止自动组装时间线；手动只读读取原始审计分页'),
 ('audit.integrity-background','审计段定期校验；每次写入/读取必要hash验证独立存在','ON','停止定期扫描；写入和读取校验仍必需'),
 ('audit.export','导出安全化审计包；不默认网络发送','OFF','取消导出流并保留未完成标记；原始审计继续'),
 ('audit.diagnostic-logs','可选诊断日志；不是操作事实的权威来源','OFF','停止诊断输出和对应定时器，核心操作审计仍必写'),
 ('audit.external-anchor','独立外部审计锚定；只有显式目标及授权才外发hash','OFF','停止外发和重试；显示锚点陈旧，核心本地链继续')]:
 add(i,d,default,['core.audit.trail'],off,'人工预检后按最后已确认cursor继续，不补执行命令',scopes=['G','P'])
add('devint.runtime','开发智能检查编排；syntax/args/environment/safety/authorization五维分离','ON',['core.audit.trail'], '停止全部自有检查；每次调用记BYPASSED/VALIDATION_BYPASSED，权限和沙箱独立继续','恢复依赖与解析器版本后接受新检查；旧版本结果作废',limits={'max_source_bytes':{'type':'integer','minimum':1,'maximum':1048576},'timeout_ms':{'type':'integer','minimum':10,'maximum':30000}})
for i,d,off in [
 ('command-parser','命令AST解析；保留dialect/源hash，不求值alias或动态表达式','不调用parser；syntax未知而非PASS'),
 ('syntax-validator','语法检查；成熟parser/compiler返回语法诊断','syntax=BYPASSED/VALIDATION_BYPASSED'),
 ('command-linter','命令静态建议；ShellCheck等检查结果不能授权','停止建议，保留已启用语法检查'),
 ('argument-validator','版本化CLI参数schema检查；不执行项目CLI的help探测','args=BYPASSED；Tool Schema独立有效'),
 ('safety-preflight','静态风险提示；与授权及OS能力分离','safety=BYPASSED；不关闭PEP/OS边界'),
 ('environment-checker','执行环境版本/路径/能力核对；不推断依赖自动安装','environment=BYPASSED；必需执行器能力仍由owner核验'),
 ('command-preview','显示最终参数/目录/影响；预览hash绑定审批对象','不生成可选预览；可信审批仍须显示必要授权对象'),
 ('code-diagnostics','代码实时诊断；绑定URI/version/source hash并取消旧请求','取消后台诊断，清理已发布结果；手工检查须明确发起')]:
 add('devint.'+i,d,'ON',['devint.runtime'],off,'新请求重新检查；不复用旧文档/配置epoch结果')
for lang,desc,default in [('python','Python AST与可选Ruff；AST不执行目标文件','ON'),('csharp','C# Roslyn语法树；不加载项目Analyzer','OFF'),('javascript','JS Compiler/ESLint诊断；项目插件需受控','OFF'),('typescript','TS Compiler语法与类型诊断；类型剥离不能充当类型检查','OFF'),('json','JSON.parse文法校验；大型输入受限','ON'),('yaml','成熟YAML parser；限制alias/自定义tag/递归','OFF'),('sql','后续成熟方言parser；SQLite任意prepare含PRAGMA副作用不能充当纯解析，M1 NOT_RUN','ON'),('dockerfile','成熟Dockerfile parser；不运行docker build','OFF')]:
 add('devint.code.'+lang,desc,default,['devint.code-diagnostics','devint.syntax-validator'],'取消该语言诊断；该维BYPASSED，不启用别的parser','验证明确版本后对新文档重检，不补跑旧源码')
for lang,desc,default in [('bash','Bash -n/ShellCheck；不执行源脚本','OFF'),('zsh','Zsh原生语法检查；不按Bash结果冒充Zsh','OFF'),('powershell','PowerShell Language.Parser AST；源文本stdin不eval','ON'),('git','Git argv schema与危险参数识别；不运行Git操作','ON'),('python-cli','Python CLI参数schema；-c/-m属于执行内容另需授权','ON'),('docker-cli','Docker CLI版本schema；daemon与挂载能力独立核验','OFF'),('custom-cli','管理员注册自定义CLI schema；未知选项INCONCLUSIVE','OFF')]:
 add('devint.command.'+lang,desc,default,['devint.command-parser','devint.argument-validator'],'停该命令族检查并记BYPASSED，不运行目标命令','人工注册/确认版本后新请求检查，不静默探测help')
for platform in ['windows','ubuntu']:
 add('sandbox.'+platform,platform+'组合隔离后端；独立身份/FS/网络/进程树各有实测能力，不按函数名认定完整沙箱','OFF',['security.os-sandbox','core.audit.trail'],'停止创建执行器，取消/核对自有进程树；不得自动本机无沙箱回退','管理员预检全部请求能力与绕过测试后启用；失败保持BLOCKED',scopes=['G','P'])
f.update(schema_version='0.2-design',status='M0.1 design; runtime evidence separate',baseline={'path':'../../AgentNexus-v0.4-M0/architecture/feature_catalog.json','sha256':sha((OLD/'architecture/feature_catalog.json').read_bytes()),'count':108},change_log=changes)
dump('architecture/feature_catalog.json',f)
rows=['# Feature Catalog v0.2 — M0.1','',f"现版本{len(f['features'])}项；保留原108项定义来源及逐项指纹，新增{len(f['features'])-108}项。历史[M0 JSON](../../AgentNexus-v0.4-M0/architecture/feature_catalog.json)原样保留。机器定义[JSON](feature_catalog.json)是完整合同，下面为索引。",'', '所有定义都有scope/dependency/conflict/schema/off/degradation/recovery/health/audit/test ID。运行状态与设计默认值分开；未注册模块不能因default ON被报告ENABLED。管理员通道、祖先OFF、原子依赖关闭与epoch遵循M0，库状态机通过不等于OS隔离通过。','','| ID | 默认 | 依赖 | 关闭/降级 |','|---|---|---|---|']
for x in f['features']:rows.append('| '+ ' | '.join([x['id'],x['default'],','.join(x['depends_on']) or '无',x['off_behavior'].replace('|','/')])+' |')
dump('architecture/feature_catalog.md','\n'.join(rows))
p=json.loads((OLD/'architecture/policy_catalog.json').read_text('utf-8'))
newpol=[
 ('P.AUDIT_REQUIRED','L0','Audit Writer / Tool Gateway',False,'实际动作前持久化意图、动作后记录结果；核心审计关闭请求拒绝','审计写失败时执行计数必须为0；已执行结果失败保留claim'),
 ('P.ARTIFACT_INTEGRITY','L0','Artifact Store',False,'流式对象hash/长度/访问域核验；不把不完整对象当完整结果','篡改/截断/错误hash读取拒绝；并发相同hash发布不覆盖'),
 ('P.EVIDENCE_DOMAINS','L0','Archive / Audit / Decision owners',False,'交互、操作、产物、决定分域；更正追加，声明不伪装实际执行','把模型说已执行注入audit实际成功状态必须拒绝'),
 ('P.REPLAY_READONLY','L0','Task Reconstruction API',False,'Replay只读重建，不持有executor或签发permit能力','历史shell文本被导入重建时外部执行计数为0'),
 ('P.DI_NOEXEC','L0','Diagnostic Process Adapter',False,'解析器只解析，固定可信argv，stdin源文本不eval，不加载项目插件','含命令替换/写文件/导入副作用的源码检查不得产生目标副作用'),
 ('P.DI_SYNTAX','L2','Development Intelligence / PDP',True,'启用语法检查时FAIL阻断对应已接入命令；缺检查器明确NOT_RUN','故意缺右括号不能标PASS；OFF为VALIDATION_BYPASSED'),
 ('P.DI_ARGUMENTS','L2','Versioned CLI Schema / PDP',True,'参数按明确版本schema验证；未知CLI或动态解析INCONCLUSIVE','未知参数/缺值/--边界分开，不能仅语法PASS批准'),
 ('P.DI_ENVIRONMENT','L2','Environment Checker / PDP',True,'核实执行文件版本与所需能力；不自动安装或执行用户help','缺二进制/版本不匹配不能PASS；检查OFF不免除executor能力'),
 ('P.COMMAND_RISK','L1','PDP / Approval Service',True,'已接入的静态高风险操作需人工审批；底层scope/科研能力独立','安全提示关闭或AUDIT_ONLY不能授予沙箱/文件/科研能力'),
 ('P.SANDBOX_CAPABILITY','L0','Capability Broker / Sandbox',False,'逐平台逐能力实测profile；未验证任意shell和外部Harness拒绝','伪造sandbox=true、只给token/Job回执均不能获得完整执行'),
 ('P.PACKAGE_INTEGRITY','L0','Native Package Verifier',False,'完整相对路径双向集合/hash验证；拒绝重复/冲突/链接/逃逸','新增嵌套SHA256SUMS、遗漏/恶意文件必须FAIL；TOCTOU不闭合不发行'),
 ('P.RESOURCE_BOUNDS','L0','Stream / Queue / Process owners',False,'按字节背压、分段与并发上限；触顶拒绝/暂停，不删原文','超大单chunk/并发队列满/输出限额必须有明确终态并保留durable prefix')]
for i,l,o,d,e,t in newpol:
 p['policies'].append({'id':i,'level':l,'enforcement_owner':o,'scope':'project/task/resource','default_mode':'ENFORCE','degradable':d,'risk':'HIGH','modes':{'ENFORCE':e,'AUDIT_ONLY':('仅管理员精确选定此可降级条款才记录would-deny并继续；未选仍ENFORCE' if d else e+'；独立owner持续执行'),'DISABLED':('选定范围不调用此应用PDP，记BYPASSED；独立owner仍有效' if d else e+'；独立owner持续执行')},'test_ids':[i+'-'+s for s in ['POS','NEG','BYPASS','RACE','RECOVERY','UPGRADE','MODE']],'implementation_status':'NOT_RUN','source':'M0.1 user requirements / native independent design','failure':'owner unavailable freezes dependent execution; no automatic bypass','specific_test':t})
specific={
 'P.IDENTITY':'伪造payload actor/admin不能改变认证subject', 'P.FS_SCOPE':'../、ADS、UNC、链接置换不能取得工作区外句柄', 'P.REVIEW_RO':'Reviewer写候选树应被OS拒绝', 'P.ARCHIVE_APPEND':'旧raw UPDATE/DELETE与摘要覆盖被拒绝', 'P.SECRET_BOUNDARY':'worker环境/模型/普通log无真实Key，未授权读取拒绝', 'P.DB_ATOMIC':'16并发claim一个胜者；rollback不留半个状态/outbox', 'P.EXPERIMENT_ONCE':'相同协议seed再次claim拒绝，UNKNOWN不可重置', 'P.WORKSPACE_WRITER':'旧writer仍活不得发新fence；expected hash失配拒绝', 'P.BUDGET_HARD':'共享Account换Key不能多领取预算，未知账单保留预留', 'P.ADMIN_MODE':'Agent无控制句柄；错peer/重复challenge/过期冻结拒绝', 'P.APPROVAL_REPLAY':'不同参数/主体/期限/epoch与已消费permit拒绝', 'P.TOOL_CONTRACT':'未知tool/version/schema无执行；注册只读声明不能提升能力', 'P.GIT_PUBLISH':'无明确repo/remote/ref/candidate人工授权不得publish', 'P.DATA_DELETE':'精确资源/参数变动后旧批准拒绝', 'P.INSTALL':'依赖lifecycle脚本无独立批准不得执行', 'P.PROJECT_RULE_CHANGE':'工作区文本不能自授规则变更', 'P.EXPERIMENT_APPROVAL':'通用Policy DISABLED不创建专属科研授权', 'P.BUDGET_INCREASE':'payload预算加大不改可信账户额度', 'P.REVIEW_BINDING':'新candidate/rules/profile使旧PASS失效', 'P.WORKFLOW_GATES':'Gate OFF为BYPASSED，未运行仍NOT_RUN', 'P.SCIENTIFIC_CLAIM':'模拟/空证据不能转换真实验证PASS', 'P.STYLE':'OFF不调用linter，提示不可充当安全约束'}
for x in p['policies']:
 case=x.get('specific_test',specific.get(x['id']))
 ids=set(x['test_ids'])
 for s in ['POS','NEG','BYPASS','RACE','RECOVERY','UPGRADE','MODE']:ids.add(x['id']+'-'+s)
 x['test_ids']=sorted(ids)
 x['version']='0.2-design'
 x['test_cases']={'positive':'已认证合法请求满足 '+x['modes']['ENFORCE']+'，写关联证据','negative':case,'bypass':case+'；直接通道/关闭可选模块/三模式逐一验证','concurrency':'同一scope/资源两请求竞争；'+case+'，事务/fence不得被覆盖','recovery':'在判断、claim、执行前后注入故障/重启；'+case+'，未知结果不重跑','upgrade':'更换配置/规则版本使旧许可或诊断失效，历史原文不改'}
 x['test_status']={k:'NOT_RUN' for k in x['test_cases']}
 x['audit_requirements']=['operation_id','event_id','trusted_actor','scope','policy_id/revision','effective_mode','original_verdict','enforced_or_bypassed','authorization_ref','epoch','evidence_refs']
p.update(schema_version='0.2-design',status='M0.1 design; all test results separately evidenced',baseline={'path':'../../AgentNexus-v0.4-M0/architecture/policy_catalog.json','sha256':sha((OLD/'architecture/policy_catalog.json').read_bytes()),'count':22},change_log=[{'kind':'SUPPLEMENT','id':x['id'],'fields':['version','test_cases','test_status','audit_requirements']} for x in p['policies'][:22]]+[{'kind':'ADD','id':x['id']} for x in p['policies'][22:]])
dump('architecture/policy_catalog.json',p)
rows=['# Policy Catalog v0.2 — M0.1','',f"共{len(p['policies'])}条，历史22条保留在[M0](../../AgentNexus-v0.4-M0/architecture/policy_catalog.json)。JSON包含每条正/反/绕过/并发/恢复/升级测试，全部初始NOT_RUN，不能由目录检查授予实现PASS。",'', 'ENFORCE正常阻断；AUDIT_ONLY只放宽管理员精确选择的degradable条款并保留原判定；DISABLED真实不调用选定应用PDP、写BYPASSED。L0和明确独立owner继续执行；PDP故障不自动降级。管理员控制部署门、到期冻结与恢复预检沿用M0及本轮内部协议。','','| ID/级别 | Owner | 可降级 | ENFORCE及必要负例 |','|---|---|---|---|']
for x in p['policies']:rows.append(f"| {x['id']} / {x['level']} | {x['enforcement_owner']} | {x['degradable']} | {x['modes']['ENFORCE']}；{x['test_cases']['negative']} |")
dump('architecture/policy_catalog.md','\n'.join(rows))
dump('reports/catalog_changes.json',{'baseline_feature_count':108,'feature_count':len(f['features']),'feature_changes':changes,'baseline_policy_count':22,'policy_count':len(p['policies']),'policy_changes':p['change_log']})
print(json.dumps({'features':len(f['features']),'policies':len(p['policies'])}))
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M0.1/record_change.py

类别：`development_only_M01_utility`；原始字节数：1243。

源文件 SHA256：

```text
8ab7d0cbc39f99ee4b6ca376c797bbd7c30a878f3a62a908c3395fd03e02fa37
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0038","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/record_change.py","bytes":1243,"sha256":"8ab7d0cbc39f99ee4b6ca376c797bbd7c30a878f3a62a908c3395fd03e02fa37","language":"python","fence":"```","wrapper_padding_newline":false,"category":"development_only_M01_utility","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/record_change.py"}} -->
```python
import json,hashlib,datetime,sys
from pathlib import Path
root=Path(__file__).resolve().parents[3]
log=Path(__file__).with_name('engineering-events.jsonl')
prev='0'*64
if log.exists():
 with log.open('r',encoding='utf-8') as s:
  for line in s:prev=json.loads(line)['sha256']
paths=[]
for arg in sys.argv[2:]:
 p=root/arg
 items=sorted(p.rglob('*')) if p.is_dir() else [p]
 for f in items:
  if not f.is_file():continue
  h=hashlib.sha256()
  with f.open('rb') as src:
   for b in iter(lambda:src.read(65536),b''):h.update(b)
  paths.append({'path':f.relative_to(root).as_posix(),'bytes':f.stat().st_size,'sha256':h.hexdigest()})
e={'schema':'agentnexus/engineering-change/1','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'phase':sys.argv[1],'previous_sha256':prev,'files':paths,'scope':'engineering provenance; not a claim of running AgentNexus product audit'}
e['sha256']=hashlib.sha256(json.dumps(e,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
with log.open('a',encoding='utf-8',newline='\n') as s:
 s.write(json.dumps(e,ensure_ascii=False,separators=(',',':'))+'\n');s.flush()
 import os;os.fsync(s.fileno())
print(json.dumps({'phase':e['phase'],'files':len(paths),'sha256':e['sha256']}))
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M0.1/integrity/recheck.py

类别：`development_only_M01_utility`；原始字节数：12890。

源文件 SHA256：

```text
d4c085ba27c964e23cb2ab83a148fc3c6266d95b64d694d036503f9f1e1c14cc
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0039","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/integrity/recheck.py","bytes":12890,"sha256":"d4c085ba27c964e23cb2ab83a148fc3c6266d95b64d694d036503f9f1e1c14cc","language":"python","fence":"```","wrapper_padding_newline":false,"category":"development_only_M01_utility","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M0.1/integrity/recheck.py"}} -->
```python
"""Read-only M0.1 source-evidence probe; never executes Workflow Kit code.

Outputs are factual hashes/metadata, not copied source expression. This is an
audit script, not the proposed M1 verifier or a security boundary.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import stat
import subprocess
import sys
import unicodedata
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(r"I:\AI_AgentNexus")
OUT = ROOT / ".workflow-kit/runtime/AgentNexus-v0.4-M0.1/integrity"
KIT = ROOT / "ai-workflow-kit-v4"
ARCHIVE = ROOT / "ai-workflow-kit-v4.0.0.zip"
HANDOFF = ROOT / "inputs/AgentNexus-v0.4/AgentNexus_v0.4_Codex_Handoff.zip"
EXPECTED_ARCHIVE = "4cad510cf666d37e0adb81f39ca3f1f29aa9f3b3ae7313726946e572e51736ec"
REPARSE = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
PATTERNS = {
    "license_copyright_spdx": re.compile(r"licen[sc]e|copyright|spdx|许可证|版权|著作权", re.I),
    "grant_declaration": re.compile(r"permission\s+is\s+hereby\s+granted|all\s+rights\s+reserved|redistribution\s+and\s+use|版权持有|开源许可|再分发", re.I),
    "named_license": re.compile(r"\b(?:MIT|Apache[- ]2\.0|BSD-[123]-Clause|GPL-[123]\.0|CC0-1\.0|Unlicense)\b|public\s+domain|creative\s+commons", re.I),
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(name: str, data: object) -> None:
    if name not in {"recheck_evidence.json", "preservation_before.json", "preservation_after.json"}:
        raise ValueError("unapproved output")
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def walk_files(directory: Path):
    """Do not follow reparse points, including directory junctions."""
    with os.scandir(directory) as entries:
        for entry in sorted(entries, key=lambda item: item.name):
            path = Path(entry.path)
            # On Windows, DirEntry.stat() caches dummy dev/ino/nlink values.
            # Direct lstat is required for factual link-count/identity evidence.
            info = os.lstat(path)
            if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & REPARSE:
                raise RuntimeError("source tree contains a linked/reparse entry: " + str(path))
            if stat.S_ISDIR(info.st_mode):
                yield from walk_files(path)
            elif stat.S_ISREG(info.st_mode):
                yield path, info
            else:
                raise RuntimeError("source tree contains a nonregular entry: " + str(path))


def snapshot() -> dict:
    trees = [
        ROOT / ".workflow-kit/tasks/AgentNexus-v0.4-M0",
        ROOT / ".workflow-kit/runtime/AgentNexus-v0.4-M0",
        KIT,
    ]
    files = {}
    for tree in trees:
        for path, info in walk_files(tree):
            files[path.relative_to(ROOT).as_posix()] = {"bytes": info.st_size, "sha256": file_digest(path)}
    for path in [ARCHIVE, HANDOFF, ROOT / "AGENTS.md", ROOT / ".workflow-kit/governance/policy.json"]:
        files[path.relative_to(ROOT).as_posix()] = {"bytes": path.stat().st_size, "sha256": file_digest(path)}
    return {"captured_utc": now(), "scope": "complete M0 task/runtime trees, original installed Kit and input ZIPs, active AGENTS/policy", "file_count": len(files), "total_bytes": sum(item["bytes"] for item in files.values()), "files": dict(sorted(files.items()))}


def all_keys(value):
    result = set()
    if isinstance(value, dict):
        result.update(value)
        for child in value.values():
            result.update(all_keys(child))
    elif isinstance(value, list):
        for child in value:
            result.update(all_keys(child))
    return result


def collect_evidence() -> dict:
    baseline = json.loads((ROOT / ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-inventory.json").read_bytes())
    expected = {item["path"]: item for item in baseline["files"]}
    paths = list(walk_files(KIT))
    current = {}
    hits = []
    for path, info in paths:
        relative = path.relative_to(KIT).as_posix()
        raw = path.read_bytes()
        text = raw.decode("utf-8", errors="strict")
        file_hits = []
        for number, line in enumerate(text.splitlines(), 1):
            for category, pattern in PATTERNS.items():
                terms = sorted(set(match.group(0) for match in pattern.finditer(line)))
                if terms:
                    hit = {"path": relative, "line": number, "category": category, "matched_tokens_only": terms}
                    hits.append(hit)
                    file_hits.append({"line": number, "category": category})
        current[relative] = {"path": relative, "bytes": len(raw), "sha256": digest(raw), "utf8_decoded": True, "nlink": info.st_nlink, "file_attributes": getattr(info, "st_file_attributes", None), "reparse_tag": getattr(info, "st_reparse_tag", None), "keyword_hits": file_hits, "license_expression": "NOASSERTION", "authorization_evidence": "NOT_FOUND_IN_PROVIDED_PACKAGE", "copy_distribution_status": "BLOCKED"}
    with zipfile.ZipFile(ARCHIVE) as z:
        entries = z.infolist()
        zip_files = {item.filename.removeprefix("ai-workflow-kit-v4/"): {"sha256": digest(z.read(item)), "bytes": item.file_size} for item in entries if not item.is_dir()}
        zip_metadata = {"entry_count": len(entries), "directory_entries": sum(item.is_dir() for item in entries), "duplicate_exact_names": [name for name, count in Counter(item.filename for item in entries).items() if count > 1], "unsafe_unix_file_types": [item.filename for item in entries if stat.S_IFMT(item.external_attr >> 16) not in {0, stat.S_IFREG, stat.S_IFDIR}]}
    handoff = HANDOFF.read_bytes()
    with zipfile.ZipFile(io.BytesIO(handoff)) as z:
        embedded = z.read("AgentNexus_v0.4_reference/ai-workflow-kit-v4.0.0.zip")
    source = json.loads((KIT / "SOURCES.json").read_bytes())
    historical = [{"archive": item["archive"], "version": item["version"], "sha256": item["sha256"], "entry_count": len(item["entries"]), "entry_keys": sorted(set().union(*(item.keys() for item in item["entries"]))), "archive_available_at_workspace_root": (ROOT / item["archive"]).is_file(), "authorization": "NOT_ASSERTED_BY_HASHES"} for item in source["sources"]]
    folded = Counter(unicodedata.normalize("NFC", path).casefold() for path in current)
    node_code = 'const fs=require("node:fs");const s=fs.lstatSync("ai-workflow-kit-v4/SOURCES.json",{bigint:true});console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,noFollowSupported:typeof fs.constants.O_NOFOLLOW!=="undefined",nlink:s.nlink.toString(),statsKeys:Object.keys(s),versions:process.versions,release:process.release}));'
    env = dict(os.environ)
    env.pop("NODE_OPTIONS", None)
    env.pop("NODE_PATH", None)
    node_result = subprocess.run([r"D:\Nodejs\node.exe", "-e", node_code], cwd=ROOT, env=env, capture_output=True, text=True, timeout=10, check=True)
    direct_info = os.lstat(KIT / "SOURCES.json")
    with os.scandir(KIT) as entries:
        cached_info = next(item for item in entries if item.name == "SOURCES.json").stat(follow_symlinks=False)
    identity = lambda item: {"nlink": item.st_nlink, "dev": item.st_dev, "ino": item.st_ino, "file_attributes": getattr(item, "st_file_attributes", None)}
    return {
        "schema": "agentnexus.m01.workflow-license-evidence.v1",
        "captured_utc": now(),
        "method": "complete local byte/UTF-8/keyword recheck and SOURCES structure inspection; no Kit tools/tests/installers executed",
        "scope": {"installed_path": str(KIT), "file_count": len(current), "bytes": sum(item["bytes"] for item in current.values()), "all_105_files_scanned": len(current) == 105, "third_party_repositories_reaudited": False},
        "archives": {"standalone_sha256": file_digest(ARCHIVE), "standalone_expected_m0_sha256": EXPECTED_ARCHIVE, "handoff_sha256": digest(handoff), "embedded_sha256": digest(embedded), "embedded_identical_to_standalone": embedded == ARCHIVE.read_bytes(), **zip_metadata},
        "m0_inventory_comparison": {"added": sorted(set(current) - set(expected)), "missing": sorted(set(expected) - set(current)), "changed": [path for path in sorted(set(current) & set(expected)) if current[path]["sha256"] != expected[path]["sha256"] or current[path]["bytes"] != expected[path]["bytes"]]},
        "archive_comparison": {"added": sorted(set(current) - set(zip_files)), "missing": sorted(set(zip_files) - set(current)), "changed": [path for path in sorted(set(current) & set(zip_files)) if current[path]["sha256"] != zip_files[path]["sha256"] or current[path]["bytes"] != zip_files[path]["bytes"]]},
        "path_observations": {"all_ascii": all(path.isascii() for path in current), "casefold_nfc_collisions": [key for key, count in folded.items() if count > 1], "hardlinked_files": [path for path, item in current.items() if item["nlink"] > 1], "unknown_or_invalid_link_count_files": [path for path, item in current.items() if item["nlink"] < 1], "reparse_files": [path for path, item in current.items() if item["file_attributes"] is not None and item["file_attributes"] & REPARSE]},
        "search_patterns": {key: pattern.pattern for key, pattern in PATTERNS.items()},
        "keyword_hits": hits,
        "license_notice_spdx_named_files": [path for path in current if re.search(r"(?:^|/)(?:licen[sc]e|notice|copying|copyright|third[-_ ]party[-_ ]notices|reuse|\.reuse)(?:[./_-]|$)", path, re.I)],
        "sources": {"path": "SOURCES.json", "sha256": current["SOURCES.json"]["sha256"], "top_level_keys": list(source), "all_recursive_keys": sorted(all_keys(source)), "license_or_copyright_fields": [key for key in all_keys(source) if re.search(r"licen[sc]e|copyright|author|notice|grant|permission", key, re.I)], "historical_sources": historical, "base_release": {**source["base_release"], "archive_available_at_workspace_root": (ROOT / source["base_release"]["archive"]).is_file()}, "current_version": source["current_version"], "source_date_is_inherited_claim": source["source_date"], "rights_holder_identity": "UNKNOWN", "copy_or_distribution_authorization": "NOT_FOUND"},
        "node_local_capability_probe": {"exe": r"D:\Nodejs\node.exe", "exit_code": node_result.returncode, "result": json.loads(node_result.stdout), "scope": "API metadata only; Node binary/distribution license closure NOT_PERFORMED; no runtime or package copied"},
        "python_local_capability_probe": {"version": sys.version.split()[0], "path": "SOURCES.json", "direct_lstat": identity(direct_info), "direntry_cached_stat": identity(cached_info), "meaning": "Windows DirEntry cached dev/ino/nlink can be dummy values; direct lstat was used for all 105 source metadata records; neither API closes TOCTOU"},
        "files": [current[path] for path in sorted(current)],
        "limits": ["keyword absence does not adjudicate ownership or all possible external grants", "no new user rights inferred", "hash agreement is content identity, not publisher authentication", "this probe is read-only evidence, not an M1 security implementation"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["before", "after"])
    args = parser.parse_args()
    if args.mode == "before":
        write_json("preservation_before.json", snapshot())
        evidence = collect_evidence()
        write_json("recheck_evidence.json", evidence)
        print(json.dumps({"evidence_file_count": evidence["scope"]["file_count"], "keyword_hit_count": len(evidence["keyword_hits"]), "m0_inventory_comparison": evidence["m0_inventory_comparison"], "archive_comparison": evidence["archive_comparison"]}))
    else:
        before = json.loads((OUT / "preservation_before.json").read_bytes())
        after = snapshot()
        old, new = before["files"], after["files"]
        difference = {"added": sorted(set(new) - set(old)), "removed": sorted(set(old) - set(new)), "changed": [path for path in sorted(set(old) & set(new)) if old[path] != new[path]]}
        after["comparison_to_before"] = difference
        after["all_preserved"] = not any(difference.values())
        write_json("preservation_after.json", after)
        print(json.dumps({"file_count": after["file_count"], "total_bytes": after["total_bytes"], "all_preserved": after["all_preserved"], "difference": difference}))
        if not after["all_preserved"]:
            sys.exit(1)


if __name__ == "__main__":
    main()
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/artifacts.ts

类别：`historical_native_source`；原始字节数：12687。

源文件 SHA256：

```text
4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0040","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/artifacts.ts","bytes":12687,"sha256":"4a4d8a5c2ce5461fd67de5a0b2f2094e870bc57ec4a1560c5ad0bdb7f21f4427","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"historical_native_source","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/artifacts.ts"}} -->
```typescript
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, lstatSync, readFileSync } from 'node:fs';
import { mkdir, open, rename, lstat, opendir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress, createZstdDecompress, constants } from 'node:zlib';
import { canonical, invariant, NexusError } from './types.ts';
import type { ArtifactRef } from './types.ts';
import { MAX_ARTIFACT_BYTES, validateArtifactRef } from './records.ts';

export const CHUNK_BYTES = 64 * 1024;
export type ArtifactOptions = { maxBytes?: number; media_type?: string; sensitivity?: 'NORMAL'; signal?: AbortSignal };
const IO_CODES = new Set(['EIO', 'ENOSPC', 'EDQUOT', 'EACCES', 'EPERM', 'EROFS', 'ENOENT', 'EMFILE', 'ENFILE', 'EISDIR', 'ENOTDIR', 'EEXIST', 'EBADF']);
export function isFileFailure(error: unknown): boolean { return IO_CODES.has((error as { code?: string })?.code ?? ''); }

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
  const info = await lstat(path);
  invariant(info.isDirectory() && !info.isSymbolicLink(), 'UNSAFE_STORAGE_PATH');
}

// Node on Windows does not expose a portable directory fsync handle. File syncs are
// real; hard-power-loss / directory durability remains an explicitly untested limit.
export async function syncDirectory(path: string): Promise<boolean> {
  if (process.platform === 'win32') return false;
  const handle = await open(path, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
  return true;
}

export async function writeNewJson(path: string, value: unknown): Promise<void> {
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(canonical(value) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
}

export class ArtifactStore {
  readonly root: string;
  readonly objects: string;
  readonly partials: string;
  readonly stats = { activePuts: 0, maxActivePuts: 0, maxInputChunk: 0, drains: 0, inputBytes: 0, directorySyncSupported: process.platform !== 'win32' };
  private onFault: (error: unknown) => void;
  private beforeWrite: () => void;
  private active = new Set<Promise<ArtifactRef>>();
  private closed = false;

  constructor(root: string, options: { onFault?: (error: unknown) => void; beforeWrite?: () => void } = {}) {
    this.root = resolve(root); this.objects = join(this.root, 'objects'); this.partials = join(this.root, 'partials');
    this.onFault = options.onFault ?? (() => {}); this.beforeWrite = options.beforeWrite ?? (() => {});
  }
  async initialize(): Promise<void> { await ensureDirectory(this.objects); await ensureDirectory(this.partials); }

  put(source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, options: ArtifactOptions = {}): Promise<ArtifactRef> {
    try {
      invariant(!this.closed, 'STORE_CLOSED'); this.beforeWrite();
      invariant(this.active.size < 2, 'BACKPRESSURE', 'At most two artifact streams may be active; retry after a stream settles.');
      invariant(options.sensitivity === undefined || options.sensitivity === 'NORMAL', 'SECRET_UNSUPPORTED');
      const max = options.maxBytes ?? 64 * 1024 * 1024;
      invariant(Number.isSafeInteger(max) && max >= 0 && max <= MAX_ARTIFACT_BYTES, 'INVALID_ARTIFACT_LIMIT');
      const media = options.media_type ?? 'application/octet-stream';
      invariant(typeof media === 'string' && media.length > 0 && Buffer.byteLength(media) <= 200 && !/[\x00-\x1f\x7f]/.test(media), 'INVALID_MEDIA_TYPE');
      const pending = this.putStream(source, { ...options, maxBytes: max, media_type: media });
      this.active.add(pending); this.stats.activePuts = this.active.size; this.stats.maxActivePuts = Math.max(this.stats.maxActivePuts, this.active.size);
      void pending.then(() => { this.active.delete(pending); this.stats.activePuts = this.active.size; }, () => { this.active.delete(pending); this.stats.activePuts = this.active.size; });
      return pending;
    } catch (error) { return Promise.reject(error); }
  }

  async putBytes(bytes: Uint8Array, options: ArtifactOptions = {}): Promise<ArtifactRef> {
    invariant(bytes instanceof Uint8Array, 'INVALID_ARTIFACT_CHUNK');
    function* chunks() { for (let i = 0; i < bytes.byteLength; i += CHUNK_BYTES) yield bytes.subarray(i, i + CHUNK_BYTES); }
    return this.put(chunks(), options);
  }

  private async putStream(source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, options: ArtifactOptions & { maxBytes: number; media_type: string }): Promise<ArtifactRef> {
    const id = randomUUID(), partial = join(this.partials, id + '.part');
    const object = join(this.objects, id + '.zst'), manifest = join(this.objects, id + '.json');
    const rawHash = createHash('sha256'), storedHash = createHash('sha256');
    let rawBytes = 0, storedBytes = 0, stage = 'PARTIAL';
    const owner = this;
    async function* bounded() {
      for await (const incoming of source) {
        options.signal?.throwIfAborted();
        invariant(incoming instanceof Uint8Array && incoming.byteLength <= CHUNK_BYTES, 'INVALID_ARTIFACT_CHUNK');
        invariant(rawBytes + incoming.byteLength <= options.maxBytes, 'ARTIFACT_LIMIT');
        // Snapshot each bounded chunk before yielding across an asynchronous boundary.
        const chunk = Buffer.from(incoming); rawBytes += chunk.byteLength; rawHash.update(chunk);
        owner.stats.maxInputChunk = Math.max(owner.stats.maxInputChunk, chunk.byteLength); owner.stats.inputBytes += chunk.byteLength;
        yield chunk;
      }
    }
    const storedLimit = options.maxBytes + Math.ceil(options.maxBytes / 128) + CHUNK_BYTES;
    const digest = new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
      storedBytes += chunk.length;
      if (storedBytes > storedLimit) { callback(new NexusError('ARTIFACT_STORED_LIMIT')); return; }
      storedHash.update(chunk); callback(null, chunk);
    } });
    const output = createWriteStream(partial, { flags: 'wx', mode: 0o600, highWaterMark: CHUNK_BYTES, flush: true });
    output.on('drain', () => { this.stats.drains++; });
    try {
      await pipeline(Readable.from(bounded(), { objectMode: false, highWaterMark: CHUNK_BYTES }),
        createZstdCompress({ chunkSize: CHUNK_BYTES, readableHighWaterMark: CHUNK_BYTES, writableHighWaterMark: CHUNK_BYTES,
          params: { [constants.ZSTD_c_checksumFlag]: 1 } }), digest, output, { signal: options.signal });
      const ref: ArtifactRef = { artifact_id: id, sha256: rawHash.digest('hex'), bytes: rawBytes, codec: 'zstd',
        stored_sha256: storedHash.digest('hex'), stored_bytes: storedBytes, media_type: options.media_type, sensitivity: 'NORMAL' };
      validateArtifactRef(ref);
      await rename(partial, object); stage = 'OBJECT_WITHOUT_MANIFEST'; await syncDirectory(this.objects);
      const pendingManifest = join(this.partials, id + '.manifest.part');
      await writeNewJson(pendingManifest, ref); await rename(pendingManifest, manifest); await syncDirectory(this.objects);
      return ref;
    } catch (error) {
      if (isFileFailure(error)) this.onFault(error);
      // Never delete the only partial bytes or return a complete Ref after failure.
      try { await writeNewJson(join(this.partials, id + '.incomplete.json'), {
        artifact_id: id, status: 'INCOMPLETE', stage, input_bytes_observed: rawBytes,
        compressed_bytes_observed: storedBytes, durable_offset: null,
        reason: (error as { code?: string })?.code ?? (error as Error)?.name ?? 'STREAM_FAILED',
      }); } catch (recordError) { this.onFault(recordError); }
      throw error;
    }
  }

  assertPublished(ref: ArtifactRef): void {
    validateArtifactRef(ref);
    const manifest = join(this.objects, ref.artifact_id + '.json');
    let raw: string;
    try {
      const info = lstatSync(manifest);
      invariant(info.isFile() && !info.isSymbolicLink() && info.size <= 4096, 'ARTIFACT_NOT_PUBLISHED');
      raw = readFileSync(manifest, 'utf8');
      invariant(raw === canonical(ref) + '\n', 'ARTIFACT_REF_MISMATCH');
      const object = lstatSync(join(this.objects, ref.artifact_id + '.zst'));
      invariant(object.isFile() && !object.isSymbolicLink() && object.size === ref.stored_bytes, 'ARTIFACT_NOT_PUBLISHED');
    } catch (error) {
      if (error instanceof NexusError) throw error;
      throw new NexusError('ARTIFACT_NOT_PUBLISHED');
    }
  }

  async *read(ref: ArtifactRef): AsyncGenerator<Uint8Array, void> {
    invariant(!this.closed, 'STORE_CLOSED'); validateArtifactRef(ref);
    let source: ReturnType<typeof createReadStream> | undefined;
    let digest: Transform | undefined, decompressor: ReturnType<typeof createZstdDecompress> | undefined;
    let flow: Promise<void> | undefined, finished = false;
    const rawHash = createHash('sha256'), storedHash = createHash('sha256');
    let rawBytes = 0, storedBytes = 0;
    try {
      this.assertPublished(ref);
      source = createReadStream(join(this.objects, ref.artifact_id + '.zst'), { highWaterMark: CHUNK_BYTES });
      digest = new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
        storedBytes += chunk.length;
        if (storedBytes > ref.stored_bytes) { callback(new NexusError('ARTIFACT_CORRUPT')); return; }
        storedHash.update(chunk); callback(null, chunk);
      } });
      decompressor = createZstdDecompress({ chunkSize: CHUNK_BYTES, readableHighWaterMark: CHUNK_BYTES, writableHighWaterMark: CHUNK_BYTES });
      flow = pipeline(source, digest, decompressor); void flow.catch(() => {});
      for await (const chunk of decompressor) {
        invariant(chunk.byteLength <= CHUNK_BYTES && rawBytes + chunk.byteLength <= ref.bytes, 'ARTIFACT_CORRUPT');
        rawBytes += chunk.byteLength; rawHash.update(chunk); yield chunk;
      }
      await flow;
      invariant(rawBytes === ref.bytes && storedBytes === ref.stored_bytes && rawHash.digest('hex') === ref.sha256 && storedHash.digest('hex') === ref.stored_sha256, 'ARTIFACT_CORRUPT');
      finished = true;
    } catch (error) {
      this.onFault(error);
      throw new NexusError('ARTIFACT_CORRUPT', 'Artifact stream or hash validation failed; preserve the object and recover explicitly.');
    } finally {
      source?.destroy(); digest?.destroy(); decompressor?.destroy();
      if (flow) await flow.catch(() => {});
      // Early iterator return intentionally skips the final verification barrier.
      // Bytes already yielded must not be described as a verified complete object.
      if (!finished) { /* no verified completion is returned */ }
    }
  }

  async verify(): Promise<{ objects: number; bytes: number; incomplete: number }> {
    let objects = 0, bytes = 0, entries = 0;
    const incompleteIds = new Set<string>(), compressedIds = new Set<string>(), completeIds = new Set<string>();
    const directory = await opendir(this.objects);
    for await (const entry of directory) {
      invariant(++entries <= 200000, 'STORAGE_SCAN_LIMIT');
      invariant(entry.isFile() && !entry.isSymbolicLink(), 'ARTIFACT_CORRUPT');
      if (entry.name.endsWith('.zst')) {
        invariant(/^[a-f0-9-]{36}\.zst$/.test(entry.name), 'ARTIFACT_CORRUPT');
        compressedIds.add(entry.name.slice(0, 36)); continue;
      }
      invariant(/^[a-f0-9-]{36}\.json$/.test(entry.name), 'ARTIFACT_CORRUPT');
      const path = join(this.objects, entry.name), info = await lstat(path);
      invariant(info.size <= 4096, 'ARTIFACT_CORRUPT');
      const ref = JSON.parse(readFileSync(path, 'utf8')) as ArtifactRef; validateArtifactRef(ref);
      invariant(entry.name === ref.artifact_id + '.json', 'ARTIFACT_CORRUPT');
      for await (const _chunk of this.read(ref)) { /* streamed verification */ }
      completeIds.add(ref.artifact_id); objects++; bytes += ref.bytes;
    }
    const partialDirectory = await opendir(this.partials);
    for await (const entry of partialDirectory) {
      invariant(++entries <= 200000 && entry.isFile() && !entry.isSymbolicLink(), 'STORAGE_SCAN_LIMIT');
      invariant(/^[a-f0-9-]{36}\.(?:part|manifest\.part|incomplete\.json)$/.test(entry.name), 'ARTIFACT_CORRUPT');
      incompleteIds.add(entry.name.slice(0, 36));
    }
    for (const id of compressedIds) if (!completeIds.has(id)) incompleteIds.add(id);
    return { objects, bytes, incomplete: incompleteIds.size };
  }

  async waitForIdle(): Promise<void> { await Promise.allSettled([...this.active]); }
  async close(): Promise<void> { this.closed = true; await this.waitForIdle(); }
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/records.ts

类别：`historical_native_source`；原始字节数：6510。

源文件 SHA256：

```text
393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0041","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/records.ts","bytes":6510,"sha256":"393e0a70a20a4dae21287169d1313bae949842cf0f712bacb3ebf432a5ed7800","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"historical_native_source","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/records.ts"}} -->
```typescript
import {
  boundedJson, canonical, invariant, sha256, validateIdentity,
} from './types.ts';
import type {
  ArtifactRef, AuditInput, ContextInput, DecisionInput, Domain, Json, StoredRecord,
} from './types.ts';

export const ZERO_HASH = '0'.repeat(64);
export const MAX_FRAME_BYTES = 64 * 1024;
export const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function string(value: unknown, max = 512): asserts value is string {
  invariant(typeof value === 'string' && value.length > 0 && Buffer.byteLength(value) <= max, 'INVALID_RECORD');
}
function nullableString(value: unknown, max = 512): void { if (value !== null) string(value, max); }
function fields(value: Record<string, unknown>, names: string[]): void {
  invariant(Object.keys(value).length === names.length && names.every(k => Object.hasOwn(value, k)), 'INVALID_RECORD_FIELDS');
}
function strings(value: unknown): void {
  invariant(Array.isArray(value) && value.length <= 256, 'INVALID_RECORD');
  for (const v of value) string(v, 128);
}

export function validateArtifactRef(value: unknown): asserts value is ArtifactRef {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value), 'INVALID_ARTIFACT_REF');
  const v = value as Record<string, unknown>;
  fields(v, ['artifact_id', 'sha256', 'bytes', 'codec', 'stored_sha256', 'stored_bytes', 'media_type', 'sensitivity']);
  invariant(typeof v.artifact_id === 'string' && UUID.test(v.artifact_id), 'INVALID_ARTIFACT_REF');
  invariant(typeof v.sha256 === 'string' && HASH.test(v.sha256) && typeof v.stored_sha256 === 'string' && HASH.test(v.stored_sha256), 'INVALID_ARTIFACT_REF');
  invariant(Number.isSafeInteger(v.bytes) && (v.bytes as number) >= 0 && (v.bytes as number) <= MAX_ARTIFACT_BYTES, 'INVALID_ARTIFACT_REF');
  invariant(Number.isSafeInteger(v.stored_bytes) && (v.stored_bytes as number) > 0 && (v.stored_bytes as number) <= MAX_ARTIFACT_BYTES + 8 * 1024 * 1024, 'INVALID_ARTIFACT_REF');
  invariant(v.codec === 'zstd' && v.sensitivity === 'NORMAL', 'SECRET_UNSUPPORTED');
  string(v.media_type, 200);
  invariant(!/[\x00-\x1f\x7f]/.test(v.media_type), 'INVALID_ARTIFACT_REF');
}

function refs(value: unknown): void {
  invariant(Array.isArray(value) && value.length <= 256, 'INVALID_RECORD');
  for (const ref of value) validateArtifactRef(ref);
}

export function validateInput(domain: Domain, input: unknown): AuditInput | ContextInput | DecisionInput {
  // Canonicalize before property access: reject accessors, cycles, prototypes and large envelopes.
  const body = JSON.parse(boundedJson(input, MAX_FRAME_BYTES - 1024)) as Record<string, unknown>;
  invariant(body !== null && typeof body === 'object' && !Array.isArray(body), 'INVALID_RECORD');
  validateIdentity(body as unknown as AuditInput);
  for (const k of ['event_id', 'operation_id', 'observed_at']) string(body[k], 128);
  invariant(Number.isFinite(Date.parse(body.observed_at as string)), 'INVALID_RECORD_TIME');
  const base = ['agent_id', 'project_id', 'task_id', 'session_id', 'event_id', 'operation_id', 'observed_at'];
  if (domain === 'audit') {
    fields(body, [...base, 'operation_type', 'phase', 'cwd', 'parameters', 'parameters_ref', 'before_state_ref',
      'policy_decision_ref', 'authorization_ref', 'execution_status', 'exit_code', 'stdout_ref', 'stderr_ref',
      'after_state_ref', 'artifact_refs', 'context_event_refs', 'decision_refs', 'applicability', 'detail']);
    string(body.operation_type, 128); string(body.phase, 128); string(body.execution_status, 128);
    nullableString(body.cwd, 4096); nullableString(body.policy_decision_ref); nullableString(body.authorization_ref);
    invariant(body.exit_code === null || Number.isSafeInteger(body.exit_code), 'INVALID_RECORD');
    for (const k of ['parameters_ref', 'before_state_ref', 'stdout_ref', 'stderr_ref', 'after_state_ref'])
      if (body[k] !== null) validateArtifactRef(body[k]);
    refs(body.artifact_refs); strings(body.context_event_refs); strings(body.decision_refs);
  } else if (domain === 'context') {
    fields(body, [...base, 'kind', 'payload_ref', 'audit_event_refs']);
    string(body.kind, 128); validateArtifactRef(body.payload_ref); strings(body.audit_event_refs);
  } else {
    invariant(domain === 'decision', 'INVALID_DOMAIN');
    fields(body, [...base, 'decision_id', 'status', 'authority_ref', 'supersedes', 'evidence_refs', 'decision']);
    string(body.decision_id, 128); string(body.authority_ref); nullableString(body.supersedes, 128);
    invariant(['PROPOSED', 'ACCEPTED', 'SUPERSEDED', 'REJECTED'].includes(body.status as string), 'INVALID_RECORD');
    refs(body.evidence_refs);
  }
  return body as unknown as AuditInput | ContextInput | DecisionInput;
}

export function artifactRefs(domain: Domain, body: Json): ArtifactRef[] {
  const b = body as Record<string, Json>;
  if (domain === 'context') return [b.payload_ref as unknown as ArtifactRef];
  if (domain === 'decision') return b.evidence_refs as unknown as ArtifactRef[];
  return [b.parameters_ref, b.before_state_ref, b.stdout_ref, b.stderr_ref, b.after_state_ref,
    ...(b.artifact_refs as Json[])].filter(x => x !== null) as unknown as ArtifactRef[];
}

export function recordHash(record: Omit<StoredRecord, 'hash'>): string { return sha256(canonical(record)); }
export function frame(record: StoredRecord): Buffer {
  const bytes = Buffer.from(boundedJson(record, MAX_FRAME_BYTES - 1) + '\n');
  invariant(bytes.length <= MAX_FRAME_BYTES, 'FRAME_TOO_LARGE'); return bytes;
}
export function validateRecord(input: unknown): StoredRecord {
  const value = JSON.parse(boundedJson(input, MAX_FRAME_BYTES)) as StoredRecord;
  fields(value as unknown as Record<string, unknown>, ['seq', 'domain', 'event_id', 'operation_id', 'project_id', 'task_id', 'previous_hash', 'hash', 'body']);
  invariant(Number.isSafeInteger(value.seq) && value.seq > 0, 'RECORD_CORRUPT');
  invariant(['audit', 'context', 'decision'].includes(value.domain), 'RECORD_CORRUPT');
  invariant(HASH.test(value.previous_hash) && HASH.test(value.hash), 'RECORD_CORRUPT');
  const body = validateInput(value.domain, value.body);
  invariant(value.event_id === body.event_id && value.operation_id === body.operation_id && value.project_id === body.project_id && value.task_id === body.task_id, 'RECORD_CORRUPT');
  const { hash, ...withoutHash } = value;
  invariant(hash === recordHash(withoutHash), 'RECORD_CORRUPT');
  return value;
}
```
<!-- agentnexus-export-end -->

## .workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/storage.ts

类别：`historical_native_source`；原始字节数：31836。

源文件 SHA256：

```text
7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0042","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/storage.ts","bytes":31836,"sha256":"7e3d4c0f065246823db894d0286990bd2111fde52b949d0b04d3554126e18dcb","language":"typescript","fence":"```","wrapper_padding_newline":false,"category":"historical_native_source","kind":"original","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-v0.4-M1/storage/v1/storage.ts"}} -->
```typescript
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, readFileSync } from 'node:fs';
import { mkdir, open, opendir, lstat, rename, unlink, rmdir } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress, createZstdDecompress, constants } from 'node:zlib';
import { ArtifactStore, CHUNK_BYTES, ensureDirectory, isFileFailure, syncDirectory, writeNewJson } from './artifacts.ts';
import { artifactRefs, frame, MAX_FRAME_BYTES, recordHash, validateInput, validateRecord, ZERO_HASH } from './records.ts';
import { canonical, invariant, NexusError, sha256 } from './types.ts';
import type { AuditInput, ContextInput, DecisionInput, Domain, Json, QueryOptions, StoredRecord } from './types.ts';

type Row = Record<string, unknown>;
type Options = { maxPendingBytes?: number; segmentBytes?: number };
type Segment = { name: string; index: number; bytes: number; first: number; last: number; count: number; rawHash: string; tailBytes: number };
type SegmentManifest = { schema: string; file: string; codec: string; node: string; first_seq: number; last_seq: number; records: number;
  bytes: number; sha256: string; stored_bytes: number; stored_sha256: string; previous_segment_hash: string; hash: string };
type Owner = { schema: string; pid: number; hostname: string; token: string; created_at: string };
const SEGMENT = /^segment-(\d{8})\.jsonl$/;
const DOMAINS: Domain[] = ['audit', 'context', 'decision'];

async function writeAll(handle: FileHandle, data: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < data.byteLength) {
    const { bytesWritten } = await handle.write(data, offset, data.byteLength - offset);
    invariant(bytesWritten > 0, 'STORAGE_IO'); offset += bytesWritten;
  }
}
function storageError(error: unknown): NexusError {
  if (error instanceof NexusError) return error;
  return new NexusError('STORAGE_FAILURE', (error as Error)?.message ?? 'Persistent storage failure');
}
function persistentFailure(error: unknown): boolean {
  if (isFileFailure(error)) return true;
  const e = error as { errcode?: number; code?: string };
  if (typeof e?.errcode === 'number') return ![5, 6, 19].includes(e.errcode & 255); // BUSY, LOCKED, CONSTRAINT are request failures.
  return e?.code === 'ERR_SQLITE_ERROR' || e?.code === 'ERR_INVALID_STATE';
}
async function readOwner(root: string): Promise<{ owner: Owner; raw: string }> {
  const directory = await lstat(join(root, 'writer.lock'));
  invariant(directory.isDirectory() && !directory.isSymbolicLink(), 'STORE_LOCKED');
  const path = join(root, 'writer.lock', 'owner.json'), stat = await lstat(path);
  invariant(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 4096, 'STORE_LOCKED');
  const raw = readFileSync(path, 'utf8'); let owner: Owner;
  try { owner = JSON.parse(raw) as Owner; } catch { throw new NexusError('STORE_LOCKED'); }
  invariant(owner.schema === 'agentnexus/writer-lock/1' && Number.isSafeInteger(owner.pid) && owner.pid > 0 &&
    typeof owner.token === 'string' && /^[a-f0-9-]{36}$/.test(owner.token) && typeof owner.hostname === 'string', 'STORE_LOCKED');
  invariant(raw === canonical(owner) + '\n', 'STORE_LOCKED'); return { owner, raw };
}

export class KernelStore {
  readonly root: string;
  readonly db: DatabaseSync;
  readonly artifacts: ArtifactStore;
  private owner: Owner;
  private pendingLimit: number;
  private segmentLimit: number;
  private inTransaction = false;
  private transactionContext = new AsyncLocalStorage<{ active: boolean }>();
  private closed = false;
  private closing = false;
  private failure: unknown = null;
  private maintenance = false;
  private flushing: Promise<void> | null = null;
  private active: Segment | null = null;
  private activeHandle: FileHandle | null = null;
  private nextSegment = 1;
  private lastOnDisk = 0;
  private previousSegmentHash = ZERO_HASH;

  private constructor(root: string, db: DatabaseSync, owner: Owner, options: Options) {
    this.root = root; this.db = db; this.owner = owner;
    this.pendingLimit = options.maxPendingBytes ?? 4 * 1024 * 1024;
    this.segmentLimit = options.segmentBytes ?? 16 * 1024 * 1024;
    this.artifacts = new ArtifactStore(join(root, 'artifacts'), { beforeWrite: () => this.assertWritable(), onFault: error => this.freeze(error) });
  }
  get faulted(): boolean { return this.failure !== null; }

  static async open(rootPath: string, options: Options = {}): Promise<KernelStore> {
    const pending = options.maxPendingBytes ?? 4 * 1024 * 1024, segment = options.segmentBytes ?? 16 * 1024 * 1024;
    invariant(Number.isSafeInteger(pending) && pending >= 4096 && pending <= 4 * 1024 * 1024, 'INVALID_STORAGE_LIMIT');
    invariant(Number.isSafeInteger(segment) && segment >= 4096 && segment <= 16 * 1024 * 1024, 'INVALID_STORAGE_LIMIT');
    const root = resolve(rootPath); await ensureDirectory(root);
    invariant(!existsSync(join(root, 'writer.recovery')), 'STORE_LOCKED');
    try { await mkdir(join(root, 'writer.lock')); } catch (error) {
      if ((error as { code?: string }).code === 'EEXIST') throw new NexusError('STORE_LOCKED', 'Existing writer lock requires explicit owner-death recovery.');
      throw error;
    }
    const owner: Owner = { schema: 'agentnexus/writer-lock/1', pid: process.pid, hostname: hostname(), token: randomUUID(), created_at: new Date().toISOString() };
    let db: DatabaseSync | undefined, store: KernelStore | undefined;
    try {
      await writeNewJson(join(root, 'writer.lock', 'owner.json'), owner); await syncDirectory(root);
      invariant(!existsSync(join(root, 'writer.recovery')), 'STORE_LOCKED');
      await ensureDirectory(join(root, 'segments')); await ensureDirectory(join(root, 'recovery'));
      db = new DatabaseSync(join(root, 'kernel.sqlite'));
      const version = String((db.prepare('SELECT sqlite_version() AS version').get() as Row).version).split('.').map(Number);
      invariant(version[0] > 3 || (version[0] === 3 && (version[1] > 51 || (version[1] === 51 && version[2] >= 3))), 'SQLITE_VERSION_BLOCKED');
      db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000; PRAGMA trusted_schema=OFF;
        CREATE TABLE IF NOT EXISTS anx_records (
          seq INTEGER PRIMARY KEY, domain TEXT NOT NULL CHECK(domain IN ('audit','context','decision')),
          event_id TEXT NOT NULL UNIQUE, operation_id TEXT NOT NULL, project_id TEXT NOT NULL, task_id TEXT NOT NULL,
          previous_hash TEXT NOT NULL, hash TEXT NOT NULL UNIQUE, body TEXT NOT NULL, frame_bytes INTEGER NOT NULL CHECK(frame_bytes>0)
        ) STRICT;
        CREATE INDEX IF NOT EXISTS anx_records_domain_seq ON anx_records(domain,seq);
        CREATE INDEX IF NOT EXISTS anx_records_task_seq ON anx_records(task_id,seq);
        CREATE TABLE IF NOT EXISTS anx_outbox (seq INTEGER PRIMARY KEY REFERENCES anx_records(seq), frame_bytes INTEGER NOT NULL) STRICT;
        CREATE TABLE IF NOT EXISTS anx_exports (seq INTEGER PRIMARY KEY REFERENCES anx_records(seq), segment TEXT NOT NULL, end_offset INTEGER NOT NULL, hash TEXT NOT NULL) STRICT;
        CREATE TRIGGER IF NOT EXISTS anx_records_no_update BEFORE UPDATE ON anx_records BEGIN SELECT RAISE(ABORT,'append only'); END;
        CREATE TRIGGER IF NOT EXISTS anx_records_no_delete BEFORE DELETE ON anx_records BEGIN SELECT RAISE(ABORT,'append only'); END;`);
      await syncDirectory(root);
      store = new KernelStore(root, db, owner, options); await store.artifacts.initialize(); await store.recover(); return store;
    } catch (error) {
      if (store) { store.failure = error; await store.close().catch(() => {}); }
      else {
        db?.close();
        if (existsSync(join(root, 'writer.lock', 'owner.json'))) {
          const current = await readOwner(root).catch(() => null);
          if (current?.owner.token === owner.token) { await unlink(join(root, 'writer.lock', 'owner.json')); await rmdir(join(root, 'writer.lock')); }
        }
      }
      throw storageError(error);
    }
  }

  static async recoverAbandonedLock(rootPath: string): Promise<{ recovered: boolean; evidence_path?: string }> {
    const root = resolve(rootPath); await ensureDirectory(root);
    const guard = join(root, 'writer.recovery');
    try { await mkdir(guard); } catch { throw new NexusError('STORE_LOCKED', 'Another recovery or an uncertain recovery lock exists.'); }
    try {
      if (!existsSync(join(root, 'writer.lock'))) return { recovered: false };
      const first = await readOwner(root);
      invariant(first.owner.hostname === hostname() && first.owner.pid !== process.pid, 'STORE_LOCKED');
      let dead = false;
      try { process.kill(first.owner.pid, 0); } catch (error) { dead = (error as { code?: string }).code === 'ESRCH'; }
      invariant(dead, 'STORE_LOCKED', 'OS did not confirm that the recorded process is absent.');
      const second = await readOwner(root); invariant(first.raw === second.raw, 'STORE_LOCKED');
      const entries: string[] = []; for await (const e of await opendir(join(root, 'writer.lock'))) entries.push(e.name);
      invariant(entries.length === 1 && entries[0] === 'owner.json', 'STORE_LOCKED');
      await ensureDirectory(join(root, 'recovery'));
      const evidence = join(root, 'recovery', 'abandoned-lock-' + first.owner.token + '-' + randomUUID());
      await rename(join(root, 'writer.lock'), evidence); await syncDirectory(root);
      return { recovered: true, evidence_path: evidence };
    } finally { await rmdir(guard); }
  }

  private freeze(error: unknown): void { if (this.failure === null) this.failure = error; }
  private assertWritable(): void {
    const context = this.transactionContext.getStore(); invariant(!context || context.active, 'ASYNC_TRANSACTION');
    invariant(!this.closed && !this.closing, 'STORE_CLOSED'); invariant(!this.faulted, 'STORE_FAULTED');
    invariant(!this.maintenance, 'STORE_BUSY');
  }

  transaction<T>(fn: () => T): T {
    this.assertWritable(); invariant(!this.inTransaction, 'NESTED_TRANSACTION');
    invariant(fn.constructor.name !== 'AsyncFunction', 'ASYNC_TRANSACTION');
    let begun = false; const context = { active: true };
    try {
      this.db.exec('BEGIN IMMEDIATE'); begun = true; this.inTransaction = true;
      const result = this.transactionContext.run(context, fn);
      if (result !== null && (typeof result === 'object' || typeof result === 'function') && typeof (result as { then?: unknown }).then === 'function') {
        void Promise.resolve(result).catch(() => {}); throw new NexusError('ASYNC_TRANSACTION');
      }
      this.db.exec('COMMIT'); begun = false; return result;
    } catch (error) {
      if (begun) { try { this.db.exec('ROLLBACK'); } catch (rollbackError) { this.freeze(rollbackError); } }
      if (persistentFailure(error)) this.freeze(error); throw error;
    } finally { context.active = false; this.inTransaction = false; }
  }

  private append(domain: Domain, input: AuditInput | ContextInput | DecisionInput): StoredRecord {
    this.assertWritable(); const body = validateInput(domain, input);
    for (const ref of artifactRefs(domain, body as unknown as Json)) this.artifacts.assertPublished(ref);
    if (!this.inTransaction) return this.transaction(() => this.append(domain, body));
    const pending = Number((this.db.prepare('SELECT COALESCE(SUM(frame_bytes),0) AS n FROM anx_outbox').get() as Row).n);
    const seq = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS seq FROM anx_records').get() as Row).seq);
    invariant(Number.isSafeInteger(seq) && seq > 0, 'SEQUENCE_EXHAUSTED');
    const tail = this.db.prepare('SELECT hash FROM anx_records WHERE domain=? ORDER BY seq DESC LIMIT 1').get(domain) as Row | undefined;
    const without = { seq, domain, event_id: body.event_id, operation_id: body.operation_id, project_id: body.project_id,
      task_id: body.task_id, previous_hash: String(tail?.hash ?? ZERO_HASH), body: body as unknown as Json };
    const record: StoredRecord = { ...without, hash: recordHash(without) }, encoded = frame(record);
    invariant(pending + encoded.length <= this.pendingLimit, 'BACKPRESSURE', 'Durable outbox budget is full; flush before admitting another record.');
    this.db.prepare('INSERT INTO anx_records(seq,domain,event_id,operation_id,project_id,task_id,previous_hash,hash,body,frame_bytes) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(seq, domain, record.event_id, record.operation_id, record.project_id, record.task_id, record.previous_hash, record.hash, canonical(body), encoded.length);
    this.db.prepare('INSERT INTO anx_outbox(seq,frame_bytes) VALUES(?,?)').run(seq, encoded.length); return record;
  }
  audit(input: AuditInput): StoredRecord { return this.append('audit', input); }
  context(input: ContextInput): StoredRecord { return this.append('context', input); }
  decision(input: DecisionInput): StoredRecord { return this.append('decision', input); }

  private row(row: Row): StoredRecord {
    const body = JSON.parse(String(row.body)); invariant(canonical(body) === row.body, 'RECORD_CORRUPT');
    const record = validateRecord({ seq: row.seq, domain: row.domain, event_id: row.event_id, operation_id: row.operation_id,
      project_id: row.project_id, task_id: row.task_id, previous_hash: row.previous_hash, hash: row.hash, body });
    if (row.frame_bytes !== undefined) invariant(frame(record).length === Number(row.frame_bytes), 'RECORD_CORRUPT');
    return record;
  }

  query(domain: Domain, options: QueryOptions = {}): StoredRecord[] {
    invariant(!this.closed, 'STORE_CLOSED'); invariant(DOMAINS.includes(domain), 'INVALID_DOMAIN');
    return this.queryRows(domain, options);
  }
  private queryRows(domain: Domain | null, options: QueryOptions): StoredRecord[] {
    const limit = options.limit ?? 100, after = options.after ?? 0;
    invariant(Number.isSafeInteger(limit) && limit >= 1 && limit <= 100 && Number.isSafeInteger(after) && after >= 0, 'INVALID_QUERY');
    for (const key of ['task_id', 'project_id'] as const) if (options[key] !== undefined)
      invariant(typeof options[key] === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(options[key]!), 'INVALID_QUERY');
    const clauses = ['seq>?'], values: (string | number)[] = [after];
    if (domain) { clauses.push('domain=?'); values.push(domain); }
    for (const key of ['task_id', 'project_id'] as const) if (options[key] !== undefined) { clauses.push(key + '=?'); values.push(options[key]!); }
    values.push(limit);
    try { return (this.db.prepare('SELECT * FROM anx_records WHERE ' + clauses.join(' AND ') + ' ORDER BY seq LIMIT ?').all(...values) as Row[]).map(r => this.row(r)); }
    catch (error) { this.freeze(error); throw storageError(error); }
  }
  reconstructTask(taskId: string, options: { after?: number; limit?: number } = {}): { records: StoredRecord[]; next_cursor: number | null } {
    invariant(!this.closed, 'STORE_CLOSED');
    const records = this.queryRows(null, { ...options, task_id: taskId });
    return { records, next_cursor: records.length ? records[records.length - 1].seq : null };
  }

  async flush(): Promise<void> {
    this.assertWritable(); invariant(!this.inTransaction, 'TRANSACTION_ACTIVE');
    if (this.flushing) return this.flushing;
    this.flushing = this.flushInternal().catch(error => { this.freeze(error); throw storageError(error); }).finally(() => { this.flushing = null; });
    return this.flushing;
  }
  private async flushInternal(): Promise<void> {
    while (true) {
      const row = this.db.prepare('SELECT r.* FROM anx_outbox o JOIN anx_records r USING(seq) ORDER BY r.seq LIMIT 1').get() as Row | undefined;
      if (!row) break;
      const record = this.row(row), data = frame(record);
      invariant(record.seq === this.lastOnDisk + 1, 'EXPORT_SEQUENCE_CORRUPT');
      if (this.active && this.active.bytes > 0 && this.active.bytes + data.length > this.segmentLimit) await this.sealActive();
      if (!this.active) {
        const name = 'segment-' + String(this.nextSegment).padStart(8, '0') + '.jsonl';
        invariant(this.nextSegment <= 99999999, 'STORAGE_SCAN_LIMIT');
        this.active = { name, index: this.nextSegment, bytes: 0, first: record.seq, last: record.seq - 1, count: 0, rawHash: '', tailBytes: 0 };
        this.activeHandle = await open(join(this.root, 'segments', name), 'ax', 0o600);
        await syncDirectory(join(this.root, 'segments'));
      } else if (!this.activeHandle) this.activeHandle = await open(join(this.root, 'segments', this.active.name), 'a');
      const stat = await this.activeHandle.stat(); invariant(stat.isFile() && stat.size === this.active.bytes, 'EXPORT_CHANGED');
      await writeAll(this.activeHandle, data); await this.activeHandle.sync();
      if (this.active.count === 0) this.active.first = record.seq;
      this.active.bytes += data.length; this.active.last = record.seq; this.active.count++;
      this.acknowledge(record, this.active.name, this.active.bytes); this.lastOnDisk = record.seq;
    }
  }
  private acknowledge(record: StoredRecord, segment: string, endOffset: number): void {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO anx_exports(seq,segment,end_offset,hash) VALUES(?,?,?,?)').run(record.seq, segment, endOffset, record.hash);
      this.db.prepare('DELETE FROM anx_outbox WHERE seq=?').run(record.seq); this.db.exec('COMMIT');
    } catch (error) { try { this.db.exec('ROLLBACK'); } catch {} throw error; }
  }

  private async *rawFrames(path: string): AsyncGenerator<{ data: Buffer; offset: number }, Buffer> {
    let carry = Buffer.alloc(0), offset = 0;
    for await (const chunk of createReadStream(path, { highWaterMark: CHUNK_BYTES })) {
      let data = carry.length ? Buffer.concat([carry, chunk]) : chunk as Buffer;
      let start = 0, end: number;
      while ((end = data.indexOf(10, start)) >= 0) {
        invariant(end + 1 - start <= MAX_FRAME_BYTES, 'EXPORT_CORRUPT');
        const line = data.subarray(start, end + 1); offset += line.length; yield { data: line, offset }; start = end + 1;
      }
      carry = Buffer.from(data.subarray(start)); invariant(carry.length < MAX_FRAME_BYTES, 'EXPORT_CORRUPT');
    }
    return carry;
  }

  private async scanSegment(name: string, previousSeq: number, repair: boolean): Promise<Segment> {
    const path = join(this.root, 'segments', name), info = await lstat(path);
    invariant(info.isFile() && !info.isSymbolicLink(), 'EXPORT_CORRUPT');
    const hash = createHash('sha256'); let bytes = 0, first = 0, last = previousSeq, count = 0;
    const iterator = this.rawFrames(path); let tail = Buffer.alloc(0);
    try {
      while (true) {
        const item = await iterator.next();
        if (item.done) { tail = item.value; break; }
        const { data, offset } = item.value;
        const record = validateRecord(JSON.parse(data.subarray(0, -1).toString('utf8')));
        invariant(record.seq === last + 1 && frame(record).equals(data), 'EXPORT_CORRUPT');
        const dbRow = this.db.prepare('SELECT * FROM anx_records WHERE seq=?').get(record.seq) as Row | undefined;
        invariant(dbRow && frame(this.row(dbRow)).equals(data), 'EXPORT_CORRUPT');
        const receipt = this.db.prepare('SELECT * FROM anx_exports WHERE seq=?').get(record.seq) as Row | undefined;
        if (receipt) invariant(receipt.segment === name && Number(receipt.end_offset) === offset && receipt.hash === record.hash, 'EXPORT_CORRUPT');
        hash.update(data); bytes = offset; if (!count) first = record.seq; last = record.seq; count++;
      }
    } finally { await iterator.return(Buffer.alloc(0)); }
    if (tail.length) {
      const receipt = Number((this.db.prepare('SELECT COALESCE(MAX(end_offset),0) AS n FROM anx_exports WHERE segment=?').get(name) as Row).n);
      invariant(receipt <= bytes && !existsSync(path + '.manifest.json'), 'ACKNOWLEDGED_TAIL_CORRUPT');
      invariant(repair, 'RECOVERY_REQUIRED');
      const saved = await open(join(this.root, 'recovery', name + '.' + randomUUID() + '.tail'), 'wx', 0o600);
      try { await writeAll(saved, tail); await saved.sync(); } finally { await saved.close(); }
      const handle = await open(path, 'r+'); try { await handle.truncate(bytes); await handle.sync(); } finally { await handle.close(); }
    }
    return { name, index: Number(SEGMENT.exec(name)![1]), bytes, first, last, count, rawHash: hash.digest('hex'), tailBytes: tail.length };
  }

  private async verifyCompressed(path: string, expected: SegmentManifest): Promise<void> {
    const raw = createHash('sha256'), stored = createHash('sha256'); let bytes = 0, storedBytes = 0;
    await pipeline(createReadStream(path, { highWaterMark: CHUNK_BYTES }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) {
        storedBytes += chunk.length; if (storedBytes > expected.stored_bytes) return callback(new NexusError('SEGMENT_CORRUPT'));
        stored.update(chunk); callback(null, chunk);
      } }), createZstdDecompress({ chunkSize: CHUNK_BYTES }),
      new Writable({ highWaterMark: CHUNK_BYTES, write(chunk, _encoding, callback) {
        bytes += chunk.length; if (bytes > expected.bytes) return callback(new NexusError('SEGMENT_CORRUPT'));
        raw.update(chunk); callback();
      } }));
    invariant(bytes === expected.bytes && storedBytes === expected.stored_bytes && raw.digest('hex') === expected.sha256 && stored.digest('hex') === expected.stored_sha256, 'SEGMENT_CORRUPT');
  }

  private async scanSegments(repair: boolean): Promise<{ segments: number; tail_bytes: number }> {
    const names: string[] = []; let nameBytes = 0;
    for await (const entry of await opendir(join(this.root, 'segments'))) {
      invariant(entry.isFile() && !entry.isSymbolicLink(), 'EXPORT_CORRUPT');
      if (SEGMENT.test(entry.name)) { names.push(entry.name); nameBytes += entry.name.length; invariant(nameBytes <= 1024 * 1024, 'STORAGE_SCAN_LIMIT'); }
      else invariant(/^segment-\d{8}\.jsonl\.(?:zst|manifest\.json|[a-f0-9-]{36}\.part|zst\.[a-f0-9-]{36}\.part|manifest\.[a-f0-9-]{36}\.part)$/.test(entry.name), 'EXPORT_CORRUPT');
    }
    names.sort(); let last = 0, previous = ZERO_HASH, tails = 0; this.active = null;
    for (let i = 0; i < names.length; i++) {
      invariant(Number(SEGMENT.exec(names[i])![1]) === i + 1, 'EXPORT_CORRUPT');
      const segment = await this.scanSegment(names[i], last, repair); tails += segment.tailBytes;
      invariant(segment.tailBytes === 0 || i === names.length - 1, 'EXPORT_CORRUPT');
      const manifestPath = join(this.root, 'segments', segment.name + '.manifest.json');
      if (existsSync(manifestPath)) {
        const stat = await lstat(manifestPath); invariant(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 4096, 'SEGMENT_CORRUPT');
        const raw = readFileSync(manifestPath, 'utf8'), manifest = JSON.parse(raw) as SegmentManifest;
        const { hash, ...body } = manifest;
        invariant(raw === canonical(manifest) + '\n' && manifest.schema === 'agentnexus/segment/1' && manifest.codec === 'zstd' && manifest.file === segment.name &&
          manifest.first_seq === segment.first && manifest.last_seq === segment.last && manifest.records === segment.count &&
          manifest.bytes === segment.bytes && manifest.sha256 === segment.rawHash && manifest.previous_segment_hash === previous && hash === sha256(canonical(body)), 'SEGMENT_CORRUPT');
        await this.verifyCompressed(join(this.root, 'segments', segment.name + '.zst'), manifest); previous = hash;
      } else { invariant(i === names.length - 1, 'EXPORT_CORRUPT'); this.active = segment; }
      last = segment.last;
    }
    const receipt = Number((this.db.prepare('SELECT COALESCE(MAX(seq),0) AS n FROM anx_exports').get() as Row).n);
    invariant(receipt <= last, 'ACKNOWLEDGED_EXPORT_MISSING');
    this.lastOnDisk = last; this.previousSegmentHash = previous;
    this.nextSegment = this.active ? this.active.index : names.length + 1;
    return { segments: names.length, tail_bytes: tails };
  }

  private verifyDatabase(): number {
    const check = this.db.prepare('PRAGMA quick_check(1)').get() as Row;
    invariant(Object.values(check)[0] === 'ok', 'DATABASE_CORRUPT');
    const previous: Record<Domain, string> = { audit: ZERO_HASH, context: ZERO_HASH, decision: ZERO_HASH };
    let after = 0, count = 0;
    while (true) {
      const rows = this.db.prepare('SELECT * FROM anx_records WHERE seq>? ORDER BY seq LIMIT 32').all(after) as Row[];
      if (!rows.length) break;
      for (const row of rows) {
        const record = this.row(row);
        invariant(record.seq === after + 1 && record.previous_hash === previous[record.domain], 'RECORD_CHAIN_CORRUPT');
        previous[record.domain] = record.hash; after = record.seq; count++;
        for (const ref of artifactRefs(record.domain, record.body)) this.artifacts.assertPublished(ref);
        const outbox = this.db.prepare('SELECT frame_bytes FROM anx_outbox WHERE seq=?').get(record.seq) as Row | undefined;
        const receipt = this.db.prepare('SELECT hash FROM anx_exports WHERE seq=?').get(record.seq) as Row | undefined;
        invariant(Boolean(outbox) !== Boolean(receipt), 'OUTBOX_CORRUPT');
        if (outbox) invariant(Number(outbox.frame_bytes) === Number(row.frame_bytes), 'OUTBOX_CORRUPT');
        if (receipt) invariant(receipt.hash === record.hash, 'OUTBOX_CORRUPT');
      }
    }
    const total = Number((this.db.prepare('SELECT (SELECT COUNT(*) FROM anx_outbox)+(SELECT COUNT(*) FROM anx_exports) AS n').get() as Row).n);
    invariant(total === count, 'OUTBOX_CORRUPT'); return count;
  }

  async verify(): Promise<{ records: number; segments: number; pending: number; objects: number; incomplete: number }> {
    invariant(!this.closed && !this.inTransaction && !this.maintenance && !this.flushing, 'STORE_BUSY');
    this.maintenance = true;
    try {
      const records = this.verifyDatabase(), segments = await this.scanSegments(false), artifacts = await this.artifacts.verify();
      const pending = Number((this.db.prepare('SELECT COUNT(*) AS n FROM anx_outbox').get() as Row).n);
      return { records, segments: segments.segments, pending, objects: artifacts.objects, incomplete: artifacts.incomplete };
    } catch (error) { this.freeze(error); throw storageError(error); }
    finally { this.maintenance = false; }
  }

  async recover(): Promise<{ records: number; exported: number; recovered_tail_bytes: number; objects: number; incomplete: number }> {
    invariant(!this.closed && !this.closing && !this.inTransaction && !this.maintenance && !this.flushing, 'STORE_BUSY');
    this.maintenance = true;
    try {
      if (this.activeHandle) { await this.activeHandle.close(); this.activeHandle = null; }
      const records = this.verifyDatabase(), segments = await this.scanSegments(true), artifacts = await this.artifacts.verify();
      // A complete line may have reached the file before its SQLite receipt. Sync it
      // again before acknowledging; the DB outbox is the source of pending facts.
      const names: string[] = [];
      for await (const e of await opendir(join(this.root, 'segments'))) if (SEGMENT.test(e.name)) names.push(e.name);
      names.sort();
      for (const name of names) {
        const path = join(this.root, 'segments', name), handle = await open(path, 'r+');
        try { await handle.sync(); } finally { await handle.close(); }
        const iterator = this.rawFrames(path);
        try {
          while (true) {
            const next = await iterator.next(); if (next.done) break;
            const record = validateRecord(JSON.parse(next.value.data.subarray(0, -1).toString('utf8')));
            if (this.db.prepare('SELECT 1 FROM anx_outbox WHERE seq=?').get(record.seq)) this.acknowledge(record, name, next.value.offset);
          }
        } finally { await iterator.return(Buffer.alloc(0)); }
      }
      await this.flushInternal(); this.failure = null;
      return { records, exported: this.lastOnDisk, recovered_tail_bytes: segments.tail_bytes, objects: artifacts.objects, incomplete: artifacts.incomplete };
    } catch (error) { this.freeze(error); throw storageError(error); }
    finally { this.maintenance = false; }
  }

  private async sealActive(): Promise<void> {
    if (!this.active || !this.active.count) return;
    if (this.activeHandle) { await this.activeHandle.sync(); await this.activeHandle.close(); this.activeHandle = null; }
    const segment = this.active, path = join(this.root, 'segments', segment.name);
    const expected = await this.scanSegment(segment.name, segment.first - 1, false);
    const rawHash = createHash('sha256'), storedHash = createHash('sha256'); let rawBytes = 0, storedBytes = 0;
    const compressed = path + '.zst', temporary = compressed + '.' + randomUUID() + '.part';
    await pipeline(createReadStream(path, { highWaterMark: CHUNK_BYTES }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) { rawBytes += chunk.length; rawHash.update(chunk); callback(null, chunk); } }),
      createZstdCompress({ chunkSize: CHUNK_BYTES, params: { [constants.ZSTD_c_checksumFlag]: 1 } }),
      new Transform({ highWaterMark: CHUNK_BYTES, transform(chunk, _encoding, callback) { storedBytes += chunk.length; storedHash.update(chunk); callback(null, chunk); } }),
      createWriteStream(temporary, { flags: 'wx', mode: 0o600, highWaterMark: CHUNK_BYTES, flush: true }));
    const hashRaw = rawHash.digest('hex'); invariant(rawBytes === expected.bytes && hashRaw === expected.rawHash, 'EXPORT_CHANGED');
    if (existsSync(compressed)) await rename(compressed, join(this.root, 'recovery', segment.name + '.unacknowledged-' + randomUUID() + '.zst'));
    await rename(temporary, compressed); await syncDirectory(join(this.root, 'segments'));
    const body = { schema: 'agentnexus/segment/1', file: segment.name, codec: 'zstd', node: process.version,
      first_seq: expected.first, last_seq: expected.last, records: expected.count, bytes: rawBytes, sha256: hashRaw,
      stored_bytes: storedBytes, stored_sha256: storedHash.digest('hex'), previous_segment_hash: this.previousSegmentHash };
    const manifest = { ...body, hash: sha256(canonical(body)) };
    const pending = path + '.manifest.' + randomUUID() + '.part';
    await writeNewJson(pending, manifest); await rename(pending, path + '.manifest.json'); await syncDirectory(join(this.root, 'segments'));
    this.previousSegmentHash = manifest.hash; this.nextSegment = segment.index + 1; this.active = null;
  }

  async close(): Promise<void> {
    if (this.closed || this.closing) return;
    this.closing = true; let error: unknown = null;
    try {
      await this.artifacts.waitForIdle(); if (this.flushing) await this.flushing;
      if (!this.faulted) { await this.flushInternal(); await this.sealActive(); }
    } catch (e) { this.freeze(e); error = e; }
    finally {
      await this.activeHandle?.close().catch(() => {}); this.activeHandle = null; await this.artifacts.close();
      try { this.db.close(); } catch (e) { error ??= e; }
      this.closed = true;
      const current = await readOwner(this.root).catch(() => null);
      if (current?.owner.token === this.owner.token) {
        await unlink(join(this.root, 'writer.lock', 'owner.json')); await rmdir(join(this.root, 'writer.lock')); await syncDirectory(this.root);
      } else error ??= new NexusError('STORE_LOCK_CHANGED');
    }
    if (error) throw storageError(error);
  }
}
```
<!-- agentnexus-export-end -->

