# M1.6 CPU 四合同

状态：合同分离及可信账本已实现；严格 Windows 累计 CPU 能力始终 **BLOCKED**。M1.5.1 的最终 58 项 **56 FAIL / 2 PASS** 和原始 M1.5 的 10 FAIL 原件均保留，M1.6 没有重跑该矩阵，也没有更改旧预算或裁定。账本测试不能签发 OS 资格。

| 合同 | 单位、对象与边界 | M1.6 实施/资格 |
|---|---|---|
| CPU Bandwidth | Worker/Project/Platform 在调度窗口内可用的份额，须声明处理器与父层基准、窗口、突发规则 | registry 描述 Windows CPU_RATE 与 Linux cpu.max；目标 OS 资格 NOT_RUN |
| CPU Consumption Budget | 已归属执行实例的累计 user/kernel 时间分别计入 Worker、Project、Platform；Task 由 reservation operation 关联 | `cpu_user_us`、`cpu_kernel_us` 持久预算/预留/核算；属于应用账本；严格 OS 上界 BLOCKED |
| Execution Wall Deadline | 生命周期的实际持续时长；创建/启动/执行/等待/暂停/恢复/结束分别记录 | 账本 `expires_at` 只阻止新起跑，不释放既有容量；`wall_ms` 是累计计量，Scheduler/生命周期持有实际时钟 |
| CPU Accounting | 原始进程与 Job/cgroup 计量、父子关系、来源和误差；项目/平台由同一归属账本聚合 | 接受可信 owner 的累计快照与证据 hash，严格递增 sequence；本轮 OS 输入仅模拟，没有新原生采集器 |

原严格合同保持：80ms 用户态预算 + 50ms 容差；300ms + 50ms；3000ms + 150ms。容差仍为 `max(50ms, 5%)`，不是平均值、分位数或可豁免阈值。原合同没有 kernel 时间硬上界；kernel 消耗必须另记，不能从 user-only PASS 推断总 CPU 保证。若以后提出不同保证，必须独立命名和审批，不能替换这个合同。

Windows CPU_RATE 的 hard cap 约束当前调度窗口的处理器周期；达到窗口份额后等待下一窗口。嵌套 Job 的份额相对父层计算。它不会在生命周期累计消耗达到某个毫秒数后永久停止。[Microsoft CPU_RATE](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_cpu_rate_control_information)

JOB_TIME 使用 100ns 表示的用户态时间，OS 周期检查；设置新 Job 时间限额会基于已有消耗确定新的终点。官方没有给本项目所需的 50/150ms 超支界限。结合保留的失败证据，本 release 不具备该严格能力；不能用更长墙钟截止、CPU_RATE、采样杀进程或一例成功替代。[Microsoft BasicLimit](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information)

Windows Job 的 `TotalUserTime` / `TotalKernelTime` 包含活动成员及已终止成员；period 字段另有重置语义。GetProcessTimes 按进程内各线程累计 user/kernel 时间，多核累计量可以超过墙钟。100ns 是表示单位，不能声称具有 100ns 测量精度。[Job Accounting](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_accounting_information)、[GetProcessTimes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes)

历史 24/58 帧的进程求和大于 Job 读数，user/kernel 最大差各 62.5ms，原因仍 INCONCLUSIVE。新采集器必须保留原始 100ns 整数字符串、每个 retained PID+creation identity、采样先后、Job 身份和完整性标记；微秒入账需明确取整且不得向下抹掉消耗。不得排除 conhost、子进程、已退出成员或未知 producer。未知统计不能当零，也不能用差额解释掉已实测的数秒超支。

三级聚合只计一次 owner 已验收的 reservation 快照。消费维度按累计差额加入 spent，同时减少尚未消耗的预留；容量维度继续保留全部上限，直到可信闭合。超额值原样入账并冻结进一步 admission；不把数值截到预算。该账本控制后续申请，不能倒推已经发生的 CPU 消耗受 OS 限制。

任务启动、运行、资源等待、消息等待、暂停和终止必须有独立事件。跨 Host boot 的单调时钟不可拼接；恢复保持 UNKNOWN，不能依据一个旧墙钟、过期时间、取消请求或根进程退出回收资源。所有未知副作用保留原 operation，不自动重试。

完整方案比较与来源见 [cpu-backends.md](cpu-backends.md)，实现边界见 [resource-governance.md](resource-governance.md)。
