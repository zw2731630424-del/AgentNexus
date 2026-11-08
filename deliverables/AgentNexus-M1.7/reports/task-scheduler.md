# Task Scheduler 与恢复报告

事件队列512历史/256待处理；可配置并发默认3/最高4，Task 单实例执行、依赖与优先级受控。等待消息的任务在安全交接后恢复原 Task，审批等待与 UNKNOWN 不由普通 wake 绕过。

最新 Pilot 执行受控 Host close/reopen：同一 lead Task/合同/原需求/规则/计划持续，runtime id更新、旧 facade 拒绝、重新打开自动模型调用0。持久消息在明确 recoverEvents/startEvents/resume 后继续，最终 lead 和 delivery 成功。事件 DISPATCHING 恢复成 INDETERMINATE，不自动重新派发未知动作。实际运行有独立旧测试覆盖进程崩溃/退出证明；Pilot 自身这里是受控关闭，不能称作断电测试。

Task 回合32、消息接收索引32、热历史32等边界仍保留；历史窗口仅移出可追溯索引，不删除Archive。取消、资源竞争、依赖、过期、Feature 停止栅栏等测试都列在完整 results 原记录。OS reboot/硬断电 NOT_RUN。
