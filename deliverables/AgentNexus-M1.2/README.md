# AgentNexus M1.2 交付入口

M1.2 已完成 P1-A/P1-B 的可信本地库整改，以及 P1-C/P1-D 的独立设计。最终完整测试 **171 项：167 PASS、4 NOT_RUN、0 FAIL**。完整 OS 安全部署仍 **BLOCKED**；科研执行和真实 Provider 未运行。

| 交付内容 | 文件 |
|---|---|
| 完整验收与能力边界 | [acceptance-report.md](acceptance-report.md)、[acceptance.json](acceptance.json)、[verification.json](verification.json) |
| 修改前独立复核 | [independent-recheck.md](independent-recheck.md) |
| 27 项问题/修复/保留账本 | [issue-ledger.json](issue-ledger.json) |
| Policy Enforcement 设计 | [policy-enforcement-design.md](policy-enforcement-design.md) |
| Operation Reconciliation 设计 | [operation-reconciliation-design.md](operation-reconciliation-design.md) |
| OS 安全边界 | [os-security-architecture.md](os-security-architecture.md) |
| 科研实验授权合同 | [scientific-authorization-contract.md](scientific-authorization-contract.md) |
| 完整当前源码/配置/测试/工具 | [source/](source/)、[AgentNexus-M1.2-source.zip](AgentNexus-M1.2-source.zip) |
| 源码 SHA256 | [source-sha256.json](source-sha256.json)、[SOURCE_SHA256SUMS.txt](SOURCE_SHA256SUMS.txt) |
| 最终机器可读测试结果 | [test-results.json](test-results.json) |
| 全部复跑及失败证据 | [evidence/runs/](evidence/runs/)、[evidence/baseline/](evidence/baseline/)、[evidence/final-test-data/](evidence/final-test-data/) |
| 独立代码审查 | [independent-code-review.json](independent-code-review.json)、[evidence/independent-review/](evidence/independent-review/) |
| M1.3 后续建议 | [m13-recommendations.md](m13-recommendations.md) |
| 原始请求与交付指纹 | [original-request.txt](original-request.txt)、[delivery-manifest.json](delivery-manifest.json)、[SHA256SUMS.txt](SHA256SUMS.txt) |

复跑：在项目根目录设置 `AGENTNEXUS_TEST_PYTHON_PATH`、`AGENTNEXUS_TEST_POWERSHELL_PATH` 为已有解释器绝对路径，然后执行 `node tools/agentnexus/verify-m12.mjs`。不需要 npm install；验证入口自动创建新副本/短数据路径，并输出新证据目录，不覆盖此交付或历史日志。源码 ZIP 只含自有源码及配置/测试，不包含运行时二进制或凭据。

升级要点：注册 Tool 必填 capability；LOCAL_WRITE 需非空已知应用策略、Writer 解析器及请求 resource_id，审批 hash 必须按该精确请求生成。应用模式不能免除副作用审批；普通 ToolContext 没有 Store。自定义策略 ID 与未知权限字段不再接纳；未实现 L2 owner 默认 DENY。所有注册回调仍必须来自可信 Bootstrap；不可信代码进程隔离尚未实现。

交付校验排除只针对根目录精确的自引用清单/校验文件，嵌套同名文件仍参与校验。SHA256 用于字节一致性，不提供独立 OS 信任根或管理员防篡改签名。
