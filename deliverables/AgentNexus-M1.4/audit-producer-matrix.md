# Audit Producer 覆盖

所有新事件共用M1.3 KernelStore outbox/hash链，关联event/operation/四字段logical identity及runtime进程、boot、generation、worker instance、resource、profile、policy/approval/permit、proof/artifact hash。授权/START_INTENT必须flush，失败不启动。全模型链、独立Broker fixture和真实原生日志分别标注来源。

| Producer | 代码接入与限定证据 | 生产状态 |
|---|---|---|
| Host | Permit消费/桥接、结果接收；错误保留原operation | SIMULATED协议PASS；独立标准身份部署BLOCKED |
| Broker | AUTHORIZED、START_INTENT、RESULT、未知隔离 | 独立OS Broker进程+固定Worker夹具PASS；security观察SIMULATED |
| Worker | Identity绑定/撤销、关闭、旧boot恢复 | SIMULATED；native身份读回另有真实证据 |
| IPC | Peer认证/拒绝、frame认证/拒绝、channel归属断连 | Node协议SIMULATED；native精确pipe临时原语REAL；长期端点组合BLOCKED |
| Sandbox | profile/helper核对、Job/token读回 | 实际原生RPC日志；组合尚未部署，BLOCKED |
| Process | STARTED、termination/root/tree/output阶段 | 原生真实Job/prepare/stream证据；全成员历史不完整 |
| File | 授权、RESULT、未知，含读版本/file ID/hash/Artifact | 模拟授权协议及真实文件句柄owner分别验证；跨账户组合BLOCKED |
| ExitProof | 候选状态/hash、签名、Host Artifact导入 | 不完整证据不发释放权；真实完整proof NOT_RUN |
| Reconciliation | UNKNOWN、Owner释放准备、原M1.2最终裁定/原子release | 原本地回归及模拟拒绝PASS；生产正向释放BLOCKED |

原生helper的RPC JSON/4KiB输出事件是真实证据源；独立测试中直接调用helper没有虚构成已进入Host Audit Trail的生产事件。长期pipe→Broker→Worker Launcher原生事件到审计的持续跨账户接线仍需部署实现/验证，不能把这张接入矩阵当完整生产覆盖PASS。未知输出/审计磁盘故障继续隔离；不静默丢弃大型输出或无限存内存。
