# M1.6.1 Project Rules Compiler

已实现 `source/src/agentnexus/harness/rules.ts`，复用原 `NativeState / KernelStore / ArtifactStore / Audit outbox`。实际模块验证见 `evidence/rules-gates/runs/iteration-04/`：Rules 11 项与 Gates 22 项，共 **33/33 PASS**；全树 strict TypeScript PASS。这里的 PASS 是可信本地库和真实 SQLite/Zstd/Artifact 合同，不是 OS 隔离或真实 Provider 资格。

## 规则输入与边界

`RulesCompiler.compile(admin, actor, {version, workflow_version, sources})` 只允许可信 bootstrap 管理能力调用。`RuleSourceInput` 为：

```ts
{ id: string; format: 'TEXT'|'RULE_DSL'; payload_ref: ArtifactRef;
  context_source?: ContextSource;
  classification?: 'HUMAN_READABLE'|'MODEL_GUIDANCE'|'MANUAL_REVIEW' }
```

普通 AGENTS.md、项目索引、合同和配置文本以 TEXT 捕获并保留原始 Artifact 字节；不会从自然语言推断可执行策略。TEXT 默认 HUMAN_READABLE，可显式标记 MODEL_GUIDANCE 或 MANUAL_REVIEW；其 constraint/enforcement 始终为空。自然语言源不是规则变更授权，也不能自行取得管理员能力。

机器规则必须显式使用 `agentnexus/project-rules/1` JSON DSL。每条规则包含 id、classification、description、scope、depends_on、feature_dependencies、gates、constraint、enforcement；未知字段、未知类型、未知 Feature/Policy、重复 ID、重复依赖、依赖循环和不成立的依赖 scope 都拒绝。

| 分类 | 实际执行语义 |
|---|---|
| HUMAN_READABLE | 保留给人阅读；不自动执行正文 |
| MODEL_GUIDANCE | 明示模型指导；不充当 Policy Enforcement |
| MACHINE_CHECKABLE | 只接受有限 DSL predicate，由 Gate Engine 检查 |
| POLICY_ENFORCED | 绑定独立可信 owner；不能通过应用 Policy mode 关闭 |
| MANUAL_REVIEW | 显式绑定到 Gate 的 DSL 规则要求可信人工审查记录；普通文本本身不推断 Gate |

目前有限 predicate 为 `REQUIRE_ARTIFACT`、`MAX_EVIDENCE_BYTES`、`REQUIRE_CHECKER`、`REQUIRE_HUMAN_REVIEW`、`FROZEN_RULE_BINDING` 和 `GATE_FAIL_CLOSED`。前四者由 Native Gate Engine 执行；后两者只允许 POLICY_ENFORCED，分别绑定 Project Rules Compiler / Native Gate Engine。没有自然语言求值器、任意脚本、eval 或运行时插件加载。

Policy 复用既有 L0、nondegradable 的 `P.WORKFLOW_BINDING`，具体子 owner 在新 Policy Catalog 的 `m161_enforcement_bindings` 登记。没有改变原 52 项 Policy ID/level/owner 白名单或旧 security 测试合同。Feature 为 `native.rules-compiler`，依赖 wf.runtime、wf.rules.registration、core.archive.raw、core.artifact.store。

## Registry、版本与 Task

每个不可变 Registry 保存规则版本、workflow version、编译时 Feature/Policy epoch、源 Artifact/可选 ContextSource、源 hash、分类、依赖、scope、有限约束、enforcement/gate bindings，以及实际编译包 Artifact。`rule_hash` 是规范化完整编译 body 的 SHA256。读取 Registry 重新校验该 hash；源流完整读取到 EOF 后才认定其内容有效。ContextSource 若提供，必须与真实 Context 行的 event/hash/project/task、完整字节范围及 Artifact 一致。

版本和 workflow version 使用下游 Context 能识别的同一 identifier 语法，最多 64 UTF-8 字节；空格、斜杠和过长版本在编译入口拒绝，避免发布一个 Task 无法装配的 Registry。同 project/version 不允许替换内容。

`captureBinding(actor)` 返回精确冻结值：

```ts
{ registry_id, project_rules_version, rule_hash,
  feature_epoch, policy_epoch, workflow_version }
```

`assertBinding(actor, binding)` 校验项目、版本、hash、workflow 和 epoch 来源，允许正在运行的 Task 持续使用其旧 Registry；不会要求它等于项目 current 指针。冻结 epoch 是来源事实，不能代替 Tool Gateway 在真正调用时检查当前 Feature/Policy fence。

共享 Scheduler 已实际接入：createProject 默认把已捕获规则编译为版本 1 的 HUMAN_READABLE Registry；新 Task 捕获当前 binding；每个 turn 从 Registry 的原 ContextSource 装配必需规则。新 Registry 不替换旧 Task。管理包装器为 artifact-only 编译源新增 project-rules 原始 Context；Task 创建前检查所有源可用于冻结 Context，而非直到执行才失败。

迁移必须调用可信 `migrate`，绑定 from/to、Task、理由和完整验证的 authorization Artifact，追加审计及独立迁移记录。Compiler 本身不会修改 Task；共享 `migrateTaskRules` 才在显式操作中更新其 binding、清除旧 Gate record 绑定，并拒绝无 Gate 合同的升级。handoff 显式继承旧 binding，不悄悄取新规则。

## 有界资源与验证

最多 16 个源、每源 64 KiB、源合计 256 KiB、32 条规则、每规则最多 16 个规则/Feature 依赖、7 个 Gate。编译 body 43,008 字节上限；NativeState 投影继续受原 48 KiB 限制。每项目最多 64 个版本，全库 512 Registry、1,024 迁移；达到上限明确拒绝，不无限累积内存。源读取沿用 64 KiB Artifact 分块；只为受限 DSL/Text 源组装有限缓冲区。

Rules 的 11 项实际用例覆盖：原文保留、五类分类、显式绑定、未知规则/字段/Feature/Policy、重复/循环/错 scope、自然语言冒充执行策略、版本冻结、可信迁移、数量/字节上限、编译中关闭 Feature、真实 SQLite close/reopen，以及版本格式负例。Gate 测试另验证 DSL predicate 真正阻止通过和 Scheduler 的 fail-closed 绑定。

全部读取的实际 path 与 capture 时 SHA256 在 `evidence/rules-gates/read-manifest.json`（62 文件）；完整读取和定向读取范围分别注明。原始迭代失败未覆盖：iteration-01 的 OFF 测试夹具遗漏依赖关闭（24/25 PASS），iteration-03 的 Scheduler 缺 Gate 诊断未持久化（32/33 PASS）均保留。前者修夹具，后者由共享 Scheduler 增加 TASK_GATE_BLOCKED 审计/reason 后复验。没有修改任何 M0—M1.6 文件或原测试。

本实现是有限、可审计的项目规则 DSL，不声称所有项目自然语言、任意文件分类、所有模板或任意外部 linter 已经机器可执行。旧规则和其原始 Archive 持续保留；没有自动垃圾清理或无授权规则重写。
