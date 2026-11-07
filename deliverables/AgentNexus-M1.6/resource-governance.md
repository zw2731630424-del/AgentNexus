# M1.6 Resource Governance Engine

已实现可信本地预算账本，覆盖 Worker / Project / Platform 的原子 reservation、accounting、release、持久等待及 UNKNOWN 隔离。实现位于 `source/src/agentnexus/resources/`，只使用原 KernelStore、FeatureRegistry、审计 outbox 和主线 NativeState 的 `m16_entities`，没有第二套身份/库/策略，也不修改历史五资源 claim。当前可运行范围为 **SIMULATED / APPLICATION_BOUND**，不会授权 OS 进程、任意 shell 或真实 Provider。

| 维度 | 单位与账本语义 | OS / 外部边界 |
|---|---|---|
| cpu_user_us / cpu_kernel_us | 累计微秒，分别永久 spent | Windows 严格合同 BLOCKED；OS 采集未新增 |
| memory_bytes | 并发容量预留；accounting 记录高水位 | Windows commit 限额原语与目标生产资格分开；不是整个物理 RAM |
| disk_bytes | 生命周期存储容量预留，闭合前保持 | 本轮无 OS 磁盘 quota；真实持久 Artifact 不能因进程结束就假定删除 |
| processes / workers | 并发槽预留 | 不等于 lifetime spawn 数；外部 producer 另须追踪 |
| io_read_bytes / io_write_bytes / log_bytes | 累计读、写和输出字节 | 本轮应用 ledger，不是设备吞吐 cap |
| network_connections / network_bytes | 并发连接容量 / 累计网络字节 | 目标范围由原 Policy/受控 Broker 管，不由数值预算授予网络权限 |
| model_tokens / model_requests / model_cost_micros | 累计 token、请求与固定模拟计费微单位 | 真 Key/Provider/真实费用均 NOT_RUN；未知发送或计费不得自动重试或当零 |
| wall_ms | 累计可信计量；expires_at 是起跑期限 | Deadline、等待、暂停分开；超时不证明退出 |

所有输入非负 safe integer；未配置维度等于 0，而非无限。容量维度为 memory/disk/processes/workers/network_connections；其余为 consumption。预算创建后 immutable；重复精确配置可读回，不能用重新 configure 清空 spent 或 held。当前没有预算窗口重置、币种换算、自动垃圾清理、未知资源释放或真实 disk 持久所有权转移；这些边界保持阻断。

每个 reservation 绑定完整可信 Subject（Agent/Project/Task/Session/runtime instance/model binding/resource budget/policy scope）、operation、boot、三预算 ID、模式、数量、revision、累计计量序号及 evidence hash。Worker budget owner 必须等于 runtime_instance_id，Project 必须等于 project_id，Platform owner 固定为 platform；同一 scope/owner 只允许一个预算，Worker ID 必须等于 Subject.resource_budget_id；不能通过别名新建预算重置 Worker 或 Project 用量。scope 或 Subject 替换拒绝。Agent 不持有 BudgetManager、NativeState、管理员 token 或原 Store。

三层在同一 `state.change` 的 BEGIN IMMEDIATE 中检查容量并修改 held，审计与投影同事务提交，await flush 后才能进行下一步。任何一层不足则全体不占用；可以 REJECTED 或进入最多 64 个的持久 WAITING。预留总数最多 4096、预算最多 256、闭合凭据最多 4096；账本满直接拒绝，不淘汰 nonce 或旧事实。分页上限 32/次恢复和等待推进，没有无限 Promise 队列。

状态为 RESERVED → ACTIVE → RELEASED；不能证明闭合时进入 UNKNOWN_QUARANTINED。WAITING 没有 held，仅在容量充足时原子转 RESERVED。过期只拒绝新 start/等待准入，不释放已持有额度；旧 boot 的 RESERVED/ACTIVE 恢复为 UNKNOWN，旧 WAITING 关闭为 REJECTED。不存在自动重复副作用路径。

`account` 是可信 owner 提交的**完整累计快照**；sequence 必须恰为原值+1，各维度只能递增。consumption 的差额写入三层 spent，并相应减少剩余 held，容量继续保持完整预留。重复序号、倒退、错误来源拒绝；实际超额不会截断，而是完整计入并将预算 OVERDRAWN、reservation UNKNOWN，阻止进一步 admission。不能因为账本准确记录透支，就宣称 OS 已阻止透支。

释放需要 owner 的 opaque 本地对象，JSON true、对象克隆和跨实例 token 均无效。`issueClosure` 只接受当前 boot 的 NEVER_STARTED/RESERVED，或 SIMULATED+ACTIVE+完整模拟 accounting。凭据绑定 reservation revision、operation、boot 并持久单次消费；起跑或核算改变 revision 后凭据过时。模拟闭合没有生产释放权。APPLICATION_BOUND 一旦 ACTIVE，没有真实 OS/外部闭合适配器就不能释放；`releaseProduction` 固定 BLOCKED。真实生产仍须原签名 ExitProof、独立最终裁定、完整 closure 与五资源版本合同。

disk_bytes 是容量合同：对本轮没有真实持久磁盘写入的模拟任务可随模拟闭合退还；真实任务如果仍拥有 Artifact/工作区数据，必须持有并转移到另一个已核实存储 owner，而当前没有该 API，因此保持 UNKNOWN。不能用“Worker 退出”假定 persistent disk 不再占用。

功能检查为 resource.registry / resource.worker.budget / resource.project.budget / resource.platform.budget；申请或起跑带 CPU 计量还要求 resource.cpu.accounting。关闭只阻止新准入/起跑，已存在的未知容量、核算与有证据的清理仍保留。严格 CPU 由不可配置代码固定拒绝；Feature ON、Policy DISABLED、证书或 admin JSON 都不解除它。关闭模拟应用功能也不回退到无预算执行。

公开 API：`configure(admin, subject, input)`、`reserve(admin, subject, input)`、`start`、`account`、`unknown`、`issueClosure`、`release`、`cancelWait`、`drainWaiters`、`recover`；只读 `budget` 和 `inspect` 也要求原 admin。统一预算向量与返回类型从 `resources/index.ts` 导出。Native Harness 只在可信调度 owner 内调用，并复用同一 Tool Gateway/Policy，预算通过不代替工具审批。

验证：资源聚焦 15 项 PASS（实际 SQLite/Feature/Audit，OS 与模型观察明确 SIMULATED）；原始日志在 `evidence/resource-line/`。覆盖并发三级竞争、跨项目/伪造 admin、累计 spent/held、重复序号、opaque token/重放/过时、UNKNOWN、64 等待上限、旧 boot、Feature OFF、审计屏障失败零 start、超额隔离及严格门禁。没有新 OS hard PASS。最终版本/数量以 resource-qualification.json 和最终聚焦日志为准。
