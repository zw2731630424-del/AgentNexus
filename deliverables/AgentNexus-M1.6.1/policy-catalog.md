# Policy Catalog M1.6.1

保留原52个policy身份及原security断言。没有通过修改数量断言或引入可降级owner放宽安全合同。完整机器目录及m161_enforcement_bindings在source/config/agentnexus/policies.json。

- P.WORKFLOW_BINDING：Rule Registry/Task版本与Native Gate实际许可绑定；独立owner，不受应用DISABLED模式撤销。
- P.TOOL_CONTRACT / P.ARTIFACT_INTEGRITY：Storage精确operation、consumed approval/permit、冻结source和实际hash；所有工具仍过原Gateway。
- P.RESOURCE_ADMISSION / P.RESOURCE_RELEASE：三级原子预留与持久容量owner转交；UNKNOWN不自动释放。
- P.CONTEXT_PROVENANCE：原文、精确模型输入、manifest与来源hash；摘要不替代原始记录。
- P.MESSAGE_DELIVERY：可信身份、显式授权、接纳/ACK事务与Task派生完成；Coordinator仅固定授权通知。
- P.AUDIT_REQUIRED / P.EVIDENCE_DOMAINS：文件intent、publish、ACK、原文、产物与正式决定分域关联。

原P.FILE_BROKER生产句柄边界仍按原资格；新的本地Storage路径检查不冒充恶意同账户OS隔离。三模式、模型切换、Gate关闭或模拟计费均不能扩大权限。
