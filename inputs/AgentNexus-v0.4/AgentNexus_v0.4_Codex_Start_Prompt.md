# AgentNexus v0.4 — Codex 启动提示词

你现在负责 AgentNexus 项目的 M0 阶段：源码研究、架构审计、工作流套件盘点、模块开关设计和策略强制执行设计。

## 一、先完整读取以下文件

1. `AgentNexus_v0.4_Architecture.md`
2. `AgentNexus_v0.4_Codex_Task.md`
3. `reference/ai-workflow-kit-v4.0.0.zip`

先解压并检查工作流套件，不要只阅读 README。核对其中的 SHA256 清单、版本、规则、角色、G0-G6、模板、工具、测试和验证报告。

如果当前仓库还有 `AGENTS.md`、`CLAUDE.md`、`README`、开发规范或其他适用规则，必须先读取。适用的仓库规则优先于本提示词；若与本设计冲突，记录冲突并请求澄清，不要擅自覆盖。

## 二、当前任务范围：只执行 M0

本轮先不要大规模开发产品，也不要直接开始搭建完整 Harness。

1. 深入研究主流开源 Harness 的源码和公开接口，至少评估 DeepSeek Harness、Cline、OpenHands / Software Agent SDK、OpenCode、Goose、Agensh、Deep Agents，以及 Codex、Claude Code、ZCode 可公开使用的接口。
2. 固定每个候选项目的仓库地址、版本或 commit，核查当前维护状态、许可证和依赖许可证。
3. 对 Agent Loop、Context、Tool Runtime、Workspace、Subagents、Session、Checkpoint、Permission、Sandbox、MCP/ACP、UI、Workflow 等模块逐项研究。
4. 对每个模块分别提出 `REUSE`、`FORK_MODIFY`、`REIMPLEMENT` 或 `REFERENCE_ONLY` 决策。不得预先指定任何一个 Harness 为最终底座，也不得简单拼装多个重复 Agent Loop。
5. 完整盘点 AI Workflow Kit v4.0，建立源文件到 AgentNexus 原生 Workflow Runtime 的映射。工作流套件必须深度融入 Harness，但其功能必须可以手动启停。
6. 建立 `Feature Registry` 初稿：每个功能的 Feature ID、默认状态、作用域、依赖、冲突、风险、关闭后的降级行为和恢复方式。
7. 建立 `Policy Enforcement Plane` 初稿：明确提示词不是安全边界；分析哪些规则由程序、数据库、操作系统沙箱强制执行，哪些属于语义质量门禁，哪些只是软性指导。
8. 设计 `ENFORCE`、`AUDIT_ONLY`、`DISABLED` 三种管理员模式。模式只能由可信管理员手动切换；不能由 Agent 修改，也不能因服务故障自动降级。必须设计限时、限域、二次确认、审计、自动过期和恢复预检。
9. 检查关闭 Policy Enforcement 与关闭 OS 沙箱、凭证加密、原始档案完整性、数据库事务保护之间的边界，不能让一个开关意外关闭全部底层保护。
10. 评估 Context Archive：原始上下文追加式保存、无损压缩、分段 manifest、哈希校验、按需检索 Agent；摘要和索引必须是可重建派生数据，不能替代原始记录。
11. 提出单机优先的技术栈和模块接口建议，但在源码审计前不要冻结技术栈。

## 三、必须交付的 M0 文件

在项目仓库内创建：

- `research/harvest_matrix.md`
- `research/license_inventory.md`
- `research/security_review.md`
- `architecture/adr/`（关键模块决策记录）
- `architecture/feature_catalog.md`
- `architecture/policy_catalog.md`
- `architecture/workflow_kit_mapping.md`
- `architecture/internal_protocols.md`
- `architecture/implementation_plan.md`
- `reports/M0_report.md`

所有关键结论必须有源码路径、版本/commit、许可证或测试证据支持。不要把 README 描述当成源码核验结果。区分已验证事实、推断和待确认事项。

## 四、严格边界

- 不要在 M0 阶段进行大规模产品编码。
- 不要修改或运行用户现有科研项目。
- 不要运行正式科研实验。
- 不要自动 commit 或 push 真实仓库。
- 不要安装 Git hooks。
- 不要索取、读取或写入用户未授权的 API Key。
- 不要把 Fake 测试结果描述成真实模型联调。
- 未运行的测试标记 `NOT_RUN`；证据不足标记 `INCONCLUSIVE`。
- 对开源代码复用必须记录来源、固定版本、许可证、修改范围和上游同步策略。
- 不能证明执行边界受控的外部 Harness，不得建议授予高风险权限。

## 五、工作方式

先检查当前仓库、文件和环境，再执行 M0。可以并行开展互不冲突的源码研究任务，但要避免重复工作，并由主执行者统一证据和结论。

不要只提交一份计划就停止。完成资料核查和可验证的源码研究，形成实际交付文件。

首轮先简要报告：
1. 已读取的规则和资料；
2. 工作流套件校验结果；
3. 候选 Harness 与源码审计范围；
4. 初步威胁模型；
5. 需要用户授权的操作。

随后继续执行 M0。只有遇到确实需要用户决定的事项才暂停并询问。
