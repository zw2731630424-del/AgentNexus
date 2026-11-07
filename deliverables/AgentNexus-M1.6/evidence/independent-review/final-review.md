# AgentNexus M1.6 独立审查（最终 v2）

本地新增范围通过，保留明确限制。完整回归仍为 **FAIL（2项继承失败）**；严格CPU和完整生产执行资格仍为 **BLOCKED**。最终没有仍开放的本轮新代码发现。

绑定分支 `main`、HEAD `112d915c97ee6e6214f7ce05eab8bd492bbb9bc6`，以及 **未提交**的123文件源码集合 `242bf84892d7db9539baa5fca36119af97aa658cf0757ba97c58a17190542f80`。没有新Commit，也没有自动Commit/Push。逐文件清单、完整快照ZIP和相对M1.5.1的diff分别见 [manifest](source-manifest-final.json)、[ZIP](source-snapshot-final.zip)、[diff](source-diff-final.patch)。

## 独立验证与复用范围

| 验证 | 实际结果 | 原始证据 |
|---|---|---|
| 全部M1.6测试 | 75 PASS / 0 FAIL / 0 skip | [TAP](v1/m16-tests-final.tap) |
| 独立实际负例与故障注入 | 15 PASS / 0 FAIL | [逐项观察](v1/probe-verification-final.json) |
| v2安全回归 | 22 PASS / 0 FAIL | [TAP](security-v2-tests.tap) |
| v2全源码严格类型检查 | PASS；Node24.15 / TS5.9.3 / @types/node24.10.1 | [日志](typecheck-v2.log) |
| 输出目录实际helper | 2项源码路径拒绝、1项合法目录接受 | [结果](output-root-final.json) |
| 主线完整all回归（独立读取原件） | 380项：351 PASS / 27 NOT_RUN / 2 FAIL，exit 1 | [原始TAP](main-v2-all-tests.tap)、[原始JSON](main-v2-results.json) |

75项M1.6测试及15项探针实际运行于冻结v1 `26d71cfd30ec0e84ae0669f7377be14a3b8b3ceadaa5643dc4b52400864d6dea`。v2只有 `tests/agentnexus/security.test.ts` 一处测试维护，另122文件（全部产品模块、配置、M1.6测试及工具）逐字节相同。该单一diff已独立复核，v2安全测试与strict检查重新执行；没有将未执行的全量v2运行冒充新跑。详见 [复用及后验哈希证明](v2-reuse-and-stability.json) 和 [v1/v2 diff](v1-v2-security.patch)。

独立测试使用真正的KernelStore/SQLite、Artifact/Zstd、FeatureRegistry、原Policy/Permit/ToolGateway路径。文件写入确实发生在独立审查目录；模型、计费与审计故障注入明确属于模拟。独立审查者未执行真实Provider、OS部署、CPU58资格矩阵或全native生产测试；主执行者的all结果已按同一v2源码哈希独立读取，不能据新增75项通过消除其2项FAIL。

## 继承失败的当前裁定

- CPU原语：`M1.4 REAL_WINDOWS_PRIMITIVE: cumulative Job CPU time kills a busy fixture before wall deadline` 当前FAIL。原始消息明确记录Job累计 `29062500 ticks` 且必须使用Helper `DEADLINE` 终止；配置JOB_TIME不构成硬限制证据。原M1.5.1严格58场景的56 FAIL/2 PASS仍保留，任何旧弱断言的偶然PASS也不升级资格。
- TOCTOU原语：`M151 REAL_WINDOWS_PRIMITIVE: concurrent directory replacement never returns junction target bytes` 当前FAIL，失败于原 `swaps>0` 断言（swaps=0）。这次没有形成要求的实际junction替换，动态攻击覆盖INCONCLUSIVE；不能把未观察到外部字节提升成资格PASS，也没有证据据此断言实际逃逸发生。原预算、原断言和历史原件未修改。

## 修前发现及最终复核

以下行号指向最终冻结源码中的修复位置；初始现象与原始失败文件均保留。

### IR-01 P1 — 取消已确认后仍执行已批准工具

位置：[src/agentnexus/harness/scheduler.ts:172](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/scheduler.ts:172)；该文件SHA256 `a7e666106299c3eeda529051e1fa01f05171c87acd7f0270baff69609268b2f4`。

触发/证据：在TASK_DISPATCHED持久ACK返回前阻塞；cancelTask返回STOPPING后放行，真实写工具仍调用一次，最终Task为CANCELLED。 [原始观察](probe-results.json)。

修复复核：恢复工具前检查停止状态；可信AbortSignal经HostFacade进入原Gateway，并在调用前无await的最终屏障检查。最终取消零写入。 状态：**RESOLVED**。

### IR-02 P1 — 角色OFF未阻止已有Agent调度

位置：[src/agentnexus/harness/agents.ts:31](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/agents.ts:31)；该文件SHA256 `32daba9b1fb862c106d2924f87d6d95b40bad18bd17f3a12d9b08ba8a1ed0c62`。

触发/证据：Development Agent和Task预先创建；project scope的runtime.role.lead OFF成功后仍SUCCEEDED并产生一项模型请求。 [原始观察](probe-results.json)。

修复复核：current/dispatch/生命周期发布复查实际角色Feature；Role模块stop按scope和type排空。最终OFF零模型调用。 状态：**RESOLVED**。

### IR-03 P1 — 项目暂停排空快照后可接纳新Task

位置：[src/agentnexus/harness/index.ts:115](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/index.ts:115)；该文件SHA256 `12d9b71f45bfd419eb1554f37823df445e9a75f375225f4040fb684c63de1bd5`。

触发/证据：A在途时启动项目暂停，B在原项目仍ACTIVE期间进入；PAUSED已ACK时B仍RUNNING，后续创建模型请求。 [原始观察](probe-results-extended-initial.json)。

修复复核：先持久发布PAUSING/CLOSING，后排空，最后PAUSED/CLOSED；模型和工具入口复查项目状态。最终B保持QUEUED且零模型。 状态：**RESOLVED**。

### IR-04 P2 — 重启保留旧审批但无法重新批准

位置：[src/agentnexus/harness/scheduler.ts:331](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/scheduler.ts:331)；该文件SHA256 `a7e666106299c3eeda529051e1fa01f05171c87acd7f0270baff69609268b2f4`。

触发/证据：WAITING工具已批准后close/reopen；旧approval仍在，重新批准报TASK_NO_PENDING_APPROVAL，恢复执行被POLICY_DENIED。 [原始观察](probe-results-extended-initial.json)。

修复复核：恢复保留call/参数但清除旧session审批，重新等待显式批准；无自动写，重新批准后仅执行一次并保留持久资源。 状态：**RESOLVED**。

### IR-05 P2 — Agent Type Registry项目开关无效

位置：[src/agentnexus/harness/agents.ts:63](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/agents.ts:63)；该文件SHA256 `32daba9b1fb862c106d2924f87d6d95b40bad18bd17f3a12d9b08ba8a1ed0c62`。

触发/证据：native.agent-type-registry在project scope OFF后仍可创建Agent并完成Task。 [原始观察](admission-results-initial.json)。

修复复核：按完整Actor作用域检查注册与运行，发布时复查；模块关闭联动排空。最终创建被拒，零模型请求。 状态：**RESOLVED**。

### IR-06 P1 — 真实持久写入完成即释放磁盘容量

位置：[src/agentnexus/harness/scheduler.ts:118](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/scheduler.ts:118)；该文件SHA256 `a7e666106299c3eeda529051e1fa01f05171c87acd7f0270baff69609268b2f4`。

触发/证据：通过原Gateway写入真实100B文件，Task声明disk_bytes=100；文件仍在时platform disk held/spent均为0。 [原始观察](admission-results-initial.json)。

修复复核：已调用LOCAL_WRITE且无存储owner/销毁证明时Task及预留进入UNKNOWN；禁止自动结算。最终文件100B、held100且worker仍保留。 状态：**RESOLVED**。

### IR-07 P2 — 已知未发送模型请求在取消后仍派发

位置：[src/agentnexus/harness/models.ts:172](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/models.ts:172)；该文件SHA256 `e73453360e82503f9bdbb2d924c6c7e32f7887ecca26445ef4542f7e70c225ac`。

触发/证据：MODEL_BUDGET_RESERVED ACK处停止；cancel ACK时sequence=0，放行后sequence=1、模拟tokens spent=111，Task最后CANCELLED。 [原始观察](admission-results-extended.json)。

修复复核：模型入口传入可信Signal并在各ACK后及发送前检查；未发送取消结算零用量，SENT未知仍保留。最终seq0/tokens0/CANCELLED。 状态：**RESOLVED**。

### IR-08 P2 — 子代理复用父Task而获得隐式历史读取权

位置：[src/agentnexus/harness/agents.ts:42](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/agents.ts:42)；该文件SHA256 `32daba9b1fb862c106d2924f87d6d95b40bad18bd17f3a12d9b08ba8a1ed0c62`。

触发/证据：SUBAGENT使用父task_id可创建，read_tasks=[]仍可读取父ContextSource的174B内容。 [原始观察](admission-results-extended.json)。

修复复核：同项目Agent任务必须独立，父历史读取另需显式授权。最终同Task创建被拒。 状态：**RESOLVED**。

### IR-09 P2 — sendText重启后业务去重冲突

位置：[src/agentnexus/harness/index.ts:167](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/index.ts:167)；该文件SHA256 `12d9b71f45bfd419eb1554f37823df445e9a75f375225f4040fb684c63de1bd5`。

触发/证据：首次消息成功，真实close/reopen后相同sender/task/text/dedup_key触发MESSAGE_DEDUP_CONFLICT并创建第二份草稿。 [原始观察](admission-results-messaging.json)。

修复复核：草稿与MessageBus都使用逻辑Agent/Project/Task业务键，不含session；复用原始immutable source。最终同ID、1消息、1草稿。 状态：**RESOLVED**。

### IR-10 P2 — Gate OFF发生于证据验证期间却仍写有效状态

位置：[src/agentnexus/harness/workflow.ts:49](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/workflow.ts:49)；该文件SHA256 `3be7421d442047b6709e31d8c82e7f328c2fcc4d9395e6d1e7c8c7cd881b3071`。

触发/证据：真实Artifact流验证await时关闭wf.gate.g2；OFF ACK后Gate仍记SIMULATED且feature_enabled=true。 [原始观察](workflow-results-initial.json)。

修复复核：提交事务内复查Runtime/Gate/Evidence Feature；中途OFF写BYPASSED。checkpoint/decision/checklist也在发布时复查。 状态：**RESOLVED**。

### IR-11 P2 — 关闭资源功能后不能重新启动控制面

位置：[src/agentnexus/harness/agents.ts:97](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/agents.ts:97)；该文件SHA256 `32daba9b1fb862c106d2924f87d6d95b40bad18bd17f3a12d9b08ba8a1ed0c62`。

触发/证据：合法关闭project worker budget与scheduler后安全close；再次openHarness被resource.worker.budget OFF阻断。 [原始观察](admission-results-recovery-only.json)。

修复复核：恢复只重建控制投影；新Worker预算和缺失Platform预算延迟到显式、已通过Feature检查的dispatch。最终控制面可重新打开。 状态：**RESOLVED**。

### IR-12 P1 — 大工具结果归档失败绕过持久磁盘保留

位置：[src/agentnexus/harness/scheduler.ts:139](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/src/agentnexus/harness/scheduler.ts:139)；该文件SHA256 `a7e666106299c3eeda529051e1fa01f05171c87acd7f0270baff69609268b2f4`。

触发/证据：真实写100B且原Gateway SUCCEEDED/SETTLED；合法data长度64791使原output_ref=65508B，而重复封装结果超过65536B，ARTIFACT_LIMIT后Task FAILED并释放disk/workers。 [原始观察](disk-capture-results-pinned-pre-freeze.json)。

修复复核：实际调用后先持久标记；catch和release按原request_key/executor独立回查；成功结果直接引用原Gateway Archive，避免重复包装。最终大结果保持UNKNOWN/held100/worker1。 状态：**RESOLVED**。

### IR-13 P2 — Windows大小写别名绕过CLI输出路径保护

位置：[tools/agentnexus/output-root.ts:11](I:/AI_AgentNexus/deliverables/AgentNexus-M1.6/source/tools/agentnexus/output-root.ts:11)；该文件SHA256 `3b82ee59ce3b31c896611406a7b6a1cdd88b2b3aedc1a94c779f0e5408114f3e`。

触发/证据：归档旧CLI比较器对source.toLowerCase()返回不拒绝，而实际realpath确认是同一既有Windows目录；未尝试向源码写文件。 [原始观察](output-root-initial-static.json)。

修复复核：统一helper解析既有祖先realpath并做Windows casefold，再按路径边界拒绝源码内输出；最终实际helper两次拒绝、一次接受合法审查目录。 状态：**RESOLVED**。

## 关键P1归档故障证据

大结果反例是在逐成员hash核验后的旧源码副本上实际复现，完整绑定 `d1bab54ac66a135e1d3e627786c344c802633b2c48dfd8a6c57b2894df80a0c8`。旧版Gateway已经成功写100B且输出65508B，但包装层超限后释放了磁盘和Worker；新版相同64791B data保持 `UNKNOWN_QUARANTINED`、disk held=100、worker held=1，并直接引用原Archive。见 [修前固定快照复现](disk-capture-results-pinned-pre-freeze.json) 和 [修后同探针](v1/disk-capture-results-final.json)。

初期若干即时发现只留有原始观察及部分模块测后hash，未捕获完整初始树；不会将其冒称完整历史commit。最终v1/v2及关键大结果修前版本都有完整快照。

## 仍须保留的能力边界

- **BLOCKED / L-CPU**：严格Windows累计CPU合同未修复；M1.5.1最终58项56 FAIL/2 PASS永久保留。主线v2继承CPU用例同样FAIL：Job累计29062500 ticks，需Helper DEADLINE。未重跑58矩阵，CPU_RATE/采样/模拟账本不升级为严格硬限制。
- **FAIL / L-TOCTOU**：主线v2继承TOCTOU fixture在swaps>0断言失败，替换计数为0；此轮动态替换攻击覆盖INCONCLUSIVE，不能据此宣称逃逸已发生或资格通过。原断言与历史成功/失败均保留，不降低阈值。
- **BLOCKED / L-OS**：LOCAL_TRUSTED_LIBRARY不是恶意同进程代码或真实Worker的OS安全边界。Windows生产账户、ACL/AppContainer、完整生产退出证明未独立验收；Ubuntu NOT_RUN。
- **BLOCKED / L-DISK**：实际LOCAL_WRITE可在精确审批后执行，但无持久存储所有权转移/销毁适配器，Task与全部相关claims保持UNKNOWN，不支持自动成功结算或自动回收。
- **SIMULATED / L-MODEL**：仅静态Mock Provider、模拟token/费用及mock Vault handle；未读取真实Key、连接真实Provider或产生费用。
- **PARTIAL / L-WORKFLOW**：G0-G6为版本/证据/状态ledger，PASS是可信owner声明，不能视为自动质量认证；规则捕获/必需上下文已实现，wf.context仍INTERFACE_ONLY/NOT_RUN。
- **NOT_RUN / L-AUTOMATION**：未独立验证自动Git commit/push watcher、长期Resident/Coordinator服务、真实Host/OS重启或硬断电；安全SQLite reopen不是生产重启。
- **BLOCKED / L-RECOVERY**：在途模型/工具/资源不确定时仍需owner reconciliation；不提供未知副作用自动重试或UNKNOWN自动释放。

已独立逐SHA256核对100个M1.5.1基线文件及3341个历史文件（1,173,867,087B），无差异；原CPU FAIL、旧预算/容差、原TOCTOU及其他历史证据均保留。v2安全测试只维护新Catalog的精确数量和已批准ID，没有放宽安全负例、CPU阈值或旧原语断言。

190 Feature / 52 Policy中，本轮注册43项模块，8条新增Policy均为固定L0、不可降级，并已映射到实际通过的case；`wf.context`保留INTERFACE_ONLY/NOT_RUN，Gate仅声明ledger范围。见 [目录核对](catalog-verification-final.json)。

覆盖全部新增运行/资源实现、全部新增交付工具以及所有继承文件改动；阅读范围和文件hash见 [reading manifest](reading-manifest-final.json)。未重新逐行审查未改动的全部历史C#/PowerShell源码，也未独立运行完整生产链、长期服务和硬断电测试。

审查者仅写独立审查证据目录，未改产品、历史、项目规则或系统配置，未派发子代理。后续应先完成真实存储owner/回收证明、独立执行后端资格及必要的单独授权，再考虑生产放行。
