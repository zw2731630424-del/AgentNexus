# M1.6.1 Context Provenance

本组件实现范围为可信本地 Context Assembly 与模拟 Model Gateway 的实际输入追溯。新增 Context 测试 **13/13 PASS**；Provider、计费及指定的调度故障仍为 **SIMULATED**。最终完整工程验收由主执行者的全量回归和独立审查决定。

源码位于 `source/src/agentnexus/harness/context.ts`，最小模型集成位于 `models.ts`。本组件没有修改 M0—M1.6、根产品、原测试或共享 State/Scheduler/Contracts/Index。实际读取范围及 SHA256 见 [read-manifest-v4.json](evidence/reliability/read-manifest-v4.json)；34 个继承测试/fixture 文件逐字节相同，见 [保全结果](evidence/reliability/original-tests-preservation-v4.json)。

## 原始字节、版本和来源

每次新装配固定 `assembly_version=agentnexus/context-assembly/1.6.1`。最终输入是每项已验证 UTF-8 范围按 `\n\n` 连接的精确字节；无隐式换行规范化、BOM 删除或摘要替换。输入自身另存不可变 Zstd Artifact，`input_ref` 记录原始/压缩 SHA256 和字节数。完整来源元数据另存 `manifest_ref`，不把大文本塞入 48 KiB 状态投影。

同一 SQLite 事务写入 Context View、`CONTEXT_INPUT_COMMITTED` 追加审计和既有 Audit/outbox；审计同时绑定 input/manifest 两个 Artifact、来源 event ID、assembly version、精确输入哈希、manifest 哈希和 provenance 哈希。原 Archive 导出并持久 ACK 后才返回视图。同步 `assertContextView` 要求导出 ACK，并验证投影与不可变 manifest 的哈希绑定；伪造文本、来源或元数据不能通过。

`ContextSelection.binding?: { reference, version, sha256 }` 可保存规则文件、角色、任务合同、文件版本、Decision、消息、Artifact 或 Tool 结果的原始外部标识。`sha256` 必须等于实际不可变来源对象哈希；无显式 binding 时，使用 Archive event ID、record hash 与 payload hash。来源始终携带 project/task、原始 Context event/record hash、ArtifactRef、字节 offset/length 和实际范围哈希。`PROJECT_RULES / AGENT_CONTRACT / TASK_CONTRACT / HISTORY / FILE_CONTENT / DECISION / AGENT_MESSAGE / ARTIFACT / TOOL_RESULT` 分别保留，不合并为不可恢复摘要。

装配还接受 Task 固定的 `ContextTaskBinding`：`project_rules_version / rule_hash / feature_epoch / policy_epoch / workflow_version`。Scheduler 由主执行者从 Task 的规则绑定传入；本组件不自行把任务升级到项目最新规则。显式来源版本与内容哈希不匹配时拒绝。外部 reference/version 标签来自可信 Host；本地字节完整性验证不等于对任意当前路径或自然语言标签的真实性认证。

## 精确恢复与模型请求

`reconstruct(subject, viewId, {signal?})` 返回 `{bytes: Uint8Array, context: AssembledContext}`。它完整读取并校验 manifest 与独立 input 对象，从精确长度恢复每个 entry，再核对范围哈希和连接分隔符。读取权限仍按同项目/同任务或可信 readTask 授权检查，不读取当前工作区文件作为替代。

因此文件或规则更新不会改写旧输入。即使某个历史/派生索引对象后来损坏，只要独立 input、manifest 及其来源记录/发布元数据仍可验证，仍能恢复当时输入；这不宣称损坏的原来源对象已经重新通过全量校验。缺失引用、记录哈希变化或输入/manifest 对象损坏则拒绝恢复。旧 M1.6 View 没有新快照字段时，按原来源范围完整扫描恢复，不静默改写为新版本。

Model Gateway 在新请求预算预留/发送前调用恢复验证，将 `context_input_ref / context_manifest_ref / context_assembly_version / context_provenance_sha256` 写入持久请求及原请求 Archive。新的请求 Archive 引用精确输入对象，不再重复 JSON 转义完整文本，避免合法的 256 KiB 控制字符输入膨胀后被拒。已知未发送失败、已发送 UNKNOWN、取消和重启均保留输入与来源；UNKNOWN 不重新派发 Provider。

## 原始 Archive 与派生数据

`RAW / SUMMARY / RETRIEVAL / DERIVED_INDEX` 仍分别追加。派生记录要求已有来源引用；重新生成摘要/索引只创建新 event 和 Artifact，不覆盖原文。SQLite append-only 触发器继续保护原始记录。原始历史可独立分段读取，不依赖摘要或检索索引存在。

物理 Artifact 损坏沿用原 Storage 的保守冻结语义：发现坏对象后阻止新写入，保留坏对象及证据；已验证的独立 raw/input 对象仍可只读恢复。损坏后发布新派生对象需要显式 Storage Owner 核对，不能把摘要重建当作原始损坏对象已修复。测试同时覆盖派生记录重新生成、派生引用缺失/失效和真实索引对象 bit flip。

## 有界资源合同

| 资源 | 限制与行为 |
|---|---|
| 模型文本 | 最多 256 KiB；显式 `omitted`；规则/角色/任务合同超限拒绝 |
| 来源与检索 | 最多 32 项，扫描总量最多 512 MiB |
| 原始捕获 | 默认 16 MiB，显式上调最多 512 MiB，64 KiB 分块 |
| 写入等待 | 共享 Artifact `putQueued/putBytesQueued`，2 个活动流、最多 16 个等待；原 `put` 拒第三流的合同保留 |
| 元数据 | 每投影/manifest 最多 48 KiB，超量明确拒绝 |
| 读取并发 | 按 KernelStore 共享，最多 2 个活动读取阶段、8 个等待；来源扫描结束立即释放读槽 |
| 读取背压 | 第 11 个并发请求明确 `CONTEXT_READ_BACKPRESSURE`；等待取消及时移除 |
| 读取完整性 | 即使范围在开头，也完成原对象的压缩及原始哈希屏障后返回 |

内存随模型输入、固定读取槽及固定队列上限增长，不随原始历史对象大小增长。最终视图序列化考虑 UTF-8 控制字节最多六倍 JSON 转义，并保留固定 envelope 上限。没有为测试放大模型输入合同。

## 实际验证

最终 [原始 TAP](evidence/reliability/final-04/tests.tap)、[逐条 JSON](evidence/reliability/final-04/results.json)、`final-04/context-observations-*.json` 和 [验证绑定](evidence/reliability/verification-v4.json) 保存了精确输入/manifest 引用、哈希、真实本地文件版本及读取统计。覆盖所有来源类别、规则/文件实际更新、8 MiB 流式历史、两实例共享读取池、8 项排队及取消、旧 View、摘要缺失、索引重建与损坏、原始历史损坏、失效引用、必需规则溢出、256 KiB NUL 输入、失败/UNKNOWN 模型请求后的 close/reopen 恢复、四并发 Context 捕获/装配，以及捕获 producer 依赖 Context 读取的组合资源池场景。

新增 Context 13 项全部 PASS；最终新增两组件合计 29/29 PASS，并在 final-04 同时重跑原 Context/Model，共 54/54 PASS。`run-03` 的原三个组件加当时新增测试 58/58 PASS；`run-02` 还运行原 Harness，共 82/82 PASS。其后单独追加 Coordinator 通知和共享写入等待，分别重跑 27/27、28/28；各轮覆盖范围/源码版本不同，保留各自原记录，不把它们拼成一轮新回归。最终 strict TypeScript 使用 Node24.15.0、TS5.9.3、@types/node24.10.1，全 src/tests/tools PASS。

## 独立审查后的组合死锁整改

独立审查发现：两个 assemble 在来源读取结束后仍持有全部两个读槽，并等待 Artifact input/manifest 写入；此时两个 capture 占据全部写槽，其 producer 又调用 readRange 等待读槽，形成循环等待。单独的读背压或写背压测试不能证明这种组合可完成。

新增 `M161-CONTEXT-COMPOSED-POOLS` 在两个装配的真实来源扫描前设置可控屏障，再启动两个依赖 readRange 的真实流式捕获，确认读槽 2/写槽 2/等待读取 2 后放行。修前真实复现并在 3 秒截止时观察到 active_reads=2、queued_reads=2、active_writers=2、queued_writers=2；取消信号解除等待并等待全部清理，测试进程正常退出。修前 13 项中的 12 PASS /1 FAIL、原始 [TAP](evidence/reliability/review-deadlock-before/tests.tap)、JSON、来源哈希及路径说明全部保留。

修复仅在 entries 来源扫描结束后、任何 putBytesQueued 之前调用已有的幂等 release；finally 继续调用同一幂等回调兜底。文本、manifest、provenance、权限及 ACK 校验均保持。修后同一屏障场景全部完成且无需触发取消，读取/写入峰值均为 2、等待队列清空、Archive 校验通过。没有修改共享 ArtifactStore 或放大资源上限。

首轮四项失败来自新消息审计事件把 Subject 当作 Identity；修复后重跑，原 `run-01` TAP/JSON 和最初类型错误日志仍保留。未进行真实 Provider、OS 重启、硬断电、生产隔离或科学实验验证；严格 CPU 资格保持 BLOCKED。
