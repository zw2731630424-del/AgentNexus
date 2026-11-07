# Windows Sandbox 实现与验证边界

实现：`src/agentnexus/runtime/windows/NativeProbe.cs` 通过现有 PowerShell/.NET 内存编译，P/Invoke 读取真实进程 SID、PID、GetProcessTimes 创建时间和 OS session；创建带精确当前用户 DACL、FIRST_PIPE_INSTANCE、REJECT_REMOTE_CLIENTS 的临时管道；服务端读取真实 pipe peer 并与预期进程身份逐项比较。消息中假 PID=1/SID=SYSTEM 不作为身份。使用挂起创建→加入不允许 breakaway 的 Job→Resume；设置 KILL_ON_JOB_CLOSE、进程数量及内存上限；终止后另等 Job 为空与已持有进程句柄 signaled。创建带 restricting SID 的 Restricted Token，只验证 token 标志，没有以它启动正式 Worker。

真实环境：Windows NT 10.0.26200.0 / PowerShell 7.6.9 / Node 24.15.0。工具隔离内 pipe 客户端 EPERM，原始失败保留。获准在工具隔离外运行相同固定探针后，合法 peer 对照通过、同 SID 非预期进程被拒绝；不是独立 OS 用户之间的隔离证明。Job 正常与终止观察通过；父退出而子仍运行窗口没有观察成功，标 INCONCLUSIVE。原生采样显式 membership_complete=false，不能生成完整退出证明。不同运行结果不能覆盖或合并成虚构全 PASS。

当前缺口：独立 Host/Worker 用户、AppContainer/网络拒绝、实际文件访问隔离、最小 token 启动、不可逃离的完整生命周期成员追踪、文件大小/CPU 硬限额、重启后 Job 重新核实。完整 `security.sandbox.windows` 和任意执行仍 BLOCKED，Broker.dispatch 与资源 release 均硬拒绝。声明 profile 不是 OS 实施。

Windows 原语依据：[命名管道安全](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)、[管道 peer API](https://learn.microsoft.com/en-us/windows/win32/ipc/pipe-functions)、[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)、[Restricted Token](https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens)、[AppContainer](https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation)。文档支持设计选择，实际结果以原始日志为准。

下一步系统变更及回滚见 [部署授权清单](deployment-approval.md)；本轮未执行该清单。
