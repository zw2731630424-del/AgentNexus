# AgentNexus M1.4 — 独立候选交付

**完整生产部署 BLOCKED。** 最终限定测试255项：251 PASS / 4 NOT_RUN / 0 FAIL。模拟与真实Windows原语严格区分，历史CPU不稳定仍阻断资格。

- [最终验收](acceptance-report.md) · [机器裁定](acceptance.json)
- [Phase 0冻结](phase0-report.md) · [总体设计](design.md) · [协议](protocols.md) · [ADR](adr.md)
- [完整候选源码/测试/工具](source/) · [源码ZIP](AgentNexus-M1.4-source.zip) · [源码SHA](source-sha256.json)
- [Audit覆盖](audit-producer-matrix.md) · [Feature/Policy](feature-policy-catalog.md)
- [资源核实](resource-reconciliation.md) · [24项安全测试矩阵](security-test-matrix.md)
- [独立安全审查](independent-security-review.md) · [完整性核验](verification.json)
- [部署审批](deployment-approval.md) · [Ubuntu规格](ubuntu-adapter-spec.md) · [后续建议与缺口](m15-recommendations.md)
- [原始证据](evidence/) · [交付SHA](SHA256SUMS.txt)

根产品仍为M1.3，1829个原tracked文件不改。本目录source可独立验证；无需npm install。以已存在可信Python/PowerShell的绝对路径设置AGENTNEXUS_TEST_PYTHON_PATH/AGENTNEXUS_TEST_POWERSHELL_PATH，再从source运行 `node tools/agentnexus/verify-m14.mjs --output-root <M1.4临时目录>`。原生测试受宿主/登录环境影响，应保留实际结果；不授予系统配置权限。
