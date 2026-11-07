# 双平台安全设计 — AgentNexus v0.4 M0.1

取证日：2026-11-07，Asia/Shanghai。状态：**可评审设计；OS 隔离与管理认证未实现，部署准入 BLOCKED**。本文补充 [M0 安全审查](../../AgentNexus-v0.4-M0/research/security_review.md)，不修改 M0 原件；协议以 [M0.1 internal_protocols](internal_protocols.md)、[Audit Trail](audit_trail_design.md) 和 [ADR 008](adr/008-m1-admission.md) 为准。源码、官方文档、只读环境探测和产品实测分别登记在 [platform_sources.json](../research/platform_sources.json)。本轮没有更改 OS 账号、ACL、服务、AppArmor、网络或防火墙，没有启动外部 Harness、模型或科研程序。

## 1. 决策与准入边界

1. 沿用原生 TypeScript/Node 24.15.0 Host；M1 使用可擦除 TS 和 Node 内建库，零新增 npm 依赖。必须使用 OS 原语时才引入小型、单独审查的 native helper，不把另一个完整 Harness 作为安全内核。
2. 管理员、可信 Broker、执行 worker 必须具有可验证的 OS 身份与资源权限边界。进程拆分、JS 对象品牌、管理员字符串、localhost、项目文件或一次确认弹窗均不是 OS 管理认证。
3. 任意代码执行须同时具备身份、文件读写、网络、进程树及资源限额的已验证能力。**任一必需能力为 UNSUPPORTED / NOT_RUN、证据过期或预检失败，PEP 必须拒绝任意 Shell。Policy DISABLED、人类批准或 Harness 自报 sandboxed 都不能替代此准入。**
4. 首个待验证执行配置只做离线工作区；代理联网后置。Windows 的组合候选是独立 worker 身份、受限 token、AppContainer、ACL 与 Job；Ubuntu 是独立 uid/gid、namespace、no_new_privs、seccomp、cgroup v2 与 enforce AppArmor。组合仍须测试，不能凭原语名称授予资格。

这里的“任意 Shell”也包括解释器 `-e/-c`、动态脚本、编译产物、package scripts、项目 hooks、MCP/LSP 服务及外部 Harness 自带执行器。只有固定可信程序处理源文本、且不能加载项目插件/求值用户代码的诊断路径，才可单独验收。Node 官方明确不把 Permission Model 当恶意代码隔离边界；它可辅助防误操作，不能提高本平台能力等级。[Node 24.15 Permissions](https://nodejs.org/download/release/v24.15.0/docs/api/permissions.html)

## 2. 威胁模型与最小安全域

攻击者可完全控制模型输出、网页、仓库及 AGENTS 文本、插件、依赖脚本、工具结果；也按 worker 已获得任意本机代码执行考虑。保护对象为控制配置/管理审计、Provider 凭证、可信可执行文件、其他项目、原始档案、许可/claim、候选树与其他进程。模型和仓库内容只形成请求，不能成为身份或授权来源。机器管理员、内核及可信安装包已被控制不在本沙箱可绝对抵抗的范围内。

| 安全域 | 身份与可达资源 | 禁止交叉 |
|---|---|---|
| 管理操作员 | 单独登记的管理员 OS 身份，经可信管理入口确认配置/challenge | worker/插件不能持有其凭据、token、socket/pipe 句柄或控制模块 |
| 可信 Host/Broker | 专用服务身份；持控制库、Audit/Context/Artifact 写入口、许可与资源句柄 | 不加载项目插件，不从仓库解析并执行安装器，不把根目录或管理句柄传给 worker |
| 执行 worker / 外部 Harness | 独立低权限身份、任务工作区/临时区、有限 IPC；输出流进 Artifact Store | 不直接读 Key、写控制库/原档案/可信二进制，不访问管理入口 |
| Studio renderer | 受限 UI 域；仅呈现授权视图与操作请求 | 不因登录 UI 即取得服务数据目录或管理 API 能力 |

这些是安全域而非强制四个常驻服务。M1 暂不部署账号/服务体系；库内可信控制对象只用于模块边界，不能对模型暴露，也不能被描述为 OS 身份认证。原始档案与控制数据至少由 worker 不能写的 owner 持有；摘要/检索仅写派生对象。三模式维持 M0 语义：应用 PDP 可按范围降级，OS、凭证、原始档案、单次 claim 和管理审计的 owner 不随 policy.mode 改变。

## 3. 统一 Sandbox 合同与能力分级

沿用主协议的 `SandboxCapabilities {profile_revision, platform, admin_identity_verified, filesystem, network, process_tree, read_only, verified_test_refs}` 与 `Sandbox.prepare / execute / cancel / reconcile`。本文解释语义，不另冻结 M1 Type/API。各能力必须给 SUPPORTED / UNSUPPORTED / NOT_RUN 及证据引用，不能汇总成一个 `sandbox=true`。OS 版本、helper 二进制哈希、配置/ACL 或 AppArmor profile 哈希、工具集合变化后，相关旧证据不再适用；只读发现 API/可执行文件存在不能把 NOT_RUN 改成 SUPPORTED。

| 便于展示的配置名 | 必须证明的能力 | 可发放范围 |
|---|---|---|
| BROKER_ONLY | 精确注册的可信处理器、输入/输出合同、许可和审计 | 仅纯计算、授权档案读取、合成对象等单独验收能力；不得运行不可信代码 |
| VERIFIED_OFFLINE | 独立执行身份、指定 FS 读/写范围、只读快照、无主机网络、全树清退、资源限额 | 指定快照/副本中的离线执行，仍逐次经过 Tool/PEP |
| VERIFIED_PROXY | 上述全部，加唯一受控出口、目标/协议限制、不可直连和代理故障封锁 | 指定代理的有限联网执行；不含任意网络或主机管理 |

配置名不是策略 L0—L3，也不是安全强弱的万能排序。只读和写工作区须各自验证；Windows PASS 不赋予 Ubuntu PASS，一个 Harness 的 PASS 不赋予另一个 Harness PASS。当前两平台都只具有设计，M1 可交付的 BROKER_ONLY 也需按实际处理器测试，不能把本表当能力已经发放。

`prepare` 必须固定最终 `CommandSpec`（exe 引用、argv 数组、cwd 资源、脚本/输入 Ref、dialect、环境 profile、工作区版本）、执行身份、资源句柄身份、网络实际 profile、限额和待消费许可。任何参数或执行镜像改变都生成新意图并重新检查。真实 OS 句柄仅在可信 helper 内保存，Agent 只见有作用域的不透明引用。`execute` 在独立 owner 验证、epoch/撤销检查、许可原子消费和 durable intent 屏障后才允许载入用户代码；启动失败不得退回 `child_process.spawn` 或普通 shell。

`cancel` 只是请求。回执必须分开 direct_process_exited、tree_exited、仍有进程/句柄、输出 durable offset 和资源实际状态。`reconcile` 绑定启动身份与进程句柄/pidfd、Job/cgroup 身份，拒绝只凭 PID 判断；旧树未证退出前保留 writer claim，不能因租约过期开始第二写者。**数据库 fencing token 无法阻止已经取得普通文件句柄的 Shell 继续写入**；因此树清退与工作区 OS 权限是必需控制。ACL 撤销也不能被当作已经打开句柄失效的证明。结果未知进入 INDETERMINATE，恢复只核对，不重放命令。[Audit 屏障及 Task 只读重建](audit_trail_design.md)

## 4. Windows 设计

### 4.1 独立管理身份、服务身份和 ACL

部署时由单独授权的 bootstrap 登记管理操作员 SID/管理组和专用 Broker 服务身份，准备非管理员 worker 身份；不在每次任务启动时临时把用户加入 Administrators。管理者与 worker 的 SID/登录会话必须不同。Broker 仅保留创建受限 worker 所必需的权限；Host 不为便利长期以完整管理员 token 运行。具体账号命名、登录类型与服务安装另行部署评审，本轮未创建。

管理命名管道与 Agent 管道分开，显式 DACL、限制本机连接并防抢占；管理 DACL 仅允许登记管理身份和服务，不能使用 Everyone/Anonymous 默认读取权限。服务读取请求后检查 `ImpersonateNamedPipeClient` 返回值、查询实际 token/登录 SID/允许的管理身份与必要提升状态，失败直接拒绝，随后严格 RevertToSelf。PID/可执行路径只能辅助核对，不能替代 token 身份。受限 worker 即使提交 `admin:true` 或管理对象序列化副本也必须在 OS/管理认证层拒绝。[Named Pipe Security](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)、[ImpersonateNamedPipeClient](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-impersonatenamedpipeclient)、[GetTokenInformation](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-gettokeninformation)

| 对象 | owner / 允许项 | worker 必须被拒绝 |
|---|---|---|
| 可信二进制、helper、profile、控制配置 | 安装/管理 owner 写，Broker 读/执行 | 替换 exe/DLL、写 DACL、改 owner、删除或在父目录替换 |
| 控制/管理审计/Archive 目录 | 服务 owner 持有，管理导出走专门入口 | 直接访问 SQLite 主库/WAL/SHM、覆盖段/manifest、改索引或拿旧副本替换 |
| 任务工作区和私有 temp | Broker 准备副本，按 profile 给当前 worker 精确范围 | 其他任务、原仓库、用户 home、共享 temp、管理命名对象 |
| Reviewer 候选快照 | Broker owner，只授读/执行，独立审查身份 | 写内容/ADS/ACL、删除/rename/替换、经父目录或硬链接改候选 |

ACL 必须检查文件与父目录的 delete-child/继承/owner 权限，不能只检查文件的 Write 位；对象不得使用 NULL DACL。`SetSecurityInfo` 可针对已打开句柄配置安全描述符，API 成功后仍要重新读回并进行异身份负向验证。只支持已经验证 ACL/文件身份语义的本机文件系统；未知文件系统、远程共享或权限语义不满足时阻断，不能从盘符推断 NTFS。[DACL AccessCheck](https://learn.microsoft.com/en-us/windows/win32/secauthz/how-dacls-control-access-to-an-object)、[SetSecurityInfo](https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-setsecurityinfo)

### 4.2 受限 token、AppContainer 和安全启动

受限 token 删除非必要 privilege、将高权 SID 设 deny-only，并加入任务限制 SID；必须读回 token 的 user/groups/privileges/restrictions/integrity/AppContainer 状态。不能设置 `SANDBOX_INERT`；`WRITE_RESTRICTED` 仅让限制 SID 参与写访问检查，**不建立项目读取白名单，也不提供网络隔离**。低 integrity 同样不能代替读取边界。Microsoft 还提示受限应用不应运行在默认桌面；CLI 候选使用非交互桌面/会话，不能向可信 UI 发送窗口消息。[CreateRestrictedToken](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-createrestrictedtoken)

任意执行的首个候选增加 AppContainer：bootstrap 维护明确 profile/SID；使用 `PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES` 创建进程，只为工作区、工具链和必要 IPC 授权，不给网络 capability 或开发 loopback exemption。AppContainer 可用于 unpackaged Win32 程序，但 CLI、Git、Node、PowerShell、编译器和插件的兼容性须逐项实测。若某工具要求 broad filesystem、默认桌面或解除容器，则该工具保持 BLOCKED；不悄悄换回普通受限 token。[AppContainer for legacy apps](https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-for-legacy-applications-)、[AppContainer isolation](https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation)

native helper 使用 `CreateProcessAsUserW` 的明确 executable 路径、独立环境白名单和 `STARTUPINFOEX`；stdin/stdout/stderr 与极少数授权 IPC 用 HANDLE_LIST 精确继承，不继承 token、Job、管理 pipe、数据库或父进程句柄。环境不复制 Provider Key、SSH/代理/credential helper 配置、NODE_OPTIONS、注入型 DLL/模块路径。可优先在创建时使用 JOB_LIST；若采用 CREATE_SUSPENDED 后分配 Job，必须分配与全部预检成功后才 ResumeThread，任一步失败销毁仍暂停的进程。禁止未指定 exe 时依靠 cwd/PATH 查找可信程序。[CreateProcessAsUserW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessasuserw)、[UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)

### 4.3 Job 与真正的进程树

每次执行单独 Job，设 KILL_ON_JOB_CLOSE、活动进程/内存/CPU 限额，禁止 BREAKAWAY_OK 与 SILENT_BREAKAWAY_OK。Job 句柄仅由可信监督器持有，worker 不得复制它。普通 CreateProcess 子进程默认随 Job；**Microsoft 明确列出 Win32_Process.Create 的子进程不随 Job**，因此 WMI/COM、计划任务、服务、后台 broker、调试/跨进程句柄也是强制绕过面。用 worker/AppContainer 权限阻止这些通道，不能只靠父 PID 遍历或 `taskkill /T`。

Job 的 IO completion 通知并非全部保证送达。取消后调用 TerminateJobObject/关闭唯一 Job 句柄，再查询 active process count/进程列表、等待真实进程句柄、核对任务 sentinel 与 writer；禁止仅凭“收到退出事件”发 tree_exited=true。嵌套 Job 兼容失败是启动失败，不能放开 breakaway。服务代启动的进程若仍能存活，本 profile 的 process_tree 测试 FAIL，执行准入撤销。[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)、[QueryInformationJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-queryinformationjobobject)

### 4.4 文件与网络

Broker 文件工具按打开对象授权：`CreateFileW` 最小访问、显式处理 reparse，保留句柄；用 `GetFinalPathNameByHandleW`、`GetFileInformationByHandleEx(FileIdInfo/FileAttributeTagInfo/FileStandardInfo)` 核对真实对象。只对最终组件加 OPEN_REPARSE_POINT 不能证明中间路径安全；创建/rename/删除尤其要保护父目录与最终命名的竞争窗口。Windows 句柄相对路径解析/安全 rename 的具体 helper 尚未验证，因此任意路径写接口保持 BLOCKED，不能回退 `realpath → 普通 open`。

工作区从干净复制快照建立，排除越界 hardlink/reparse、共享 Git hooks/config/objects、ADS 和特殊设备；首版拒绝 UNC、SMB、WebDAV、设备路径、未授权卷和跨任务链接。源数据直接共享链接不是隔离；检测链接数量也不是通用证明。任意 Shell 的文件边界靠整个 OS profile，不能依赖它自愿调用 Broker 文件工具。[CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)、[GetFinalPathNameByHandleW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfinalpathnamebyhandlew)、[GetFileInformationByHandleEx](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getfileinformationbyhandleex)

OFFLINE 要验证 IPv4/IPv6、TCP/UDP/DNS、LAN/loopback、入站监听、SMB/系统服务代发和所有子进程；代理环境变量仅是客户端习惯。后置 PROXY 候选由独立网络 owner 使用 WFP 在适用 ALE 层对 worker/package 身份落实 deny-by-default，仅开唯一代理，并验证规则权重、全部协议与 BFE/代理故障；不能只按启动 exe 过滤而遗漏子 exe，也不能把域名 allowlist 当内核规则。WFP 支持用户/应用等条件，但完整规则组合尚未实现；不得声称一个 FwpmFilterAdd0 调用就是网络沙箱。不要为兼容直接给 AppContainer 全网能力或回环豁免。[FwpmFilterAdd0](https://learn.microsoft.com/en-us/windows/win32/api/fwpmu/nf-fwpmu-fwpmfilteradd0)、[WFP condition identifiers](https://learn.microsoft.com/en-us/windows/win32/fwp/filtering-condition-identifiers-)

## 5. Ubuntu 设计

### 5.1 独立 uid/gid、控制目录与管理 socket

部署目标是已打安全补丁的受支持 Ubuntu，具体 release/kernel/AppArmor/systemd 版本写入证据，不从“Ubuntu”名称推断能力。管理员操作员与 Broker、worker 是不同 uid；worker 无 sudo、docker/lxd 等高权组、无宿主 capabilities、无管理 socket 和宿主用户 home。Broker 目录服务 owner 持有，控制/Archive 文件及其父目录不授 worker 权限；工作副本给单一执行身份，Reviewer 使用服务 owner 的只读快照。多项目共享一个 uid 会扩大同 uid 信号、ptrace 和文件访问面；首版按互不信任项目分配 worker uid，任务再以 namespace/profile 隔离，不能把随机目录名当安全身份。

启动 helper 在单线程早期设置补充组、`setresgid`/`setresuid` 的 real/effective/saved 身份并读回；任一步失败拒绝启动，不能留下 saved root。管理采用受保护目录中的 pathname AF_UNIX socket，限制目录/socket 权限；服务读取 SO_PEERCRED 得到 kernel 提供的 uid/gid/pid，再按登记管理员身份授权。abstract socket 不靠目录权限保护，不作为首版管理入口；同样不接受 payload 管理标记。[setresuid/setresgid](https://man7.org/linux/man-pages/man2/setresuid.2.html)、[unix(7) SO_PEERCRED](https://man7.org/linux/man-pages/man7/unix.7.html)

### 5.2 namespace 与文件系统

每次执行准备 mount/user/pid/net/ipc/uts namespace；userns 映射只含被授权的低权限 uid/gid，不映射宿主 root。mount propagation 必须私有，根视图只读最小工具链；仅 bind 指定工作副本可写，私有有界 tmpfs，单独挂 /proc，最小 /dev；不挂宿主 /home、/run、Docker socket、/sys 可写入口、原仓库或宿主 /proc。只读候选必须禁止通过另一个可写 bind/hardlink 触达同一 inode；namespace 名称本身不保证文件不可写。[Linux man-pages namespaces](https://man7.org/linux/man-pages/man7/namespaces.7.html)

OFFLINE 新 netns 不连接 veth/宿主路由，不传入已连接网络 fd；仅有隔离 loopback。netns 还隔离 abstract AF_UNIX 命名空间，但 pathname socket 和继承 fd 仍需 mount/权限/句柄控制。PROXY 后置为唯一可达转发端；禁止 worker CAP_NET_ADMIN/CAP_NET_RAW，代理处理 CONNECT、重定向、DNS 解析与重绑定、IPv6/保留地址及目标变更，直连和代理故障负测未过则不发网络能力。[network_namespaces(7)](https://man7.org/linux/man-pages/man7/network_namespaces.7.html)

Broker 的文件 API 使用目录 fd 与 `openat2`，至少选 `RESOLVE_BENEATH | RESOLVE_NO_MAGICLINKS`，按 profile 再禁 symlink/跨 mount；不支持或参数错误时拒绝，不回退普通 open。其限制是单次路径解析，不证明 hardlink 源对象属于任务，也不自动解决任意多步 rename 的授权；必须绑定父目录 fd、对象身份和修改操作。Shell 文件边界仍由 mount/DAC/LSM 组合落实。[openat2(2)](https://man7.org/linux/man-pages/man2/openat2.2.html)

Ubuntu 24.04 的官方说明已包含对非特权 userns 的 AppArmor 限制。不得为了让 helper 跑通而全局关闭该限制；应由部署管理员安装针对可信 launcher 的窄 profile，验证实际 userns/capability 行为。若当前发行版拒绝所需 namespace，执行能力 BLOCKED，而不是重新以宿主 root 跑原命令。[Ubuntu 24.04 release notes](https://documentation.ubuntu.com/release-notes/24.04/)

### 5.3 no_new_privs、seccomp 与 AppArmor

完成必须的 namespace/mount/LSM 准备后清空不必要 capabilities（含 ambient/bounding 等可获得集合），设置并读回 `PR_SET_NO_NEW_PRIVS=1`；不传可用的高权 SCM_RIGHTS fd。no_new_privs 随 fork/exec 继承但不阻止所有非 exec 权限变化；与 LSM exec transition 的次序可能相互影响，必须验证最终进程 label 和实际拒绝效果，不能只检查返回码。[Linux no_new_privs](https://docs.kernel.org/userspace-api/no_new_privs.html)

seccomp 使用实际架构/ABI 的过滤器，默认拒绝未允许 syscall；在执行用户代码前安装，子进程继承，允许线程时验证全部线程同步适用。初始 profile 拒绝不必要的 mount/setns/unshare、ptrace、bpf、内核模块、设备管理与权限变更等入口；工具所需 fork/clone 不等于允许新 namespace。ABI 兼容路径和 clone3 参数指针需要专门处理，不能仅列 syscall 号。路径字符串不能靠 seccomp BPF 安全解引用过滤。内核文档明确其并非完整沙箱；FS 与信息流仍须依靠其他机制。[Seccomp BPF](https://docs.kernel.org/userspace-api/seccomp_filter.html)

AppArmor profile 由管理身份安装且 worker 不可修改，必须最终处于 enforce，覆盖启动器、解释器与子 exec；明确文件、网络、ptrace、signal、capability、Unix socket/DBus 入口，拒绝可脱离约束的 exec transition。complain/unconfined、profile 未加载、ABI 不匹配均不满足本设计；实际继承/路径别名/hardlink 绕过必须负测。应用 Policy 的 AUDIT_ONLY 不应调用 aa-complain；这是独立 OS 配置。[Ubuntu AppArmor](https://documentation.ubuntu.com/security/security-features/privilege-restriction/apparmor/)

### 5.4 cgroup v2、进程树与限额

由可信 supervisor 在受委派 cgroup v2 subtree 创建每运行一组，worker 不能写 cgroup.procs/subtree_control 或迁出；在用户代码运行前将进程放入目标组，优先以支持的 `clone3(CLONE_INTO_CGROUP | CLONE_PIDFD)` 消除“先跑再迁入”窗口，兼容路线须用可信握手确保 payload 未运行。设置 memory.max、memory.swap.max、pids.max、cpu.max 与必要 IO/输出限制，读回实际值及可用 controller；cgroup 不限制普通文件的总磁盘占用，工作副本/tmpfs/Artifact 另有配额或明确有界输出。

保留 pidfd 绑定直接进程，PID namespace 的 init 负责回收；取消时控制整个 cgroup，等待 `cgroup.events populated=0` 和进程/输出清退，再释放 writer。仅 kill 负 PGID、setsid 前父子表或父进程退出不足以证明全树结束。无 cgroup.kill/委派/controller 或无法可靠清退的兼容路线保持 BLOCKED，不通过无限循环扫描假装原子清退。[cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)、[clone3](https://man7.org/linux/man-pages/man2/clone.2.html)、[pidfd_open](https://man7.org/linux/man-pages/man2/pidfd_open.2.html)

## 6. 外部 Harness 与 native helper 候选

外部 Harness 运行在相同 worker profile 内，不进可信 Broker 地址空间，不复用桌面登录用户的 home/OAuth/SSH/代理配置，不携带通用 Provider Key。自带工具、hooks、插件、LSP、终端、MCP、更新器、后台 daemon、Git credential helper 和远程执行通道必须盘点并实际绕过测试；配置中禁止某个工具只减少入口，不提供最终安全边界。无法约束其自带能力/启动链/网络认证时 adapter 保持关闭。供应商 CLI/账号能力和分发许可另验，本轮不读取真实认证。

DeepSeek 固定 commit `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` 的 [spawn.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/sandbox/sandbox-windows-acl/src/spawn.ts) 确有 `spawnSandboxed` / `spawnSandboxedInherited`，委托 `@deepseek-ai/dsh-win32-process`；[runner.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/sandbox/sandbox-windows-acl/src/runner.ts) 明确失败不作 unrestricted spawn。所读 wrapper 和注释只证明该入口存在，不能证明转委托的 native 进程实现、读取隔离、网络或清退已满足本规格。本轮额外 token/process 源文件下载不可用，完整 native 链审查仍 BLOCKED。M0 缓存四个源码/许可文件已重新核对 SHA256 与原取证记录一致；未执行它们。

helper 候选优先独立重写必要 OS 绑定（小型 C/C++ 或 Rust 可在工具链/发行验证后选一），不为 M1 安装工具链。TS/FFI 方案仅是受审候选：DeepSeek [package.json](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/sandbox/sandbox-windows-acl/package.json) 依赖 koffi 3.1.1、内部进程包等，并非可直接复制的孤立函数。实际 FORK_MODIFY/REUSE 需文件清单、固定 SHA、完整许可/NOTICE、native 二进制/传递依赖闭包、补丁与回归；当前仅 REFERENCE_ONLY。Workflow Kit 原件缺授权，继续只做独立规格重写，不把其代码/模板移入产品。[M0 许可证准入](../../AgentNexus-v0.4-M0/research/license_inventory.md)

## 7. 实际绕过测试合同

下表是下一阶段必须真实运行的合同，**本轮全部 NOT_RUN**。NOT_RUN 表示未执行；准入 BLOCKED 表示缺少环境、实现或授权而不能发能力，不能把二者改写为 PASS。测试只用专用 disposable 实验环境中的合成 fixture，不使用用户数据、Key、真实模型或科研程序。fixture 包含允许工作区 W、禁止写/读的 F、Reviewer 候选 R、管理目录 A、另一任务 B；可信外部 observer 记录前后 hash、ACL/profile、进程句柄/Job/cgroup、网络端点日志和完整 stdout/stderr。每组必须含可成功的正向控制；只见命令 exit≠0 或日志“denied”不足以证明边界。

### Windows（每行状态 NOT_RUN）

| ID / 相关策略 | 合成攻击步骤（须用实际 worker 身份执行） | 通过条件与证据 / 阻断条件 |
|---|---|---|
| W-IDENT / P.IDENTITY, P.ADMIN_MODE | worker/普通交互身份连接管理 pipe；提交 admin:true、重放 challenge；尝试复制/继承管理 handle | OS 拒绝或身份校验拒绝且无管理事件提交；登记管理员对同入口正测成功。未部署独立 SID/管理服务则 BLOCKED |
| W-ACL / P.FS_SCOPE, P.ARCHIVE_APPEND | `cmd` 重定向、PowerShell Set-Content、Node fs 分别读写 F/A/B；尝试父目录 rename/delete-child、修改 DACL/owner、SQLite -wal/-shm | 受保护内容/目录身份不变，worker 无有效句柄；W 的允许操作成功。只验文件 Write 位不合格 |
| W-READ / P.SECRET_BOUNDARY | 给 F 放假 secret sentinel，用读取 API、映射、目录枚举、其他进程/命名共享对象尝试读；比较 WRITE_RESTRICTED-only 对照与完整 profile | 完整 profile 不返回 sentinel，允许工具链文件可读；受限写 token 的可读对照不能报沙箱失败/成功混淆。无真实读取边界则 BLOCKED |
| W-PATH / P.FS_SCOPE | 从 W 尝试 `..`、大小写/8.3、`\\?\`、UNC、设备、ADS、junction/symlink 到 F、hardlink、跨卷；另线程反复换目录后 Broker create/read/rename/delete | 外部 observer 见 F/A/B hash/对象身份不变；被拒绝具体阶段可追溯。任何变体缺 fixture 能力记 NOT_RUN，不标全部 PASS |
| W-RO / P.REVIEW_RO | 对 R 内容/ADS/ACL、父目录替换、已存在 hardlink 和共享 Git 路径分别写入 | R/baseline 的内容与身份不变；Reviewer 无所有者权限提升。快照与写副本共享 inode 未解决则 BLOCKED |
| W-TOKEN / P.IDENTITY | 子进程读 token，尝试启用已删除 privilege、取得 Broker PROCESS_DUP_HANDLE/VM_WRITE/TOKEN_DUPLICATE；尝试默认桌面/窗口消息 | 无高权能力/对象句柄，非交互边界有效；需要测试 helper，未有二进制则 BLOCKED |
| W-TREE / P.WORKSPACE_WRITER | 普通/嵌套 child、CREATE_BREAKAWAY_FROM_JOB、双层后台启动；用 WMI Win32_Process.Create、COM、计划任务/服务入口请求合成 marker child | 通道被权限拒绝，或全部仍受可信运行归属并可清退；取消后观察窗内无 marker 增长。禁止通过真实安装服务来测试 |
| W-NET / P.TOOL_CONTRACT | worker 与不同子 exe 对测试端点做 IPv4/IPv6、TCP/UDP、DNS、127.0.0.1/::1、LAN、listen、UNC/SMB；清除代理 env 直接 socket | OFFLINE 无出入站/系统代发；PROXY 仅唯一出口，端点 observer 无直连。无受控双端网络环境则 BLOCKED |
| W-LIMIT / P.WORKSPACE_WRITER | 有界地创建至 process limit+1、分配至 memory limit、CPU busy 1 秒、持续写有界 stdout；强杀 supervisor/丢 completion 事件 | 限额可观察，输出有背压；Job 清退且 writer 不提前转移。无 Job/监测器则 BLOCKED；不跑无界 fork/磁盘耗尽 |
| W-START / P.TOOL_CONTRACT | 在创建 token/AppContainer、分配 Job、环境构造、ACL/profile 预检与 Resume 前分别故障注入；伪造 helper 回执 | payload marker 从未出现，不存在 unsandboxed fallback；信任回执必须来自 OS 监督者，不能由 worker 自报 |

### Ubuntu（每行状态 NOT_RUN）

| ID / 相关策略 | 合成攻击步骤 | 通过条件与证据 / 阻断条件 |
|---|---|---|
| U-IDENT / P.IDENTITY, P.ADMIN_MODE | worker 连接管理 pathname/abstract socket，伪造 uid/admin payload；尝试 SCM_RIGHTS 传入额外 fd | kernel peer 身份与登记规则拒绝，未消费 challenge；未授权 fd 关闭。无 Ubuntu 管理身份/服务则 BLOCKED |
| U-UID / P.SECRET_BOUNDARY | 核对 real/effective/saved uid/gid、补充组、Cap*/NoNewPrivs；尝试合成 setuid/file-cap 程序、恢复 saved uid | 不获得宿主/其他任务权限；需部署测试身份与 helper，当前 BLOCKED；不操作用户系统 setuid 文件 |
| U-MOUNT / P.FS_SCOPE | `..`、symlink、hardlink、bind 别名、/proc/self/fd、宿主 /proc/PID/root/fd；并发换父目录后 openat2/create/rename/delete | 仅 W 可改，F/A/B 无泄漏/变化，mount propagation 不影响宿主；host namespace/fd 暴露即 FAIL |
| U-RO / P.REVIEW_RO | 对 R 修改、rename/delete、chmod/chown、尝试经另一可写 bind/hardlink 修改同 inode | 内容与对象身份不变；不能只因主路径挂 ro 判 PASS |
| U-SECCOMP / P.TOOL_CONTRACT | 小型可信探针尝试 denied syscall、兼容 ABI、ptrace、setns/unshare、新 namespace clone 参数、线程/exec 后再测 | 精确拒绝并保留允许 syscall 正测；未覆盖 ABI、过滤仅部分线程或日志模式则 BLOCKED |
| U-AA / P.FS_SCOPE | 解释器→child exec 后读取 label；尝试 profile 未加载/complain、unconfined transition、别名路径、DBus/Unix socket | enforce 且负测真拒绝；LSM/no_new_privs 次序错误即 FAIL。不得为测试在用户宿主卸载全局 profile |
| U-CGROUP / P.WORKSPACE_WRITER | 双 fork/setsid 后写合成 marker，尝试迁移 cgroup；监督器异常退出/取消同时并发 fork | cgroup 无逃逸，populated=0 后才 tree_exited；marker 停止、pidfd 绑定正确。无委派/v2/controller/cgroup.kill 则 BLOCKED |
| U-NET / P.TOOL_CONTRACT | 与 W-NET 同协议矩阵，加 host pathname/abstract socket、继承已连接 fd、netns 重入 | OFFLINE 不达主机/外网；PROXY 不直连/绕 DNS/重定向，未授权 fd 不存活 |
| U-LIMIT / P.WORKSPACE_WRITER | 小限额 pids/memory/swap/cpu、私有 tmpfs/输出上限，测试低权限写 cgroup 配置 | 真正受限且不能迁出/改上限；内存值瞬时超出按内核语义记录，不能许诺瞬时精确字节上界 |
| U-START / P.TOOL_CONTRACT | 在 uid 映射、mount、AppArmor、seccomp、cgroup、exec 握手各阶段失败/重启 | 用户 payload 未运行，无 root/无 profile 回退；每失败有阶段证据与清理状态 |

### 跨平台与外部 Harness（每行状态 NOT_RUN）

| ID / 相关策略 | 合成攻击/故障 | 必须结果 |
|---|---|---|
| X-CAP / P.TOOL_CONTRACT | 任一必需能力 NOT_RUN/UNSUPPORTED、profile/binary/OS 指纹改变、伪造 verified_test_refs | prepare/execute BLOCKED，payload 未启动；API 存在不补齐证据 |
| X-MODE / P.ADMIN_MODE | 三模式下重复同一 OS 越界/假管理 peer 请求，PDP 故障/超时 | 应用降级语义正确，独立 owner 始终拒绝；不得自动切 permissive |
| X-HARNESS / P.FS_SCOPE | 每个 adapter 用自带 Shell、MCP、LSP、hooks、插件、Git helper、daemon、远程 shell 去读写/联网/启动 marker | 所有入口留在同一 profile；任一路径越界即 adapter 不准入，不能以主菜单工具关闭替代 |
| X-PERMIT / P.APPROVAL_REPLAY | 完成检查后换 argv/脚本/环境/工作区，重放 nonce，执行前切 epoch，restart 后再次消费 | hash/身份/epoch/次数绑定拒绝；参数变更不复用旧诊断或批准 |
| X-RECOVER / P.WORKSPACE_WRITER | 杀 Host/helper/worker、挂起后恢复、租约过期/PID 复用；副作用出现但 RESULT 写入失败 | 未确认树/副作用先 INDETERMINATE，claim 保留；reconcile/Task 重建不能再次运行 |
| X-AUDIT / P.ARCHIVE_APPEND | 诊断日志 OFF、审计/输出存储失败、输出过快、取消有半对象 | 必要 intent 无 durable ACK 不启动；结果不完整不报完整成功；原始交互/审计有缺口标记 |
| X-UPGRADE / P.TOOL_CONTRACT | 更换 helper/Harness/Node/kernel/profile/工具链，重用旧测试证据 | 相关证据失效、重跑适用组合；未实现/不可用功能不伪装 ON |

每次测试产物应包含 test_id、platform/build、candidate/helper/Harness SHA、profile_revision/hash、fixture baseline、身份、完整调用参数 Ref、可信 observer、开始/结束时间、预期/实际拒绝点、进程与网络证据、实际 status/reason。安全负测不应在真实开发工作区随意落地。测试计划不是 exploit 已复现；失败下载也不是上游漏洞。

## 8. 本轮实际证据与剩余阻断

| 事项 | 实际完成 / 结果 | 不支持的结论 |
|---|---|---|
| 项目资料 | 已读 AGENTS、治理 policy、workflow 路由、M0 协议/策略/安全/许可与 ADR002；对齐 M0.1 协议/Audit/ADR006/008 | 没有把外部源码规则当本项目指令，没有改 M0/规则/原套件 |
| 官方接口 | 查阅 Microsoft Learn、Linux kernel、Linux man-pages 项目、Ubuntu 官方、Node 固定版本文档；逐项 URL 和分析笔记入清单 | 文档证明接口语义，不证明 AgentNexus 已调用或部署成功；网页未缓存为完整原件，不伪造源页 SHA |
| Windows 只读探测 | OSVersion 10.0.26200.0、registry build 26200.9711/25H2；PowerShell 7.6.9、Node v24.15.0、Python 3.12.10；记录当前 OS token 可见 privilege 和 PATH 工具 | registry ProductName 返回 Windows 10 Pro，保留原值，不用它覆盖 build 推断；没有验证新管理员/worker 身份，未运行 token/Job/AppContainer/WFP API |
| 工具可见性 | node/python/git/wsl/icacls/whoami/netsh/pwsh 可找到；docker/rustc/cargo/cl/clang/clang-cl/cmake/ninja 不在当前 PATH；Get-Volume 查询没有返回本盘信息 | 不说明所有磁盘无工具链；wsl.exe 存在不证明有 Ubuntu、AppArmor 或可用 cgroup；文件系统类型未确认 |
| 固定源码 | M0 DeepSeek runner/spawn/package/LICENSE 四文件 SHA256 与原 acquisition 一致；只读静态审阅 | 未运行上游测试，不从注释断言推出本机实测；额外 token/process/package 下载因网络 WinError10013 不可用 |
| 产品级安全验证 | W/U/X 矩阵全部 NOT_RUN；Windows/Ubuntu 管理认证与任意执行部署 BLOCKED | 不把“未发现绕过”写成 PASS，不声称完整沙箱或真实账号/Key/科研权限已接入 |

证据缓存限定在 `.workflow-kit/runtime/AgentNexus-v0.4-M0.1/platform/`：host_probe.json 是实际只读结果；web_evidence_notes.json 是官方网页抽取后的分析笔记（非网页原件）；upstream_acquisition.json 保留失败尝试。原 M0 缓存仅引用与校验，不改写。新交付/缓存通过 govern.py new 创建；该命令自带治理索引刷新，最终统一 refresh/check 由主代理归并。

解除执行阻断的最小路径：先审定一个平台的离线 profile 与管理身份部署方案，在专用 fixture 完成真实 helper、W/U 适用矩阵及 X 共通用例；将证据绑定发行资产和 profile，再发有限执行能力。另一平台单独完成同样准入。外部 Harness、联网、UI 与科研能力分别后置；M1 存储、状态机、只读 Task 重建和可信文本诊断可继续，不依赖先安装完整 OS 沙箱。
