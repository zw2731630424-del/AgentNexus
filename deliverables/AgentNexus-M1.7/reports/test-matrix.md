# A–H 分项测试与验收范围

完整原始结果为532项：523 PASS、9 NOT_RUN、0 FAIL。以下按用户A–H分类列证据，支撑用例集合允许重叠，不可把分组数相加。负面断言PASS表示预期拒绝/隔离，不表示被拒功能获得资格；所有模型规划/编码/审查语义仍SIMULATED。

| 分项 | 本地执行通过范围 | 明确限制 |
|---|---|---|
| A 单 Agent | 创建、Loop、原Context、Gateway工具、Task状态、受控恢复；未知副作用不自动重放。 | 模型语义SIMULATED；OS独立进程/生产隔离不在本地PASS内。 |
| B Multi-Agent | 三个逻辑Native编码任务并行、双向/同级消息、交接、所有权冲突、资源竞争、取消及恢复。 | 物理多CPU并行/真实Provider NOT_RUN；开发策略SIMULATED。 |
| C Resident | 持久接收/去重/过期/离线、唤醒、恢复、积压边界、真实受控Host重开；另读独立2小时报告。 | OS reboot/断电NOT_RUN；2小时全源码启动快照NOT_CAPTURED。 |
| D Reviewer | 真实Git工作树Diff、只读权限、数值NaN复现、类型/语法/测试、通知和修复后复验。 | 有意植入缺陷；Review推理SIMULATED；Git commit/push Watcher NOT_RUN。 |
| E Coordinator | 同store获准项目状态、共享预算、资源竞争、项目隔离、越权拒绝；事件priority独立测试。 | Pilot计划priority尚未映射入队（NOT_RUN/未实现）；跨Host全局预算NOT_RUN。 |
| F Context | 原历史/来源重建、明确缺失/不匹配拒绝、上下文上限、原规则绑定、跨Host窗口策略和恢复。 | 热索引32且原Archive不覆盖；无限历史/向量检索未实现，不作长期智能记忆PASS。 |
| G Workflow | G0–G6、证据缺失/伪造/失效、BYPASSED不授权、人工门负例、规则版本与迁移。 | 本轮profile无需人工门；人工实际签署NOT_RUN。模型建议不能授权。 |
| H Resource Governance | Worker/Project/Platform逻辑超额、并发预留、已知关闭释放、持久disk owner与UNKNOWN隔离。 | 严格累计CPU、生产OS硬限制、普通PROCESS/EXTERNAL_EFFECT全部BLOCKED。 |

每项对应原用例名、绝对测试快照路径、行号、PASS/NOT_RUN与skip原理由 [机器矩阵](test-matrix.json)给出。新增测试53项中52PASS/1NOT_RUN；唯一新增skip是真实file symlink夹具被OS拒绝，没有改变权限。
