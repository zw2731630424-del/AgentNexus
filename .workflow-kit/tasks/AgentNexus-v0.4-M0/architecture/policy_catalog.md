# Policy Catalog v0.4 M0 设计

22 条，机器定义 [policy_catalog.json](policy_catalog.json)。L0/L1的每条正向、反向、绕过、并发、恢复、升级用例均登记；所有产品策略测试目前 **NOT_RUN**。本轮SQL探针仅验证部分底层模式，不能给这些策略授予PASS。

## 三模式的确切边界

ENFORCE执行当前策略；AUDIT_ONLY仍评估与记日志，仅对管理员明确选择的degradable policy_id解除应用阻断，未选条款仍ENFORCE；DISABLED在选定全局/项目/策略组范围内不调用应用PDP，审计写BYPASSED。不存在把DENY改写为历史ALLOW的操作。模式不是按L0/L1名字粗暴全开关；表中owner为独立OS、数据库、凭证、原档案、专属科研服务的不变量始终由各自owner落实。

恢复通道只修改模式授权，不执行Agent工具。它独立于故障PDP，并验证本机管理员peer身份；Agent/MCP/项目文件无此端点能力。旁路需二次确认、精确范围、原因与过期；M0建议上限AUDIT_ONLY 2小时、DISABLED 30分钟，可再次人工确认续期。

切换先冻结新副作用→核对在途进程/执行许可→撤销旧epoch→在独立管理库原子追加审计与提交新模式→广播有效配置。审计不可持久化则不切换。服务崩溃从已提交管理日志恢复；不能把配置读取失败当DISABLED。任何过期/时钟异常均先封锁新的旁路副作用，进入ENFORCE_PENDING_PREFLIGHT；通过预检并由预先确认的恢复目标或管理员确认才恢复ENFORCE。预检失败保持封锁，不延长旁路。

手动回退不意味着自动启用其他Feature；各工具、网络、沙箱、工作区保护独立。DISABLED的语义测试必须证明：同一可降级应用条款在ENFORCE被阻断，在选定AUDIT_ONLY记录would-deny但执行，在DISABLED不评估PDP；同时OS越界、Agent改模式等独立控制仍拒绝。

## 策略目录

| ID 与级别 | 强制位置 | ENFORCE | AUDIT_ONLY | DISABLED |
|---|---|---|---|---|
| P.IDENTITY L0 | 可信IPC身份与能力Broker | 校验peer身份，禁止payload自报管理员 | 校验peer身份，禁止payload自报管理员；独立不变量不随应用审计模式关闭 | 校验peer身份，禁止payload自报管理员；属于独立底层/结构保护，未隐式关闭 |
| P.FS_SCOPE L0 | OS执行器/句柄授权 | 路径/重解析点/硬链接/UNC/ADS边界，操作绑定句柄 | 路径/重解析点/硬链接/UNC/ADS边界，操作绑定句柄；独立不变量不随应用审计模式关闭 | 路径/重解析点/硬链接/UNC/ADS边界，操作绑定句柄；属于独立底层/结构保护，未隐式关闭 |
| P.REVIEW_RO L0 | OS只读身份/挂载 | Reviewer对候选树不可写 | Reviewer对候选树不可写；独立不变量不随应用审计模式关闭 | Reviewer对候选树不可写；属于独立底层/结构保护，未隐式关闭 |
| P.ARCHIVE_APPEND L0 | Archive Writer/文件ACL | 原档案只追加；摘要不能覆盖；读取内容哈希校验 | 原档案只追加；摘要不能覆盖；读取内容哈希校验；独立不变量不随应用审计模式关闭 | 原档案只追加；摘要不能覆盖；读取内容哈希校验；属于独立底层/结构保护，未隐式关闭 |
| P.SECRET_BOUNDARY L0 | Credential Broker/模型出口 | Key不进worker/renderer/模型；意外敏感原文加密隔离存储 | Key不进worker/renderer/模型；意外敏感原文加密隔离存储；独立不变量不随应用审计模式关闭 | Key不进worker/renderer/模型；意外敏感原文加密隔离存储；属于独立底层/结构保护，未隐式关闭 |
| P.DB_ATOMIC L0 | 唯一约束/条件事务 | 消息去重、原子claim、事务与检查约束 | 消息去重、原子claim、事务与检查约束；独立不变量不随应用审计模式关闭 | 消息去重、原子claim、事务与检查约束；属于独立底层/结构保护，未隐式关闭 |
| P.EXPERIMENT_ONCE L0 | 独立实验Capability/数据库 | 精确实验+协议+seed单次claim；不确定结果不得重置或重跑 | 精确实验+协议+seed单次claim；不确定结果不得重置或重跑；独立不变量不随应用审计模式关闭 | 精确实验+协议+seed单次claim；不确定结果不得重置或重跑；属于独立底层/结构保护，未隐式关闭 |
| P.WORKSPACE_WRITER L0 | Broker租约/OS进程树 | 同工作区单写者，fencing token与真实进程退出核验 | 同工作区单写者，fencing token与真实进程退出核验；独立不变量不随应用审计模式关闭 | 同工作区单写者，fencing token与真实进程退出核验；属于独立底层/结构保护，未隐式关闭 |
| P.BUDGET_HARD L0 | Model Gateway原子额度 | 调用前预留全层级硬预算；换Key不绕过账户限额 | 调用前预留全层级硬预算；换Key不绕过账户限额；独立不变量不随应用审计模式关闭 | 调用前预留全层级硬预算；换Key不绕过账户限额；属于独立底层/结构保护，未隐式关闭 |
| P.ADMIN_MODE L0 | 独立管理Broker/审计库 | 仅可信管理员切模式；双确认、范围、原因、期限与审计；Agent不得改 | 仅可信管理员切模式；双确认、范围、原因、期限与审计；Agent不得改；独立不变量不随应用审计模式关闭 | 仅可信管理员切模式；双确认、范围、原因、期限与审计；Agent不得改；属于独立底层/结构保护，未隐式关闭 |
| P.APPROVAL_REPLAY L0 | 执行许可存储/原子consume | 凭证绑定参数/版本/nonce/次数，原子消费不重放 | 凭证绑定参数/版本/nonce/次数，原子消费不重放；独立不变量不随应用审计模式关闭 | 凭证绑定参数/版本/nonce/次数，原子消费不重放；属于独立底层/结构保护，未隐式关闭 |
| P.TOOL_CONTRACT L0 | Tool Gateway/执行器 | 工具Schema、注册身份、执行许可与epoch必须有效 | 工具Schema、注册身份、执行许可与epoch必须有效；独立不变量不随应用审计模式关闭 | 工具Schema、注册身份、执行许可与epoch必须有效；属于独立底层/结构保护，未隐式关闭 |
| P.GIT_PUBLISH L1 | PDP/PEP/Approval Service | 指定仓库/远程/分支/候选SHA的Git commit/merge/push应用审批，无有效人工批准则REQUIRE_APPROVAL | 默认仍执行ENFORCE；仅管理员选定的可降级policy_id记录would-deny并允许符合独立底层能力的请求 | 此作用域内应用策略不评估，记录BYPASSED而非ALLOW；工具开关、独立OS/能力仍可能拒绝 |
| P.DATA_DELETE L1 | PDP/PEP/Approval Service | 精确数据集合与操作参数的删除应用审批，无有效人工批准则REQUIRE_APPROVAL | 默认仍执行ENFORCE；仅管理员选定的可降级policy_id记录would-deny并允许符合独立底层能力的请求 | 此作用域内应用策略不评估，记录BYPASSED而非ALLOW；工具开关、独立OS/能力仍可能拒绝 |
| P.INSTALL L1 | PDP/PEP/Approval Service | 软件安装与依赖生命周期脚本的应用审批，无有效人工批准则REQUIRE_APPROVAL | 默认仍执行ENFORCE；仅管理员选定的可降级policy_id记录would-deny并允许符合独立底层能力的请求 | 此作用域内应用策略不评估，记录BYPASSED而非ALLOW；工具开关、独立OS/能力仍可能拒绝 |
| P.PROJECT_RULE_CHANGE L1 | PDP/PEP/Approval Service | 项目工作规则变更应用审批，无有效人工批准则REQUIRE_APPROVAL | 默认仍执行ENFORCE；仅管理员选定的可降级policy_id记录would-deny并允许符合独立底层能力的请求 | 此作用域内应用策略不评估，记录BYPASSED而非ALLOW；工具开关、独立OS/能力仍可能拒绝 |
| P.EXPERIMENT_APPROVAL L1 | 独立科研执行授权服务 | 需要专属协议的人工授权 | 仍需专属授权；不是通用PDP可降级条款 | 仍需专属授权；关闭通用策略不创建科研权限 |
| P.BUDGET_INCREASE L1 | Model Gateway管理员配置 | 预算提高需可信管理员确认 | 仍需管理员；余额硬限制独立 | 仍需管理员；旁路不凭空增加余额 |
| P.REVIEW_BINDING L2 | ReviewResult schema/集成服务 | 只有候选/基线/规则/测试配置哈希完全匹配的PASS可用于批准 | 评估失败可由选定质量策略旁路，但旧审查不能被改写成新候选PASS | 可不把审查作为集成前提；历史PASS仍只能对应原候选 |
| P.WORKFLOW_GATES L2 | Workflow Runtime | 已启用Gate验证证据，关闭的Gate为BYPASSED | 选定质量Gate仅记录；跳过不变成PASS | 应用质量阻断关闭；Gate关闭仍为BYPASSED，NOT_RUN保持原值 |
| P.SCIENTIFIC_CLAIM L2 | 证据/独立审查 | 缺证据为INCONCLUSIVE；程序不能保证科学真值 | 可绕过工作推进阻断，不能伪造已运行或已证实 | 不评估质量要求；Result schema仍保留真实测试状态 |
| P.STYLE L3 | 规则提示/可选linter | 建议并显示差异 | 仅记录建议 | 不注入/不检查该应用指导 |

## 测试追踪

JSON中的每个test_id是后续可执行测试合同，不能解读为已运行。每条L0/L1至少覆盖合法调用、伪造身份、范围/nonce失配、直接Shell/外部Harness绕过、并发竞争、故障恢复及规则版本升级。管理员模式专项还需PDP故障、管理审计磁盘满、过期期间睡眠/重启/时钟回拨、在途许可撤销、重复确认、范围重叠的保守合成（ENFORCE优先）等案例。

L3提示无法成为安全保证；L2语义检查只能给出有范围的证据。L0标识的是平台约束，不表示能够抵抗机器管理员主动修改OS或离线磁盘。管理员主动降低独立底层保护需另一个配置动作、风险展示与审计，不能通过policy.mode连带更改。
