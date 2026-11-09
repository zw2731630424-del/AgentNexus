# 唯一 Token Ledger 与恢复

沿用既有 100,000,000 输入+输出总 Token 授权，未重新申请、初始化正式库或改变额度。Q2 只向原服务 ledger.sqlite 增加 daily_grants 表；未建第二份凭证库/真实预算。Vault 与账本仍为两个持久存储，不声称跨库事务。

Credential Service 是实际 hold/settlement Owner。`ServiceStore.reserve` 的 BEGIN IMMEDIATE 同时完成 Daily Grant 消费、prepared nonce 消费、request/operation/nonce 唯一检查、Global/Project/Agent/Task 原子预留。任何预算不足或状态失败回滚整个事务。新增测试证明不足时 Grant 仍 ISSUED、requests 不存在、held=0；明确修正原可信配置后同一未发送 Grant 可由调用者重新执行，代码没有自动重试。

发送后 Provider 实际 input/output usage 只核销一次。缺失 Usage、流中断、崩溃或结果不确定保留 UNKNOWN 和原 hold，并阻止新请求直到独立 reconciliation。原 Vault lease 同样不会假定崩溃等于未发送。重新配置 scope 只更新限制，不清 used/held；低于已承诺容量拒绝。切 Key、三种 Agent 或 Session 均不另给总额度。

Q2 普通接口没有 budget.configure。原 High helper 白名单也没有该方法；后续预算配置需独立受信配置/审批流程，不能借普通 UI 写账本。UI 的本地偏好仅用于选择/显示，不是服务授权。服务不可达时 Usage.available=false、实际计数 null；不是确认0真实使用。

合成过程可创建独立 SIMULATED 夹具库；它们不代表正式预算，不可晋级或合并为 REAL。独立合成子进程被终止后重开，观察 UNKNOWN、hold保留、100m限制未变，并拒绝新请求；这证明恢复逻辑，不证明服务 SID/OS 隔离或真实 Provider 对账。
