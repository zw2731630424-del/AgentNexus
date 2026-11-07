# M0 本轮验证记录

取证完成UTC时间：2026-11-06T16:21:08.671269+00:00。这些检查验证研究证据和规格结构，**不验证尚未实现的产品行为**。

## 真实执行结果

| 项目 | 本轮结果 | 证据和边界 |
|---|---|---|
| Workflow Kit unittest | 91 PASS、9 SKIP、0 failure/error；发现100 | [机器结果](../../../runtime/AgentNexus-v0.4-M0/workflow-audit-results.json)、[日志](../../../runtime/AgentNexus-v0.4-M0/workflow-unittest.log)；5项授权边界、4项OS链接权限跳过 |
| 包/示例/AST/负例 | 实际运行；包完整性漏检已复现 | [检查与复现日志](../../../runtime/AgentNexus-v0.4-M0/workflow-checks.log)；原套件未改 |
| Python SQLite/文件小探针 | 5 PASS | [结果](../../../runtime/AgentNexus-v0.4-M0/storage-probe-results.json)；SQLite3.49.1不作生产准入 |
| Node SQLite绑定 | 3 PASS | [结果](../../../runtime/AgentNexus-v0.4-M0/node-sqlite-probe-results.json)；SQLite3.51.3、16worker |
| Zstd流式/损坏/背压 | 3 PASS | [结果](../../../runtime/AgentNexus-v0.4-M0/zstd-probe-results.json)；32MiB合成数据、64KiB块、1793drain |

初次Zstd输入高度可压缩，背压未触发为INCONCLUSIVE，[初次结果](../../../runtime/AgentNexus-v0.4-M0/zstd-probe-initial-results.json)保留；随后只针对该未决项改用确定性伪随机数据。Node探针初版Worker接收URL字符串产生ERR_WORKER_PATH，修正为URL对象后用新fixture运行，未称初版通过。SQL/压缩是真实本地操作，输入是合成数据，无LLM/Fake模型联调，不代表完整产品实现。

## 证据与规格检查

| 检查 | 结果 | 范围 |
|---|---|---|
| INPUT-HANDOFF | PASS | {} |
| INPUT-AgentNexus_v0.4_Architecture.md | PASS | {} |
| INPUT-AgentNexus_v0.4_Codex_Task.md | PASS | {} |
| INPUT-AgentNexus_v0.4_Codex_Start_Prompt.md | PASS | {} |
| INPUT-ai-workflow-kit-v4.0.0.zip | PASS | {} |
| WORKFLOW-ORIGINAL-UNCHANGED | PASS | {"files": 105} |
| RULES-UNCHANGED | PASS | {} |
| SOURCE-HASHES | PASS | {"checked_hash_records": 11508, "snapshots": 11} |
| FEATURE-CATALOG-STRUCTURE | PASS | {"count": 108, "errors": [], "behavior": "NOT_RUN"} |
| POLICY-CATALOG-STRUCTURE | PASS | {"count": 22, "errors": [], "behavior": "NOT_RUN"} |
| IMMUTABLE-SOURCE-CITATIONS | PASS | {"citations": 207, "errors": []} |
| LOCAL-DELIVERY-LINKS | PASS | {"errors": []} |
| WORKFLOW-ISOLATED-RESULTS | PASS | {"passed": 91, "skipped": 9} |
| STORAGE-FEASIBILITY-RESULTS | PASS | {"assertions": 11, "scope": "synthetic real SQLite/filesystem/Zstd only; product/model NOT_RUN"} |
| DELIVERABLES | PASS | {"required": 16, "adrs": 5} |
| GOVERNANCE | PASS | {"exit_code": 0, "log": ".workflow-kit/runtime/AgentNexus-v0.4-M0/govern-final.log"} |

## 明确未运行

所有候选Harness/SDK产品测试、真实Provider、OS隔离/越权对抗、Feature真实启停、Policy三模式、断电、long soak与科研实验均NOT_RUN。Feature/Policy目录仅做Schema字段、ID、依赖DAG与测试映射检查。上游validation旧报告为继承资料，不改成本轮PASS。

产品测试ID尚未变为实现；本轮未运行任何正式科研实验、自动commit/push、hooks或候选安装脚本。原输入/套件/项目规则指纹核对见上表。

完整机器记录：[m0-verification.json](../../../runtime/AgentNexus-v0.4-M0/m0-verification.json)；源码引用映射：[citation-verification.json](../../../runtime/AgentNexus-v0.4-M0/citation-verification.json)；交付指纹：[delivery_manifest.json](delivery_manifest.json)。
