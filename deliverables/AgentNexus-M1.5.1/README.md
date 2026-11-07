# AgentNexus M1.5.1

**CPU 严格资格 FAIL；完整 Windows 生产执行链 BLOCKED。** 本轮是实际整改与证据交付，不是生产放行。

冻结源码 100 文件，集合 SHA256 `3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0`。完整回归 **305 项：296 PASS / 8 NOT_RUN / 1 FAIL，exit 1**；严格 TypeScript 与 Node 语法 PASS。固定 CPU 矩阵 **58 项：2 PASS / 56 FAIL**，全部保留。生产高风险门禁在证书检查前固定拒绝已知未合格资源能力。

- [总体报告](overall-report.md)、[最终验收](acceptance-report.md)、[机器裁定](acceptance.json)、[问题账本](issue-ledger.json)
- [Phase 0 与历史](phase0-report.md)、[CPU 根因](cpu-root-cause-report.md)、[CPU 资格](cpu-qualification-report.md)
- [Bootstrap](bootstrap-revision-design.md)、[Broker/IPC](broker-ipc-validation-report.md)、[文件边界](file-broker-security-report.md)、[进程树/ExitProof](process-tree-exitproof-report.md)
- [资源治理](resource-governance-design.md)、[审计覆盖](audit-producer-matrix.md)、[Feature](feature-catalog.md)、[Policy](policy-catalog.md)、[ADR](adr.md)
- [独立审查](independent-code-review.md)、[部署审批](deployment-approval.md)、[M1.6 建议](m16-recommendations.md)
- [完整源码与测试](source/)、[源码 ZIP](AgentNexus-M1.5.1-source.zip)、[源码 SHA256](source-sha256.json)、[原始证据](evidence/)

复验使用 Node 24.15.0、PowerShell 7 与锁定 TS 5.9.3 / @types/node 24.10.1 / undici-types 7.16.0。设置 AGENTNEXUS_TYPE_TOOLS、AGENTNEXUS_TEST_PYTHON_PATH、AGENTNEXUS_TEST_POWERSHELL_PATH 后，从 source 运行 `node tools/agentnexus/verify-m15.mjs --output-root <源码外隔离目录>`。这是保留名称的通用继承 runner，会发现所有新增测试。CPU 另运行 `node tools/agentnexus/cpu-qualify-m151.ts --output-root <源码外证据目录>`，预期当前环境失败，不改 exit code。

WindowsApps 下现有 PowerShell 的逐祖先句柄固定被拒绝。只为原语测试复制了现有 runtime 到 `.workflow-kit/runtime/m151-ps`，658 文件逐 hash 相同，无安装或 ACL 修改；来源与复制作法见 evidence/toolchain 与 build-tools。复验不得使用复制动作授予任何生产身份。现有 Node DACL 不满足生产受保护 pin，正向 pin 与跨账户组合仍未运行。
