# M1.3 总体设计

基线是 main/56a52ffee6e2d531957a8bbc697c995396d3f3fb 下与最终 167 PASS 运行完全相同的 M1.2 源码。保留 Gateway 的精确审批/资源/Permit、Writer、受限 ToolContext、Reconciliation、UNKNOWN producer、Flush target 与统一 Close Promise。新运行控制使用同一个 KernelStore 事务/审计 outbox，独立表，不覆盖旧操作。Host 是可信库，普通 Agent 不持有管理对象或数据库。

链路：可信 Bootstrap → Identity Registry / Policy → Gateway → IPC admission → Broker admission → Supervisor → 平台 helper → Worker。所有未知 owner 和未经部署验收的执行 profile 拒绝。M1.2 的可信本地 PURE/READ_ONLY/LOCAL_WRITE handler 继续原合同；不接纳不可信同进程插件。新 Broker 是独立入口的受限进程协议实现准备，安全部署前不开放任意工具。没有 verified=false 的降级执行路径。

本轮在已有权限内实现：持久 Runtime Lifecycle、Capability/nonce/epoch/deadline 消费、审计 SDK、隔离资源投影及重启恢复、原生 Windows SID/进程创建身份/命名管道 peer/Job 原语探针。独立用户、文件目录隔离、网络拒绝与硬资源组合需要单独部署授权和实测。只通过原语探针不能解锁 PROCESS/EXTERNAL_EFFECT。

控制表均有数量上限与分页恢复；IPC 64KiB 最大帧、UTF-8 严格解码、规范 JSON、有界连接/请求、无自动副作用重发。原始大日志流写盘，单次解析只读有界帧。Host 重启首先撤销旧运行会话，隔离所有非释放资源，不按 PID 消失自动释放。EXIT_UNVERIFIED 与异常退出保持独立状态。

整体设计供开发者按实际部署身份和网络机制调整。当前最小验证不依赖创建 OS 用户或修改系统配置。正式 Windows 方案使用专用 Host/Worker SID + Restricted Token + 创建时挂起入 Job + 网络拒绝机制；Linux 另行以 UID/namespace/cgroup/seccomp 组合验收。
