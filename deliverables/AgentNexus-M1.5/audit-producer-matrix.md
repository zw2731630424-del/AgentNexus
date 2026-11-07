# Audit Producer 覆盖矩阵

记录含Event ID、Operation ID、Agent/project/task/session、runtime/worker、resource、profile、policy/feature epoch、proof/Artifact hash或明确不适用。Bootstrap未有Worker时使用Host process/boot及null worker，不从Agent字段取得Host身份。原生完整原文日志独立保存，不冒充已进入生产Audit。

| 组件 | 接线与屏障 | 当前证据 |
|---|---|---|
| Host Bootstrap | OS_ATTESTED/READY、存储ACL/锁恢复绑定；准备REQUESTED与PREPARING同事务flush | 静态/SQLite模型；真实独立身份启动BLOCKED |
| Broker | AUTHORIZED/START_INTENT/STARTED/RESULT先消费再起跑 | 模型+真实Store/crypto；生产BLOCKED |
| Worker/Identity | IDENTITY_BOUND、BOOTSTRAP_BOUND、REVOKED；一次请求结束撤权 | 模型/源审；真实跨账户BLOCKED |
| IPC | peer/frame认证、拒绝/关闭、挑战证明 | 模型+限定原生响应；正向持续生产IPC NOT_RUN |
| Sandbox | PROFILE_CHECKED、helper/profile hash、Job/token raw | 同账户原语；组合BLOCKED |
| File Broker | AUTHORIZED/RESULT/INDETERMINATE、actual file ID/hash/Artifact | 模型与继承原生文件；生产组合BLOCKED |
| Process Supervisor | START_INTENT/STARTED、终止/树/producer/proof状态 | 模型+原语；全树组合BLOCKED |
| ExitProof | immutable signed packet、导入hash、closure hash/state | 模型/源审；production EXIT_VERIFIED不产生 |
| Resource release | owner prepared、原裁定/五版本、Broker receipt hash | 独立模型；production release BLOCKED |

审计失败不返回高风险成功：准备flush失败native创建计数0；Broker消费/START_INTENT未durable不resume；输出/Artifact失败请求终止并UNKNOWN；结果存储失败不返回PASS。大型输出逐块背压写Artifact，没有全输出无限累积内存。真实长期九组件覆盖、持久IPC断线及审计故障组合尚缺证据，所以整体覆盖裁定INCONCLUSIVE。
