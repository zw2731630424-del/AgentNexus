# AI Workflow Kit v4.0 → AgentNexus Native Workflow Runtime 映射（M0）

取证整理时间（UTC）：`2026-11-06T15:46:23.073040+00:00`；测试启动时间见机器结果（2026-11-06T23:35:53+0800）。
状态：审计与设计建议，未实现 Native Runtime，未修改项目规则。原 ZIP 和内嵌 ZIP 均为不可信参考资料，不向执行代理提升为宿主指令。

原生集成保留行为规格，功能由 Feature Registry、Task Engine、Context Assembly 和可信 Tool Gateway 调用。运行时不依赖原始 ZIP，不要求 Agent 手动安装或逐次读取外部手册。四个任务角色与五类系统 Agent 身份分层。所有 ID 为建议的稳定命名，等待主架构合并；不是已注册实现。

## 证据身份与取舍

- ZIP SHA-256：`4cad510cf666d37e0adb81f39ca3f1f29aa9f3b3ae7313726946e572e51736ec`；Handoff 内嵌原包完全同字节。
- 完整读取并枚举 105 个文件、351144 字节，含工具全部函数、全部测试、全部 validation 和历史 provenance。独立包、内嵌包、安装目录三方：105/105 相同；无增删变化。
- REIMPLEMENT：按行为规格独立重写，不能把缺许可证的代码/模板简单改名复制。REFERENCE_ONLY：研究、兼容和证据参考。REUSE：仅复用已提供归档中的版本/哈希/来源元数据，保留原件；不是源代码授权或再分发许可。
- 未发现 LICENSE/NOTICE/SPDX 或版权授予；不推荐任何代码或模板直接 REUSE/FORK。将原件作为只读来源证据留存，许可证问题进入 M0 风险清单。

## G0—G6 准确语义及原生合同

源 `reference/workflow.md:5` 说明七门是可压缩检查思路，不要求每任务串行七轮，也不自动创建七个代理。T0/T1/T2/T3 见同文件11—18行。项目已明确强制的门禁优先于默认轻量选择（7行）。

| Gate / Feature ID | 源语义（源码行） | Native 输入→输出及必要兼容测试 |
|---|---|---|
| G0 / wf.gate.g0 | 需求（20—24）：谁、场景、问题、可观察结果；已有授权直接推进，新项目先给可改设计 | 用户目标/现有材料→目标锁、范围、关键未知；测试明确目标小改不被强制全项目设计、缺关键授权才挂起 |
| G1 / wf.gate.g1 | 规划（26—30）：完成标准、范围风险、验证命令；相关判据才冻结，先最小验证关键假设 | G0结果→计划/依赖/验证选择；测试独立实验按资源并行、不会把代理数上限当实验数上限 |
| G2 / wf.gate.g2 | 实现（32—34）：搜索→修改→验证→证据；同失败两次无进展返回主代理 | checkpoint/独占写面→变更与真实证据；测试两次同类失败停止升级、无授权扩围失败 |
| G3 / wf.gate.g3 | 按风险复核（36—38）：低影响diff+验证，高风险独立上下文检查任务/diff/必要调用方 | 风险/变更指纹→可定位发现或限定无发现；测试独立性、强制复审优先、无强迫找bug、无远端发评 |
| G4 / wf.gate.g4 | 验收（40—42）：交付diff、真实功能及失败路径、集成冲突；代码审查不代替验收 | 合同+真实路径→验收记录；测试无法执行为NOT_RUN，空日志/仅审查不能PASS |
| G5 / wf.gate.g5 | 回归（44—46）：快检+受影响；公共契约/迁移/选择器失效/影响不明升全量，长任务约定全量 | diff/依赖/基线→选择与结果；测试未知模块升全量、已知失败不冒充PASS、最老版本完整链 |
| G6 / wf.gate.g6 | 交付（48—50）：实际结果、验证、剩余问题；指纹日志续接；提交/发布遵用户授权 | 已完成证据→交付/未做迁出/下一入口；测试关闭任务不自动commit/push/release、未部署不能称已部署 |

每门可独立关闭；状态必须为 BYPASSED，不能记 PASS。启用未执行=NOT_RUN；真实执行失败=FAIL；记录结构检查单独标 FORMAL_PASS，人工最终判定另行存储；无适用项=NOT_APPLICABLE。关闭工作流功能不关闭 OS、凭证、网络或其他 Policy 强制边界。只有可信本机管理UI/管理员API可切换策略；Agent 不能通过门、角色或模板获得权限。

上述FORMAL_PASS和NOT_APPLICABLE是源套件/子验证器的结构检查或适用性字段，不加入AgentNexus GateResult顶层状态枚举。顶层保留PASS/FAIL/NOT_RUN/INCONCLUSIVE/FAKE_ONLY/BYPASSED；无适用Gate记录BYPASSED并注明reason=NOT_APPLICABLE，结构检查通过不能替代真实Gate验收。

## 任务角色、规则与服务边界

| 模块 | 内建职责 | 行号证据 / 原生验证 |
|---|---|---|
| Scout | 限定范围只读定位，证据与不确定项，600字指导摘要，不再委派 | install/agents/scout.md:3—5；能力授予只读，超范围读取必须拒绝 |
| Worker | 任务卡允许写面，验证，不改规则、不扩依赖，两次同失败返回 | install/agents/worker.md:3—5；写面由Gateway验证，提示词不能代替ACL |
| Verifier | 产品路径与回归，命令/退出码/证据；不改产品/规则/状态 | install/agents/verifier.md:3—5；真实证据与NOT_RUN可区分 |
| Reviewer | 按风险或项目强制独立复审，范围diff调用方，严格记录 | install/agents/reviewer.md:3—7；身份来自Host非JSON自报 |
| RuleCompiler | 全局→project index/always→task相关→类型路由→按需参考，版本和实际注入留痕 | install/AGENTS.md:5—8,12—25；规则不能降低宿主安全 |
| RuleRegistry | 精确路径、hash、loading/when、授权来源pending、只显式更新 | govern.py:245—286,644—742；可信UI授权与签名审计替代自报编号 |
| ArtifactRegistry | 分类、根精确清单、任务/运行/知识分离，文件与目录安全 | govern.py:45—115,177—220；Windows别名/reparse/TOCTOU/硬链接须独立负例 |
| Index/CodeMap | 增强模式派生索引；Python句法AST，其他语言manual-required | govern.py:308—385；禁止将句法调用图称为完整运行时图 |
| CommandGateway | 统一执行、预算超时、允许范围、受控环境、完成证据 | govern.py:805—818 仅前后检查，必须重写为实际执行拦截 |
| ReviewGate | 待审范围、双hash pass、发现解决与真实身份/人工终审 | check-review.py:37—100；FORMAL PASS不等于FINAL PASS |
| ValidationService | schema/包/manifest/链接/负例；独立验证不等于业务验收 | check-task.py:9—34,142—213；check-kit.py:33—119 |

## 工具按函数映射

| 源工具/入口 | 覆盖的完整功能与取舍 |
|---|---|
| govern.py:37—84 | digest/encoded/safe_relative/path_at/write/load → FileIdentity/PathResolver/AtomicStorage；保留遍历/绝对/控制字符/链接拒绝，增加句柄校验、原子替换和并发事务 |
| govern.py:87—242 | default_policy/validate_policy/ignored_path/validate_rule_path/rule_candidate/inventory/internal/classify/active_state/validate_knowledge/legacy_unregistered_rules → 分类、知识元数据、v3兼容warning；严格schema与引用完整性 |
| govern.py:245—442 | core_check/split_generated/generated_block/link_from/code_graph/expected_outputs/verify_generated/refresh_project/check_project → 完整性与派生物服务，lite/full显式，不能洗白改规则 |
| govern.py:445—532 | init_project/preflight_project → 初始登记、重复初始化/恢复/升级；不允许把新未知文件静默纳入历史基线 |
| govern.py:534—641 | git/check_staged/install_hook/disable_project → 暂存一致性参考；Native不安装本地hook，以Gateway门禁与独立验证取代；git clean filter也是可执行副作用 |
| govern.py:644—742 | rule_audit/validate_rule_request/validate_agents/register_rule/accept_rules → 可信授权注册/更新；当前pending不可解锁verified-external |
| govern.py:745—827 | init/check/refresh/new/run/hook/rules/disable CLI → 内部版本化服务/API，不暴露可任意执行的通用run |
| check-task.py:51—139,142—213 | kind_for/visible_lines/parse_headings/normalize/section_for/check_file/main → 保留七schema、围栏/注释、TODO与strict警告退出码；校验只声明结构 |
| check-review.py:15—100 | nonempty/changed_files/check_review → 待改Git范围补充、暂存一致、规则范围、证据JSON、修复后hash和双角色分离；增加可信身份和审批状态 |
| check-kit.py:28—119 | package_files/check → 分类、原料白名单、必需文件、安全链接、JSON/MD链接、AGENTS预算、VERSION、hash清单；修复嵌套同名漏检和license缺口 |
| manage.py:15—117 | sha/contained/linked_path/safe_path/inside_markers/block/load_manifest/write_changed → 文件所有权/字节保留/冲突拒绝规格参考 |
| manage.py:118—247 | main migrate：仅显式v3 Codex→generic，角色/config备份、冲突预检、快照回滚、hook旧引用升级；原生若承诺旧项目兼容需独立ImportAdapter，不运行安装器 |
| manage.py:248—408 | main install：generic-only、Lite默认、可选agents/project-rules/full/hook、保留既有AGENTS、建议未加载、禁止降级；Native无需安装提示词 |
| manage.py:409—492 | verify/uninstall：manifest指纹、备份、dry-run、去自有块、保留用户文件、保留审计；普通install/uninstall缺完整失败事务，不直接复用 |
| release.py:13—54 | 静态检查→重写104项清单→固定ZIP时间/权限→CRC→旁置hash；没有单元测试门/签名/许可检查，只作发行规格参考 |
| wrappers | PS/Bash/BAT只有Python调用与退出码透传；BAT无参交互输入/暂停；非Native服务，不带入运行时 |

## 模板逐项内建

所有模板是按需的结构能力，可被功能关闭，不把所有模板强制生成到每任务。strict-review JSON 是结构模板，不能当实际审查凭据。冻结、任务合同、成本台账分别独立开关。

| 源模板 | Feature ID | 结构与用途 |
|---|---|---|
| [reference/templates/artifact-delivery.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/artifact-delivery.md:1) | `wf.templates.artifact` | 受众用途/来源版式/可编辑输出/渲染验收/限制 |
| [reference/templates/checkpoint.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/checkpoint.md:1) | `wf.templates.checkpoint` | 当前目标、完成证据、未验假设、下一步；绑定恢复指纹 |
| [reference/templates/closeout.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/closeout.md:1) | `wf.templates.closeout` | 交付范围、未做迁出、验证读数、续接入口 |
| [reference/templates/commands-registry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/commands-registry.md:1) | `wf.templates.commands` | ID/目录/真实命令/前提副作用/成功标准 |
| [reference/templates/decision-log.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/decision-log.md:1) | `wf.templates.decisions` | ID时间、决定、来源状态、依据后果；追加修订 |
| [reference/templates/design-brief.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/design-brief.md:1) | `wf.templates.design` | 用户目标、MVP、主链路、规则、风险、验收、不做、关键待定 |
| [reference/templates/document-entry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/document-entry.md:1) | `wf.templates.document` | 分类路径、来源状态、关联代码、更新触发、验证 |
| [reference/templates/experiment-plan.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/experiment-plan.md:1) | `wf.templates.experiment` | 假设、对照、指标阈值、资源并行、停止回退、结论 |
| [reference/templates/FREEZE.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/FREEZE.md:1) | `wf.templates.freeze` | 范围授权、取值理由、机械或人工判据、被否方案、修订 |
| [reference/templates/GOAL.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/GOAL.md:1) | `wf.templates.goal` | 目标范围、资料、checkpoint/分工、验证循环、停止、交接 |
| [reference/templates/knowledge-entry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/knowledge-entry.md:1) | `wf.templates.knowledge` | 用途、来源、状态、更新触发、稳定正文 |
| [reference/templates/strict-review-record.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/strict-review-record.md:1) | `wf.templates.review` | schema1、实现者/独立审查/主审、范围hash、发现证据 |
| [reference/templates/subtask.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/subtask.md:1) | `wf.templates.subtask` | 目标角色投入、独立上下文、输入读写/窗口、验收、停止摘要 |
| [reference/templates/task-contract.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/task-contract.md:1) | `wf.templates.contract` | 目标锁、允许范围、真实验收/人工步骤、授权边界、证据位置 |
| [reference/templates/token-ledger.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/token-ledger.md:1) | `wf.templates.cost` | 同型比较口径、实际模型投入、可见用量、返工、证据 |

## 测试和验证迁移

六个测试文件共100个 discovered 测试。原测试只在隔离源副本执行，Native测试应由规格独立编写，不能直接复制未获许可测试源码。当前91通过、9跳过、0失败/错误；5项因用户边界NOT_RUN，4项OS链接权限SKIPPED，详见审计报告和完整日志。原包声称的96通过/4跳过是2026-10-27继承证据，不能用于本轮。

| 测试族 | 原生兼容目标 |
|---|---|
| test_check_task.py | 七schema、TODO、代码围栏、空章、坏UTF-8、strict warning、显式kind与示例 |
| test_govern.py | 根分类/目录、遍历、知识元信息、规则与策略hash、派生索引篡改/过期、未知语言、前后执行检查、暂存一致与hook兼容（有副作用用例本轮未运行） |
| test_lean_modes.py | Lite缺省与重复、显式Full保留/升级、角色与hook分离、规则索引seed归属保留、旧AGENTS字节不改 |
| test_manage.py | 所有权、幂等/mtime、非UTF8、备份/冲突、generic-only、显式迁移、manifest损坏、遍历/reparse、卸载保留 |
| test_project_rules.py | 全局/项目规则登记、精确大小写、always/task、改删防洗白、自报来源pending、verified-external不可降级、旧v3兼容、暂存改删/特殊模式 |
| test_review.py | 缺省不要求、独立ID、双hash与修复hash、范围/type、穿越拒绝、Git补充与stale index |

validation/ 全部32份文件均为来源证据；逐文件见下一表，包括v3历史20份。保存时区分来源时间、被测源码、来源声明与本轮观察，不迁移历史PASS为原生门状态。

## 全部105文件的去向与证据

每行均完整读取、hash核对；表中的证据路径可直接打开安装的原样副本。字节数和SHA256全值在同轮 `workflow-inventory.json`，下表每项引用完整源码行域（未省略工具、测试、历史验证或模板）。所有 REUSE 仅为原归档元数据留存。

| 源文件与行域 | 字节 | 决策 | Native Feature / 归档去向 | 行为或保留理由 |
|---|---:|---|---|---|
| [.gitignore:1](I:/AI_AgentNexus/ai-workflow-kit-v4/.gitignore:1)—5 | 52 | REFERENCE_ONLY | `wf.build.cache` | 包缓存排除；不是运行时权限 |
| [CHANGELOG.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/CHANGELOG.md:1)—31 | 3377 | REFERENCE_ONLY | `wf.provenance.history` | 4.0变更与3.0历史；不继承历史原生角色 |
| [CHEATSHEET.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/CHEATSHEET.md:1)—25 | 1515 | REFERENCE_ONLY | `wf.help` | 任务读取与安装速查；原生UI重写帮助 |
| [examples/checkpoint.example.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/checkpoint.example.md:1)—17 | 557 | REFERENCE_ONLY | `wf.compat.example.checkpoint` | 证据/未验假设/恢复入口兼容样本 |
| [examples/GOAL.example.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/GOAL.example.md:1)—25 | 1144 | REFERENCE_ONLY | `wf.compat.example.goal` | 长任务结构兼容样本；命令不视为项目真实配置 |
| [examples/README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/README.md:1)—10 | 363 | REFERENCE_ONLY | `wf.examples` | 虚构示例与实测必须区分 |
| [examples/subtask.example.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/subtask.example.md:1)—21 | 802 | REFERENCE_ONLY | `wf.compat.example.subtask` | 独立上下文/只读范围兼容样本 |
| [examples/task-contract.example.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/task-contract.example.md:1)—15 | 686 | REFERENCE_ONLY | `wf.compat.example.contract` | 目标锁/验收兼容样本 |
| [install/agents/reviewer.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/agents/reviewer.md:1)—7 | 692 | REIMPLEMENT | `wf.role.reviewer` | 独立上下文复核、触发与影响、严格记录；只读不再委派 |
| [install/agents/scout.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/agents/scout.md:1)—5 | 372 | REIMPLEMENT | `wf.role.scout` | 只读定位、600字摘要、路径证据、不再委派 |
| [install/agents/verifier.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/agents/verifier.md:1)—5 | 442 | REIMPLEMENT | `wf.role.verifier` | 真实路径与回归、命令退出码、PASS/FAIL/NOT_RUN；不改产品/规则 |
| [install/agents/worker.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/agents/worker.md:1)—5 | 446 | REIMPLEMENT | `wf.role.worker` | 独占允许写面、相关验证、两次同类失败返回 |
| [install/AGENTS.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/AGENTS.md:1)—26 | 2491 | REIMPLEMENT | `wf.rules.global` | 规则优先级、稳定边界、按需深度写入Context Assembly规则编译 |
| [install/project-rules/README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/project-rules/README.md:1)—13 | 828 | REIMPLEMENT | `wf.rules.project-index` | 唯一总索引与always/task读取；与受信注册表一致性检查 |
| [install.bat:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install.bat:1)—12 | 308 | REFERENCE_ONLY | `wf.legacy.windows-install` | 外部交互安装包装，不进入Native运行时 |
| [MERGE-NOTES.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/MERGE-NOTES.md:1)—23 | 1924 | REFERENCE_ONLY | `wf.provenance.history` | 2.5/2.6到3/4历史取舍 |
| [project-workflows/_template/README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/project-workflows/_template/README.md:1)—27 | 1085 | REIMPLEMENT | `wf.templates.workflow` | 原生扩展schema：触发、不适用、输入、分类、验收、退出 |
| [project-workflows/README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/project-workflows/README.md:1)—12 | 1027 | REIMPLEMENT | `wf.workflow.router` | 根据现有证据匹配类型；无匹配跳过；禁止为匹配扫全库 |
| [README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/README.md:1)—60 | 4149 | REFERENCE_ONLY | `wf.help` | 套件能力与证据边界；原生入口另写 |
| [reference/capabilities.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/capabilities.md:1)—25 | 1836 | REIMPLEMENT | `wf.capabilities` | 脚本/连接器/Skill触发、权限、成本与循环退出 |
| [reference/checklists/gates.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/checklists/gates.md:1)—15 | 1075 | REIMPLEMENT | `wf.checks.gate-depth` | 出处/效果/语义、独立预期、边界、失败注入、生产路径 |
| [reference/checklists/measurement.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/checklists/measurement.md:1)—11 | 857 | REIMPLEMENT | `wf.checks.measurement` | 命令/规模/指纹/环境、完整日志与真实计数 |
| [reference/checklists/protocol.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/checklists/protocol.md:1)—12 | 1056 | REIMPLEMENT | `wf.checks.protocol` | 同源判据、schema、唯一写面、并发日志与失败回滚 |
| [reference/checklists/regression.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/checklists/regression.md:1)—25 | 1705 | REIMPLEMENT | `wf.checks.regression` | 分层测试、选择器反例、已知失败与最老版本迁移链 |
| [reference/context.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/context.md:1)—27 | 2343 | REIMPLEMENT | `wf.context` | 分层检索、独立委派、单写者、checkpoint恢复 |
| [reference/decisions.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/decisions.md:1)—27 | 2080 | REIMPLEMENT | `wf.decisions` | 区分用户决定、授权内选择、待定提案；沉默非批准 |
| [reference/evidence.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/evidence.md:1)—23 | 1938 | REIMPLEMENT | `wf.evidence` | 版本/命令/输入/环境绑定，全称负断言计数闭合 |
| [reference/feasibility.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/feasibility.md:1)—60 | 4443 | REIMPLEMENT | `wf.feasibility` | 可修改整体设计、关键假设、对照、资源与继续/调整/停止 |
| [reference/governance.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/governance.md:1)—50 | 5002 | REIMPLEMENT | `wf.governance` | 分类、规则保护、派生索引、受控执行的规格输入 |
| [reference/INDEX.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/INDEX.md:1)—33 | 2125 | REIMPLEMENT | `wf.reference.router` | 问题到规则/模板映射；不全量注入 |
| [reference/project-rules.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/project-rules.md:1)—41 | 4503 | REIMPLEMENT | `wf.rules.registration` | 精确路径、always/task、内容哈希、授权pending与不可降级 |
| [reference/routing.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/routing.md:1)—44 | 4674 | REIMPLEMENT | `wf.roles.router` | 按收益委派，能力与推理不绑型号；独立上下文/最多3常规并发 |
| [reference/safety.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/safety.md:1)—28 | 2733 | REIMPLEMENT | `wf.safety-guidance` | 路径/进程/设备操作指导映射可信Tool Gateway约束 |
| [reference/strict-review.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/strict-review.md:1)—34 | 2811 | REIMPLEMENT | `wf.review.strict` | 路径/任务类型选择、双审范围哈希、人工最终关卡 |
| [reference/templates/artifact-delivery.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/artifact-delivery.md:1)—17 | 619 | REIMPLEMENT | `wf.templates.artifact` | 受众用途/来源版式/可编辑输出/渲染验收/限制；按需生成，不强制文书 |
| [reference/templates/checkpoint.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/checkpoint.md:1)—19 | 470 | REIMPLEMENT | `wf.templates.checkpoint` | 当前目标、完成证据、未验假设、下一步；绑定恢复指纹；按需生成，不强制文书 |
| [reference/templates/closeout.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/closeout.md:1)—19 | 500 | REIMPLEMENT | `wf.templates.closeout` | 交付范围、未做迁出、验证读数、续接入口；按需生成，不强制文书 |
| [reference/templates/commands-registry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/commands-registry.md:1)—9 | 464 | REIMPLEMENT | `wf.templates.commands` | ID/目录/真实命令/前提副作用/成功标准；按需生成，不强制文书 |
| [reference/templates/decision-log.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/decision-log.md:1)—11 | 533 | REIMPLEMENT | `wf.templates.decisions` | ID时间、决定、来源状态、依据后果；追加修订；按需生成，不强制文书 |
| [reference/templates/design-brief.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/design-brief.md:1)—29 | 810 | REIMPLEMENT | `wf.templates.design` | 用户目标、MVP、主链路、规则、风险、验收、不做、关键待定；按需生成，不强制文书 |
| [reference/templates/document-entry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/document-entry.md:1)—13 | 800 | REIMPLEMENT | `wf.templates.document` | 分类路径、来源状态、关联代码、更新触发、验证；按需生成，不强制文书 |
| [reference/templates/experiment-plan.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/experiment-plan.md:1)—22 | 513 | REIMPLEMENT | `wf.templates.experiment` | 假设、对照、指标阈值、资源并行、停止回退、结论；按需生成，不强制文书 |
| [reference/templates/FREEZE.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/FREEZE.md:1)—17 | 481 | REIMPLEMENT | `wf.templates.freeze` | 范围授权、取值理由、机械或人工判据、被否方案、修订；按需生成，不强制文书 |
| [reference/templates/GOAL.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/GOAL.md:1)—30 | 1021 | REIMPLEMENT | `wf.templates.goal` | 目标范围、资料、checkpoint/分工、验证循环、停止、交接；按需生成，不强制文书 |
| [reference/templates/knowledge-entry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/knowledge-entry.md:1)—21 | 446 | REIMPLEMENT | `wf.templates.knowledge` | 用途、来源、状态、更新触发、稳定正文；按需生成，不强制文书 |
| [reference/templates/strict-review-record.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/strict-review-record.md:1)—30 | 857 | REIMPLEMENT | `wf.templates.review` | schema1、实现者/独立审查/主审、范围hash、发现证据；按需生成，不强制文书 |
| [reference/templates/subtask.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/subtask.md:1)—29 | 1104 | REIMPLEMENT | `wf.templates.subtask` | 目标角色投入、独立上下文、输入读写/窗口、验收、停止摘要；按需生成，不强制文书 |
| [reference/templates/task-contract.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/task-contract.md:1)—19 | 619 | REIMPLEMENT | `wf.templates.contract` | 目标锁、允许范围、真实验收/人工步骤、授权边界、证据位置；按需生成，不强制文书 |
| [reference/templates/token-ledger.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/token-ledger.md:1)—13 | 615 | REIMPLEMENT | `wf.templates.cost` | 同型比较口径、实际模型投入、可见用量、返工、证据；按需生成，不强制文书 |
| [reference/verification.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/verification.md:1)—25 | 1810 | REIMPLEMENT | `wf.verification` | 快检/受影响/全量、坏例自证与真实行为 |
| [reference/workflow.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/workflow.md:1)—50 | 4519 | REIMPLEMENT | `wf.gates` | G0需求/G1规划/G2实现/G3复核/G4验收/G5回归/G6交付 |
| [SHA256SUMS.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/SHA256SUMS.txt:1)—104 | 9699 | REUSE | `wf.provenance.manifest` | 只读证据元数据留在原始归档；不作为签名或代码授权 |
| [SOURCES.json:1](I:/AI_AgentNexus/ai-workflow-kit-v4/SOURCES.json:1)—658 | 24162 | REUSE | `wf.provenance.sources` | 保留原始来源记录；旧ZIP未提供，历史断言未独立重验 |
| [START-HERE.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/START-HERE.md:1)—54 | 3743 | REFERENCE_ONLY | `wf.help.migration` | 外部安装/迁移手册；原生Runtime不外包安装 |
| [tests/test_check_task.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_check_task.py:1)—100 | 4807 | REIMPLEMENT | `wf.compat.check_task` | 保留行为与正反例语义，独立编写原生兼容测试；原测试只在隔离副本验证 |
| [tests/test_govern.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_govern.py:1)—253 | 12804 | REIMPLEMENT | `wf.compat.govern` | 保留行为与正反例语义，独立编写原生兼容测试；原测试只在隔离副本验证 |
| [tests/test_lean_modes.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_lean_modes.py:1)—212 | 11806 | REIMPLEMENT | `wf.compat.lean_modes` | 保留行为与正反例语义，独立编写原生兼容测试；原测试只在隔离副本验证 |
| [tests/test_manage.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_manage.py:1)—370 | 21054 | REIMPLEMENT | `wf.compat.manage` | 保留行为与正反例语义，独立编写原生兼容测试；原测试只在隔离副本验证 |
| [tests/test_project_rules.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_project_rules.py:1)—471 | 23806 | REIMPLEMENT | `wf.compat.project_rules` | 保留行为与正反例语义，独立编写原生兼容测试；原测试只在隔离副本验证 |
| [tests/test_review.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_review.py:1)—131 | 5978 | REIMPLEMENT | `wf.compat.review` | 保留行为与正反例语义，独立编写原生兼容测试；原测试只在隔离副本验证 |
| [tools/check-kit.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/check-kit.py:1)—135 | 6918 | REIMPLEMENT | `wf.validators.package` | 包分类/链接/JSON/精确manifest覆盖；修复嵌套同名hash漏检 |
| [tools/check-review.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/check-review.py:1)—123 | 6287 | REIMPLEMENT | `wf.validators.review` | 范围+文件hash+声明身份分离；接入可信身份与人工终审状态 |
| [tools/check-task.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/check-task.py:1)—217 | 8487 | REIMPLEMENT | `wf.validators.task` | 7种文书schema、TODO/空章/伪标题/退出码；只证明结构 |
| [tools/govern.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/govern.py:1)—827 | 47383 | REIMPLEMENT | `wf.governance.service` | 拆为可信分类/注册/索引/图/校验/审计服务；拒绝直接授予任意命令权限 |
| [tools/install.ps1:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/install.ps1:1)—5 | 291 | REFERENCE_ONLY | `wf.legacy.install.ps1` | Python薄入口与退出码透传 |
| [tools/install.sh:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/install.sh:1)—3 | 93 | REFERENCE_ONLY | `wf.legacy.install.sh` | exec Python薄入口；Linux/macOS未实测 |
| [tools/manage.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/manage.py:1)—492 | 29569 | REFERENCE_ONLY | `wf.legacy.migration` | 安装/验证/卸载/显式v3迁移作为兼容规格；原生不执行原安装器 |
| [tools/release.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/release.py:1)—59 | 2625 | REFERENCE_ONLY | `wf.legacy.release` | 确定性ZIP算法参考；原生发行重写测试门、签名与许可清单 |
| [tools/uninstall.ps1:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/uninstall.ps1:1)—5 | 293 | REFERENCE_ONLY | `wf.legacy.uninstall.ps1` | Python薄入口与退出码透传 |
| [tools/uninstall.sh:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/uninstall.sh:1)—3 | 95 | REFERENCE_ONLY | `wf.legacy.uninstall.sh` | exec Python薄入口；Linux/macOS未实测 |
| [uninstall.bat:1](I:/AI_AgentNexus/ai-workflow-kit-v4/uninstall.bat:1)—12 | 312 | REFERENCE_ONLY | `wf.legacy.windows-uninstall` | 外部交互卸载包装，不进入Native运行时 |
| [validation/bash-syntax.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/bash-syntax.txt:1)—4 | 100 | REFERENCE_ONLY | `wf.validation.bash-syntax` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/examples.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/examples.txt:1)—6 | 309 | REFERENCE_ONLY | `wf.validation.examples` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/final-acceptance.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/final-acceptance.txt:1)—15 | 1719 | REFERENCE_ONLY | `wf.validation.final-acceptance` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/package-check.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/package-check.txt:1)—3 | 37 | REFERENCE_ONLY | `wf.validation.package-check` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/package-negative.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/package-negative.txt:1)—4 | 186 | REFERENCE_ONLY | `wf.validation.package-negative` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/results.json:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/results.json:1)—11 | 527 | REFERENCE_ONLY | `wf.validation.results` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/review-fingerprints.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/review-fingerprints.txt:1)—1 | 97 | REFERENCE_ONLY | `wf.validation.review-fingerprints` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/review.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/review.txt:1)—67 | 8733 | REFERENCE_ONLY | `wf.validation.review` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/source-integrity.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/source-integrity.txt:1)—3 | 315 | REFERENCE_ONLY | `wf.validation.source-integrity` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/syntax.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/syntax.txt:1)—1 | 34 | REFERENCE_ONLY | `wf.validation.syntax` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/unittest.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/unittest.txt:1)—107 | 14818 | REFERENCE_ONLY | `wf.validation.unittest` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/bash-syntax.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bash-syntax.txt:1)—1 | 18 | REFERENCE_ONLY | `wf.validation.v3.0.0.bash-syntax` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/bat-error-code.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bat-error-code.txt:1)—4 | 160 | REFERENCE_ONLY | `wf.validation.v3.0.0.bat-error-code` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/bat-install.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bat-install.txt:1)—11 | 467 | REFERENCE_ONLY | `wf.validation.v3.0.0.bat-install` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/bat-uninstall.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bat-uninstall.txt:1)—4 | 200 | REFERENCE_ONLY | `wf.validation.v3.0.0.bat-uninstall` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/bat-verify.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bat-verify.txt:1)—4 | 236 | REFERENCE_ONLY | `wf.validation.v3.0.0.bat-verify` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/examples.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/examples.txt:1)—7 | 650 | REFERENCE_ONLY | `wf.validation.v3.0.0.examples` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/git-add-negative.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-add-negative.txt:1)—3 | 103 | REFERENCE_ONLY | `wf.validation.v3.0.0.git-add-negative` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/git-add.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-add.txt:1)—12 | 1149 | REFERENCE_ONLY | `wf.validation.v3.0.0.git-add` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/git-clean-negative.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-clean-negative.txt:1)—4 | 143 | REFERENCE_ONLY | `wf.validation.v3.0.0.git-clean-negative` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/git-init.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-init.txt:1)—4 | 198 | REFERENCE_ONLY | `wf.validation.v3.0.0.git-init` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/git-install.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-install.txt:1)—18 | 858 | REFERENCE_ONLY | `wf.validation.v3.0.0.git-install` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/git-uninstall.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-uninstall.txt:1)—4 | 268 | REFERENCE_ONLY | `wf.validation.v3.0.0.git-uninstall` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/local-hook-commit.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/local-hook-commit.txt:1)—17 | 629 | REFERENCE_ONLY | `wf.validation.v3.0.0.local-hook-commit` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/package-negative.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/package-negative.txt:1)—5 | 233 | REFERENCE_ONLY | `wf.validation.v3.0.0.package-negative` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/powershell-install.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/powershell-install.txt:1)—11 | 586 | REFERENCE_ONLY | `wf.validation.v3.0.0.powershell-install` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/powershell-uninstall.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/powershell-uninstall.txt:1)—4 | 319 | REFERENCE_ONLY | `wf.validation.v3.0.0.powershell-uninstall` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/powershell-verify.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/powershell-verify.txt:1)—4 | 243 | REFERENCE_ONLY | `wf.validation.v3.0.0.powershell-verify` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/report.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/report.txt:1)—36 | 4123 | REFERENCE_ONLY | `wf.validation.v3.0.0.report` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/results.json:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/results.json:1)—111 | 1929 | REFERENCE_ONLY | `wf.validation.v3.0.0.results` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/v3.0.0/unittest.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/unittest.txt:1)—62 | 7439 | REFERENCE_ONLY | `wf.validation.v3.0.0.unittest` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [validation/wrappers.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/wrappers.txt:1)—72 | 1436 | REFERENCE_ONLY | `wf.validation.wrappers` | 继承验证原始证据，仅归档/索引，不算本轮或原生功能通过 |
| [VALIDATION.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/VALIDATION.md:1)—45 | 5041 | REFERENCE_ONLY | `wf.validation.provenance` | 历史验证范围与限制，不转写为本轮PASS |
| [VERSION:1](I:/AI_AgentNexus/ai-workflow-kit-v4/VERSION:1)—1 | 7 | REUSE | `wf.provenance.version` | 来源版本4.0.0；集成版单独版本号 |

完整性闭合：{'REFERENCE_ONLY': 52, 'REUSE': 3, 'REIMPLEMENT': 50}；105行=105来源文件，无未映射项。

## 增量验收与实施顺序

1. 先冻结 Feature ID、规则/角色/门/证据schema与可信权限接口；M0不写Native实现。
2. 先内建RuleCompiler、TaskContract/Checkpoint与Gate状态机；关闭门显示BYPASSED，配置变更由可信管理接口产生。
3. 实现治理/证据事务服务、任务角色能力边界、正式独立复审。规则和内容hash绑定执行版本，授权与审查身份须Host验证。
4. 按六族规格编写正反例，新增本次manifest漏检、并发写/原子回滚、越权命令未执行、门关闭不影响OS保护、证据不是批准的负例。
5. Native发行单独许可证/依赖清单、SBOM、签名和可复现构建；在许可证未澄清前不复制来源代码/模板，不声明上游许可已解决。

完整hash、所有NOT_RUN、已复现缺陷与治理边界见同任务 research/workflow_kit_audit.md 与 runtime/workflow-*。
