# Policy Catalog v0.2 — M0.1

共34条，历史22条保留在[M0](../../AgentNexus-v0.4-M0/architecture/policy_catalog.json)。JSON包含每条正/反/绕过/并发/恢复/升级测试，全部初始NOT_RUN，不能由目录检查授予实现PASS。

ENFORCE正常阻断；AUDIT_ONLY只放宽管理员精确选择的degradable条款并保留原判定；DISABLED真实不调用选定应用PDP、写BYPASSED。L0和明确独立owner继续执行；PDP故障不自动降级。管理员控制部署门、到期冻结与恢复预检沿用M0及本轮内部协议。

| ID/级别 | Owner | 可降级 | ENFORCE及必要负例 |
|---|---|---|---|
| P.IDENTITY / L0 | 可信IPC身份与能力Broker | False | 校验peer身份，禁止payload自报管理员；伪造payload actor/admin不能改变认证subject |
| P.FS_SCOPE / L0 | OS执行器/句柄授权 | False | 路径/重解析点/硬链接/UNC/ADS边界，操作绑定句柄；../、ADS、UNC、链接置换不能取得工作区外句柄 |
| P.REVIEW_RO / L0 | OS只读身份/挂载 | False | Reviewer对候选树不可写；Reviewer写候选树应被OS拒绝 |
| P.ARCHIVE_APPEND / L0 | Archive Writer/文件ACL | False | 原档案只追加；摘要不能覆盖；读取内容哈希校验；旧raw UPDATE/DELETE与摘要覆盖被拒绝 |
| P.SECRET_BOUNDARY / L0 | Credential Broker/模型出口 | False | Key不进worker/renderer/模型；意外敏感原文加密隔离存储；worker环境/模型/普通log无真实Key，未授权读取拒绝 |
| P.DB_ATOMIC / L0 | 唯一约束/条件事务 | False | 消息去重、原子claim、事务与检查约束；16并发claim一个胜者；rollback不留半个状态/outbox |
| P.EXPERIMENT_ONCE / L0 | 独立实验Capability/数据库 | False | 精确实验+协议+seed单次claim；不确定结果不得重置或重跑；相同协议seed再次claim拒绝，UNKNOWN不可重置 |
| P.WORKSPACE_WRITER / L0 | Broker租约/OS进程树 | False | 同工作区单写者，fencing token与真实进程退出核验；旧writer仍活不得发新fence；expected hash失配拒绝 |
| P.BUDGET_HARD / L0 | Model Gateway原子额度 | False | 调用前预留全层级硬预算；换Key不绕过账户限额；共享Account换Key不能多领取预算，未知账单保留预留 |
| P.ADMIN_MODE / L0 | 独立管理Broker/审计库 | False | 仅可信管理员切模式；双确认、范围、原因、期限与审计；Agent不得改；Agent无控制句柄；错peer/重复challenge/过期冻结拒绝 |
| P.APPROVAL_REPLAY / L0 | 执行许可存储/原子consume | False | 凭证绑定参数/版本/nonce/次数，原子消费不重放；不同参数/主体/期限/epoch与已消费permit拒绝 |
| P.TOOL_CONTRACT / L0 | Tool Gateway/执行器 | False | 工具Schema、注册身份、执行许可与epoch必须有效；未知tool/version/schema无执行；注册只读声明不能提升能力 |
| P.GIT_PUBLISH / L1 | PDP/PEP/Approval Service | True | 指定仓库/远程/分支/候选SHA的Git commit/merge/push应用审批，无有效人工批准则REQUIRE_APPROVAL；无明确repo/remote/ref/candidate人工授权不得publish |
| P.DATA_DELETE / L1 | PDP/PEP/Approval Service | True | 精确数据集合与操作参数的删除应用审批，无有效人工批准则REQUIRE_APPROVAL；精确资源/参数变动后旧批准拒绝 |
| P.INSTALL / L1 | PDP/PEP/Approval Service | True | 软件安装与依赖生命周期脚本的应用审批，无有效人工批准则REQUIRE_APPROVAL；依赖lifecycle脚本无独立批准不得执行 |
| P.PROJECT_RULE_CHANGE / L1 | PDP/PEP/Approval Service | True | 项目工作规则变更应用审批，无有效人工批准则REQUIRE_APPROVAL；工作区文本不能自授规则变更 |
| P.EXPERIMENT_APPROVAL / L1 | 独立科研执行授权服务 | False | 需要专属协议的人工授权；通用Policy DISABLED不创建专属科研授权 |
| P.BUDGET_INCREASE / L1 | Model Gateway管理员配置 | False | 预算提高需可信管理员确认；payload预算加大不改可信账户额度 |
| P.REVIEW_BINDING / L2 | ReviewResult schema/集成服务 | True | 只有候选/基线/规则/测试配置哈希完全匹配的PASS可用于批准；新candidate/rules/profile使旧PASS失效 |
| P.WORKFLOW_GATES / L2 | Workflow Runtime | True | 已启用Gate验证证据，关闭的Gate为BYPASSED；Gate OFF为BYPASSED，未运行仍NOT_RUN |
| P.SCIENTIFIC_CLAIM / L2 | 证据/独立审查 | True | 缺证据为INCONCLUSIVE；程序不能保证科学真值；模拟/空证据不能转换真实验证PASS |
| P.STYLE / L3 | 规则提示/可选linter | True | 建议并显示差异；OFF不调用linter，提示不可充当安全约束 |
| P.AUDIT_REQUIRED / L0 | Audit Writer / Tool Gateway | False | 实际动作前持久化意图、动作后记录结果；核心审计关闭请求拒绝；审计写失败时执行计数必须为0；已执行结果失败保留claim |
| P.ARTIFACT_INTEGRITY / L0 | Artifact Store | False | 流式对象hash/长度/访问域核验；不把不完整对象当完整结果；篡改/截断/错误hash读取拒绝；并发相同hash发布不覆盖 |
| P.EVIDENCE_DOMAINS / L0 | Archive / Audit / Decision owners | False | 交互、操作、产物、决定分域；更正追加，声明不伪装实际执行；把模型说已执行注入audit实际成功状态必须拒绝 |
| P.REPLAY_READONLY / L0 | Task Reconstruction API | False | Replay只读重建，不持有executor或签发permit能力；历史shell文本被导入重建时外部执行计数为0 |
| P.DI_NOEXEC / L0 | Diagnostic Process Adapter | False | 解析器只解析，固定可信argv，stdin源文本不eval，不加载项目插件；含命令替换/写文件/导入副作用的源码检查不得产生目标副作用 |
| P.DI_SYNTAX / L2 | Development Intelligence / PDP | True | 启用语法检查时FAIL阻断对应已接入命令；缺检查器明确NOT_RUN；故意缺右括号不能标PASS；OFF为VALIDATION_BYPASSED |
| P.DI_ARGUMENTS / L2 | Versioned CLI Schema / PDP | True | 参数按明确版本schema验证；未知CLI或动态解析INCONCLUSIVE；未知参数/缺值/--边界分开，不能仅语法PASS批准 |
| P.DI_ENVIRONMENT / L2 | Environment Checker / PDP | True | 核实执行文件版本与所需能力；不自动安装或执行用户help；缺二进制/版本不匹配不能PASS；检查OFF不免除executor能力 |
| P.COMMAND_RISK / L1 | PDP / Approval Service | True | 已接入的静态高风险操作需人工审批；底层scope/科研能力独立；安全提示关闭或AUDIT_ONLY不能授予沙箱/文件/科研能力 |
| P.SANDBOX_CAPABILITY / L0 | Capability Broker / Sandbox | False | 逐平台逐能力实测profile；未验证任意shell和外部Harness拒绝；伪造sandbox=true、只给token/Job回执均不能获得完整执行 |
| P.PACKAGE_INTEGRITY / L0 | Native Package Verifier | False | 完整相对路径双向集合/hash验证；拒绝重复/冲突/链接/逃逸；新增嵌套SHA256SUMS、遗漏/恶意文件必须FAIL；TOCTOU不闭合不发行 |
| P.RESOURCE_BOUNDS / L0 | Stream / Queue / Process owners | False | 按字节背压、分段与并发上限；触顶拒绝/暂停，不删原文；超大单chunk/并发队列满/输出限额必须有明确终态并保留durable prefix |
