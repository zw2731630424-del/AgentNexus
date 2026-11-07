# CPU Hard Limit 根因分析

## 裁定

**当前目标保证失败的直接机制是：JOB_TIME 周期性检查用户态累计时间，没有可用的超支时延上界，不能满足 80ms+50ms、300ms+50ms、3000ms+150ms 的既定合同。** 本轮确认配置/分配和100ns单位未错，Job自身已报告预算越过后仍长时间运行；逐进程与Job最终统计还有小额差异，来源单列INCONCLUSIVE。分类 OS_BEHAVIOR_LIMITATION。精确内核检查周期、外层 Job 对目标未部署账户的影响仍 INCONCLUSIVE；不声称已定位 Windows 内核某个缺陷或所有环境的根因。

另一独立问题是 TEST_FIXTURE_ERROR：M1.4 继承断言以非 helper DEADLINE 作为成功，允许数秒超支被判 PASS。M1.5 严格资格已经纠正独立裁定，本轮不修改旧测试预期，不用它偶然通过放行生产。

## 时间与资源模型

| 量 | 实际来源 | 解释 |
|---|---|---|
| 外层 Wall Clock | Node performance.now | 包含 helper 编译/启动/RPC/退出，不能当 CPU |
| Native wall | Stopwatch | 创建、分配、恢复、树/EOF 观察与清理窗口 |
| Process user/kernel | GetProcessTimes 的保留句柄 | PID+creation time 绑定，已退出对象也保留计量 |
| Job cumulative user/kernel | QueryInformationJobObject(BasicAccounting) | 所有关联进程及已退出成员；与进程求和对照 |
| Period user/kernel | BasicAccounting period 字段 | 调查样本未见预算被软件重新起算；不是墙钟 |
| CPU_RATE | CpuRateControlInformation | 调度带宽 hard cap，不是累计执行时间预算 |

JOB_TIME 只限制 user mode；kernel time 单独记录，未声称总 user+kernel 硬上界。没有用更宽的墙钟限额代替 CPU 成功。CPU 原始 packet 的完整用户态/内核态数据均留存。

## 原始十次失败逐次对照

| Case | 预算ms | Job user ms | Job kernel ms | 终止路径 | 原结果 |
|---|---:|---:|---:|---|---|
| single-80-1 | 80 | 4953.125 | 15.625 | DEADLINE | FAIL |
| single-80-2 | 80 | 4953.125 | 15.625 | DEADLINE | FAIL |
| single-80-3 | 80 | 156.25 | 78.125 | OS quota exit | FAIL |
| multi-300-1 | 300 | 14406.25 | 312.5 | DEADLINE | FAIL |
| multi-300-2 | 300 | 14421.875 | 218.75 | DEADLINE | FAIL |
| child-300-1 | 300 | 546.875 | 62.5 | OS quota exit | FAIL |
| child-300-2 | 300 | 4796.875 | 109.375 | DEADLINE | FAIL |
| long-3000-1 | 3000 | 6375 | 187.5 | OS quota exit | FAIL |
| multi-300-3-concurrent | 300 | 14140.625 | 265.625 | DEADLINE | FAIL |
| single-300-4-concurrent | 300 | 4796.875 | 78.125 | DEADLINE | FAIL |

全部有私有 unnamed Job、flags 8972、CPU rate 10000、JOB_TIME 与 TERMINATE readback，以及 assigned_before_resume=true；没有发现其他 Worker 错加同一个 Job。相互独立并发 Job 使用不同 GUID/句柄。历史 packet 没有精确 create/assign 时间，不能事后伪造。

## 本轮对照排查

- 未改预算/截止的调查时间序列中 Job 与 pinned process 计量量级一致，预算早已越过，period 与 total 未重新归零。最终58帧逐进程复算发现24帧存在小额负差，最大user 62.5ms、kernel 62.5ms，均为15.625ms量级；来源INCONCLUSIVE，不能断言精确相等或排除所有资源统计误差。详见 evidence/cpu-accounting-reconciliation.json 与独立 [算术补充](evidence/independent-review/accounting-addendum.md)。Job自身已超过既定上界数秒，且该差异方向是Job小于逐进程总和，不能用它把这些FAIL解释为合格或放宽预算；不猜测内核更新/取整机制。
- 单 Worker 的第二进程是 Windows conhost.exe，user CPU 为 0 或一 tick；它仍留在 Job 计量/树中。multi/child 的 6/4 成员不是任意排除的外部负载。
- 挂起创建 → 精确 AssignProcessToJobObject → IsProcessInJob/初始成员核验 → ResumeThread，排除本代码路径的执行前加入竞态。配置结构、100ns 换算、info class、end action 均与 readback 相符。
- AppContainer 调查样本在 80ms 下累积 2906.25/4765.625/4828.125ms；宿主同账户对照 3281.25/4734.375/4796.875ms。两类均有外层 Job，不能宣称得到无嵌套目标部署对照。
- 调查副本移除独立 CPU_RATE 设置（预算仍 80ms）仍为 4734.375/781.25/4750ms；另加同样 80ms PROCESS_TIME 仍为 4750/4468.75/4718.75ms。只是诊断变量，不进入产品或资格，也没有启用软件 CPU 杀死策略。
- 部分由 OS quota 状态退出，部分必须由 helper DEADLINE containment 终止；仅发送请求不算退出，退出/树空/producer EOF/句柄关闭分别核验。
- 所有重跑保留。没有把机器负载当原因；修前 4825 集合的 58-case 与完整回归有 20 个时间重叠样本，已单列 known-background-workloads.json。ONE_TEST_JOB 表示一个 CPU 资格 Job，不表示机器空闲。目标主机完整 idle/saturation load 矩阵仍 NOT_RUN。

调查原始 `JOB_CONFIGURED` 标记的取样位置实际在进入设置语句之前，应理解为 Job 创建后、配置前的标记，不能用它证明设置完成时间；设置/readback 的代码序列与新产品的 create/assign/resume 字段才是证据。这个诊断标签误名不改变任何 CPU 数值或资格结果。

## 整改与剩余

没有声称修复内核硬预算。实际整改是能力合同和失败关闭：resources.ts 固定拒绝当前 REAL_WINDOWS 执行；Host prepare 在准备槽/创建之前拒绝，Broker 在消费/START 前也拒绝，完整签名证书、Policy DISABLED、Feature ON 均不能覆盖。原生 helper 仍可由可信测试运行同样的临时原语，不能凭它绕过产品 Broker 门禁。

严格预算的新 FAIL 主要分类为 OS_BEHAVIOR_LIMITATION。修前两例 history_complete=true，但先取样 root_exit_observed=false、稍后 members 全 exited，属于 PROCESS_LIFECYCLE_RACE；已在原 cleanup 截止内等待全部 retained process handles，不改变 CPU 限制。原始观察不一致与所有失败保留，仍不能签发完整生产 ExitProof。原始和本轮逐 case 分类在 cpu-failure-classification.json。因上界缺失，不能由有限样本推导严格保障；M1.6 必须选择能证明合同的执行后端，或明确另行评审降级产品合同。

API 依据：[用户态时间限制与周期检查](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information)、[独立 CPU 带宽 cap](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_cpu_rate_control_information)、[嵌套 Job 资源累计](https://learn.microsoft.com/windows/win32/procthread/nested-jobs)。文档语义与本轮实测结合得出上述限制，不把文档替代 OS 证据。
