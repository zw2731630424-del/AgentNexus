# Q2 Daily 调用信任方案比较（独立安全研究）

日期：2026-11-09。范围：Q2 候选；M1.8.3 与 Q1 冻结目录只读。本文没有运行 UAC、账户/ACL 修改、安装、服务注册/启动、防火墙、AppContainer、Ubuntu 或真实 API/Key 操作。

## 决策

**本包生产 Daily 维持 BLOCKED。** 当前普通 medium Electron 与 Agent 可能处于同一 SID，尚无实现并部署、经攻击验证的 native Runtime 来源认证链。DailyGateway 的 exact-grant、持久通道与统一账本可以在纯合成环境验证协议，但不能成为 Windows 隔离证据。本包不提供 native Runtime 注册入口或 medium Daily listener，不能通过改配置开启 Daily。

现有 High 管理管道继续专用于有明确权限的管理调用，不降低 mandatory label、DACL 或 elevated/token 检查。Key 管理、短时导入和 Daily 模型调用是不同权限；Daily grant 不应获得 Key 导出、预算配置、grant 签发或任意 HTTP 代理能力。

威胁主体为同机普通 medium、同 SID 的恶意 Agent、CLI、插件或伪 Host；不假设对手具有管理员、SYSTEM、内核或驱动权限。仍必须抵抗同 SID 的注入、内存读取、句柄复制、伪造请求、可写代码/配置替换及崩溃后重放。若可信 Runtime 自己执行不可信工具/插件，受保护外壳也不能把这些代码变成可信授权者。

## 微软文档确认的边界

1. 进程对象的 DACL 控制 `OpenProcess` 请求的权限；`PROCESS_VM_READ`、`PROCESS_VM_WRITE`、`PROCESS_CREATE_THREAD`、`PROCESS_DUP_HANDLE`、`WRITE_DAC` 等是不同攻击面。微软还指出 `PROCESS_DUP_HANDLE` 可被用于取得目标伪句柄的最大访问权限。因此，检测 PID、文件路径或磁盘 hash，并未证明该活进程未受控制。[Process Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights)
2. 复制句柄仍引用同一内核对象，且继承属性可单独指定；长连接并不天然独占其能力。[DuplicateHandle](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-duplicatehandle) 创建子进程时需要明确、最小的句柄白名单；`PROC_THREAD_ATTRIBUTE_HANDLE_LIST` 与 `bInheritHandles` 的组合有具体约束。[UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)
3. SID 证明 Windows 主体，不区分同一用户下的两个普通 medium 程序。MIC 提供额外的完整性访问检查；默认 `NO_WRITE_UP` 不是“应用真实性”判断，也不是默认的禁止读取策略。[Mandatory Integrity Control](https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)
4. 普通 full-trust MSIX 程序仍具有普通桌面程序权限，包身份不等于 AppContainer。AppContainer/LPAC 是显式的 token、capability 与资源限制机制；不能用“有包名”替代检查实际 token 或证明同 SID medium 对手不能篡改可信端。[MSIX containerization overview](https://learn.microsoft.com/en-us/windows/msix/msix-containerization-overview)、[Launch an AppContainer](https://learn.microsoft.com/en-us/windows/win32/secauthz/implementing-an-appcontainer)
5. 管道 DACL 和 impersonation 可约束 Windows 用户身份；impersonation 失败必须拒绝。它们本身不辨认同一 SID 下的“真正 Host”。不要向普通客户端授予管道 `FILE_GENERIC_WRITE`：其包含可用于创建管道实例的权限，应使用必要的细分权限。[Named Pipe Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)、[ImpersonateNamedPipeClient](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-impersonatenamedpipeclient)

## 九项候选比较

下表中的“可行”是设计候选，不是本包已实现或通过 Windows 资格验证。`service grants` 是应用授权方案，须组合真实 Windows 边界。

| 方案 | 能提供的保证 | 同 SID 注入/句柄窃取与重放 | UX 与部署成本 | 对既有 Runtime 的影响 | Q2 判断 |
|---|---|---|---|---|---|
| 1. 短时 elevated 授权 helper | 把敏感 Key 导入或精确授权动作放入短寿命、有明确用户操作的可信端；可用单次 ticket、短 TTL、同通道 hash binding | helper 的完整性边界不能延伸到返回的普通 Host；把可复用 bearer ticket 放到 medium Host 后，注入或句柄窃取仍可代用。必须防重复提交、过期、取消、helper 崩溃和重开 | 每次敏感管理动作需要用户明确授权；应提供固定目的与范围，不能按任意 CLI 参数执行。代码签名、受保护安装与完整性验证仍需要部署 | Daily 若每次拉起 helper 则授权频繁；若只授权一次，后续必须有独立可信调用者和服务端范围约束 | 可保留为管理/导入候选，不能单独解决 Daily |
| 2. 受限、固定功能 Broker | Key 保留在 broker 内；仅暴露 prepare/execute/cancel/有限状态，不提供 decrypt/export/arbitrary URL | broker 若仍以普通相同 SID medium 运行，注入/读内存/复制 IPC 句柄问题仍在；服务端固定 policy 可减少被利用后的能力，但不能从客户端声称的 agent_id 建立来源 | 日常无需反复 UAC；需要最小 native adapter、固定协议、明确配额与错误 UX | 把 provider I/O、请求审核与账本从 Electron 移出；工具不能加载到 broker 中 | 必需的分层模式，来源认证未落实时只可合成 |
| 3. Package identity + AppContainer/LPAC | 包身份支持 OS 标识；真正 AppContainer token/capability 约束 Agent 可访问的进程、文件、网络等资源 | 包名/签名字符串可伪造，full-trust 包也不是隔离。让不可信 Agent 进入 AppContainer 有助限制其能力，但不能仅由此宣称外部普通 medium 对手无法操控可信 Host；仍须测方向、token、进程/线程权限和句柄泄漏 | 包签名/安装、capability 与 IPC ACL 设计、兼容矩阵，成本较高；不能偷偷绕过网络隔离 | Node/Electron、子进程工具、工作区与 loopback 访问均需适配，可能需要拆分受限 Agent 与可信 broker | 长期候选；本包未创建/部署/测试，不可声称已提供 |
| 4. 服务创建并保护最小 Host Runtime | 服务创建可信端、保留活进程/创建时间句柄；创建时设进程/线程/token/IPC 安全描述符、可信所有者、依赖与句柄白名单，避免“先开放再收紧”的窗口 | 必须禁止普通用户写 VM、创建线程、改线程上下文、复制句柄、改 DACL/owner、控制 token；阻止服务启动后替换代码/配置和已持有写权限句柄。静态 PID/path/hash 或 PPID 不够。该进程不得执行 Agent 任意代码 | 首次安装/更新需受管理部署；日常调用可无 UAC。服务侧 Runtime 注册、注销、更新和故障 UX 的复杂度高 | Electron 变成非权威界面；可信 Runtime 与不可信工具执行进程分离，Agent/task 映射在可信端建立 | 可继续设计与最小验证；native 链与攻击证据缺失，生产 BLOCKED |
| 5. Restricted token + process DACL | restricted token 减少被限制程序对外的权限；显式 DACL、owner、MIC、线程和 token 权限可补充保护 | restricted token 不等于防止别人注入该进程；同 SID owner 默认的隐式改 DACL 能力、既有句柄和线程权限不能漏检。`OWNER RIGHTS` 是可用控制点，但不是自动保护；不能只删一条 user ACE | 无需改变全部业务权限时成本较小，但正确构造/验证 owner 与完整对象图成本高 | 工具权限、桌面交互和子进程需要兼容；不得把受限 token 检测结果当可信应用身份证 | 纵深控制候选；单独不可接受 |
| 6. 服务端 exact scoped grants + 统一 ledger | 服务持有 authority；绑定 grant 类型、service instance、policy epoch、受信 channel/runtime、agent/task/project、key handle、最终请求/上下文 hash、endpoint/model、token/cost 上限、deadline/nonce；一次消费、持久防重放 | 可以拒绝复制 ticket 到别的连接、篡改请求或重复消费；若攻击者控制原 Runtime 或盗得同连接，它仍可在授予范围内代用。更不能允许调用者自造 native peer 事实或签发 grant | 管理授权与日常使用分离；拒绝理由和过期/取消状态应可理解，不能静默重新授权/重试 | Daily 与既有 High 请求须复用同一 provider/key/budget/UNKNOWN 语义，不能分出预算池或绕开 egress 审核 | 本包适合做合成协议候选；绝不替代 OS 身份链 |
| 7. 独立服务账户/服务 SID + 最小 ACL | SCM 以指定账户建立 token，service SID 可用于限定资源；比普通 user SID 提供不同的受控主体 | 服务 SID 必须来自 OS token 而非请求字段；服务控制对象、二进制/配置、私有管道、进程/token/线程和持久状态都要相同保护。普通同用户进程不能自己声称该 SID | 受管理安装、账户/恢复/更新/会话与权限设计；不得为了验证临时新增账户 | profile、DPAPI 范围、交互桌面、网络身份与工具访问需重新设计；共享 LocalService/NetworkService 账户仍需服务 SID 限定 | 可与方案 4 组合；本包无部署操作与实证 |
| 8. Job Objects + 创建时 mitigations | job 管理整组进程的生命周期和资源，创建时缓解策略降低特定利用面 | job 不是来者认证；CPU/memory/KILL_ON_JOB_CLOSE 不能阻止同 SID 注入、复制句柄或伪造请求。安全限制需逐进程设置，breakaway 也需控制 | 对用户干扰较小；需要真实版本、策略兼容与崩溃验证 | 可保留既有 runtime 资源管理；不能把已有 Job/limit PASS 转换为 Daily 身份 PASS | 适合作为补充，不是独立 Daily 边界 |
| 9. Windows protected service / PPL | Windows 对合格受保护服务强制代码完整性和访问限制 | 正确配置后可抵抗更强的进程注入；但普通签名 Electron/Node 服务不因此获得 PPL。微软公开的反恶意软件受保护服务流程要求 ELAM 等条件 | 驱动/证书/签名/加载策略成本及适用资格高，不适合作为本项目一句配置声明 | 通用脚本引擎、第三方 DLL 和动态插件不符合简单迁移假设 | 排除为当前实现；不能把方案 4 的“服务保护”写成 PPL 已实现 |

各方案的机制来源：方案 1/2 使用前述 MIC、进程权限与管道机制；方案 3 见前述 MSIX/AppContainer 文档；方案 4 的进程创建权限和句柄列表见前述 `Process Security`、`UpdateProcThreadAttribute` 文档；方案 5 见 [CreateRestrictedToken](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-createrestrictedtoken)、[Restricted Tokens](https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens)、[Owner Rights](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-special-identities-groups#owner-rights)；方案 7 见 [Service User Accounts](https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts)、[SERVICE_SID_INFO](https://learn.microsoft.com/en-us/windows/win32/api/winsvc/ns-winsvc-service_sid_info)、[Service Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/services/service-security-and-access-rights)；方案 8 见 [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)；方案 9 见 [Protecting anti-malware services](https://learn.microsoft.com/en-us/windows/win32/services/protecting-anti-malware-services-). 方案 6 的绑定字段及组合判断是本项目威胁模型的工程推论，不是微软保证。

## 推荐的最小方向与不能省略的证明

推荐继续研究 **方案 2 + 4/7 + 6**：最小可信 Runtime 和 Credential Service 共同掌握来源、范围与账本；普通 Electron 只呈现状态、提交非权威意图；不可信工具/插件在别的低权限执行环境。方案 3/5/8 可以补充约束，不能回填缺少的 native 来源证明。该组合仍是候选设计，本次交付只运行合成协议部分。

生产启用前至少需要这些可复核证据：

1. **可信启动闭包。** 服务从受保护安装位置创建固定 Runtime；签名/hash 与可写依赖、环境变量、cwd、Node/Electron 调试/require/loader 参数、DLL、更新与回滚全部覆盖。进程/线程/token/相关对象在第一次运行前已保护，不能先用普通用户创建再靠事后检查洗白。源码中的对象属性、TypeScript 类型、WeakSet/工厂或 JSON 布尔值不是 native 证明。
2. **来源和连接的不可转借性。** Runtime 注册由服务的 native adapter 完成；绑定活进程句柄、创建时间、服务启动 instance、session/logon/token 事实和具体持久连接，不能接收调用者可自选 `runtime_id`/`channel_id`。逐连接、逐请求拒绝异常来源。必须实际证明进程、线程、token、控制台/调试口及 IPC 句柄不能被普通同 SID 对手修改、读取或复制，且没有继承/传递泄漏。`PID + 文件 hash` 不证明“当前执行代码没有注入”；PPID 也不代表唯一创建来源。
3. **授权者与数据来源。** service grants 只能由受信授权者签发；runtime 不能自封 PUBLIC、重标 Agent 身份、扩 task 范围、改变 agent/task 注册或从用户可写授权文件恢复 authority。自动调用仍要能解释哪些最终字节已审核；原始规则、内部路径、注入的 tool/system/developer/message 字段不能借 Daily 请求进入外发上下文。
4. **统一预算和原子消费。** High 管理、既有 broker 与 Daily 复用同一服务端账本/Key scope。grant 消费、operation/nonce claim、reservation 和“已发送/未知”的持久状态要有一致、不可回滚的转换。服务 crash/restart、host crash、更换 channel/runtime、policy/key 更新后不能重新消费旧 grant。发送后超时/取消/丢失 usage 保留 UNKNOWN/冻结余额并禁止自动重试，不能拿“取消”当 provider 一定未收费。
5. **两类 ticket 分离。** import ticket 是极短、单次、channel/hash 绑定的管理授权；Daily grant 只允许具体请求，不可读写 Key、修改预算或签发其他 grant。取消、过期、崩溃、重新启动 helper 均不能复活 ticket。不得从 CLI、URL/deep link、环境、日志或剪贴板传递 Key 或持久 bearer 权能。
6. **公开限制。** 确认框和输入界面的显式用户意图仍需可信来源；普通 medium UI 的内容不可冒充管理员审查证明。mask、清空输入框或 `Buffer.fill(0)` 只证明特定缓冲区行为；不能证明 JS/CLR immutable string、clipboard history、crash dump 或同用户观察者没有副本。相关测试必须使用合成 canary，实测前不能写“内存无明文”。

## 本包可宣称和不可宣称

- 可以宣称：源码复审、纯函数/合成协议攻击用例及其具体观察结果；无生产 Daily adapter/入口时失败关闭；不改原 High 管道。
- 不可宣称：Windows 注入/句柄窃取/ACL/隔离攻击已通过，受保护 Runtime 已部署，Daily 已生产可用，真实 Key 安全或真实模型调用已验证。
- 资格记录为 `tests/windows-qualification.json`；所有真实 Windows 攻击为 `NOT_RUN` 或资格 `BLOCKED`，详见 `tests/windows-attack-tests.json` 和 `reports/windows-attack-tests.md`。后续独立代码复审须列出实际 reviewed-file hashes 与确切测试命令，不能借本方案比较补足证据。
