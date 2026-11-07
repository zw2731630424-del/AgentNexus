from pathlib import Path
import json, shutil
R=Path('I:/AI_AgentNexus'); O=R/'deliverables/AgentNexus-M1.5'
docs={
'phase0-report.md':'''# M1.5 Phase 0 基线冻结

HEAD `83e45e378846dfb568bf635a67e4664c76504e5f`。初始 tracked 工作树干净；冻结1986个 tracked 文件和1670个 M1.2/M1.3/M1.4 历史交付文件。根实现仍为M1.3，本轮所有产品修改仅在本交付的 source。未改 AGENTS、治理策略、其他科研项目、账户、ACL、Profile、服务或防火墙；未 Commit/Push。

M1.4 67源码集合 SHA256 `e2f95cb5c7557660dfbbf3cfcbb2a03a78460f9b408e66bd2fbb3f6ea96e3a88`，与最终隔离测试 manifest 一致；M1.4 delivery manifest 153项验证通过。复制原字节后才在M1.5开发。完整逐文件前状态见 evidence/phase0/freeze.json。

主代理全文读M1.4全部 production 模块、NativeRuntime.cs/runtime.ps1及协议/设计。独立 baseline_evidence 全文读全部18个测试/fixture、9个工具、3个build tools、全部顶层报告与ADR014—020、M1.3协议/设计/ADR010—013和M1.2策略恢复资料；完整程序解析所有M1.4原始证据。typescript_baseline全文读19个继承TS、2个checker、NativeProbe.cs、package，共3921行；两个catalog按完整JSON递归解析单列，不冒充逐行人工阅读。范围与逐项hash见 evidence/typecheck/inherited-reading-coverage.json。

历史基线：M1.2 167 PASS/4 NOT_RUN；M1.3 203 PASS/3 NOT_RUN；M1.4最终251 PASS/4 NOT_RUN，之前真实运行247 PASS/1 FAIL/4 NOT_RUN。M1.4最终原始测试数据1076成员全量校验，16 native JSONL共56帧核对raw原文；压缩审计和SQLite在只读/内存副本中检查，没有改变原件。

关键开放问题为生产启动链/持续IPC、真实独立账户与Profile/ACL、完整树与producer观察、默认拒绝网络/跨项目/管理库真实攻击、CPU累计预算、生产审计与重启，以及Ubuntu实际部署。旧CPU80ms配置先后产生4875ms、2828.125ms、2906.25ms实耗并需墙钟终止；最后旧测试PASS对应2859.375ms，测试仅看非helper DEADLINE，未验证预算。相同源码的FAIL/PASS没有根因修复证据。本轮保持历史FAIL和资格关闭。
''',
'host-bootstrap.md':'''# Host Bootstrap

入口 source/src/agentnexus/bootstrap/entry.ts 的 host 子命令调用 attestBootstrap，依次校验外置配置SHA/版本、Node24.15.0路径/指纹、启动cwd、实际SID/标准token、内核OS版本、Node/PowerShell父目录及完整源码文件owner/精确SDDL/指纹。代码树必须精确匹配 source_files，所有文件必须具备原生保留句柄；最多120 pins分至最多4批，每批含真实父Node image且不超过64 pins/60KiB。任一pin丢失或过期使native helper不可继续生产准入。

配置本身唯一null文件hash由受保护启动参数的SHA填入，防止自引用。Host/Launcher配置必须在code_root之外，共用同一不可变源码清单。五类根目录两两不重叠。SDDL仅接受已审查普通ALLOW/DENY ACE，拒绝不可信写/删除/WRITE_DAC/WRITE_OWNER；Host/Broker/输入私有目录禁止Worker/Everyone/Package读取。实际DACL由native逐项读回，配置哈希不代替ACL安全语义。

通过OS attestation后只读检查两个存储树的全部已有对象owner/DACL/file ID（最多4096，拒绝链接）；只在旧owner PID被OS确认不存在时归档遗留writer.lock。PID复用、权限不明或recovery guard不确定仍STORE_LOCKED。然后打开Host管理库、单独Broker账本、Policy/Feature/审批及私有签名材料，恢复旧boot身份/operation/准备槽为UNKNOWN，再接线Broker与Supervisor。

准备Worker也先在SQLite持久化PREPARING槽和REQUESTED审计、flush、复测实时Feature/存储状态，之后才允许创建挂起进程。绑定真实PID后PREPARED；精确Permit消费事务中原子转移至原operation五资源。崩溃/失联不能漏掉Permit之前的OS资源。未知准备槽无自动解除接口，继续阻断新准备。

标准Worker Launcher需证明固定enrollment key、实际双方pipe tuple、父Node身份、配置/源码/helper指纹及新挑战，Host才发送会话MAC密钥。长期管理端点只允许明确现有标准Operator SID；该SID与Host/Worker不同。当前账户/目录未部署，真实Host启动、Task PASSWORD/Batch与崩溃恢复仍BLOCKED；当前账户Store owner-death探针不替代它。
''',
'worker-bootstrap.md':'''# Worker Bootstrap

Launcher属于可信的专用Worker标准账户，有限任务子进程属于Restricted Token+零capability AppContainer。二者信任级别不同：不可信任务不能取得Launcher私钥、Host管理库、Admin capability、native RPC stdin或会话MAC密钥。专用标准账户中的Launcher/其native helpers属于TCB，任意同标准账户的恶意中完整性进程不在本沙箱能够隔离的范围；这个前置不能用解释器hash代替。

Launcher先验证实际SID/token/OS、不可变配置/代码/密钥ACL和指纹，验证Host真实pipe peer，然后对Host新挑战签名。PREPARE/AUTHORIZE/START都检查其本地enable_features。WindowsSupervisor创建挂起子进程，读回实际token、AppContainer、Job、三句柄继承，返回真实PID/start/session/parent。Host建立runtime/instance/project/task/session/profile绑定；审批/Permit在这之后消费。

Worker入口 worker.ts仅接受固定public-key路径/hash，通过私有继承stdin接收<=16KiB规范JSON的单次签名引导。核对签名、期限、实际PID、tool/version及arguments hash。当前固定工具nexus.digest支持<=8KiB inline bytes或<=4KiB精确版本文件摘要；不接受shell、可执行路径、通用命令、模块加载回调、覆盖或删除。

文件模式额外核对Host签名FileGrant和operation/runtime/instance/boot/project/task/resource/path/profile/epochs/expected hash。实际文件由Host FileBroker读取并校验后注入；Launcher与Worker分别验证，Worker不直接打开项目文件。输出有界且走Broker流式Artifact。

一次request结束即撤销runtime并清理在线绑定；撤权只表示不能授权，不表示完整进程树已退出。正常可观察root/job/producer结算后关闭临时helper/内存映射；持久UNKNOWN资源保留。实际跨账户签名Worker进程启动仍需部署授权及组合测试；当前验证含模型函数/真实密码学，不能标作生产Worker PASS。
''',
'runtime-identity.md':'''# Runtime Identity

复用M1.4 registry/Grant，绑定logical agent/project/task/session/role、实际SID/PID/创建时间/OS session/parent、Host/Broker boot、worker_instance、generation、profile hash。ID由可信Supervisor/Host owner创建，Agent提供的SID/PID/role不能建立管理身份。运行时与实际pipe Launcher peer分别验证，不能混为同一进程。

prepare handle仅在所属native helper中有效，挂起进程被钉住后才绑定。起跑前重查真实进程与peer、当前feature/policy epoch、原审批/Permit及期限；任一变化拒绝。request结束显式revoke；Host重启旧ACTIVE身份转UNKNOWN，不恢复ACTIVE。FileBroker生产接线要求真实identity recheck，退出后的file permit不能只凭缓存ACTIVE继续用。

bootstrap预备槽与最终operation不同：PREPARING -> PREPARED -> TRANSFERRED；任何不确定创建/旧boot进入UNKNOWN_QUARANTINED。只有当前调用栈明确尚未调用native，才可NOT_INVOKED。TRANSFERRED与原Permit/五资源同事务，保留原operation/intent。真实账户/SID生命周期、PID重用和撤权的OS组合证据仍BLOCKED。
''',
'production-broker.md':'''# Production Broker

Host标准账户中的可信Broker owner使用独立KernelStore账本，复用M1.4 ProductionExecutionBroker；Worker Launcher不获得管理库对象。Host与Broker在当前候选同一可信控制进程，不声称二者具有互相隔离的OS身份。

Broker验证实际Launcher pipe peer及签名启动证明，再将预备runtime精确绑定；Remote Permit绑定Agent/runtime/instance/operation/intent/tool/version/resource/profile/boot/generation/epochs/nonce/expiration。原审批/Permit消费和五资源预留原子提交，Broker另有唯一operation/permit/nonce/runtime/request账本；先durable START_INTENT，最终Host fence/peer/期限检查后才向Launcher发送START。断连不重发副作用。

运行输出最多一块/流，native与传输有界背压，Artifact流式写入。审计、artifact、transport故障终止/隔离，不能静默返回成功。Feature OFF、Policy DISABLED或Broker关闭不开放旧Gateway PROCESS/EXTERNAL_EFFECT，工具映射只有固定nexus.digest。

资源释放有单独Host owner receipt：真实完整签名proof、独立最终裁定、closure、原release授权已消费和五资源版本均满足后，Host才签名；Broker复核本地完整proof/intent/boot/资源，持久RELEASED。重复ACK不重复释放。只更新RELEASED资源投影可复用，revision递增；UNKNOWN不能覆盖，原operation/intent与审计不改。

完整生产dispatch依然受空资格证书/默认OFF和真实隔离证据阻断。模型fixture/真实同账户进程不构成生产Broker部署PASS。
''',
'trusted-ipc.md':'''# Trusted IPC

BootstrapNative.cs新增长期Named Pipe owner；最多4端点、4连接、4 pin leases、8未完成native请求、128 helper lifetime opaque IDs。二进制帧4字节BE长度加<=24KiB payload，native RPC总帧<=64KiB。FIRST_PIPE_INSTANCE、REJECT_REMOTE_CLIENTS，server full rights，独立client具体0x0012019b，排除FILE_CREATE_PIPE_INSTANCE=4；实际DACL读回。test路由不产生生产资格。

双向kernel peer PID/session、固定进程句柄、创建时间、实际SID/token、映像路径/hash均重查；生产标准peer拒绝AppContainer/elevated/admin组。所有生产pin批次均复验/续idle lease，任一失效锁定；父Node死亡watcher终止helper。helper死亡只代表终止请求，不能替代ExitProof。

Host先验证Launcher Ed25519 enrollment挑战证明，绑定实际双方tuple、owner、配置、完整源码、helper及新nonce，然后才在已经认证的私有连接传送随机MAC key。key不进入argv/环境/日志。后续规范JSON/HMAC覆盖direction/session/sequence/nonce/issued/expires/request/operation/kind/payload，墙钟回拨锁定与本地截止、nonce不淘汰复用，4096消息上限，错误/超时关闭连接，禁止自动重放。

NativePipeChannel共享有界RPC串行门，peer监控与输出写入不能争用单飞NativeClient；最多一项上层RPC，帧有背压。Host对管理端点另验固定Operator SID，该端点不接Worker identity字段作为管理身份。

当前AppContainer宿主拒绝精确user-SID-only pipe正向连接；已保存NOT_RUN，未添加capability ACE或放宽权限。实际first-instance、部分伪造身份/长度负例和父进程死亡观察为限定原语PASS；持续多帧、真实client-instance有效拒绝与跨账户组合尚未证明。
''',
'windows-sandbox.md':'''# Windows Sandbox

复用Restricted Token删除多余privileges/禁用groups/Low integrity、零capability AppContainer、挂起创建/Job assignment/readback、禁止breakaway、显式3句柄继承。生产Launcher必须是已批准独立Worker标准账户；不提供同SID Host、管理员、交互登录或primitive回退。

初始有限工具profile只含只读code_root与Node runtime目录，writable=[]、active processes=1、output有限；项目输入通过FileBroker注入，临时/输出不直接授Worker写。代码/凭据/管理/输入根两两隔离，文件owner/ACL语义及实际SDDL/pins核验。AppContainer Profile私有LocalState等默认可写路径必须在真实部署时单独检查/拒写，不能因writable=[]声明就视作OS已限制所有磁盘路径。

网络默认DENY，未授网络capabilities；这不是“任何网络路径都已阻断”的证据。loopback exemptions、IPC/COM/其他主机服务、DNS/IPv4/IPv6/代理/本地网络路径的真实对抗尚未运行，不改防火墙。

Job资源读回与实际CPU时间资格分开。当前CPU资格失败；文件Broker配额不冒充OS磁盘硬配额。WindowsSupervisor保持network_verified/filesystem_verified/limits_verified=false，资格证书不能替这些事实填true，所以即使仅批准基础账户，也不能自动生成生产EXIT_VERIFIED。

独立身份/ACL/Profile/Task尚未授权部署，组合沙箱BLOCKED。token/job/file/pipe单独原语、模拟网络拒绝、某次无法连外网都不能拼成组合PASS。
''',
'file-broker.md':'''# File Broker

FileGrant保留M1.4精确字段与原子nonce消费，绑定operation/runtime/instance/boot/project/task/resource/profile、路径、READ/CREATE/SUBMIT、expected/content hash、字节、epoch与期限。生产接线在消费前与audit barrier后实际重查Worker身份；失效身份不靠缓存ACTIVE读文件。

NativeFileOwner从盘符锚逐组件以目录句柄和NtCreateFile相对打开，拒绝reparse、symlink、junction、ADS、UNC/device、hardlink>1；祖先不share-write/delete，叶句柄核file ID/size/hash/version。字符串相对路径检查只是格式拒绝，不是授权边界。当前RPC单操作<=24KiB，CREATE只新建且先复制内容，禁止隐式覆盖/删除；读写授权/结果均审计。

M1.5有限摘要文件模式只允许<=4KiB，参数精确资源+相对路径+expected hash；Host消费原执行Grant后派生同operation的READ FileGrant，经真实FileBroker读取并全量核Artifact，再传双签名引导与bytes。Launcher/Worker分别验证签名/全部绑定/hash。Project resource为Host私有只读输入，Worker不获得管理数据库或其他项目路径。

模型攻击覆盖跨operation/resource/path/epoch/过期/篡改bytes、审计后撤权nativeReads=0；继承真实句柄文件原语另有日志。真实独立账户下跨项目/Host DB、竞争junction/hardlink/TOCTOU与实际任务组合仍BLOCKED，不能因模型或路径校验通过宣称全边界。
''',
'process-supervisor.md':'''# Process Supervisor

RemoteSupervisor只通过已认证Launcher请求固定工具；WindowsSupervisor持native prepare handle。prepare先创建挂起进程，核token/Profile/Job/显式继承，Host才获得真实process tuple并签Permit。AUTHORIZE复测绑定、参数/文件签名、真实挂起进程；START单次消耗prepare。父Node退出watcher、IPC撤销、wall/output故障请求终止Job，未观察完整退出时保持UNKNOWN。

Native原采样不再被当成完整历史：新增最终Job TotalProcesses与全部保留的固定进程身份数核对、active=0、每个kernel parent PID/创建时间核对。只有全部对应，history_complete_observed及parentage_verified_complete才可能true；短命成员漏采样或父链缺口仍false。Host buildExitProof还校验每条父链到唯一root、无环、全部句柄退出，单一Job空信号不足。

root/job/producer有明确结算后可退休临时helper/内存映射，持久resource claim不随之释放。未知prepared槽即使helper/TTL结束也不自动清除；当前没有自动解除未知准备槽的接口，需另行完整退出/资源owner恢复证据。它是可用性阻断，不能以放松资源纪律规避。

父先退出子残留、输出producer残留、PID复用、短命子进程及真实Host重启的完整独立身份组合测试尚需授权；旧同账户orphan窗口/当前owner-kill原语只说明其限定观察。
''',
'exit-proof.md':'''# ExitProof

保留M1.4签名Proof v2原件、Artifact hash导入、immutable表与独立Host verifier；增加M1.5 closure持久表。状态区分TERMINATION_REQUESTED、PROCESS_EXITED、PROCESS_TREE_EXITED、OUTPUT_PRODUCERS_SETTLED（closure中映射OUTPUT_SETTLED）、EXIT_VERIFIED/EXIT_UNVERIFIED。

完整退出必须有唯一root/完整父链/Job全成员退出、无未知成员、进程及Job句柄观测、stdout/stderr producer EOF与Artifact全hash、sandbox token/network/filesystem/limits事实、sandbox settled。closure再要求实际source、连接撤销、pending=0、unknown=0、sandbox关闭、五资源owner精确版本和释放条件。proof和closure均需成功持久化+审计。输出或IPC未知不能以根进程退出代替。

Host只接受固定Broker公钥；原signed_packet和原body分别保留，远端Artifact流式核hash/bytes，导入与send共用截止/取消。closure不是操作副作用最终裁定；它本身也不释放资源。

本轮模型/审查证明不完整或伪造材料拒绝、循环父链拒绝、owner/IPC不完整不能release。当前native的网络/文件系统/全部硬限制事实仍false，生产proof不能EXIT_VERIFIED。真实进程树/完整执行环境退出证明仍BLOCKED。
''',
'resource-release.md':'''# Resource Release

保留原M1.2 Writer Claim、原operation/intent、M1.3 UNKNOWN_QUARANTINED、M1.4 WRITER/WORKSPACE_LOCK/PROCESS_SLOT/WORKER_QUOTA/SANDBOX_RESERVATION五投影和历史裁定。

Host release要求固定Broker签名原件、完整REAL_WINDOWS proof、完整M1.5 closure、当前boot/操作状态、非UNKNOWN独立最终裁定、五个HELD资源精确revision、release安全Feature当前ON及可信owner授权。原prepare/commit challenge与receipt原子消费，独立L0 owner策略不随Policy DISABLED关闭。缺任何项不释放。

Host完成RELEASE_WRITER后按原consumed release授权的版本快照形成签名owner receipt；Broker核自身完整proof、原operation/intent/boot和五版本后单次记RELEASED。重复已完成ACK不释放第二次。新operation只可复用RELEASED投影并递增revision，不能覆盖UNKNOWN；原授权/审计/原intent都保留。

Permit前的PREPARING/PREPARED槽另有持久投影，转移与原Grant事务原子。未知准备槽及旧boot继续占位，没有自动TTL解锁或重放。未调用native这一事实必须来自当前可信调用栈，才可NOT_INVOKED；重启不能靠“没有STARTED记录”推断未调用。

独立SQLite/crypto模型覆盖有效/无效receipt与幂等、未知proof拒绝、事务回滚与故障。当前无真实完整production proof，资源释放全链仍BLOCKED；不为避免阻塞提供人工勾true或无证据清理。
''',
'audit-producer-matrix.md':'''# Audit Producer 覆盖矩阵

记录含Event ID、Operation ID、Agent/project/task/session、runtime/worker、resource、profile、policy/feature epoch、proof/Artifact hash或明确不适用。Bootstrap未有Worker时使用Host process/boot及null worker，不从Agent字段取得Host身份。原生完整原文日志独立保存，不冒充已进入生产Audit。

| 组件 | 接线与屏障 | 当前证据 |
|---|---|---|
| Host Bootstrap | OS_ATTESTED/READY、存储ACL/锁恢复绑定；准备REQUESTED与PREPARING同事务flush | 静态/SQLite模型；真实独立身份启动BLOCKED |
| Broker | AUTHORIZED/START_INTENT/STARTED/RESULT先消费再起跑 | 模型+真实Store/crypto；生产BLOCKED |
| Worker/Identity | IDENTITY_BOUND、BOOTSTRAP_BOUND、REVOKED；一次请求结束撤权 | 模型/源审；真实跨账户BLOCKED |
| IPC | peer/frame认证、拒绝/关闭、挑战证明 | 模型+限定原生响应；正向持续生产IPC NOT_RUN |
| Sandbox | PROFILE_CHECKED、helper/profile hash、Job/token raw | 同账户原语；组合BLOCKED |
| File Broker | AUTHORIZED/RESULT/INDETERMINATE、actual file ID/hash/Artifact | 模型与继承原生文件；生产组合BLOCKED |
| Process Supervisor | START_INTENT/STARTED、终止/树/producer/proof状态 | 模型+原语；全树组合BLOCKED |
| ExitProof | immutable signed packet、导入hash、closure hash/state | 模型/源审；production EXIT_VERIFIED不产生 |
| Resource release | owner prepared、原裁定/五版本、Broker receipt hash | 独立模型；production release BLOCKED |

审计失败不返回高风险成功：准备flush失败native创建计数0；Broker消费/START_INTENT未durable不resume；输出/Artifact失败请求终止并UNKNOWN；结果存储失败不返回PASS。大型输出逐块背压写Artifact，没有全输出无限累积内存。真实长期九组件覆盖、持久IPC断线及审计故障组合尚缺证据，所以整体覆盖裁定INCONCLUSIVE。
''',
'feature-policy-catalog.md':'''# M1.5 Feature / Policy

继承165 Feature/44 Policy语义对象保留，新增5项（合计170）：

| Feature ID | 默认/范围 | 依赖 |
|---|---|---|
| runtime.bootstrap.host | OFF / G | runtime.host.production |
| runtime.bootstrap.worker | OFF / G | runtime.worker.production, runtime.bootstrap.host |
| runtime.ipc.persistent | OFF / G | runtime.ipc.windows.production |
| runtime.exit_closure | OFF / G | runtime.exit_proof.production |
| runtime.ubuntu.adapter | OFF / G | core.identity, core.audit.trail |

每项定义risk、conflicts、off_behavior、degradation、recovery、tests；见source/config/agentnexus/features.json。前4项加入REQUIRED_FEATURES，Ubuntu仅技术准备。关闭即拒绝、撤销并请求终止，未知资源保留；不开放direct spawn/host DB、不降低OS身份/ACL/沙箱、不静默跳过审计。恢复须新attested boot/peer和精确Permit，旧operation不重放。

44 Policy含30项不可降级L0。P.RUNTIME_IDENTITY/P.IPC_PEER/P.REMOTE_PERMIT/P.SANDBOX_PROFILE/P.FILE_BROKER/P.PROCESS_OWNER/P.EXIT_PROOF/P.RESOURCE_RELEASE/P.AUDIT_REQUIRED/P.PRODUCTION_QUALIFICATION由各可信owner直接执行，不把L0交给可选PDP evaluate；固定工具仅选择可降级P.COMMAND_RISK，精确副作用审批/Permit与独立owner约束始终执行。

默认资格证书为空、功能OFF。只有真实目标OS/SID/profile/helper/tool绑定的有效资格才可准入；证书不能填补实际native observation中的false/unknown。未实现策略/平台默认DENY/BLOCKED。模型catalog测试不代表170项都实现。
''',
'adr.md':'''# M1.5 ADR021—029

- ADR021：在独立M1.5目录开发，以冻结M1.4完整源码为输入，根M1.3及历史证据不变。
- ADR022：Host/Broker为同一可信标准账户的控制平面，Broker独立账本；可信Worker Launcher标准账户与不可信AppContainer子进程分层，不谎称同UID任意恶意进程可隔离。
- ADR023：解释器hash/实际SID不单独证明精确Launcher入口，增加固定enrollment签名挑战，MAC key在证明后交付；真实密钥/ACL信任须部署对抗。
- ADR024：Host/Launcher配置外置，解决自身hash和双角色清单循环；完整代码清单、全部叶文件ACL/指纹/保留句柄与至多4批pins共同约束TOCTOU，任一批失效锁定。
- ADR025：存储子对象单独只读owner/DACL遍历，不以根DACL推导DB子文件安全；只在OS明确旧owner PID不存在时归档锁，未知继续拒绝。
- ADR026：Grant以前已创建的挂起进程也占持久PREPARING槽；审计flush在native调用前；transfer进入原Permit事务；旧boot/不确定不自动清槽。
- ADR027：Job最终TotalProcesses与所有钉住身份核对历史，kernel parent与创建时间核父链；遗漏短命成员保留unknown。通知/父退出/Job空均不能单独证明退出。
- ADR028：Proof v2加独立closure与Host owner release receipt。五资源精确版本、最终裁定与签名原件均必须，双账本单次释放，已释放投影revision递增复用。
- ADR029：CPU旧PASS只是非DEADLINE且实耗超预算；新工具直接核用户态累计预算/容差及终止边界，并在冻结隔离源码运行。真实FAIL保留，资格不因重跑变绿；Ubuntu Windows证据不互认。
''',
'ubuntu-adapter-spec.md':'''# Ubuntu Adapter 技术准备

source/src/agentnexus/bootstrap/ubuntu.ts实现严格配置/启动计划与peer绑定验证，ubuntu/peer_probe.c提供实际SO_PEERCRED读取原语源码。Linux编译/执行NOT_RUN，不接触服务器。

独立非root UID/GID、UDS最小socket目录权限与SO_PEERCRED、pidfd和/proc start ticks、不可变映像hash；User namespace精确uid/gid映射且setgroups deny；private mount namespace只读runtime，无Host DB挂载；PID namespace可信init收割全树；Network namespace初始空且无继承socket；PR_SET_NO_NEW_PRIVS、seccomp默认拒绝、精确AppArmor profile；cgroup v2用CLONE_INTO_CGROUP在不可信指令前加入，限制pids/memory/swap/cpu.max。文件用openat2 RESOLVE_BENEATH/NO_SYMLINKS/NO_MAGICLINKS句柄owner。

cpu.max是带宽，不是累计CPU时间终止保证。ExitProof需全部pidfd signaled、cgroup.events populated=0、namespace init收割、stdout/stderr EOF、UDS请求账本settled或UNKNOWN、资源owner及独立裁定；单一信号不能解锁。缺失namespace/seccomp/cgroup/AppArmor能力拒绝，不回退到普通宿主命令。

真实服务器UID/GID、subuid/subgid、mount、socket/ACL、AppArmor/seccomp/cgroup控制器及恢复策略必须另行授权逐项部署。Windows模型、primitive或PASS不转移为Ubuntu PASS；当前准备模型测试PASS，OS adapter/deployment NOT_RUN。
''',
'm16-recommendations.md':'''# M1.6 后续工作

1. 先审阅M1.5基础对象授权，实际创建SID后展开精确ACL/源码/Runtime/配置/Key/Task XML；基础批准不等于Task、Profile、登录权或生产启用批准。
2. 在真实两个标准账户及既有标准Operator的非AppContainer上下文完成attestation/签名挑战/持续IPC/撤销/固定Worker全链，给每个实际组件归档原始帧与源指纹。当前长期入口静态/模型结果不作为OS部署通过。
3. 单独调查CPU历史波动、目标OS嵌套Job/累计user time与子成员计量，明确可接受granularity/overshoot后跑重复/长时/并发/负载资格。现有实际FAIL不得降格成PASS或由墙钟kill代替。
4. 补真实默认拒绝网络全部路径、AppContainer默认可写私有目录、跨项目/管理库拒绝、文件链接/TOCTOU与子进程逃逸对抗，建立实际filesystem/network/limits事实；当前WindowsSupervisor三个字段继续false。
5. 完成真实完整树/producer/IPC/沙箱关闭proof与五owner释放，包括Host强杀/重启、PID复用、receipt提交中断。对Permit前UNKNOWN准备槽提供独立验证后的owner恢复合同；保持现有拒绝，不能清数据库或TTL解锁。
6. 做持续运行/背压/磁盘满/audit断电故障资格和完整生产audit覆盖；保持raw失败/中间source快照。
7. Ubuntu先在独立授权环境编译native peer/pidfd/openat2/namespace/seccomp/cgroup/AppArmor适配器，独立验收。Provider、API Key、正式科研与外部副作用仍未开放。
'''
}
for name,body in docs.items():
    p=O/name
    assert not p.exists(),name
    p.write_text(body,encoding='utf-8',newline='\n')
initial=O/'design.md'; dest=O/'evidence/development/design-initial.md';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(initial,dest)
initial.write_text('''# M1.5 总体架构

完整Windows生产执行链仍BLOCKED。代码候选已建立可信启动、独立Launcher控制、精确授权/文件输入、监管与保守退出/资源闭合；真实独立OS部署尚未授权，CPU硬预算资格失败。

```text
外置受保护配置/固定入口 -> OS/SID/token/OS build/完整源码和ACL pins
 -> Host Control Plane + Policy/Approval + 独立Broker账本
 -> 已认证pipe + Launcher enrollment签名挑战 + 私有MAC会话
 -> PREPARING槽/REQUESTED审计flush -> 挂起Restricted/AppContainer/Job Worker
 -> 绑定真实PID/instance/project/task/session/profile -> 原子审批/Permit/五资源transfer
 -> Broker durable START_INTENT/最终fence -> Launcher AUTHORIZE/START
 -> 精确File Broker双签名输入或有界inline输入 -> Worker有限摘要
 -> 流式Artifact/完整树与producer观察 -> 签名Proof + closure
 -> 独立最终裁定/owner授权 -> 原资源释放 -> 签名Broker ACK -> Audit
```

Host与Broker同属可信Host标准账户，Broker独立Store；可信Worker Launcher标准账户是TCB，有限任务在更低的Restricted/AppContainer token。pipe peer与子Runtime分别验证。完整目录/子文件ACL、真实key保密和Task安全上下文仍须OS部署证明，不能由声明代替。

Host/Launcher配置都在code_root之外，共用精确只读代码清单；每个代码文件都有独立ACL/哈希/保留句柄，最多4批native pins。存储子树只读权限检查、owner死亡锁恢复先于管理对象。新boot恢复身份、operation及准备槽UNKNOWN，不重放。默认Feature OFF、资格空、Native隔离事实false保证未完成工作不误开放。

具体组件与范围见host-bootstrap.md、worker-bootstrap.md、trusted-ipc.md、windows-sandbox.md、exit-proof.md、resource-release.md。设计变更决策见adr.md，验收以acceptance-report.md及机器结果为准。
''',encoding='utf-8',newline='\n')
print(json.dumps({'documents':len(docs)+1,'status':'written'}))
