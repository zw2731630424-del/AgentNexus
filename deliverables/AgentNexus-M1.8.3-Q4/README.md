# AgentNexus M1.8.3-Q4

**UNSIGNED / NO-GO。已完成只读预检和审批材料；真实部署、UAC和OS资格未执行。** 用户确认暂无批准签发者/证书/Pin，要求等待正式签发方案。

- [阶段验收](acceptance-report.md) · [机读裁定](acceptance.json) · [完整部署报告](deployment-report.md)
- [精确部署范围草案](approval/deployment-request.md) · [当前194项基线安装清单](approval/installation-manifest.json) · [清单非最终状态](approval/installation-manifest-status.json)
- [签名与证书](reports/signatures-and-certificates.md) · [真实宿主/Token/ACL原始证据](evidence/host-evidence-manifest.json) · [依赖预检](evidence/dependency-preflight.json)
- [Service](reports/credential-service.md) · [ACL](reports/acl-sddl.md) · [Helper/UAC](reports/uac-helper.md) · [High Pipe](reports/high-pipe.md) · [Daily Pipe](reports/daily-pipe.md)
- [Runtime隔离](reports/runtime-isolation.md) · [同SID](reports/same-sid-attacks.md) · [不同SID](reports/different-sid-attacks.md)
- [原70项OS状态](reports/windows-os-tests.md) · [19类资格证据](reports/qualification-evidence.md) · [部署后E2E](reports/synthetic-e2e.md)
- [崩溃恢复](reports/crash-recovery.md) · [Ledger](reports/token-ledger.md) · [Egress](reports/data-egress.md) · [离线验证](reports/offline-verification.md)
- [独立复核](reports/independent-security-review.md) · [回滚](reports/rollback-record.md) · [DeepSeek后续准入](reports/deepseek-live-entry.md) · [治理](reports/governance.md) · [SHA256SUMS](SHA256SUMS)

Q3原始载荷和源码ZIP保持原位，以Hash引用；本目录不复制468MB载荷，也不把基线清单称为最终签署清单。真实Key/Provider/模型Token/费用为0；100m授权不重置；未Commit/Push。
