# AgentNexus M1.3

本目录只记录 M1.3；M1.2 原件保留。协议/持久控制切片限定验证通过；**完整部署 BLOCKED**。最终206项：203 PASS / 3 NOT_RUN / 0 FAIL。只对实际执行能力声明通过。

入口：[总体设计](design.md)、[协议](protocols.md)、[Windows](windows-sandbox.md)、[Linux](linux-sandbox.md)、[ADR](adr.md)、[验收](acceptance-report.md)。源码位于仓库 `src/agentnexus/runtime/`；原始日志位于本目录 evidence 与 `.workflow-kit/runtime/AgentNexus-M1.3/`。

| 交付 | 路径 |
|---|---|
| 总体设计 / Identity / IPC / ExitProof 合同 | design.md、protocols.md |
| Broker / Resource Reconciliation | broker-reconciliation.md |
| Windows 实现/证据与 Ubuntu 实施设计 | windows-sandbox.md、linux-sandbox.md |
| Audit Producer 覆盖 | audit-producer-matrix.md |
| Feature / Policy 增量与 ADR010—013 | feature-policy-catalog.md、adr.md |
| 完整测试绑定源码/测试/工具 | source/、AgentNexus-M1.3-source.zip |
| 原始TAP/事件JSON/失败记录/基线/状态数据 | evidence/、test-results.json |
| 独立安全审查 | independent-security-review.md、independent-security-review.json |
| 源码与交付SHA256 | source-sha256.json、SOURCE_SHA256SUMS.txt、delivery-manifest.json、SHA256SUMS.txt |
| 最终能力裁定与历史保全验证 | acceptance-report.md、acceptance.json、verification.json |
| 变更记录 / 后续与系统批准范围 | change-record.md、m14-recommendations.md、deployment-approval.md |

复跑：设 AGENTNEXUS_TEST_PYTHON_PATH、AGENTNEXUS_TEST_POWERSHELL_PATH 为现有可信解释器路径，再运行 `node tools/agentnexus/verify-m13.mjs`。每次建独立副本/数据/日志，避免历史覆盖；工具隔离可能影响真实pipe/link测试，应记录实际状态。无需安装npm包，未静态tsc检查。运行测试不能授予任意执行或系统配置权限。
