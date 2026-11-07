# M0.1 / M1 本轮验证

本记录只验证列明的本地内核和设计证据。操作系统管理员身份、任意执行沙箱、真实模型及长期运行未通过准入。

实际总计：135 tests；131 PASS、0 FAIL、4 NOT_RUN（测试框架skip）。

| 检查 | 状态 | 范围 |
|---|---|---|
| RUNTIME | PASS | Actual installed binding, not a model or OS sandbox test |
| M0_AND_PROTECTED_UNCHANGED | PASS | 24 historical deliverables + 112 original rules/inputs/Kit files |
| COMPLETE_M0_EVIDENCE_UNCHANGED | PASS | 11,784 protected M0 source/cache/input/rule files, actual file hashes |
| CACHED_CANDIDATE_MATCH | PASS | Resume only if the exact already-tested source candidate still matches its post-test closure certificate |
| SOURCE_SYNTAX | PASS | Node erasable TypeScript syntax and Python AST; static TypeScript type checking NOT_RUN |
| LOCAL_M1_TESTS | PASS | Real native code/SQLite/Zstd/filesystem/known parser/process tests with synthetic inputs; no real model; reused exact recorded run |
| NATIVE_DEMO | PASS | Actual local Tool/Audit/Context/Artifact + JSON checker, explicitly no model/Shell; recorded execution retained |
| CANDIDATE_STABLE | PASS | Exact source candidate unchanged throughout all checks |
| CATALOG_COPY | PASS | Runtime receives the reviewed versioned definitions; executable availability separate |
| M1_SOURCE_DEPENDENCY_CLOSURE | PASS | Zero npm dependencies, complete actually introduced source candidate and node:* edges; external runtime redistribution BLOCKED |
| DELIVERY_LINKS | PASS | Local references in new delivery |
| GOVERNANCE | PASS | Existing lite gates only; no rule edits, hooks, commits or push |

四项链接用例若因OS权限未运行，只保留NOT_RUN，不折成PASS。完整日志和机器记录：

- [TAP](../../../runtime/AgentNexus-v0.4-M1/all-tests.tap)
- [逐项结果](../../../runtime/AgentNexus-v0.4-M1/test-results.json)
- [总验证JSON](../../../runtime/AgentNexus-v0.4-M1/final-verification.json)
- [真实本地演示](../../../runtime/AgentNexus-v0.4-M1/demo.json)
- [实际源码依赖闭包](../../../runtime/AgentNexus-v0.4-M1/license-closure.json)
- [源码快照](source_snapshot_manifest.json)
- [测试矩阵与未测项](M1_test_matrix.json)

独立审查发现及修前探针保留在runtime/reviews，修复和最终候选绑定另见M1报告。Node --check/原生类型擦除不是tsc类型检查；后者NOT_RUN。所有输入为自造数据，真实执行的是SQLite/文件/Zstd/固定解析器等，不含模型或正式科研实验。
