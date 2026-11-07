# Native Harness Core 运行合同

入口为source/src/agentnexus/harness/index.ts的openHarness。它复用原openHost与KernelStore、FeatureRegistry、PolicyEngine、ToolGateway、Archive、Artifact、Decision及Reconciliation。新增schema只有同库m16_entities；原生OS Binding仍由M1.3—M1.5.1独立协议管理，逻辑runtime_instance_id不会冒充已认证Windows进程。

Agent有独立Agent/Project/Task/Session、runtime instance、type、model binding、context source、tool grants、resource budget、policy scope及版本状态。可信Host生成身份；门面冻结，恢复更换runtime/session，旧门面失效。SUBAGENT必须由同项目DEVELOPMENT创建，拥有独立Task，工具/文件/read-task授权只能缩小父合同。模型选择不改变权限。

| 系统类型 | 本轮可运行行为 | 限定范围 |
|---|---|---|
| RESIDENT | 项目激活、暂停等待、关闭停止、Host恢复；消息持久唤醒基础 | 空闲无模型轮询；完整自主项目推进服务未实现 |
| DEVELOPMENT | 受限Loop、上下文/工具、任务创建与整合的可信管理接口 | 自动规划与未经批准的代码/科学决定不开放 |
| SUBAGENT | 独立合同/预算/上下文；完成后向父提交结构化结果消息 | 无递归派发；完成消息失败保留DELIVERY_PENDING |
| BACKGROUND_REVIEWER | 只读工具、commit/diff/candidate绑定任务、结果通知作者 | 事件入口由可信Host调用；自动Git watcher未实现，模型审查仍SIMULATED |
| COORDINATOR | 类型/模型合同、只读消息与共享三级预算基础 | 默认OFF；跨项目自主协调未实现，不接受项目决定 |

生命周期实现CREATED→INITIALIZING→READY→RUNNING，等待/恢复为WAITING→RESUMING→RUNNING；结束STOPPING→STOPPED，失败FAILED，不确定UNKNOWN_QUARANTINED。状态只由可信owner变更并审计；模型、消息payload或Agent自报不能修改投影。新发布/恢复前复查当前Feature/项目状态；安全控制关闭不打开替代执行入口。

每轮按Task接收→必要规则/角色/任务/历史/文件/Decision/消息来源装配→选择模拟模型→持久请求与三级预算→完整JSON响应→原工具schema/Feature/Policy/审批/Permit→执行/输出→原Archive结果来源→状态/检查点→继续/等待/显式交接/结束运行。可选Task inputs带来源、section与required，跨项目或未授read_tasks的引用拒绝。最近最多12条记录进入模型视图，必要来源挤占名额；原始历史和全部工具/模型字节仍留Archive，不以视图截取删除原件。

真实工具调用通过原Host绑定会话与原ToolGateway，保持校验、精确intent、一次审批、Permit、epoch、durable START_INTENT、输出/ACK屏障。NativeToolRuntime进一步限制Agent grants、Reviewer/Coordinator只读与资源范围。PROCESS、EXTERNAL_EFFECT、requires_sandbox仍固定拒绝。可信AbortSignal独立于JSON传到Gateway调用前最终fence和handler；取消不证明已执行效果消失。

Scheduler以唯一Task ID去重，最多512个持久Task、128个逻辑Agent、32项目，单Agent一个活动turn，默认并发4、配置上限16。先记录预留ID，再执行三级原子reservation，资源不足只留有界WAITING；不重复mint预留。DAG依赖必须同项目且已完成，取消/暂停/超时不会绕过依赖或释放UNKNOWN。WAITING资源申请可取消后永不重新分配。

Task保存创建/首次启动/结束、固定wall deadline、startup/execution/waiting/paused毫秒与turn数。等待包含排队/资源等待/消息等待，暂停单列；worker活动墙钟包含启动与本地执行，计量不截断超额。活动deadline使用合作式计时和真实handler后置条件，排队任务可由tick扫描过期；这些机制不是OS硬截止，未从它们推导CPU上界。

项目暂停先原子写PAUSING关闭准入，再排空活动turn，最后PAUSED；关闭同样CLOSING→CLOSED，安全Agent停止，未知资源保留。已批准待执行工具也必须经过取消fence。Feature关闭既有类型会阻止新派发并暂停受影响活动turn。

模型发送前取消按零实际请求/token/费用结算，不推进fixture序列；已SENT未知保持key与预算。零token的真实模拟调度仍计一次请求。暂停/等待后由显式resume/dispatch或消息持久唤醒进入QUEUED；唤醒不暗中调用模型。HANDOFF响应只进入WAITING，可信handoffTask才创建独立目标Task、绑定原合同与剩余期限；不会从模型建议自行扩大权限。

本地资源只在可信handler及原Gateway操作/输出/最终状态均已结算后，用单次opaque模拟闭合凭据释放。实际LOCAL_WRITE一旦调用，先持久记录pending ownership，并在失败/释放fence回查原Gateway操作；大结果直接引用原tool.result档案。缺失持久磁盘owner时固定UNKNOWN，即使原工具成功，也不能退还磁盘或其他claim。

Host重启保守处理RESERVED/ACTIVE、在途模型、工具、Task；不重发未知效果、不按TTL释放。安全WAITING/QUEUED重建新runtime但不自动运行；worker预算在明确派发时懒分配，功能OFF或额度满仍可恢复控制面。旧审批撤销，保持原call/参数并重新申请批准。原上下文/消息/消费计量不被恢复覆盖。

Node/SQLite/Zstd、JSON解析与受控工具是实际本地软件验证；Provider/OS观察按SIMULATED标记。没有独立标准账户、恶意Worker隔离、生产Credential Vault、长期soak、断电/整机重启资格或自动Git提交/推送。
