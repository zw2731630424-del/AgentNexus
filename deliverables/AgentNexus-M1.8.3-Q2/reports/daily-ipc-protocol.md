# Daily Gateway IPC 候选协议

**协议可在合成服务内执行；生产 Medium 通道 BLOCKED，未创建 listener。** 这份合同不把一个尚未实现的 native 认证器描述成现有功能。普通 `connectCredentialService()` 不 spawn High client、不触发 UAC，返回带不可用 Usage 的阻断投影。

## 接口分离

拟议普通通道仅 `snapshot`、`daily.prepare`、`daily.execute`、`request.cancel`、`stream.ack`。没有 credential.*、budget.configure、文件、Vault、解密、命令、权限、任意 HTTP 或授权签发入口。当前可执行入口为独立子进程的私有 inherited fixture IPC，测试方法 synthetic.* 只在该明确 CLI 模式存在。原 High 通道仅 helper 管理白名单，不是 Daily 回退。

帧 `{id,method,params}` 上限 1 MiB，execute 输入上限 1 MiB；准备和执行参数严格为 `{input}` / `{input,grant}`，未知字段拒绝。下游 request 只允许固定 POST DeepSeek endpoint、固定 headers、规范 JSON/SSE 和 deepseek-flash 执行；Pro 仅保留凭证模型范围。正文≤256 KiB、输出≤4096、并发≤4、默认 deadline 30 秒且上限120秒；无任意 URL/Header、redirect、proxy 参数或自动重试。价格/能力来自原受信 Registry，真实有效期到期会拒绝，不使用调用方价格。

## 认证与授权是不同条件

真实实现须从 native 取得活着的受保护 Runtime 及真实连接关联，并保留 OS 句柄/创建时间、当前 token、进程/线程/token 对象保护与继承证据。不能将 payload.peer/native_verified 或请求 Subject 变成这个关联。当前根本没有 production factory；任意把 JSON 字段设 true 都无效。Fixture Runtime UUID 由服务端测试 authority 建立，只证明协议状态机。

Egress consent 也不能由普通 Host/Agent 签发。生产沿用受保护外部 CMS 的精确请求审阅入口；本轮无 consent，REAL/LIVE 仍封锁。合成 `authorizeSynthetic` 是测试权威，绝非 PUBLIC 自标记权限。最终 inspectFinalRequest 在 prepare、execute、解密后的发送 fence 重验完整正文和来源。

## 精确 Grant

`agentnexus.daily-grant.v1` 持久保存于唯一 ServiceStore 的 daily_grants。Grant 不是独立 bearer 权限，完整字段必须和实际 channel/runtime、服务持久记录一致：

|字段|来源与验证|
|---|---|
|grant_id / service_instance|服务产生随机 UUID；旧实例拒绝|
|runtime_identity / channel_binding|服务持有的 Runtime 关联、实际 channel、instance、epoch 的 hash；不取请求自报身份|
|subject_hash|服务登记的完整 Subject，含 Agent/类型、Project、Task、Session、Harness runtime_instance_id、policy_scope 等|
|input_hash|规范化完整 BrokerInput hash，覆盖模型元数据、正文、headers、完整 context、sources、requested token上限|
|token_budget|服务按正文 UTF8 字节+4096保守计算 input_limit，受限 output_limit 及合计；不用 Agent input_tokens 作预算依据|
|binding.request_id / operation_id|请求关联 ID、服务新 Operation；持久唯一约束|
|binding.agent_id / task_id / project_id|必须等于精确已审阅 Subject|
|binding.provider_id / model_id / credential_handle_id|受信 Registry、Key Pool 的当前服务 Handle，撤销/轮换时再 fence|
|binding.context_hash / request_body_hash|完整 context.text 和请求正文的实际 hash|
|binding.data_egress_decision / data_classification|服务持有的精确来源审阅记录；PUBLIC/SYNTHETIC 最终内容复检|
|binding.token_reservation_id|固定等于 request ID，链接唯一持久账本|
|binding.nonce / policy_epoch / deadline|服务 UUID、当前 epoch、短 deadline；Runtime 必须活得足够久|

原 BrokerBinding.runtime_identity 在复用层仍是完整 Subject 的 hash，仅表示协议关联。**它不提供 OS Runtime 身份证明。** 新 Grant.runtime_identity/channel_binding 另绑服务登记对象；生产对象来源仍未实现。不得混同这两个含义或以旧字段宣称普通 Host 已可信。

Grant 的规范化完整 hash 存于服务 DB；客户端改 Grant ID、任何 binding、input、budget、context 或 metadata 时均拒绝。未知 Grant 无记录就拒绝。旧请求 ID/operation/nonce 永久不能借取消、换 Key、Agent、Session 或重启复用。

## 原子消费、取消、恢复

daily_grants 的 ISSUED→CONSUMED，与 prepared nonce 消费、四级 Token hold 和 requests 插入在同一 SQLite 事务。预算不足回滚全部，不发出请求；请求记录与消费不能一边成功一边失败。同请求的 legacy Broker 入口若没有 Daily reservation 会被拒绝。

`request.cancel {request_id}` 对同 channel 活跃请求 abort；待发 ISSUED Grant 也可由原 runtime/channel 撤销。错 channel 不可取消。断线撤销该 Runtime 未用 Grant 并取消在途；重登记生成新 UUID、旧 Grant 不再有效。重启将所有 ISSUED 标为 REVOKED，已消费记录保留，RESERVED/SENT 转 UNKNOWN 并保留 Token 占用。

流输出单增量≤32 KiB，显式 seq ACK，10秒消费期限；禁止无界后台 pump。断流和 Provider Usage 不完整不会释放未知预算。审计只持久安全关联字段/Hash，错误使用固定码，不把正文、Key、Authorization 或外部原始异常拼进日志。

## 仍未解决

当前实现没有把 Development→Subagent→Gateway 接入可信 production Medium Runtime。尚无实际 OS 的同 SID 注入、句柄窃取、不同 SID、UAC 或服务隔离证据。合成 IPC/独立进程测试即使全部通过，最终第9—23项标准仍不得标 PASS。[70项 OS 计划](../tests/windows-attack-tests.json)
