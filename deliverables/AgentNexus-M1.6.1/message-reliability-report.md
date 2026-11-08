# M1.6.1 Message Bus 可靠性

已实现持久消息与 Task 的可信交接、Operation 幂等接收、独立任务处理状态、持久唤醒 outbox、有界恢复及 Coordinator 固定通知。新增 Message 测试 **16/16 PASS**，包括两种实际 Node Host 进程终止/锁恢复场景。Task owner 的单元投影与指定故障屏障明确标为 SIMULATED；真实 Scheduler/五角色集成由主执行者维护与验证。

源码为 `source/src/agentnexus/harness/messages.ts`；没有修改 M0—M1.6、旧测试或共享 State/Scheduler/Index。实际读取清单和最终五个本人源码/测试 SHA256 在 [read-manifest-v4.json](evidence/reliability/read-manifest-v4.json) 与 [verification-v4.json](evidence/reliability/verification-v4.json)。

## 消息送达与任务执行

| 持久状态 | 含义 |
|---|---|
| QUEUED | 创建/入队事务已提交，等待消费；对调用方成功返回还要求 Audit 导出 ACK |
| LEASED | 送达租约已持久化，绑定 receiver、boot、随机 token、墙钟和单调截止时间 |
| ACKNOWLEDGED | 收件确认；普通 Agent ACK 不等于接受 Task，更不等于任务完成 |
| EXPIRED / REVOKED / DEAD_LETTER | 过期、撤销或内部重投上限终止；保留原封套和证据 |
| INDETERMINATE | 外部副作用或交接结果不确定，禁止自动重投 |
| Handoff ACCEPTED | 可信 Task owner 已在同一事务接纳精确消息来源 |
| Handoff PROCESSED | 可信 Task 的模型 turn 相对接受时确实增加 |
| Handoff COMPLETED | 可信 Task 为 SUCCEEDED、真实 result_ref 完整哈希通过、reservation_id 为 null |
| Handoff FAILED / INDETERMINATE | Task 失败/取消/超时或 UNKNOWN，不伪装为成功 |

沿用 LEASED/REVOKED 命名分别表示本协议的 DELIVERED/CANCELLED。CREATED 与 QUEUED 在一次原子入队事务中完成，不制造没有持久事实的中间成功状态。`message_type=RESULT` 或 Agent 自报完成文本不会改变 Task。

所有消息具有稳定 Message ID、接收 Task ID、Operation ID、Correlation ID、逻辑 sender/receiver、原始 payload 引用及 hash、入队序号、送达/确认时间、attempt/lease/revision。未指定 Operation/Correlation 时使用稳定消息 ID；显式 Task ID 必须等于可信 resolver 的接收 Task。业务消息去重不绑定短期 session，重启不会生成另一份同键消息。相同优先级按持久入队序号 FIFO；不同优先级按既有 priority 排序。

## 原子交接 API 与任务幂等

`handoff(admin, receiver, messageId, leaseToken, apply)` 返回 `Promise<MessageHandoff>`。该接口只对可信 Host 开放，不能从 Agent 门面传入管理能力。它在一个既有 NativeState/SQLite 事务中：

1. 核对当前 resolver 的完整 receiver Subject、逻辑 project/agent/task、消息权限及有效租约。
2. 验证原始 payload 引用和接收读取权限。
3. 同步执行可信 `apply(message)`，要求真实 TASK 的 received_message_ids 和 history 含该精确消息/来源；异常、缺失接纳事实或异步回调使整事务回滚。
4. 写入 MESSAGE_OPERATION 幂等记录和 MESSAGE_HANDOFF 接收 outbox，原子地把消息置为 ACKNOWLEDGED。
5. 经过原 Audit/outbox 导出和持久 ACK 后返回。

主执行者的 `acceptMessageInTransaction` 负责 Task 更新，`index.dispatch` 使用本接口包裹接纳。没有 SQLite 事务自动涵盖外部工具副作用的假设。

已交接消息再次调用时，旧 token 不能授予新执行权：当前 receiver 仍须与 resolver 完整匹配、逻辑 scope 和原始 payload/Operation/Correlation 必须精确一致；返回已有 receipt，不再次调用 apply。ACK 丢失后仍是同一 Task 接收事实。不同 Message ID 但相同 Operation/Task/Correlation、相同 sender/receiver/type/payload 的副本仅新增带 duplicate_of 的 receipt，不重复接纳。改变 payload 或关联合同则 `MESSAGE_OPERATION_CONFLICT`，不覆盖原 Task。

`reconcileTask(admin, actor, taskId)` 只从可信 TASK 投影及真实结果字节推导状态，Agent 不能传入 completed/PASS。它允许可信 owner 在 Agent STOPPED 后核对；不要求已结束 Agent 再变为可运行。结果读取后的提交重新检查 Task revision。普通 ACK 不创建 receipt，不增 Task turn，不释放资源。receipt 进入 INDETERMINATE 后，后续自报 SUCCEEDED 不能自动清除未知状态。

## 丢失、退出与恢复

消息与 MESSAGE_WAKE 在同一事务入队，只有入队持久 ACK 后调用唤醒回调。回调失败保留 PENDING 与审计，已提交消息不会被删除。可信 `recover(admin, limit=32)` 可以在发送方退出或 Host 恢复后重新尝试有权限的接收方唤醒；回调最多重试八次，之后保留待核对事实，不无限积累重试。通知按 at-least-once 合同，回调必须幂等，不承诺通知恰好一次。

重启、租约截止、消息过期和撤销均保留历史。内部已知未完成的交付在有界 attempts/延迟后可重新领取；新 receiver session 的重绑定产生追加审计，旧 lease/token 无效。任何已领取 EXTERNAL 消息，即使接收方自报 KNOWN_NOT_SENT，也不能证明外部效果没有发生；租约丢失、Host 重启、过期或撤销均转 INDETERMINATE，不自动重试。

全局恢复每次最多提交 **32 条 lease/expiry 转移**，防止多个项目同时过期时一个审计事务撑满 4 MiB outbox。后续显式恢复/收件继续排空；尚未扫描到的过期 QUEUED 记录也不能被领取。80 条真实持久消息的压力验证得到 32、64、80 的分批恢复/过期计数。恢复方法不执行模型、Task 或工具，不释放 UNKNOWN 资源。

发送方和接收方身份均由 Host resolver 决定。sender 退出不删除已提交消息；receiver 退出后旧门面无效，恢复必须绑定当前同任务 runtime。权限在发送、消费及 ACK/交接时复查。通用跨项目发送、错误 Task、旧 runtime、失效 payload 引用均拒绝；消息 payload 不能授予工具或外部能力。

## Coordinator 固定跨项目通知

`enqueueCoordinatorNotice(admin, sender, receiver, payload, dedupKey)` 是窄可信接口。要求 sender 的实际类型为 COORDINATOR、sender/receiver 均与当前 resolver 完整匹配、Host authorize 对固定 `COORDINATOR_NOTICE` 明确允许。payload 必须已在 receiver 的 project/task 捕获并通过完整引用校验；固定 INTERNAL、priority 0、五分钟期限，不接受 effect、command、tool 或授权参数。

封套 project/task 属于接收项目，sender 保留真实原项目身份。主执行者的 `notifyProject` 仅对拥有目标 read_projects 的 Coordinator 开放，把 origin 与通知文本捕获到接收任务域；authorize 只为此固定类型放行跨项目。通知不附带跨项目原文读取权限、工具能力或项目决策权。普通 send/sendText 仍要求同项目。队列、容量、唤醒、租约、交接、重投、恢复均复用同一 Message Bus。

通知去重绑定逻辑 sender、目标 project/agent/task、固定类型和 dedupKey；请求哈希绑定原始内容对象 SHA256 及范围。重复捕获相同结构化文本仍复用首条消息和首个不可变原始引用；改变内容冲突。真实本地程序测试向两个项目任务入队/领取/交接，验证原 origin 保留、普通跨项目 send 拒绝、双向跨项目原文读取拒绝，并覆盖错误 admin/type/runtime/权限/payload 归属/Task/重复内容冲突。五角色真实 Harness 集成结果见主执行者报告。

## 边界与测试证据

保持每项目默认 256 pending /4 MiB 引用范围字节、硬上限 1024/16 MiB；全部持久消息最多 4096 条，消费批次最多 16，租约 1—60000 ms，尝试 1—8 次。Task 接收 receipt 最多 32 条。达到容量显式背压，终态历史不会因新请求被静默淘汰。存储不是无限队列，也不提供未知副作用的自动重放接口。

最终 [原始 TAP](evidence/reliability/final-04/tests.tap)、[逐条 JSON](evidence/reliability/final-04/results.json)、`final-04/message-observations-*.json` 与 [验证绑定](evidence/reliability/verification-v4.json) 包含状态、Task 接收次数、进程 exit、真实 abandoned-lock 核对、消息/Operation/Correlation 及批次计数。16 项覆盖普通 ACK 与 Task 分离、事务回滚、Operation 副本/冲突、并发发送/领取/FIFO、权限撤销与 runtime 更替、发送者退出、持久唤醒、过期/撤销及所有在途 EXTERNAL 未知、缺失结果/持有资源/UNKNOWN 不能完成、批量恢复背压和 Coordinator 固定通知。

两项真实进程测试分别在领取内部/外部消息后终止 Host，以及在 Task/receipt/消息 ACK 已真实 fsync 而调用方尚未收到返回时终止 Host。测试实际启动、SIGKILL 并等待子进程退出；KernelStore 用 OS 确认旧 PID 死亡后恢复遗留锁。第二项等待屏障是故障注入，崩溃和落盘不是伪造；恢复后 adoptions=1、重复 apply=0。它们不是 OS 重启或硬断电资格。

最终新增两组件 29/29 PASS（Context 13 /Message 16），final-04 加原 Context/Model 回归共 54/54 PASS。此前 run-03 的原 Context/Message/Model 回归加当时新增 58/58 PASS，run-02 含原 Harness 82/82 PASS。第一轮 4 FAIL 来自审计 Identity 字段错误，已修并保留 `run-01` 原件；随后 25、27、28 项各轮原件也分别保留。独立审查指出的 Context 读写池组合死锁另有修前 12 PASS /1 FAIL 原件，修后组合场景无取消完成，见 Context 报告。最终 strict TypeScript PASS，34 个继承测试/fixture 文件字节相同。最终全量回归、独立审查和五类 Agent 集成采用主执行者报告，不能由本组件局部 PASS 代替。

本组件没有读取真实 Key、调用真实 Provider、改变 OS 设置、执行科研或 Commit/Push。可信本地模块不构成恶意同进程代码的 OS 隔离；严格 CPU、生产执行链和无法核实的外部副作用继续保持原资格/UNKNOWN 边界。
