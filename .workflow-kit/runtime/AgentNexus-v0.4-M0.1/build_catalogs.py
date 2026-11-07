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
