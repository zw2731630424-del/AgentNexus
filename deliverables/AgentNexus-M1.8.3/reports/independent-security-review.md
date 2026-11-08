# M1.8.3 独立安全审查

状态：**离线范围复核完成；所列代码问题均已修复并按下文范围核验。生产 Credential Service、真实 Key 录入及 LIVE 继续 BLOCKED。**

审查者为独立上下文的 Codex 工程审查代理；未编写实现，不修改规则、历史交付或实现代码。完成历史根因、设计、候选源码正确性审查、现成合成测试及最终小范围差异复核；未部署服务、改变账户或 ACL，没有查找或读取真实凭证、没有真实 Provider 请求。代码检查和实际 OS 资格分别裁定，本报告不签发生产 PASS。最终 225 文件源码集 SHA256 为 `108e724d0b5796f472d5eb46a9088c556f04084c4bca0dad9bceb9a691d0090a`。

## 历史根因与必须保留的失败

已完整阅读 M1.8.2 的 README、acceptance-report、vault-qualification、data-egress-qualification、独立安全报告、vault-final 及原始同 SID 反例，并阅读 Model Provider UI 的最终验收、独立审查、Vault/DPAPI、desktop service/contracts、Electron main/preload/sender 与关联 Gateway/Transport/身份实现。未把机器读取或路径检索等同全部项目逐行语义审查。

M1.8.2 原始运行目录 `probes-sm8PXV` 与 `probes-VXz7mJ` 的 `vault-isolation.json` 均记载：父子为实际不同 PID、同用户 SID、同轮次 AppContainer 身份；新子进程直接读新建合成 SQLite 并调用 CurrentUser DPAPI 解密，`ordinary_process_read=true`、`ordinary_process_dpapi_decrypt=true`、预期与实得 SHA256 相等、退出码 0。前者与交付 `evidence/probes/vault-final.json` 对应。生成脚本与独立 reader 的合成目录/元数据前置限制也已阅读；本次没有重新打开旧数据库或重新解密任何旧内容。

该反例的根因是 Host 与攻击进程没有独立的 OS 访问边界；公开熵、同用户 DPAPI、进程内 WeakSet admin 能力、受限 facade 和 Electron frame 检查都不能改变这个事实。旧 Vault Windows 分支主要检查链接、nlink 和 realpath，没有因此证明受保护 DACL。旧桌面 main 与 Vault/Guard/账本位于同一信任进程，`assurance=SIMULATED` 及 `LIVE` 读取前拒绝是有效的保守边界，不能仅改字段解除。

历史完整回归仍 FAIL；CPU/PROCESS/EXTERNAL_EFFECT/Storage 等既有未获证门不属于本次 Credential Service 代码审查可自动解除的范围。UI 历史四项 FIXED_VERIFIED 只证明当时合成候选的共享并发、关闭、NOT_SENT 备用和 403 映射；不证明生产进程隔离。

## 候选设计审查

主代理提出的候选方向为：`NT SERVICE\AgentNexusCredential` 虚拟服务身份、受保护 ProgramFiles 代码与 ProgramData Vault/唯一 Ledger、native C# SCM supervisor 和同服务令牌 Node engine；固定命名管道、显式 DACL、双方核对真实 OS token/image；客户端必须为固定 operator SID、elevated/high、非 AppContainer，辅助绑定 PID/创建时间/image hash；桌面从受保护安装运行可信 elevated main，Renderer 保持 sandbox。生产资格由管理员外部 CMS 签名证据与本机检查共同约束，缺实际 OS 证据拒绝启动。普通 RPC 不提供 readKey/decrypt/export/任意 URL，最终请求/来源/主体审阅、预算与 UNKNOWN 均由服务持有。

这一方向能够把凭证解密身份移出普通 Agent 用户，但以下生产风险不能凭设计文本或代码存在关闭。矩阵区分离线代码复核与实际 OS 验证，具体代码问题及证据见后文：

| 项目 | 必须防范与尚需证据 | 当前裁定 |
|---|---|---|
| 服务身份与对象权限 | SCM 实际 LogOn 身份、服务 SID/类型、进程 token/完整性/权限；服务二进制、Node、engine/helper、配置、签名根、父目录及更新路径的 owner/DACL；Vault、WAL/SHM/journal、账本、备份、日志和临时目录的读写拒绝 | NOT_RUN；生产 BLOCKED |
| 同 SID 普通进程与高权限桌面 | high IL 不能单独推导文件保密。需实际 medium/low 同 SID 和受限角色尝试读 Vault、读桌面/服务内存、VM_WRITE、DUP_HANDLE 与 dump，并保留真实错误和 token 证据；不得以当前继承 AppContainer 的同身份模拟代替 | NOT_RUN；历史同 SID FAIL 保留 |
| elevated UI 的启动输入 | 受保护 executable hash 之外还要固定 JS/ASAR、DLL/模块搜索、当前目录、环境、命令行及 bootstrap；不得继承可执行注入、用户可写预加载/配置或调试入口。原生单实例消息、协议/文件打开、快捷方式参数都可能成为 elevated main 的不可信输入 | 代码已复核；实际启动链 NOT_RUN |
| Renderer/可信录入 | high main 不能自动使 Renderer 为可信录入。实际 token/sandbox、调试关闭、导航/子帧/第二窗口、精确 sender 及秘密输入清零须另验。Chromium profile/cache/session、剪贴板、崩溃报告/WER/Crashpad 与用户可读写目录不得成为明文秘密副本或代码污染入口 | NOT_RUN；真实 Key 不得录入 |
| 命名管道双方认证 | service SID/DACL 不能替代逐连接 OS token 检查；客户端自称 role/SID/PID 不可信。需防远程连接、名称抢占/假 server、PID 重用、匿名或错误 impersonation、会话混用、句柄转交，以及认证后长期复用。真实 server 应关联当前 SCM 实例与 pinned process handle，而非仅路径 | native 代码已复核；真实 pipe NOT_RUN |
| supervisor/engine 交界 | native 认证结果必须只来自可信父进程私有通道；engine 不应接受普通调用者自造 peer 元数据、qualification 或任意命令。stdin/stdout 管道、句柄继承、错误处理、有界帧和进程退出均是边界的一部分；impersonation 必须可靠恢复服务身份 | 代码/合成进程已复核；生产服务进程 NOT_RUN |
| CMS 资格证据 | 外部可信签发者和私钥不能由普通调用或交付测试生成来取得生产资格；校验精确内容、签名算法/证书 pin/有效期、目标机器、安装摘要、身份、ACL、唯一账本、原始试验集合、时间/到期与防回滚。签名仅鉴别签发来源，不能代替当前状态实测；安装/配置/身份变更应使旧资格失效 | 无实际生产证据；BLOCKED |
| 服务内最终授权 | 将 exact body/context/request/subject 来源审阅与一次性用户授权留在服务中，最终 fence 必须重新核对 durable grant、expiry/revoke、主体和全部 wire bytes。禁止外部 true 回调、自报 PUBLIC 标签、替换 request id/endpoint、重复 JSON 键或仅 hash 配置完成审批 | 代码/现成合成测试通过；实际签名授权/LIVE NOT_RUN |
| 唯一账本与崩溃 | 固定机器级账本且拒绝客户端换 root/campaign；并发多客户端、服务重复实例、send-intent 断点、重启、未知用量、轮换/撤销竞争必须组合验证。UNKNOWN 不释放、不重放、不自动切备用；明示预算迁移和数据回滚处理 | 需代码及实测；BLOCKED |

UAC 是防御纵深，不是本报告认可的独立用户隔离证明；MSRC 将 UAC 列为无安全维护承诺的防御纵深特性。真正的凭证边界应来自独立服务身份及实际对象访问控制，并在声明的普通攻击进程范围内逐项实测。[Microsoft 安全维护标准](https://www.microsoft.com/en-us/msrc/windows-security-servicing-criteria)。

MIC 的默认对象策略是 no-write-up；它还支持单独的 no-read-up 策略，因此不能从 high 泛化出所有文件、profile 与日志禁止读。本审查没有凭此认定高完整性 process object 一定可读，也没有凭设计认定一定拒绝；两者应以本机 token、对象安全描述符和访问试验裁定。[Microsoft MIC](https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)、[进程访问权限](https://learn.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights)。

固定管道应显式处理 first-instance 与 reject-remote，并认真选择权限掩码：Microsoft 文档指出默认 pipe DACL 包含更宽主体，且某些 generic write 权限会隐含创建 pipe instance 权限。认证应读取连接对应 token，不能只查询 payload PID；客户端也必须在发送秘密前完成 server 认证。[命名管道权限](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)、[CreateNamedPipeW](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-createnamedpipew)、[客户端 impersonation](https://learn.microsoft.com/en-us/windows/win32/ipc/impersonating-a-named-pipe-client)。

## 当前独立裁定

**离线范围复核完成；生产 BLOCKED。** 历史根因明确，冻结候选的所列代码问题已按后文证据关闭；实际安装、UAC、账户/ACL、跨角色拒绝、可信录入、真实 Provider/费用试验仍无资格。本审查不索取真实 Key，不把模拟 PASS、native 编译或签名验证代码当作真实隔离通过。

## 候选代码正确性审查与第一轮现成测试

审查范围为 `credential-service/{boundary,contracts,store,broker,engine,client}.ts`、Vault/Gateway 最小接口变化及 desktop service/main 集成。当前范围已收窄为只读代码正确性审查及已提供的本地合成单测；不再编写或运行新的攻击利用或 OS 权限探针。

先前诊断脚本有一次本地启动，随后因 Adapter 返回的 request 为 frozen object、脚本直接修改 `request.url` 产生 TypeError，进程退出 1，未产生完整 `observations` 文件，故不作为任何漏洞成立或修复通过的可复现证据。父代理随后通知上一阶段工具安全检查停止，并明确收窄范围。本报告保留未完成的事实；没有执行 OS 攻击试验，没有将未完成流程描述为完整独立攻击测试。

独立通过 [现成测试 runner](../evidence/independent-review/review-existing-tests.mjs) 执行：

```powershell
node --test tests/agentnexus/m183-service.test.ts tests/desktop/isolated.test.ts
```

结果为 **25 项：24 PASS / 1 FAIL / 0 SKIP**，Node v24.15.0。11 个相关源码及测试文件的执行前后 bytes/SHA256 一致，完整清单见 [本轮记录](../evidence/independent-review/existing-tests-2026-11-08T15-43-57-426Z.json)，[原始输出](../evidence/independent-review/existing-tests-2026-11-08T15-43-57-426Z.stdout.txt)。该清单只标识本轮候选，不能外推后续修改版本。

唯一失败为 `provider timeout/cancel preserves unknown outcome...`：测试把 prepared deadline 改为当前时间后 100ms，实际 DPAPI 处理结束时尚未发送即截止，获得 `VAULT_CREDENTIAL_OPERATION_FAILED / timed_out=true / sent=false`；测试断言要求 `sent && timed_out`。这是未保证进入 Transport 的夹具前提问题，不是已经证明服务错误释放 SENT/UNKNOWN；原 FAIL 保留。发送前截止与进入 Transport 后的取消应分开验证，新版持久 prepared 合同也不能通过外部篡改 deadline 构造合法测试。

### 已报告的候选缺陷

| 编号 | 可验证的源码问题与影响 | 当前审查状态 |
|---|---|---|
| IR-M183-001 | 初审 execute 只检查 active.size，未拒绝相同 request_id。第二次调用会覆盖同 ID controller，随后 reserve 的重放拒绝分支 finally 又删除第一调用的 active 记录，影响并发计数、disconnect 与 close。 | FIXED_VERIFIED；active.has 拒绝已静态核对，最终现成测试确认重复在途拒绝、close 仍 BUSY、实际 Transport 仅 1 次 |
| IR-M183-002 | 初审 prepare 未持久化其签发内容；execute 接受 null credential_handle_id，且未对照完整签发记录，准备后的 Key/nonce/deadline 等绑定可被改变。 | FIXED_VERIFIED；prepared 完整 binding hash 与 reserve 同事务核验/消费，最终现成测试确认 null/替换 handle 拒绝、原 binding 继续有效 |
| IR-M183-003 | desktop 的 credential.state/delete 转发额外 models/model_wire_ids，真实 broker 的严格 fields 合同不接受这些字段，正常 UI 操作会以 SERVICE_SCHEMA 拒绝。原有 FixtureService 接口测试未严格拒绝未知字段，真实子进程测试未覆盖状态/删除。 | FIXED_VERIFIED；转发收紧为合同字段，实际合成子进程经现成测试完成禁用/启用、轮换、模型范围更新与删除 |

主代理同时修复了 withCredential 对错误的静态包装造成 partial observed_usage 丢失、导入后再对新 Key 的 label 执行 Guard、以及 UTF-16 surrogate 截断。相应分支已阅读，partial Usage、UTF-8 和流 Guard 的现成测试在冻结候选上通过；精确版本见各轮清单。

### 初审限制及后续裁定

- 初审 Broker 同时允许 deepseek-flash 与 deepseek-v4-pro，却固定构造 Flash ModelSpec 并用 Flash rates 的 deepSeekCost。生产未发生实际错账；最终执行已收紧为 Flash，pro 仅作元数据管理。未来开放其他模型仍需对应的能力/价目资格。
- 初审 `encoded and fragmented known secrets` 测试只把一个包含完整原文秘密的 content 事件分成 1 字节传输。最终新增 base64 跨两个语义 content 事件的检查并通过，具体范围见冻结复验；仍不证明任意编码都安全。
- 合成 worker 的实际进程/重启测试仍为同 SID 私有继承 IPC；它没有测试 native 命名管道、CMS 生产证据、实际 operator/service 令牌或生产权限。只读范围不执行新的部署/OS 探针。
- final body/subject/context review、send intent、四层预算同事务与 UNKNOWN 保留，以及 native 签名同意入口已做下述源码复核。完整生产边界仍须实际部署资格，维持 BLOCKED。

## 冻结候选复验

独立执行相同两套已提供测试，最终 **27 PASS / 0 FAIL / 0 SKIP**（19 项服务、8 项 desktop）。没有新增攻击脚本或 OS 探针。全 `source/` 共 225 文件在执行前后 bytes/SHA256 完全一致；递归清单排除依赖/生成目录 `node_modules`、`dist`、`raw` 与 `.git`，集合 SHA256 为 `573293748e67e49ff9b8586082ca0d90749b36b141bb3ea588a2c35cc4b0fc12`。算法为排序后的 UTF8(path + NUL + lowercase_sha256 + LF) 拼接再 SHA256；[完整记录](../evidence/independent-review/existing-tests-2026-11-08T16-05-53-365Z.json)、[原始输出](../evidence/independent-review/existing-tests-2026-11-08T16-05-53-365Z.stdout.txt)。

本轮核对了先前限制的实际变化：

- 超时测试由服务内 `prepare(input,2000)` 签发合法 deadline，明确等待进入 FixtureTransport 后断言超时；得到 sent/timed_out 且保留预算，测试 PASS。首轮 100ms 夹具 FAIL 没有删除或回填。
- 泄漏测试现将已知合成秘密转为 base64，再拆成两个语义 content 事件，底层每字节切片；原文和 base64 均未发布，测试 PASS。这提高了该具体编码/分片组合的覆盖，仍不等于通用 DLP。
- 服务和 desktop 路由现在仅执行 flash；pro 可保留元数据和 Key scope，但相应执行拒绝。先前 pro 共用 Flash 价目的风险由限制执行范围关闭，未宣称 pro 已联调或报价通过。
- 四层预算的配置只更新 lim，不清零 used/held；切换 session、提高/降低限制、低于已承诺容量的拒绝均在现成测试中验证。UNKNOWN/partial Usage、真实合成进程重启和硬退出占用保留的用例继续 PASS。
- 与 Vault/Gateway 交界核对：LIVE 缺失/伪造边界在访问前拒绝；返回使用服务账本结果且 Host 记录标记 authoritative=false；服务完成后 Host 持久化失败仍视为未知，只有明确 NOT_SENT 才可备用重发。

这些结果只覆盖该哈希候选与本地合成路径；没有执行生产命名管道、跨身份 DPAPI、真实费用或实际外部请求。

## Native 只读复核与待裁定项

已阅读 Common/SCM supervisor/PipeClient，覆盖 token、SCM 配置、进程创建时间/父链、固定文件 hash/完整 app manifest、owner/DACL/reparse、CMS pin/摘要/时间绑定、NDJSON、有界句柄继承和 Job 关闭。native 构建/纯测/入口负测由主代理或 native 实现者运行，本审查未独立重跑，不能把其报告冒称独立 OS 测试。

QUALIFICATION_ONLY 由外部 CMS 签名计划选择，必须 qualified=false、真实开关 false、真实批准引用为空；native 真实服务 SID 和受保护安装要求仍存在。Node 固定 qualification 根、SYNTHETIC Vault 与 FixtureTransport，合成秘密前缀在 native 与 Node 两层检查；只有 QUALIFIED 分支导入固定 helper 核验过的精确请求 consents，普通 RPC 没有 approve。计划没有在本机安装、签发或启用；它是后续收集合成 OS 证据的受控模式，不是已取得资格。

只读复核另发现以下项目；最终离线裁定与证据范围分别列明：

| 编号 | 具体问题/限制 | 状态 |
|---|---|---|
| IR-M183-004 | 初审 Common Frames.Read 的新调用从旧 buffer 遗留字节开始时，deadline 初值仍 DateTime.MaxValue；需要异步补齐后，剩余毫秒转 int 可能溢出并成为零超时，合法跨 buffer 帧可能断开。 | FIXED_VERIFIED（源码与提供方纯测证据）；现首次消费字节即启动 Stopwatch，long 余量 clamp 后转 int。新增跨 8192 buffer 纯测，native build-report 16:10:29Z 为各 40 PASS；审查者未独立运行 native，实际内核异步 I/O 仍 NOT_RUN |
| IR-M183-005 | 初审 desktop installedDesktop 仅选择 profile 根，非 E2E 仍连接固定服务；native client 未绑定父 desktop 安装路径。开发入口 elevated 时不能保证本地可写 profile 凭证入口 BLOCKED；安装路径下 E2E 变量又可选择测试 profile/debug 而仍连接真实服务。 | FIXED_VERIFIED（静态分支复核）；精确安装路径且非 E2E 才能连接 native，其他入口仅显式合成或 unavailable；未实际运行 elevated/安装入口，不扩展为可信启动链资格 |
| IR-M183-006 | 初审 GLOBAL 身份校验与 usage 查询仅按 scope、未限定固定 id；外部 REAL 预配若写错 GLOBAL id 可能通过 lim 检查，reserve 则另外插入固定 id 额度，投影可能读取旧行。 | FIXED_VERIFIED；精确固定主键、唯一 GLOBAL 行/合法计数，reserve 不再新建 GLOBAL；现成测试对错 ID/重复 GLOBAL 拒绝且未增加替代额度 |
| IR-M183-007 | 初审 engine 的 channel Set 对重复在途 binding.request_id 先 add，Broker 重放拒绝后 finally 又 delete 第一调用的 ownership；取消/断线跟踪可能遗漏原请求。 | FIXED_VERIFIED；engine 登记前拒绝重复 ID，实际合成 IPC 测试确认重复执行拒绝后仍可取消原执行，保留 UNKNOWN |
| IR-M183-008 | 初审 prepareImport 审计调用者原始 operation_id 未经 Guard；save-intent 在新 Key 模式注册前记录 provider_id/rotate_id，后续拒绝不能撤销先前明文记录。 | FIXED_VERIFIED；审计只记服务 ticket 与 operation hash，已知 Guard 和当前新 Key 的变体扫描均先于相应审计/intent；最终 4 项现成定向测试独立 PASS，见末节 |
| DEP-M183-001 | 初审资格必需项 import_ticket_single_use、confirmation_queue_disconnect 没有对应凭证导入 ticket/待确认队列生命周期；completion prepared/nonce 不能替代该导入合同。 | FIXED_VERIFIED（离线生命周期）；channel/operation/metadata/secret hash/epoch/expiry 绑定 ticket、单次消费、错 channel/改 metadata/重放拒绝与加密期间断线撤销由现成测试通过；实际受保护 IPC 资格仍 NOT_RUN |

实际服务对象/SCM 控制 ACL、operator 与服务内存/句柄/dump、desktop profile/Crashpad/WER 以及全部跨角色拒绝仍未执行。风险矩阵的 NOT_RUN/BLOCKED 项没有转为 OS PASS。

## 补充修复候选的独立现成测试

执行 24 项服务与 8 项 desktop 已提供测试，**32 PASS / 0 FAIL / 0 SKIP**。执行前后全 source 的 225 文件 SHA 一致，集合 SHA256 为 `2f9b702787b2631656bd988952832bb5b0a61c118604869117aceb15a04eb892`；[完整清单与运行记录](../evidence/independent-review/existing-tests-2026-11-08T16-18-17-301Z.json)、[原始输出](../evidence/independent-review/existing-tests-2026-11-08T16-18-17-301Z.stdout.txt)。该版增加实际合成 IPC 取消归属、导入 ticket、GLOBAL 错误身份与管理 request ID 的持久单次 claim。先前 25 项失败记录及 27 项通过记录均保留；它们各自对应自己的源码哈希。

这轮测试完成后只读审计发现 IR-M183-008；随后仅对小范围修复与新增现成测试复核，具体证据如下。所有生产状态保持 BLOCKED。

## 最终审计差异复核与结论

相对 32 项独立测试候选，最终只修改两份实现（`credential-service/broker.ts`、`model-runtime/vault.ts`）及一份现成服务测试，没有删除或夹带其他源码变化。225 文件最终集合 SHA256 为 `108e724d0b5796f472d5eb46a9088c556f04084c4bca0dad9bceb9a691d0090a`；最终执行前后全清单一致。[差异清单和原始 hashes](../evidence/independent-review/existing-tests-2026-11-08T16-22-51-562Z.json) 同时保留 32 项候选的比较基线。

`assertPendingSecretMetadataSafe` 为纯函数，复用 Vault 既有原文、JSON/URL/base64/base64url 变体及解码检查，在任何 SAVE_INTENT 前审查本次新 clear 对应的 metadata 和实际 intent，不依赖该秘密已加入 Guard。票据 prepare 另先用已知 Guard 检查输入，审计改用 operation_id_hash，消费记录同样经过 Guard。它不读取已存凭证，也不提供解密能力。

审查者独立执行已提供的以下四项定向测试，**4 PASS / 0 FAIL / 0 SKIP**：ticket 绑定/单次消费、加密期间断线不提交、已知秘密作 operation_id 不入审计、新 Key 出现在 provider/name/base64 notes 时 intent 也不持久化。[原始输出](../evidence/independent-review/existing-tests-2026-11-08T16-22-51-562Z.stdout.txt)。这不是在最终哈希上重跑全部 34 项；32 项完整执行与本次 4 项定向执行分别对应其记录，不合并伪称一次最终全套。

**本报告所列代码问题全部关闭，限定的离线工程范围复核完成；未见该范围内剩余代码阻断。生产资格仍 BLOCKED。** 高完整性桌面、真实服务身份/内存/句柄/缓存/转储、受保护安装与唯一账本、native pipe/CMS 外部信任、跨角色拒绝和可信真实录入均没有实际 OS PASS；QUALIFICATION_ONLY 也没有安装或启用。历史同 SID 解密 FAIL 不被覆盖，真实 Key、Provider 请求、Token 和费用均没有在本审查中发生。治理、发布及更广回归由主代理另附证，本报告不冒称独立重跑或预先通过。
