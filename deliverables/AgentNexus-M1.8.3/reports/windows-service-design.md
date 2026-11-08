# M1.8.3 Windows 凭据服务边界

状态：**代码已实现并可编译；真实 Windows 服务资格 BLOCKED**。本轮只编写代码、执行纯模拟和只读预检。没有安装或启动服务、创建账户、修改 ACL、导入真实 Key、连接真实 named pipe 或请求供应商 API。

## 组件与固定路径

| 组件 | 固定生产位置 / 身份 |
|---|---|
| SCM 服务 | `AgentNexusCredential`，独立 `WIN32_OWN_PROCESS` |
| 服务账户 | `NT SERVICE\AgentNexusCredential`；TokenUser 必须等于 Windows 实际解析的服务 SID；Session 0，非 AppContainer |
| 服务 supervisor / 只读证明 helper | `C:\Program Files\AgentNexus\AgentNexusCredential.exe` |
| 桌面 pipe 桥 | `C:\Program Files\AgentNexus\pipe-client.exe --stdio` |
| Node | `C:\Program Files\AgentNexus\node.exe` |
| engine | `C:\Program Files\AgentNexus\app\dist\src\agentnexus\credential-service\engine.js` |
| 应用完整清单 | `C:\Program Files\AgentNexus\app-manifest.json` |
| 服务固定配置 | `C:\ProgramData\AgentNexusCredential\service-config.json` |
| 外部资格与签名 | 同目录 `qualification.json`、`qualification.p7s` |
| 正式服务状态 / 临时数据 | 同目录 `engine\`、`temp\` |
| 资格专用合成状态 | 同目录 `qualification\`，与正式 engine 账本独立 |
| 可选具体请求审阅 | 同目录 `request-consents.json`、`request-consents.p7s` |
| 外部 pipe | `\\.\pipe\AgentNexus.Credential.v1` |

服务不提供安装、控制台运行、任意配置路径、任意 engine 路径、URL 或 LIVE 切换参数。无参数入口必须来自 SCM。`--self-test` 仅运行内存测试；`--attest-engine` 与 `--attest-consents` 只读固定受保护资料，且要求真实服务身份和 `helper -> 固定 Node -> 当前 SCM 服务` 父链。helper 成功信息不会授予调用者服务身份。

## 启动与文件保护

`Common.cs` 在启动 child / 创建 pipe 前验证实际服务注册、账户、进程与部署：

1. 安装根和配置根必须存在、根 DACL 显式保护；所有祖先及应用树不得为 reparse point。配置/资格/签名/完整应用文件不允许普通用户写入，拒绝 null DACL、非受信所有者和宽写 ACE；祖先允许创建新子目录，但不允许非受信主体删除或替换受保护根。
2. Program Files、配置根及顶层资格资料只允许 SYSTEM、Administrators、TrustedInstaller 修改。服务 SID 只能写 `engine\`、`qualification\` 与 `temp\` 状态子树，不能改自身配置、签发者 pin、签名或程序。选中模式的状态子树和 temp 启动前递归检查 owner/reparse/DACL；其中 ReadData/ListDirectory、ReadExtendedAttributes、ReadAttributes、ReadPermissions、GENERIC_READ/ALL 也只允许 SYSTEM、Administrators、TrustedInstaller 和服务 SID。Program Files 代码可普通读取；有效 DACL 和真实文件句柄读取拒绝仍须 OS 实测。
3. 固定四个二进制/主入口和 `app-manifest.json` 的 SHA-256 必须匹配配置；清单必须精确覆盖 `app\` 下所有文件并逐一校验 SHA-256。清单格式为 `{"schema":"agentnexus.application-manifest.v1","files":[{"path":"app/...","sha256":"64位小写hex"}]}`，路径不允许跳转、ADS 或任意根。
4. 读取的配置、签名、资格、证据和应用文件以 `FileShare.Read` 保持打开，拒绝运行期间写入/替换。目录的受信 ACL 是路径稳定性的一部分；本轮未进行真实 OS 竞争攻击验证。
5. SCM 必须为独立服务、精确带引号的固定无参服务 exe、精确虚拟账户和 unrestricted service SID 模式。实际 TokenUser 不能是 LocalSystem、交互用户或仅携带服务 SID 组的其他账户。

`service-config.template.json` 不能直接投产：operator SID、hash、pin 都为 BLOCKED 占位；两个真实操作开关默认 false。构建脚本不复制模板到系统目录。

## Node 监督与私有协议

`CredentialService.cs` 使用明确 `lpApplicationName`、固定带引号参数和 `CREATE_SUSPENDED` 建立 Node，再把 child 加入匿名 Job Object 后恢复执行。Job 设置 `KILL_ON_JOB_CLOSE`，活动进程上限 6，容纳 Node、最多四个连接相关 helper 和一个证明 helper；没有 breakaway 开关。Job 句柄不继承。父进程退出或关闭 Job 将终止其进程树，这一语义来自 [Microsoft Job Objects 文档](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)。实际崩溃/嵌套 Job 行为仍待 Windows 资格复验。

仅通过 `STARTUPINFOEX` 的 handle list 继承 child stdin、stdout、stderr 三个端点；父端、Job、配置和其他句柄不继承。API 的明确继承列表要求见 [UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)。child stderr 只被读出清零并丢弃，不写文件、日志、UI、事件或 RPC。

child 环境只含固定 `SystemRoot`、`WINDIR`、受保护 `TEMP/TMP`、`NODE_ENV=production`、`AGENTNEXUS_NATIVE_BOUNDARY=1`，不继承 PATH、NODE_OPTIONS、Key、调用者变量、代理或供应商 URL。环境标记不能作为授权凭证；Node 必须执行固定只读 attestation helper。生产启动不传 synthetic 参数。

外部客户端发送 UTF-8 LF NDJSON：

```json
{"id":"request-1","method":"health.read","params":{}}
```

仅接受 `id/method/params` 三个顶层字段；客户端不能提交 peer/channel，不能自行调用保留方法 `session.disconnect` 或 `native.bootstrap`。native 在读取后取得实际 impersonation token，构造：

```json
{"channel":"随机32位hex","peer":{"sid":"来自真实token","elevated":true,"integrity":"high","process_id":123,"start_id":"创建FILETIME的16位hex","session_id":1,"service_sid":"实际服务SID","authenticated":true},"request":{"id":"request-1","method":"health.read","params":{}}}
```

engine 只能输出：

```json
{"channel":"相同channel","response":{"id":"request-1","result":{}}}
```

共享 child stdout 按活动 channel 路由，仅转发 `response`；未知或已断开 channel 被丢弃，绝不广播或回退到其他会话。写 child 和写客户端均有锁。连接断开后 native 使用同一 channel/已认证 peer 发送 `session.disconnect`，清理会话由 Node 执行；退出/崩溃则整个 Job 终止，不能恢复之前的临时批准。

## 外部 pipe 双向身份

pipe 创建时使用显式 protected DACL：SYSTEM、BUILTIN Administrators、实际服务 SID；没有 Everyone、Authenticated Users、普通 Users 或整个 operator SID 的泛写 ACE，并附 High mandatory label。使用 `PIPE_REJECT_REMOTE_CLIENTS`；四个初始实例中第一个带 `FILE_FLAG_FIRST_PIPE_INSTANCE`。创建语义及缺省 DACL 的广泛读取行为见 [CreateNamedPipeW](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-createnamedpipew)。四个句柄在服务存活期间反复 Disconnect/Connect，发生不可恢复句柄故障则停止 broker，不在失去名称所有权后继续重建。

每条消息后 native 检查 `ImpersonateNamedPipeClient` 是否成功，查询当前线程的真实 token，并在 finally 中 `RevertToSelf`；失败不处理请求。Windows 将其绑定到最后读入消息的安全上下文，见 [ImpersonateNamedPipeClient](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-impersonatenamedpipeclient)。授权条件同时为：

- TokenUser 是配置中唯一 operator SID，elevated=true，完整性 RID 至少 High，非 AppContainer。
- pipe 的真实 client PID/session 与该进程主 token 相符；固定 `pipe-client.exe` 镜像路径、已锁定且 hash 匹配的安装文件、进程创建时间/存活状态同时核验。会话内 PID/start/session/SID 不能变化。
- 路径/hash/PID 是 token 授权之外的补充条件，不能代替真实 token。普通同一 operator SID 的 Medium/Low 进程必须拒绝。

`pipe-client.exe --stdio` 使用固定本地 pipe 和 Identification impersonation 级别。在提交请求前及转发每条响应前核验真实 server PID、SCM 注册 PID、TokenUser 服务 SID、Session 0、固定服务镜像和创建时间，防止仅凭同名 pipe 接收假服务响应。stdio 只传原 RPC JSON，不传 native peer。

所有协议行上限 1 MiB；并发连接 4；客户端连接 5 秒、外部空闲 30 秒、已开始帧 15 秒、写入 10 秒。超限、无效 UTF-8、空行、CRLF、截断帧、非法 JSON、身份变化均关闭该连接；child stdout 协议损坏或 child 消失则停止 broker。外部连接过期会触发 disconnect，UI/gateway 必须重建会话。对 child 匿名管道的 I/O 超时先关闭 Job，避免同步管道中的僵死 child 阻塞清理。真正内核 I/O/取消时序仍是待复验项。

## 签名资格和请求审阅

资格不是配置布尔值。native 要求外部签发的 detached CMS 签名；配置 pin 是签名证书完整 DER 的 SHA-256，签名 digest 仅接受 SHA-256/384/512，检查证书有效期与单一 pinned signer。没有签名工具、测试证书或自动签发 PASS 的入口。

签名内容同时绑定 MachineGuid 的 SHA-256、实际服务 SID、policy epoch、固定程序/完整 app manifest hash、有效期（至多 7 天）、真实操作开关及批准引用。签名 `status` 只有以下两种运行状态；没有 CLI、环境变量或单独 config 布尔值可以选择模式：

| 签名 status | 条件 | 实际运行含义 |
|---|---|---|
| `QUALIFICATION_ONLY` | `decision` 只能 NOT_RUN/BLOCKED；完整 11 项 tests 只能 NOT_RUN/BLOCKED；独立 `qualification_test_approval_ref=APPROVED-...` 必须同时匹配固定配置；real_import/live 均严格 false，对应真实批准引用均为空 | 批准后才能用独立服务 SID 启动固定 Node 的资格分支；只用 `qualification\` 下合成值/fixture，强制 synthetic-test- 前缀，禁止真实 Key/HTTPS；attestation `qualified=false` |
| `QUALIFIED` | `decision=PASS`，11 项真实 OS 验证逐项 PASS，独立证据文件 SHA-256 匹配、外部签名及所有固定绑定通过 | 才可被识别为 Windows 边界资格通过；真实导入/LIVE 仍须各自独立批准，不能自动打开 |

资格专用模式解决首次真实测试之前尚无该版本 OS 证据的问题：管理员在独立审批后部署真实受保护路径/服务 SID，由外部签发者仅签“允许收集合成值 OS 证据”的计划；此时仍不能宣称资格 PASS。Node 按 native 已验证签名模式选择固定 qualification 根和完全 SIMULATED fixture；不读取/自动新建正式 engine 账本。native 还独立拒绝该模式非 synthetic-test- 前缀的 credential.save 输入，且不导入任何出站 consent。收集到的实际 OS 观察由外部验证与审阅后，才可停服务、更新管理员受保护的正式资格/配置、重新签名并重启；服务不在存活期间自动晋级。

当前模板 `status=BLOCKED`、批准引用为空、hash/pin/主机占位，两个开关 false；没有签名部署计划，故本轮连资格专用真实启动也未授权、未执行。代码验证签名来源与固定绑定，不能代替实际观察；synthetic fixture 不得自签为 OS PASS。native 对签名到期设置停止计时器，并在每条请求前复验时间，到期关闭 Job/pipe，不能靠一直运行延长批准。

`real_import_enabled/live_enabled` 及各自 `approval_ref` 必须逐字段被签名资格绑定并匹配固定配置。true 还需明确 `APPROVED-...` 引用；LIVE 引用必须独立于真实导入引用。边界资格通过本身不等于用户批准任何具体数据出站。模板两项均 false，引用为空。

`--attest-engine` 返回安全摘要：`mode/qualified/service_sid/evidence_sha256/machine_id/policy_epoch/expires_at_utc` 和被签名绑定的批准引用/开关；QUALIFICATION_ONLY 的 evidence_sha256 是签名测试计划的 hash，不是 OS 资格证据通过。`--attest-consents` 先重复全部边界/真实 token/父链验证；资格专用模式强制返回空 consents。正式资格模式才读取固定 request-consents 文件和同 pin CMS 签名，文件均不存在时返回空 consents；只缺一个、伪签名、主机/SID/epoch 不符、过期、无外部用户审阅引用则拒绝。每条必须为 PUBLIC/SYNTHETIC，携带确切 `input/decisions/classification/approval_ref`，最多 64 条、整体最多 1 MiB；成功摘要保留签名有效期供 Node 在实际使用 grant 时再次限制。Node 还必须逐次核对 exact body/context/subject、单次使用、来源审阅和是否已撤回。服务没有可由普通 RPC 调用的通用批准入口。

## 本轮验证与仍未证明的内容

构建：系统 .NET Framework `csc.exe` 4.8.9221.0，x64，优化，warning 视为错误，无 NuGet。构建脚本逐进程捕获 stdout/stderr，编译或纯测非零退出/非空 stderr 均拒绝成功报告。两个 exe 的纯自测各 40 项，覆盖相同 SID 的 Medium/Low/非 elevated/AppContainer 拒绝、peer 注入/保留方法/坏 RPC、NDJSON 分帧、遗留 buffer 跨异步读取、UTF-8、截断、1 MiB 正边界与超限，以及签名后模式策略的纯状态检查、Q_ONLY 拒真实开关/虚假 PASS、qualified=false 证明摘要、批准到期拒绝、合成 Key 前缀、敏感读取权限位。自测中的模式/ref 仅为内存 fixture，不生成签名或任何真实批准。额外六项未部署入口探测（含伪 `--qualification-only` CLI 开关）均 exit 78、stdout 为空。最终精确 hash/时间以 `.workflow-kit/runtime/AgentNexus-M1.8.3/native/build-report.json` 为准；负向入口和只读预检分别在同目录 `entry-negative-report.json`、`preflight-report.json`。

只读预检观察到：两个固定系统根均不存在，服务未安装，虚拟服务 SID 无法解析。没有尝试补齐这些条件。以下全部为 **BLOCKED / 未完成真实 OS 验证**：

| 资格 ID | 必须取得的实际证据 |
|---|---|
| service_account_isolation | SCM/Node/DPAPI helper 的真实 TokenUser、service SID、Session 0、子进程继承 |
| protected_install_acl | 根/祖先/全部载入文件/配置/资格的 owner、DACL、reparse 与替换拒绝；敏感状态树对普通用户实际读/写句柄拒绝 |
| pipe_dacl_remote_reject | 实际 pipe DACL、High label、远端拒绝、first-instance 抢占失败 |
| medium_integrity_rejection | 普通同 operator SID 的 Medium/Low 进程真实连接/请求被拒 |
| server_impersonation_rejection | 假同名 server、错误 SID/PID/创建时间/镜像实际被客户端拒绝 |
| same_sid_dpapi_denial | 交互用户对服务身份 CurrentUser DPAPI 数据无法解密；真实 Key 需另批 |
| import_ticket_single_use | 真实受保护 IPC 中 ticket 精确绑定、过期、单次消费和重放拒绝 |
| confirmation_queue_disconnect | 断线/重连撤销待确认，其他 channel/session 不能领取 |
| crash_recovery_no_replay | 崩溃关闭 Job、无旧批准恢复、重启/读写取消和嵌套 Job 行为 |
| audit_no_plaintext | 服务、child、宿主和异常路径的持久日志无真实 Key/未审正文 |
| negative_host_or_binary | 篡改 hash/签名/主机/epoch/权限均先于 child/pipe 拒启 |

编译、纯 token fixture、源代码中的安全条件和只读文件存在性检查都不能把这些项目标为 PASS。首次安装必须单独审批并取得受固定主机/版本绑定的 signed QUALIFICATION_ONLY 计划；缺计划/签名时拒启。测试计划不等于正式资格，交付没有未签名的临时绕过模式。

威胁边界：防御普通同 operator SID 的 Medium/Low 进程；高完整性桌面管理入口有意要求已提升管理员。管理员、SYSTEM、内核或服务进程本身失陷不在本边界防御范围，不能以进程路径/hash 宣称能抵御它们。
