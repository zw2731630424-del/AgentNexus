# AgentNexus M1.8.3-Q1

**已完成只读预检和部署审阅包；当前 NO-GO，生产 Credential Vault 继续 BLOCKED。未执行系统变更。**

本机 Windows 11 25H2 / Build 26200.9711。目标服务/安装根/数据根不存在，Service SID 仅为 Inactive 计算值，没有真实服务 Token。冻结源码和既有发布 Hash 匹配；M1.8.2 同 SID 解密 FAIL 保留。

用户已于 2026-11-09 选择方案 1：普通主 UI，添加 Key 时单独弹出 UAC 与短时可信录入窗口；这项选择只确定界面方向。现有候选仍未实现 helper，普通 Medium UI 与 High/elevated IPC/受保护 profile 的冲突及日常 Gateway 的可信路径仍待解决。另缺最终外部签发者与完整桌面载荷；不同 SID 攻击身份尚不可用。因此本包明确不可直接执行，不通过提升整个 UI 或放宽 pipe 来宣称完成。

先阅读 [最终部署审阅包](approval/deployment-approval.md)、[只读预检](reports/read-only-preflight.md)、[UI/IPC 方案](reports/ui-ipc-decision.md)、[当前资格裁定](reports/final-qualification.md)。可机读范围与门禁：[deployment-plan.json](deployment-plan.json)、[acceptance.json](acceptance.json)。

|交付内容|入口|
|---|---|
|Windows 环境/实际采集|[环境报告](reports/windows-environment.md) · [原始宿主观察](evidence/preflight-host-medium/preflight.json) · [沙箱观察](evidence/preflight-sandbox/preflight.json)|
|精确候选安装文件|[111 条源/目标/Hash 映射](approval/installation-manifest.json) · [完整候选 app manifest](approval/app-manifest.json)|
|未部署记录/实际 SID、Token 状态|[部署记录](deployment-record.json) · [服务身份](service-identity.json) · [真实现有进程 Token](evidence/preflight-host-medium/actual-process-tokens.json)|
|实际/拟议 ACL|[实际 ACL/SDDL](evidence/preflight-host-medium/actual-acl-sddl.json) · [拟议安全描述符](approval/security-descriptors.json) · [拟议描述符解析](evidence/proposed-descriptors-parse.json)|
|Named Pipe|[安全报告](reports/named-pipe-security.md)|
|同 SID/不同 SID/替换攻击|[同 SID](tests/same-sid-tests.json) · [不同 SID](tests/different-sid-tests.json) · [程序替换](tests/process-replacement-tests.json)|
|生命周期/崩溃恢复|[凭证生命周期](tests/credential-lifecycle-tests.json) · [Host/Service 恢复](tests/crash-recovery-tests.json)|
|32 项 OS 测试/11 项资格|[完整攻击合同](tests/windows-attack-tests.json) · [11 项资格](tests/windows-qualification.json)|
|账本/Egress|[唯一授权与账本](reports/token-ledger-verification.md) · [最终 Egress](reports/data-egress-verification.md)|
|独立审查/回滚|[部署后独立审查待执行](reports/independent-security-review.md) · [回滚预验证](reports/rollback-validation.md)|
|历史完整性|[源码 225 文件验证](evidence/source-verification.json) · [历史 FAIL](evidence/historical-same-sid-fail.json) · [969 文件收尾对照](evidence/historical-preservation.after.json)|
|SHA256/治理|[本包 SHA256](SHA256SUMS.txt) · [本轮治理报告](reports/governance.md)|
|后续真实联调|[DeepSeek 前提](reports/deepseek-followup-conditions.md) · [本轮实际使用](usage-token-cost.json)|

所有新服务 OS 攻击/资格/生命周期/恢复结果为 **NOT_RUN**，实际身份字段留空；当前状态页不是伪造的通过报告。Hash/转译/描述符解析是只读材料验证，不是操作系统隔离测试。服务正式启动后的 SID、Token、实际 pipe 与加载文件清单不能在部署前产生。

本轮真实 Key、Provider 请求、Token 与费用均 0。既有 100,000,000 输入+输出合计授权未重置、未新增；没有创建正式或资格账本。没有 commit/push 或修改历史交付。当前暂停于用户要求的审批边界；需先补齐门禁并重新提交精确变更清单，用户明确批准后才能开始部署。
