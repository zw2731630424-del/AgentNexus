# M1.6 Context Assembly、Message Bus 与 Mock Model Gateway

本交付完成三个可运行组件，直接复用同一 `KernelStore`、`ArtifactStore`、`NativeState` 和可信 `Subject`。没有另建数据库、Feature Registry、Audit 或身份体系。源码为 `source/src/agentnexus/harness/{context,messages,models}.ts`；对应三个 `m16-*.test.ts`。共享 schema/catalog、Runtime、Scheduler 和资源预算的集成由主执行者维护。

## 读取与继承边界

本组件执行者实际读取的规则、M1.5.1 报告、内核文件、测试、历史 ADR 和 M0/M0.1 合同逐项记录在 `evidence/components/read-manifest.json`，包含清单生成时 SHA256；47 个历史输入保持未修改。这里只声明该清单内的读取，不代替主执行者汇总的全部 Phase 0 冻结记录。既有 Harness 研究和 105 文件 Workflow Kit 映射沿用，没有重新开展上游研究，也没有复制其代码或模板。

继承的关键约束：原始 Archive 按域追加、哈希校验；Artifact 发布后不可变；完整迭代结束才通过最终对象哈希屏障；SQLite 与导出段经 durable outbox/flush 协调；Agent 门面不持有管理句柄或原始 Store。M1.5.1 的 CPU 资格 FAIL、生产执行 BLOCKED 与历史失败未修改。

## Context Assembly

`capture(subject, kind, bytesOrStream, options)` 只新增原始 Context 记录。`RAW / SUMMARY / RETRIEVAL / DERIVED_INDEX` 显式区分；后三类必须引用已有来源，原字节不被摘要替换。来源引用含 event ID、record hash、project/task、ArtifactRef、UTF-8 字节 offset/length；派生关系记录在追加审计中。

`source / validate / readRange` 校验真实记录、项目、任务读取授权、引用哈希和区间。默认只读同项目同任务；跨任务必须由可信 `readTask` 显式许可，跨项目拒绝。区间读取只保留请求范围，仍流式扫描完整对象并验证原文/压缩哈希后才返回，不能把提前中止迭代的字节当已验证对象。截断 UTF-8 字符的范围拒绝。

`assemble(subject, selections, limits)` 生成有限模型视图：最多 32 来源、256 KiB 文本；扫描总量最多 512 MiB，单次捕获默认 16 MiB、可显式提高至 512 MiB。Archive 管线保持 64 KiB 分块。项目规则、角色合同、任务合同即使调用者误标 optional 也不能静默省略；超限拒绝，其他省略项显式列入 `omitted`。流式读取后、提交模型视图前再次检查任务读取权限。每条模型文本保存精确来源与 range SHA256，`CONTEXT_VIEW` 只存有限元数据，模型发送前验证已导出的 ACK 与文本哈希。

## Message Bus

`bind(subject)` 深冻结可信身份，门面不接收自报 sender。每次调用与主 Runtime resolver 的当前身份比对。receiver 同项目解析，权限回调同时看到 sender/receiver/task；字段伪造、外项目、旧 Runtime、错误引用拒绝。Host 应把消息副作用分类作为合同，模型标签不能授予外部动作的重试能力；真正工具执行继续只走现有 Tool Gateway。

消息封套持久保存身份、项目/目标任务/会话、类型、payload 引用、优先级、创建/过期时间、correlation、状态、attempt、租约、boot 与 revision。业务去重键绑定逻辑 sender+project+task；Host 重启换 Session 不重置去重。同键不同请求拒绝。普通状态流为 `QUEUED → LEASED → ACKNOWLEDGED`，另有 `EXPIRED / REVOKED / DEAD_LETTER / INDETERMINATE`。

默认每项目最多 256 条未完消息、4 MiB 引用范围字节；硬上限 1024 条/16 MiB；完整持久消息投影最多 4096 条。默认租约 30 秒、最多 3 次尝试，可配置范围为 1–60000 ms/1–8 次。消费批次最多 16 条；重试延迟有界。终态仍保留历史，达到投影总量上限显式拒绝新消息，不无界积累内存。

只有内部消息的已知未投递可有界重试。任何已领取的 EXTERNAL 消息即使接收者自报 `KNOWN_NOT_SENT`，也不能据此证明副作用未发生，进入 INDETERMINATE；租约丢失、重启或撤销在途外部消息同样不重投。未知结果无自动清理/重放接口，需后续可信核对服务。租约绑定 boot、随机 token、墙钟和单调期限；回拨后冻结。

Host 重启后，内部消息只在同项目/同任务、当前 resolver 与授权检查通过后绑定新接收 Session，并同事务追加 `MESSAGE_RECEIVER_REBOUND`，再生成新租约；旧租约不可 ACK。发送完成的 `onDeliverable` 回调只在 `NativeState.change` 的持久 ACK 后触发；唤醒失败保留消息和待唤醒审计，Resident 无需持续模型轮询。

## Model Gateway 与预算

Provider、Model、Key-handle、Request 分别使用统一状态表中的 kind；不增加模块自有 schema。仅接受 `kind: MOCK` 的 Provider 和不可执行的 fixture 数据脚本，没有网络客户端、环境凭据读取、真实 SDK 或任意 adapter 入口。凭据只接受 `vault:mock:<provider>:<opaque>` 形式且与 provider 精确绑定的模拟句柄；它不是已经部署的真实 Credential Vault。句柄留在可信状态投影，不进入 Prompt、Context、普通 Audit、消息或 Agent 门面。

支持独立 Provider Key Pool、多 Key、状态/失效、轮换、并发额度、round robin，以及按 `subject.model_binding` profile + Agent Type 配置的模型路由。费用和 token 用整数表示；本地输入/输出估算是 UTF-8 字节数除以 4 向上取整，不冒充供应商 tokenizer 或真实账单。每次使用与 request/model/provider/key 绑定，便于核算。

预算接口为 `reserve(subject, demand) → reservationId`、`settle(subject, reservationId, usage)`、`retain(subject, reservationId, reason)`。预留含输入 token、输出上限、最大估计费用和一个并发槽；调用前预留并持久化，在发送意图 ACK 后再次检查 `model.gateway` 和 `model.mock-provider`。已知未发送按零用量结算；结果/账单未知保留预算和 key 槽。异常只使用固定安全错误码，回调异常正文不进入结果或档案。

请求 ID 持久去重；进行中的重复请求不再调用 Provider。只有内建 fixture 明确 `KNOWN_NOT_SENT / AUTH` 才可按 `model.provider-failover` 进行模拟故障切换；已发送 UNKNOWN 不切换、不重试。`recover(admin)` 把 RESERVING/RESERVED/SENT 变为 INDETERMINATE，保留原预算/key，不产生新模型调用或用量结算。所有结果及计量明确标记 `SIMULATED`。

独立审查后的取消整改：`bind(subject).complete(input, trustedSignal?)` 接收独立于 JSON 的可信 AbortSignal。预算预留、原文捕获和发送意图的实际 ACK 后均重新检查 Signal/Feature。`MODEL_DISPATCH_INTENT` 只预占 key，保持 RESERVED；其 ACK 后的最终无 await fence 通过，才在 `MODEL_SENT` 消费 fixture 序列。发送前取消按零 token/费用/模型请求用量结算，不继续下一个 Provider；已 SENT 的未知请求保留预算/key。若真实模拟用量已结算后才取消，保留该用量，不能改成零。取消清理和终态审计继续完成，避免取消信号中断资源核对。补充证据见 `model-cancellation-verification.json`、`model-cancellation-run-01.tap` 和 `model-cancellation-focused-typecheck.txt`。

模型回复为 FINAL、TOOL_CALL、WAIT、HANDOFF。工具名、版本、完整 JSON 参数和可选精确 resource ID 都只是请求数据；模型不能签发 approval、operation ID、Permit 或修改权限。主 Runtime 用原 Gateway 完成参数检查、Feature、Policy、审批与审计。

## 验证与限制

最终组件运行记录见 `evidence/components/components-final.tap` 与 `verification.json`。25 项涵盖原文完整性、3 MiB 流式范围恢复、256 KiB 模型视图边界、32 来源元数据预算、引用/跨域/UTF-8 负例、授权撤销、ACK 失败、消息双向与重放、租约/过期/撤销/容量、双方 Runtime 重启恢复、Provider 池、模型去重/预算/并发/故障切换与未知状态。模型合同均 SIMULATED；SQLite/Zstd/本地文件与 close/reopen 操作为真实本地验证。模拟崩溃窗口投影测试不宣称发生真实 Provider 崩溃。

完整 source/tests/tools 的 strict TypeScript 检查见 `typecheck-full-source-final.txt`。迭代测试和一次类型收窄错误的原始日志均保留，不覆盖旧失败。本组件执行者没有运行全回归、CPU/native 资格、真实凭据/Provider、长期 soak 或断电测试，也没有修改系统设置、历史交付、根产品或执行 Git commit/push。真实 OS 隔离和生产资格仍由各自独立证据决定。
