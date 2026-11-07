# ADR 009 M1 本地内核切片与实际存储布局

状态：本轮授权内已实施；完整安全部署仍BLOCKED。不改写M0原件或将旧建议冒充已验收。

M1采用零npm依赖、可擦除TypeScript/Node24.15.0和实际SQLite3.51.3。可信本地库持有control表和audit/context/decision三种独立记录域；状态、许可/claim和审计outbox同库事务，分段文件导出以本次调用捕获的target seq为刷盘屏障。禁止异步事务回调；事务回调逃逸上下文不能继续写记录。原始大字节流放Artifact，DB只放小封套/Ref。

Artifact实际使用UUID定位文件、SHA256核对原文与压缩字节，Zstd流式编码；**没有实现内容hash定位或去重**。这是M0内容寻址方向的受限首批实现，后续CAS索引/去重另做，不把UUID目录称已完成CAS。当前封段保留原始JSONL和经验证压缩表示，没有自动删除唯一原文。secret-tag入口拒绝；原文加密、Vault和未知秘密识别未实现，实际验证仅用不含凭据的自造数据。

管理对象与Agent门面分开，三模式、challenge、双确认、epoch、期限和起跑前重查真实生效；此对象边界仅成立于可信bootstrap，不构成OS认证。没有Agent HTTP服务、任意插件加载或自由Shell；Windows/Ubuntu管理身份与Sandbox缺证据时始终BLOCKED。首批注册handler仅原生echo、诊断和结构化argv检查，所有实际调用经Audit/Context/Artifact路径。任务完整重建留可信Host，Agent默认只能读取自身Project/Task/Agent/Session，不因同Task隐式共享原始上下文。

Feature关闭按最终有效状态判断（含ON→INHERIT回落OFF），排空和迟到stop有独立占用；超时不等于停止，未settled不能恢复。取消停滞对象源只证明Store管线停写/句柄回收，producer退出仍NOT_VERIFIED；未知源清理使存储失败关闭。库内处理器使用单调超时，实际处理器未结束时保留lease/claim。原文重建不会调用执行器。

局限：Node原生类型剥离没有静态类型检查；全目录Schema参数配置、全量工作流/Policy owner、五Agent、Model Gateway、原始Provider流、UI、硬件断电和soak均未在此切片完成。依赖闭包限定实际新引入的源码/配置/测试/工具，不包含已装运行时的再分发；公开许可证未由代理擅自选择。实际证据见[M1报告](../../reports/M1_report.md)与[验证记录](../../reports/verification.md)。
