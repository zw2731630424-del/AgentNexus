"""Generate reviewable M0 design catalogs. Does not implement or enable features."""
import json
from pathlib import Path

BASE=Path(__file__).resolve().parents[2]/'tasks/AgentNexus-v0.4-M0/architecture'
features=[]
def add(id,default='ON',scopes='G/P/A/T',deps=(),fallback='手动调用已有基础接口',risk='LOW',group='optional',recovery='手动预检、重启；保留旧配置与数据，不自动补跑',conflicts=()):
    features.append(dict(id=id,name=id.replace('.',' / '),description='原生模块 '+id+'；关闭时：'+fallback,version='0.1-design',kind='CORE' if group=='core' else 'OPTIONAL',implementation_status='DESIGN_ONLY',default=default,scopes=scopes.split('/'),depends_on=list(deps),conflicts=list(conflicts),risk=risk,controller='TRUSTED_ADMIN',agent_writable=False,config_schema={'type':'object','additionalProperties':False,'properties':{'state':{'enum':['ON'] if group=='core' else ['ON','OFF','INHERIT']}}},pre_enable='校验作用域、依赖、配置版本、授权；执行功能专用预检',pre_disable='预览依赖闭包与在途任务；冻结新调用、撤销旧epoch、排空或终止自有工作',off_behavior=fallback,recovery=recovery,admin_confirmation=risk in ['HIGH','CRITICAL'],health=['ENABLED','DISABLED','DEGRADED','FAILED','RECOVERING','QUIESCING'],observability=['config_revision','desired_state','effective_state','epoch','owned_processes','last_error','last_switch_event'],tests=['FT-RESOLVE','FT-OFF-NO-WORK','FT-RETAIN','FT-DEPENDENCY','FT-RECOVER']))

for id in ['core.identity','core.state','core.events','core.archive.raw','core.features','core.admin-audit']:
    add(id,'ON','G',fallback='必要运行底座不可关闭；故障时暂停依赖副作用并进入只读恢复',risk='CRITICAL',group='core')
add('policy.mode','ON','G/P',('core.identity','core.admin-audit'), '不是ON/OFF开关；通过独立管理员协议切换ENFORCE/AUDIT_ONLY/DISABLED', 'CRITICAL')
features[-1].update(kind='MODE',mode_default='ENFORCE',allowed_modes=['ENFORCE','AUDIT_ONLY','DISABLED'])
features[-1]['config_schema']={'type':'object','additionalProperties':False,'required':['mode','reason','expires_at','scope'],'properties':{'mode':{'enum':['ENFORCE','AUDIT_ONLY','DISABLED']},'reason':{'type':'string','minLength':1},'expires_at':{'type':'string','format':'date-time'},'scope':{'type':'object'}}}
add('security.os-sandbox','ON','G/P',(), '不再启动沙箱执行器；仅经独立二次确认的隔离测试项目可选择受限权限本机执行器；工作区范围、凭证与档案控制仍有效','CRITICAL',conflicts=('execution.local-unsandboxed',))
add('execution.local-unsandboxed','OFF','G/P',('core.identity',),'暂停未沙箱化的本机执行；手工使用已验证的沙箱执行器；不可用于高风险/正式科研任务','CRITICAL',conflicts=('security.os-sandbox',))
add('security.workspace-isolation','ON','G/P',(), '暂停新的并行写任务；允许管理员指定专用手工作区，核心项目身份与文件授权范围不消失','CRITICAL')
add('security.vault-persistence','ON','G',(), '不持久化任何新凭证；已有密文保留；由管理员向Broker临时输入内存凭证，重启须重新输入','CRITICAL')
add('archive.integrity-scan','ON','G/P',('core.archive.raw',),'停止定期全盘校验；每次写入哈希、读取校验与只追加约束继续；管理员可手动verify','HIGH')
add('archive.retrieval-agent','OFF','G/P/A/T',('core.archive.raw',),'Archive API/CLI按事件、时间、任务、字节范围手动检索')
add('archive.summary','OFF','G/P/A/T',('core.archive.raw',),'不生成摘要，使用原始范围；当前模型窗口不足则显式暂停')
add('archive.keyword-index','ON','G/P',('core.archive.raw',),'流式分页扫描原档案，不调用已关闭索引')
add('archive.vector-index','OFF','G/P',('core.archive.raw',),'停写停查向量；用户可手动选择已启用关键词或原档案扫描')
add('archive.knowledge-extract','OFF','G/P/A/T',('core.archive.raw',),'不自动整理知识；人工创建有来源的条目')
add('archive.backup-auto','ON','G/P',('core.archive.raw',),'停止自动备份；手动导出一致性快照，显示恢复点陈旧','HIGH')
add('native.harness','ON','G/P/A',('core.identity','core.events','core.archive.raw','model.gateway'),'停止原生Agent轮次；保留手工任务与档案管理，可手动选择已验证适配器','HIGH')
add('native.context-assembly','ON','G/P/A',('native.harness',),'原生模型轮次暂停；仍可手工检索、编辑任务和恢复档案','HIGH')
add('native.checkpoints-auto','ON','G/P/A/T',('core.state',),'不自动生成工作检查点；核心状态日志和在途执行账本仍持久化')
for id in ['file','shell','git','test']:
    add('tool.'+id,'ON' if id in ['file','test'] else 'OFF','G/P/A/T',('core.identity','core.archive.raw'), '撤销该工具新调用；用户手动操作并导入结果，其他工具独立继续','HIGH')
for id in ['mcp','acp','lsp','browser']:
    add('adapter.'+id,'OFF','G/P/A',('core.identity',),'关闭该适配器及其自有进程；手动使用已启用原生工具，历史数据保留','HIGH')
for id in ['codex','claude','zcode','opencode']:
    add('adapter.harness.'+id,'OFF','G/P/A',('core.identity','core.archive.raw'),'停接收新任务并核对旧进程；人工选择native或另一已验证后端；不隐式切换','HIGH')
for id,fall in [('planning','用户或Lead手动建立任务'),('spawn','仅可信管理员手动创建子Agent'),('review','手动发起只读Reviewer'),('coordinator','静态配额与人工排程'),('repair','报告问题，由用户或Lead手动修复')]:
    add('runtime.auto-'+id,'OFF','G/P/A/T',('core.state','core.events'),fall,'HIGH' if id in ['spawn','repair'] else 'LOW')
for id,default in [('resident','ON'),('lead','ON'),('subagent','ON'),('reviewer','ON'),('coordinator','OFF')]:
    add('runtime.role.'+id,default,'G/P',('core.identity','core.state'),'停止派发该系统角色；Resident语义助手关闭时持久事件服务仍运行；Lead/子Agent改用手工任务，Coordinator改静态配额','HIGH' if id in ['lead','subagent'] else 'LOW')
add('model.gateway','ON','G/P',('core.identity',),'停止上游模型调用；CLI/档案/手工任务继续，不允许绕开Gateway直读Key','HIGH')
for id,default,fall in [('auto-route','OFF','手工指定Provider/Model Profile'),('key-round-robin','OFF','固定管理员选定CredentialRef'),('provider-failover','OFF','失败后停止并报告；人工选择供应商后新建请求'),('capability-probe','OFF','使用带来源和有效期的手工能力注册，未知能力明确拒绝')]:
    add('model.'+id,default,'G/P/A/T',('model.gateway',),fall,'HIGH' if id=='provider-failover' else 'LOW')
for id in ['snapshot','merge','commit','push']:
    add('git.auto-'+id,'OFF','G/P/A/T',('tool.git',),'不自动执行对应Git动作；手工发起仍需独立权限、候选绑定和有效模式判定','HIGH')
for id in ['desktop','usage-dashboard','notifications','reports','decision-ledger']:
    add('ui.'+id,'OFF' if id=='desktop' else 'ON','G/P',(), '停止该展示或通知；CLI/API可手动查看原始状态与账目；不删除数据')

add('wf.runtime','ON','G/P',('core.state',),'所有可选工作流停止调用；Gate显示BYPASSED；手工最小任务和独立OS/凭证/审计继续','HIGH')
wf=[('rules.global','ON','最小平台与用户授权仍有效；不注入可选通用规则'),('rules.project-index','ON','不加载可选规则索引；项目隔离和已授权范围保持'),('rules.registration','ON','不自动登记规则；可信管理员手工登记，Agent不能自授规则变更权限'),('capabilities','ON','使用手工能力说明；执行权限仍由Broker核验'),('context','ON','停止工作流上下文整理；原档案与原生上下文组装继续'),('decisions','ON','手工记录PROPOSED/ACCEPTED状态，禁止Agent自批准'),('evidence','ON','手工绑定证据引用；原始工具输入输出仍必存'),('feasibility','ON','手工进行可行性评估'),('governance','ON','停止可选分类门禁；受保护控制数据仍由OS隔离'),('governance.service','ON','停止自动索引/治理扫描；管理员手工检查；不可让Agent编辑控制数据库'),('review.strict','ON','停止严格审查自动门禁；手工启动Reviewer'),('verification','ON','停止工作流验证器自动编排；测试本身可手动运行，结果NOT_RUN/BYPASSED'),('safety-guidance','ON','不注入可选提示；程序和OS安全控制仍在'),('reference.router','ON','停止参考资料路由；手工选读'),('roles.router','ON','停止自动选工作角色；手工选已启用角色'),('workflow.router','ON','不自动选项目流程；手工选流程'),('checks.gate-depth','ON','不自动升级工作深度；手工选择'),('checks.measurement','ON','不自动执行量测清单，显示BYPASSED'),('checks.protocol','ON','不自动执行协议清单，显示BYPASSED；专属实验授权仍必需'),('checks.regression','ON','不自动执行回归清单，显示BYPASSED'),('validators.task','ON','任务保留最小可追踪定义；未验证字段不标PASS'),('validators.review','ON','手工检查候选绑定；核心ReviewResult仍不允许旧版本PASS批准新代码'),('validators.package','ON','停止可选包验证；归档本身的内容哈希与事务仍必需')]
for id,default,fall in wf:add('wf.'+id,default,'G/P/A/T',('wf.runtime',),fall,'HIGH' if id.startswith('rules.') else 'LOW')
for id in ['scout','worker','verifier','reviewer']:
    add('wf.role.'+id,'ON','G/P/A/T',('wf.runtime',),'不再派发该工作配置；可手工选其他已启用角色；Reviewer只读是独立执行约束')
for i in range(7):
    add(f'wf.gate.g{i}','ON','G/P/A/T',('wf.runtime',),'跳过该Gate并记录BYPASSED、原因和配置版本；不产生PASS；其他Gate可独立工作')
for id in ['artifact','checkpoint','closeout','commands','decisions','design','document','experiment','freeze','goal','knowledge','review','subtask','contract','cost','workflow']:
    add('wf.templates.'+id,'ON','G/P/A/T',('wf.runtime',),'停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录')

catalog={'schema_version':'0.1-design','status':'M0 DESIGN ONLY; no switch implemented','scope_legend':{'G':'global','P':'project','A':'agent','T':'task'},'resolution':'Explicit ancestor OFF is a veto; ON permits narrowing. Closest explicit value applies only without ancestor OFF; default is not an explicit veto. INHERIT contributes no new setting. Core invariants cannot be overridden.','unknown_feature':'deny enable with UNKNOWN_FEATURE','features':features}
BASE.mkdir(parents=True,exist_ok=True)
(BASE/'feature_catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
lines=['# Feature Catalog v0.4 M0 设计','',f'共 {len(features)} 项。全部为 **DESIGN_ONLY**；本轮没有实现模块开关。机器定义见 [feature_catalog.json](feature_catalog.json)。来源是交接架构 v0.4 修订 B—F（第1228—1387行）及逐文件 [Workflow Kit映射](workflow_kit_mapping.md)。','', '## 解析与关闭合同','', '作用域 G/P/A/T 分别为全局/项目/Agent/Task。显式高层 OFF 是禁止下层启用的屏障；ON 表示允许在更小作用域收紧，INHERIT 沿用上层。默认值不是显式管理员限制。非法作用域或未知ID拒绝；依赖未启用拒绝启用，不替管理员偷偷开启依赖。该细化为M0提案，需按FT-RESOLVE固定测试。','', '配置状态与健康状态分开。所有修改仅可信管理通道，Agent不可改。关闭采用 prepare→预览依赖闭包→冻结派发→递增epoch→排空/终止自有任务→证明无残留→commit OFF。取消超时仍有进程时显示QUIESCING/FAILED，不能宣称DISABLED。关闭依赖时一次原子变更包含所有受影响模块，或拒绝并返回影响，不接受半启用。','', '每项JSON包含版本、配置Schema、默认状态、允许作用域、依赖/冲突、风险、确认要求、前置条件、降级、恢复、健康和可观测字段。运行不变量(core.*)不是用户可选增强；policy.mode使用专用三模式协议，不把OFF解释为普通布尔旁路。独立底层保护各有控制项，不能由Policy模式联动。','', 'FT-RESOLVE：覆盖默认/继承/祖先OFF/子级收紧/非法作用域；FT-OFF-NO-WORK：进程树、定时器、网络与隐式调用归零；FT-RETAIN：档案与配置指纹不变；FT-DEPENDENCY：依赖故障与冲突拒绝；FT-RECOVER：手动重启/回滚、旧epoch拒绝。均为M1—M7的NOT_RUN验收项；本轮仅校验目录结构和依赖图。','', '## 功能目录','', '| Feature ID | 默认 | 作用域 | 依赖 | 风险 | 关闭后的真实路径 |','|---|---|---|---|---|---|']
for f in features:lines.append('| '+ ' | '.join([f['id'],f['mode_default'] if f['kind']=='MODE' else f['default'], '/'.join(f['scopes']),', '.join(f['depends_on']) or '无',f['risk'],f['off_behavior']])+' |')
lines+=['','## 运行底座与来源ID','', 'Workflow Kit映射中 wf.provenance.*、wf.validation.*、wf.compat.*、wf.help*、wf.examples、wf.build.cache 是只读来源或测试资料标识，不代表新增后台模块。wf.legacy.* 是迁移/发行/安装来源，不在原生Harness运行；不注册可执行Feature，不在运行时装原套件或hooks。wf.gates是七个Gate的分组标签。工作流的所有运行功能已分别登记；来源文件不必各自启动一个模块。','', '默认“ON”描述将来功能存在时的产品缺省，不代表M0已安装或已验证。手工备用路径必须在实际实现阶段演练；当前状态全部NOT_RUN。']
(BASE/'feature_catalog.md').write_text('\n'.join(lines)+'\n',encoding='utf8')

policies=[]
def policy(id,level,owner,normal,audit,disabled,tests,risk='HIGH',degradable=False):
    policies.append(dict(id=id,level=level,enforcement_owner=owner,scope='project/task/resource',default_mode='ENFORCE',degradable=degradable,risk=risk,modes={'ENFORCE':normal,'AUDIT_ONLY':audit,'DISABLED':disabled},test_ids=tests,implementation_status='NOT_RUN',source='Architecture 15.1-15.9 and v0.4 C; M0 security_review',failure='owner不可用时暂停依赖副作用；不自动改模式'))
fixed=[('P.IDENTITY','L0','可信IPC身份与能力Broker','校验peer身份，禁止payload自报管理员'),('P.FS_SCOPE','L0','OS执行器/句柄授权','路径/重解析点/硬链接/UNC/ADS边界，操作绑定句柄'),('P.REVIEW_RO','L0','OS只读身份/挂载','Reviewer对候选树不可写'),('P.ARCHIVE_APPEND','L0','Archive Writer/文件ACL','原档案只追加；摘要不能覆盖；读取内容哈希校验'),('P.SECRET_BOUNDARY','L0','Credential Broker/模型出口','Key不进worker/renderer/模型；意外敏感原文加密隔离存储'),('P.DB_ATOMIC','L0','唯一约束/条件事务','消息去重、原子claim、事务与检查约束'),('P.EXPERIMENT_ONCE','L0','独立实验Capability/数据库','精确实验+协议+seed单次claim；不确定结果不得重置或重跑'),('P.WORKSPACE_WRITER','L0','Broker租约/OS进程树','同工作区单写者，fencing token与真实进程退出核验'),('P.BUDGET_HARD','L0','Model Gateway原子额度','调用前预留全层级硬预算；换Key不绕过账户限额'),('P.ADMIN_MODE','L0','独立管理Broker/审计库','仅可信管理员切模式；双确认、范围、原因、期限与审计；Agent不得改'),('P.APPROVAL_REPLAY','L0','执行许可存储/原子consume','凭证绑定参数/版本/nonce/次数，原子消费不重放'),('P.TOOL_CONTRACT','L0','Tool Gateway/执行器','工具Schema、注册身份、执行许可与epoch必须有效')]
for id,level,owner,action in fixed:
    policy(id,level,owner,action,action+'；独立不变量不随应用审计模式关闭',action+'；属于独立底层/结构保护，未隐式关闭',[id+'-POS',id+'-NEG',id+'-BYPASS',id+'-RACE',id+'-RECOVERY',id+'-UPGRADE'])
for id,description in [('P.GIT_PUBLISH','指定仓库/远程/分支/候选SHA的Git commit/merge/push应用审批'),('P.DATA_DELETE','精确数据集合与操作参数的删除应用审批'),('P.INSTALL','软件安装与依赖生命周期脚本的应用审批'),('P.PROJECT_RULE_CHANGE','项目工作规则变更应用审批')]:
    policy(id,'L1','PDP/PEP/Approval Service',description+'，无有效人工批准则REQUIRE_APPROVAL', '默认仍执行ENFORCE；仅管理员选定的可降级policy_id记录would-deny并允许符合独立底层能力的请求','此作用域内应用策略不评估，记录BYPASSED而非ALLOW；工具开关、独立OS/能力仍可能拒绝',[id+'-POS',id+'-NEG',id+'-BYPASS',id+'-TOKEN',id+'-RACE',id+'-RECOVERY',id+'-UPGRADE',id+'-MODE'],degradable=True)
policy('P.EXPERIMENT_APPROVAL','L1','独立科研执行授权服务','需要专属协议的人工授权','仍需专属授权；不是通用PDP可降级条款','仍需专属授权；关闭通用策略不创建科研权限',['P.EXPERIMENT_APPROVAL-POS','P.EXPERIMENT_APPROVAL-NEG','P.EXPERIMENT_APPROVAL-BYPASS','P.EXPERIMENT_APPROVAL-RACE','P.EXPERIMENT_APPROVAL-RECOVERY','P.EXPERIMENT_APPROVAL-UPGRADE'])
policy('P.BUDGET_INCREASE','L1','Model Gateway管理员配置','预算提高需可信管理员确认','仍需管理员；余额硬限制独立','仍需管理员；旁路不凭空增加余额',['P.BUDGET_INCREASE-POS','P.BUDGET_INCREASE-NEG','P.BUDGET_INCREASE-BYPASS','P.BUDGET_INCREASE-RACE','P.BUDGET_INCREASE-RECOVERY','P.BUDGET_INCREASE-UPGRADE'])
policy('P.REVIEW_BINDING','L2','ReviewResult schema/集成服务','只有候选/基线/规则/测试配置哈希完全匹配的PASS可用于批准','评估失败可由选定质量策略旁路，但旧审查不能被改写成新候选PASS','可不把审查作为集成前提；历史PASS仍只能对应原候选',['P.REVIEW_BINDING-MUTATE','P.REVIEW_BINDING-STALE','P.REVIEW_BINDING-BYPASS'],degradable=True)
policy('P.WORKFLOW_GATES','L2','Workflow Runtime','已启用Gate验证证据，关闭的Gate为BYPASSED','选定质量Gate仅记录；跳过不变成PASS','应用质量阻断关闭；Gate关闭仍为BYPASSED，NOT_RUN保持原值',['P.WORKFLOW_GATES-BYPASSED','P.WORKFLOW_GATES-NOTRUN','P.WORKFLOW_GATES-OFF'],degradable=True,risk='MEDIUM')
policy('P.SCIENTIFIC_CLAIM','L2','证据/独立审查','缺证据为INCONCLUSIVE；程序不能保证科学真值','可绕过工作推进阻断，不能伪造已运行或已证实','不评估质量要求；Result schema仍保留真实测试状态',['P.SCIENTIFIC_CLAIM-FAKE','P.SCIENTIFIC_CLAIM-MISSING'],degradable=True,risk='MEDIUM')
policy('P.STYLE','L3','规则提示/可选linter','建议并显示差异','仅记录建议','不注入/不检查该应用指导',['P.STYLE-OFF'],degradable=True,risk='LOW')
pc={'schema_version':'0.1-design','status':'M0 DESIGN ONLY; modes are not implemented','policies':policies}
(BASE/'policy_catalog.json').write_text(json.dumps(pc,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
lines=['# Policy Catalog v0.4 M0 设计','',f'{len(policies)} 条，机器定义 [policy_catalog.json](policy_catalog.json)。L0/L1的每条正向、反向、绕过、并发、恢复、升级用例均登记；所有产品策略测试目前 **NOT_RUN**。本轮SQL探针仅验证部分底层模式，不能给这些策略授予PASS。','', '## 三模式的确切边界','', 'ENFORCE执行当前策略；AUDIT_ONLY仍评估与记日志，仅对管理员明确选择的degradable policy_id解除应用阻断，未选条款仍ENFORCE；DISABLED在选定全局/项目/策略组范围内不调用应用PDP，审计写BYPASSED。不存在把DENY改写为历史ALLOW的操作。模式不是按L0/L1名字粗暴全开关；表中owner为独立OS、数据库、凭证、原档案、专属科研服务的不变量始终由各自owner落实。','', '恢复通道只修改模式授权，不执行Agent工具。它独立于故障PDP，并验证本机管理员peer身份；Agent/MCP/项目文件无此端点能力。旁路需二次确认、精确范围、原因与过期；M0建议上限AUDIT_ONLY 2小时、DISABLED 30分钟，可再次人工确认续期。','', '切换先冻结新副作用→核对在途进程/执行许可→撤销旧epoch→在独立管理库原子追加审计与提交新模式→广播有效配置。审计不可持久化则不切换。服务崩溃从已提交管理日志恢复；不能把配置读取失败当DISABLED。任何过期/时钟异常均先封锁新的旁路副作用，进入ENFORCE_PENDING_PREFLIGHT；通过预检并由预先确认的恢复目标或管理员确认才恢复ENFORCE。预检失败保持封锁，不延长旁路。','', '手动回退不意味着自动启用其他Feature；各工具、网络、沙箱、工作区保护独立。DISABLED的语义测试必须证明：同一可降级应用条款在ENFORCE被阻断，在选定AUDIT_ONLY记录would-deny但执行，在DISABLED不评估PDP；同时OS越界、Agent改模式等独立控制仍拒绝。','', '## 策略目录','', '| ID 与级别 | 强制位置 | ENFORCE | AUDIT_ONLY | DISABLED |','|---|---|---|---|---|']
for p in policies:lines.append('| '+' | '.join([p['id']+' '+p['level'],p['enforcement_owner'],p['modes']['ENFORCE'],p['modes']['AUDIT_ONLY'],p['modes']['DISABLED']])+' |')
lines+=['','## 测试追踪','', 'JSON中的每个test_id是后续可执行测试合同，不能解读为已运行。每条L0/L1至少覆盖合法调用、伪造身份、范围/nonce失配、直接Shell/外部Harness绕过、并发竞争、故障恢复及规则版本升级。管理员模式专项还需PDP故障、管理审计磁盘满、过期期间睡眠/重启/时钟回拨、在途许可撤销、重复确认、范围重叠的保守合成（ENFORCE优先）等案例。','', 'L3提示无法成为安全保证；L2语义检查只能给出有范围的证据。L0标识的是平台约束，不表示能够抵抗机器管理员主动修改OS或离线磁盘。管理员主动降低独立底层保护需另一个配置动作、风险展示与审计，不能通过policy.mode连带更改。']
(BASE/'policy_catalog.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
print(json.dumps({'features':len(features),'policies':len(policies)}))
