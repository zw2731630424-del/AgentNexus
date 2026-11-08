# AgentNexus M1.8.3 — Credential Service Isolation

**生产 Vault / LIVE BLOCKED；授权范围内代码、合成联调和只读部署预检已交付。** 真实Key、请求和费用均0。

独立Windows Service + Virtual Service Account、固定受认证pipe、服务内部Vault/Key Pool/egress/唯一1亿Token Owner；原Model Provider UI、Gateway和Adapter沿用，只有必要接口改动。缺服务时普通桌面禁用凭证输入，无同SIDVault回退。

最终受影响回归 **183 PASS / 0 FAIL / 2 SKIP**，严格TS/编译通过。Native纯测40×2、入口负测6通过，独立离线审查完成。实际OS隔离及本轮Electron原生窗口仍未取得资格，历史同SID解密FAIL保留。

[最终验收](acceptance-report.md) · [生产Vault资格](reports/credential-vault-qualification.md) · [总体架构](architecture.md) · [同SID根因](reports/same-sid-root-cause.md) · [威胁模型](reports/threat-model.md) · [服务设计](reports/credential-service-design.md) · [IPC](reports/ipc-protocol.md) · [UI](reports/ui-integration.md) · [Key Pool](reports/key-pool-lifecycle.md) · [唯一账本](reports/token-ledger-owner.md) · [Data Egress](reports/data-egress-qualification.md) · [Windows测试](reports/windows-attack-tests.md) · [同SID](reports/same-sid-tests.md) · [不同SID](reports/different-sid-tests.md) · [恢复](reports/crash-recovery.md) · [独立审查](reports/independent-security-review.md) · [部署审批](reports/deployment-approval.md) · [精确范围/回滚](reports/deployment-runbook.md) · [DeepSeek具体正文](reports/deepseek-request-review.md) · [源码](source/) · [复现](reproduce.md) · [SHA256](SHA256SUMS.txt)。

源码 225 文件集合 SHA256 `108e724d0b5796f472d5eb46a9088c556f04084c4bca0dad9bceb9a691d0090a`。原M0—M1.8.2、Provider UI和根产品保持；没有commit/push。先批准独立身份的合成资格部署，真实OS证据通过后才可导入真实Key，随后审阅具体请求；本轮不重复申请Token额度。

## 本次 Git 发布

用户后续明确授权“全部保存提交推送”。本轮完整交付、源码 ZIP、自有 native 二进制、测试与原始失败证据、独立审查、部署审批和 DeepSeek 未发送请求材料一并提交。原实施阶段 README 与 SHA256 清单另存 evidence/*before-publication.txt；上文及原验收材料中的“未 commit/push”为实施阶段事实，后续发布见[授权与范围记录](../../.workflow-kit/tasks/AgentNexus-M1.8.3/publication.json)。运行数据库、依赖与编译缓存留在本地。生产 Vault / LIVE 仍 BLOCKED，系统部署和真实请求仍需分别批准。

发布内容可用 `python -X utf8 build-tools/verify-publication.py --staged` 校验，涵盖文件完整性、历史保护、源码 ZIP、治理分类与暂存字节。
