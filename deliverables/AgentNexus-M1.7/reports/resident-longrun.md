# Resident 两小时实际运行报告

状态 **PASS**，实际开始 2026-11-08T02:21:28.033Z，结束 2026-11-08T04:21:40.561Z；观测 7212422 ms（不少于7200000ms）。这是同一实际Node进程中的本地事件驱动Resident/Message Bus/Scheduler观察，Provider为SIMULATED，不是通用长期自治资格。

实际 117 次独立消息/Task完成，3 次受控Host store关闭重开；每个事件等待真实持久交接COMPLETED与Task SUCCEEDED，空闲分钟内模型请求数不变。重开先recoverEvents再startEvents，没有OS reboot/硬断电。

| 观测 | 数值 |
|---|---|
| 最后queued_messages / unknown_tasks / active_reservations | 0 / 0 / 0 |
| RSS首/末/峰值 bytes | 92356608 / 127492096 / 127492096 |
| heap首/末/峰值 bytes | 20612184 / 14778376 / 28473520 |
| 进程累计CPU user / system 微秒 | 55281000 / 161985000 |
| SQLite首/末 bytes | 425984 / 22052864 |
| Host文件首/末 bytes | 4757592 / 41032689 |
| 模型请求 | 117，仅按事件调用模拟模型 |

逐分钟原样本与最终store验证见 [report.json](../evidence/resident/report.json)、[samples.jsonl](../evidence/resident/samples.jsonl)、[SHA](../evidence/resident/sha256.json)，完整host/Audit/Artifact在raw/soak.zip。观察到持久Archive/SQLite随事件增长是保留审计的成本，未做无限时长稳定性推断；热事件队列、Agent总量和历史均有界。CPU/memory是实际观测而不是OS硬预算证明。

重要来源限制：启动时未冻结完整源码集；本次运行缓存的事件模块与Runner保持不变，event-loop SHA `315cdb564506578c4e167dded5aa34725661d0e259ff1580687bd434a79c927f`，Runner完整hash见acceptance.json。同期引擎其它源码发生工程更新，因此本报告只给实际事件层与该运行的观测结论，不宣称最终155文件源码集在两小时全树一致浸泡。最终冻结源码集另经532项完整回归和独立Pilot验证。
