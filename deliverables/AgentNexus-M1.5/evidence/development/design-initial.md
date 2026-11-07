# M1.5 Production Bootstrap 设计

状态：开发候选；真实独立账户部署与完整生产资格仍 BLOCKED。M1.4 的 67 个文件从冻结集 `e2f95cb5c7557660dfbbf3cfcbb2a03a78460f9b408e66bd2fbb3f6ea96e3a88` 复制；根 M1.3 与历史交付均不修改。

## 启动与信任

继续 ADR016 的双标准账户用户态方案。Host/Broker 同属受信任 Host 控制平面；Worker Launcher 属于独立 Worker 账户。计划任务 PASSWORD/Batch 只是候选的身份启动器，不安装服务，不将 Worker 密码交给 Host。Host 与 Launcher 启动先验证实际 OS SID、标准 token、Node/PowerShell/入口/配置/完整源码指纹、精确目录 SDDL 与配置版本；通过后才打开管理数据库和创建能力。配置路径和 SHA256 由受保护的启动入口固定，不从 Agent 请求取得。错误身份、目录可写或指纹变化直接拒绝。

Host 的管理 capability 只在成功 attestation 后创建，保留原 Policy/Approval/FeatureRegistry；不序列化给 Worker。数据库、Broker 账本、Worker runtime、项目输入、输出独立。启动锁、旧 boot 撤销和分页恢复先于 READY；旧 operation 不重放，未知资源继续隔离。

## IPC 与执行

新增可保持连接的原生 Named Pipe owner，使用新私有端点、FIRST_PIPE_INSTANCE、REJECT_REMOTE_CLIENTS、精确客户端权限、实际 kernel PID/session + 创建时间/SID/token/映像指纹读回并持有进程句柄。Native helper 只走父进程继承 stdio；每帧、连接、未完成请求、期限有界。双方验证 OS peer 后再经该连接交换随机会话密钥；密钥不进入 argv、环境和日志。规范 JSON + HMAC、连接代次、序号、nonce、截止、request/operation 绑定，拒绝重放和断线恢复发送。

显式区分两个身份：管道 peer 是可信 Worker Launcher 的原生通信 owner；被监管 Runtime 是由 Launcher 的 Supervisor 挂起创建并钉住的 AppContainer 子进程。二者不可互相冒充。Host 绑定实际 prepared process 后，既有 ProductionGateway 消费精确审批、Permit 和五类资源；Broker 消费自己的唯一账本后才允许 Supervisor 恢复。Worker 的私有继承 stdin 只接收本 operation 的有界签名 bootstrap；固定工具不接受 shell、外部程序路径或通用 execute callback。跨账户 pipe 的真实 OS 组合测试必须等待系统授权。

## 沙箱、文件与退出

复用 M1.4 Restricted Token/AppContainer/挂起 Job/句柄级 FileBroker。新 native 退出观察以 Job 最终 accounting 的 TotalProcesses 与全部钉住身份数核对历史覆盖，保留缺口；通知/采样单独不证明完整历史。父链通过内核进程基本信息与创建时间核验，必须到达唯一 root。短命成员漏采样则明确 EXIT_UNVERIFIED。CPU 用户态累计预算、带宽和墙钟期限分别记录；新的资格测试必须检查实际累计时间和终止原因，不能仅检查“非 DEADLINE”。

ExitProof 额外闭合 IPC pending、所有输出 producer、沙箱关闭和五资源 owner 条件；证明签名与原始观察持久化并审计。完整证明仍不自动释放，原 M1.2 独立最终裁定、owner 授权、策略及资源版本均须再次通过。审计失败拒绝新起跑；正在执行的实例请求终止并保持未知。关闭 Broker/Sandbox/Audit 不能打开其他执行路径。

## 实施与验收

先完成代码、严格 TypeScript、真实本账户原语与明确 SIMULATED 的故障模型；只读预检后提交精确系统变更清单。合成独立进程并不证明独立 OS 身份。CPU 历史 FAIL 原件保留，后续 PASS 超过 80ms 预算的原始值不作资格背书。Windows 独立身份/组合/网络/其他项目与管理库拒绝、真实 Host 重启、Ubuntu 实际部署分别裁定，不从局部 PASS 推导。

Ubuntu 提供可实现的严格适配器合同和启动预检准备，真实 UID/GID、SO_PEERCRED、namespace、seccomp、cgroup v2、AppArmor 的加载与组合资格另行授权，不触及服务器。
