# ADR 003 Workflow Kit 原生整合

状态：M0工程建议；原生内建与独立开关为用户明确要求。

决策：把规则、任务角色、G0—G6、模板、治理/校验器转换为Workflow Runtime的类型化RuleSpec、RoleProfile、GateDefinition、ArtifactSchema、Validator和EvidenceBinding；与Task Engine、Agent Loop、Tool Gateway原生连接。不是运行时要求Agent自己找ZIP或加载一套外置Prompt。

105文件逐项映射已完成：50 REIMPLEMENT、52 REFERENCE_ONLY、3来源元数据REUSE。原始ZIP、104条校验清单、SOURCES、测试与validation只读保留；原本的安装/卸载/发行包装不成为Native Harness运行依赖。所有运行功能有wf.* Feature，四任务角色与五系统角色分层，15业务模板和项目流程模板分别登记；文件/验证材料标识不是每项一个常驻服务。[完整映射](../workflow_kit_mapping.md)。

套件没有许可证正文，不能直接复制代码或模板原文到发行物。先用功能语义独立实现，并记录来源与测试意图；不宣称已经完成法律意义的clean-room重写。关键发现包括完整性清单同名文件漏检、治理CLI非OS沙箱、自报授权/缺原子并发保护，均不能原样作为可信安全核。[套件审计](../../research/workflow_kit_audit.md)。

每个Gate可独立OFF，结果BYPASSED而非PASS；关闭Workflow不解除OS/凭证/档案/专属科研授权。模板关闭后有最小手工任务/表单；自动严格审查关闭后仍可手工发起只读Reviewer。原始事件捕获不依赖Evidence Manager或自动Checkpoint开启。

验证：本轮91项隔离测试通过、9跳过，不标全套100通过；未来原生兼容测试需将源正/负例转为API级断言，覆盖功能关闭、依赖拒绝、保留数据及恢复。来源/继承validation与本轮实际测试结果分开；不能把上游旧报告导入成新实现PASS。
