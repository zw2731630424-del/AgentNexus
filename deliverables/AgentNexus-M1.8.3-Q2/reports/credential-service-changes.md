# Credential Service 接口变更

仅改独立Q2候选，原M1.8.3与Q1冻结。原High pipe的名称、DACL、Mandatory High Label、remote reject与first-instance创建逻辑均未修改；没有新增或安装服务。

|入口|Q2行为|
|---|---|
|High native client|仅接受配置operator的真实elevated/high/non-AppContainer token和固定、manifest锁定的可信helper映像；不再允许通用pipe-client管理中继|
|High method白名单|snapshot、credential.prepare/save/state/delete/models、credential.ticket.cancel；native和Node双层校验，无broker/budget/HTTP调用|
|credential.ticket.cancel|精确ticket_id+operation_id、同channel，撤销ISSUED/COMMITTING；加密后最终fence拒绝已撤销票据|
|credential.save|复用原Vault与导入票据；生产Provider固定deepseek，轮换拒绝已ROTATING/QUARANTINED旧目标；无读回|
|snapshot|原五个顶层字段另加daily_gateway五字段明确BLOCKED状态；Helper/TS/C#实际JSON合同已交叉验证|
|daily.prepare/execute|只在显式私有合成worker内提供；精确服务持久Grant和同一Broker/Store，不是生产Medium接口|
|普通Host连接|不启动High client，不触发UAC；返回IPC_BLOCKED、Usage.available=false且未知真实计数null|
|budget.configure|普通/Helper通道均不开放；合成夹具可测试既有scope配置，不得清used/held|

schema增加daily_grants，所有事务由主执行者统一调整；未新建Vault或真实账本。未消费Grant在Store恢复时撤销，已消费和Token计数保留。正常Daily请求所需的可信native Runtime生命周期与传输未实现，不能以签发JSON或放宽pipe启用。

Deployment.Load新增helper/launcher完整SHA校验与锁定，CMS qualification必须同时绑定两Hash；required tests增加4个Helper专项。配置/qualification模板拟议epoch2；继承的空request-consents模板只是旧版封锁草稿，不是Q2批准文件。未来必须从当时实际Host/服务/epoch和精确请求重新生成签名consent，不复用模板或旧请求授权。

没有系统安装、签发、权限修改或真实请求。[部署NO-GO](deployment-approval.md) · [Daily合同](daily-ipc-protocol.md) · [独立审查](independent-security-review.md)
