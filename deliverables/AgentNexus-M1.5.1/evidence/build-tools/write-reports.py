import pathlib,json,hashlib,statistics,collections,datetime,zipfile
BASE=pathlib.Path(__file__).resolve().parents[2]
ROOT=BASE.parents[1]
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def put(name,text):(BASE/name).write_text(text.strip()+'\n',encoding='utf-8',newline='\n')
freeze=load(BASE/'source-sha256.json')
source_hash=freeze['set_sha256']
cpu_path=next(p for p in (BASE/'evidence/cpu-qualification').glob('*/report.json') if load(p)['source_set_sha256']==source_hash)
cpu=load(cpu_path);cpu_rel=cpu_path.relative_to(BASE).as_posix()
final_path=next(p for p in (BASE/'evidence/runs').glob('final-*/results.json') if load(p)['source_set_sha256']==source_hash)
final=load(final_path);run_rel=final_path.parent.relative_to(BASE).as_posix()
counts=final['summary']['counts']
cpu_pass=cpu['counts']['PASS'];cpu_fail=cpu['counts']['FAIL'];exit_count=sum(bool(c['exit_observed']) for c in cpu['cases'])
old=load(BASE.parent/'AgentNexus-M1.5/cpu-qualification.json')
preflight=load(BASE/'evidence/phase0/preflight-current.json')
review=load(BASE/'evidence/independent-review/final-review.json') if (BASE/'evidence/independent-review/final-review.json').exists() else None
history=[]
for path in sorted((BASE.parent/'AgentNexus-M1.4/evidence/runs').glob('*/results.json')):
 r=load(path);history.append({'run_id':path.parent.name,'source_hash':r.get('source_set_sha256'), 'summary':r.get('summary')})
historical_cpu=[]
for case in old['cases']:
 raw=load(BASE/'evidence/phase0/m15-cpu-original'/case['raw_file'])['result']
 historical_cpu.append({**case,'classifications':['OS_BEHAVIOR_LIMITATION'],'classification_basis':'User CPU exceeds unchanged budget+tolerance despite verified private Job and pre-resume assignment; exact kernel enforcement cadence was not recorded historically',
  'root_exit_code':raw['root_exit_code'],'root_exit_observed':raw['root_exit_observed'],'tree_empty_observed':raw['tree_empty_observed'],'assigned_before_resume':raw['assigned_before_resume'],'job_flags':raw['job_flags'],'output_producers_settled':raw['output_producers_settled']})
current_cpu=[]
for case in cpu['cases']:
 raw=load(cpu_path.parent/(case['id']+'.stdout.jsonl'))['result']
 classes=[] if case['status']=='PASS' else ['OS_BEHAVIOR_LIMITATION']
 if not raw.get('history_complete_observed') or not raw.get('root_exit_observed'):classes.append('PROCESS_LIFECYCLE_RACE')
 delta_u=int(raw['job_user_cpu_100ns'])-sum(int(m['user_cpu_100ns']) for m in raw['members']);delta_k=int(raw['job_kernel_cpu_100ns'])-sum(int(m['kernel_cpu_100ns']) for m in raw['members'])
 if delta_u or delta_k:classes.append('INCONCLUSIVE')
 current_cpu.append({**case,'classifications':classes,'history_complete_observed':raw.get('history_complete_observed'),'historical_pinned_processes':raw.get('historical_pinned_processes'),'kernel_cadence':'INCONCLUSIVE','production_qualified':False,'resource_accounting_delta_user_100ns':delta_u,'resource_accounting_delta_kernel_100ns':delta_k})
(BASE/'cpu-failure-classification.json').write_text(json.dumps({'historical_m15':historical_cpu,'current_m151':current_cpu,'all_original_records_preserved':True},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(BASE/'test-results.json').write_text(json.dumps({'run_id':final_path.parent.name,'source_set_sha256':source_hash,'counts':counts,'exit_code':final['exit_code'],'cases':final['cases'],'raw_directory':run_rel,'assurance':'PER_CASE; model PASS is never OS qualification'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
cpu_rows='\n'.join(f"| {c['id']} | {c['budget_ms']} | {c['job_user_cpu_ms']} | {c['job_kernel_cpu_ms']} | {c['wall_termination'] or 'OS quota exit'} | FAIL |" for c in old['cases'])
groups=collections.defaultdict(list)
for c in cpu['cases']:groups[(c['load'],c['mode'])].append(c)
matrix='\n'.join(f"| {load}/{mode} | {len(cases)} | {sum(c['status']=='PASS' for c in cases)} | {sum(c['status']=='FAIL' for c in cases)} | {min(c['job_user_cpu_ms'] for c in cases)} / {statistics.median(c['job_user_cpu_ms'] for c in cases)} / {max(c['job_user_cpu_ms'] for c in cases)} |" for (load,mode),cases in groups.items())
skips='\n'.join('- '+c['name']+'：'+str(c.get('skip')) for c in final['cases'] if c.get('skip'))
failures='\n'.join('- '+c['name']+'：'+c['details']['error']['message'].split('\n')[0] for c in final['cases'] if c['type']=='test:fail')

put('README.md',f'''# AgentNexus M1.5.1

**CPU 严格资格 FAIL；完整 Windows 生产执行链 BLOCKED。** 本轮是实际整改与证据交付，不是生产放行。

冻结源码 {len(freeze['files'])} 文件，集合 SHA256 `{source_hash}`。完整回归 **{counts['tests']} 项：{counts['passed']} PASS / {counts['skipped']} NOT_RUN / {counts['failed']} FAIL，exit {final['exit_code']}**；严格 TypeScript 与 Node 语法 PASS。固定 CPU 矩阵 **58 项：{cpu_pass} PASS / {cpu_fail} FAIL**，全部保留。生产高风险门禁在证书检查前固定拒绝已知未合格资源能力。

- [总体报告](overall-report.md)、[最终验收](acceptance-report.md)、[机器裁定](acceptance.json)、[问题账本](issue-ledger.json)
- [Phase 0 与历史](phase0-report.md)、[CPU 根因](cpu-root-cause-report.md)、[CPU 资格](cpu-qualification-report.md)
- [Bootstrap](bootstrap-revision-design.md)、[Broker/IPC](broker-ipc-validation-report.md)、[文件边界](file-broker-security-report.md)、[进程树/ExitProof](process-tree-exitproof-report.md)
- [资源治理](resource-governance-design.md)、[审计覆盖](audit-producer-matrix.md)、[Feature](feature-catalog.md)、[Policy](policy-catalog.md)、[ADR](adr.md)
- [独立审查](independent-code-review.md)、[部署审批](deployment-approval.md)、[M1.6 建议](m16-recommendations.md)
- [完整源码与测试](source/)、[源码 ZIP](AgentNexus-M1.5.1-source.zip)、[源码 SHA256](source-sha256.json)、[原始证据](evidence/)

复验使用 Node 24.15.0、PowerShell 7 与锁定 TS 5.9.3 / @types/node 24.10.1 / undici-types 7.16.0。设置 AGENTNEXUS_TYPE_TOOLS、AGENTNEXUS_TEST_PYTHON_PATH、AGENTNEXUS_TEST_POWERSHELL_PATH 后，从 source 运行 `node tools/agentnexus/verify-m15.mjs --output-root <源码外隔离目录>`。这是保留名称的通用继承 runner，会发现所有新增测试。CPU 另运行 `node tools/agentnexus/cpu-qualify-m151.ts --output-root <源码外证据目录>`，预期当前环境失败，不改 exit code。

WindowsApps 下现有 PowerShell 的逐祖先句柄固定被拒绝。只为原语测试复制了现有 runtime 到 `.workflow-kit/runtime/m151-ps`，658 文件逐 hash 相同，无安装或 ACL 修改；来源与复制作法见 evidence/toolchain 与 build-tools。复验不得使用复制动作授予任何生产身份。现有 Node DACL 不满足生产受保护 pin，正向 pin 与跨账户组合仍未运行。
''')

put('overall-report.md',f'''# M1.5.1 总体报告

2026-11-08（Asia/Shanghai）。基线 M1.5，开发 HEAD `4c714583e9971bc510218dc9274d4692b8ab70d2`，分支 main。本轮全部产品、工具和交付增量在独立目录；没有提交或推送 Git，没有系统部署变更。

## 实际完成

1. 保全 M1.2—M1.5、tracked 文件与 M1.5 原始 10/10 CPU FAIL；复现 M1.5 265/23/1 基线；独立审查分工完成全文读取与 hash 冻结。
2. 使用相同预算的真实时间序列、逐进程/Job 计量、AppContainer 与宿主同账户对照、无 CPU_RATE 对照、额外 PROCESS_TIME 对照调查失败。确认正确 Job/先分配后恢复；额外进程为 conhost，未排除其用量。
3. 没有把 Windows 的周期用户态检查伪称有界累计硬预算。新增 Resource Governance 能力说明和不可由证书/Feature/Policy 覆盖的门禁，真实 prepare 在创建准备槽前拒绝；Broker 在消费/执行前拒绝。
4. 新增原生创建/Job 加入/恢复时间、逐成员 user/kernel CPU、实际 CloseHandle 返回证据。设置、预算、截止、原始断言不变；这些观察不签发资源释放证明。
5. 实际运行了持久 Named Pipe、hardlink/junction、目录替换攻击、多层/残留树、owner 强杀、固定创建时间钉住观察和真正 CREATE_BREAKAWAY_FROM_JOB 拒绝。symlink 创建被 OS 拒绝，原样记 BLOCKED。

## 结果与未关闭项

最终源码 `{source_hash}`。主套件 {counts['tests']} 项，{counts['passed']} PASS、{counts['skipped']} NOT_RUN、{counts['failed']} FAIL，exit {final['exit_code']}，tsc/语法 PASS。CPU 58 项 {cpu_fail} FAIL/{cpu_pass} PASS；这个偶然样本不会使资格转绿。M1.5 原始 10 FAIL 永久保留。

修前主套件的两个失败分别是继承 CPU 真实超限，以及新增 TOCTOU fixture 的拒绝码枚举没有覆盖系统返回的 WIN32_1921。后者操作已拒绝且未返回外部内容；不改原断言制造 PASS，失败和未完成的原攻击次数保留，独立审查另做完整、严格的后置条件攻击。

Host/Worker 独立账户、受保护 key/config/code、Profile/登录权/Task、真实跨账户 Peer、网络/管理库/其他项目隔离、严格累计 CPU、OS 磁盘配额、完整生产退出证明与 Host 重启仍没有资格证据。**PROCESS 与 EXTERNAL_EFFECT 持续 BLOCKED。** 代码和同账户原语通过不回答这些部署问题。

## 采用的边界

没有延长截止或放宽 CPU 数值；没有以软件 CPU poller 替换内核限制；没有从失败树中剔除 conhost 或子进程；没有修改 M1.5 历史记录或继承测试预期。新增治理 API 是已知失败能力的固定保护，不是已实现的项目/平台资源预算引擎。系统级审批清单只提供下一步精确基础对象，不能将 CPU 失败豁免为生产通过。
''')

put('phase0-report.md',f'''# Phase 0 基线与历史保全

初始 main / HEAD `4c714583e9971bc510218dc9274d4692b8ab70d2`，tracked 工作树干净。冻结脚本记录时仅有本轮新未跟踪目录。根 AGENTS.md、治理 policy、workflow 路由已读；I:\\AGENTS.md、父/根 override、project-rules/README 均不存在，没有扫描所有 workflow 子目录或修改规则。

M1.5 91 文件原字节集合 `{old['source_set_sha256']}` 与交付清单一致。完整源码复制到独立 M1.5.1；原始源码 ZIP、10 次 CPU 原始 stdout/stderr/report/manifest 在 evidence/phase0。M1.2、M1.3、M1.4、M1.5 全树与 tracked 逐文件 SHA256 见同目录 historical-manifest/tracked-manifest。最终仍须通过 preservation-verification.json 全量保全核验。

主代理完整读取 NativeRuntime/BootstrapNative/NativeProbe、原生 PS、CPU 工具/fixtures 与两个 native 专用 TS；独立审查者完整读取继承 TS、其余工具/fixtures/checker、全部相关 ADR001—029、历史报告和 M1.2 issue ledger。逐文件读取与仅 hash/JSON 结构解析明确区分，见 evidence/independent-review/reading-manifest.json。170 Feature/44 Policy 全结构解析，不冒充逐行文字审读。M1.3/M1.4 未发现独立同名 issue-ledger 文件，开放边界从验收/安全报告汇总。

| 历史 | 原始结论 | 本轮处理 |
|---|---|---|
| M1.2 | 167 PASS / 4 NOT_RUN | 不覆盖；OS-01、SCI-01 等边界继承 |
| M1.3 | 203 PASS / 3 NOT_RUN | 身份/退出协议模型不升级为 OS 保证 |
| M1.4 首轮 | 247 PASS / 1 FAIL / 4 NOT_RUN | CPU 原始失败保留 |
| M1.4 最终 | 251 PASS / 4 NOT_RUN | 旧 CPU PASS 实耗 2859.375ms / 80ms，不是预算资格 |
| M1.5 最终 | 265 PASS / 23 NOT_RUN / 1 FAIL | 本轮相同源码复现 |
| M1.5 CPU | 10/10 FAIL | 原始记录逐次归因，永久保留 |

历史 CPU 4875、2828.125、2906.25、2859.375ms 记录与最终 PASS/FAIL 不一致的原因之一是旧断言仅检查非 helper DEADLINE，未检查预算。本轮宿主同账户同源码又出现 2593.75ms 被旧测试 PASS，进一步复现这个断言盲点；不回写历史标签。

第一轮本轮 baseline 选用了 Windows PowerShell 5，造成 20 项工具兼容失败，原始 282-case TAP/数据完整保存；改用 7 后恢复 289-case 265/23/1。首次调查 image 查询在已退出进程返回 WIN32_31，三项 INCONCLUSIVE 原件保留，随后从活句柄采集 image 解决调查 fixture。上述运行不作为最终资格。

原测试数据与运行 workspace 在逐成员 hash 验证后归档 ZIP，仅删除本轮已完成临时副本以解决治理长路径；原 M1.5/历史证据未动。开发 focused run 未捕获完整源集合，单列开发证据；最终回归与 58-case CPU 均绑定精确 100 文件冻结集。
''')

put('cpu-root-cause-report.md',f'''# CPU Hard Limit 根因分析

## 裁定

**当前目标保证失败的直接机制是：JOB_TIME 周期性检查用户态累计时间，没有可用的超支时延上界，不能满足 80ms+50ms、300ms+50ms、3000ms+150ms 的既定合同。** 本轮确认配置/分配和100ns单位未错，Job自身已报告预算越过后仍长时间运行；逐进程与Job最终统计还有小额差异，来源单列INCONCLUSIVE。分类 OS_BEHAVIOR_LIMITATION。精确内核检查周期、外层 Job 对目标未部署账户的影响仍 INCONCLUSIVE；不声称已定位 Windows 内核某个缺陷或所有环境的根因。

另一独立问题是 TEST_FIXTURE_ERROR：M1.4 继承断言以非 helper DEADLINE 作为成功，允许数秒超支被判 PASS。M1.5 严格资格已经纠正独立裁定，本轮不修改旧测试预期，不用它偶然通过放行生产。

## 时间与资源模型

| 量 | 实际来源 | 解释 |
|---|---|---|
| 外层 Wall Clock | Node performance.now | 包含 helper 编译/启动/RPC/退出，不能当 CPU |
| Native wall | Stopwatch | 创建、分配、恢复、树/EOF 观察与清理窗口 |
| Process user/kernel | GetProcessTimes 的保留句柄 | PID+creation time 绑定，已退出对象也保留计量 |
| Job cumulative user/kernel | QueryInformationJobObject(BasicAccounting) | 所有关联进程及已退出成员；与进程求和对照 |
| Period user/kernel | BasicAccounting period 字段 | 调查样本未见预算被软件重新起算；不是墙钟 |
| CPU_RATE | CpuRateControlInformation | 调度带宽 hard cap，不是累计执行时间预算 |

JOB_TIME 只限制 user mode；kernel time 单独记录，未声称总 user+kernel 硬上界。没有用更宽的墙钟限额代替 CPU 成功。CPU 原始 packet 的完整用户态/内核态数据均留存。

## 原始十次失败逐次对照

| Case | 预算ms | Job user ms | Job kernel ms | 终止路径 | 原结果 |
|---|---:|---:|---:|---|---|
{cpu_rows}

全部有私有 unnamed Job、flags 8972、CPU rate 10000、JOB_TIME 与 TERMINATE readback，以及 assigned_before_resume=true；没有发现其他 Worker 错加同一个 Job。相互独立并发 Job 使用不同 GUID/句柄。历史 packet 没有精确 create/assign 时间，不能事后伪造。

## 本轮对照排查

- 未改预算/截止的调查时间序列中 Job 与 pinned process 计量量级一致，预算早已越过，period 与 total 未重新归零。最终58帧逐进程复算发现24帧存在小额负差，最大user 62.5ms、kernel 62.5ms，均为15.625ms量级；来源INCONCLUSIVE，不能断言精确相等或排除所有资源统计误差。详见 evidence/cpu-accounting-reconciliation.json 与独立 [算术补充](evidence/independent-review/accounting-addendum.md)。Job自身已超过既定上界数秒，且该差异方向是Job小于逐进程总和，不能用它把这些FAIL解释为合格或放宽预算；不猜测内核更新/取整机制。
- 单 Worker 的第二进程是 Windows conhost.exe，user CPU 为 0 或一 tick；它仍留在 Job 计量/树中。multi/child 的 6/4 成员不是任意排除的外部负载。
- 挂起创建 → 精确 AssignProcessToJobObject → IsProcessInJob/初始成员核验 → ResumeThread，排除本代码路径的执行前加入竞态。配置结构、100ns 换算、info class、end action 均与 readback 相符。
- AppContainer 调查样本在 80ms 下累积 2906.25/4765.625/4828.125ms；宿主同账户对照 3281.25/4734.375/4796.875ms。两类均有外层 Job，不能宣称得到无嵌套目标部署对照。
- 调查副本移除独立 CPU_RATE 设置（预算仍 80ms）仍为 4734.375/781.25/4750ms；另加同样 80ms PROCESS_TIME 仍为 4750/4468.75/4718.75ms。只是诊断变量，不进入产品或资格，也没有启用软件 CPU 杀死策略。
- 部分由 OS quota 状态退出，部分必须由 helper DEADLINE containment 终止；仅发送请求不算退出，退出/树空/producer EOF/句柄关闭分别核验。
- 所有重跑保留。没有把机器负载当原因；修前 4825 集合的 58-case 与完整回归有 20 个时间重叠样本，已单列 known-background-workloads.json。ONE_TEST_JOB 表示一个 CPU 资格 Job，不表示机器空闲。目标主机完整 idle/saturation load 矩阵仍 NOT_RUN。

调查原始 `JOB_CONFIGURED` 标记的取样位置实际在进入设置语句之前，应理解为 Job 创建后、配置前的标记，不能用它证明设置完成时间；设置/readback 的代码序列与新产品的 create/assign/resume 字段才是证据。这个诊断标签误名不改变任何 CPU 数值或资格结果。

## 整改与剩余

没有声称修复内核硬预算。实际整改是能力合同和失败关闭：resources.ts 固定拒绝当前 REAL_WINDOWS 执行；Host prepare 在准备槽/创建之前拒绝，Broker 在消费/START 前也拒绝，完整签名证书、Policy DISABLED、Feature ON 均不能覆盖。原生 helper 仍可由可信测试运行同样的临时原语，不能凭它绕过产品 Broker 门禁。

严格预算的新 FAIL 主要分类为 OS_BEHAVIOR_LIMITATION。修前两例 history_complete=true，但先取样 root_exit_observed=false、稍后 members 全 exited，属于 PROCESS_LIFECYCLE_RACE；已在原 cleanup 截止内等待全部 retained process handles，不改变 CPU 限制。原始观察不一致与所有失败保留，仍不能签发完整生产 ExitProof。原始和本轮逐 case 分类在 cpu-failure-classification.json。因上界缺失，不能由有限样本推导严格保障；M1.6 必须选择能证明合同的执行后端，或明确另行评审降级产品合同。

API 依据：[用户态时间限制与周期检查](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information)、[独立 CPU 带宽 cap](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_cpu_rate_control_information)、[嵌套 Job 资源累计](https://learn.microsoft.com/windows/win32/procthread/nested-jobs)。文档语义与本轮实测结合得出上述限制，不把文档替代 OS 证据。
''')

put('cpu-qualification-report.md',f'''# CPU 资格测试报告

**FAIL：58 项中 {cpu_fail} FAIL、{cpu_pass} PASS、0 INCONCLUSIVE。生产 CPU 资格 false。** [原始机器报告]({cpu_rel})、同目录 plan/request/stdout/stderr/result/source-manifest 和完整 source 快照均保留。源集合 `{source_hash}` 与最终代码一致。

计划在运行前写入：三种拓扑各 12 轮交错执行，6 个较长场景，8 对独立并发 Job，共 58 项，所有用例执行，不按失败提前选留。预算/容差沿用 M1.5，80/50、300/50、3000/150ms，wall deadlines 6000/20000ms。原 fixture 与 Job 限制没有放宽。裁定还要求根退出、Job 空、历史成员可核、EOF、实际句柄关闭；helper 自身退出也单独留存。

| 受控条件/拓扑 | N | PASS | FAIL | Job user ms 最小/中位/最大 |
|---|---:|---:|---:|---|
{matrix}

最终每个结果逐 case 保留，不能用个别 PASS 覆盖 FAIL。58/58 有 native Job/process 句柄关闭观测，{exit_count}/58 同时满足完整历史/根/树/EOF。修前集合 4825 的 58 项为 57 FAIL/1 PASS（seq-child-9 343.75ms）；其中两次 Job/EOF 先完成、root 取样先 false 而后续成员句柄已 signaled，历史成员并无缺失。修后只在原 cleanupUntil 内增加全部保留句柄等待，再执行同一 58 矩阵。任何原语观察都不是生产资源释放证据。最终逐进程/Job CPU有24帧小额差异（最大user/kernel各62.5ms），来源INCONCLUSIVE，未放大资格结论；原始值与复算表全部保留。

重复数用于跨启动时相、拓扑和并发条件描述失效，不作为统计充分性凭证。样本共享同一宿主与周期检查行为，不假定独立 Bernoulli；有一个失败就不满足严格上界。全部成功时工具也只会 INCONCLUSIVE，不自动签资格。没有计算可以掩盖超支的均值门槛。

运行环境：{preflight['execution_environment']['os']}；Node v24.15.0；同账户受管外层 Job。PowerShell 测试副本 hash/provenance 已记录。受控一/两个 CPU Job 条件均失败；修前 20 个 case 与主套件有背景工作重叠，已明示；修后 CPU 与主回归顺序执行。两者均不归因于机器负载，也不声称已做真实目标全负载矩阵。独立标准 Worker、长 soak、Host 重启、OS 重启均 NOT_RUN。

历史 M1.5 10/10 FAIL 和 M1.4 FAIL/PASS 在 phase0 原件及根因报告共同展示，没有覆盖、改阈值或把软件监控叫 OS 硬限制。CPU 保护、PROCESS/EXTERNAL_EFFECT 阻断保持。
''')

put('bootstrap-revision-design.md','''# Bootstrap 修订设计与验证

Host 入口仍为 source/src/agentnexus/bootstrap/entry.ts host；Worker launcher 走 launcher，同一路径必须传外置绝对 config 路径与外部受保护 SHA256。缺配置、pin、密钥、独立 SID、权限或组合资格都拒绝，不能填入当前操作者逻辑身份替代 OS Host。

| 启动步骤 | 来源与实现 | 当前裁定 |
|---|---|---|
| 外部配置与 SHA256/Schema | config.ts 精确字段、路径、版本、hash | PASS，合成/拒绝模型 |
| 程序与依赖指纹 | 完整 source_files、Node/PS/native/pins、保留文件/目录句柄 | 拒绝与 hash 原语 PASS；生产 protected pins BLOCKED |
| Host Runtime Identity | native 实际 parent PID/start/SID/session/token | 当前账户原语 PASS；独立 Host BLOCKED |
| 私钥与公钥匹配 | 实际加载 Host/Broker/Launcher 各自 key，pin/ACL 先行 | 合成 key 验证 PASS；生产 key 未部署 |
| Control/Policy/Broker | Host 控制平面、独立 Broker 账本、固定工具 | 模型 PASS |
| Named Pipe/Supervisor | Kernel Peer、Launcher challenge、MAC session | 同账户原语 PASS；跨账户 BLOCKED |
| 未完成 operation 恢复 | registry/authority/broker/reservation recover | SQLite/故障模型 PASS；真实 Host 重启 NOT_RUN |
| 启动审计 | OS_ATTESTED/READY，flush 先于高风险准备/执行 | 模型失败关闭 PASS；持续生产未验证 |
| 高风险资格 | M1.5.1 固定资源 gate 先于 claim/prepare 与 Broker consume/start | PASS，拒绝合成的有效签名 REAL 证书 |

Worker 的 Instance/Runtime/ProcessIdentity/ProfileHash、精确 workspace、capability、Operation 和 IPC session 绑定保留。原生路径使用独立标准 Worker launcher 自身 token，挂起创建零网络 capability AppContainer、restricted token、私有 Job，验证后绑定 Grant，再单次恢复。当前没有这些独立 OS 对象，不能把本账户合成进程说成生产 Worker。

Host/Broker 管理库、私钥、Admin Capability 不交给 Worker；输入经 File Broker 双签名/hash，Worker 只做固定摘要；没有通用宿主 shell Adapter。Supervisor 未实测的 network/filesystem/limits 仍 false。关闭/撤销身份仅中止链路，不释放五类资源；旧 boot 和不确定 START 保守隔离，无自动副作用重试。

本轮只强化资格与观察，不替换已有身份/Permit/加密原语。完整部署要求见 deployment-approval.md；基础对象批准不会解除资源门禁。
''')

put('broker-ipc-validation-report.md','''# Broker / IPC 验证报告

生产 Broker 唯一应用执行路径：Agent facade → 精确审批/原 Permit → signed Grant → MAC endpoint → Broker 账本单次消费 → Supervisor。旧 Gateway 对 PROCESS/EXTERNAL_EFFECT 始终拒绝。Host prepare 与 Broker admit 现在还受固定资源失败门禁约束，外部 Harness 的原语测试不是可用的生产 Adapter。

| 边界 | 当前证据 | 资格 |
|---|---|---|
| 长期 endpoint、双向多帧 | copied-runtime 下真实 Windows pipe，连续交换与 peer recheck | PASS，同账户原语 |
| 精确 DACL / first-instance / remote deny | 原生 CreateNamedPipe 与 descriptor readback；owner/client mask 分离 | PASS，descriptor/first-instance 原语；跨 SID 有效拒绝 BLOCKED |
| Peer SID/PID/start/session/image/hash/token | 保留进程/镜像句柄；逐帧核验，伪造拒绝 | PASS，真实同账户 Peer |
| 长度、deadline、关闭撤销、四连接/owner quota | 过长输入/输出、timeout/EOF、并发占满/复用槽实际测试 | PASS，真实原语 |
| MAC/nonce/epoch/deadline/instance | 认证 session 与 endpoint、断连重放和参数改变拒绝 | PASS，crypto/SQLite 模型；生产组合 BLOCKED |
| Permit operation/intent/resource/worker/profile | 原始 Permit 原子 transfer、精确字段绑定/nonce、双账本一次消费 | PASS，模型与本地进程；真实跨账户闭环 BLOCKED |
| Broker 独占高风险入口 | 独立 probe：有效签名 REAL 证书仍在消费前被拒；原 Gateway 执行次数为 0 | PASS，失败关闭模型；生产执行未启用 |

测试 runtime 只复制现有 PowerShell 658 个文件，逐 SHA256 比较完全一致。原 WindowsApps 镜像在按目录句柄逐层固定时 NtCreateFile 返回 ACCESS_DENIED，因此之前多个“pipe access denied”skip 的笼统诊断不足以证明是 pipe ACL 问题。本轮没有为通过而添加能力 ACE、放宽 DACL 或取消 image anchor；同样代码和权限要求在正常测试副本路径运行。copied runtime 的默认 DACL仍不是生产部署 ACL。

同账户 client SID 同时也是 owner full-control SID，故 descriptor 中去除 create-instance 位并不能证明该 SID 的有效创建实例权已撤销。必须使用真实不同标准 SID 再验，这个测试显式 BLOCKED。原正向 protected pin 也因 Node 现有 inherited DACL 不受保护而 NOT_RUN，不能改现有安装 ACL。

任何原 Permit、Operation、intent、resource、worker tuple、profile hash、epoch、expiry、MAC/nonce 或消息字节变化均拒绝；IPC 断开关闭通道，不恢复旧授权。真实生产密钥/账户/Profile/Task 和 full bootstrap 未部署，因此 PROCESS/EXTERNAL_EFFECT 不放行。
''')

put('file-broker-security-report.md',f'''# File Broker 安全测试报告

File Broker 以预先配置资源 root、签名 FileGrant、精确 Operation/Resource/Runtime/Profile/epoch/version 绑定授权。原生 owner 从固定本地 drive 句柄逐组件 NtCreateFile，使用 root-relative handle、禁止 reparse 的对象打开方式、文件 ID/link count，祖先不共享 write/delete；不以字符串前缀证明权限。字符串仅先拒绝 traversal/ADS/设备/UNC。

| 场景 | 实际结果 | 当前边界 |
|---|---|---|
| File/Directory symlink | fixture 创建均 EPERM；新旧四项 NOT_RUN/BLOCKED | 未跟随目标验证，不能 PASS；不启开发者模式/特权 |
| Junction | 真实 outside target junction 被拒绝 | PASS，同账户句柄原语 |
| Hardlink | 真实 outside object link count>1 被拒绝 | PASS，同账户句柄原语 |
| 跨项目/管理目录 | 真实合成 sibling 文件存在，broker traversal 被拒 | PASS，Broker 路由；独立 Worker 直接 OS 访问仍 BLOCKED |
| 固定目录句柄 | positive read 返回 retained ancestors、share-write/delete=false 和 file ID | PASS，实际原语 |
| TOCTOU/并发目录替换 | 最终原用例 40/40 完成：21 安全读取/19 拒绝，23 次 junction 安装；修前 4825 同用例遇 1921 而 FAIL | 最终原语 PASS，原 FAIL 及错误枚举未改，仍有 fixture 可移植性问题；独立 80 次补充另列 |
| 文件大小/独占 create | 实际大文件超 max、超长 create、overwrite、变更检测拒绝 | PASS，单次文件 Broker 上限；无 OS 磁盘配额 |
| Artifact Store 直接访问 | 当前无独立 Worker/ACL/Profile 攻击环境 | BLOCKED，不能由 Broker 路由测试推断 |

最终相同原断言完成 40 次：21 次返回 safe+原 ID、19 次拒绝，48 次 swap 尝试/23 次实际 junction 安装，无 outside 字节。修前 4825 的 TOCTOU 原始 zip 有 18 个响应（1 baseline+17 attack），8 个成功全部为 safe 且同 file ID，10 个失败含 8×WIN32_2、1×REPARSE_REJECTED、1×WIN32_1921。每个失败只有 id/ok/error，无 result/content。独立审查核对原始 member SHA，未发现这个失败返回 outside 字节。它属于 TEST_FIXTURE_ERROR 的拒绝码枚举缺口；原完整 40 轮未完成，不能宣称该用例 PASS，也不扩大白名单制造绿色。

1921 是系统文件名无法解析错误；[微软错误码定义](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1700-3999-)支持这个拒绝语义，不单凭错误码证明完整文件安全。独立 reviewer 在不改原源码/原用例下完成 80/80 严格补充攻击：27 成功全部 safe+原 ID/hash，53 拒绝全部无 payload，实际 junction 安装 40 次，前后基线成功；含确定性控制共 85 响应（30 安全成功、55 拒绝）。首次受管环境 EPERM 的 0/80 INCONCLUSIVE 也保留。该原语证据绑定旧 4825 集合；最终差异仅进程 cleanup，FileOperation/Relative 字节不变，经独立只读核对限定复用，不冒充最终全集再次执行。生产文件边界整体仍因 symlink、跨账户与 Artifact Store 直接 OS 访问缺证 BLOCKED。

原始回归数据见 [{run_rel}]({run_rel}/results.json) 的 data.zip；新测试源码与创建 fixture 均在 source/tests。所有目标数据为本轮合成数据，没有访问真实其他项目或 Host 管理库。
''')

put('process-tree-exitproof-report.md','''# Process Tree / ExitProof 报告

本轮原语新增 create/assign/resume UTC、native Stopwatch wall、每个 pinned member 的 user/kernel CPU 与真实 CloseHandle 结果。Job 为空、终止请求、helper 退出、根退出、producer EOF、句柄关闭分别记录，任何一个都不单独授权生产释放。

| 场景 | 真实/模型结果 | 当前资格 |
|---|---|---|
| 正常退出、崩溃、hold 强终止 | 实际根/Job/EOF 及 native handle close 分开核验 | PASS，同账户原语 |
| 多层子进程 | 固定三层 Node 加 conhost；实际枚举和终止后成员 signaled | PASS，已观察成员；完整历史仍 unknown |
| 父退出、子残留 | M14 native orphan 与 M151 orphan 实际 root exit 早于 Job termination，子仍被观察 | PASS，特定 fixture；旧 M13 job-orphan 窗口未捕获仍 NOT_RUN |
| 子进程脱离 Job | 在 private Job 中真正请求 CREATE_BREAKAWAY_FROM_JOB，Win32 5 拒绝 | PASS，实际 OS；没有尝试脱离宿主执行沙箱 |
| Owner/helper 被强杀 | 外部 observer 先固定 root/两个 descendant 的实际创建时间与句柄，再杀本轮 owner | PASS，3 个 pinned Node producer 退出；不是完整未知 producer 证明 |
| PID 重用防护 | 错创建时间在固定句柄前拒绝 | PASS，真实负例；没有主动耗尽 PID 强造 OS 重用 |
| IPC 中断 | 管道关闭/超时/owner death 原语；Operation quarantine/五资源模型 | PASS，限定范围；生产组合 BLOCKED |
| Host 退出/重启、退出过程中真实 Host 崩溃 | SQLite reopen/旧 boot/claim 模型；完整独立 Host 尚不存在 | NOT_RUN/BLOCKED，不把本地 reopen 当 Host/OS 重启 |

Native membership_complete 与 release_authority 仍 false，proof_status=EXIT_UNVERIFIED。修前 CPU 58 场景有 2 个 root_exit_observed 取样先 false、稍后 members 全 exited 的时序不一致，history_complete 始终 true。修复使 cleanup break 同时等待所有 retained process handles，并沿用原截止；没有把 root/Job/EOF 合并或将历史未知升级为完整。最终 active=0 仍不能独自证明全部退出。Job GUID/进程 PID+creation、Worker Instance/Profile/boot/operation 与签名证明绑定保留。

可信 Supervisor 构造的证据还必须包含全部成员父链、退出信号、所有外部 producer、IPC channel、Sandbox token/network/filesystem/limits、Resource Ownership 与 Evidence Hash。WindowsSupervisor 未验证的 network/filesystem/limits 均保持 false。Native close success 只证明本 helper 释放对应句柄，不证明整个 sandbox 外部影响终结。

资源 owner 仍同时要求最终 Operation 裁定、原签名 ExitProof、独立 closure、精确五资源版本与一次性 release receipt。WRITER、WORKSPACE_LOCK、PROCESS_SLOT、WORKER_QUOTA、SANDBOX_RESERVATION 任一缺证都保留。旧 boot/未知成员/未 EOF/审计失败/未知副作用不自动释放，也不自动重试。
''')

put('resource-governance-design.md','''# Resource Governance Engine 独立设计

本轮实现的是固定能力失败门禁和机制描述 resources.ts；统一预算 engine、project/platform allocator、硬限额新后端尚未实现。无任何新硬限制因本设计标为 PASS。

| 资源 | Worker 范围 | 项目范围 | 平台范围 | 当前 Windows 事实 |
|---|---|---|---|---|
| CPU | user/kernel 分账、累计预算与调度带宽分离 | 多 Worker 聚合、已退出进程入账 | 各项目容量/保留额度 | JOB_TIME readback/计量真实；严格累计上界 FAIL；rate cap不等于累计 |
| RAM | committed process/job memory | 父 Job 聚合与 admission reservation | 分配上限/系统保留 | 现有 Job 配置/原语，不冒充部署组合资格 |
| Disk | workspace/Artifact/object bytes | 项目合计和 staging | 总配额/安全保留空间 | Broker 单次 byte cap；无 OS disk quota |
| Process | 同时进程数、spawn 生命周期计数分离 | 项目总 slot/active process | 平台并发容量 | ACTIVE_PROCESS_LIMIT 真实配置；不是累计创建数上限 |
| I/O | 流式 stdout/stderr、日志速率/吞吐 | 项目磁盘带宽 | 平台吞吐分配 | 输出上限/背压真实；OS 磁盘吞吐硬 cap NOT_RUN |
| Network | 允许目标、连接数、带宽 | 项目共享预算 | 出站容量/目标策略 | AppContainer 候选；默认全路径拒绝和硬带宽 NOT_RUN |
| Model | token/request/费用 reservation | provider/model 项目总账 | 平台总费用/频率 | 设计，未连接 provider；不是 OS 资源 |
| Time | monotonic task/lifecycle deadline | 项目时间窗口 | 平台任务寿命 | 可信 Supervisor 请求终止+退出观察；不能按计时释放 |

## 合同与状态

每次预算申请绑定 scope/owner/operation/resource/worker instance/profile/boot/epoch、单位、计量时钟、机制版本和能力资格。状态为 RESERVED → STARTED → SETTLED 或 UNKNOWN_QUARANTINED；实际创建挂起进程之前保留容量，恢复前再次校验，未知不能通过释放/重试获得新预算。子进程、已退出成员和外部 producer 分开计入与结算。

分 Worker、project、platform 三层先做原子 admission，限额采用最严格交集。Windows Job 层级可提供某些聚合计量/commit 限制，但不能由“能嵌套”推导所有资源均可硬限制。多 Job 独立性、Job 释放、版本/boot 重启恢复需要独立证据。模型费用采用 provider/应用层账本，并明确可能有远端结算延迟。

每个能力返回 HARD_OS / APPLICATION_BOUND / OBSERVE_ONLY / UNSUPPORTED 与证据摘要；签名证书不能覆盖 release 内置已知失败。当前 CPU strict cumulative 属于未资格能力，REAL_WINDOWS admission 固定 BLOCKED，无参数开关；SIMULATED 只运行协议测试，不产生 OS 执行/释放授权。

## 后续实现顺序

先为每个资源确定 OS 能给出的真实单位、统计周期、可证明上界与 failure mode；独立实现可信 resource ledger 和能力后端。CPU 若继续 Windows user-time periodic 方案，只能另行批准明确降级合同，不能沿用现有硬预算名称。选择虚拟化/其他后端也必须实际资格化，不能把设计替换当实现证明。预算监控/告警不补齐硬限制；未知状态继续由资源 owner 人工有证据裁定。
''')

put('audit-producer-matrix.md','''# Audit Producer 覆盖矩阵

Operation ID 与 Resource ID 从可信配置、原 Permit/Grant/账本传递；不能从 Worker 自报 SID/字符串推导身份。生产事件写入失败时必须在高风险准备、授权消费或 START 前失败关闭。现有模型及独立故障探针验证这个顺序；长期独立生产组合未运行。

| Producer | 事件来源/身份来源 | Operation / Resource / 状态与证据 | 接入与实际验证 |
|---|---|---|---|
| Host | native parent attestation、Control Plane | bootstrap hash/boot、PREPARING/BOUND/UNKNOWN、storage fingerprint | 已接线；模型+SQLite PASS，独立 Host BLOCKED |
| Broker | TrustedEndpoint + signed original Grant | operation/resource/intent、consume/start/result/quarantine/proof hash | 已接线；模型/本地进程 PASS，生产 BLOCKED |
| Worker | Host-bound instance、固定 Worker 入口 | 原 Grant/签名输入摘要、stdout/stderr/返回 hash | 已接线；固定 fixture/模型，生产 identity BLOCKED |
| IPC | kernel peer retained process/image handles、MAC session | channel/request/operation、nonce/epoch/deadline、close/revoke | 真实同账户原语 PASS；跨账户 BLOCKED |
| Sandbox | 可信 native token/Job readback | instance/profile/job/process tuple、create/assign/resume/termination | 实际原语；零网络/跨项目/管理库组合未测 |
| File Broker | 签名 FileGrant、root handle/file identity | operation/resource/path/version/hash/max bytes、read/create/deny | 模型+真实 hardlink/junction/size；symlink BLOCKED |
| Process Supervisor | retained OS handles、Job accounting | Job GUID、成员/parent/CPU、exit/EOF/handle close | 实际已观察成员 PASS；全历史不完整 |
| ExitProof | 可信 Supervisor + Broker key + Artifact evidence | operation/worker/profile/boot/hash、EXIT_UNVERIFIED 或满足闭合 | 原语始终无释放权；模型拒绝/签名 PASS |
| Resource Release | Host owner ledger、原最终裁定、独立 closure | 五资源 ID/version、proof hash、receipt nonce/单次消费 | 模型/SQLite PASS；真实生产 release BLOCKED |

大型输出使用 4KiB 分块、跨流总预算和 stdout 背压，不无限内存聚合；仅有限 preview。真实 flood 测试验证超上限终止/未 settled，不据此释放资源。新 EvidenceRpc 证据也有 4MiB 测试上限，CPU 证据流式落盘并有字节上限。

原始 native RPC/fixture JSONL 是 OS 证据，但它们不是伪造为独立生产 audit 的替代品。启动账户/持久任务尚缺时，不标全部 producer“生产完整 PASS”。审计消费、导出、归档与重启 crash 窗口仍须在部署后的合成操作上逐 Operation 对账。
''')

put('feature-catalog.md','''# M1.5.1 Feature Catalog 增量

完整机器定义继续位于 source/config/agentnexus/features.json，170 项、无重复 ID，与 M1.5 原字节相同。没有因本轮测试打开生产 Feature；默认保护与 dependency/off/drain 行为保留。Catalog 分析见独立 catalog-analysis.json。

| Feature 组 | 关联能力/本轮变化 | 当前资格 |
|---|---|---|
| runtime.bootstrap.host / worker | 外置配置/精确身份、准备槽、recover、启动审计 | 模型 PASS，真实独立身份 BLOCKED |
| runtime.ipc.persistent / runtime.ipc.windows.production | 持久 peer/session/MAC/nonce/epoch/长度/配额 | 同账户原语 PASS；跨账户生产 BLOCKED |
| runtime.host.production / worker.production / broker.production | 原 Permit 唯一入口与 Supervisor | 固定 Resource gate 拒绝 REAL_WINDOWS，高风险 BLOCKED |
| runtime.sandbox.windows.production | restricted token、零 capability、Job、workspace | 原语有限；完整文件/网络/CPU组合 BLOCKED |
| runtime.file_broker | root-relative handle、版本/hash/byte cap | hardlink/junction/大小原语 PASS；symlink/独立隔离 BLOCKED；TOCTOU原fixture FAIL保留 |
| runtime.process_supervisor / exit_proof.production / exit_closure | 新 CPU/time/CloseHandle 观察，不提升 completeness | 已观察成员原语 PASS；完整生产证明 BLOCKED |
| runtime.resource_release.production | 五资源 owner/closure/receipt，不确定不释放 | 模型 PASS；生产 release BLOCKED |
| audit.producer.broker / file / process | 操作链审计与失败关闭 | 模型/部分原语 PASS；长期生产完整性 INCONCLUSIVE |

Resource Governance 是可信内核能力检查，**不新增可关闭的 Feature 开关**。170 项完整目录未删改；这里是本轮变更与资格视图，不将目录里存在的名称当已实现硬限制。
''')

put('policy-catalog.md','''# M1.5.1 Policy Catalog 增量

完整机器定义 source/config/agentnexus/policies.json：44 项、无重复 ID，与 M1.5 原字节一致。L0 的不可降级 metadata、strict schema 与 owner 约束保留，不关闭策略、不添加 any 或降低 TypeScript strict。

| Policy/保护合同 | 当前执行含义 | 验证/限制 |
|---|---|---|
| P.IDENTITY | 逻辑身份不替代 Runtime/OS；精确 worker/boot/instance | 模型拒绝+实际本账户 observation；独立账户 BLOCKED |
| P.COMMAND_RISK | 精确 intent/resource/arguments + 单次审批/Permit | 参数变更、过期、epoch、nonce/断连重放拒绝 |
| PROCESS / EXTERNAL_EFFECT 非降级门禁 | Feature ON、Policy DISABLED、requires_sandbox=false 不放行 | 原 Gateway 与新增 fixed Resource gate 双重失败关闭 |
| 文件授权 | Signed FileGrant、固定资源、句柄/fileID/hash/max bytes | 不以路径前缀代替 OS；跨账户直接访问尚未证明 |
| Writer/Workspace/Slot/Quota/Sandbox ownership | 完整退出+最终裁定+独立 owner 版本/回执 | UNKNOWN/未 EOF/未知成员永不按 timer 释放 |
| Audit before effect | 高风险准备/消费/START 前持久 audit | 注入 flush 失败时 0 prepare/start；生产持续流未完成 |
| Resource Governance | 已失败的硬限制不能由审批、Feature 或资格证书覆盖 | 新固定代码门禁，CPU FAIL 持续 BLOCKED |

以上最后一行是代码不可覆盖安全不变量，不伪造新的 Policy ID，也不修改原 44 项 Schema。项目/平台 CPU、RAM、Disk、I/O、Network、Model 等预算的后续设计见 resource-governance-design.md，未实现部分 NOT_RUN。
''')

put('adr.md','''# M1.5.1 ADR030—036

- **ADR030：保持独立、精确字节基线。** M1.5 的 91 文件及全部历史证据不修改；新 release 100 文件、每次最终运行独立快照。保留 FAIL 与工具兼容/fixture 失败。
- **ADR031：拒绝错误硬预算合同。** Windows JOB_TIME 为周期 user-mode 机制，没有本任务要求的已资格上界。CPU_RATE 与 application watchdog 不替代累计 CPU 硬限制；严格合同继续 FAIL，而不是调大预算/容差。
- **ADR032：已知失败优先于资格证书。** Resource gate 位于 Host claim/prepare 前与 Broker admit 中，REAL_WINDOWS 固定拒绝当前 release；构造/Host 初始化与 SIMULATED 协议仍可检验，没有配置豁免。
- **ADR033：原语路径与生产身份隔离表述。** 复制现有 PS runtime 的逐 hash 同账户测试可以消除 WindowsApps handle-anchor 环境障碍，但不修改 ACL、不授 Host/Worker 身份，不推导跨 SID 有效 pipe 权限。
- **ADR034：退出观察增加而释放权不增加。** create/assign/resume、member CPU、CloseHandle 返回加入证据；未知历史/producer/Sandbox 事实仍令 ExitProof 不完整。外部 observer 固定句柄后的少数进程退出不代表整棵未知树。
- **ADR035：失败关闭不等于测试全绿。** TOCTOU 原用例收到安全拒绝 1921 但枚举未覆盖，原 FAIL 保留且不改白名单。独立补充 probe 验证严格安全后置条件，不能覆盖旧未完成 case 或生产未验证边界。
- **ADR036：在原截止内等待进程信号。** 修前 Job 空/EOF 与 root signaled 的取样先后可不一致；cleanup break 同时要求全部保留句柄 signaled，沿用原 cleanupUntil，不延长 deadline，不提升 membership_complete 或 release_authority。原失败冻结保留。
''')

put('deployment-approval.md',f'''# M1.5.1 系统部署审批清单

**未执行，等待用户逐项批准。M1.5 清单不是授权。** 只读快照为 `{preflight['observed_at']}`（对应 2026-11-08 Asia/Shanghai），原始字段在 evidence/phase0/preflight-current.json。当前两个新账户均 ABSENT；新部署目录未创建；Task Scheduler 只读访问被拒，INCONCLUSIVE，不能说 Task 不存在。Worker hive/Profile/LSA 权限 NOT_RUN。

## 可单独批准的精确基础变更

| ID | 对象及实际变更 | 前状态、风险与执行约束 | 逐项回滚 |
|---|---|---|---|
| M151-SYS-01H | 创建本地标准账户 AgentNexusHostM151，创建时 Disabled，仅 Users；不授额外权利 | 当前 ABSENT；执行前再次查同名，已存在即停。随机独立密码仅 SecureString/内存，不入 argv/日志；保存本轮 created 标志、新 SID、全部 group/disabled 状态。不会授 Administrators、交互或服务登录 | 先禁用并核无本轮会话/执行树；仅 created=true 且 SID 精确一致才删除新账户。已有/重用/状态不明则保留，不删其 Profile/hive |
| M151-SYS-01W | 创建本地标准账户 AgentNexusWorkerM151，Disabled，仅 Users；密码独立且不交给 Host | 同上；不授管理数据库、Admin Capability 或私钥；本项不启用、不配置登录权 | 与 01H 独立同样校验，不用批准 Host 推导 Worker 获批 |
| M151-SYS-02 | 仅创建下列新空目录（含必要父目录），不复制程序/密钥/数据、不设 ACL | 当前列明路径 ABSENT；执行前逐组件确认无 reparse、最终绝对路径在精确根内。保存本轮 created 标志和创建后 owner/SDDL。不修改项目根/盘符或现有目录 ACL | 从叶到父，只删除本轮 created=true、仍为空且仍在根内的目录；任何非空/归属变化/未知进程一律保留，不递归删数据 |

SYS-02 精确根：`I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-M1.5.1\\deployment`。

精确相对目录：`.`、`host`、`broker`、`code`、`runtime`、`launcher`、`configuration`、`workspaces`、`workspaces\\m151-synthetic`、`workspaces\\m151-synthetic\\input`、`task`、`tmp`、`output`；最后三个均为 m151-synthetic 的子目录。没有其他隐含目录。现有本轮测试目录 m151-ps、m151-final 等不是生产部署根，也不作为批准目标。

## 本次不请求执行的后续阶段

| ID | 后续对象 | 进入批准前必须具体化 |
|---|---|---|
| M151-SYS-03 | 新代码/runtime/config/storage 的 owner 与精确 DACL、key 与 public pins | 必须等新 SID 和已有独立标准 Operator SID 确认后，展开逐文件真实 SDDL/hash/复制源/现状与回滚；本清单没有可批准的 ACL 变更，不改现有安装 |
| M151-SYS-04 | Worker hive 下 AgentNexus.M151.Worker AppContainer，零 capabilities | 真实 Worker hive/映射前状态、Profile SID、默认 LocalState 路径和逐对象 ACL；不以当前操作者 HKCU 代替 |
| M151-SYS-05 | 精确新 SID 的 batch/deny interactive/deny remote logon、账户启用 | LSA 前状态、Users/GPO 继承分析、增量授权与回滚、安全凭据接口；不导出密码、不授服务/管理员特权 |
| M151-SYS-06 | \\AgentNexus\\M1.5.1\\HostBroker 与 WorkerLauncher 两个 Task | 重新只读查询、最终 XML/DACL/Node/入口/config hash/LeastPrivilege/PASSWORD/IgnoreNew/锁与关闭策略；当前没有完整可批准 Task XML |
| M151-SYS-07 | 独立身份组合验收和未来 Feature 启用 | CPU 硬预算仍 FAIL，本 release 固定阻断；需先完成能力设计、独立 OS 资格和新代码审查，不能用基础对象批准解除 |

Operator 必须是已有且与两角色不同的可信标准账户；当前未选择，不创建第三用户。审批 01H/01W/02 仅让后续状态具体化，不构成生产启动或完整部署授权。系统服务、驱动、防火墙、Ubuntu、其他项目、Provider/API Key、科研执行、Git commit/push 都不在变更范围。
''')

put('independent-code-review.md','''# M1.5.1 独立代码审查

独立上下文审查者只写 evidence/independent-review，不修改产品或历史文件，不递归委派。审查读取清单、100 文件独立捕获、逐文件 hash/差异、脚本和原始 stdout/stderr/机器结果均归该目录。

[独立逐字报告](evidence/independent-review/final-review.md) 与 [机器报告](evidence/independent-review/final-review.json) 是权威原件；最终58帧 [CPU统计差异补充](evidence/independent-review/accounting-addendum.md) 另列，未修改终审原件。10 项限定模型负例/故障注入按预期拒绝，范围包括有效签名全检查 REAL 证书、Broker 消费前门禁、Gateway 两高风险类别、audit 失败与未知闭合保持五资源。新 C#/PS 生命周期 fixture 及 native 观察 diff 独立复核。

审查者另外核对最终 TOCTOU 失败的原始 ZIP，独立补充严格完整攻击；它不替换主套件 FAIL。审查不声称运行主代理的 CPU 矩阵或独立生产组合；最终仅对 cleanup 差异只读复核并核实文件/模型涉及函数未变，旧10项模型和80次原语证据不冒充新全集重跑。CPU 资格持续失败，symlink/真实账户/生产退出边界未补齐。没有确认可由 Worker 利用的开放 P0/P1，与“生产资格通过”是不同裁定。
''')

put('typescript-build-report.md',f'''# TypeScript 与构建验证

冻结集 `{source_hash}`。最终完整 runner 的 Node syntax PASS、严格 tsc PASS，配置/语义诊断 0；覆盖全部 src/tests/tools TS，包括新增资源 gate、CPU runner、攻击测试和 test helper。noEmit/strict/skipLibCheck=false/NodeNext/ES2024 没有降低。

Node 24.15.0，TypeScript 5.9.3，@types/node 24.10.1，lockfile 的 undici-types 7.16.0 精确固定。没有新增产品 npm 依赖或 any，也不以 Node --check 替代 tsc。旧源码 any 原样保留，本轮无新增以绕过类型约束的 any。

每次产品/测试批次修改后运行 tsc；最终独立复制 runner 再运行语法与 tsc。C# 通过现有 PowerShell Add-Type 实际编译并执行，新增 lifecycle C#/PS fixture 同样真实运行。配置 Schema 由继承 bootstrap/catalog 验证与独立 JSON 结构分析覆盖。未生成 distributable binary，不把 noEmit 类型检查称已完成生产部署打包。

原始 tsc.stdout/stderr/typecheck.json/syntax.json 与完整 TAP/events 在 [{run_rel}]({run_rel}/results.json)。早期错误 PS5 baseline 及全部开发运行单列保留。
''')

put('m16-recommendations.md','''# M1.6 实施建议

1. 先对 CPU 合同做方向决策：现有严格累计上界继续阻断。选择能给出且实际通过 OS 上界证据的后端，或明确评审不同名称、不同保证的降级资源合同；不把 Windows periodic JOB_TIME 包装成硬预算。保留 M1.4/M1.5/M1.5.1 全部失败。
2. 修复并独立评审 TOCTOU fixture 对 OS 拒绝码的覆盖或改用可检查的严格后置条件；不变更“不得返回外部字节/错误不得含内容”的验收标准。原 FAIL 保留。先处理 symlink fixture 所需的精确权限审批，不擅自启用 Developer Mode。
3. 用户逐项批准新基础对象后，只做新 SID/空目录；再生成精确 ACL/config/key/Profile/LSA/Task XML 清单。未能给出真实 Operator SID/Task 前状态时不进行模糊整体批准。CPU 失败门禁继续固定。
4. 在真实不同 Host/Worker 下验证 effective pipe permissions、entrypoint/private key、零网络、管理库/跨项目/Artifact Store 直接访问以及所有默认可写路径。部分原语证据不能拼接成完整组合 PASS。
5. 完善历史 process/job/producer ownership 观察，处理短命成员、owner/Host 崩溃与真实重启，保证完整 ExitProof 后才能 owner release。轮询/通知/Job 空不能自动补齐未观测成员。
6. 实现分 Worker/project/platform resource ledger 与能力后端；OS硬限制、应用流量控制、观察告警严格区分。RAM/Disk/I/O/Network/Model 尚未实现的能力逐项资格化。
7. 部署后用合成 Operation 对九类 audit producer 从准备到释放逐事件对账，注入 audit/IPC/存储/退出故障与重启，核全无缺，再申请生产功能启用。Ubuntu 独立准备、独立批准和 OS 测试，不从 Windows 借用资格。
''')

questions=[
('CPU真实失败原因','OS_BEHAVIOR_LIMITATION；周期用户态限制没有已资格的超支时延上界；精确内核 cadence 仍 INCONCLUSIVE'),
('单进程和子进程累计CPU稳定限制',f'FAIL，最终58场景 {cpu_fail} FAIL / {cpu_pass} PASS；预算和容差未放宽'),
('Host真正创建管理独立Worker','BLOCKED，候选代码/模型通过，真实账户/Profile/Task未部署'),
('IPC真实Peer','PASS，同账户实际 PID/start/SID/image；真实跨账户和有效ACL仍 BLOCKED'),
('Broker唯一高风险入口','PASS，代码与独立失败关闭模型；当前实际生产高风险仍 BLOCKED'),
('Worker无法访问其他项目与管理库','BLOCKED，未有独立OS用户的实际攻击证据'),
('文件链接/路径逃逸','Junction/Hardlink/最终40次TOCTOU原语PASS；symlink与独立隔离BLOCKED；修前TOCTOU fixture FAIL永久保留'),
('父退出后发现子残留','PASS，M14/M151特定同账户原语；完整历史与生产Host重启未验证'),
('ExitProof足以释放','BLOCKED，未知成员/producer/Sandbox事实仍不完整，五资源保持'),
('关键活动完整审计','模型/部分原语接入PASS；独立长期生产完整性 INCONCLUSIVE')]
qa='\n'.join(f'| {i+1}. {q} | {a} |' for i,(q,a) in enumerate(questions))
put('acceptance-report.md',f'''# M1.5.1 最终验收报告

**总体资格：BLOCKED；CPU 与主回归状态 FAIL。没有宣称完成生产执行闭环。** 已完成授权范围内的调查、固定失败关闭整改、真实原语与独立代码审查；系统级部署未获批准，且系统批准本身也不能修复 CPU 合同不成立。

冻结 100 文件 SHA256 `{source_hash}`。最终 Run `{final_path.parent.name}`：**{counts['tests']} 项，{counts['passed']} PASS / {counts['skipped']} NOT_RUN / {counts['failed']} FAIL，exit {final['exit_code']}**；Node syntax / strict tsc PASS。CPU Run `{cpu['run_id']}`：**58 项，{cpu_fail} FAIL / {cpu_pass} PASS，exit 1**。M1.5 历史 10/10 FAIL、原 289-case 的 1 FAIL、M1.4 原始 FAIL 和后来旧 PASS 全部保留。

| 验收问题 | 证据对应结论 |
|---|---|
{qa}

## 最终主套件失败与修前记录

{failures}

修前 305 项为 295 PASS/8 NOT_RUN/2 FAIL：CPU 超限和 TOCTOU 拒绝码枚举缺口。后者 OS 拒绝路径解析、没有返回外部 payload，原 fixture 只完成 17 次 attack 响应，不能算完整通过；原断言未改，最终同一未修改断言完成 40/40 并通过，不覆盖此历史 FAIL，也没有修正 fixture 的码枚举可移植性缺口。独立 80 次严格攻击同样单列，不覆盖原记录。CPU 无资格继续是实质性生产 blocker。

## 最终未运行项

{skips}

{counts['skipped']} 个 TAP skip 在总数计为 NOT_RUN，其中新 symlink fixture 明确因 OS 禁止而 BLOCKED；两种视图不混淆。未部署的其他攻击如真实 Host 重启、网络/管理库/其他项目/Artifact 直接访问也 BLOCKED/NOT_RUN，不能因为没有空壳测试项就从报告省略。

## 交付和边界

完整源码、测试、fixtures、逐事件 JSON、TAP、stdout/stderr、环境、源码/数据快照、CPU 原始请求/响应、独立报告、历史保全与 SHA256 清单均随交付保存。临时源码/测试数据只有在 zip 逐成员验证后才删除本轮副本；原始文件字节在 ZIP 中可复验。

没有创建 Windows 用户、配置 ACL/AppContainer/登录权/Task/防火墙/服务/驱动，没有修改 Ubuntu 或其他项目，没有 Provider/科研/Git commit/push。只读部署预检和新逐项审批清单已给出。PROCESS/EXTERNAL_EFFECT 固定 BLOCKED，所有不确定资源保留，未知副作用没有自动重试。
''')

issues=[
 {'id':'M151-CPU-001','status':'FAIL','classifications':['OS_BEHAVIOR_LIMITATION'],'title':'严格累计用户态CPU预算没有合格OS上界','evidence':cpu_rel,'next':'后端能力设计或另行评审明确降级合同；不解除门禁'},
 {'id':'M151-CPU-003','status':'INCONCLUSIVE','title':'最终24/58帧Job/逐进程CPU有小额负差，最大user/kernel各62.5ms','evidence':'evidence/cpu-accounting-reconciliation.json','next':'单独研究OS计量语义/更新/归属边界，不把它归咎为负载或用来放宽预算'},
 {'id':'M151-CPU-002','status':'FAIL','classifications':['TEST_FIXTURE_ERROR'],'title':'继承CPU测试非DEADLINE即可PASS，未验证预算','evidence':'cpu-root-cause-report.md','next':'历史原断言和记录保留，不作资格依据'},
 {'id':'M151-RESOURCE-001','status':'PASS','scope':'FAIL_CLOSED_MODEL','title':'已知失败能力在Host准备槽前与Broker消费前固定拒绝','evidence':'source/src/agentnexus/production/resources.ts'},
 {'id':'M151-IPC-001','status':'PASS','scope':'REAL_WINDOWS_SAME_ACCOUNT_PRIMITIVE','title':'可固定目录的同hash测试runtime让持久Peer测试真实运行','remaining':'跨SID有效权限/生产pins未测'},
 {'id':'M151-FILE-001','status':'BLOCKED','title':'File/Directory symlink fixture创建EPERM','next':'单列最小所需权限与变更审批，不擅自改系统'},
 {'id':'M151-FILE-002','status':'FAIL','classifications':['TEST_FIXTURE_ERROR'],'title':'TOCTOU原fixture未枚举安全拒绝1921，17次攻击后停止','next':'原FAIL保留，独立严格补充攻击；未来单独评审fixture'},
 {'id':'M151-BOOT-001','status':'BLOCKED','title':'真实独立Host/Worker、Profile/config/key/Task尚缺'},
 {'id':'M151-EXIT-001','status':'BLOCKED','title':'完整历史/全部外部producer未获生产闭合，不能释放五资源'},
 {'id':'M151-EXIT-002','status':'PASS','scope':'BOUNDED_NATIVE_OBSERVATION_FIX','classifications':['PROCESS_LIFECYCLE_RACE'],'title':'修前Job空/根退出取样时序不一致，原截止内等全部保留句柄；不授释放权'},
 {'id':'M151-AUDIT-001','status':'INCONCLUSIVE','title':'九producer已接线但独立持续生产组合未验'},
 {'id':'M151-GOVERNANCE-001','status':'NOT_RUN','title':'项目/平台RAM/Disk/I/O/Network/Model硬预算未实现'},
 {'id':'M151-SYSTEM-001','status':'BLOCKED','title':'新的逐项系统变更审批尚未批准'}]
(BASE/'issue-ledger.json').write_text(json.dumps({'schema':'agentnexus/issues/1.5.1','historical_ledger':'../AgentNexus-M1.2/issue-ledger.json','historical_open_boundaries':['OS-01','SCI-01','M1.3 identity/exit evidence gaps','M1.4/M1.5 CPU/production combination gaps'],'issues':issues},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(BASE/'acceptance.json').write_text(json.dumps({'schema':'agentnexus/acceptance/1.5.1','status':'BLOCKED','cpu_qualification':'FAIL','regression':'FAIL','source_set_sha256':source_hash,'source_files':100,'run_id':final_path.parent.name,'counts':counts,'exit_code':final['exit_code'],'strict_tsc':'PASS','node_syntax':'PASS','cpu_run_id':cpu['run_id'],'cpu_counts':cpu['counts'],'production_execution':{'PROCESS':'BLOCKED','EXTERNAL_EFFECT':'BLOCKED'},'independent_review':'SEE_ORIGINAL_SCOPED_REPORT','system_deployment_authorized':False,'system_configuration_changes':[],'answers':questions,'historical_failures_preserved':True,'remaining_issues':'issue-ledger.json'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'reports_written':True,'source_set_sha256':source_hash,'regression':counts,'cpu':cpu['counts']}))
