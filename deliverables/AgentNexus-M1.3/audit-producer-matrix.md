# Audit Producer 覆盖矩阵

M1.2 Tool/Policy/Approval/Reconciliation 原始审计继续存在。新 SDK 只由可信服务创建 producer handle，普通 Worker 不得到 Store 或 producer 构造能力。SDK 拒绝 Worker 的 RESULT；可信 Broker/资源 owner 才能记录实际结果。本地库对象约束仍依赖可信 bootstrap，不作为恶意同进程隔离。

| Producer | 已接入 / 状态 | 结果来源与缺口 |
|---|---|---|
| Host Lifecycle | M1.2 实际 Host 审计保留；重启 runtime recover 追加 | 完整独立 OS Host 服务未部署 |
| Worker Lifecycle | RuntimeControl CREATED/AUTHENTICATED/ACTIVE/REVOKING/REVOKED、异常和隔离 | 协议状态机，真实 Supervisor 部署 BLOCKED |
| IPC | 请求、授权、拒绝、失联、屏障未知和撤销 | nonce/cap/epoch消费与audit同事务；原生 pipe 探针保留独立原始 JSON，未把探针伪装产品管道 |
| Broker | SDK 定义，dispatch 硬拒绝 | 生产 broker 进程与实际 dispatch 未实现 |
| Sandbox | 资源预留/隔离记录 | OS部署 BLOCKED，探针输出不作为产品成功事件 |
| Process Start/Exit | 候选 ExitObservation 与 hash/状态追加 | Windows 原语真实日志；完整生命周期来源和全树证明 BLOCKED |
| File Broker | SDK 入口/设计 | 未实现，默认拒绝 |
| Policy / Approval | M1.2 源码链保留，新 L0 owner 不能被应用模式关闭 | catalog 不是新 OS owner 部署证据 |
| Reconciliation | 新旧表并存；旧审批裁定保留；runtime boot隔离/拒绝释放追加 | 不修改原 M1.2 executor_state 或释放旧 Writer |

每个新事件的原 AuditInput 提供 event/operation/agent/project/task/session；detail 提供 runtime/worker/profile/resource、policy_decision/before/after/exit_proof（不适用为明确 null），observation 提供阶段事实。REQUESTED/AUTHORIZED/STARTED/RESULT/ACK/INDETERMINATE 分开；没有发生的执行阶段不合成。未对接生产者不能写为覆盖 PASS。
