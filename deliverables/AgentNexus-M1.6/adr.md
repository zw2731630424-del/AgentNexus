# M1.6 ADR037—043

- ADR037：新M1.6目录，M0—M1.5.1逐文件冻结；根M1.3和所有旧FAIL保持。
- ADR038：四种CPU能力独立；严格累计预算不合格时固定BLOCKED。应用账本与模拟合同独立命名，不改旧预算和容差。
- ADR039：沿用可信KernelStore/Feature/Policy/Gateway/Archive/Audit/Decision/Reconciliation，不新建身份或审计孤岛。共享投影schema单写者。
- ADR040：Agent逻辑身份与真实OS RuntimeBinding分离。M1.6本地运行实例由Host创建，只能获得受限门面；不能自报管理员。
- ADR041：事件驱动Resident与有界持久队列。重启把不确定在途工作隔离；没有已确认执行后置条件不释放或重试。
- ADR042：只实现模拟Provider与opaque Vault接口；未读真实凭据、未接真实网络、未产生费用。Model绑定不改变权限。
- ADR043：原生Workflow按独立行为规格实现，来源映射用于追溯；未获许可的原始代码/模板不进入运行依赖。Gate OFF=BYPASSED，证据不等于授权。
