# M1.6 A/B共享协议

共享Subject为原Identity的扩展：agent_id/project_id/task_id/session_id，加runtime_instance_id、agent_type、model_binding、resource_budget_id、policy_scope。逻辑Agent ID可持续；runtime_instance_id每次恢复更换，旧门面失效。LOCAL_TRUSTED实例不伪造M1.3真实OS RuntimeBinding。

NativeState只存在于可信控制面。所有新增状态存m16_entities(kind,id,project_id,agent_id,task_id,state,revision,body)，(kind,id)唯一；schema由主执行者维护。insert要求revision=0，update使用expectedRevision并递增；change将投影和原Audit/outbox原子写入，flush后返回。所有返回快照冻结，分页<=100、实体<=48KiB；原始大内容走Artifact流。

资源先reserve并持久ACK，再由Scheduler领取Task并启动。跨模块多阶段不是分布式原子事务；中间崩溃按持久状态隔离，不能重跑未知工具。Worker报告完成不释放资源；本地实现须可信Promise结束且原Gateway executor/outputs完成；OS资源只能由原ExitProof/Reconciliation路径释放，未知保持隔离。

Message sender由门面闭包提供；接收方由可信注册表解析。持久消息去重/租约/ACK/过期/撤销/重试均审计；未知副作用不重复投递执行。消息唤醒只创建一个持久READY事实。跨项目、未授权Task、旧runtime都拒绝。

Context保留原事件/对象hash和字节范围；必需规则装不下即BLOCKED。summary/retrieval/index独立保存，可重建，不修改raw。模型请求保存实际装配视图引用。模型池只接受内部模拟fixture和Vault opaque handle，普通记录不包含Key。结果和费用均SIMULATED。

Workflow G0需求/G1规划/G2实现/G3复核/G4验收/G5回归/G6交付，遵M0的105文件行为规格，独立实现。关闭门记录BYPASSED，审查/结构记录不自动升级成真实PASS。关闭任何可选功能不放宽Gateway/OS/预算不变量。
