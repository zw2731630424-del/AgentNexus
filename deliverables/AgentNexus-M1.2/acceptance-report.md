# AgentNexus M1.2 最终验收报告

结论：**P1-A/P1-B 的可信本地内核切片通过验收；P1-C/P1-D 的设计交付完成。完整 OS 安全部署仍 BLOCKED。** 当前版本 `0.4.0-m1.2`。正式机器可读裁定见 [acceptance.json](acceptance.json)，交付/源码一致性见 [verification.json](verification.json)。

## 基线与修改范围

初始分支 `main`，HEAD `67063eabcab2e29cdf7cf81f541ac7e244b5936e`，工作树干净；实际 24 个运行候选全部匹配 M1.1 独立审查包 SHA256。原始请求、基线冻结、修改前安全探针和新工作记录独立保存。没有覆盖 M0/M0.1/M1 原始证据、修改项目规则或其他研究项目；没有 Git commit/push、安装 Hook、修改 OS 账户/ACL/防火墙或调用模型/Provider。

产品改动集中在 policy/control/gateway/host，并增加固定策略合同和 reconciliation 模块；CLI 仅更改本轮 demo 输出目录/版本标识。storage/artifacts/records/features/diagnostics/integrity 六个实现文件保持 M1.1 原字节，保留 Flush target、UNKNOWN producer、统一 Close Promise、实际 OFF 排空、会话隔离与迟到 stop 防恢复等成果。既有测试仅适配已知策略、显式副作用审批及独立数据目录，原 135 个用例名称和回归断言保留。

## 已实现并验证

- 策略配置按 34 个已知 ID 与固定安全元数据严格校验；未知级别/ID/owner、重复条款、无效 modes、未知权限字段及宽松 default_mode 拒绝。L1 精确审批、L2 已实现诊断维度、L3 非授权建议分别具有明确语义；未实现的 L2 owner 默认 DENY。注入 PDP 只能收紧结果。
- 工具能力显式区分 PURE、READ_ONLY、LOCAL_WRITE、EXTERNAL_EFFECT、PROCESS。副作用工具空策略/缺 Writer 拒绝；LOCAL_WRITE 需独立精确审批，AUDIT_ONLY/DISABLED 不能免除它。未知类别和未验证沙箱拒绝，PROCESS/EXTERNAL_EFFECT 不可用布尔字段放行。
- 审批绑定身份、call_id、工具版本、参数和精确 resource_id；资源解析在各 fence 相等，回调与上下文准备先于最终时限/Epoch 检查。保留 boot/单调期限、原子单次消费、Permit 和 Writer Claim。
- 普通工具上下文只有冻结身份、operation_id、精确资源、取消信号和冻结诊断；没有 Store/SQLite/原始审计/授权/管理能力。管理与注册对象只留给可信 Bootstrap。
- Operation Reconciliation 使用可信管理员的 prepare/commit challenge，绑定原 operation/intent、expected_revision、证据、理由、裁定者/时间。证据完整读取校验，裁定表与原审计追加保存；并发、重放、错意图、无证据及覆盖原记录均拒绝。
- CONFIRMED_APPLIED、CONFIRMED_NOT_APPLIED、UNKNOWN_QUARANTINED 形成正式核实流程。结果与退出确认分离：UNKNOWN/仍运行/未确认 producer 不能释放 Writer；已有最终裁定后的释放也需单独授权。确认未发生不自动重跑。
- timeout_ms 继续使用单调计时并覆盖输出、结果及 ACK 屏障；迟到输出不再返回 PASS。存储故障留下的 inactive CLAIMED/STARTED 也可核实，不能作为普通失败重试。

## 真实验证与独立审查

基线独立复跑：135 tests / 131 PASS / 4 NOT_RUN / 0 FAIL。修改前探针实际复现未知策略 ALLOW、空策略工具通过 ToolContext.store 写入本地合成数据库。

最终完整复跑：**171 tests / 167 PASS / 4 NOT_RUN / 0 FAIL**，最终运行 ID `2026-11-07T03-39-19-800Z-33960`。全部为本地 Node 24.15.0、SQLite/Zstd、已有 Python/PowerShell 解析器、合成数据和受控进程；未运行真实模型或实验。4 项 NOT_RUN 为真实文件 symlink、目录 symlink、junction、hardlink 夹具权限 EPERM，没有模拟 OS PASS。最终 TAP/逐事件 JSON/结果/源码清单及先前失败日志都在 evidence 中。

新增恢复测试真实启动并强杀子进程，分别停在调用前、调用后 STARTED 前、handler 完成 RESULT 前、RESULT 后 ACK 前和 ACK 后回包前。重启不再次调用 handler；原始 intent、已记录 RESULT 与未知隔离保留。超时仍运行、未知输出 producer、并发裁定、缺证据、错 hash、重放、故障事务与重启后禁止释放均有运行证据。子进程强杀测试证明本地进程崩溃恢复，不证明硬断电或任意进程树隔离。

独立只读审查使用单独上下文和隔离快照，发现两项 P2 问题：独立 owner 的 ENFORCE 配置写入/读取合同不一致，以及 handler 返回后输出阶段没有期限。这两项均已修复并独立复核；最终 4 个相关测试文件 **74 PASS / 0 FAIL**。另外实测资源解析器同步耗时跨过审批期限时仍拒绝、输出超时不 PASS、未知 producer 即时/重启后不能释放。报告绑定六个产品文件 SHA256，最终源码无漂移；结论只适用于审查范围。

最终源码、完整副本与测试快照逐路径/字节绑定；源码 ZIP 解压读取再核 SHA256，原 135 个回归用例无遗漏。冻结的 **2394 个历史/规则文件**逐字节核对不变，HEAD 不变；其余受跟踪历史路径由 Git diff 检查。治理检查和语法检查证据随交付保存。静态 tsc 检查没有运行，不能将 Node 类型擦除/语法检查写成类型检查通过。

## 尚未实现或仍 BLOCKED

| 能力 | 状态与具体边界 |
|---|---|
| OS Host Admin/Worker 身份、可信 IPC | NOT_RUN；未配置或认证真实独立 OS 身份 |
| 任意进程/外部副作用、文件 Broker、网络隔离 | BLOCKED；没有可验证执行 profile，不提供无隔离 fallback |
| 全进程树退出与重启后 ExitProof | BLOCKED；本地 SETTLED 不等于 OS 全树退出，缺观察的 Writer 继续隔离 |
| 科研协议授权、永久 seed Claim、原子多臂执行 | DESIGN_ONLY / NOT_RUN；合同与测试计划已交付，未接入研究项目 |
| 真实 Provider、Key 池、费用、凭据 Vault | NOT_RUN；无真实请求、凭据读取或费用 |
| Review/Workflow/Scientific L2 owner | NOT_IMPLEMENTED，当前 ENFORCE 默认 DENY；目录定义不是实现 |
| 恶意同进程 handler 隔离 | BLOCKED；注册回调是可信代码，ToolContext 封装不能阻止任意 JS 导入系统 API |
| 硬断电、长时 soak、硬 OS 资源限制 | NOT_RUN，不能由短期崩溃测试外推 |
| 独立管理员磁盘防篡改/外部签名锚定 | 未实现；追加触发器与 hash 证明可信库内约束和字节一致性 |

证据内容的现实意义由可信人工核实，内核验证授权、引用完整性与绑定，不自动证明外部世界事实。任务提到的“本轮独立技术审查报告”没有找到单独原件；未将其未知结论追认为缺陷，已另外完成本轮实际源码复核和独立代码审查。详细问题状态、位置、证据及验收条件列于 [27 项账本](issue-ledger.json)。

后续按 [M1.3 建议](m13-recommendations.md)优先关闭独立身份、OS Broker 和退出证明边界，再引入科研运行及更高风险工具。
