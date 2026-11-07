# AgentNexus M1.5 — 候选交付

**完整Windows生产执行链仍BLOCKED。** 最终回归289项：265 PASS / 23 NOT_RUN / 1历史CPU FAIL。严格tsc通过；独立审查限定通过。最终CPU资格10/10 FAIL，未改系统配置，未把模拟/原语升级为生产通过。

- [最终验收](acceptance-report.md) · [机器裁定](acceptance.json) · [原始逐case](test-results.json)
- [Phase0冻结](phase0-report.md) · [总体架构](design.md) · [ADR](adr.md)
- [Host](host-bootstrap.md) · [Worker](worker-bootstrap.md) · [身份](runtime-identity.md) · [Broker](production-broker.md) · [Trusted IPC](trusted-ipc.md)
- [Sandbox](windows-sandbox.md) · [File Broker](file-broker.md) · [Supervisor](process-supervisor.md) · [ExitProof](exit-proof.md) · [资源释放](resource-release.md)
- [Audit覆盖](audit-producer-matrix.md) · [Feature/Policy](feature-policy-catalog.md) · [安全矩阵](security-test-matrix.md)
- [CPU资格FAIL](cpu-qualification-report.md) · [严格TypeScript PASS](typescript-report.md) · [独立安全审查](independent-security-review.md)
- [系统授权清单](deployment-approval.md) · [Ubuntu准备](ubuntu-adapter-spec.md) · [M1.6剩余工作](m16-recommendations.md)
- [完整源码/测试/工具](source/) · [源码ZIP](AgentNexus-M1.5-source.zip) · [源码SHA](source-sha256.json) · [原始证据](evidence/)

91文件集合SHA256 `a55823fae02fd565249cf0d2af1f3257d2e107b798b05b078b74ba15eb0e109e`。根M1.3、M1.2/M1.3/M1.4原件和1986 tracked文件均保全；本轮只在独立交付及.workflow-kit任务/临时路径操作，未自动Commit/Push。

复验需原始Node24.15.0、可信Python/PowerShell绝对路径。源码运行时仍无npm产品依赖；真正类型检查使用锁定TS5.9.3/@types-node24.10.1/undici-types7.16.0，可在隔离目录 `npm ci --ignore-scripts` 并设置 AGENTNEXUS_TYPE_TOOLS。从source运行 `node tools/agentnexus/verify-m15.mjs --output-root <源码外临时根>`，设置 AGENTNEXUS_TEST_PYTHON_PATH 与 AGENTNEXUS_TEST_POWERSHELL_PATH；会保留全新原始记录。当前CPU会导致完整suite FAIL，不能把exit1改为通过。

实际生产入口为 `src/agentnexus/bootstrap/entry.ts host|launcher --config <外置绝对路径> --sha256 <外置受保护hash>`；Operator另走受保护端点。当前没有可用真实部署配置/密钥/Profile/Task，直接调用应BLOCKED，不能用当前操作者替代独立角色。不要为演示跳过attestation/资格或修改false事实。
