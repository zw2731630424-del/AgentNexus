# Context Provenance 报告

71 次模型请求均绑定71份实际 Context View、原始 input/manifest/hash。组成包括平台/项目规则、角色、Task Contract、状态、必要消息/历史、文件/工具结果和 Artifact 引用；模型 responder 只收到重建输入与公开请求主体，不得到 Store/admin/Key Handle。

新增可选 historyWindow 将 Task 热索引保持最多32引用，并把移出引用逐条写进审计。Raw Archive/Artifact 不被摘要、索引或滚动窗口覆盖；旧数据可按原引用重读验hash。默认行为不改，仍拒绝第33条；Pilot 显式启用窗口。Task/Handoff 的创建hash固定 history_window，跨相反 Host 默认不静默更改；旧 pending handoff 缺策略时失败关闭，要求明确迁移。

4项专项历史测试覆盖默认与窗口模式、close/reopen、两方向 handoff 和先前原文可读。旧 Pilot 确实因32条历史上限失败，原日志与快照保留；修复后的 lead16回合 SUCCEEDED，移出初始 plan 的审计仍能追到原 Artifact。

恢复保留原 Task、rules version、需求与计划引用；同字节不同来源不是同一历史。未增加向量数据库或宣称无限记忆，所有 Context 容量仍有界。Native 项目规则是 Host createProject 输入的已归档规则；不冒称模型逐行读取了主仓库整份 AGENTS。
