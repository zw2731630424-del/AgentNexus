# M1.2 OS 安全边界架构（P1-C）

交付状态：DESIGN_DELIVERED。独立 OS 管理身份、IPC 认证、任意工具进程隔离及平台对抗验收均未实现；Windows 与 Linux 部署保持 BLOCKED。本轮未修改本机或 Ubuntu 账户、ACL、防火墙、服务、容器配置，也未连接服务器。2026-11-07 查阅的原生文档仅支持下述设计选择，不是运行证据。

## 身份与可信计算基

可信 Host Admin 控制面、Policy/Permit/Archive Broker、Credential Broker 属于可信域。管理员由独立 OS 登录/服务身份和独立管理通道认证；“管理员”不是模型身份、用户名字符串、PID 或 localhost。默认服务只获必要对象权限，不因职责名自动使用系统最高权限。安装/初次授权必须由真实操作者在明确的部署任务中完成。

Agent/第三方工具进入独立低权限 Worker 身份和进程；Worker 不可读取/写入内核 SQLite、审计对象、控制面端点、Host 源码、Provider 凭据及其他研究目录。操作数据只能经版本化 IPC；不可信代码绝不与 Host 库同进程。M1.2 的 ToolContext 缩减是库接口约束，无法阻止任意同进程 JavaScript 导入 fs/spawn，故不开放不可信 handler。

## 内核与 OS 职责

| 能力 | AgentNexus 内核 | OS / 受控 Broker | 本轮状态 |
|---|---|---|---|
| 操作身份、参数 hash、审批、epoch、单次 Permit | 可信状态机及事务强制 | 从已认证 IPC 填 actor，不信 payload | 库内已实现；OS 通道 BLOCKED |
| 文件访问与副作用资源范围 | 规范化资源意图与 Writer Claim | 真实句柄、权限/命名空间、不可替换对象绑定 | 任意 FS Broker BLOCKED |
| 进程能力 | 缺 profile 拒绝；不接受 requires_sandbox=false 绕过 | 受限 token/UID、可执行映像白名单、禁止继承敏感句柄 | PROCESS 始终 BLOCKED |
| 网络与 Provider | Tool Permit 不授予网络/费用 | Worker 默认无外网；Credential Broker 才可访问获准上游 | Provider/网络执行 NOT_RUN |
| 资源与退出 | 超时请求取消，未知保留 claim | 硬 CPU/RSS/PID/磁盘限制、全树退出核验 | OS 限额/树退出 NOT_RUN |
| 操作核实 | 原 intent + 人工证据追加裁定 | 平台 helper 提供不可由 Worker 伪造的 ExitProof | 本地 handler 观察已实现；OS ExitProof BLOCKED |

## Windows 实施路线

候选方案是受保护的本机命名管道：明确端点 DACL、独立管理/Worker 端点、拒绝远端连接，检查真实客户端 token/SID 与会话。服务若使用 impersonation，必须检查调用成功；失败即拒绝，避免误以服务身份执行请求。这些 API 不是仅凭管道名完成身份认证。[Microsoft 命名管道](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes)、[ImpersonateNamedPipeClient](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-impersonatenamedpipeclient)。

Worker 使用独立受限 token；验证 SID/privilege、完整性级别及每个资源的实际 ACL，不把 restricted token 当完整沙箱。网络隔离需另有经实测的 AppContainer/受控网络机制，不能由 Job 或环境变量代替。[Restricted Tokens](https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens)。

受控 helper 先创建挂起进程，加入不允许 breakaway 的受保护 Job 后恢复；保存不可由 Worker 伪造的进程创建身份/句柄。限制 CPU/内存/进程数并请求整 Job 终止，随后核验 active processes 与退出通知。Job 管理集合和资源，不代替每进程安全 token；WMI 等脱离路径必须拒绝并实测。[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)。

文件 Broker 以已授权根句柄解析实际文件，处理 reparse/junction/hardlink/UNC/ADS/大小写及重命名竞态；读写和 expected_revision 必须绑定同一对象。继承句柄仅白名单，禁止 Worker 修改 Host 管道或 Job；Windows 网络、ACL、reparse 全覆盖没有当前证据。

## Linux 实施路线

Host/Worker 使用不同 UID；候选 UDS 位于 Host 控制目录。服务读取 SO_PEERCRED 等内核凭据并绑定连接能力/会话，不信 JSON uid；抽象 socket 没有路径文件权限保护，因此不把地址名当权限。管理员端点与 Worker 端点分别授权。[Linux unix(7)](https://man7.org/linux/man-pages/man7/unix.7.html)。

Worker 由受控 systemd 服务或等效 helper 启动，组合专用 UID、NoNewPrivileges、只读挂载/受限可写目录、隔离网络/设备及 syscall 限制；禁止敏感 IPC 和 Host socket 被重新挂入。ProtectSystem 等文件只读设置本身不阻止连接 Unix socket，故 IPC 仍需单独限制。部署须按真实 Ubuntu/systemd 版本探测，不直接把最新手册配置复制到服务器。[systemd.exec](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)。

每个执行实例使用 Host 控制的 cgroup v2，设置 memory/pids/cpu 限额且不允许 Worker 迁移出组；退出依据包含子组的 populated 状态与实例身份。pidfd 绑定实际进程身份并等待退出，单个 pidfd 退出不能证明整个执行组空。[cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)、[pidfd_open](https://man7.org/linux/man-pages/man2/pidfd_open.2.html)。

Linux 文件 Broker 同样用目录/文件描述符绑定实际对象；mount namespace、权限与只读快照共同限制访问，路径预检查不能代替打开时的强制约束。seccomp、namespace、网络、LSM profile 的可用性需要真实主机证据。

## IPC、退出与凭据合同

拟定 `ExecutionEnvelope {schema,channel_id,message_id,nonce,subject,operation_id,intent_hash,permit_id,feature_epoch,policy_epoch,profile_revision,resource_handle_refs}`。actor 由认证连接产生；协议版本/必需字段未知拒绝；nonce/单次消费/短期能力不能跨连接、跨项目或跨操作复用。管理通道不能接受 Worker 转送的管理员字符串。

拟定 `ExitProof {executor_instance_id,host_boot_id,process_creation_identity,profile_revision,job_or_cgroup_identity,root_exited,tree_empty,resources_closed,observed_at,evidence_refs,broker_authentication}`。仅可信 helper 的认证回执可以形成 OS 退出证明；Worker 自报、超时、主进程消失或管理员上传一个 exit=true 都不足。无法复核则继续 UNKNOWN/持有 Writer，不能回落到无隔离执行。

Provider 凭据只在独立 Broker 读取/注入获准请求；不进入 Worker 环境、argv、工具输出或原始普通档案。凭据访问、上游发送、预算预留、计费未知与核实分别审计。Provider Key 不提供 OS 权限，科研批准不提供 Provider 费用授权。凭据 Vault/加密及真实费用结算保持 NOT_RUN。

## M1.3 平台验收计划

Windows 与 Linux 各自执行：伪造管理员、跨身份连接、重放/过期连接能力、Worker 直读/改写数据库、跨项目读写、句柄继承、路径替换/链接、进程派生/逃离、网络绕行、凭据泄露、资源耗尽、全树取消与 Host 重启后的未知实例。预期为真实拒绝或正确隔离；每项须保留 OS 版本、身份、helper hash、profile revision、原始审计和实际进程/资源观察。当前全部 NOT_RUN，任意一项必需能力缺证据时对应执行 profile BLOCKED。
