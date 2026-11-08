# Task Scheduler 与可靠交接

Task ID 与完整创建参数的 SHA256 固定绑定；重复 ID 的预算、输入、验收合同或 Gate 条件改变均拒绝。消息重投不能新建第二个 Task 或再次执行已终态 Task。

`MessageBus.handoff` 在同一 NativeState/SQLite/outbox 事务内同步采纳 Task 的 message IDs/history、写 operation receipt 与 handoff receipt，再 ACK 消息。ACK 只表示可靠接纳。PROCESSED 根据可信 turn 增量推导；COMPLETED 要求可信 Task SUCCEEDED、真实 result Artifact 完整验证及 task reservation 已结清；UNKNOWN 副作用不重投。

启动恢复不调用模型、不执行工具。安全 WAITING/QUEUED 等待显式派发；在途或持有未验证资源的 Task 继续 UNKNOWN。角色与项目暂停、单 Agent 活动 turn、依赖、等待/取消、预算竞争和旧会话批准失效沿用原门禁。

显式任务 handoff 先持久冻结目标 TaskInput、规则 binding、绝对截止、依赖、输入与 Gate 合同，源 Task 同事务变为 HANDOFF_PENDING。目标创建后，同事务完成去重来源继承、源状态与 handoff plan。计划未完成时源/目标均不能执行；Host 重开保留 pending marker。重试复用同一 wall 参数与 creation hash，完成后的重复请求直接返回既有目标，不追加历史、不重复任务。原始上下文和授权记录只追加。

新任务捕获 current Rule Registry；旧任务的来源固定不变。规则迁移要显式可信授权 Artifact，追加 migration 与新合同来源、保留旧合同，并清空旧 Gate record 绑定。新规则增加了旧任务合同未涵盖的强制 Gate 时拒绝该迁移，要求重新明确任务合同。

必需 Gate 在派发、模型 turn 和 LOCAL_WRITE 前由程序断言：缺记录、legacy PASS、BYPASSED、错候选/规则/epoch 均不能放行。受 Gate 保护的写入必须走 Storage Owner，实际 source 内容哈希必须等于 Gate candidate；“A 通过、B 写入”被拒绝。

测试覆盖五角色并发、两个子 Agent 并行双向/同级消息、跨项目共享资源竞争，以及 Receiver/Host 实际子进程终止后 ACK 与 lease 恢复。长期驻留服务和 OS 重启仍 NOT_RUN。

公开 sendText / Coordinator 通知在不可变原文 capture 前保存草稿。草稿绑定 boot、owner nonce 和完整 input hash：同 boot 真正在途调用仍互斥；已结束的内部 capture 失败标为 RETRYABLE；旧 boot 的精确输入可重新取得 capture 权。只有尚未发布的内部原文捕获被恢复，已经入队的消息仍按原 ID 去重，不重做外部副作用。真实 Host kill 在 MESSAGE_TEXT_ADMITTED ACK 后的重开，以及 2 活动/16 等待饱和后同 boot 精确重发均实测一条消息、一个草稿；重复 Coordinator 通知也不重复追加 Context。
