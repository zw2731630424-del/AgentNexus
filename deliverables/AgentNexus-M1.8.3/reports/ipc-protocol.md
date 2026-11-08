# IPC 协议与授权

外部：固定 `\\.\pipe\AgentNexus.Credential.v1`；显式 DACL、拒远端、first-instance 防抢占；每连接读取消息后 impersonate 真正 token，核 operator SID/elevated/high/non-AppContainer，再核固定 pipe-client 进程句柄、创建时间与保护镜像。客户端独立核 SCM 服务 PID、服务 SID/session0、镜像和创建时间。SID/PID/路径不是单独授权因素。身份来自 native wrapper，不接受 payload.peer/role。

请求 `{id,method,params}`；native 内部 `{channel,peer,request}`；响应 `{id,ok,value}` 或固定错误码与有限 http_status/sent/timed_out/partial；流式事件 `{id,event:"delta",seq,text}`，客户端逐次 `stream.ack`。每帧≤1 MiB；服务最多4连接/4在途，单条增量≤32 KiB，等待 ACK≤10秒，禁止后台无界 pump。已知 Key 的最长编码变体保留在服务 lookbehind 中，跨语义 delta 扫描，且不拆 UTF-16 surrogate。断连取消上游，部分结果与 Usage 不确定保留占用。

允许管理：snapshot、credential.prepare/save/state/delete/models、budget.configure。Provider：broker.prepare、broker.execute、request.cancel、stream.ack。普通 Preload 仍只暴露原页面有限方法；Agent 只有原 Gateway scoped complete，没有通用 invoke。无 read/export/decrypt、任意文件、Node、URL 或 auth-header 方法。只有明确合成进程/签名资格测试模式可用 synthetic.* Fixture 方法；REAL 没有此审批入口。

Save Credential 的原有点击在内部先取得30秒单次导入ticket，绑定真实native channel、operation、metadata hash、secret SHA和epoch；输入界面无需新增认证步骤。提交消费ticket，异步DPAPI加密完成后在Vault写事务前再次fence；断线撤销未完成票据，重启旧票据不存在。真实IPC不能走无ticket的直接合成单测入口。管理RPC id另有持久唯一claim；所有凭证拒绝审计只保留安全字段/固定错误。已知和本次新Key的原文/编码变体均在审计intent前扫描，调用者operation原文不落审计。

最终执行绑定全部字段：request_id、operation_id、agent_id、runtime_identity、task_id、project_id、provider_id、model_id、credential_handle_id、request_body_hash、context_hash、data_egress_decision、data_classification、token_reservation_id、deadline、nonce、policy_epoch。prepare 在服务持久化整份 binding hash；reserve 同事务比对并消费 nonce，不能用 null/替换 Handle 绕过已冻结选择。请求/operation/nonce 有唯一约束；未知结果禁止重试。

REAL review 由固定 native `--attest-consents` 核 CMS 文件导入，绑定主机/服务/epoch/有效期和独立用户引用；服务重新检查完整 body/context/source/schema。客户端不能创建批准。当前没有签名计划、资格或请求 consent。
