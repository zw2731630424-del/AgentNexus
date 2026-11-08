# AgentNexus M1.6.1 — Native Harness Stabilization

可信本地稳定性范围已实现并验证；严格CPU及完整生产链BLOCKED，Provider均SIMULATED。[最终验收](acceptance-report.md)列出实际结果和全部限制。

| 交付 | 入口 |
|---|---|
| 总体与冻结 | [总体报告](overall-report.md)、[Phase 0](phase0-report.md)、[ADR](adr.md) |
| 历史失败与真实边界 | [历史FAIL](historical-failures-report.md)、[TOCTOU](toctou-report.md) |
| Storage | [Owner](storage-owner.md)、[Recovery](storage-recovery-report.md) |
| Context / Message / Scheduler | [来源](context-provenance.md)、[消息](message-reliability-report.md)、[恢复](task-scheduler-recovery-report.md) |
| Rules / Gates | [Compiler](rules-compiler.md)、[Gate Engine](gate-runtime.md) |
| 五角色与目录 | [角色验证](five-agent-verification.md)、[Feature](feature-catalog.md)、[Policy](policy-catalog.md) |
| 独立审查与后续 | [独立审查](independent-code-review.md)、[M1.7](m17-recommendations.md) |
| 源码/测试/证据 | [source](source/)、[源码ZIP](AgentNexus-M1.6.1-source.zip)、[源码SHA](source-sha256.json)、[运行历史](run-history.json) |

最终 479 项：469 PASS / 8 NOT_RUN / 2 FAIL；新增 99/99 PASS。strict TypeScript与语法PASS。全部继承测试原字节保留，CPU偶然通过旧弱断言不升级严格资格。

复验使用Node24.15.0、TS5.9.3/@types-node24.10.1已有隔离工具，无新增运行依赖或网络安装。设置AGENTNEXUS_TYPE_TOOLS、AGENTNEXUS_TEST_PYTHON_PATH、AGENTNEXUS_TEST_POWERSHELL_PATH为既有明确解释器；WindowsApps工具路径限制见environment证据。输出必须位于source之外：

```powershell
node source/tools/agentnexus/verify-m161.mjs --output-root I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.6.1\recheck --suite all
```

亦支持stabilization/storage/native子集。每次创建独立source/data/TAP/JSON/strict/SHA快照。生产资格与Provider状态不随测试偶然全绿改变。
