# M1.6 CPU 后端研究

2026-11-08 查阅下列官方 primary 文档。没有新 Windows CPU 资格负载，没有 Ubuntu 访问、系统配置或外部模型调用。下面“可支持”是机制选择分析；它不等于目标主机已经部署或 PASS。M1.6 新 OS 后端均 NOT_RUN，Windows 严格累计合同保持 BLOCKED。

| 方案 | 实际限制什么 / OS 强制性 / 子进程 | 检查周期 / 超限停止 / 可验证上界 |
|---|---|---|
| Windows CPU_RATE HARD_CAP | 调度窗口 CPU 份额；OS 调度机制；覆盖已归属 Job 及子 Job | 份额按窗口补充。文档没有把它定义成生命周期累计预算；不能由 rate×wall 推出本项目严格累计终止上界 |
| Windows JOB_TIME | Job 累计用户态执行时间；OS 周期性检查；关联进程求和 | 检查周期和终止延迟未有符合本项目的界限；原严格合同实测 FAIL。kernel 时间不在该限制中 |
| 外部可信 Supervisor | 当前实现可发 Job 终止请求、观察树/输出；OS 执行终止，阈值判断仍在用户态 | Supervisor 运行、采样、IPC、终止和 I/O 完成延迟分别存在。未有所有环节的可证上界；只能作为 containment 和失败关闭 |
| CPU 使用量采样 | 观测累计计量、聚合与告警；采样和判断非 OS 预算原语 | 理想间隔不是最坏响应。即使知道采样间隔，也缺调度延迟/并行度/停止延迟界；不能声称严格硬累计上界 |
| 进程分片执行 | 控制下一片是否准入；对合作式固定工作单元有效 | 当前片若没有可信最坏消耗界，停止边界仍不可界定；任意 OS 进程没有可安全强制 checkpoint 的通用合同 |
| Worker 阶段预算 | 阶段前预留、阶段后核算，防止后续阶段继续透支 | 只能把已经独立成立的阶段上界相加；阶段本身没有硬上界时，切更多阶段不产生硬保证 |
| Linux cgroup v2 | `cpu.max` 带宽、`cpu.stat` 计量、`cgroup.kill` 整组终止；具有层级与 scheduler 限制 | quota 按 period 补充，不是累计终止限额。采样 cpu.stat 再 kill 仍是监控终止；未证明原 50/150ms 容差 |
| Wasmtime fuel / epoch | 对编译后的 Wasm guest 做运行时计量/中断，不是 OS CPU 毫秒 | fuel 单位不是实际 CPU 时间；epoch 是检查点中断。宿主调用和运行时工作必须另计，不能替代原生进程严格 CPU 合同 |

CPU_RATE、JOB_TIME、Supervisor、采样这四行的依据分别为 [CPU_RATE](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_cpu_rate_control_information)、[BasicLimit](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information)、[TerminateJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-terminatejobobject) 与 [TerminateProcess](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-terminateprocess)。TerminateProcess 对外部目标异步发起，挂起 I/O 结束或取消前不能退出，因此成功返回不等于已观察退出；未由文档承诺的数字时限不在这里补造。

分片与阶段预算行是本项目的推论：把不可界定的当前阶段分割为多次准入，不会证明每次执行的最大消耗。这两个方案在本轮没有 OS 实现和实测。不能把合作式工具或模拟 provider 正常返回推成任意程序上界。

Linux 的单位、层级、计量、kill 和 scheduler 范围来自 [cgroup v2 官方合同](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)。quota 的周期补充、per-CPU slice 与 throttling 说明来自 [CFS Bandwidth](https://docs.kernel.org/scheduler/sched-bwc.html)。它们支持 Ubuntu 后续带宽/内存/pids 设计，不支持直接签累计 CPU 资格；具体内核、配置、class、burst、delegation 和不可迁移边界仍须固定并测试。

Wasmtime 的 fuel 耗尽会 trap，trap 时精确 fuel 统计也有明确限制；epoch 使用插桩检查点。[Wasmtime Config](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html) 支持以后采用单独“guest fuel”合同的选择。本轮没有引入该依赖或执行 Wasm；从 fuel 到 CPU 毫秒没有已验证换算，宿主函数也不自动受 guest 燃料约束。

同一官方文档还明确：阻塞宿主调用需 embedder 处理；bulk memory 指令的 epoch 检查可能仅在指令开始发生，最长片段还取决于操作大小和内存界。故不能只设置 epoch tick 就声称原严格毫秒上界。分片/阶段/采样的子进程覆盖也仅限可信容器归属与计量已证明的成员；脱离实例或来源未知的 producer 不能被默认排除。

| 方案 | 多 Worker 并发 / 恢复 / 长期运行 | 对 AgentNexus 合同的结论 |
|---|---|---|
| CPU_RATE | Job 层级可分配；重启后需重新核实 Job 与所有权；长期带宽设计可行 | 只候选 bandwidth，NOT_RUN；不修复 consumption |
| JOB_TIME | 独立/嵌套 Job 可计量，但旧 boot 不恢复权限；长期有限预算到点终止 | 原严格 consumption BLOCKED，不继续资格包装 |
| Supervisor | 需持有全部 Job/进程/producer，watcher 本身也有资源预算；崩溃后 UNKNOWN | containment 可辅助；完整 ExitProof 与 release 仍必要 |
| 采样 | 可聚合多 Worker，数据有界落盘；重启缺测时保留未知；长期需背压 | accounting/observe-only，不能升级 HARD_OS |
| 分片 | 多实例各自 ledger；只恢复已验证 checkpoint，不能重放未知副作用 | 适合固定有限任务的另一合同，非当前严格预算替代 |
| 阶段预算 | 三级预留与阶段 checkpoint 有界；未知阶段不再派发 | 本轮应用预算基础已实现；阶段 CPU 硬界未实现 |
| cgroup v2 | 层级适合 project/platform；迁移权限、旧组和 boot 分开核验 | Ubuntu 准备方案，所有 OS 验收 NOT_RUN |
| Wasmtime | 独立 Store 与全局 host 预算需另设计；trap/checkpoint 恢复不自动成立 | 新受限 guest 后端研究项，NOT_RUN；原生严格合同不变 |

Windows 嵌套 Job 会聚合下层用量，终止作用于子 Job，但不同限额有不同继承语义，不能泛化所有资源。[Microsoft Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs)

后续先做获准目标的只读版本/能力固定，再选择独立带宽合同或 guest fuel 合同进行设计审查和小型资格验证。只有文档支持与目标 OS 实证同时满足精确合同，能力才可单独升级；有限成功永远不能推导文档未承诺的最坏上界。
