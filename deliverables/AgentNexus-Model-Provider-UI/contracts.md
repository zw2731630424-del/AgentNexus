# Desktop / Credential Service IPC 合同

版本：`agentnexus/desktop/1`。当前部署：本地合成预览；真实凭证和 LIVE BLOCKED。

## 传输和身份

唯一通道为 `agentnexus:desktop`，返回 `{ok:true,value}` 或 `{ok:false,error:固定错误码}`。无通用 HTTP/文件/任意 shell/任意 IPC 路由。真实 Electron event 的 sender、mainFrame、精确 URL 必须同时匹配 Main 创建的窗口。载荷不得包含 role/identity/admin 等额外字段；它们不会成为凭证。

通过来源检查后，Main 使用闭包内 Operator 对象能力调用 Host。Operator 可撤销；Agent/Subagent 只获 `complete(text)`，没有管理 invoke、secret、readKey、Vault/admin、transport 或账本对象。此库边界与实际 Electron 来源验证均不替代尚未通过的 OS 跨身份部署。

## 方法

| 方法 | 请求重点 | 返回/约束 |
|---|---|---|
| snapshot | 空对象 | Registry、Provider/Model 配置、Key 元数据、绑定、账本投影、资格状态；不含秘密 |
| provider.save | id/name/preset_id/protocol/base_url/enabled/revision | 稳定 ID；新建 revision=-1，编辑必须匹配当前 revision；HTTPS URL 禁止用户名、密码、查询/fragment、完整 completions 路径 |
| provider.delete | id/revision | 先删除 Key，解除默认/Agent/Task 引用；关联模型墓碑 |
| model.save | provider_id/model_id/name/enabled/context_tokens/output_tokens/capabilities/revision | 原始 wire ID 与内部 ID 分离；上限验证；不能由载荷标记 VERIFIED |
| model.delete | ref/revision | 引用中的模型拒绝删除；同步 Key 新租约范围 |
| model.default | provider_id/ref | Provider 默认，实际参与继承路由 |
| credential.save | provider_id/name/notes/secret:Uint8Array/max_concurrency/requests_per_minute/rotate_id? | 单独秘密输入合同；仅 synthetic-test- ASCII 合成值；返回 stored/key_id/classification，不返回 secret |
| credential.state | key_id/enabled | 撤销后新请求拒绝；INVALID/QUARANTINED 等不得直接重新启用 |
| credential.delete | key_id | 先撤销新请求；INFLIGHT/UNKNOWN 阻止物理删除；保留审计 |
| connection.test | provider_id/model_ref/mode | LIVE 资格拒绝时不发送；SIMULATED 通过 Gateway/四级预算/本地 transport，不能设置 CONNECTED |
| binding.save | agent_id/primary/fallbacks/auto_route/failover/budget_tokens/revision | 写入现有 Router 的实际策略，保持 Subject/权限；平台上限固定 |
| selection.save | agent_id/ref 或 null | 当前 Task 覆盖；null 恢复继承 |
| preference.save | favorites/default_model/revision | 收藏、全局默认；最近使用由实际成功结果写入 |
| chat.send | agent_id/text | 当前合成 completion；上下文仍经过 Guard/ContextAssembly/ModelGateway |

完整字段及数值验证以 `source/src/agentnexus/desktop/contracts.ts`、`service.ts` 为准。未知方法、额外字段、陈旧 revision 与撤销 session 均拒绝。写操作串行，读取可在进行中的操作间刷新；所有模型入口另有共享四名额。

## 凭证生命周期

1. 密码框默认隐藏，可显示/隐藏、粘贴、清空；DOM 不以模板/属性缓存输入值。
2. 提交时直接从输入框编码为字节，立即清空并重新隐藏。该输入没有 form name，不进入 FormData。Renderer 状态、LocalStorage、日志与聊天上下文不保存值。
3. Preload 只走本地受控 IPC；Host 在 Vault 导入前拒绝非合成值。没有批准真实 Key 的隐藏开关。
4. 新字节只进入 CredentialVault 的独立秘密参数；业务配置、Model Gateway 请求和 Agent Runtime 只使用 key handle。
5. Host、Preload 和 Renderer 的可变字节副本在退出路径清零。JavaScript 输入字符串/GC 的内存副本不能作可证明擦除承诺。
6. Vault 密文提交及元数据审计成功后才返回 stored=true。失败保持失败状态，输入清空，用户需要重新录入；不取回已存明文。
7. 轮换使用新 key_id，旧 Key 撤销新租约；进行中的 UNKNOWN 不重放、不释放占用。删除与状态变化先记 INTENT，再操作 Vault，再记完成；跨库中断不会被视作已确认成功。

## 连接状态与 Usage

状态枚举包括 CONNECTED、INVALID_KEY、UNAUTHORIZED、RATE_LIMITED、PROVIDER_UNAVAILABLE、INVALID_ENDPOINT、MODEL_UNAVAILABLE、TIMEOUT、INCONCLUSIVE、NOT_TESTED。连接状态与配置保存分离。当前合成成功为 `status=INCONCLUSIVE, simulation_passed=true, assurance=SIMULATED`，模型为 SIMULATED 而非 VERIFIED。可信 HTTP 状态元数据区分 401/403；不返回远端错误正文。

Usage 全部由 Host 从 CampaignTokenLedger、ModelUsageLedger、现有请求记录聚合，前端仅格式化数字。返回 Provider/Model/Agent/Task 分组、input/output/cache/reasoning、请求/失败、已用/held/remaining、估算费用与 actual=null。真实与合成分开，不能以合成流和测试费用证明真实 API 或账单准确性。

## 后续生产资格接口

当前没有可切换为 LIVE 的 UI、真实 Key 导入或由 Renderer 选择 Transport 的接口。生产服务的固定身份、受保护代码/ACL、OS 认证 IPC、可信录入、跨 Worker/Subagent/Reviewer 实际拒绝、撤销/轮换/重启与唯一账本证明须独立部署验证；之后才能连接真实 ProviderAuthorizationBook、DataEgressPolicy 与 QualifiedHttpsTransport。不能只将 qualification 标志设 true。
