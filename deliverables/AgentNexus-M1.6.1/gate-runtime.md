# M1.6.1 Native Gate Runtime

已实现 `source/src/agentnexus/harness/gates.ts` 的可信 `NativeGateEngine`，共享 Scheduler 已用其实际阻止缺证据/关闭/过期/错误候选的 Task 派发。**新增 Rules/Gates 33/33 PASS，全树 strict TypeScript PASS**；原始 TAP、stderr、逐项机器结果和源码 SHA256 在 `evidence/rules-gates/`。

## G0—G6 新合同

本轮编号按用户 M1.6.1 合同；旧 WorkflowRuntime.gate 保留原 M1.6 ledger API/测试语义，不能作为 native 自动 Gate 的通过证明。

| Gate | 程序输入与自动检查 | 缺少条件与失败条件 |
|---|---|---|
| G0 任务准入 | 真实已注册 Task、同 project/agent 的冻结规则、ACTIVE Project 和可准入 Task 状态 | 缺/错 Task 或 binding、暂停项目或终态 Task → BLOCKED |
| G1 规则和输入完整性 | Registry/hash、全部源/编译包、candidate/baseline/profile/evidence 的实际完整 Artifact 流 | 不完整/错 hash → FAIL 或原存储 owner 冻结；不发通过许可 |
| G2 设计与实施计划 | 实际 design-plan Artifact、schema、同 Task/candidate、非空有界 steps/acceptance | 没有计划 → NOT_RUN；结构/版本不符 → FAIL |
| G3 代码和测试 | profile/DSL 必需的可信 checker 实际执行，至少一项 TEST checker | 缺 checker/未执行 → NOT_RUN；实际结果保留 FAIL/BLOCKED/INCONCLUSIVE/SIMULATED |
| G4 独立审查 | 实际 BACKGROUND_REVIEWER、不同作者/Runtime/Task、同 frozen rules/candidate/author 的审查 Task，执行 INDEPENDENT_REVIEW checker | 缺实际 checker → NOT_RUN；同作者/错身份/错绑定 → BLOCKED |
| G5 交付证据 | 实际 delivery-manifest、同 Task/candidate/baseline/profile、真实非空产物清单、剩余问题 | 缺清单 → NOT_RUN；hash/结构/产物错配 → FAIL |
| G6 最终验收 | 同 Task/candidate/baseline/profile/rules 的 G0—G5 六个 native record 均实际 PASS，且当前 Feature/Policy epoch 有效 | 缺前门 → NOT_RUN；BYPASSED/旧候选/旧 epoch/关闭 → BLOCKED；模拟前门保留 SIMULATED |

各门共同绑定 Gate ID、完整 RuleTaskBinding、实际 candidate/baseline/profile Artifact hash、主体、输入、checker 执行事实、观察时间、engine version 和审计。DSL 与 profile 可要求额外 Artifact、字节上限、checker 或人工审查；模型不能选择省略必需 checker。

PASS 只在所有实查条件通过时由 engine 计算。FAIL、NOT_RUN、BLOCKED、INCONCLUSIVE、SIMULATED 和 BYPASSED 独立保留；不会把未执行或模拟结果折叠成 PASS。若 Artifact 损坏触发原 Store 失败关闭，engine 无权绕过该 owner 继续写假成功；已持久 intent 保持不可授权状态，需显式存储恢复。重启恢复把未完成 Gate intent 标记 INCONCLUSIVE，不自动再跑 checker。

## 可信 checker 与人工审查

`registerChecker(admin, definition)` 仅可信 bootstrap 可调用。注册记录包含 id/version、种类、允许 Gate、assurance、可选 reviewer ID；engine 对真实 callback 的函数源码计算 SHA256 并存实际源码 Artifact。每次执行生成 execution ID、起止时间、实际返回状态/理由/证据，且验证输出 Artifact。调用者不能提供 `status`、checker 执行记录或 provenance 字段；PASS 形状的模型 JSON 只是普通证据。

checker 只获得冻结身份/绑定、允许的 ArtifactRef 与范围限定的只读 Artifact 流；G4 的 actor 是实际独立 reviewer，task_actor 为被审 Task。没有 Agent 可注册 callback 的入口。它是可信本地代码机制，不是任意恶意同进程 JS 的 OS 隔离。函数源码 fingerprint 也不声称已经复原闭包、解释器或所有外部工具环境；具体 checker 必须诚实声明自己的验证范围。

G3 验证包含一次真实 Node 24.15.0 `--test` 执行：只接受本测试自创的精确 fixture SHA、固定解释器、shell:false、隐藏窗口、5 秒 timeout 和 16 KiB 输出上限；实际 exit/stdout/stderr、candidate/profile hash 写入 Artifact 后进入 Gate 结果。其他局部 checker 测试做真实有界内容检查，不冒充完整产品或科研验收。产品默认不会因 profile 写了 checker 名称就执行未注册程序。

人工条件必须引用 `recordHumanReview(admin, actor, input)` 创建的持久记录，绑定 human ID、明确 APPROVE/REJECT、理由、authorization Artifact 和全部版本。模型文本、伪造 review ID、其他候选的批准、模拟人工记录均不能成为真实 PASS。单元测试的人类身份/授权正文是明确的合成夹具，测试验证可信 API 及绑定，不声称本轮实际用户已完成全部实质人工验收。

## 实际 Task Enforcement

Task 在创建时冻结至多七个 gate_requirements，含 Gate ID、candidate/baseline/profile hash 和空 record ID。缺记录时 Scheduler 保持 QUEUED，持久 TASK_GATE_BLOCKED 理由，模型/工具/资源派发为零。只有管理 `bindTaskGate` 可在未运行 Task 上绑定可信 native record；它调用 `assertPass`，校验 Gate ID、Task/agent/project、hash、完整冻结 binding、当前 epoch/开关。旧 legacy ledger 的 PASS 无法绑定。

`requiredGates(actor,binding)` 返回所有适用 POLICY_ENFORCED / GATE_FAIL_CLOSED 的 Gate 集合。Scheduler 检查 Task 合同覆盖它们；省略 gate_requirements 不会自动放开受保护执行。真正 turn、model/tool 前继续检查，不采 Agent 自报完成。规则迁移清除旧 record 绑定；交接继承原规则并清空目标 Task 的通过记录，避免同项目其他 Task 借用批准。

`assertPass` 既接受完整 NativeGateInput，也接受精简 `NativeGateBinding`：

```ts
{ gate_id, binding: RuleTaskBinding,
  candidate_hash, baseline_hash, test_profile_hash }
```

Gate PASS 是质量门约束，不签发 Tool Permit、文件写授权、资源释放或 OS 资格；真正副作用仍走原 Gateway/Policy/Storage/Resource owner。

## Feature 关闭、资源和证据

`native.gate-engine` 依赖 wf.runtime、wf.evidence、core.audit.trail、core.artifact.store、native.rules-compiler；L0 enforcement 复用 P.WORKFLOW_BINDING 的 Native Gate Engine binding。关闭单门或 engine 明确记 BYPASSED，`allows_protected=false`。验证期间关闭允许已有只读流完成，但每个 checker 真正调用前和最终提交事务内均复查，OFF 后不新启动 checker，也不发布旧 PASS。其他 Feature/Policy epoch 在运行中变化则 INCONCLUSIVE；OFF→ON 不复活旧通过许可。

最多 16 份证据、证据总 8 MiB、单对象 4 MiB、JSON 64 KiB、32 个可信 checker、单 Gate 16 次检查、4 个并行 Gate、2,048 条 Gate 投影和 512 人工审查记录。流校验沿用 64 KiB Artifact 分块；大对象不整体装入内存。可信 callback 必须遵守其注册合同；未返回 callback 保留 Gate 的并发槽，不通过超时释放后反复累积未知后台执行。

最终 iteration-04 为 33/33 PASS（11 Rules、22 Gates），strict noEmit/NodeNext 全 src/tests/tools PASS，无 skip 豁免。覆盖未知/重复规则、版本变化、缺证据、伪造 PASS、独立审查、可信人工记录、所有非 PASS 状态、关闭竞态、旧 epoch、候选变化、损坏存储失败关闭、数量/并发上限、真实测试进程及实际 Harness→Scheduler 门禁。原始失败迭代保留，逐项 JSON 由原 TAP 机械生成；旧 M0—M1.6 源码、原测试、CPU/TOCTOU 历史 FAIL 均未改。

真实 Provider、完整 Windows 生产身份/OS 隔离、严格累计 CPU、长期独立审查服务和完整科研验收不因本模块通过而获得资格。这里没有联网、读 Key、修改账户/ACL、安装 hooks、Commit 或 Push。
