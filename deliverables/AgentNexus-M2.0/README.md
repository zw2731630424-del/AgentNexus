# AgentNexus M2.0 — Adaptive Security Architecture

已交付可运行的 Local Development Mode、Security Center 与统一46项安全开关。Hardened仍BLOCKED；真实Key/Provider调用为0。最终定向32/32、独立84/84与5组探针、实际Electron11/11通过；扩展全量保留3项旧测试失败。

在当前工作区双击 `Start-AgentNexus.cmd`，或：

```powershell
cd I:\AI_AgentNexus\deliverables\AgentNexus-M2.0\source
npm run desktop
```

首次新目录默认Local。Model Providers添加模型和API Key，运行合成测试，选择模型并绑定Agent。Settings区的Security Center管理模式、独立开关、Policy执行强度、预算、导入导出和变更确认。所有状态来自后端。现有旧目录不会自动降级，REAL账本归属未知会阻断真实调用。

当前工作区使用已存在的固定版本Electron/TypeScript依赖；独立解压使用Node24.15.0并在source执行npm ci恢复lockfile固定依赖（本轮未执行依赖下载）。完整包包含自有源码、已构建app、合同、补丁、测试原始证据、独立报告与逐文件SHA；不重新分发第三方运行时二进制。E2E/基线对照脚本使用项目工作区布局。

- [最终验收与限制](acceptance-report.md) · [逐项状态](acceptance.json)
- [架构](reports/architecture.md) · [两模式合同](reports/mode-contracts.md) · [Policy/Egress/预算](reports/policy-egress-contracts.md)
- [Credential Storage](reports/credential-storage.md) · [迁移](reports/migration.md) · [46项绑定](reports/feature-integration.md)
- [Schema与默认Profile](source/config/agentnexus/security/) · [源码修改](source-changes.patch) · [源码清单](source-manifest.json)
- [测试证据](reports/testing.md) · [独立审查](reports/independent-review.md) · [历史7295文件校验](evidence/history-verification.json)
- [完整交付ZIP](AgentNexus-M2.0-complete.zip) · [ZIP SHA256](AgentNexus-M2.0-complete.zip.sha256) · [源码ZIP](AgentNexus-M2.0-source.zip) · [逐文件SHA256](SHA256SUMS)

固定边界与可选模块有明确区分。Local不承诺同SID/管理员隔离；精确逐请求Egress批准UI、非Windows凭证适配和Hardened远程配置/OS资格仍未完成。没有任何真实部署操作或Commit/Push。

校验当前交付：`node Verify-Delivery.mjs`。它核对SHA256SUMS中的全部内容文件，并在完整ZIP及相邻checksum存在时校验ZIP。完整工作区治理已通过。
