# AgentNexus M1.8.3-Q3

**普通权限合成闭环已通过；生产 Windows / UAC / live Provider 资格仍 BLOCKED。**

- [验收报告](acceptance-report.md) 与 [逐项机读裁定](acceptance.json)
- [独立安全审查](reports/independent-security-review.md)
- [实现与复现](reports/implementation.md)、[完整源码 ZIP](AgentNexus-M1.8.3-Q3-source.zip)、[源码变化](source-changes.json)
- [完整 Electron/Node/native 载荷与精确目标](approval/installation-manifest.json)
- [部署审批和回滚](reports/deployment-approval.md)；当前批准模板 false / unsigned，**不执行 Apply**
- [实际 Medium Electron E2E](evidence/desktop-e2e/result.json)、[请求/响应/Usage](evidence/desktop-e2e/request-response-usage.json)、[原始服务记录](evidence/desktop-e2e/raw-service-records.json)
- [最终限定回归 229/229](evidence/verification/result.json)、[治理与历史保护](reports/governance.md)
- [原70项 OS 计划](tests/windows-attack-tests.json) 与 [0 PASS / 70 NOT_RUN](tests/windows-qualification.json)
- [SHA256SUMS](SHA256SUMS)

真实 Key / DeepSeek 请求 / 模型费用为0。没有创建服务、安装、账户/系统 ACL 变更或 UAC；未 commit/push。不要把同 SID 合成进程通信或编译/纯测试当作生产 OS 隔离通过。
