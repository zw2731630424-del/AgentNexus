# AgentNexus M1.8.1

**LIVE BLOCKED；新增离线整改通过。** 已完成基线冻结、DeepSeek官方接口核验、精确Data Egress、统一1亿Token预算、缓存/失败Usage和响应哈希留证；真实请求0、Token0、费用$0。

新增41项测试全PASS；完整回归635 PASS / 32 SKIP / 14 FAIL，语法与strict TS通过。全回归失败及原版同环境对照原样保留，不推断OS安全资格。

[最终验收](acceptance-report.md) · [机器验收](acceptance.json) · [Vault资格](reports/credential-vault-qualification.md) · [官方核验](reports/deepseek-official-check.md) · [独立安全审查](reports/independent-security-review.md) · [授权](authorization.json) · [Token/Cost](usage-token-cost.json) · [源码](source/) · [测试证据](evidence/verification-attempts.json) · [SHA256](SHA256SUMS.txt) · [后续建议](reports/m19-recommendations.md)。

真实Agent/Pilot/Reviewer/Debug/24小时均NOT_RUN；Single/Multi INCONCLUSIVE。独立OS身份、ACL/profile、启动证明、Host专属可信输入与唯一账本部署仍缺失。本轮未授权系统变更，因此没有索取或读取Key，也没有用Token授权绕过门禁。

M0–M1.8共15762项历史文件原字节保留；根产品不替换，未Commit/Push。当前source集 `d2091ef71fbd7a62f17ff8a42a922357759817073d97f1343d27b6ff7c9c3bb1`。

完整根治理检查PASS；最终交付路径增量核验与历史保护结果见[治理报告](reports/governance.md)。

本次 Git 发布由用户后续明确授权：完整 M1.8.1 交付、源码、测试、报告、合成文本证据和构建工具全部纳入。原始运行目录、数据库和压缩对象按仓库既有约定保留本地；前述“未 Commit/Push”描述保留为实施阶段事实。发布范围见[发布记录](../../.workflow-kit/tasks/AgentNexus-M1.8.1/publication.json)。
