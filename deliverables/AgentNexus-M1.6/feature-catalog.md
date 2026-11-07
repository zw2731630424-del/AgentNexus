# M1.6 Feature Catalog

完整机器定义含190项：继承170个ID并新增20项，无删除/重复。M1.6注册43个本地模块；存在于设计目录或默认ON不等于可用。默认状态、scope、dependency/conflict、off/recovery和测试映射见source/config/agentnexus/features.json。

本轮PASS只指qualification_scope注明的本地合同；Provider为SIMULATED，OS硬限制/生产资格不随Feature提升。Gate是版本/证据/状态ledger；规则是版本化捕获和必要装配，完整编译器NOT_RUN。wf.context明确INTERFACE_ONLY。

关闭的实际合同：执行/类型/资源模块阻止新准入并排空或隔离在途工作；Gate关闭后提交BYPASSED，正在进行的只读验证可结束；核算/退出/UNKNOWN清理事实可继续。通用off_behavior文字是共同治理目标，不能据它宣称每个可选只读服务已有独立抢占式强停。

| Feature | 默认 | 当前范围 | 资格 | 依赖 |
|---|---|---|---|---|
| native.harness | ON | IMPLEMENTED_LOCAL | PASS | core.identity, core.events, core.archive.raw, model.gateway |
| native.context-assembly | ON | IMPLEMENTED_LOCAL | PASS | native.harness |
| native.checkpoints-auto | ON | IMPLEMENTED_LOCAL | PASS | core.state |
| runtime.role.resident | ON | IMPLEMENTED_LOCAL | PASS | core.identity, core.state |
| runtime.role.lead | ON | IMPLEMENTED_LOCAL | PASS | core.identity, core.state |
| runtime.role.subagent | ON | IMPLEMENTED_LOCAL | PASS | core.identity, core.state |
| runtime.role.reviewer | ON | IMPLEMENTED_LOCAL | PASS | core.identity, core.state |
| runtime.role.coordinator | OFF | IMPLEMENTED_LOCAL | PASS | core.identity, core.state |
| model.gateway | ON | IMPLEMENTED_LOCAL | PASS | core.identity, core.audit.trail, core.artifact.store |
| model.auto-route | OFF | IMPLEMENTED_LOCAL | PASS | model.gateway |
| model.key-round-robin | OFF | IMPLEMENTED_LOCAL | PASS | model.gateway |
| model.provider-failover | OFF | IMPLEMENTED_LOCAL | PASS | model.gateway |
| wf.runtime | ON | IMPLEMENTED_LOCAL | PASS | core.state |
| wf.rules.global | ON | IMPLEMENTED_VERSIONED_RULE_CAPTURE | PASS | wf.runtime |
| wf.rules.project-index | ON | IMPLEMENTED_VERSIONED_RULE_CAPTURE | PASS | wf.runtime |
| wf.rules.registration | ON | IMPLEMENTED_VERSIONED_RULE_CAPTURE | PASS | wf.runtime |
| wf.context | ON | INTERFACE_ONLY | NOT_RUN | wf.runtime |
| wf.decisions | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime, core.decision.ledger |
| wf.evidence | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime |
| wf.role.scout | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime |
| wf.role.worker | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime |
| wf.role.verifier | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime |
| wf.role.reviewer | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime |
| wf.gate.g0 | ON | IMPLEMENTED_GATE_LEDGER | PASS | wf.runtime |
| wf.gate.g1 | ON | IMPLEMENTED_GATE_LEDGER | PASS | wf.runtime |
| wf.gate.g2 | ON | IMPLEMENTED_GATE_LEDGER | PASS | wf.runtime |
| wf.gate.g3 | ON | IMPLEMENTED_GATE_LEDGER | PASS | wf.runtime |
| wf.gate.g4 | ON | IMPLEMENTED_GATE_LEDGER | PASS | wf.runtime |
| wf.gate.g5 | ON | IMPLEMENTED_GATE_LEDGER | PASS | wf.runtime |
| wf.gate.g6 | ON | IMPLEMENTED_GATE_LEDGER | PASS | wf.runtime |
| wf.templates.checkpoint | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime |
| wf.templates.contract | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime |
| native.agent-lifecycle | ON | IMPLEMENTED_LOCAL | PASS | core.identity, core.state, core.audit.trail |
| native.agent-type-registry | ON | IMPLEMENTED_LOCAL | PASS | core.identity |
| native.agent-loop | ON | IMPLEMENTED_LOCAL | PASS | native.harness, native.context-assembly, native.agent-lifecycle, resource.registry |
| native.message-bus | ON | IMPLEMENTED_LOCAL | PASS | core.state, core.archive.raw, core.audit.trail |
| native.task-scheduler | ON | IMPLEMENTED_LOCAL | PASS | native.agent-lifecycle, resource.worker.budget, resource.project.budget, resource.platform.budget |
| model.mock-provider | ON | IMPLEMENTED_LOCAL | PASS | model.gateway |
| resource.registry | ON | IMPLEMENTED_LOCAL | PASS | core.state, core.audit.trail |
| resource.worker.budget | ON | IMPLEMENTED_LOCAL | PASS | resource.registry |
| resource.project.budget | ON | IMPLEMENTED_LOCAL | PASS | resource.registry |
| resource.platform.budget | ON | IMPLEMENTED_LOCAL | PASS | resource.registry |
| resource.cpu.accounting | ON | IMPLEMENTED_LOCAL | INCONCLUSIVE | resource.registry |
| resource.cpu.bandwidth | OFF | BLOCKED | BLOCKED | resource.registry |
| resource.cpu.consumption | OFF | BLOCKED | BLOCKED | resource.registry |
| resource.memory.limit | OFF | BLOCKED | BLOCKED | resource.registry |
| resource.disk.quota | OFF | BLOCKED | BLOCKED | resource.registry |
| resource.process.limit | OFF | BLOCKED | BLOCKED | resource.registry |
| resource.io.limit | OFF | BLOCKED | BLOCKED | resource.registry |
| resource.network.limit | OFF | BLOCKED | BLOCKED | resource.registry |
| resource.time.deadline | OFF | BLOCKED | BLOCKED | resource.registry |
| wf.checklists | ON | IMPLEMENTED_LOCAL | PASS | wf.runtime, wf.evidence |

所有测试ID已映射到实际m16测试文件，最终执行以test-results.json及其源集合为准。CPU accounting的整数ledger通过不解决M1.5.1真实Job/进程计量差异；该OS方面仍INCONCLUSIVE。未注册OS模块无ON旁路；严格CPU固定代码拒绝。
