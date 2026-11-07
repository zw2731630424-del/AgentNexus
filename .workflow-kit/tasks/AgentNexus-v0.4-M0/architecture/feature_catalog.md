# Feature Catalog v0.4 M0 设计

共 108 项。全部为 **DESIGN_ONLY**；本轮没有实现模块开关。机器定义见 [feature_catalog.json](feature_catalog.json)。来源是交接架构 v0.4 修订 B—F（第1228—1387行）及逐文件 [Workflow Kit映射](workflow_kit_mapping.md)。

## 解析与关闭合同

作用域 G/P/A/T 分别为全局/项目/Agent/Task。显式高层 OFF 是禁止下层启用的屏障；ON 表示允许在更小作用域收紧，INHERIT 沿用上层。默认值不是显式管理员限制。非法作用域或未知ID拒绝；依赖未启用拒绝启用，不替管理员偷偷开启依赖。该细化为M0提案，需按FT-RESOLVE固定测试。

配置状态与健康状态分开。所有修改仅可信管理通道，Agent不可改。关闭采用 prepare→预览依赖闭包→冻结派发→递增epoch→排空/终止自有任务→证明无残留→commit OFF。取消超时仍有进程时显示QUIESCING/FAILED，不能宣称DISABLED。关闭依赖时一次原子变更包含所有受影响模块，或拒绝并返回影响，不接受半启用。

每项JSON包含版本、配置Schema、默认状态、允许作用域、依赖/冲突、风险、确认要求、前置条件、降级、恢复、健康和可观测字段。运行不变量(core.*)不是用户可选增强；policy.mode使用专用三模式协议，不把OFF解释为普通布尔旁路。独立底层保护各有控制项，不能由Policy模式联动。

FT-RESOLVE：覆盖默认/继承/祖先OFF/子级收紧/非法作用域；FT-OFF-NO-WORK：进程树、定时器、网络与隐式调用归零；FT-RETAIN：档案与配置指纹不变；FT-DEPENDENCY：依赖故障与冲突拒绝；FT-RECOVER：手动重启/回滚、旧epoch拒绝。均为M1—M7的NOT_RUN验收项；本轮仅校验目录结构和依赖图。

## 功能目录

| Feature ID | 默认 | 作用域 | 依赖 | 风险 | 关闭后的真实路径 |
|---|---|---|---|---|---|
| core.identity | ON | G | 无 | CRITICAL | 必要运行底座不可关闭；故障时暂停依赖副作用并进入只读恢复 |
| core.state | ON | G | 无 | CRITICAL | 必要运行底座不可关闭；故障时暂停依赖副作用并进入只读恢复 |
| core.events | ON | G | 无 | CRITICAL | 必要运行底座不可关闭；故障时暂停依赖副作用并进入只读恢复 |
| core.archive.raw | ON | G | 无 | CRITICAL | 必要运行底座不可关闭；故障时暂停依赖副作用并进入只读恢复 |
| core.features | ON | G | 无 | CRITICAL | 必要运行底座不可关闭；故障时暂停依赖副作用并进入只读恢复 |
| core.admin-audit | ON | G | 无 | CRITICAL | 必要运行底座不可关闭；故障时暂停依赖副作用并进入只读恢复 |
| policy.mode | ENFORCE | G/P | core.identity, core.admin-audit | CRITICAL | 不是ON/OFF开关；通过独立管理员协议切换ENFORCE/AUDIT_ONLY/DISABLED |
| security.os-sandbox | ON | G/P | 无 | CRITICAL | 不再启动沙箱执行器；仅经独立二次确认的隔离测试项目可选择受限权限本机执行器；工作区范围、凭证与档案控制仍有效 |
| execution.local-unsandboxed | OFF | G/P | core.identity | CRITICAL | 暂停未沙箱化的本机执行；手工使用已验证的沙箱执行器；不可用于高风险/正式科研任务 |
| security.workspace-isolation | ON | G/P | 无 | CRITICAL | 暂停新的并行写任务；允许管理员指定专用手工作区，核心项目身份与文件授权范围不消失 |
| security.vault-persistence | ON | G | 无 | CRITICAL | 不持久化任何新凭证；已有密文保留；由管理员向Broker临时输入内存凭证，重启须重新输入 |
| archive.integrity-scan | ON | G/P | core.archive.raw | HIGH | 停止定期全盘校验；每次写入哈希、读取校验与只追加约束继续；管理员可手动verify |
| archive.retrieval-agent | OFF | G/P/A/T | core.archive.raw | LOW | Archive API/CLI按事件、时间、任务、字节范围手动检索 |
| archive.summary | OFF | G/P/A/T | core.archive.raw | LOW | 不生成摘要，使用原始范围；当前模型窗口不足则显式暂停 |
| archive.keyword-index | ON | G/P | core.archive.raw | LOW | 流式分页扫描原档案，不调用已关闭索引 |
| archive.vector-index | OFF | G/P | core.archive.raw | LOW | 停写停查向量；用户可手动选择已启用关键词或原档案扫描 |
| archive.knowledge-extract | OFF | G/P/A/T | core.archive.raw | LOW | 不自动整理知识；人工创建有来源的条目 |
| archive.backup-auto | ON | G/P | core.archive.raw | HIGH | 停止自动备份；手动导出一致性快照，显示恢复点陈旧 |
| native.harness | ON | G/P/A | core.identity, core.events, core.archive.raw, model.gateway | HIGH | 停止原生Agent轮次；保留手工任务与档案管理，可手动选择已验证适配器 |
| native.context-assembly | ON | G/P/A | native.harness | HIGH | 原生模型轮次暂停；仍可手工检索、编辑任务和恢复档案 |
| native.checkpoints-auto | ON | G/P/A/T | core.state | LOW | 不自动生成工作检查点；核心状态日志和在途执行账本仍持久化 |
| tool.file | ON | G/P/A/T | core.identity, core.archive.raw | HIGH | 撤销该工具新调用；用户手动操作并导入结果，其他工具独立继续 |
| tool.shell | OFF | G/P/A/T | core.identity, core.archive.raw | HIGH | 撤销该工具新调用；用户手动操作并导入结果，其他工具独立继续 |
| tool.git | OFF | G/P/A/T | core.identity, core.archive.raw | HIGH | 撤销该工具新调用；用户手动操作并导入结果，其他工具独立继续 |
| tool.test | ON | G/P/A/T | core.identity, core.archive.raw | HIGH | 撤销该工具新调用；用户手动操作并导入结果，其他工具独立继续 |
| adapter.mcp | OFF | G/P/A | core.identity | HIGH | 关闭该适配器及其自有进程；手动使用已启用原生工具，历史数据保留 |
| adapter.acp | OFF | G/P/A | core.identity | HIGH | 关闭该适配器及其自有进程；手动使用已启用原生工具，历史数据保留 |
| adapter.lsp | OFF | G/P/A | core.identity | HIGH | 关闭该适配器及其自有进程；手动使用已启用原生工具，历史数据保留 |
| adapter.browser | OFF | G/P/A | core.identity | HIGH | 关闭该适配器及其自有进程；手动使用已启用原生工具，历史数据保留 |
| adapter.harness.codex | OFF | G/P/A | core.identity, core.archive.raw | HIGH | 停接收新任务并核对旧进程；人工选择native或另一已验证后端；不隐式切换 |
| adapter.harness.claude | OFF | G/P/A | core.identity, core.archive.raw | HIGH | 停接收新任务并核对旧进程；人工选择native或另一已验证后端；不隐式切换 |
| adapter.harness.zcode | OFF | G/P/A | core.identity, core.archive.raw | HIGH | 停接收新任务并核对旧进程；人工选择native或另一已验证后端；不隐式切换 |
| adapter.harness.opencode | OFF | G/P/A | core.identity, core.archive.raw | HIGH | 停接收新任务并核对旧进程；人工选择native或另一已验证后端；不隐式切换 |
| runtime.auto-planning | OFF | G/P/A/T | core.state, core.events | LOW | 用户或Lead手动建立任务 |
| runtime.auto-spawn | OFF | G/P/A/T | core.state, core.events | HIGH | 仅可信管理员手动创建子Agent |
| runtime.auto-review | OFF | G/P/A/T | core.state, core.events | LOW | 手动发起只读Reviewer |
| runtime.auto-coordinator | OFF | G/P/A/T | core.state, core.events | LOW | 静态配额与人工排程 |
| runtime.auto-repair | OFF | G/P/A/T | core.state, core.events | HIGH | 报告问题，由用户或Lead手动修复 |
| runtime.role.resident | ON | G/P | core.identity, core.state | LOW | 停止派发该系统角色；Resident语义助手关闭时持久事件服务仍运行；Lead/子Agent改用手工任务，Coordinator改静态配额 |
| runtime.role.lead | ON | G/P | core.identity, core.state | HIGH | 停止派发该系统角色；Resident语义助手关闭时持久事件服务仍运行；Lead/子Agent改用手工任务，Coordinator改静态配额 |
| runtime.role.subagent | ON | G/P | core.identity, core.state | HIGH | 停止派发该系统角色；Resident语义助手关闭时持久事件服务仍运行；Lead/子Agent改用手工任务，Coordinator改静态配额 |
| runtime.role.reviewer | ON | G/P | core.identity, core.state | LOW | 停止派发该系统角色；Resident语义助手关闭时持久事件服务仍运行；Lead/子Agent改用手工任务，Coordinator改静态配额 |
| runtime.role.coordinator | OFF | G/P | core.identity, core.state | LOW | 停止派发该系统角色；Resident语义助手关闭时持久事件服务仍运行；Lead/子Agent改用手工任务，Coordinator改静态配额 |
| model.gateway | ON | G/P | core.identity | HIGH | 停止上游模型调用；CLI/档案/手工任务继续，不允许绕开Gateway直读Key |
| model.auto-route | OFF | G/P/A/T | model.gateway | LOW | 手工指定Provider/Model Profile |
| model.key-round-robin | OFF | G/P/A/T | model.gateway | LOW | 固定管理员选定CredentialRef |
| model.provider-failover | OFF | G/P/A/T | model.gateway | HIGH | 失败后停止并报告；人工选择供应商后新建请求 |
| model.capability-probe | OFF | G/P/A/T | model.gateway | LOW | 使用带来源和有效期的手工能力注册，未知能力明确拒绝 |
| git.auto-snapshot | OFF | G/P/A/T | tool.git | HIGH | 不自动执行对应Git动作；手工发起仍需独立权限、候选绑定和有效模式判定 |
| git.auto-merge | OFF | G/P/A/T | tool.git | HIGH | 不自动执行对应Git动作；手工发起仍需独立权限、候选绑定和有效模式判定 |
| git.auto-commit | OFF | G/P/A/T | tool.git | HIGH | 不自动执行对应Git动作；手工发起仍需独立权限、候选绑定和有效模式判定 |
| git.auto-push | OFF | G/P/A/T | tool.git | HIGH | 不自动执行对应Git动作；手工发起仍需独立权限、候选绑定和有效模式判定 |
| ui.desktop | OFF | G/P | 无 | LOW | 停止该展示或通知；CLI/API可手动查看原始状态与账目；不删除数据 |
| ui.usage-dashboard | ON | G/P | 无 | LOW | 停止该展示或通知；CLI/API可手动查看原始状态与账目；不删除数据 |
| ui.notifications | ON | G/P | 无 | LOW | 停止该展示或通知；CLI/API可手动查看原始状态与账目；不删除数据 |
| ui.reports | ON | G/P | 无 | LOW | 停止该展示或通知；CLI/API可手动查看原始状态与账目；不删除数据 |
| ui.decision-ledger | ON | G/P | 无 | LOW | 停止该展示或通知；CLI/API可手动查看原始状态与账目；不删除数据 |
| wf.runtime | ON | G/P | core.state | HIGH | 所有可选工作流停止调用；Gate显示BYPASSED；手工最小任务和独立OS/凭证/审计继续 |
| wf.rules.global | ON | G/P/A/T | wf.runtime | HIGH | 最小平台与用户授权仍有效；不注入可选通用规则 |
| wf.rules.project-index | ON | G/P/A/T | wf.runtime | HIGH | 不加载可选规则索引；项目隔离和已授权范围保持 |
| wf.rules.registration | ON | G/P/A/T | wf.runtime | HIGH | 不自动登记规则；可信管理员手工登记，Agent不能自授规则变更权限 |
| wf.capabilities | ON | G/P/A/T | wf.runtime | LOW | 使用手工能力说明；执行权限仍由Broker核验 |
| wf.context | ON | G/P/A/T | wf.runtime | LOW | 停止工作流上下文整理；原档案与原生上下文组装继续 |
| wf.decisions | ON | G/P/A/T | wf.runtime | LOW | 手工记录PROPOSED/ACCEPTED状态，禁止Agent自批准 |
| wf.evidence | ON | G/P/A/T | wf.runtime | LOW | 手工绑定证据引用；原始工具输入输出仍必存 |
| wf.feasibility | ON | G/P/A/T | wf.runtime | LOW | 手工进行可行性评估 |
| wf.governance | ON | G/P/A/T | wf.runtime | LOW | 停止可选分类门禁；受保护控制数据仍由OS隔离 |
| wf.governance.service | ON | G/P/A/T | wf.runtime | LOW | 停止自动索引/治理扫描；管理员手工检查；不可让Agent编辑控制数据库 |
| wf.review.strict | ON | G/P/A/T | wf.runtime | LOW | 停止严格审查自动门禁；手工启动Reviewer |
| wf.verification | ON | G/P/A/T | wf.runtime | LOW | 停止工作流验证器自动编排；测试本身可手动运行，结果NOT_RUN/BYPASSED |
| wf.safety-guidance | ON | G/P/A/T | wf.runtime | LOW | 不注入可选提示；程序和OS安全控制仍在 |
| wf.reference.router | ON | G/P/A/T | wf.runtime | LOW | 停止参考资料路由；手工选读 |
| wf.roles.router | ON | G/P/A/T | wf.runtime | LOW | 停止自动选工作角色；手工选已启用角色 |
| wf.workflow.router | ON | G/P/A/T | wf.runtime | LOW | 不自动选项目流程；手工选流程 |
| wf.checks.gate-depth | ON | G/P/A/T | wf.runtime | LOW | 不自动升级工作深度；手工选择 |
| wf.checks.measurement | ON | G/P/A/T | wf.runtime | LOW | 不自动执行量测清单，显示BYPASSED |
| wf.checks.protocol | ON | G/P/A/T | wf.runtime | LOW | 不自动执行协议清单，显示BYPASSED；专属实验授权仍必需 |
| wf.checks.regression | ON | G/P/A/T | wf.runtime | LOW | 不自动执行回归清单，显示BYPASSED |
| wf.validators.task | ON | G/P/A/T | wf.runtime | LOW | 任务保留最小可追踪定义；未验证字段不标PASS |
| wf.validators.review | ON | G/P/A/T | wf.runtime | LOW | 手工检查候选绑定；核心ReviewResult仍不允许旧版本PASS批准新代码 |
| wf.validators.package | ON | G/P/A/T | wf.runtime | LOW | 停止可选包验证；归档本身的内容哈希与事务仍必需 |
| wf.role.scout | ON | G/P/A/T | wf.runtime | LOW | 不再派发该工作配置；可手工选其他已启用角色；Reviewer只读是独立执行约束 |
| wf.role.worker | ON | G/P/A/T | wf.runtime | LOW | 不再派发该工作配置；可手工选其他已启用角色；Reviewer只读是独立执行约束 |
| wf.role.verifier | ON | G/P/A/T | wf.runtime | LOW | 不再派发该工作配置；可手工选其他已启用角色；Reviewer只读是独立执行约束 |
| wf.role.reviewer | ON | G/P/A/T | wf.runtime | LOW | 不再派发该工作配置；可手工选其他已启用角色；Reviewer只读是独立执行约束 |
| wf.gate.g0 | ON | G/P/A/T | wf.runtime | LOW | 跳过该Gate并记录BYPASSED、原因和配置版本；不产生PASS；其他Gate可独立工作 |
| wf.gate.g1 | ON | G/P/A/T | wf.runtime | LOW | 跳过该Gate并记录BYPASSED、原因和配置版本；不产生PASS；其他Gate可独立工作 |
| wf.gate.g2 | ON | G/P/A/T | wf.runtime | LOW | 跳过该Gate并记录BYPASSED、原因和配置版本；不产生PASS；其他Gate可独立工作 |
| wf.gate.g3 | ON | G/P/A/T | wf.runtime | LOW | 跳过该Gate并记录BYPASSED、原因和配置版本；不产生PASS；其他Gate可独立工作 |
| wf.gate.g4 | ON | G/P/A/T | wf.runtime | LOW | 跳过该Gate并记录BYPASSED、原因和配置版本；不产生PASS；其他Gate可独立工作 |
| wf.gate.g5 | ON | G/P/A/T | wf.runtime | LOW | 跳过该Gate并记录BYPASSED、原因和配置版本；不产生PASS；其他Gate可独立工作 |
| wf.gate.g6 | ON | G/P/A/T | wf.runtime | LOW | 跳过该Gate并记录BYPASSED、原因和配置版本；不产生PASS；其他Gate可独立工作 |
| wf.templates.artifact | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.checkpoint | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.closeout | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.commands | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.decisions | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.design | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.document | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.experiment | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.freeze | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.goal | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.knowledge | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.review | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.subtask | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.contract | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.cost | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |
| wf.templates.workflow | ON | G/P/A/T | wf.runtime | LOW | 停止自动生成该模板；保留既有产物，允许用户手工录入最小类型化记录 |

## 运行底座与来源ID

Workflow Kit映射中 wf.provenance.*、wf.validation.*、wf.compat.*、wf.help*、wf.examples、wf.build.cache 是只读来源或测试资料标识，不代表新增后台模块。wf.legacy.* 是迁移/发行/安装来源，不在原生Harness运行；不注册可执行Feature，不在运行时装原套件或hooks。wf.gates是七个Gate的分组标签。工作流的所有运行功能已分别登记；来源文件不必各自启动一个模块。

默认“ON”描述将来功能存在时的产品缺省，不代表M0已安装或已验证。手工备用路径必须在实际实现阶段演练；当前状态全部NOT_RUN。
