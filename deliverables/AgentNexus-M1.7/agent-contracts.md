# 五类 Agent 运行合同

所有模型输出由明确标记的 Codex 编写模拟策略提供；以下 PASS 仅表示实际本地运行与断言通过，不表示真实模型自主研发通过。

| 类型 | 合同与允许操作 | 强制边界 |
|---|---|---|
| DEVELOPMENT | 读原始需求/规则、提交计划、经 Message Bus 派发与整合；独立 delivery Task 绑定 G6 | 模型不能自行授予权限、设置 Gate PASS 或运行 Shell |
| SUBAGENT | Research/Architecture/Coding/Test/Debug/Docs；独立 Task、Runtime、Context、Model Binding、Worker Budget | 文件写仅限合同产出与指定 resource；Debug 限单文件的原版本替换 |
| RESIDENT | 接收持久消息、按事件唤醒安全等待 Task、报告遗漏与最终结果 | 无代码写工具，不改目标/规则，不唤醒待审批/UNKNOWN 副作用 |
| BACKGROUND_REVIEWER | 读取原始代码、Diff、候选与实际检查报告；返回文件/行号/复现 | 只读；不修代码、不 Commit、不改 Policy 或审计 |
| COORDINATOR | 只读获准项目状态，给出就绪/优先级/资源建议 | read_projects 精确授权；不批准高风险、不改项目决策、不写代码 |

| 实际 Task/Agent | 类型 | 模型策略绑定 | 结束时 Task 状态 | 回合 |
|---|---|---|---|---|
| architecture | SUBAGENT | design | SUCCEEDED | 1 |
| code-analytics | SUBAGENT | cheap | SUCCEEDED | 4 |
| code-cli | SUBAGENT | cheap | SUCCEEDED | 7 |
| code-model | SUBAGENT | cheap | SUCCEEDED | 4 |
| coordinator | COORDINATOR | cheap | WAITING | 2 |
| debug | SUBAGENT | cheap | SUCCEEDED | 3 |
| delivery | DEVELOPMENT | delivery | SUCCEEDED | 1 |
| docs | SUBAGENT | cheap | SUCCEEDED | 7 |
| integration | SUBAGENT | cheap | SUCCEEDED | 11 |
| lead | DEVELOPMENT | lead | SUCCEEDED | 16 |
| research | SUBAGENT | cheap | SUCCEEDED | 1 |
| resident | RESIDENT | cheap | WAITING | 3 |
| review-before | BACKGROUND_REVIEWER | review | WAITING | 1 |
| review-final | BACKGROUND_REVIEWER | review | WAITING | 1 |
| test | SUBAGENT | cheap | SUCCEEDED | 7 |
| test-runner | SUBAGENT | cheap | SUCCEEDED | 2 |

完整 ID、runtime_instance_id、原 Context 引用、文件范围、工具授予、规则版本、历史窗口、Task Contract 与三级预算见 [runtime-config.json](runtime-config.json)。这些是最新真实 Native 数据库的只读导出，而非推测配置。Resident/Coordinator/Reviewer 的 WAITING 是事件角色的有效等待状态；源码写者和交付 Task 均 SUCCEEDED。Host 关闭后服务处于停止状态，不能把报告时 WAITING 误解为交付后仍有后台服务。

平台/项目 workers4、memory256MiB、disk64MiB、processes8、model_requests1000、tokens2000000；每 Worker workers1、memory64MiB、processes1、model_requests128。调度并发3、Task 最大32回合、上下文65536bytes、输出4096tokens。预算为 Native Harness 逻辑账本；不声称每个 Agent 是独立 OS 进程或 OS 内存硬隔离。
