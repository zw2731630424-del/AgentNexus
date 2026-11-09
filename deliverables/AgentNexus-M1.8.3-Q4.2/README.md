# AgentNexus M1.8.3-Q4.2

**签发工具已独立审查、修复、构建并通过离线测试。真实用户证书/Pin/签名尚未运行，实际部署保持 UNSIGNED / NO-GO。**

- [最终验收](acceptance-report.md) · [逐项状态](acceptance.json) · [总体报告](reports/design.md)
- [用户操作说明](signer/README.md) · [CNG/TPM 方案](reports/cng-tpm-plan.md) · [私钥边界](reports/private-key-boundary.md)
- [Signer 独立安全审查](reports/independent-signer-audit.md) · [CMS/CNG 独立复核](reports/cms-cng-independent-review.md)
- [CMS / DER Pin](reports/cms-and-der-pin.md) · [TOCTOU](reports/toctou.md) · [两阶段与回归](reports/testing.md) · [Verifier](reports/verifier-testing.md) · [异常与恢复](reports/exception-tests.md)
- [新候选准备](reports/new-candidate-preparation.md) · [部署审批材料（NO-GO）](approval-request/deployment-request.md) · [回滚](approval-request/rollback-plan.json)
- [最终 Signer](signer/AgentNexus.Qualification.Signer.exe) · [只读 Verifier](signer/AgentNexus.Qualification.Verifier.exe) · [源码修改](source-changes.patch) · [完整源码 ZIP](AgentNexus-M1.8.3-Q4.2-source.zip)
- [107 项模拟测试](evidence/signing-tests.json) · [14 项公开准备测试](evidence/preparation-tests.json) · [30 项要求映射](tests/signing-requirement-matrix.json) · [最终回归](evidence/regression.json)
- [阶段一预览](evidence/signer-preview.png) · [公开证书字段预览](evidence/signer-preview-certificate.png) · [阶段二预览](evidence/signer-preview-stage2.png)（均模拟、无用户钥）
- [源码清单](source-manifest.json) · [194 项 staging 清单](payload-staging-manifest.json) · [原始运行/失败索引](evidence/run-history.json) · [治理](reports/governance.md) · [SHA256SUMS](SHA256SUMS)

根 payload 仅 staging；reference/q41-approval 仅历史参考，禁止直接签署。实际最终候选须等用户公开 DER、独立 Pin 和目标身份，运行公开准备工具后产生新的 deployment ID、epoch 5、UTC 期限和全部 Hash。Signer/Verifier 在194项安装载荷之外另行绑定。当前没有真实最终 approval、CMS 或安装批准。

107/107 模拟、14/14公开准备、224 PASS /0 FAIL /5 SKIP 限定回归通过；98个独立只读命令和21项补审符合预期。真实CNG/TPM/用户在场与同SID隔离未证明，70项OS及19类生产资格仍NOT_RUN。真实Key/Provider/费用为0；没有证书/信任/系统变更、commit或push。
