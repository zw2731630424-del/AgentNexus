# Process Tree / ExitProof 报告

本轮原语新增 create/assign/resume UTC、native Stopwatch wall、每个 pinned member 的 user/kernel CPU 与真实 CloseHandle 结果。Job 为空、终止请求、helper 退出、根退出、producer EOF、句柄关闭分别记录，任何一个都不单独授权生产释放。

| 场景 | 真实/模型结果 | 当前资格 |
|---|---|---|
| 正常退出、崩溃、hold 强终止 | 实际根/Job/EOF 及 native handle close 分开核验 | PASS，同账户原语 |
| 多层子进程 | 固定三层 Node 加 conhost；实际枚举和终止后成员 signaled | PASS，已观察成员；完整历史仍 unknown |
| 父退出、子残留 | M14 native orphan 与 M151 orphan 实际 root exit 早于 Job termination，子仍被观察 | PASS，特定 fixture；旧 M13 job-orphan 窗口未捕获仍 NOT_RUN |
| 子进程脱离 Job | 在 private Job 中真正请求 CREATE_BREAKAWAY_FROM_JOB，Win32 5 拒绝 | PASS，实际 OS；没有尝试脱离宿主执行沙箱 |
| Owner/helper 被强杀 | 外部 observer 先固定 root/两个 descendant 的实际创建时间与句柄，再杀本轮 owner | PASS，3 个 pinned Node producer 退出；不是完整未知 producer 证明 |
| PID 重用防护 | 错创建时间在固定句柄前拒绝 | PASS，真实负例；没有主动耗尽 PID 强造 OS 重用 |
| IPC 中断 | 管道关闭/超时/owner death 原语；Operation quarantine/五资源模型 | PASS，限定范围；生产组合 BLOCKED |
| Host 退出/重启、退出过程中真实 Host 崩溃 | SQLite reopen/旧 boot/claim 模型；完整独立 Host 尚不存在 | NOT_RUN/BLOCKED，不把本地 reopen 当 Host/OS 重启 |

Native membership_complete 与 release_authority 仍 false，proof_status=EXIT_UNVERIFIED。修前 CPU 58 场景有 2 个 root_exit_observed 取样先 false、稍后 members 全 exited 的时序不一致，history_complete 始终 true。修复使 cleanup break 同时等待所有 retained process handles，并沿用原截止；没有把 root/Job/EOF 合并或将历史未知升级为完整。最终 active=0 仍不能独自证明全部退出。Job GUID/进程 PID+creation、Worker Instance/Profile/boot/operation 与签名证明绑定保留。

可信 Supervisor 构造的证据还必须包含全部成员父链、退出信号、所有外部 producer、IPC channel、Sandbox token/network/filesystem/limits、Resource Ownership 与 Evidence Hash。WindowsSupervisor 未验证的 network/filesystem/limits 均保持 false。Native close success 只证明本 helper 释放对应句柄，不证明整个 sandbox 外部影响终结。

资源 owner 仍同时要求最终 Operation 裁定、原签名 ExitProof、独立 closure、精确五资源版本与一次性 release receipt。WRITER、WORKSPACE_LOCK、PROCESS_SLOT、WORKER_QUOTA、SANDBOX_RESERVATION 任一缺证都保留。旧 boot/未知成员/未 EOF/审计失败/未知副作用不自动释放，也不自动重试。
