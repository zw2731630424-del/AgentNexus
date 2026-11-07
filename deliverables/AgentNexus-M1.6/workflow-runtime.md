# Workflow Runtime 基础整合

依据M0已完成的105文件行为映射独立实现，不导入Workflow Kit代码、模板、安装器或无许可证表达。运行时使用类型化状态与可信owner；项目规则作为有hash来源的必要上下文注入，机械权限仍由可信合同/Policy/Gateway执行。完整规则编译器、所有模板/验证器和安装兼容层未完成。

| 能力 | 本轮实际接口/状态 | Feature |
|---|---|---|
| 规则 | createProject的rules/global_rules→不可变Archive来源；必要规则装不下拒绝 | wf.rules.registration/global/project-index |
| 任务合同 | createTask的goal、依赖、资源、验收条目、允许scope；scope不能增加Agent权限 | wf.templates.contract、native.task-scheduler |
| 工作角色 | SCOUT/VERIFIER/REVIEWER只读；WORKER可在既有grant内写 | wf.role.* |
| Evidence | 完整流读取和Artifact hash验证，空/超量/损坏引用拒绝 | wf.evidence |
| G0—G6 | 需求/规划/实现/复核/验收/回归/交付的有版本Gate ledger | wf.gate.g0—g6 |
| Checklist | 候选hash、最多16条带状态/理由/证据的类型化记录 | wf.checklists |
| Decision | 原Decision Ledger；只有Development合同+可信管理入口能提出/接受 | wf.decisions |
| Checkpoint | Task revision、Archive cursor、pending操作、reservation、候选hash及说明 | native.checkpoints-auto、wf.templates.checkpoint |
| Handoff | 独立目标Task、原来源合同、剩余deadline与完成消息 | native.task-scheduler、native.message-bus |

Gate状态保留PASS/FAIL/NOT_RUN/BLOCKED/INCONCLUSIVE/SIMULATED/BYPASSED。关闭Gate写BYPASSED；证据流读取后的提交点重新检查开关，不沿用读取前的ON。开启未执行不自动PASS。G3的PASS要求真实绑定的独立Reviewer身份与不同作者；模拟模型演示只记SIMULATED。

这里实现Gate证据/版本/状态owner，没有自动证明七门各自的实质质量。结构校验、证据hash、Reviewer文本不等于产品验收或科学结论。Gate绑定candidate、baseline、test profile、作者/审者、证据与时间；换候选不能把旧记录当新批准。

关闭wf.evidence、decisions、contract、checklists等功能会阻止相应新调用；既有raw/Decision/Gate事实保留。Gate正在进行的只读证据验证可以结束，但提交只能按最新状态BYPASSED/拒绝，不在OFF后发布旧PASS。工作流功能不会关闭OS、凭证、原Gateway或资源安全不变量。

wf.context以及其余没有实际owner的原105文件映射能力保持INTERFACE_ONLY/NOT_RUN；Feature目录中的存在和默认ON不等于已注册可用模块。自动规划、自动spawn、自动review watcher、全功能Resident、自动协调、自动修复、任意Shell与Git发布未因工作流接口而开放。
