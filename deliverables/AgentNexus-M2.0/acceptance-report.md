# AgentNexus M2.0 最终验收

Local Development 交付在本轮授权范围内可接受；Hardened 部署仍 BLOCKED。真实 Key 导入和真实 Provider 调用均为0。

| 验证 | 结果 |
|---|---|
| strict TypeScript / Desktop build | PASS / PASS |
| 最终Local/安全/恢复/旧Desktop定向 | 32 PASS、0 FAIL、0 SKIP |
| 独立审查亲跑 | 定向64/64、Vault合成20/20、5组独立探针通过；最终相关增量16/16通过 |
| 实际Electron桌面 | 11/11步通过；Main Medium=8192、elevated=false，实际CredMan合成凭证 |
| 扩展全量回归 | 782 PASS、3 FAIL、20 SKIP；不宣称全量通过 |
| Q4.2/M2三项旧测试后续对照 | 两边均1 PASS、2 FAIL；不覆盖原全量结果 |
| Q4.1/Q4.2历史完整性 | 7295文件Hash、字节数和文件集合均一致 |

本轮实现统一v1 Security Profile、严格Schema、46项Registry、依赖状态、风险确认与配置审计、导入导出/默认恢复、双向模式计划、Local原生凭证适配和Security Center。复用同一Harness/Gateway/Router/Provider Adapter/Key Pool/Ledger；修改清单和补丁单独交付。Local已实际通过无TPM/Service启动、UI Key保存、Synthetic请求、模型绑定、多Agent请求、预算开关、重启保留与模式往返。

独立审查发现的新Secret前置审计、删除ACK丢失/终态复活、存储关闭空Guard、overdrawn门禁、未绑定远程路径和helper poison等问题已修复并复核；远程未完成绑定以BLOCKED缓解，未伪造能力。审查核心测试执行后仅E2E截图/退出同步工具有获准增量，产品与核心测试未变，最终逐文件Hash有一致性校验。

全量三项失败为M14累计Job CPU、资源模型uncooperative owners及M151 CREATE_BREAKAWAY_FROM_JOB。后续baseline/candidate对照两项继续失败，uncooperative重跑通过。原测试和相关production逻辑Hash未变；结果保留为FAIL或时序不确定，不归因成确定“仅环境问题”，不授予Hardened资格。

明确限制：真实Provider/TLS连通性与账单未运行；Local HTTPS仅完成实现与离线网络前准入验证；精确逐请求Data Egress批准UI未完成（APPROVAL阻断）；非Windows凭证后端未实现；Local不抵御同SID恶意进程或管理员。固定身份/密钥泄漏/资源归属/恢复日志边界不作为普通开关，缺保护时明确BLOCKED并阻止写入。旧REAL账本归属不明不会创建新剩余额度。

没有创建账户或Windows Service、启动真实Credential Service、修改ACL、导入证书/真实Key、创建TPMKey、UAC安装、迁移REAL账本、修改Ubuntu或其他科研项目；没有Commit/Push。

- [逐项机器验收](acceptance.json) · [独立审查](reports/independent-review.md)
- [测试与原始证据索引](reports/testing.md) · [历史校验](evidence/history-verification.json)
- [架构](reports/architecture.md) · [模式合同](reports/mode-contracts.md) · [功能绑定](reports/feature-integration.md)
- [完整SHA256](SHA256SUMS) · [包清单](package-manifest.json)

最终增量仅调整未绑定Hardened预算的关闭请求状态和风险文案：desired=false也保持BLOCKED，不能冒充DISABLED。独立16/16与最新主代理32/32已复跑。UI11/11是此前ac57源码树的真实记录；Local行为未变，未把该UI结果伪记为最终90fc源码树重新执行。逐版本Hash和增量范围见独立报告。

完整工作区治理已 PASS；最终源码与独立审查逐文件一致，额外的Node许可证与基线一致。可用根目录 Verify-Delivery.mjs 独立复核交付内容。
