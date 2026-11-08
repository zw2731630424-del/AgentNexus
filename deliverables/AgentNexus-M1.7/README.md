# AgentNexus M1.7 交付

已完成 M1.6.1 上的原生多 Agent 本地研发闭环与工程验证。**模型规划、代码生成和审查推理由模拟 Provider 驱动；真实自主研发结论为 SIMULATED。** 固定 Host 检查器实际执行了源码检查、严格 TypeScript 与测试；Pilot 文件实际经过 Agent Loop、Tool Gateway、精确授权、Storage Owner、Message Bus、审计和 G0–G6。

| 验收范围 | 结果 |
|---|---|
| 完整回归 | PASS：532 项，523 PASS / 9 NOT_RUN / 0 FAIL |
| M1.7 新增测试 | 53 项，52 PASS / 1 NOT_RUN / 0 FAIL |
| 语法、严格类型检查 | PASS |
| 本地模拟 Provider Pilot | PASS：三编码任务并发峰值 3；21 次受管发布；最终 10 文件 |
| 修复与再审 | 实际 zero-weight NaN 测试失败 → Debug 版本替换 → 10/10 测试通过 |
| Gate | G0–G6 本地证据 PASS；修复前 G3/G4 FAIL 保留 |
| Resident 两小时实测 | PASS，详见独立报告 |
| 真实 Provider / 通用自主研发 | SIMULATED，未联调真实模型 |
| 严格累计 CPU / 生产 OS / 普通 Agent PROCESS、EXTERNAL_EFFECT | BLOCKED |

交付入口：[最终验收](acceptance-report.md)、[机器验收](acceptance.json)、[Phase0](reports/phase0.md)、[架构](architecture.md)、[合同与配置](agent-contracts.md)、[运行配置原记录](runtime-config.json)、[源代码](source/)、[源码 ZIP](AgentNexus-M1.7-source.zip)、[Pilot 导出](pilot/AgentNexus-Pilot-Project/README.md)、[SHA256 清单](SHA256SUMS.txt)。

专项报告：[协作](reports/multi-agent.md)、[主 Agent 研发](reports/development.md)、[子 Agent 并行](reports/subagent-parallel.md)、[Resident](reports/resident-longrun.md)、[Reviewer](reports/background-reviewer.md)、[Coordinator](reports/coordinator.md)、[Context](reports/context-provenance.md)、[Message Bus](reports/message-bus.md)、[Scheduler](reports/task-scheduler.md)、[Model Gateway](reports/model-gateway.md)、[资源治理](reports/resource-governance.md)、[Gates](reports/gates.md)、[独立安全审查](reports/independent-security-review.md)、[历史失败与限制](reports/failures-and-qualifications.md)、[重现](reproduce.md)、[M1.8 建议](m18-recommendations.md)。

证据：[最新 Native 运行](evidence/native/report.json)、[真实发布链](evidence/native/storage-writes.json)、[原 Context 派生转录](evidence/native/context-transcript.jsonl)、[全记录与引用 Artifact 核验](evidence/native/evidence-decoding.json)、[回归原日志](evidence/verification/all-tests.tap)、[原始运行索引](evidence/raw-run-index.json)、[完整原始 ZIP](evidence/raw/)、[基线冻结](evidence/baseline/phase0.json)、[历史文件保护](evidence/history-preservation.json)、[源码变更](evidence/source-changes.json)。所有历史 FAIL 均保留。

引擎源码集：`8167ce3e78c602f43bee2b3a4d792a5054f76d7121a6a7730b14cc37eb5c4c6c`（155 文件，Unicode codepoint 路径排序；UTF-8 `path + NUL + sha256 + LF`）。M1.6.1 的 140 文件中仅 5 文件修改，15 文件新增；所有继承测试和 Feature/Policy Catalog 字节保持。主仓库源码、规则和历史交付保持。未 Commit/Push、未安装 Hook、未读取 API Key、未连接真实 Provider、未修改账户/ACL/AppContainer。

Pilot 导出属于包装复制；原生所有权、版本和文件身份引用原运行目录，不能把复制文件的 inode 当作原 Storage Owner 身份。审计和压缩 Artifact 的完整副本位于 `evidence/raw/v.zip` 内的 `r-cc1c68b6fcfb/data/native-pilot/2026-11-08T03-36-35-394Z-2120/host`。


[A–H 分项测试与验收矩阵](reports/test-matrix.md)包含每项范围、原测试位置及尚未验证事项。
