# AgentNexus v0.4 — M0.1 与 M1 入口

历史[M0](../AgentNexus-v0.4-M0/README.md)保持原样；本目录独立版本化，不覆盖旧报告、验证和清单。

| 交付 | 入口 |
|---|---|
| M0.1报告 | [M0.1_report.md](reports/M0.1_report.md) |
| M1受限内核 | [实现报告](reports/M1_report.md) · [真实验证](reports/verification.md) · [测试矩阵](reports/M1_test_matrix.json) |
| 审计系统 | [Audit Trail](architecture/audit_trail_design.md) |
| 开发诊断 | [Development Intelligence](architecture/development_intelligence_design.md) |
| 双平台安全 | [Windows / Ubuntu](architecture/platform_security_windows_linux.md) |
| 套件许可与完整性 | [补救方案](architecture/workflow_license_remediation.md) |
| 功能/策略 | [142 Features](architecture/feature_catalog.md) · [34 Policies](architecture/policy_catalog.md) · [变更表](reports/catalog_changes.json) |
| 协议与计划 | [协议v0.2](architecture/internal_protocols.md) · [实施计划](architecture/implementation_plan.md) |
| 新ADR | [006证据域](architecture/adr/006-audit-evidence-domains.md) · [007诊断](architecture/adr/007-diagnostics-and-execution.md) · [008准入](architecture/adr/008-m1-admission.md) |
| M1实际布局 | [ADR009](architecture/adr/009-m1-local-kernel.md) |
| 取证 | [许可证](research/license_recheck.json) · [诊断器](research/diagnostic_sources.json) · [平台](research/platform_sources.json) |

M1源码在 `I:/AI_AgentNexus/src/agentnexus/`，可在仓库运行 `node tools/agentnexus/run-tests.mjs` 与 `node src/agentnexus/cli.ts demo`。无需安装npm包，不运行模型/任意Shell。完整部署仍BLOCKED，目录中的设计默认ON不代表对应模块已实现。

交付恢复入口：[源码快照](reports/source_snapshot_manifest.json) · [变更清单](reports/change_manifest.json) · [交付哈希](reports/delivery_manifest.json)。原始M0、输入、规则和Suite保持原字节。
