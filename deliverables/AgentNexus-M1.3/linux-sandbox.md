# Ubuntu/Linux Sandbox Adapter 实施设计

状态：设计完成，Linux 源生执行适配器未实现，所有 Linux OS 验收 NOT_RUN，生产准入 BLOCKED。未连接或修改 Ubuntu 服务器。不能继承 Windows 通过项。

可信服务持有控制库和管理 UDS；专用 Host UID/GID 与 Worker UID/GID 分离，Worker 无控制目录权限。UDS 位于受保护路径，SO_PEERCRED 读取内核 peer UID/GID/PID；建立后钉住 pidfd 与 /proc starttime/boot_id，禁止使用 JSON UID 或裸 PID 恢复身份。管理通道和 Worker 通道分离，默认拒绝；同 UID 也需 Supervisor 持有的精确实例绑定。[Linux kernel 文档](https://docs.kernel.org/) 为平台实现入口。

Worker 创建时先进入专属、不可迁移的 cgroup v2，再运行用户代码；配置 memory.max、pids.max、cpu.max。组合独立 User/Mount/PID/Network Namespace、no_new_privs、seccomp syscall allowlist、适用主机的 AppArmor；禁止 mount/ptrace/外部进程创建路径和敏感设备。只读映射运行时/工具/输入，精确可写工作区与私有 tmp；不挂 Host UDS、管理 DB、凭据或其他项目。network namespace 默认无出口，不能只清代理环境变量。文件 broker 用目录句柄/openat2 等平台机制处理符号链接和路径置换。

全组终止后观察包含子 cgroup 的 `cgroup.events populated=0`，同时等待所有 pinned pidfd，输出 producer 与 Broker 句柄关闭后才形成候选 ExitProof；单个 pidfd 不代表整个树。Host 重启以 boot_id/cgroup identity/starttime 全量核实，未授权迁移、容器失踪或证据不完整继续 UNKNOWN_QUARANTINED。[cgroup v2 官方合同](https://docs.kernel.org/admin-guide/cgroup-v2.html)。

实际 Ubuntu 版本、内核、cgroup controller、unprivileged namespace、LSM 和 systemd 必须在获准目标主机只读探测后固定版本，不能复制未测试的最新版配置。实施前另报精确账户、目录、挂载、unit/profile、网络规则和恢复方案。

独立验收：跨 UID 伪造/跨 project/管理库读写/环境凭据不可见、SO_PEERCRED 和 PID 重用、namespace/cgroup 逃逸、seccomp/no_new_privs、网络绕行、子组残留、超时不放锁、Host 进程崩溃/重启、输出未知与证据丢失。每项记录真实 OS、运行身份、helper/profile SHA、原始日志及退出观察；没有执行的项目一律 NOT_RUN。
