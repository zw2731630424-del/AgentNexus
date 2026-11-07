# ADR 004 管理员模式与故障恢复

状态：M0设计；三种模式尚未实现。本轮没有绕过宿主或项目治理规则。

决策：分开可降级的应用PDP和独立OS/存储/凭证/专属授权owner。ENFORCE真实阻断；AUDIT_ONLY对管理员选定条款记录would-deny但不阻断；DISABLED在选定范围不调用应用PDP。它们不是普通Feature布尔值，也不隐式关闭其他控制。[逐条模式表](../policy_catalog.md)。

Agent、Harness、MCP、项目文件、Prompt不能切换模式。独立管理IPC认证OS peer与可信原生确认challenge；配置/审计不放可写工作区。切换需预览、二次确认、scope/reason/期限、旧epoch撤销与独立管理事务审计。故障恢复通道不依赖PDP存活，但只能由管理员手动使用。

过期逻辑：停止接收旁路新操作→ENFORCE_PENDING_PREFLIGHT→检查旁路期间动作/配置、运行一致性预检→恢复预先确认目标或等待管理员。预检失败保持受控操作封锁，不延长旁路、不假报已恢复。服务崩溃/配置坏/审计不可写均不自动改成AUDIT_ONLY/DISABLED。在途副作用不假装可回滚，需完成或取消并核对结果。

源码理由：DeepSeek default-allow hook、Cline hook改policy、Claude回调可被allow遮蔽、ZCode便利模式提前allow都不满足本项目硬授权根；Agensh计时放松质量门不适合作安全旁路实现。OS能力与数据库唯一约束应在独立域保持真实效力。[安全审查](../../research/security_review.md)。

到M1/M2必须用同一请求证明三种模式不同，同时在每种模式下证明Agent不能改mode/读Key/越独立OS范围。所有对应产品测试目前NOT_RUN；本轮只提供可实现的状态机、接口与测试ID。
