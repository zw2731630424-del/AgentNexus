# Audit Trail Engine — M0.1 规格 v0.2

状态：设计已形成；实际实现与验收结果另见本版本 reports，不继承 M0 的 PASS。M0 原件与清单保持原位。新增依据为本轮用户的全操作审计要求，沿用 M0 的原生协议和可信 Broker。

## 四类数据与身份

| 数据域 | 权威内容 | 写者 / 读取 |
|---|---|---|
| Context Archive | 系统实际观察到的用户、模型、Agent 交互原始字节及工具交互 | 可信捕获器；有限范围检索，不给模型写权限 |
| Audit Trail | 请求、检查、授权、领取、执行、结果、恢复等实际事实 | Host/Broker/执行器经认证入口；Agent 的“我已执行”只能是声明 |
| Artifact Store | stdout/stderr、文件快照、模型原响应、测试日志等对象 | 单写流，哈希定位；对象 ACL/敏感级别与访问范围独立 |
| Decision Ledger | 正式决定、状态、来源授权、替代关系 | 可信决定入口；PROPOSED 不等于 ACCEPTED，更正追加 |

共享不可变 Ref `{sha256, bytes, media_type, artifact_id, sensitivity}`，不会把四者混成一张聊天表。一个 Operation 可有多个 Event；event_id 全局 UUID，operation_id 全局 UUID，同操作的事件携带 phase 与 revision。跨任务/会话以 causation_id、correlation_id、parent_operation_id 连接，不伪造跨主机物理全序。单审计实例有递增 sequence 和前哈希，跨实例只用因果边。

每个操作封套必须显式包含 operation_id、event_id、agent_id、project_id、task_id、session_id、operation_type、observed_at、cwd、parameters_ref、before_state_ref、policy_decision_ref、authorization_ref、execution_status、exit_code、stdout_ref、stderr_ref、after_state_ref、artifact_refs（每项 SHA256）。尚不适用的值为 null 并有 applicability/reason，不能以缺字段冒充采集完成。身份来自连接/调度器，不采信 payload.admin。参数中凭据只留 CredentialRef；意外秘密原文放加密受限对象，普通索引只含安全视图。M1 未实现密钥库时拒绝敏感原文入口，不能明文存后谎称已加密。

覆盖类型：shell（可执行文件、argv、脚本文本 Ref、shell/dialect）、文件 read/create/update/delete（授权资源身份、读取范围、前后 hash）、Git（repo/remote/ref/candidate）、tool（版本/参数/结果）、model（Provider/Account/Model/Profile、token、费用整数和估计/实际/未知状态）、agent lifecycle、agent message、policy/approval、workflow/gate、rules/config/decision、experiment、process timeout/crash/recovery。没有接入实现的类型为 NOT_RUN；正式实验没有默认能力。

## 提交屏障与故障

关键元数据、operation 状态、单次许可 consume、workspace writer claim 与审计 outbox 可以位于可信 Host 同一个 SQLite 数据库的不同逻辑表；Context 和 Decision 仍有独立流/类型/权限。这减少跨库假原子的风险，独立管理员库上线后改用显式两阶段协调，不谎称分布式原子。

1. 对大输入/输出先流式刷盘到独占临时对象，64KiB 块、逐流字节限额；publish 后不可变。未完成对象不作为完整 stdout，保存 incomplete/已持久化 offset。
2. `PREPARED` / validation / policy 事实及输入 hash 写入追加审计。执行前事务条件检查 feature/policy epoch、参数 hash、单次许可、workspace claim，更新 CLAIMED 和 outbox，同事务提交。
3. 排空本 operation 的审计 outbox，追加 hash-chain 段并 sync，确认 intent 已持久化后才进入执行器。审计失败、队列满、DB busy/磁盘满均拒绝启动；普通日志 OFF 不影响此路径。
4. 执行器记录 STARTED；输出直接写 Artifact Store 并施加背压。退出不是进程树已消失，后者需平台回执。资源变更摘要和对象 Ref 进入 RESULT。状态/审计同事务后导出刷盘，Context 保存相应交互，全部达到 ACK 屏障才返回完整成功。
5. SQLite 与段/对象文件不是原子介质。数据库 outbox 是待导出事实；导出用 event_id/sequence/hash 去重。崩溃后验证段前缀，再补未导出的记录；存在半尾只隔离未确认尾，不静默丢弃已确认事实。DB 指向坏对象或损坏已确认段则停止副作用，不能以 summary 修复。
6. CLAIMED/STARTED 无终态的操作先核对，在没有可证明 reconcile 的执行器时变 INDETERMINATE；不重放命令、不重发一次性许可。输出/产物已出现但 RESULT 不可写时返回审计故障及 operation_id，保留 writer claim 阻止第二写者。

追加表拒绝 UPDATE/DELETE；事实纠正追加 CORRECTION。段按 16MiB/时间封存，Zstd 无损压缩、压缩/原文 SHA、前段 hash 与序列范围写 manifest。同步与目录发布的耐久语义依 OS/文件系统；M1 可实测进程强杀，硬件断电与管理员防篡改为 NOT_RUN。哈希链不抵抗有磁盘和密钥控制权的管理员；可选外部锚定/签名/备份关闭不影响核心记录。

内存上界：事件封套 64KiB，单对象流 chunk≤64KiB，单进程 pending≤4MiB（拒绝新提交而非无界 Promise 队列）；数据库仅存小元数据/引用，不存 stdout 全文。分页 100 条，返回对象读取流而非 readFile 全载；定期 checkpoint 需确认无长期 reader，磁盘不足冻结新动作，不删除原历史。

## Task 重建与手动开关

`ReconstructTask(task_id, cursor, limit)` 只读导出 operation 时间线、参数/前后状态/授权/结果/产物引用和缺口，验证 hash 后返回；更正和恢复事件保留。Replay 是重建，API 不接 executor、不调用 Shell；若将来用户要重新执行，必须显式新建 Task/Intent/Operation 并重新走授权。

core.audit.trail 为不可关闭基础设施；core.artifact.store 与 core.decision.ledger 同属必要持久身份。audit.task-reconstruction、audit.integrity-background、audit.export、audit.diagnostic-logs、audit.external-anchor 独立可选；关闭 diagnostic logs 只停诊断输出，不停操作审计。重建 OFF 时手动只读分页仍可用；关闭导出/锚定不删旧对象；恢复预检、从 cursor 继续、不补执行副作用。必须审计每次 switch/challenge/failure/recovery。

验收 ID：AT-POS（真实低风险工具前后链）、AT-NEG（缺身份/字段/引用）、AT-BYPASS（日志OFF/Policy DISABLED仍写）、AT-RACE（并发序列和单领取）、AT-RECOVERY（DB/段双写窗口与强杀）、AT-IOFAIL（意图未落盘不执行/结果失败不重跑）、AT-REPLAY-READONLY、AT-STREAM（大输出/取消/背压/损坏）。测试范围和结果逐项记录，不把此设计登记为 PASS。
