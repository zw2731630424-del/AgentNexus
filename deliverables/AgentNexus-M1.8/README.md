# AgentNexus M1.8

已实现并验证本轮授权的离线工程范围；完整真实模型验收仍 **BLOCKED**。Vault/三个 Provider 协议/路由/原子预算/原生多 Agent 与 Git Reviewer 接缝已实现，真实 Key、真实 API、实际费用均为 0。

新增测试 108：108 PASS / 0 NOT_RUN / 0 FAIL；完整回归 640：623 PASS / 16 NOT_RUN / 1 FAIL。语法、严格 TypeScript PASS。

入口：[最终验收](acceptance-report.md) · [机器验收](acceptance.json) · [架构](architecture.md) · [Vault 设计](credential-vault-design.md) · [源码](source/) · [源码 ZIP](AgentNexus-M1.8-source.zip) · [SHA256](SHA256SUMS.txt) · [复现](reproduce.md) · [Phase 0](reports/phase0.md) · [独立审查](reports/independent-security-review.md)。

源码集 `cddca8b1cc71876d8a078018aaac09fc8804df7ce0453b8fd455d150ed5475dc`，178 文件。M0–M1.7 历史 15510 文件原字节保留，继承测试与 Feature/Policy Catalog 未修改。根产品未替换，未 Commit/Push、未安装 Hook 或修改账户/ACL/AppContainer。

真实联调 NOT_RUN，生产 Vault 隔离 BLOCKED；模型规划/编码/审查均 SIMULATED。24 小时 NOT_RUN，对照优越性 INCONCLUSIVE。所有失败、未知状态和资格限制均保留，不以短测或合成 Usage 代替真实证据。

首个准备方向已按用户选择设为 DeepSeek；[具体联调草案](reports/deepseek-smoke-proposal.md) 尚未授权，且仍受凭证隔离/公开数据准入资格约束。

根目录治理检查 PASS；临时联接只移除本体，5 个目标目录和全部历史字节均保留。详见 evidence/governance。

Git 发布沿用仓库现有范围：源码、测试、报告和文本证据全部推送；源码 ZIP、原始运行 ZIP 和临时数据库留在本地。清单中的 ZIP 哈希保留用于本地交付核验，不表示 Git 仓库包含这些归档；远端可直接查看 `source/` 完整源码。发布是用户后续明确授权的独立步骤，不改写实施阶段“未 Commit/Push”的历史记录。
