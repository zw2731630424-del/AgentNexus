# AgentNexus v0.4 — 模块化可配置总体架构设计
**产品定位：Autonomous Project Development Environment（自主项目研发环境）**  
**文档状态：架构提案 v0.4 / 待 M0 技术审计与用户确认**  
**目标读者：Codex、架构设计者、实现团队**  
**本版核心变化：AI Workflow Kit v4.0 深度内建于原生 Harness；功能模块均提供手动启停和降级合同；Policy Enforcement 支持管理员手动降级/旁路模式；保留原生 Harness、多 Harness 研究吸收、统一模型网关和完整上下文档案。**

---

## 0. 执行摘要

AgentNexus 不是一个简单的多 Agent 调度器，也不是把 Codex、Claude Code、ZCode 等软件放在一起的启动器。它是一个以项目为中心、能长期持续运行的研发工作环境。

系统由四个相互解耦的核心层组成：

1. **Native Harness**：提供单个 Agent 的完整开发能力。
2. **Agent Runtime**：管理多个逻辑 Agent、任务、消息、唤醒、并发与恢复。
3. **Workflow & Project Governance**：整合 AI Workflow Kit v4.0，管理项目规则、工作流、任务合同、证据和决策。
4. **Model & Credential Gateway**：统一模型目录、API 凭证池、路由、预算与用量。
5. **Policy Enforcement Plane**：独立于所有 Agent 的强制策略控制层，拦截并授权所有有副作用的操作。

桌面工作台是这些能力的用户界面，不是系统的业务核心。Policy Enforcement Plane 是控制平面中的强制边界，不能由 Agent、Harness 或 Workflow 覆盖。

最高原则：

> AgentNexus 不以任何一个现成 Harness 作为最终架构主人。系统性研究主流开源 Harness 的源码和设计，按模块选择直接复用、Fork/修改、参考后重写或仅借鉴思想；最终形成统一接口、统一数据模型和可独立演进的 AgentNexus 原生 Harness。

上下文原则：

> 原始交互与执行记录完整、可校验、追加式保存；默认只做无损压缩，不以语义摘要覆盖原始历史。摘要、索引和提取结果均为可重建的派生物。需要历史时，通过检索/分析 Agent 按需读取原始证据。

v0.3 在 v0.2 基础上强化策略强制执行要求。本设计不预先决定最终技术栈，也不预先认定 DeepSeek Harness、Cline、OpenHands、OpenCode、Goose 或 Agensh 中任何一个应成为底座。必须先完成源码、许可证、安全、协议和模块能力审计，再做复用决策。

---

# 1. 产品目标与非目标

## 1.1 目标

- 为软件工程、科研、数学/算法、数据分析等复杂项目提供长期研发环境。
- 以项目为单位隔离规则、上下文、知识、任务、工作区、预算和权限。
- 支持五类系统级角色：常驻 Agent、开发主 Agent、开发子 Agent、后台审查 Agent、协调 Agent。
- 允许 Agent 双向通信、异步等待、按事件唤醒和跨会话恢复。
- 支持不同模型、不同 Harness、不同供应商和不同 API Key 池。
- 提供原生 Harness，不把核心能力绑定到单一厂商或单一外部产品。
- 整合 AI Workflow Kit v4.0 的规则、角色、G0-G6 工作流、任务合同、Checkpoint、证据、治理和验证工具。
- 支持独立工作区、Git worktree、终端、文件操作、测试、Diff 和审查闭环。
- 保存完整历史，使 Agent 更换会话、模型或进程后仍能恢复项目脉络。
- 对长时间运行提供资源监控、故障恢复、预算控制和安全边界。

## 1.2 非目标（首版不做）

- 不做分布式集群和跨机器调度；先做好单机多进程架构。
- 不做通用社交聊天平台或面向消费者的聊天机器人。
- 不复制任何闭源 Harness 的内部实现。
- 不把所有开源项目拼成一个巨大代码库。
- 不承诺所有外部 Harness 都能透明代理所有 API；认证、工具和协议能力必须逐项验证。
- 不自动接管用户现有科研项目，不自动运行正式实验，不自动扩大实验授权。
- 不追求每个 Agent 永远占用模型上下文或持续推理。
- 不用摘要替代原始上下文，不把上下文窗口管理等同于历史保存。

---

# 2. 总体架构

```text
┌─────────────────────────────────────────────────────────────┐
│                    AgentNexus Studio                         │
│ Projects | Agents | Tasks | Workspace | Reviews | Workflow  │
│ Context Archive | Models & Keys | Usage | Settings          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Local API / IPC
┌──────────────────────────────▼──────────────────────────────┐
│                    AgentNexus Host                           │
│                                                              │
│  Resident Service       Event Bus       Scheduler            │
│  Agent Registry         Task Engine     Recovery Manager     │
│  Coordinator            Policy Engine   Budget Controller    │
│  Project Manager        Audit Trail     Notification Center  │
│  Policy Enforcement Plane (独立强制控制平面)                  │
└──────────────┬──────────────────────┬────────────────────────┘
               │                      │
┌──────────────▼─────────────┐  ┌─────▼────────────────────────┐
│ Workflow & Governance      │  │ Native Harness               │
│ Rules / Skills / Roles     │  │ Agent Loop                   │
│ G0-G6 / Task Contracts     │  │ Context Assembly             │
│ Decisions / Evidence       │  │ Tool Runtime                 │
│ Checkpoints / Validation   │  │ Session & Turn Engine        │
│ Project-specific workflows │  │ Subagent Interface           │
└──────────────┬─────────────┘  │ Permission / Sandbox          │
               │                │ Workspace / Git / Terminal    │
               │                └─────────────┬─────────────────┘
               │                              │
┌──────────────▼──────────────────────────────▼─────────────────┐
│                    Integration Gateways                       │
│ Harness Adapter Gateway | MCP | ACP | LSP | External CLI/API  │
└──────────────────────────────┬────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                 Model & Credential Gateway                   │
│ Model Registry | Provider Registry | Credential Pools        │
│ Routing | Rate Limits | Retry Policy | Usage | Budgets        │
│ Native Auth References | API Compatibility Adapters           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Storage & Execution Infrastructure                           │
│ SQLite metadata | Append-only event archive | Object store    │
│ Encrypted secret vault | Git worktrees | Sandboxed processes  │
│ Logs / Metrics / Backups / Integrity manifests                │
└─────────────────────────────────────────────────────────────┘
```

## 2.1 架构边界

- **Studio**：展示和交互，不直接持有上游 API Key，不绕过 Host 执行任务。
- **Host/Runtime**：管理身份、任务、事件、权限和恢复；常驻部分以普通服务运行，不要求 LLM 常驻推理。
- **Native Harness**：负责单 Agent 的推理—工具—观察循环和开发能力。
- **Workflow Engine**：定义项目应该如何工作，不负责启动底层进程。
- **Model Gateway**：管理模型选择与供应商凭证，不负责决定项目任务。
- **Archive**：保存发生过的事实；不能被摘要或知识提取覆盖。
- **External Adapters**：允许接入 Codex、Claude Code、ZCode、OpenCode 等，但外部 Harness 是可替换执行后端，不是系统的架构主宰。

---

# 3. 五类系统级 Agent

系统角色是长期逻辑身份；模型会话和操作进程按需启动、暂停、结束和恢复。Agent 等待消息时释放模型调用资源。

## 3.1 常驻 Agent（Resident Agent）

**定位：事件接收、消息路由、唤醒和运行监控。**

职责：
- 监听持久化事件总线和 Agent 收件箱。
- 将事件投递给目标 Agent。
- 根据状态机唤醒、恢复或通知 Agent。
- 监控任务超时、进程退出、心跳缺失和资源异常。
- 确保消息持久化后才确认接收。
- 负责可靠投递、幂等去重和死信队列。

不负责：
- 不自行制定项目技术方案。
- 不越权批准权限、预算或实验。
- 不以持续调用 LLM 的方式轮询消息。
- 不把事件总线与协调决策混为一谈。

默认实现应是低成本守护服务；只有遇到需要语义判断的事件才请求模型辅助分类。

## 3.2 开发主 Agent（Development Lead）

**定位：项目技术负责人和任务编排者。**

职责：
- 读取项目目标、规则、当前有效决策和任务状态。
- 制定计划并拆分任务。
- 创建/委派子 Agent，定义输入、输出、权限、预算和验收条件。
- 与子 Agent 双向通信，回答问题、调整任务。
- 整合工作结果，决定技术实现路径。
- 对开发成果进行主线整合前复核。
- 根据后台审查结果安排修复。
- 推进已授权范围内的下一项任务。

边界：
- 不可自行扩大授权、预算或研究目标。
- 不得把自己的初步方案当作已批准项目决策。
- 不得批准自己的代码审查结果。
- 不得把子 Agent 的结论未经核验就写入正式知识或决策账本。

## 3.3 开发子 Agent（Development Subagent）

**定位：执行边界清晰的专业任务。**

可配置角色：
- Scout / Reading：只读探索、代码阅读、资料定位。
- Worker / Coding：指定范围内实现。
- Research：论文和技术资料研究。
- Math：公式推导、数值实现独立核验。
- Debug：定位问题、提供复现。
- Testing：测试设计与执行。
- Scientific Design：独立科学假说和实验设计。
- Context Retrieval：读取原始历史、重建决策背景。
- Verifier：按合同独立验收。
- Reviewer：代码/数学/数据审查。

要求：
- 子 Agent 拥有独立上下文、身份、收件箱和工作区。
- 默认不共享完整聊天历史；通过任务合同、引用和必要文件获取上下文。
- 允许向主 Agent 发送 QUESTION、BLOCKED、FINDING、PROGRESS、RESULT。
- 可以等待消息并释放模型资源。
- 允许按任务难度选择模型和 Harness；贵价模型不是禁止选项。
- 子 Agent 派生子 Agent 必须显式授权、限制深度和预算，首版默认不允许无限递归。

## 3.4 后台审查 Agent（Background Reviewer）

**定位：独立核验具体候选版本的代码、数学、数值和必要测试。**

触发点：
- 候选提交（commit）或工作区快照形成。
- Pull Request / Merge Request 更新。
- 主 Agent 请求专项复核。
- 关键依赖或构建配置变更。

审查范围：
- 逻辑错误、边界条件、异常路径。
- 数学公式、数值实现、单位、维度、索引、掩码、更新顺序。
- 数据完整性、随机性、统计计算和必要回归。
- 安全问题和权限绕过。
- 任务合同与实际改动是否一致。

输出状态：
- `PASS`：必要检查真实完成，未发现阻断问题。
- `CHANGES_REQUESTED`：发现有证据支持的阻断问题。
- `INCONCLUSIVE`：证据不足、环境失败或必要检查未运行。
- `NOT_RUN`：未执行，不得视为通过。

强制要求：
- Reviewer 默认只读，不直接修改被审工作区。
- 审查必须绑定精确的候选树哈希/commit SHA、基线、规则版本和测试配置。
- 候选代码变化后旧审查自动失效。
- Reviewer 与作者使用独立会话；可读取必要任务合同和证据，但不继承作者完整推理上下文。
- Reviewer 可以报告研究设计/合同风险，但不擅自修改科学方向。
- 不允许只凭作者声明“测试通过”就判定 PASS。

## 3.5 协调 Agent（Coordinator）

**定位：跨任务、跨 Agent、跨项目的资源和依赖协调者。**

职责：
- 处理项目优先级和任务依赖。
- 分配模型并发槽位、GPU/CPU/内存、预算和时间窗口。
- 识别资源冲突、循环依赖、重复任务。
- 对跨项目资源冲突提出计划。
- 仅在规则不足或存在权衡时调用模型；普通调度由程序执行。

边界：
- 不参与项目代码开发。
- 不修改项目研究假说和技术实现。
- 不替代开发主 Agent 的项目技术判断。
- 不批准用户专属权限或受保护的正式实验。

---

# 4. Agent 身份、会话与执行状态

必须区分以下概念：

- **Agent Identity**：长期逻辑身份，拥有角色、项目归属、权限和收件箱。
- **Session**：某个 Harness 与模型的会话记录。
- **Turn/Run**：一次模型推理与工具执行过程。
- **Task**：有目标、范围、依赖、预算和验收条件的工作单元。
- **Process**：实际运行的操作系统进程。
- **Workspace**：Agent 修改文件的隔离工作目录。

一个 Agent 可以有多个 Session；一个 Session 可以有多个 Turn；Task 可跨 Session 延续。进程死亡不等于 Agent 身份死亡。

建议状态机：

```text
CREATED -> READY -> RUNNING -> WAITING
                    |           |
                    v           v
                 PAUSED      READY (收到消息)
                    |
                    v
               RECOVERING -> READY

终态：COMPLETED / FAILED / CANCELLED / BLOCKED
```

状态变更必须持久化。恢复时先核对进程、工具和外部操作状态，不能仅根据最后一条模型消息猜测操作是否完成。

---

# 5. Native Harness 设计

Native Harness 是 AgentNexus 的原生单 Agent 执行内核。模块之间通过稳定内部协议交互。

## 5.1 Agent Loop

标准循环：

1. 从任务和收件箱构建本轮输入。
2. 组装系统规则、项目规则、任务合同和相关证据。
3. 调用模型。
4. 解析文本、工具调用、结构化输出和结束原因。
5. 对工具调用执行权限检查。
6. 执行工具并记录输入、输出、结果和耗时。
7. 将结果写入追加式事件档案。
8. 判断继续、等待、完成、失败或请求人工决策。

Agent Loop 不得将工具输出伪装成模型输出。每个动作有唯一 Run ID / Tool Call ID。

## 5.2 Context Assembly Engine

- 负责为当前 Turn 组装有限的模型输入。
- 不负责删除或改写历史档案。
- 规则、任务合同、当前有效决策和权限声明优先级高于一般历史摘要。
- 需要历史时通过 Archive Retrieval 获取原始证据。
- 输入预算不足时，优先减少无关材料、分批读取或启动检索子 Agent；不能静默丢弃关键规则。
- 如果无法在当前窗口内安全完成，明确报告上下文不足，而不是伪造完整理解。

## 5.3 Tool Runtime

统一管理：
- 文件读写、搜索、目录浏览。
- Shell / Terminal。
- Git / Worktree / Diff。
- 测试和构建。
- MCP 工具。
- LSP / 代码索引。
- 浏览器和外部工具（后续阶段）。
- 项目自定义命令。

所有工具通过统一 Tool Contract 声明参数、权限、风险、超时、输出和可恢复性。每次有副作用的调用都必须交给独立 Policy Enforcement Plane 判定，Harness 不得自行放行。

## 5.4 Permission & Sandbox Engine

权限不靠提示词自觉，必须由独立 Policy Enforcement Plane 在执行前强制检查。提示词只是行为指导，不构成安全边界。

- 权限维度：项目、Agent 身份、角色、任务、目录、工具、命令、网络目标、模型、预算、并发、实验和数据操作。
- 默认拒绝（default deny）；未声明的权限不授予。
- 最小权限；任务结束、授权过期或身份撤销后立即失效。
- 所有有副作用的操作必须经过 Tool Gateway + Policy Enforcement Point。
- 运行时沙箱和操作系统权限必须限制实际能力；不能只在工具菜单隐藏功能。
- 数据库约束、原子 claim、唯一索引和追加式存储用于强制执行数据层不变量。
- Policy 服务不可用时，高风险和有副作用操作失败关闭（fail closed）。
- 外部 Harness 必须运行在受限进程/工作区中；若无法证明其所有执行通道都受控，则不得赋予高风险权限。
- Agent 不能自行修改策略、生成用户授权或提高自己的权限。

具体策略分类、授权凭证和执行协议见第 15 节。

## 5.5 Workspace Engine

- 每个并行写任务默认独立 Git worktree 或独立副本。
- 只读 Agent 可共享只读快照。
- 同一工作区默认单写者锁。
- Git worktree 不是完整安全沙箱；进程权限和文件系统隔离另行控制。
- 合并前检查基线、冲突、审查状态和权限。
- 默认不对用户真实仓库自动 commit/push，除非授权明确包含该操作。

## 5.6 Session & Checkpoint Engine

Checkpoint 记录可恢复状态，不替代原始历史。至少包含：
- Agent / Task / Session / Run ID。
- 当前目标和任务合同版本。
- 当前状态与待处理消息。
- 已完成与未完成步骤。
- 工作区路径及树哈希。
- 当前分支和基线 commit。
- 工具执行中状态。
- 最近事件序号。
- 需要恢复的外部操作核对项。

---

# 6. Context Preservation Architecture（上下文完整性优先）

这是 AgentNexus 的核心差异化能力。

## 6.1 基本原则

1. 原始交互与执行事件完整保留。
2. 默认只使用无损压缩（如 Zstandard）；压缩前后可验证字节一致。
3. 不以语义摘要覆盖原始内容。
4. 摘要、向量索引、关键词索引、知识提取和时间线都是派生数据，可重建。
5. 历史检索结果必须引用原始 Archive ID、Event ID 和精确范围。
6. 不确定、冲突和未解决问题必须保留，不得被摘要强行统一。
7. 原始档案采用追加式存储；更正通过新事件表达。
8. 记录入口需要秘密检测和脱敏策略，防止把 API Key、密码、令牌和个人敏感数据写入普通档案。原始记录完整性不代表必须记录明文秘密。

## 6.2 Archive 数据模型

```text
Project/
  archive/
    agents/
      {agent_id}/
        sessions/
          {session_id}/
            manifest.json
            events/
              segment-000001.jsonl.zst
              segment-000002.jsonl.zst
            attachments/
            tool-artifacts/
            integrity/
              checksums.json
              signature.json (optional)
```

每个事件建议字段：

```json
{
  "event_id": "evt_...",
  "sequence": 1234,
  "timestamp": "RFC3339",
  "project_id": "proj_...",
  "agent_id": "agent_...",
  "session_id": "sess_...",
  "run_id": "run_...",
  "task_id": "task_...",
  "type": "assistant_message|user_message|tool_call|tool_result|state_change|...",
  "source": "user|assistant|tool|runtime|external_agent",
  "payload_ref": "archive://...",
  "content_hash": "sha256:...",
  "previous_event_hash": "sha256:..."
}
```

事件 payload 可按类型保存为 JSON、文本、二进制附件或引用；大文件不应复制进消息数据库。

## 6.3 无损压缩和档案分段

- 以事件数量、时间或字节大小切分 segment。
- 关闭的 segment 只读并计算哈希。
- 正在写入的 segment 使用追加写和安全刷盘策略。
- 每个 segment 有 manifest：序列范围、事件数、压缩算法/版本、压缩前后哈希、创建时间。
- 定期进行校验和备份。
- 档案损坏时隔离坏 segment，恢复其他有效 segment，不得静默丢弃。

## 6.4 历史检索 Agent

专门的 Context Retrieval Agent 可按需：
- 查询决策为何形成。
- 查找某个公式/接口/实验协议的历史演变。
- 追踪某个问题首次出现及后续修复。
- 比较多个模型的独立意见。
- 还原某次任务的输入、输出和工具证据。

返回必须包含：
- 结论。
- 原始事件引用。
- 证据范围。
- 检索条件。
- 未找到的部分。
- 不确定性和冲突。

检索 Agent 不得修改原始档案，也不得把推断冒充原始事实。

## 6.5 摘要与知识提取

允许生成：
- 项目时间线。
- 当前状态视图。
- 任务摘要。
- 技术知识条目。
- 决策索引。
- 向量检索索引。

所有派生内容必须标注：
- 来源事件范围。
- 生成模型/程序版本。
- 生成时间。
- 置信/验证状态。
- 是否经过人工或独立 Agent 核验。

派生数据与原始事实冲突时，以原始证据为准；但原始记录内部冲突应保留冲突，而非自动裁决。

---

# 7. 项目记忆、决策账本与知识治理

原始历史、当前状态、决策和知识必须分开管理。

## 7.1 Project State

描述“现在是什么状态”：
- 项目目标和边界。
- 当前阶段。
- 当前任务。
- 进行中工作。
- 阻塞项。
- 最新基线。
- 当前有效规则版本。
- 预算和权限。

状态是可更新的投影，但每次更新都必须引用导致变化的事件。

## 7.2 Decision Ledger

描述“正式决定了什么以及为什么”：
- Decision ID。
- 决策内容。
- 状态：PROPOSED / ACCEPTED / REJECTED / SUPERSEDED / WITHDRAWN。
- 适用范围。
- 决策理由。
- 支持与反对证据。
- 来源事件引用。
- 批准者和批准时间。
- 替代/被替代关系。

Agent 的建议不能自动变成 ACCEPTED。需要按项目治理规则确定批准主体。

## 7.3 Knowledge Base

保存经整理的可复用知识、接口约定、已验证结论和经验。每条知识必须包含来源和验证状态，允许被更新或撤销，但不能修改原始档案。

## 7.4 Goal / Task / Checkpoint

整合 Workflow Kit 的 GOAL、Task Contract、Subtask、Checkpoint、Closeout 等模板。目标定义长期方向，任务合同定义本次工作范围，Checkpoint 定义可恢复位置。

---

# 8. Workflow Engine：整合 AI Workflow Kit v4.0

上传的 `ai-workflow-kit-v4.0.0(1).zip` 是 AgentNexus 的首批工作流基线，不应作为散落提示词简单复制。

## 8.1 必须保留并整合的内容

- `install/agents/`：Scout、Worker、Verifier、Reviewer 通用角色。
- `install/AGENTS.md`：通用入口规则。
- `reference/`：capabilities、context、decisions、evidence、governance、project-rules、routing、safety、strict-review、verification、workflow 等。
- `reference/checklists/`：gates、measurement、protocol、regression。
- `reference/templates/`：GOAL、task-contract、subtask、checkpoint、decision-log、experiment-plan、strict-review-record、closeout、token-ledger 等。
- `project-workflows/`：通用工作流路由与项目类型扩展入口。
- `tools/`：检查、治理、安装、管理、发布工具。
- `tests/` 与 `validation/`：测试、负向测试、完整性和验收材料。

整合前先核对压缩包 SHA256 清单、版本和测试报告。原始套件应只读归档，AgentNexus 内部集成版本另设目录和版本，不直接修改原始输入。

## 8.2 角色与系统角色的映射

Workflow Kit 的 Scout / Worker / Verifier / Reviewer 是**任务工作角色**，不是新增的系统级常驻 Agent。

例如：
- 开发主 Agent 可派生 Scout 只读探索。
- 开发主 Agent 可派生 Worker 实现模块。
- 后台审查 Agent 可启动 Reviewer 工作配置。
- 主 Agent 可派生 Verifier 做任务验收。

避免把系统角色和任务角色重复建模。

## 8.3 G0-G6 工作流

保留套件定义的 G0-G6 流程语义和门禁。集成时必须逐条读取源文件，建立映射和兼容性测试；不能仅凭名称猜测每个 Gate 的行为。

## 8.4 项目专属工作流

支持每个项目拥有独立的：
- project rules。
- project workflow。
- skills。
- commands。
- validation profiles。
- evidence policy。
- permission policy。

通用规则与项目规则冲突时按明确的优先级和不可覆盖规则处理；科研项目的实验协议和种子执行授权不能被普通软件开发流程覆盖。

---

# 9. Model Gateway 与 API Credential Pools

API 凭证管理是平台核心基础设施。

## 9.1 分层模型

- Provider：供应商，例如 OpenAI、DeepSeek、GLM、Anthropic、Google、Moonshot 等。
- Account / Project：供应商账户或项目，记录共享额度关系。
- Credential：具体 API Key / Token 的安全引用。
- Credential Pool：同一供应商或兼容端点下可调度的凭证集合。
- Model：供应商实际模型 ID。
- Model Profile：Agent 可请求的逻辑模型配置。
- Route Policy：模型与凭证选择策略。

Agent 只请求 `expert-reasoning`、`economy-worker` 等 profile，不读取真实 Key。

## 9.2 凭证池能力

- 添加、验证、禁用、撤销和轮换凭证。
- 密文保存，使用 OS Keychain / Secret Service 或独立加密 Vault。
- 数据库保存 credential reference，不保存明文 Key。
- 日志、消息、上下文档案、异常堆栈中禁止出现明文 Key。
- 记录账户/项目归属，识别共享 RPM/TPM/费用额度。
- 监控状态、错误率、限流、并发和最近使用时间。
- 预算耗尽时停止，不通过换 Key 绕过预算或供应商限制。

## 9.3 调度策略

可配置：
- Round Robin。
- Least Loaded。
- Priority。
- Health Based。
- Account-aware quota selection。

遇到 429、5xx、超时、认证失败时采用不同处理策略。只有明确可重试的操作才重试；工具副作用和非幂等请求必须先核对结果。不能对所有失败盲目换 Key 重发。

## 9.4 模型能力注册

Model Registry 记录：
- 上下文窗口和输出限制（来源与更新时间）。
- 工具调用能力。
- 结构化输出能力。
- 视觉/音频能力。
- 推理模式和参数。
- 流式能力。
- 供应商 API 方言。
- 价格与计费单位（注明来源和有效日期）。
- 速率限制（账户/项目/Key 级别）。

OpenAI-compatible 不代表功能完全兼容。每家供应商需要 Provider Adapter 和能力探测。

## 9.5 Native Harness Authentication

API Key Pool 与外部产品原生登录分离：
- Provider API Credentials：由 Model Gateway 管理。
- Native OAuth / Subscription Authentication：由相应 Harness Adapter 管理或引用操作系统安全凭证。
- External Harness Credentials：遵守对应产品支持的认证方式。

不得把 ChatGPT 订阅等同于 OpenAI API 额度，也不得将不允许转发的订阅认证伪装成通用 API Key。

---

# 10. Harness Research & Integration Program

## 10.1 研究对象

至少评估：
- DeepSeek Harness。
- Cline。
- OpenHands / Software Agent SDK。
- OpenCode。
- Goose。
- Agensh。
- Deep Agents。
- Codex 可公开的 App Server / ACP / SDK 接口。
- Claude Code 可公开的 CLI / SDK / MCP / ACP 能力。
- ZCode 实际可用的 CLI/API/协议能力。

具体仓库地址、活跃状态、版本、许可证和 API 能力必须在 M0 实时核查，不可沿用未经验证的旧结论。

## 10.2 模块拆解矩阵

对每个候选项目研究：
1. Agent Loop。
2. Model Provider Adapter。
3. Context / Prompt Assembly。
4. Tool Runtime。
5. File / Terminal / Browser。
6. Subagent / Delegation。
7. Session / Persistence。
8. Checkpoint / Recovery。
9. Permission / Sandbox。
10. MCP / ACP / LSP。
11. UI / Desktop。
12. Workflow / Skills / Rules。
13. Logging / Telemetry。
14. Testing / Evaluation。

每个模块产出：
- 仓库与固定 commit/tag。
- 许可证和依赖许可证。
- 源码目录与关键文件。
- 数据流和控制流。
- 接口与扩展点。
- 已知限制和安全风险。
- 性能与资源开销。
- 测试证据。
- 复用建议和理由。

## 10.3 四种采用决策

- `REUSE`：直接依赖/复用，保留来源和许可证。
- `FORK_MODIFY`：Fork 后改造，维护上游同步策略。
- `REIMPLEMENT`：参考实现后按 AgentNexus 内部规格重写。
- `REFERENCE_ONLY`：只借鉴思想，不引入代码。

不得因“能复制”就复制。也不得为了“全部自研”而重写成熟、独立、可靠的通用组件。

## 10.4 统一内部协议

所有内部模块围绕 AgentNexus 自有协议工作。外部 Harness 通过 Adapter 转换，不能让某个外部产品的数据模型渗透全系统。

协议至少包括：
- Agent lifecycle。
- Session / Turn lifecycle。
- Message / Event。
- Tool call / Tool result。
- Approval request。
- Usage report。
- Artifact reference。
- Checkpoint。
- Review result。
- Cancellation / Recovery。

---

# 11. Agent 通信、事件总线与任务调度

## 11.1 消息模型

消息必须持久化，建议字段：
- message_id。
- source_agent_id。
- target_agent_id / channel。
- project_id / task_id。
- message_type。
- payload_ref。
- created_at / expires_at。
- correlation_id / causation_id。
- idempotency_key。
- delivery_state。
- priority。

消息类型：
`TASK_ASSIGNED`、`QUESTION`、`ANSWER`、`PROGRESS`、`BLOCKED`、`FINDING`、`RESULT`、`REVIEW_REQUESTED`、`REVIEW_COMPLETED`、`APPROVAL_REQUIRED`、`CANCEL`、`HEARTBEAT` 等。

## 11.2 投递保证

采用至少一次投递 + 幂等消费。不能笼统承诺端到端 exactly-once。每个接收端维护去重记录；消息入库后才确认接收。失败消息进入重试队列或 Dead Letter Queue。

## 11.3 死锁和循环控制

- 父任务等待子任务时，父 Agent 的消息处理能力仍然可用。
- Agent 运行时一次只允许一个活动模型 Turn，其他消息排队或按优先级处理。
- 检测任务依赖环。
- 设置最大委派深度、子 Agent 数量和预算。
- 设置自动修复轮数上限。
- 对相同错误和相同 Patch 进行循环检测。
- 无法解决时转为 BLOCKED 并请求人工决策。

## 11.4 协调策略

普通资源调度由确定性代码执行。模型仅处理需要语义权衡的冲突。调度决策写入事件档案，记录依据和资源快照。

---

# 12. Review & Merge Lifecycle

```text
Task Contract
    |
Subagent Workspace
    |
Candidate Snapshot (tree hash / commit)
    |
Independent Reviewer
    |---- CHANGES_REQUESTED -> Developer fixes -> new snapshot -> re-review
    |---- INCONCLUSIVE -----> resolve missing evidence / ask human
    |---- PASS ------------> policy gate
                                |
                         authorized integration
                                |
                         post-merge verification
```

- 审查报告绑定精确候选版本。
- 候选变化后旧报告失效。
- 代码审查和科学结论审查分离。
- 审查 Agent 默认只读。
- 合并必须通过项目权限策略。
- 首版不自动 push 到远程。
- 正式科研实验执行必须走项目专属授权和防重复执行协议，不由通用任务调度器绕过。

---

# 13. Desktop Studio 产品结构

主要导航：
1. Projects：项目、规则、知识、目标、阶段。
2. Agents：身份、角色、状态、模型、Harness、收件箱。
3. Tasks：任务树、依赖、执行历史、Checkpoint。
4. Workspace：文件树、编辑器、终端、Git、Diff。
5. Reviews：审查报告、证据、修复循环。
6. Workflow：规则、角色、Skills、G0-G6、项目工作流。
7. Context Archive：会话档案、原始事件、检索、决策来源。
8. Models & Credentials：供应商、Key 池、模型、路由。
9. Usage & Budgets：Token、费用、并发、项目预算。
10. System Monitor：服务、进程、队列、存储、资源和故障。

UI 是逐步实现的产品层；首版可先做 CLI + 本地 API + 最小桌面壳，避免 UI 阻塞核心正确性。

---

# 14. 数据存储与部署建议

技术选型待 M0 验证，不在架构阶段强制指定语言或数据库。

建议单机首版：
- SQLite：结构化元数据、任务、消息、状态投影。
- Append-only Archive：原始事件和工具输出，JSONL + Zstandard 分段。
- Object/Artifact Store：大文件、日志、二进制产物。
- Secret Vault：系统密钥库或独立加密存储。
- Git：代码版本与 worktree。
- Local API/IPC：Studio 与 Host 通信。

注意：
- 数据库和档案放本地可靠磁盘，不放网络共享目录作为活动数据库。
- WAL、备份、恢复和并发写策略必须实测。
- 原始档案与元数据数据库分别备份。
- 定期校验哈希。
- 支持导出项目档案和迁移。
- 不把所有内容累积在内存；流式写入、分块处理、背压和检查点是硬要求。

---

# 15. Policy Enforcement Plane（策略强制执行层）

这是 AgentNexus 的核心基础设施，不是一个 Agent，不是提示词集合，也不是可选插件。它独立于 Resident、Coordinator、Development Agent、Harness 和 Workflow Engine。所有受控操作必须经过它。

最高原则：

> 提示词告诉模型应该怎么做；Policy Enforcement Plane 决定模型实际上能做什么。模型可以请求操作，但不能自行授予权限。

## 15.1 规则分级

| 级别 | 类型 | 执行方式 | 例子 |
|---|---|---|---|
| L0 | Hard Invariants | 程序/OS/数据库强制，不可被 Agent 覆盖 | 项目隔离、Key 不可读、Reviewer 只读、种子一次执行、原始档案不可覆盖 |
| L1 | Approval Gates | 需要受信任管理界面产生的范围化授权凭证 | Git Push、删除数据、安装软件、正式实验、预算增加、核心规则变更 |
| L2 | Quality Gates | 自动验证器、测试、独立审查和证据门禁 | 数学实现、测试、统计分析、版本绑定审查 |
| L3 | Guidelines | 提示词、工作流和代码规范指导 | 命名风格、注释风格、文档表达 |

L0/L1 不得依赖模型自觉。L2 对可机械验证部分强制执行；对语义判断必须标记证据与不确定性，不得声称绝对保证。L3 可由 Agent 在说明理由后提出例外。

## 15.2 Policy Enforcement 架构

```text
Agent / Native Harness / External Harness
                  |
                  v
             Tool Gateway
                  |
                  v
       Policy Enforcement Point (PEP)
                  |
                  v
        Policy Decision Point (PDP)
          |        |         |
       Policy   Approval   Identity &
       Registry  Service   Scope Resolver
                  |
          ALLOW / DENY / REQUIRE_APPROVAL
                  |
                  v
       Sandboxed Execution Controller
                  |
                  v
       Audit Event + Result Verification
```

- **Policy Registry**：规则版本、作用域、优先级和来源。
- **Policy Decision Point (PDP)**：纯策略判定，返回 ALLOW / DENY / REQUIRE_APPROVAL。
- **Policy Enforcement Point (PEP)**：位于工具调用与副作用执行之间，无法被 Agent 跳过。
- **Approval Service**：管理用户授权请求和授权凭证。
- **Identity & Scope Resolver**：验证真实 Agent、项目、任务和工作区身份。
- **Sandbox Controller**：落实 OS 账户、容器/沙箱、目录、网络和进程限制。
- **Audit Service**：记录请求、判定、策略版本、授权引用和实际执行结果。

## 15.3 强制执行流程

每个副作用请求必须经过：

1. 验证调用者身份（不能信任请求 payload 自报的 agent_id）。
2. 从 Host 的可信状态读取项目、任务、工作区和角色。
3. 规范化操作对象与参数，防止路径穿越、符号链接逃逸和参数混淆。
4. 加载适用的策略版本。
5. 检查资源范围、权限、预算、速率、状态机和授权。
6. 必要时请求人工批准。
7. 生成短时、单用途、绑定参数的执行许可。
8. 在受限执行器中执行。
9. 验证实际副作用与许可范围一致。
10. 追加审计事件和执行结果。

授权检查和操作之间必须避免 TOCTOU（检查后被替换）问题：对文件操作使用安全文件句柄/目录句柄或沙箱隔离；对 Git 操作绑定精确仓库、分支和对象 SHA；对数据库操作使用事务和条件更新。

## 15.4 策略冲突与优先级

建议优先级：
1. 平台不可覆盖的安全不变量。
2. 用户全局策略。
3. 项目策略。
4. 任务合同授权。
5. Agent 自身偏好。

更低层规则不得放宽更高层限制。用户通过可信管理界面可以修改其拥有权限的规则，但修改需要版本化、记录操作者、理由、时间和影响范围。Agent 不得自行编辑规则解除自身限制。

## 15.5 Approval Token（范围化授权凭证）

授权必须来自可信 UI 或受信任管理 API，不能由模型文本、项目文件或消息伪造。

凭证至少绑定：
- approval_id；
- 发起用户/授权主体；
- agent_id、project_id、task_id；
- action；
- 精确 resource / target；
- 允许的参数或参数哈希；
- 允许次数；
- 有效期；
- policy version；
- nonce / replay protection；
- 撤销状态。

例如，允许一次性推送指定 commit 到指定远程分支，不代表允许推送其他 commit 或主分支。操作参数改变后必须重新授权。凭证应短时、单用途、可撤销，执行后原子标记已消费。

## 15.6 Fail-Closed 与操作风险分级

- PDP、Approval Service、审计持久化或身份验证不可用时，所有有副作用操作默认拒绝。
- 纯只读、低风险操作可按明确的降级策略继续，但必须记录。
- 不确定操作是否已执行时先核对真实状态，不得盲目重试。
- 进程超时不代表旧进程退出；确认进程及工作区锁后才可启动新的写进程。
- 对不可重复操作使用原子 claim、幂等键、唯一约束和状态机。

## 15.7 沙箱与外部 Harness

- Agent 进程使用专用低权限 OS 身份。
- 项目目录按读/写范围挂载。
- 网络默认关闭或按域名/端口 allowlist。
- Shell 命令通过受控执行器，禁止以宿主机管理员身份运行。
- 外部 Harness 不得持有绕过 Gateway 的主机凭证。
- 若外部 Harness 必须直接调用工具，必须证明其进程权限和工具通道仍被 OS 沙箱约束。
- 不支持受控执行的 Harness 只能用于只读或低风险任务，不能获得高风险项目权限。
- Git Worktree 只是并行工作区，不等于安全沙箱。

## 15.8 数据层强制不变量

| 不变量 | 强制方式 |
|---|---|
| 原始档案不被覆盖 | append-only API、只追加文件权限、哈希链/签名清单 |
| 实验种子最多 claim 一次 | 原子事务、唯一键、不可重置状态 |
| 单工作区单写者 | 租约/锁、进程身份校验 |
| Reviewer 不写被审工作区 | OS 只读挂载、独立身份 |
| Key 不泄露 | Secret Vault、最小权限、输出脱敏、日志过滤 |
| 旧审查不能批准新代码 | 审查绑定 tree hash/commit SHA |
| 预算不可超支 | 原子额度预留与执行前检查 |
| 授权不能重放 | nonce、单次消费、过期和撤销状态 |

## 15.9 Policy Conformance Test Suite

每条 L0/L1 策略必须有：
- 正向测试（允许合法行为）。
- 反向测试（拒绝越权行为）。
- 绕过测试（Shell、外部 Harness、符号链接、路径穿越、并发竞争）。
- 崩溃/恢复测试。
- 策略版本升级兼容测试。

最低验收案例：
- Worker 写授权目录：允许。
- Worker 写项目外目录：拒绝。
- Reviewer 写被审工作区：OS 层拒绝。
- Agent 伪造用户批准：拒绝。
- 过期或参数不匹配的 Approval Token：拒绝。
- 通过 Shell 绕过文件工具：拒绝。
- 外部 Harness 直接访问宿主敏感目录：拒绝。
- 重启后重复 claim 一次性任务：拒绝。
- 修改原始历史档案：拒绝。
- 预算并发竞争导致超支：拒绝。
- Policy 服务不可用时执行高风险操作：拒绝。

## 15.10 语义性规则的边界

程序无法保证所有科学和数学判断正确。对无法机械证明的规则，系统必须：
- 要求证据、测试和可复现步骤。
- 使用独立审查与不同实现/算法交叉核验。
- 对缺失证据标记 INCONCLUSIVE / NOT_RUN。
- 不把模型信心或提示词承诺当作验证。
- 保留争议和反证，不自动抹平。

---

# 15. 安全、隐私和可靠性

- API Key 加密存储，最小权限读取；所有调用经 Model Gateway，Agent 不接触真实凭证。
- Policy Enforcement Plane 对所有有副作用操作实施默认拒绝、范围化授权和审计。
- 默认不记录秘密明文；在事件入口检测和脱敏。
- 项目之间默认隔离。
- Agent 进程使用受限账户和沙箱。
- 网络访问按项目/工具策略授权。
- 防止 Prompt Injection 将外部文档内容当作系统指令。
- 外部 MCP/插件按不可信代码处理。
- 工具执行记录完整可追溯。
- 任务和消息持久化后才确认。
- 不确定的外部副作用先核对，不盲目重试。
- 超时不代表旧进程已退出；必须确认进程状态后才能重启写任务。
- 恢复后不得重复执行不可重复的科研任务。
- 日志和档案有保留策略，但不得擅自删除用户要求保留的原始项目记录。

---

# 17. 性能与成本管理

- 常驻服务常开，但 LLM 按事件唤醒。
- 等待消息的 Agent 不占用模型并发槽位。
- 模型 profile 按任务难度配置，不把子 Agent 固定为廉价模型。
- 预算分为全局、项目、Agent、Task、Provider Account。
- Key 池调度必须识别共享账户限额。
- 限流、费用上限、并发和重试有硬门禁。
- 支持成本统计，但不能用换 Key 绕过账户预算。
- 长期档案主要是存储成本；只有历史检索与分析才消耗额外模型 Token。
- 监控 CPU、内存、GPU、磁盘、文件描述符、子进程数、队列长度和档案增长。

---

# 18. 实施路线

不要求每个阶段结束都等待用户再次批准；在明确授权范围内连续推进。每阶段完成真实验收后再进入下一阶段。

## M0 — 源码审计、需求冻结与技术选型

- 解包并审计 AI Workflow Kit v4.0。
- 核对 SHA256SUMS、版本、测试和验证报告。
- 对候选 Harness 固定版本进行源码研究。
- 做许可证与依赖审计。
- 比较 Agent Loop、上下文、工具、子 Agent、权限、恢复、UI。
- 明确 Native Harness 自研/复用边界。
- 形成架构决策记录（ADR）。
- 建立威胁模型和测试策略。

交付：源码研究矩阵、许可证清单、架构 ADR、模块接口草案、风险清单。

## M1 — 核心数据模型、Policy Enforcement Plane 与 Context Archive

- 先实现 Policy Registry、PDP/PEP、身份/作用域验证、Approval Service 最小闭环。
- 建立 Tool Gateway 的强制拦截，不允许 Harness 直接执行受控副作用。
- 建立最小权限 OS 沙箱和 Policy Conformance Test Suite。
- Project / Agent / Session / Turn / Task / Workspace 数据模型。
- 追加式事件档案。
- JSONL + Zstandard 分段写入和无损读取。
- Manifest、哈希、校验、备份和恢复。
- 消息总线与 Agent 收件箱。
- Decision Ledger / Project State 基础模型。
- Fake backend 和完整离线测试。

验收重点：进程崩溃恢复、重复事件去重、档案字节完整性、历史可检索、无静默丢失；同时证明未授权操作无法经文件工具、Shell 或外部执行路径绕过策略。

## M2 — Native Harness 单 Agent 能力

- Agent Loop。
- Model Adapter 接口。
- Tool Runtime。
- Context Assembly。
- Session / Turn。
- Checkpoint。
- Workspace / Git / Terminal。
- Permission / Sandbox。
- 测试与错误处理。

验收重点：一个 Agent 能在隔离仓库中完成真实编码任务，工具执行可追踪，重启后恢复，权限被强制执行。

## M3 — Model Gateway 与 Credential Pools

- Provider Registry。
- Model Registry / Profiles。
- Credential Vault。
- 多 Key 池。
- 账户/项目共享限额识别。
- 路由和错误分类。
- 用量和预算。
- 至少两个真实供应商联调；没有凭证时标记 NOT_RUN。

## M4 — Workflow Kit 整合

- 导入并映射 v4.0 角色、规则、G0-G6、模板和工具。
- 项目规则目录和工作流扩展。
- 规则优先级与不可覆盖策略。
- 证据、验证、严格审查和 Checkpoint。
- 保留原始套件版本和来源追踪。

## M5 — 多 Agent Runtime

- 五类系统 Agent。
- 双向通信和事件唤醒。
- 子 Agent 隔离和并行工作区。
- Coordinator。
- 独立 Reviewer。
- 自动修复闭环。
- 死锁、循环、并发、预算和恢复测试。

## M6 — Harness Adapter 与桌面 Studio

- 接入外部 Codex / Claude Code / ZCode / OpenCode 等可用接口。
- ACP / MCP 等协议适配（以实际能力为准）。
- 桌面项目工作台。
- Context Archive 检索 UI。
- Agent / Task / Review / Usage 监控。

## M7 — 长时间运行与真实项目试运行

- 长时间 soak test。
- 故障注入和断电/进程强杀恢复。
- 内存、磁盘、队列和资源背压。
- 多项目隔离。
- 先使用合成项目和无风险真实仓库。
- 通过权限审计后再考虑接入正式科研项目。

---

# 19. 全局验收标准

必须有真实测试证据，不能以设计文档或 Fake 测试冒充真实模型联调。

## Context Archive
- 原始事件按序完整保存。
- 压缩解压字节一致。
- 追加写崩溃恢复不丢失已确认事件。
- 哈希校验能发现篡改/损坏。
- 派生摘要删除后可重建。
- 历史检索返回精确来源引用。
- 归档中秘密不会以明文泄漏。

## Agent Runtime
- 子 Agent 能唤醒主 Agent，主 Agent 能回复并唤醒子 Agent。
- 等待状态不占模型调用槽位。
- 重复消息不重复派发任务。
- 进程崩溃后可恢复状态。
- 不产生双写工作区。
- 父子任务等待不会阻塞收件箱。
- 任务循环和递归派生受到限制。

## Native Harness
- 工具调用先过权限检查。
- 工具输入/输出完整记录。
- 任务中断后可恢复。
- 超时不造成旧进程和新进程同时写入。
- 不支持的模型能力明确报错，不伪装兼容。

## Model Gateway
- Key 不出现在日志、上下文和消息中。
- 同供应商多 Key 正确调度。
- 共享账户限额能识别。
- 限流和费用上限有效。
- 非幂等请求不会盲目重试。
- Native OAuth 与 API Key Pool 分离。

## Review
- 审查绑定候选版本哈希。
- 代码变化使旧 PASS 失效。
- Reviewer 默认只读。
- 未运行测试不能报告 PASS。
- INCONCLUSIVE / NOT_RUN 不得被当作通过。

## Workflow
- 原套件关键规则和工具有映射。
- G0-G6 语义有源文件依据和测试。
- 项目规则隔离。
- 正式实验权限不能被通用工作流绕过。

## 工程质量
- 流式写盘和背压。
- 不无限累积内存。
- 可恢复备份。
- 依赖与许可证清单。
- 单元、集成、故障注入和长时间测试。
- 所有未完成项明确标记。

---

# 20. 给 Codex 的执行边界

Codex 是 AgentNexus 的开发执行者，不因此自动获得用户所有项目的操作权限。

- 先读项目规则和本设计。
- M0 先做研究与选型，不要直接开始大规模编码。
- 不得默认 DeepSeek Harness 为底座。
- 不得把所有候选项目直接拼接。
- 不得为了追求“全自研”而无理由重写成熟模块。
- 每个复用模块记录来源、版本、许可证、修改和同步策略。
- 不要在源码审计完成前冻结技术栈。
- 不要将 API Key 写入仓库、日志、测试输出或上下文档案。
- 不要自动操作用户现有科研项目。
- 不要自动运行正式科研实验。
- 不要自动 commit/push 用户真实仓库，除非授权明确包含。
- 不要将 Fake 测试写成真实模型验证。
- 未运行、未验证、无法确认的内容标记 `NOT_RUN` / `INCONCLUSIVE`。
- 任务、消息和档案必须持久化；失败和恢复行为必须可测试。

---

# 21. 关键架构决策（初始提案）

| ADR | 决策提案 | 状态 |
|---|---|---|
| ADR-001 | AgentNexus 自有内部协议，不以单一 Harness 数据模型为中心 | PROPOSED |
| ADR-002 | 原始上下文追加式保存，无损压缩优先，语义摘要不替代原始记录 | PROPOSED |
| ADR-003 | Agent 身份与 Session/Turn/Process 分离 | PROPOSED |
| ADR-004 | 五类系统角色与 Workflow Kit 任务角色分层 | PROPOSED |
| ADR-005 | Model Registry 与 Credential Pool 分离 | PROPOSED |
| ADR-006 | Review 绑定精确候选版本，Reviewer 默认只读 | PROPOSED |
| ADR-007 | 单机多进程先行，分布式集群后置 | PROPOSED |
| ADR-008 | 开源模块按 REUSE/FORK/REIMPLEMENT/REFERENCE_ONLY 逐项决定 | PROPOSED |
| ADR-009 | 工作流与科研授权规则不可被通用开发流程覆盖 | PROPOSED |
| ADR-010 | 提示词不构成安全边界，关键规则必须程序强制 | PROPOSED |
| ADR-011 | 独立 Policy Enforcement Plane 拦截所有受控副作用 | PROPOSED |
| ADR-012 | 默认拒绝；策略服务不可用时高风险操作失败关闭 | PROPOSED |
| ADR-013 | 用户授权使用短时、单用途、绑定参数的凭证 | PROPOSED |
| ADR-014 | L0/L1 规则必须有正向、反向、绕过和恢复测试 | PROPOSED |

---

## 最终定位

**AgentNexus 是一个以项目为中心、以原生 Harness 为执行核心、以多 Agent Runtime 为协作中枢、以 Workflow Kit 为研发方法论、以完整上下文档案为长期连续性基础、以统一 Model Gateway 为模型基础设施的自主项目研发环境。**

目标不是让 Agent 永远保持同一个聊天窗口，而是让项目的身份、目标、决策、证据和完整经历能够跨越会话、模型、进程和时间持续存在。


# v0.4 架构修订：原生工作流、模块开关与受控降级

本节是 v0.4 对前文的正式修订。若前文与本节冲突，以本节为准。

## A. AI Workflow Kit v4.0 必须彻底融入 Native Harness

AI Workflow Kit 不应作为用户另外安装的外挂包，也不应要求 Agent 每次自行读取一套外部文件。它的规则、角色、G0-G6、模板、治理工具、检查清单和验证能力必须整合为 AgentNexus Native Harness 内部的 Workflow Runtime。

“彻底融入”意味着：
- 有统一的内部数据模型、API、配置管理和桌面 UI。
- 工作流可由 Agent Loop / Task Engine 原生调用。
- 规则和任务合同可被工具执行层读取，不只存在于提示词。
- 工作流工具有统一的版本、日志、测试和权限。
- 原始 AI Workflow Kit v4.0 作为只读来源归档；集成实现单独版本化，并保留来源映射、校验信息和许可证。
- 不要求运行时依赖原始 ZIP，也不把工作流能力散落成无管理的提示词文件。

必须逐项映射原套件内容：
- 通用角色：Scout、Worker、Verifier、Reviewer。
- 通用入口规则和项目规则。
- G0-G6 工作流与 Gate。
- Rules、Capabilities、Context、Decisions、Evidence、Governance、Routing、Safety、Strict Review、Verification。
- Measurement、Protocol、Regression 等检查清单。
- GOAL、Task Contract、Subtask、Checkpoint、Decision Log、Experiment Plan、Strict Review Record、Closeout、Token Ledger 等模板。
- govern、check-task、check-review、manage、check-kit、release 等工具和对应测试/验证材料。
- 项目工作流扩展目录和项目自定义规则入口。

Workflow Kit 的四个通用角色是任务角色，不是五类系统级 Agent 的替代品。任务角色可由系统 Agent 按任务调用。

## B. 所有可选功能都必须支持手动开关

AgentNexus 采用模块化功能注册中心（Feature Registry / Module Manager）。除必要的核心运行底座外，功能应能由用户手动启用、关闭和恢复。

### B1. 开关状态

每个功能支持：
- `ON`：启用。
- `OFF`：关闭。
- `INHERIT`：继承上层设置。

作用域：
- 全局。
- 项目。
- Agent。
- 单个 Task（仅允许对该作用域开放的功能）。

优先级：
`平台不可变运行不变量 > 用户全局设置 > 项目设置 > Agent 设置 > Task 设置`。

高层设置为 OFF 时，低层不能自行重新开启。Agent 不得更改控制自身权限的开关。

### B2. 每个模块必须登记的元数据

- Feature ID、名称、版本和说明。
- 默认状态。
- 可配置作用域。
- 依赖与冲突。
- 配置 Schema。
- 开启/关闭前置条件。
- 关闭后的降级行为。
- 是否涉及安全风险。
- 是否需要管理员确认。
- 健康状态、最后错误和最近切换记录。

启用模块时检查依赖；关闭模块时展示受影响模块和在途任务。不能出现依赖已关闭但上层仍显示正常的半启用状态。

### B3. 建议提供的功能开关

| 模块/功能 | 手动开关 | 关闭后的行为 |
|---|---|---|
| Workflow Rules | 是 | 不加载对应规则；保留基础平台不变量 |
| Scout / Worker / Verifier / Reviewer | 各自独立 | 不再派发该角色，可手动执行其他角色 |
| G0-G6 每个 Gate | 各自独立 | 跳过该 Gate，显示明确的 BYPASSED，不伪装 PASS |
| Task Contracts | 是 | 使用最小手动任务定义；任务范围仍需可追踪 |
| Checkpoints | 是 | 不自动生成工作检查点；核心状态日志仍保留 |
| Decision Ledger UI/自动整理 | 是 | 停止自动整理；已有决策记录不删除 |
| Evidence Manager | 是 | 停止自动证据归档；原始日志仍可保存 |
| Strict Review | 是 | 不自动执行严格审查；允许手动审查 |
| Measurement / Protocol / Regression Checklists | 各自独立 | 对应检查不自动运行，状态标为 NOT_RUN / BYPASSED |
| 自动任务规划 | 是 | 由用户或主 Agent 手动创建任务 |
| 自动子 Agent 派生 | 是 | 只允许手动创建/派发子 Agent |
| 自动后台审查 | 是 | 不自动触发，仍可手动发起 |
| Coordinator 自动优化 | 是 | 使用静态配额和手动调度 |
| Context Retrieval Agent | 是 | 允许用户/主 Agent 直接调用 Archive API 检索 |
| 自动摘要/向量索引/知识提取 | 分别独立 | 不生成派生数据；原始档案不受影响 |
| 自动模型路由 | 是 | 用户手动指定模型 Profile |
| API Key 池轮询 | 是 | 固定使用选定凭证，不绕过供应商限额 |
| 跨供应商故障切换 | 是 | 失败后停止并报告，不自动换供应商 |
| 自动修复循环 | 是 | 报告问题，等待手动处理 |
| 自动 Git 快照/合并/提交/推送 | 各自独立 | 不执行对应自动操作 |
| MCP / ACP / LSP / Browser Adapter | 各自独立 | 对应适配器关闭，其他工具照常工作 |
| Usage Dashboard / 通知 / 报表 | 各自独立 | 停止对应展示/通知，不删除底层账目 |
| Policy Enforcement | 支持模式切换 | 见本节 C |
| OS Sandbox | 独立开关 | 关闭前二次确认并显示风险；不得与 Policy 开关混为一谈 |

关闭功能不得删除它已经产生的历史记录、配置、源代码或证据。重新开启后可以恢复使用。

## C. Policy Enforcement 也必须可手动关闭，但必须有明确降级模式

用户明确要求：强制执行机制本身也不能成为无法恢复的单点。因此 Policy Enforcement 提供三种管理员可选模式：

| 模式 | 含义 | 推荐用途 |
|---|---|---|
| `ENFORCE` | 正常执行已启用策略；默认模式 | 日常研发 |
| `AUDIT_ONLY` | 评估并记录策略结果，但对选定的可降级策略不阻断 | 排查误拦截、兼容性问题 |
| `DISABLED` | 关闭应用层 Policy Enforcement 检查，进入明确的策略旁路状态 | 隔离环境的紧急恢复或故障排查 |

### C1. 如何手动关闭

- 只能由可信本机管理 UI 或受信任的管理员 API 执行。
- 需要二次确认、填写原因、选择全局/项目/策略组作用域。
- 默认必须设置自动过期时间；例如 AUDIT_ONLY 最长 2 小时、DISABLED 最长 30 分钟，可由管理员重新确认延长。
- 明确显示醒目的 `POLICY BYPASS ACTIVE` 状态。
- 写入独立、追加式管理审计记录。
- Agent、Harness、MCP、项目文件和提示词不能切换模式。
- 不能因为策略服务崩溃、超时或配置错误自动进入 AUDIT_ONLY/DISABLED。

### C2. 降级边界

关闭 Policy Enforcement 不应隐式关闭其他模块。以下控制必须独立显示和单独配置：
- OS 沙箱。
- 项目目录隔离。
- Credential Vault 加密。
- API Key 不进入模型上下文。
- 原始档案的追加写与完整性校验。
- 数据库事务一致性。
- 管理员模式切换审计。

也就是说，管理员可以关闭应用层策略检查，但不能因为点了一个“关闭策略”按钮，就意外把密钥加密、档案保护、工作区隔离全部关闭。

如果确实需要关闭 OS 沙箱或其他底层保护，必须单独操作、二次确认、显示风险，并建议只用于本地隔离测试项目。平台不应把关闭安全保护包装成普通的“兼容模式”。

### C3. 切换与恢复流程

- 切换前暂停新的受控副作用。
- 在途操作安全完成或取消，记录状态。
- 写入模式切换事件和原因。
- 执行降级模式。
- 修复后先运行 Policy Conformance Tests。
- 检查旁路期间产生的操作和配置变化。
- 管理员确认后恢复 ENFORCE。

Policy 服务自身不可用时，系统暂停受控操作并通知管理员；不得自行放开全部权限。用户可以通过独立的本机恢复通道手动选择 AUDIT_ONLY 或 DISABLED。

## D. 可关闭不等于无冗余：必须设计备用路径

每个可选模块都要有 Degradation Contract（降级合同），并尽可能提供手动替代路径：

- 自动路由关闭：手动选择模型和供应商。
- API 池轮询关闭：手动选定一个 Key。
- 自动审查关闭：手动启动 Reviewer。
- Context Retrieval Agent 关闭：通过 Archive API、CLI 或 UI 直接检索原始档案。
- 自动摘要关闭：直接按时间、任务、Agent 和 Event ID 浏览档案。
- Coordinator 关闭：使用静态资源配额和手动排程。
- 自动任务规划关闭：用户手动建立任务合同。
- 自动修复关闭：开发主 Agent 或用户手动处理。
- Workflow Gate 关闭：明确标记 `BYPASSED`，不得伪装成 `PASS`。
- 某个外部 Harness 适配器关闭：切换原生 Harness 或其他已验证适配器。
- Policy Enforcement 降级：通过受信任管理 UI 手动进入受控旁路模式。

备用路径必须实际测试，不能只写在文档中。

## E. 模块健康、故障隔离和恢复

模块状态至少包括：
`ENABLED`、`DISABLED`、`DEGRADED`、`FAILED`、`RECOVERING`。

- 模块故障不自动改变用户开关状态。
- 不能自动启用未授权的替代模块。
- 可选模块失败时隔离故障，其他独立模块继续运行。
- 核心模块失败时暂停依赖操作并保留恢复数据。
- UI 显示故障原因、受影响功能、推荐人工操作和恢复步骤。
- 支持手动重启、禁用、版本回滚、恢复默认配置。
- 所有配置变更可追溯并可回滚。

## F. Feature Toggle Conformance Tests

必须验证：
- ON/OFF/INHERIT 的作用域和优先级。
- 关闭功能后无残留后台进程、隐式调用或资源占用。
- 关闭模块不会删除原始档案和已有产物。
- 依赖关闭时正确阻止启用或显示影响。
- 关闭 Gate 显示 BYPASSED，不显示 PASS。
- Policy 模式只能由管理员切换。
- Policy 服务故障不会自动进入旁路。
- DISABLED 模式有明确状态和独立审计。
- 到期后恢复预设模式。
- 恢复 ENFORCE 前执行预检。
- 手动替代路径真实可用。

## G. v0.4 实施路线修订

M0：源码审计、工作流套件完整盘点、功能模块目录和安全威胁模型。  
M1：Feature Registry/Module Manager、Policy 三模式、Context Archive、基础状态与消息持久化。  
M2：Native Harness、Tool Gateway、模块接口、沙箱与工具执行。  
M3：Model Gateway、Credential Pools、路由开关和手动备用路径。  
M4：AI Workflow Kit v4.0 原生内建，逐项功能开关和兼容测试。  
M5：五类 Agent、自动调度/审查/协调开关、手动备用流程。  
M6：外部 Harness Adapter 和桌面 Studio。  
M7：故障注入、长时间运行、降级与恢复演练。

## H. v0.4 新增架构决策

| ADR | 决策 | 状态 |
|---|---|---|
| ADR-015 | AI Workflow Kit v4.0 原生内建于 Native Harness Workflow Runtime | PROPOSED |
| ADR-016 | 可选功能统一由 Feature Registry 管理，支持 ON/OFF/INHERIT | PROPOSED |
| ADR-017 | 每个模块必须定义依赖、降级合同和恢复路径 | PROPOSED |
| ADR-018 | Policy Enforcement 支持 ENFORCE/AUDIT_ONLY/DISABLED 管理员模式 | PROPOSED |
| ADR-019 | Policy 旁路只能人工触发，不得由故障自动触发 | PROPOSED |
| ADR-020 | 关闭策略执行与关闭 OS 沙箱/密钥保护/数据完整性是独立设置 | PROPOSED |
| ADR-021 | 功能开关与降级路径必须有自动化一致性测试 | PROPOSED |

## v0.4 总原则

> AgentNexus 的功能应当模块化、可组合、可观察、可手动启停、可降级、可恢复。AI Workflow Kit 深度内建于 Harness，但所有工作流能力保留用户控制权。Policy Enforcement 正常模式下负责强制执行，同时允许管理员在明确知情、限时、限域、可审计的情况下手动降级或旁路。系统绝不因故障而自动放弃保护，也不允许 Agent 自行关闭限制。
