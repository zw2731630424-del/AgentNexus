# ADR 006 四类证据分域与执行前审计

状态：按本轮用户要求实施的工程决策；没有替用户选择对外许可证。

Audit保存实际操作，Context保存交互原文，Artifact保存流式对象，Decision保存正式决定。共享ID/Ref但不共用业务语义；普通日志关闭不能影响操作审计。操作状态/许可/审计outbox同SQLite事务，执行前确认意图段已刷盘，结果ACK另有屏障。文件/DB崩溃窗口需要reconcile，不承诺外部exactly-once。Task replay只读，没有executor能力。

理由：M0发现退出tar不等于实时保存、回调日志可能失败仍继续、summary不能保全原文。本轮新增全操作追踪要求使独立Audit成为core。代价是关键审计存储故障冻结执行；这是明确安全合同。详细字段、覆盖和测试见[审计设计](../audit_trail_design.md)。
