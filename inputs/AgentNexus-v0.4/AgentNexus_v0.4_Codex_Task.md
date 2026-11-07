# AgentNexus v0.4 — Codex 开发总任务书
**目标：开发一个模块化、可手动启停、可降级和可恢复的自主项目研发环境。**

## 必读资料
1. `AgentNexus_v0.4_Architecture.md`（尤其阅读末尾 v0.4 架构修订；若正文 v0.3 与修订冲突，以 v0.4 修订为准）
2. 原始 `ai-workflow-kit-v4.0.0.zip` 及其校验清单、测试和验证材料
3. 当前仓库及父级适用规则

## 核心产品原则

### 1. Workflow Kit 深度内建
AI Workflow Kit v4.0 的规则、角色、G0-G6、模板、治理工具、检查清单和验证逻辑必须融入 Native Harness 的 Workflow Runtime。不得只作为外部提示词包或要求 Agent 手动加载的附件。完整盘点源套件并建立映射、测试、来源和许可证记录。

### 2. 功能模块化并支持手动启停
所有可选功能由 Feature Registry / Module Manager 管理，至少支持：
- `ON` / `OFF` / `INHERIT`
- 全局、项目、Agent、Task 作用域（仅开放允许的作用域）
- 依赖/冲突检查
- 关闭影响预览
- 降级合同
- 手动重启、回滚和恢复默认
- 配置变更审计

关闭功能不得删除历史数据、原始档案、配置和已生成产物。功能关闭后不得继续暗中运行、消耗资源或被其他模块隐式调用。每项模块必须说明关闭后替代路径。

### 3. Policy Enforcement 支持手动关闭/降级
Policy Enforcement 提供三种管理员模式：
- `ENFORCE`：正常策略强制执行。
- `AUDIT_ONLY`：记录策略判定，对选定可降级策略不阻断。
- `DISABLED`：关闭应用层策略检查，显示醒目的旁路状态。

模式只能由可信本机管理 UI 或管理员 API 修改，Agent/Harness/Workflow/MCP 不得更改。切换需二次确认、原因、作用域、自动过期和独立审计。策略服务故障不得自动进入旁路。恢复 ENFORCE 前必须执行预检。

Policy Enforcement 关闭不自动关闭 OS 沙箱、凭证加密、档案完整性、数据库事务和管理员审计；这些是独立开关。若用户要关闭底层沙箱，也必须单独确认并展示风险。不得让“关闭策略”隐式变成“主机完全开放”。

### 4. 备用路径是真实功能
每个可选模块必须有 Degradation Contract。示例：
- 自动模型路由关闭 → 手动选模型。
- Key 轮询关闭 → 手动固定凭证。
- 自动审查关闭 → 手动发起 Reviewer。
- Context Retrieval Agent 关闭 → Archive API/CLI/UI 手动检索。
- Coordinator 关闭 → 静态配额和人工排程。
- 自动任务规划关闭 → 手动建立任务。
- 自动修复关闭 → 手动修复。
- G0-G6 某个 Gate 关闭 → 显示 `BYPASSED`，不得显示 `PASS`。
- 外部 Harness Adapter 关闭 → 使用原生 Harness 或其他已验证后端。

### 5. 提示词不是安全边界
所有有副作用的操作在正常 ENFORCE 模式下必须经过程序执行层。L0/L1 规则有正向、反向、绕过、并发和故障恢复测试。不能只靠模型遵守提示词。

### 6. 完整上下文保留
原始交互、工具调用、工具返回和状态事件追加式保存，默认无损压缩；摘要/向量索引是派生物，不得覆盖原始记录。关闭摘要或检索 Agent 不影响原始档案。

### 7. 自有架构
研究 DeepSeek Harness、Cline、OpenHands/SDK、OpenCode、Goose、Agensh、Deep Agents，以及 Codex、Claude Code、ZCode 公开接口。逐模块选择 REUSE/FORK_MODIFY/REIMPLEMENT/REFERENCE_ONLY，不得未经审计选定单一底座。

---

## M0：源码审计与模块清单

必须先完成：
1. `research/harvest_matrix.md`：候选 Harness 源码模块研究。
2. `research/license_inventory.md`：许可证和依赖义务。
3. `research/security_review.md`：威胁模型与攻击面。
4. `architecture/adr/`：模块采用决策。
5. `architecture/feature_catalog.md`：全部功能 Feature ID、默认状态、作用域、依赖、风险、降级合同。
6. `architecture/policy_catalog.md`：L0-L3 规则、ENFORCE/AUDIT_ONLY/DISABLED 行为和测试映射。
7. `architecture/workflow_kit_mapping.md`：v4.0 每个目录/规则/角色/Gate/模板/工具/测试的内建映射。
8. `architecture/internal_protocols.md`：Agent/Task/Event/Tool/Session/Archive/Policy/Approval/Feature 协议。
9. `reports/M0_report.md`：证据、风险、未检查内容和选型建议。

必须固定仓库版本/commit，核实许可证、依赖许可证、安全边界和实际源码。README 不能代替源码审计。

## M1：Feature Registry + Policy 模式 + Context Archive

实现：
- Feature Registry / Module Manager。
- ON/OFF/INHERIT 和作用域优先级。
- 依赖、冲突、关闭影响预览和降级合同。
- Policy ENFORCE/AUDIT_ONLY/DISABLED 管理员模式。
- 模式切换确认、原因、作用域、自动过期、审计和恢复预检。
- Policy 服务故障时不得自动旁路。
- Context Archive 追加式、无损压缩、manifest、哈希、恢复。
- 基础 Project/Agent/Session/Task/Event 状态。

M1 验收：
- 关闭模块后无残留执行。
- 关闭模块不删除数据。
- ON/OFF/INHERIT 优先级正确。
- 依赖不满足时拒绝启用并解释。
- Agent 无法切换 Feature 或 Policy 设置。
- Policy 三种模式真实生效。
- DISABLED 显示明显旁路状态并有自动过期。
- Policy 崩溃不自动切换 DISABLED。
- 恢复 ENFORCE 前执行预检。
- 原始档案压缩解压字节一致，追加写崩溃可恢复。

## M2：Native Harness 与执行接口
实现 Agent Loop、Context Assembly、Tool Runtime、Session/Turn、Checkpoint、Workspace/Git/Terminal、Model Adapter。模块按 Feature Registry 启停。所有正常策略模式下的受控工具调用走统一 Tool Gateway。即使 Policy 进入手动旁路，状态和降级提示也必须明确。

## M3：Model Gateway 与 Credential Pools
Provider/Account/Credential/Pool/Model/Profile 分离。实现密钥保险库、多 Key 池、账户共享限额、路由、限流、预算、用量和手动模式。自动路由、轮询、故障切换分别独立开关。

## M4：Workflow Kit 原生整合
逐项将 v4.0 的规则、角色、G0-G6、模板、工具、测试、验证材料整合到 Workflow Runtime。每个功能独立 Feature ID。保留原始套件只读归档和 SHA256。工作流功能可关闭；关闭 Gate 必须标记 BYPASSED，不伪装 PASS。Workflow 关闭不能隐式关闭独立 OS/凭证保护。

## M5：多 Agent Runtime
五类系统 Agent、双向消息、事件唤醒、子 Agent 隔离、自动派生开关、后台审查开关、Coordinator 开关、自动修复开关、手动备用路径。所有系统角色和任务工作角色分层。

## M6：外部 Harness Adapter 与 Desktop Studio
接入可用的 Codex、Claude Code、ZCode、OpenCode 等接口。适配器独立启停。无法证明执行边界受控的外部 Harness 不得获得高风险权限。桌面 UI 提供模块管理、Policy 模式、项目、Agent、Task、Workspace、Review、Archive、Models/Keys 和状态监控。

## M7：降级、恢复与长期运行验证
开展：
- 模块单独关闭/开启测试。
- 依赖模块故障测试。
- Policy 模式切换与自动过期测试。
- 进程强杀、服务崩溃、断电恢复。
- 长时间 soak test。
- 内存、磁盘、队列背压。
- 备用路径实际操作演练。
- 多项目隔离和权限绕过测试。

---

## 测试结果标记

- `PASS`：真实完成并有证据。
- `FAIL`：真实失败。
- `NOT_RUN`：未运行。
- `INCONCLUSIVE`：证据不足。
- `FAKE_ONLY`：仅由模拟后端验证。
- `BYPASSED`：用户主动关闭/跳过对应功能，不得当作 PASS。

不得把 Fake 测试写成真实模型联调，不得把未运行测试写成通过。

## 工程边界
- 流式写盘、分块处理、背压、检查点；不无限累积内存。
- 不自动操作用户现有科研项目或运行正式实验。
- 真实仓库默认不自动 commit/push。
- 不绕过项目专属授权和实验协议。
- 不把 Git worktree 当成完整安全沙箱。
- 超时不等于旧进程已停止。
- 复用代码必须记录来源、版本、许可证、修改和同步策略。
- 优先保证正确性、数据完整性、恢复能力和可维护性，避免无关过度工程化。

## 现在开始
先阅读全部规则和设计，执行 M0。第一轮汇报资料确认、源码审计计划、Feature Catalog 初稿、Policy Catalog 初稿、Workflow Kit 映射计划、主要风险和需用户授权的事项，然后实际开展审计，不要只提交计划就停止。
