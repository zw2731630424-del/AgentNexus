# Ubuntu Adapter 实施规格

状态：**SPECIFICATION_ONLY / NOT_RUN / 生产BLOCKED**。未连接、修改或探测当前Ubuntu服务器的账户、防火墙、ACL、服务或内核设置。Windows证据不转作Ubuntu验收。

## 接口

实现相同IdentityObserver、PeerObserver、ProcessSupervisor、NativeFileOwner、ExitEvidence接口；保持原logical identity/operation/资源/profile/epoch/单次Permit合同，OS事实只来自Supervisor。启动器以专用Host UID/GID和Worker UID/GID分离，Worker无管理DB、Policy、Feature或审批目录权限。获得系统级授权后才固定实际发行版、内核、LSM、cgroup controllers、namespace及systemd版本。

UDS管理和Worker端点分开，父目录句柄与权限固定，SO_PEERCRED取得真实UID/GID/PID，钉住pidfd、/proc starttime、boot_id、会话和generation。JSON用户名/PID、同UID其他进程都不能继承实例。长度/规范编码/MAC/nonce/期限/epoch/连接与未settled配额沿用，断连不重跑。pidfd打开或peer观察失败拒绝。

## 沙箱组合

Worker在执行任何用户代码前进入专用cgroup v2；设置memory.max、memory.swap.max、pids.max、cpu.max。cpu.max是速率，不是累计CPU预算；累计预算需可信计量/终止及独立测试，不能把轮询当内核硬限额。专用User/Mount/PID/Network Namespace、no_new_privs、seccomp syscall allowlist及实际启用的AppArmor组合校验。禁止迁移出cgroup、mount/ptrace/setns/敏感设备，默认无网络出口；只读映射runtime/工具/输入，独立工作/tmp/output，不挂Host UDS/DB/凭据/其他项目。

File Owner用root fd和openat2的BENEATH/NO_SYMLINKS/NO_MAGICLINKS语义、fd统计/file identity处理边界；硬链接、rename/交换、覆盖与并发仍独立验证。文件/工作区硬配额选择获准文件系统/project quota或严格Broker-only写入合同，失败不降级为字符串前缀检查。读审计记录实际inode/device/version hash与Artifact。

## 退出与恢复

终止使用cgroup.kill；观察包含子cgroup的cgroup.events populated=0、所有已钉住pidfd、stdout/stderr EOF、无外部producer、mount/namespace资源状态，再签候选ExitProof。cgroup为空不替代输出结束或完整历史成员证据。Host重启核对boot/cgroup inode/进程start identity/输出owner/锁；无法重建完整来源仍UNKNOWN_QUARANTINED，禁止重放。旧boot证明不自动生成新释放凭据。

独立用例：跨UID与同UID进程伪造、UDS路径置换、PID复用、namespace/cgroup迁移、fork/短命成员、seccomp绕行、network/代理/Unix socket旁路、管理库与其他项目、symlink/hardlink/TOCTOU、超时/producer遗留、审计失败、Broker/Host崩溃及OS重启。每项绑定实际OS/UID/GID/helper/profile/tool hash与原始日志；未运行保持NOT_RUN。

依据：[cgroup v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)、[no_new_privs](https://docs.kernel.org/userspace-api/no_new_privs.html)。正式部署需单独精确账户、目录/挂载、unit、LSM和网络授权与逐对象回滚。
