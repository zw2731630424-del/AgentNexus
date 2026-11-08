# Model Provider UI 独立审查

审查日期：2026-11-08。审查者为独立上下文的 Codex 工程审查代理；实现与修复由主代理负责，审查者没有修改实现、项目规则或历史交付。范围为新增 `src/agentnexus/desktop/`、`desktop/`、`tests/desktop/` 与 Credential Vault 的 `setModels` 接口，并按调用关系检查 Gateway、Router、Usage Ledger、Harness 关闭与恢复。

**初审发现的 4 项正确性/资源边界问题均已由主代理修复，并经独立同组探针复验，状态 FIXED_VERIFIED；本次审查范围内未见剩余阻断。生产 Credential Service、真实凭证录入和 LIVE 继续 BLOCKED。** 所有本轮执行证据均为本地合成测试，不构成生产 OS 隔离、实际 Provider 可用性、真实费用或完整里程碑验收。

## 初审发现

### UI-IR-001：每次调用新建 Gateway，未共享在途请求上限（P2，FIXED_VERIFIED）

位置：初审 `source/src/agentnexus/desktop/service.ts:78-91`，相关 `source/src/agentnexus/model-runtime/gateway.ts:28,78`。

`runtimeFor` 为每次 completion 创建新的 Gateway。Gateway 的 `#active` 为实例私有 Set，默认上限 4。配置一个 `max_concurrency=16` 的合成 Key，Resident、Development、Coding、Research、Test Agent 和 Reviewer 同时调用 `bindAgent(...).complete()`，**6 个请求全部进入等待中的 FixtureTransport，放行后 6 个全部 SUCCEEDED**。这绕过宿主 Gateway 的共享并发上限，虽然 Key 自身并发计数与统一 Token 账本仍然生效。

建议在宿主层原子持有共享请求名额，覆盖所有入口及 UNKNOWN，并在 Host 重启时恢复未决占用。静态还观察到桌面 `modelRuntimeFactory.recover` 初审只调用 `ledger.recover`，未恢复 `MODEL18_REQUEST` 的非终态；初审没有做硬退出实测，不能声称该恢复分支已通过。

### UI-IR-002：Agent facade 在途时关闭会先销毁 Harness（P2，FIXED_VERIFIED）

位置：初审 `source/src/agentnexus/desktop/service.ts:271-284`。

`busy` 只覆盖 Operator.invoke。将一个 Agent facade 请求挂在合成 Transport 中，调用 `service.close()`，观察为 **VAULT_OPERATIONS_IN_FLIGHT**；此时 Harness 已关闭且 `closed=true`。放行原请求后，completion 以 **ERR_INVALID_STATE** 失败。再次 `close()` 又直接 resolve，不能重试完成首次关闭。这使已发送请求失去正常的结果/账本持久化机会。

建议对全部入口共享在途计数；关闭应在结果持久化结束后进行，或以 HOST_BUSY 拒绝且保持 Host 可用。底层关闭成功才能最终标记 closed。原生窗口关闭的重试目前只保护 Operator busy，不能补救 Agent 路径。

### UI-IR-003：证明未发送后没有使用已配置备用 Provider（P2，FIXED_VERIFIED）

位置：初审 `source/src/agentnexus/desktop/service.ts:78-91`，相关 `source/src/agentnexus/model-runtime/gateway.ts:90-91,151-154`。

配置主、备两个 Provider，各有 ACTIVE 合成 Key；主 Key 的 `requests_per_minute=1`，备用为 120。Agent binding 设置主模型、备用模型、`failover=true`、`auto_route=false`。第一次发送主 Provider 成功；第二次主 Key 达到本地 RPM 上限，Vault 在发送前拒绝，但 Gateway 固定使用 `candidates[0]`，返回 **FAILED / MODEL18_NOT_SENT / primary**，Transport 总调用仍为 **1**。备用 Provider 没有被调用。

现有预过滤可排除禁用、模型缺失或并发满，却不涵盖后续发送前拒绝。建议仅对可证明没有发送的失败按配置顺序尝试备用，并保持统一预算、请求身份和审计；任何 SENT/UNKNOWN/INDETERMINATE 都不得自动切换重发。

### UI-IR-004：403 权限拒绝显示为无效 Key（P2，FIXED_VERIFIED）

位置：初审 `source/src/agentnexus/desktop/service.ts:198-213`，相关 `source/src/agentnexus/model-runtime/adapters.ts:81`、`source/src/agentnexus/desktop/contracts.ts:23-32`。

`connectionStatus` helper 及其单测区分 401 INVALID_KEY 与 403 UNAUTHORIZED，但服务没有使用该 helper。Adapter 将 401/403 合并为 AUTH，服务将 MODEL18_AUTH 固定映射 INVALID_KEY。合成 Transport 返回 **HTTP 403** 时，连接结果为 **INVALID_KEY / MODEL18_AUTH**，期望的 UNAUTHORIZED 状态不可达。这会误导用户轮换正确但权限不足的 Key。

建议通过可信、有限的 HTTP 状态元数据保留诊断区别，并针对 `connection.test` 的实际服务路径补测；不需要把远端正文或错误信息返回 Renderer。

## 已核对的边界与验证

- 独立执行 `node --test tests/desktop/service.test.ts`：**10 PASS / 0 FAIL / 0 SKIP**，Node 24.15.0。涵盖 CRUD/修订冲突、凭证清零与无读取接口、轮换/禁用/删除、保护器失败、LIVE 零发送、路由/覆盖/收藏、共享账本与重启、UNKNOWN 保留和不自动重放、双 Key 并发、调用契约与撤销 session；未覆盖上述反例。
- 原生发送方判定同时检查实际 webContents 对象、mainFrame 对象和精确 URL；Renderer 自称角色不会成为凭证。纯函数伪造/子帧探针另记录；不把纯函数结果冒称实际 Electron 多进程或 OS 认证资格。
- Renderer/Preload/Host 均未提供读回秘密的方法；Host 仅接受合成凭证，调用退出时清零提交字节，结果与持久化均经 Guard。已知秘密扫描不能替代生产进程隔离，Renderer 输入也不是已获资格的真实凭证入口。
- `setModels` 为 Host admin 能力接口，检查模型标识/数量/重复/Guard。补充探针核对伪造 admin、非法模型标识、旧模型新租约拒绝与新模型新租约接受。其注释定义为“新租约使用当前范围”；不将它描述为取消已取得租约或终止已发送请求。
- 已阅读 UI 状态流：合成成功不会设置 CONNECTED/VERIFIED，LIVE connection test 不发送网络请求，界面提示本地预算 Store 尚无生产唯一账本资格；未见 UI 可选择或重置 Campaign 的接口。消息仅驻内存，不称为持久聊天历史。
- 未独立执行完整回归、真实模型 HTTP 请求、生产 Worker/Reviewer 跨账户拒绝、实际费用对账、长期 Resident 或生产 OS 验收；不声称独立重跑主代理的原生 Electron E2E。

## 复现材料

从 `I:/AI_AgentNexus` 运行：

```powershell
node --test deliverables/AgentNexus-Model-Provider-UI/source/tests/desktop/service.test.ts
node deliverables/AgentNexus-Model-Provider-UI/evidence/independent-review/probe.mjs
```

探针只创建新的合成 Vault/Host 和 FixtureTransport；记录当前候选源码 SHA256，输出带时间的 `observations-*.json`。每轮运行数据写入新的 `.workflow-kit/runtime/AgentNexus-Model-Provider-UI/independent-review/` 子目录；交付 `evidence/independent-review/` 仅包含安全的合成文本和脚本，不包含 Vault/Host 数据库。

初审 service SHA256 为 `1bb781bf46732958ea71473b8f0348a475b3224da2729626b630189fdd6e9e7d`；Vault 为 `31512f836e6f813313e1b356b7f37b103bae5b0e8f740b5650016fc4d8dd8e4c`。初审源与修复源不得混称同一候选。

## 生产资格的明确限制

参照 [M1.8.2 Credential Vault 资格报告](../../AgentNexus-M1.8.2/reports/credential-vault-qualification.md) 与 [M1.8.2 独立安全审查](../../AgentNexus-M1.8.2/reports/independent-security-review.md)：新建合成 DPAPI Vault 被同 SID 的真实独立子进程读取并成功 CurrentUser 解密，SHA 与预期相符，已存在的 OS 隔离反例为 **FAIL**。这不是生产 Worker 的跨账户拒绝试验。Host-only 服务/账户、受保护 ACL、固定可信启动链和 OS 认证 IPC 尚无闭合部署证据。

本轮桌面仅验证合成 Host 库、UI 桥接和接口纪律，不能修复或覆盖上述同 SID 反例。**Credential Service、真实 Key 录入和 LIVE 仍为 BLOCKED**；不得因本地测试通过、使用 DPAPI 或界面显示 Host ready 就改写为生产资格 PASS。历史 CPU/PROCESS/EXTERNAL_EFFECT/Storage 等未获资格的门也不在本审查中解除。

## 修复后独立复验

四项修复后的完整复验候选服务 SHA256 为 `908267705cafb35f1f8d1073e4b3df97b7d7f793817b7127422ee26494ac8cea`，重读/测试后复算一致；桌面单测文件为 `3619ffe00c03b479ede59139b80d31eec547aae0257345b2d39657ab017eb050`，Vault 保持初审 SHA 不变。主代理新增宿主共享名额、持久逻辑请求/尝试记录、非终态恢复、严格 NOT_SENT 备用尝试、关闭门和可信 HTTP 状态映射。该候选服务单测由审查者独立执行：**13 PASS / 0 FAIL / 0 SKIP**。随后仅有下面记录的最终差异，不冒称 13 项在最终哈希上重新执行。

同一探针独立复验结果：

| 项目 | 修复后观察 | 裁定 |
|---|---|---|
| UI-IR-001 共享并发 | 6 个不同 Agent 并发提交，仅 4 个进入 Transport，另 2 个 HOST_BUSY；放行后已进入的 4 个全部成功 | FIXED_VERIFIED |
| UI-IR-002 安全关闭 | 在途时 close 返回 HOST_BUSY；原请求随后 SUCCEEDED；结果完成后再次 close 成功 | FIXED_VERIFIED |
| UI-IR-003 发送前备用路由 | 主 Key 达到 RPM 后第 2 次请求由 backup 成功；总发送 2 次；新增单测同时核对 NOT_SENT 记录及共享用量 60 | FIXED_VERIFIED |
| UI-IR-004 403 分类 | 实际 `connection.test` Gateway 路径得到 UNAUTHORIZED；不返回远端正文 | FIXED_VERIFIED |
| UNKNOWN + failover + reopen | 不完整响应返回 INDETERMINATE，Provider 仍为 primary；重启后发送次数仍为 1，held=4528、UNKNOWN 记录=1、主 Key in_flight=1 | PASS，合成范围 |
| IPC 发送方纯函数 | 正常主帧接受，其他 contents、子帧对象与错误 URL 拒绝 | PASS，纯函数范围 |
| setModels | 伪造 admin=VAULT_ADMIN_REQUIRED；非法范围=VAULT_INVALID_SPEC；旧模型新租约=VAULT_NO_ELIGIBLE_KEY；新模型新租约接受 | PASS，合成范围 |

初审反例由工具输出整理到 [initial-observations.json](../evidence/independent-review/initial-observations.json)，其 provenance 明确说明是原始输出记录而非修复后重跑。两轮修复后执行分别保存在 [第一轮观测](../evidence/independent-review/observations-2026-11-08T13-25-32-811Z.json) 和 [含 UNKNOWN/重启的最终观测](../evidence/independent-review/observations-2026-11-08T13-27-50-027Z.json)。[可重复探针](../evidence/independent-review/probe.mjs) 可在同一候选上复跑。

恢复代码已语义复查，完成结果后的 reopen 与 UNKNOWN 占用恢复均经合成实测；审查者未执行进程硬退出窗口或生产 Host 身份重启试验，不扩展该证据边界。根治理结果由单独检查附证，不把本报告先行当作治理 PASS。

## 最终小范围差异复核

固定路径/profile 差异候选服务 SHA256：`6fb14b1803bbb4817731fe9ca6fa238e46ce24541281b4a4e96a32c362ab2b72`；`desktop/main.mjs` SHA256：`4491a6d363d5a4202ff7a67819526afdde1d95cef5d7c8fc00f5585b97b388c8`。本次只复核该差异，并对 main 执行 `node --check`（PASS），未重跑完整套件或另启动治理遍历。随后 TIMEOUT 补充的最终服务哈希见下一节。

- 服务选择 PowerShell 时只使用两个固定绝对路径：优先 `C:/Program Files/PowerShell/7/pwsh.exe`，不存在时回退 `C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`。该参数不来自 Renderer、IPC payload 或 PATH 查找；现有 DPAPI helper 继续通过 `shell:false`、隐藏窗口和匿名二进制 pipe 启动。固定路径选择不等于已验证可执行文件/helper 的生产 ACL、签名/哈希或 OS 身份启动链。
- main 在 `app.whenReady()` 和 defaultSession 使用前，把 Chromium userData 设置为当前数据根下的 `chromium-profile`。该目录选择没有增加凭证读取 API，也不改变 Key/Vault 与账本接口；它不提供同 SID 的文件访问隔离，也不构成浏览器缓存不存在敏感数据的生产资格证据。
- 原生关闭顺序为等待 `host.close()` 成功、撤销 Operator、再 `app.exit(0)`；Host 忙或关闭拒绝时继续原有重试。该修改保持先持久化再退出的顺序，没有先退出后补写结果的路径。

独立把这几处差异反向移除后，服务复算恰为前述 `908267...8cea`，main 复算恰为前一轮 `104e543056a9684372056731c539614a8aab48f7f5c1048ed9f26bdb739048ad`，确认没有夹带其他源码变化；机器记录见 [final-delta-review.json](../evidence/independent-review/final-delta-review.json)。该范围未见新增阻断，四项 FIXED_VERIFIED 状态保持。

主代理报告合成 DPAPI protect 与 Electron Key 保存/轮换已成功；本次短复核未独立重跑该 UI 流程，不将主代理结果写成审查者的独立执行。历史同 SID 解密反例依旧为 FAIL，生产 Credential Service、真实 Key 录入和 LIVE 仍为 BLOCKED。

## TIMEOUT 最终差异复核

TIMEOUT 补充候选服务 SHA256：`aea196b41972083d03adc39ab7ce210ceab4836b15aeeb5a3ddc088826689637`；该轮 main 保持 `4491a6d363d5a4202ff7a67819526afdde1d95cef5d7c8fc00f5585b97b388c8`；最终桌面测试文件 SHA256：`d009f27f0817b04081db73f0e3cf11528a7a0608f47c8b0be31d50225c8fd8a9`。

审查者只复核新增差异，并独立执行新增定向测试：

```powershell
node --test --test-name-pattern 'deadline is displayed as TIMEOUT' tests/desktop/service.test.ts
```

结果 **1 PASS / 0 FAIL / 0 SKIP**。30ms 的本地挂起 FixtureTransport 经实际 `connection.test` 路径显示 TIMEOUT，`simulation_passed=false`，Transport 调用仅 1 次，未知用量占用大于 0；没有真实网络请求。最终 14 项完整测试由主代理运行，本次审查者未重复整套，不把此前 13 项结果改写成最终 14 项独立执行。

`timeout_ms` 仅为可信 Host 打开服务时的选项，整数范围 10–120000ms；正常桌面不传该选项，固定使用默认 10000ms。IPC 方法及 Renderer 表单都没有这个字段，不能由 Renderer 配置。`timed_out` 由 Host 尝试计时器到期、无调用方主动取消且 Gateway 原因严格为 `MODEL18_SENT_OUTCOME_UNKNOWN` 共同产生，再由连接状态映射为 TIMEOUT。该元数据不来自远端正文，不把超时变成已知未发送。

审阅确认备用尝试仍必须为 FAILED 且可证明 NOT_SENT；超时对应的 INDETERMINATE/UNKNOWN 保留账本和 Key 占用，不符合备用重发条件。反向去除本次差异，服务哈希精确回到 `6fb14b...2b72`，未见夹带其他服务变化。记录见 [timeout-delta-review.json](../evidence/independent-review/timeout-delta-review.json)。四项 FIXED_VERIFIED 状态保持；本轮没有新增范围内阻断，也没有解除同 SID OS 隔离 FAIL 或 LIVE/真实 Key 的 BLOCKED。

## 普通启动显示的最终差异

最终 `desktop/main.mjs` SHA256 为 `84eb4693009ffdbae0834a40d7adb2e9b822633e9a7c9a02432f864a5ef4825b`。服务保持此前 `aea196b41972083d03adc39ab7ce210ceab4836b15aeeb5a3ddc088826689637`；本次仅对 main 做只读差异核对，没有执行新扫描、测试或治理遍历。

唯一变动是在 `await window.loadURL(...)` 后增加说明注释，并对非 E2E 的普通启动显式调用 `window.show(); window.focus();`。该语句在页面加载完成后运行，不修改 IPC 来源判定、WebPreferences、凭证/网络接口、账本或关闭顺序。反向移除这两行后，main 哈希精确回到上一候选 `4491a6...88c8`；机器记录见 [visibility-delta-review.json](../evidence/independent-review/visibility-delta-review.json)。未见该唯一差异引入范围内阻断，四项 FIXED_VERIFIED 保持。

主代理报告已实际关闭旧实例并经普通启动器首次重开，主窗口可见且内容正确；这是主代理的可见性操作证据，本次审查者未独立重做。该修复只涉及普通桌面启动显示，不改变生产 OS 资格边界：历史同 SID 隔离反例仍为 FAIL，Credential Service、真实 Key 录入和 LIVE 仍为 BLOCKED。
