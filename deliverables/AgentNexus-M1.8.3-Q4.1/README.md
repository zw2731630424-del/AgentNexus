# AgentNexus M1.8.3-Q4.1

**签发机制和离线准备已完成；当前 UNSIGNED / NO-GO。实际用户签发、部署和 Windows OS 资格未执行。**

- [总体设计](reports/design.md) · [阶段验收](acceptance-report.md) · [机读裁定](acceptance.json)
- [LOCAL 合同](contracts/local-qualification.md) · [PRODUCTION 合同](contracts/production-release.md)
- [证书方案](reports/certificate-design.md) · [私钥边界](reports/private-key-protection.md)
- [独立 Signer 操作范围](signer/README.md) · [Signer 源码](source/native/qualification-signer/QualificationSigner.cs) · [UI预览](evidence/signer-preview.png)
- [共享CMS/Pin实现](source/native/qualification-signer/SigningContracts.cs) · [安装器](source/tools/agentnexus/install-q41-qualification.ps1)
- [签名测试](evidence/signing-tests.json) · [回归](evidence/regression.json) · [独立审查](reports/independent-security-review.md)
- [精确部署申请](approval/deployment-request.md) · [194项安装清单](approval/installation-manifest.json) · [清单状态](approval/installation-manifest-status.json) · [回滚](approval/rollback-plan.json)
- [完整源码ZIP](AgentNexus-M1.8.3-Q4.1-source.zip) · [源码清单](source-manifest.json) · [改动](source-changes.json) · [SHA256SUMS](SHA256SUMS)

新候选194文件 / 468,553,232字节；Signer/Verifier在安装载荷之外，由签署计划另外绑定。未来初次安装保持stopped；服务启动和OS试验另批。实际证书Pin为null，没有签名或真实部署批准。

签名安全测试60/60 PASS（SIMULATED）；回归224 PASS /0 FAIL /5 SKIP。原70项OS测试与19类生产证据仍NOT_RUN。实际CNG/TPM强交互与同SID隔离未证明。真实Key/Provider/费用均0，原1亿Token授权不重置，无commit/push。
