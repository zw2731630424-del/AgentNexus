# 五角色稳定性验证

`m161-harness.test.ts`真实创建五类逻辑Agent并发执行，保持独立task/context/budget；原m16-harness全部27测试保留。Mock响应、用量和费用明确SIMULATED，本地SQLite/Zstd/消息/资源程序实际运行。

- Resident：模型调用前0请求，授权消息/事件驱动，等待恢复不自动调用模型。
- Development：消息整合、依赖、显式子任务handoff与Task验收，原始来源与版本固定。
- Subagent：两个独立上下文/任务/预算并行，双向和授权同级消息；无多次Task执行。
- Reviewer：只读工具/工作角色程序拒绝写权限，diff/commit/candidate/作者绑定；Gate G4核真实独立Reviewer身份和可信checker。
- Coordinator：仅可信read_projects授予的跨项目状态摘要和固定INTERNAL通知；不读外项目原文，不取得管理/正式决策/写入能力。

多项目竞争同一Platform worker槽会持久WAITING_RESOURCES；释放有证据的已知任务后，原reservation只派发一次。五角色并发过程中消息ACK与Task完成分开，所有receipt最终COMPLETED且无未知资源遗失。

实际Host子进程kill覆盖消息lease、交接ACK和未完成草稿，Storage另有11个实际进程中断窗口。OS重启、硬断电、长期resident/自动优先级Coordinator、Git watcher和生产Worker隔离NOT_RUN/BLOCKED，不以这些有限测试冒充。
