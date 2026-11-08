"""Freeze local deliverables; no deployment, Git publication, Key import, or HTTP."""
from pathlib import Path
import hashlib, importlib.util, json, re, runpy, shutil, zipfile

D=Path(__file__).resolve().parents[1]; R=D.parents[1]; RT=R/'.workflow-kit/runtime/AgentNexus-M1.8.3'
runpy.run_path(str(D/'build-tools/prepare-reports.py'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(rel,text):
 p=D/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text.strip()+'\n',encoding='utf-8')
def js(rel,obj):write(rel,json.dumps(obj,ensure_ascii=False,indent=2))
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def source_files():return sorted([p for p in (D/'source').rglob('*') if p.is_file() and not any(x in ['dist','node_modules','.git','raw'] for x in p.relative_to(D/'source').parts)],key=lambda p:p.relative_to(D/'source').as_posix())
files=source_files(); entries=[{'path':p.relative_to(D/'source').as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files]
aggregate=hashlib.sha256(''.join(x['path']+'\0'+x['sha256']+'\n' for x in entries).encode()).hexdigest()
js('source.manifest.json',{'schema':1,'files':entries,'aggregate_sha256':aggregate,'algorithm':'SHA256 sorted UTF8(path + NUL + sha256 + LF); excludes dist/node_modules/raw/.git'})
current={x['path']:x['sha256'] for x in entries}
runs=sorted((RT/'verification').glob('*/result.json'))
latest=load(runs[-1]);assert latest['status']=='PASS' and latest['source_unchanged'] and {x['path']:x['sha256'] for x in latest['final_source']}==current,'Final full verification must match exact current source'
stage=next(x for x in latest['stages'] if x['name']=='affected-tests')
stats={m.group(1):int(m.group(2)) for line in stage['summary'] if (m:=re.match(r'# (tests|pass|fail|skipped|cancelled) (\d+)',line))}
assert stats['fail']==0
native=load(RT/'native/build-report.json'); assert all(x['result']['failed']==0 for x in native['tests'])
native_count=[x['result']['passed'] for x in native['tests']]
baseline=load(D/'evidence/baseline/freeze.json'); drift=[x['path'] for x in baseline['entries'] if not (R/x['path']).is_file() or sha(R/x['path'])!=x['sha256']]
assert not drift,'Historical delivery drift'
assert sha(R/'AGENTS.md')==baseline['agents_sha256'] and sha(R/'.workflow-kit/governance/policy.json')==baseline['policy_sha256']
js('evidence/baseline/preservation.json',{'files':len(baseline['entries']),'status':'PASS','drift':drift,'scope':'M1.8.2 and original Provider UI exact initial bytes; root/historical tracked files unchanged in Git; no historical relocation'})

# Machine read coverage does not pretend that every inherited byte received a line review.
coverage=[]
for family in ['AgentNexus-M1.8.2','AgentNexus-Model-Provider-UI']:
 for p in sorted((R/'deliverables'/family/'source').rglob('*')):
  if p.is_file() and not any(x in ['node_modules','dist','.git'] for x in p.parts) and p.suffix in ['.ts','.mjs','.cjs','.ps1','.cs','.json','.html','.css']:
   text=p.read_text(encoding='utf-8-sig');coverage.append({'path':p.relative_to(R).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size,'scope':'MACHINE_COMPLETE_TEXT_READ','imports':re.findall(r"from\s+['\"]([^'\"]+)",text)})
js('evidence/baseline/read-coverage.json',{'semantic_review':'Targeted full Vault/DPAPI, Gateway/Adapter/Key Pool/Ledger/Egress, Desktop Main/Preload/Renderer/IPC, Resource Governance, named baseline reports, independent reviews and ADR/issue/catalog structured review; inherited unrelated code machine read only','source_texts':coverage})
feature=load(D/'source/config/agentnexus/features.json');policy=load(D/'source/config/agentnexus/policies.json')
write('reports/phase0.md',f'''
# Phase 0 基线与源码冻结

起始 HEAD `{baseline['head']}`，起始 tracked 工作树干净；本轮新增 AgentNexus-M1.8.3，没有 commit/push。原 M1.8.2 与 Model Provider UI 共 {len(baseline['entries'])} 文件已在实施前 SHA256 冻结，交付前全部复核无漂移。根产品及其他历史 tracked 文件未变，没有搬动历史目录或覆盖同 SID 失败。

AGENTS、存在性检查后的 project-rules（索引不存在）、治理 policy 和工作流路由已读；registered_rules 为空，无附加 always 规则。适用工作流路由没有已启用匹配子流程。优先 govern new 尝试在旧长路径失败，最终采用原工具 extended-length 根检查；未修改规则/策略或增加忽略项。

已核对 M1.8.2 完整 README/验收/Vault与egress资格/独立安全审查、原同 SID 原始记录、原 UI 验收和独立审查；相关源码与 M0—ADR052、M1.7—M1.8.2 历史问题、Resource Governance、Feature/Policy 目录作任务相关复核。完整机器读取与语义复核区分见 read-coverage，历史栈追踪/重复测试不冒称逐行审查。目录 Feature {len(feature.get('features',[]))} 项、Policy {len(policy.get('policies',[]))} 项保持原字节。

实际旧架构是 Host 内 Vault，DPAPI helper 与 Host 同用户 SID；不是独立服务。Electron frame 验证不等于 OS pipe 认证。旧 ModelUsage/Campaign Owner 均在 Host；新产品远端分支转移至唯一服务 Owner，Host 只留审计投影。

最终源码 {len(files)} 文件，集合 SHA256 `{aggregate}`。最终运行前后同集合；新旧文件逐项清单见 source.manifest。原始失败、各候选及独立报告分别保存，不混用新旧 SHA/测试结论。
''')

tests=[
('Credential Service 自身读取凭证','SIMULATED','PASS','实际独立服务 SID 读取/DPAPI 仍 NOT_RUN'),
('同 SID 普通进程读取 Vault 密文','HISTORICAL_REAL_OS','FAIL','M1.8.2 反例仍可读；新服务 DACL 未部署'),
('同 SID 普通进程尝试独立解密','HISTORICAL_REAL_OS','FAIL','M1.8.2 SHA 相符反例保持；新服务身份密文测试 BLOCKED'),
('同 SID 普通进程连接服务','SIMULATED','PASS','native token fixture 拒绝；真实 pipe 连接 NOT_RUN'),
('伪造 Host PID','SIMULATED','PASS','payload 声明不授权；实际 OS 对抗 NOT_RUN'),
('伪造 Process Start Identity','SIMULATED','PASS','native 句柄/创建时间核验源码；实际 OS 对抗 NOT_RUN'),
('伪造 IPC 消息','SIMULATED','PASS','严格方法/字段与非读取 API；真实 native 认证 NOT_RUN'),
('重放旧 IPC 请求','SIMULATED','PASS','prepared nonce、管理 id、导入 ticket 单次消费'),
('过期 Credential Handle','SIMULATED','PASS','过期 Key / ticket / deadline 拒绝'),
('撤销 Credential Handle','SIMULATED','PASS','旧 prepare 也不可重选 Handle'),
('Worker 读取 Vault','NONE','NOT_RUN','需真实 Worker token/受保护目录'),
('Reviewer 读取 Vault','NONE','NOT_RUN','需真实 Reviewer token/受保护目录'),
('Agent 读取完整 Key','SIMULATED','PASS','scoped complete 与无 read/export；OS 权限未验证'),
('日志泄漏','SIMULATED','PASS','已知及本次新 Key、编码元数据在 audit 前拒绝'),
('Context 泄漏','SIMULATED','PASS','Guard/egress 来源覆盖；未真实外发'),
('Prompt 泄漏','SIMULATED','PASS','原文/编码/跨语义 delta Guard；非通用 DLP'),
('Host 崩溃','NONE','NOT_RUN','新安装 Host/服务组合崩溃未测'),
('Credential Service 崩溃','SIMULATED_PROCESS','PASS','真实同账户 fork 被 kill，重启保留 UNKNOWN；非 SCM 身份资格'),
('Host 重启','SIMULATED','PASS','显式旧合成回归/新远端元数据恢复，非安装身份资格'),
('Credential Service 重启','SIMULATED_PROCESS','PASS','私有 IPC 子进程重开；无预算重置/自动重发'),
('轮换期间并发请求','SIMULATED','PASS','已发送请求保持原 Handle，旧 Handle 拒新请求'),
('Token 预算竞争','SIMULATED','PASS','单 Owner 同步事务四级原子预留/失败回滚'),
('Data Egress 拒绝','SIMULATED','PASS','完整字节/分类/工具 schema /重复 JSON /最终 fence'),
('Provider 超时','SIMULATED','PASS','Fixture 进入发送后超时持有；真实 Provider NOT_RUN'),
('Streaming 中断','SIMULATED','PASS','部分 Usage、背压、UTF8、取消、断连保留'),
]
js('attack-test-matrix.json',{'source_sha256':aggregate,'overall_production':'BLOCKED','cases':[{'id':i+1,'scenario':x[0],'assurance':x[1],'result':x[2],'production':'BLOCKED','evidence_scope':x[3]} for i,x in enumerate(tests)]})
write('reports/windows-attack-tests.md','# 真实 OS 测试与离线证据\n\n**生产全部 BLOCKED。** 本轮没有部署独立服务账户、修改 ACL 或运行真实 native pipe。下列 PASS 只用于明确标记的合成范围；原同 SID 反例 FAIL 保持。\n\n|序号|场景|本轮/继承证据|范围|\n|---|---|---|---|\n'+'\n'.join(f'|{i+1}|{x[0]}|{x[1]} / {x[2]}|{x[3]}|' for i,x in enumerate(tests))+'\n\n不同 SID、实际 Worker/Reviewer、VM_READ/WRITE、DUP_HANDLE、转储与缓存、SCM 重启均需单独部署审批。没有将同进程单测当作进程或身份隔离。见 attack-test-matrix.json 与 Native 11 项资格计划。')

requirements=['用户在原 UI 添加 API Key','无需 JSON/环境变量认证','普通 Renderer 不读已存 Key','普通 Agent 不读 Key','Subagent 不读 Key','同 SID 普通进程不能独立解密','同 SID 不能伪造可信服务请求','服务独占凭证使用','Gateway 受控使用凭证','最终出站前 Data Egress','唯一1亿 Token Owner','撤销与轮换','Host/服务重启恢复','凭证操作审计','UI 正确 Provider/模型状态']
js('vault-qualification.json',{'status':'BLOCKED','offline_implementation':'PASS','source_sha256':aggregate,'deployed':False,'real_os_isolation':'NOT_RUN','historical_same_sid_counterexample':'FAIL_PRESERVED','real_credentials_imported':0,'criteria':[{'id':f'VQ{i+1:02}','requirement':t,'production':'BLOCKED','offline':'SIMULATED; see test matrix and UI report','note':'Trusted input Renderer/Main transiently see new input; stored Key never has a readback API.' if i==2 else 'Real Windows service identity/permissions/composition evidence required.'} for i,t in enumerate(requirements)]})
write('reports/credential-vault-qualification.md','# 生产 Credential Vault 资格\n\n**BLOCKED。** 本轮没有真实独立服务部署/身份隔离证据，不能用代码、合成PASS或签名模板宣布生产资格。历史同SID读取/解密合成密文反例仍为FAIL；原记录保留。\n\n|标准|离线范围|生产|\n|---|---|---|\n'+'\n'.join(f'|{i+1}. {t}|SIMULATED；见验收及测试矩阵|BLOCKED|' for i,t in enumerate(requirements))+'\n\n可信输入Renderer/Main会短暂接触正在输入的新值，之后清空，无已存Key读回；不能把这个过程描述成所有Renderer都绝对无法看见新输入。实际内存/句柄、缓存/转储、启动链和跨角色权限仍须真实OS验证。\n\n先单独批准[隔离部署与合成资格计划](deployment-approval.md)，取得11项Windows证据与独立复核，再判断资格。通过后才可在原UI导入真实Key，随后展示当时具体请求正文/绑定，经用户确认才真实调用。100,000,000输入+输出授权未重置，也不重新索取。')
write('reports/same-sid-tests.md','''# 同 SID 测试裁定

这里的“同SID普通进程”指与交互Host共用operator用户SID的普通组件/Worker/Reviewer，不是已经攻陷独立服务身份的管理员。新服务SID不分配给这些进程；只有固定被保护的服务/Node/DPAPI helper在可信边界内使用它。

M1.8.2实际反例保持FAIL：同Host用户SID进程读合成密文并成功CurrentUser解密，摘要相等。原证据与生成/reader源码保留；M1.8.3同账户Node分进程仍只是SIMULATED，不声称它本身修复反例。

新真实测试NOT_RUN/BLOCKED：安装批准后用实际服务SID加密合成值，把仅含密文的副本交给普通同Host SID独立进程，记录TokenUser、完整性/会话、PID/创建时间、读结果、解密错误/退出码和摘要；另记录实际pipe连接、伪造PID/start/消息、重放、内存/句柄/dump拒绝。无账户/ACL/安装授权时不执行。现有native纯token fixture和Node协议测试明确为SIMULATED，不能升级为该结果。
''')
write('reports/different-sid-tests.md','''# 不同 SID 测试裁定

**NOT_RUN / BLOCKED。** 本机没有部署凭证服务，没有启动独立服务身份，也未为攻击测试创建Windows账户。不能用伪造SID字段、管理员/System token或同进程对象代替普通不同SID进程。

获批后至少分别核对：交互operator与独立服务SID不同；与Host不同的普通现有低权限用户（若可用）对服务密文/目录/pipe/Key读取接口的拒绝。每次均须实际新进程和TokenUser证据，先确认攻击确实到达预期对象，再裁定结果；缺第二身份/登录条件时继续NOT_RUN，不默认PASS。不为Agent类型各建账户。

该试验与同Host SID普通进程试验分开记录。当前只有原同SID解密FAIL、离线协议/纯token测试和只读部署预检，参见[25项矩阵](windows-attack-tests.md)及[Windows服务计划](windows-service-design.md)。
''')
js('data-egress-qualification.json',{'offline':'PASS','production':'BLOCKED','source_sha256':aggregate,'allowed':['PUBLIC_REVIEWED','SYNTHETIC_REVIEWED'],'denied':['INTERNAL','CONFIDENTIAL','SECRET','UNKNOWN'],'active_live_grants':0,'real_requests':0,'generic_dlp_qualified':False,'drafts':5})
js('usage-token-cost.json',{'authorization':'INHERITED_M181_100M_INPUT_PLUS_OUTPUT','limit_tokens':100000000,'reauthorization_requested':False,'real_requests':0,'real_input_tokens':0,'real_output_tokens':0,'real_reserved_tokens':0,'remaining_authorized_tokens':100000000,'observed_real_model_fees_usd':0,'provider_invoice':None,'production_ledger_owner':'CREDENTIAL_SERVICE_FIXED_PROTECTED_STORE','production_ledger_provisioned':False,'host_budget_authority':False,'unknown_usage_automatically_released':False})

plan={'status':'AWAITING_SEPARATE_DEPLOYMENT_APPROVAL','actions_executed':False,'proposed_service':'AgentNexusCredential','identity':'NT SERVICE\\AgentNexusCredential','deterministic_service_sid':'S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873','sid_observation':'sc.exe showsid read-only; STATUS Inactive, not a created/active account','proposed_operator_sid':'S-1-5-21-2532670394-1554971530-4095700938-1001','install_root':'C:\\Program Files\\AgentNexus','service_data_root':'C:\\ProgramData\\AgentNexusCredential','initial_mode':'CMS_SIGNED_QUALIFICATION_ONLY','real_import_enabled':False,'live_enabled':False,'logon':'Service logon only; no interactive Agent accounts; no Debug/admin grant to service','new_agent_accounts':0,'firewall_changes_proposed':False,'ubuntu_changes_proposed':False,'appcontainer_registration_proposed':False,'rollback':'Revoke/expire grants; stop service and its private Job; unregister only approved SCM entry; retain encrypted data and original ledger for reviewed recovery, never reset quota.'}
js('deployment-plan.json',plan)
write('reports/deployment-runbook.md','''
# 独立部署审批清单与回滚

本清单仅供批准，未执行。建议首批仅批准 QUALIFICATION_ONLY 安装与合成 OS 验证；不包含真实 Key 导入或模型请求。现有交互 SID 不足，因为其他同 SID 进程已实际解密其 DPAPI 数据；独立服务身份是必要变化。

|对象|精确拟议范围与权限|
|---|---|
|账户/服务|仅 SCM 服务 AgentNexusCredential，Virtual Service Account NT SERVICE\\AgentNexusCredential；Service SID类型unrestricted(1)，单服务 own-process；不建每 Agent 账户|
|实际SID|只读 showsid 得到 S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873，STATUS Inactive；尚非活动身份|
|启动|固定带引号 `C:\\Program Files\\AgentNexus\\AgentNexusCredential.exe` 无参，初期手动；子进程固定 node.exe + app/dist/src/agentnexus/credential-service/engine.js；无脚本/URL/env参数|
|登录权|仅服务登录；无交互/远程桌面/批量 Agent 登录，不授管理员/SeDebug；SCM实际token/privilege必须预检|
|程序树|C:\\Program Files\\AgentNexus：SYSTEM/Administrators/TrustedInstaller可写，服务仅读取/执行；普通主体不得替换，完整app manifest逐hash与锁定文件|
|数据|C:\\ProgramData\\AgentNexusCredential：配置/资格/签名只管理员写；engine、qualification、temp仅SYSTEM/管理员/服务SID读写；拒普通用户读/写及父目录替换、reparse|
|桌面profile|固定受保护desktop子目录，普通SID不可读取或修改；需实际验证所有新建cache/Crashpad/WER、owner-rights/继承和进程内存/句柄，代码没有把高IL等同证明|
|IPC|固定本地pipe，DACL仅SYSTEM/BA/服务SID，High label、拒remote/抢占；实际operator token必须高完整性/elevated及固定client镜像；真实双向token/进程绑定测试|
|配置/签发者|明确operator SID（建议当前交互SID，见deployment-plan.json）、外部证书DER SHA256 pin、主机/epoch/所有最终二进制hash；只签允许合成资格测试的计划，不签虚假PASS|
|原账本|初期qualification仅SIMULATED；生产升级时一次性核对并迁移原0真实消耗，review-only ledger-genesis.sql不能覆盖已有库，不能作为新的Token授权|

不提议修改防火墙、Ubuntu、AppContainer或驱动。所有实际账户/ACL/SCM/签发与启动动作均等待用户明确批准；这来自本轮用户的部署授权纪律。

回滚：撤回/等待计划过期，停止该服务并确认私有Job/Node/helper结束；解除获准SCM登记；保留加密Vault、原账本及审计在原保护ACL下以供明确恢复，不删除/重建预算。代码文件、账户/profile清理和任何删除另按批准范围处理，绝不递归删除计算路径或历史档案。

凭证资格通过以后，用户仍在原UI输入新Key，不需终端认证。真实请求还须审阅当时完整正文/Hash和绑定，再独立确认；1亿Token额度无需重复授权。
''')

review=D/'reports/independent-security-review.md';assert '离线工程范围复核完成' in review.read_text(encoding='utf-8')
window=sorted((D/'evidence/native-desktop').glob('*/result.json'))
window_result=load(window[-1]) if window else {'status':'NOT_RUN'}
acceptance={'status':'BLOCKED_PRODUCTION','offline_scope':'PASS','source_files':len(files),'source_sha256':aggregate,'verification':{'path':runs[-1].relative_to(R).as_posix(),'source_unchanged':True,**stats,'typecheck':'PASS','desktop_build':'PASS'},'native_pure_tests':native_count,'native_os_qualification':'BLOCKED','independent_review':'OFFLINE_REVIEW_COMPLETE; 32 full + 4 final delta tests, distinct snapshots','native_window':window_result.get('status'),'real_credentials':0,'real_requests':0,'historical_failures_preserved':True,'history_preservation':'PASS','system_changes':False,'git_commit_or_push':False}
js('acceptance.json',acceptance)
write('acceptance-report.md',f'''
# M1.8.3 最终验收

**离线实现/受影响回归通过；完整生产资格 BLOCKED。** 本轮没有安装服务、创建账户、修改ACL/防火墙、注册AppContainer、修改Ubuntu、读取真实Key或连接真实Provider。

最终源码 {len(files)} 文件，SHA256 `{aggregate}`。冻结源码前后完全相同；受影响回归 {stats['tests']} 项：**{stats['pass']} PASS / {stats['fail']} FAIL / {stats['skipped']} SKIP**，strict TypeScript、桌面编译及JS语法检查通过。两个跳过是宿主拒绝hardlink/junction夹具，未换系统权限制造通过。原M1.8.2及UI全量历史失败未改写，也未宣称本轮重跑全部695项。

交付真正的SCM服务/Virtual Service Account原生启动边界、受认证固定pipe、Node服务引擎、无Key读回RPC、单次导入ticket与断线撤销、受控DeepSeek请求、复用Vault/Key Pool、全局四级原子Token账本、最终egress检查，以及原UI最小接口改造。没有重做页面或Gateway/Adapter。原Renderer/Preload密码输入只短暂处理新值；不能声称输入界面完全不接触正在键入的Key。

新增本轮服务用例26项、桌面新增8项与原14项均在受影响回归范围通过。Native各 {native_count[0]}/{native_count[1]} 项纯测与6项缺安装入口负测通过；它们不是真实OS身份隔离。独立审查确认所列8项代码缺陷及导入生命周期离线缺口关闭：完整32项测试与最终4项定向分别保留快照，不合并成一次独立全套。

原生窗口复验 **BLOCKED**：现有Electron.exe连 `--version` 都在应用前退出2147483651，无应用输出；新页面的实际原生窗口NOT_RUN。已提供真实Renderer逻辑与实际Node子进程合同测试；不把它们称为新窗口视觉验收。原UI布局/CSS/Preload维持，原始窗口验收仅属于历史版本。

生产11项Windows边界测试及全部15项最终标准仍BLOCKED：独立服务SID、实际DACL/pipe、同SID/不同SID密文解密拒绝、Worker/Reviewer拒绝、内存/缓存/转储及服务恢复尚无真实证据。M1.8.2同SID解密反例仍FAIL。签名QUALIFICATION_ONLY模式仅为批准后收集合成OS证据准备，本机未部署/签发/激活。

真实请求/Token/费用均0；既有100,000,000输入+输出额度未重置，实际发票费用未取得。五份DeepSeek正文/Hash草案未预留、未发送，仍需资格通过后重建当时身份/Handle/Operation/Reservation并由用户确认。当前不索取Key或提交模型执行申请。

审批入口：[部署清单](reports/deployment-approval.md)、[精确范围/回滚](reports/deployment-runbook.md)；[生产资格](vault-qualification.json)、[25项测试矩阵](attack-test-matrix.json)、[独立审查](reports/independent-security-review.md)、[具体请求审阅](reports/deepseek-request-review.md)。
''')
write('README.md',f'''
# AgentNexus M1.8.3 — Credential Service Isolation

**生产 Vault / LIVE BLOCKED；授权范围内代码、合成联调和只读部署预检已交付。** 真实Key、请求和费用均0。

独立Windows Service + Virtual Service Account、固定受认证pipe、服务内部Vault/Key Pool/egress/唯一1亿Token Owner；原Model Provider UI、Gateway和Adapter沿用，只有必要接口改动。缺服务时普通桌面禁用凭证输入，无同SIDVault回退。

最终受影响回归 **{stats['pass']} PASS / {stats['fail']} FAIL / {stats['skipped']} SKIP**，严格TS/编译通过。Native纯测40×2、入口负测6通过，独立离线审查完成。实际OS隔离及本轮Electron原生窗口仍未取得资格，历史同SID解密FAIL保留。

[最终验收](acceptance-report.md) · [生产Vault资格](reports/credential-vault-qualification.md) · [总体架构](architecture.md) · [同SID根因](reports/same-sid-root-cause.md) · [威胁模型](reports/threat-model.md) · [服务设计](reports/credential-service-design.md) · [IPC](reports/ipc-protocol.md) · [UI](reports/ui-integration.md) · [Key Pool](reports/key-pool-lifecycle.md) · [唯一账本](reports/token-ledger-owner.md) · [Data Egress](reports/data-egress-qualification.md) · [Windows测试](reports/windows-attack-tests.md) · [同SID](reports/same-sid-tests.md) · [不同SID](reports/different-sid-tests.md) · [恢复](reports/crash-recovery.md) · [独立审查](reports/independent-security-review.md) · [部署审批](reports/deployment-approval.md) · [精确范围/回滚](reports/deployment-runbook.md) · [DeepSeek具体正文](reports/deepseek-request-review.md) · [源码](source/) · [复现](reproduce.md) · [SHA256](SHA256SUMS.txt)。

源码 {len(files)} 文件集合 SHA256 `{aggregate}`。原M0—M1.8.2、Provider UI和根产品保持；没有commit/push。先批准独立身份的合成资格部署，真实OS证据通过后才可导入真实Key，随后审阅具体请求；本轮不重复申请Token额度。
''')
write('reproduce.md','''
# 本地复现与证据范围

在source目录使用Node24.15.0运行 `node tools/agentnexus/verify-m183.mjs`。它执行固定TypeScript5.9.3/@types-node24.10.1检查、受影响模型/Vault/egress/desktop测试和编译，原始结果写workspace .workflow-kit/runtime/AgentNexus-M1.8.3/verification。Type工具复用本机已锁定副本；独立源码包可恢复package-lock固定依赖后build，不要求用户用终端认证模型或编辑Key配置。

`node --test tests/agentnexus/m183-service.test.ts tests/desktop/isolated.test.ts` 仅合成；真实独立Node子进程仍同账户，不具备生产OS资格。`node tools/agentnexus/m183-desktop-smoke.mjs` 有预启动Electron --version检查；当前运行时退出，原始BLOCKED保留，未禁用安全设置强行通过。

`source/native/credential-service/build.ps1` 只编译到workspace runtime和执行纯测；preflight.ps1只读现状。交付bin仅供审阅/纯测，服务常规/attester/stdio入口缺安装资格时拒绝；不提供未签名测试启动模式。

禁止把上述命令当系统部署批准。部署路径/身份/ACL/签发/启动另见审批清单；本轮不存在真实Key、签名计划或Provider consent。原始Windows拒绝和跨身份解密必须部署批准后在真实独立进程/身份下重新记录，NOT_RUN不算PASS。
''')

# Refresh ZIP only from the verified source manifest.
archive=D/'AgentNexus-M1.8.3-source.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,'AgentNexus-M1.8.3/source/'+p.relative_to(D/'source').as_posix())

gov_json=RT/'governance-root-extended.json';gov_log=RT/'governance-root-extended.txt'
gov=load(gov_json) if gov_json.exists() else {'exit_code':None}
assert gov.get('exit_code')==0,'Full root governance gate must have passed before finalization'
if gov_json.exists():shutil.copy2(gov_json,D/'evidence/governance-root-extended.json')
if gov_log.exists():shutil.copy2(gov_log,D/'evidence/governance-root-extended.txt')
write('reports/governance.md',f'''# 治理与历史保护

原govern.py完整根检查采用Windows extended-length路径；当前记录exit={gov.get('exit_code')}。普通路径new此前因历史超过260字符路径失败，记录未算PASS。未移动历史、未改AGENTS/policy、未增加忽略项或安装Hook。

历史M1.8.2与原UI {len(baseline['entries'])} 文件逐字节保持；tracked根产品/历史无改动。所有新路径使用原govern.path_at/classify核验，规则SHA与冻结基线相同；完整根结果与最终增量是不同证据。源码及交付逐文件SHA保留。未commit/push或实施系统变更。
''')
spec=importlib.util.spec_from_file_location('agentnexus_govern',R/'ai-workflow-kit-v4/tools/govern.py');govern=importlib.util.module_from_spec(spec);spec.loader.exec_module(govern)
policy_json=load(R/'.workflow-kit/governance/policy.json');state=load(R/'.workflow-kit/governance/baseline.json')
paths=[p for p in D.rglob('*') if p.is_file() and not any(x in ['dist','node_modules'] for x in p.relative_to(D).parts)]
bad=[]
for p in paths:
 rel=p.relative_to(R).as_posix()
 if govern.classify(rel,policy_json,state) is None:bad.append(rel)
 govern.path_at(R,rel)
assert not bad,bad
js('evidence/governance-final-delta.json',{'status':'PASS','files':len(paths),'classifier':'unmodified govern.classify/path_at','policy_unchanged':True,'rules_unchanged':True,'full_root_exit_code':gov.get('exit_code')})
js('delivery-index.json',{'source_sha256':aggregate,'source_files':len(files),'offline':'PASS','production':'BLOCKED','acceptance':'acceptance-report.md','deployment_approval':'reports/deployment-approval.md','request_review':'reports/deepseek-request-review.md','sha256_manifest':'SHA256SUMS.txt','scope':'source, reports, synthetic text evidence, self-authored native binaries; excludes generated dist/node_modules and runtime databases'})
paths=sorted([p for p in D.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt' and not any(x in ['dist','node_modules'] for x in p.relative_to(D).parts)],key=lambda p:p.relative_to(D).as_posix())
write('SHA256SUMS.txt','\n'.join(sha(p)+'  '+p.relative_to(D).as_posix() for p in paths))
print(json.dumps({'source_files':len(files),'source_sha256':aggregate,'tests':stats,'native':native_count,'history_files':len(baseline['entries']),'governance_full_root_exit':gov.get('exit_code'),'deliverable_files':len(paths)+1,'production':'BLOCKED'},ensure_ascii=False))
