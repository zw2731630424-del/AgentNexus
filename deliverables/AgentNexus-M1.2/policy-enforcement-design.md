# M1.2 Policy Enforcement 技术设计

状态：实施合同。范围是可信本地库的最小强制边界，不授予恶意同进程代码或 OS 隔离保证。

安全权威只有可信 Host Bootstrap。管理员句柄使用对象身份，不由 JSON、提示词、Agent 身份或工具参数产生。Agent 仅持会话门面；工具注册/模块注册/策略定义与评估扩展均不进入该门面。Host 与原始 Store 仍是可信管理对象，不能装入不可信 worker。

Policy 定义按源码固定的 34 个已知 ID、level、degradable、owner 校验。modes 必须恰有 ENFORCE/AUDIT_ONLY/DISABLED 的非空说明，缺字段/未知值/重复 ID 均启动失败。说明文本不参与决策。L0 和不降级 owner 只能由对应内核组件执行，不能当应用 PDP 条款传入。L1 是精确审批；已实现的 L2 诊断逐维检查当前 feature epoch/config revision 的结果；Review/Workflow/Scientific L2 owner 未实现时 DENY。L3 P.STYLE 明确定义为非授权性建议 ALLOW。扩展 evaluator 只能进一步 DENY/REQUIRE_APPROVAL，不能把默认拒绝提升成允许；收到的定义和上下文是深冻结副本。

工具 capability 必填：PURE、READ_ONLY、LOCAL_WRITE、EXTERNAL_EFFECT、PROCESS。PURE/READ_ONLY 可显式用空应用策略；LOCAL_WRITE 必须有已知应用策略、Writer Resource 和精确的一次性管理员审批。后两类以及 requires_sandbox=true 始终 SANDBOX_NOT_VERIFIED。分类由可信注册端声明，不接受 Agent 提交。受信固定诊断器是 Host 内部只读解析服务；它不给工具任意 spawn 权限。任意不可信 JS 的自报 PURE 不能代替 OS 权限控制。

副作用审批是 P.TOOL_CONTRACT/P.APPROVAL_REPLAY 的独立执行约束，应用 AUDIT_ONLY/DISABLED 不能关闭。LOCAL_WRITE 请求必带精确 resource_id（不是权限），它与身份、call_id、工具 id/version、参数一起形成 intent_hash，且必须与可信注册的资源解析器相等。消费和调用前重新解析必须仍相等，防止审批后重定向资源。每次请求仍检查 Feature、应用策略、Epoch、精确 intent、boot/单调期限、原子审批与 Permit 消费、Writer Claim、durable START_INTENT，以及调用前最后一道授权 fence。无 await 介于最后检查与受信执行器调用之间。工具定义注册后冻结，不能替换同 id/version。

ToolContext 只含冻结身份、operation_id、精确 resource_id（纯计算/只读为 null）、AbortSignal 和冻结诊断结果；不提供 Store、SQLite、原始审计、授权、注册或管理能力。持久状态变更由 Gateway/可信 Host 管理。当前不增加没有真实用途的通用产物接口；大型输出仍经 ToolOutput 的受限归档管线。timeout_ms 覆盖调用、输出管线、结果与 ACK 屏障，迟到阶段不返回 PASS；取消无法证明退出时保持 UNKNOWN/Writer。同步恶意同进程代码无法被这个协作期限强杀，仍属 OS 隔离 BLOCKED 范围。

验收：非法策略/未知策略/未知能力拒绝；副作用空策略拒绝；PDP 注入不能放宽默认权限；模式降级仍需副作用审批；审批过期/重复消费/不同 intent/epoch 变更不能执行；普通上下文无法修改底层数据库；沙箱缺证据继续 BLOCKED。原三模式应用语义与 M1.1 存储/控制回归保留。
