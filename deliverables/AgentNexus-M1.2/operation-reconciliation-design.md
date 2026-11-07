# M1.2 Operation Reconciliation 技术设计

状态：实施合同；人工证据核实不是自动判断真实世界副作用的预言机。

执行审计继续区分 START_INTENT（调用尚未观察）、STARTED（调用已观察）、RESULT（结果持久化）、ACK_READY。操作投影另外记录 executor_state=NOT_INVOKED/UNKNOWN/SETTLED 与 reconcile_revision。START_INTENT 在调用前持久写 UNKNOWN；受信执行器观察到 handler 结束且输出 producer 完整消费后才记录 SETTLED。超时不是退出；非合作输出 producer 仍 UNKNOWN。异常不会重调用 handler 或再发 Permit。

恢复将未完操作隔离并追加 previous_state/原 intent 的恢复事实。无 START_INTENT 的 CLAIMED 可以保留 NOT_INVOKED 证据；有 START_INTENT 而无已确认 SETTLED 的操作保留 UNKNOWN，即使原 Host PID 已消失。RESULT 已存在仍需核实 ACK 窗口，不抹去 RESULT 审计。PREPARED 没有调用证据的请求关闭为 BLOCKED，不重跑。

管理员流程：PrepareReconciliation(request) → 返回 challenge_id/preview_hash → CommitReconciliation(challenge_id,preview_hash)。两步都验证可信管理员；challenge 绑定规范化完整请求、operation_id、原 intent_hash、expected_revision、理由、证据引用、outcome、是否释放 Writer、期限和 boot。Commit 在 gate 内验证真实 Artifact 字节/hash，并在同库事务再次检查 challenge/版本/退出状态，原子消费 challenge、追加裁定、更新投影和审计 outbox。并发只允许一次匹配版本成功；重放不能生成第二裁定。Gateway 请求仍活动时不允许裁定；存储故障导致最后持久投影仍为 CLAIMED/STARTED 时，请求结束后可进入同一核实流程，不能视为可重试失败。

裁定：CONFIRMED_APPLIED、CONFIRMED_NOT_APPLIED、UNKNOWN_QUARANTINED。证据为 1～8 个已存、非空、总量 ≤1MiB、完整读取验证的 ArtifactRef；管理员必须记录具体理由。证据内容的现实含义由可信人工核实，内核证明引用完整性、授权、绑定和不可覆盖性；不能把 hash 验证称为内容真实性证明。

UNKNOWN 可通过新 challenge 和新 expected_revision 追加后续核实；最终 CONFIRMED 只裁定一次，不覆盖旧记录。单独 RELEASE_WRITER 行为也走相同管理员 challenge，必须引用已有最终裁定且新版本精确匹配。UNKNOWN 禁止释放；执行器仍运行或 executor_state UNKNOWN 禁止释放；无论管理员怎样传参都不能把退出自报为 true。当前没有 OS exit verifier API，因此跨崩溃缺退出观察的 claim 可能永久隔离，交 M1.3 Broker 处理。

裁定表有唯一 request_id、(operation_id,revision) 和禁止 UPDATE/DELETE 的触发器；原审计不可变。每行含 adjudicator、时间、理由、证据、原 intent、前一版本、操作类型及 writer_released。管理员可以确认副作用同时选择继续持有 claim，待本地可信退出观察后以 RELEASE_WRITER 释放。CONFIRMED_NOT_APPLIED 也不自动重新执行；新执行必须有新的 call_id/operation/精确审批。

验收覆盖：真实子进程在调用前、调用后 STARTED 前、handler 完成结果前、RESULT 后 ACK 前强杀；重启后原调用次数/intent/Writer 保留；超时仍运行、并发核实、无证据、错 intent、重放、UNKNOWN 释放和退出未知释放负例。OS 进程树、硬断电及真实外部 Provider 均不从本地测试推导 PASS。
