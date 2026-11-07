# AgentNexus v0.4 M0 报告

研究窗口：2026-11-06至07，Asia/Shanghai。交付状态：**M0研究与设计资料包已形成；不是完整产品实现、架构用户验收或上游代码发行准入。** 当前没有进入M1。

结论：采用AgentNexus自有协议与原生Harness，业务运行时优先TypeScript/Node，SQLite元数据与分段Zstandard原始档案；安全根位于独立可信控制域和受限执行域。工作流转换为原生类型/服务/校验器，模块与管理员模式有明确关闭/降级/恢复合同。现有Harness按模块参考或复用公开接口，不选任何一家整套核心为最终底座。

## 资料 规则 与环境

已完整阅读Architecture（1414行，包括v0.4末尾修订）、Codex Task与原始Workflow Kit全部105文件；额外Start Prompt仅作为参考归档，未把其指令当新授权。架构前文“4层却列5层”、旧版不可选Policy措辞、旧里程碑等与v0.4冲突时，以用户本轮要求和末尾修订为准。五个核心业务面不等于五个LLM常驻进程。

父级I:\未发现AGENTS.md；仓库AGENTS.md、治理policy、项目流程路由已读。project-rules/README.md不存在，registered_rules为空，无always附加规则。lite治理已启用，未启用full索引/复审/提交hooks，未修改规则。最初govern check被根目录新增交接ZIP阻断；用户明确同意将这一份移动到规范inputs目录后，检查恢复。Downloads原件保留。

| 输入 | SHA256 |
|---|---|
| Handoff ZIP | f669dad4a6b6937ca3d7c2463b8b2327b3fe2bb8fe2c8a53e6dfb4f2265b3934 |
| Architecture.md | 69d5c0c6e70400e148a2aefd79a0617d9792f241cef85415e769e3e834cea979 |
| Codex_Task.md | 77e86d2e4734635d497ffd915e9e6a00bae0529c865883c6305f57663cd97b37 |
| Workflow Kit ZIP | 4cad510cf666d37e0adb81f39ca3f1f29aa9f3b3ae7313726946e572e51736ec |

独立ZIP、Handoff内嵌ZIP和已安装目录105/105逐字节相同，104条SHA清单匹配。原始输入与来源manifest可复查。环境为Windows 11、Python3.12.10、Node24.15.0、Git2.54.0；当前目录不是Git仓库，未初始化/提交。未发现cargo/rustc/Docker，WSL枚举受权限拒绝，因此不能声称WSL不可用或已验证容器方案。

## 源码研究结果

覆盖DeepSeek、Cline、OpenHands UI/SDK、OpenCode、Goose、Agensh、Deep Agents、Codex、Claude SDK和ZCode共11主体仓库固定SHA，并深入LangChain等实际依赖。每条重要结论可沿[矩阵](../research/harvest_matrix.md)到源码分册、精确路径/行号和本地哈希。大部分仓库有完整tree，DeepSeek巨大tree中断、部分候选ZIP为残片；所用raw文件仍固定SHA保全，未把部分缓存写成全仓审完。

主要发现：

1. 现有权限并非相同语义：DeepSeek pre-execute可默认allow，Cline hook可改policy，Goose SmartApprove参考hint/模型，Deep Agents本地Shell没有系统隔离，Claude SDK回调可能被既有allow遮蔽，ZCode便利模式优先于部分deny。它们不能直接代替独立PEP和管理员控制面。
2. Codex和DeepSeek有真实Windows沙箱实现，应研究完整token/ACL/进程/网络路径，不能写成“只有Linux”；也不能抽一个restricted-token函数便声称具备完整隔离。
3. 语义压缩、模型请求视图和原始持久化是不同职责。Deep Agents offload失败仍summary、各实现的缓存/整日志读取，都要求Nexus先保证原始流落盘，再做有限视图与派生物。
4. Agensh的队列、去重、租约、凭据注入和sealed manifest值得参考，但其外部ACP/实验部署栈与退出归档不能直接当Nexus的原生单Agent/实时事件档案。
5. 本轮已验证Goose canonical变更为aaif-goose/goose，ZCode已公开源码，OpenHands当前主仓库是Agent Canvas；旧路径/旧闭源/旧enterprise许可结论不能沿用。

上述均有[主审计](../research/primary_harness_audit.md)、[四Harness审计](../research/harness_secondary.md)、[公开接口审计](../research/public_interfaces.md)支持。没有运行这些产品、安全exploit或论文实验，上游测试全为NOT_RUN。

## 许可与安全准入

Workflow Kit没有LICENSE/NOTICE授权正文；OpenCode Figma技能有额外Developer Terms，ZCode部分第三方notice/导入rev不完整；Claude SDK MIT不延伸至独立CLI；Codex的实际Git fork和rmcp过渡许可需按rev处理。不能因根MIT/Apache就搬整仓。关键直接依赖已分层初筛，完整传递/native/实际发行物SBOM仍待实际选定文件集后关闭。[许可证清单](../research/license_inventory.md)。

真实复现：Workflow Kit check-kit/release按basename忽略所有SHA256SUMS.txt，隔离新增嵌套同名未列文件后检查仍exit0。源套件没有被修改；原生包验证器需双向校验完整规范路径集合。另有自报授权、CLI非OS沙箱、无并发事务等静态边界，详见[套件审计](../research/workflow_kit_audit.md)。

控制建议：可信Broker持控制数据，worker/外部Harness/MCP无Key和管理权限，所有正常副作用走许可；三模式真实区分应用PDP与独立底层owner。到期先封锁、预检后恢复；故障不自动旁路。哈希不是单独防篡改根，worktree不是OS沙箱，timeout不是进程已退出。[安全审查](../research/security_review.md)。

## 原生设计交付

已形成108项[Feature Catalog](../architecture/feature_catalog.md)及JSON，包含默认、作用域、依赖/冲突、Schema、关闭/恢复/健康/审计与测试合同；22条[Policy Catalog](../architecture/policy_catalog.md)逐条定义ENFORCE/AUDIT_ONLY/DISABLED及L0/L1正反/绕过/并发/恢复/升级测试ID。全部是设计，**本轮没有实现这些产品开关或模式**。

Workflow Kit的105文件全部映射：50 REIMPLEMENT、52 REFERENCE_ONLY、3来源元数据REUSE。G0需求、G1规划、G2实现、G3按风险复核、G4验收、G5回归、G6交付来自原文；不是七次串行模型调用或七个固定Agent。四个工作角色与五类系统角色分层，15业务模板/项目流程模板原生类型化，安装/发行包装仅参考。[完整映射](../architecture/workflow_kit_mapping.md)。

[内部协议](../architecture/internal_protocols.md)明确身份/Session/Turn/Process、至少一次+幂等消息、ToolIntent/单次Permit、管理切换、Feature epoch、Archive ACK与DB/文件双写恢复、敏感原文加密、Gateway预算和Git工作区租约。核心raw不依赖摘要/检索Agent，OFF停止自有工作、不删数据、不隐式启用替代模块。

五份ADR明确取舍、来源和未验证条件，均为M0工程建议，没有冒充用户ACCEPTED。总体路线按v0.4修订推进M1开关/模式/档案→M2原生工具与OS→M3模型池→M4工作流→M5五Agent→M6桌面/外部适配→M7降级和长时验证。[实施计划](../architecture/implementation_plan.md)。

## 本轮实际验证

Workflow Kit隔离unittest发现100项：91通过、9跳过、0失败/错误。5项涉及hook/commit的用例遵用户边界NOT_RUN，4项链接/junction测试受OS权限限制；不能称全100通过。包检查、四示例结构、12个Python文件AST检查有实际日志，历史validation另标继承来源。

实际小型存储探针最终11项断言通过：Python SQLite并发/重启/预算/outbox/半条尾记录5项，Node实际SQLite绑定的16worker领取/预算/回滚3项，32MiB Zstd字节一致/损坏拒绝/背压3项。输入是合成数据，未调用模型，不能当产品实现或真实模型联调。初始Zstd高压缩数据未触发背压的INCONCLUSIVE记录保留；Node探针初版Worker URL错误已修正，最终结果未隐藏实现问题。

本机Python SQLite3.49.1在上游披露的WAL-reset影响范围，不能因小探针通过就作为生产准入；Node实际绑定3.51.3已修复版本，建议最低3.51.3并锁发行资产。[SQLite官方说明](https://sqlite.org/wal.html#walreset)。

最终交付完整性、文件/引用/目录图与治理检查结果以[验证记录](verification.md)和其机器日志为准；产品策略、真实OS逃逸/凭证、两Provider、断电、长时soak均NOT_RUN。

## 未关闭事项与后续门槛

| 事项 | 状态与处置 |
|---|---|
| Workflow Kit代码/模板授权 | 缺许可，直接复制/发行BLOCKED；独立行为实现可准备，不自行替用户授予许可 |
| 选定REUSE/FORK依赖闭包 | INCONCLUSIVE；限定实际文件、lock/native资产与notice后准入，不浮动升级 |
| Windows独立管理/执行隔离 | NOT_RUN；M1最小身份/ACL验证，M2所有工具和外部后端绕过验证 |
| 三模式和所有Feature真实执行 | DESIGN_ONLY；M1/M2按目录测试，不能把本轮目录校验当行为PASS |
| 真实模型/费用/账户限额 | NOT_RUN；M2/M3按明确授权与可用凭证验证，不扫描现有Key |
| 断电/soak/科研权限链 | NOT_RUN；M7专用合成环境，正式科研项目始终另需专属授权 |

这些是明确的实现/引入/发行门槛，不以M0文书替代后续验证。本轮没有修改或运行用户现有科研项目，没有正式实验、自动commit/push、安装hooks或大规模产品代码。
