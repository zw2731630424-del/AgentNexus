# M1.4 执行合同

M1.3 IPC v1的规范JSON、HMAC-SHA256、64KiB帧和四字段Logical Identity继续使用，不接受payload SID/PID作为内核peer。角色只在内部runtime合同中，AuditInput显式投影四字段。真实PeerObserver只能由可信bootstrap绑定；模拟provider明确SIMULATED。

## 授权桥接

ProductionGateway的审批hash为原intentHash加固定execution target的hash，target含runtime/worker/boot/generation/process/start/session/parent/profile。Grant使用Ed25519签名，绑定operation、intent、logical identity、runtime、worker instance、Host/Broker boot、generation、process、parent、Tool ID/version、精确resource、profile hash、policy/feature epoch、issue/expiry、nonce和arguments hash。原Approval及Permit在Host同事务消费，五种claim与审计同事务；flush成功且最终身份/期限/epoch fence通过才发签名Grant。

Broker只持Host公钥与单独KernelStore，不持Host管理数据库句柄。对真实peer和Grant逐项检查，独立账本中operation/permit/nonce/runtime/request均唯一；先消费再durable START_INTENT，Supervisor ready、Host fence、peer及更早的Envelope deadline在恢复前重新核验。所有远程期限同时有墙钟高水位与单调锚；小幅回拨也拒绝。消费后超时、断连或未知不重放。账本满时拒绝，不淘汰nonce以开放旧请求。

服务循环最多16个请求；Endpoint最多32连接/32未settled观察；Identity最多32预备请求/32未settled观察；File Broker最多8个请求/8个未settled原生观察。超时只取消，不凭Promise返回认定原生工作停止，不无界补发。

## 原生两阶段

NativeRuntime的prepare创建挂起进程，显式继承3个标准句柄，Token详细读回，Job限额读回、加入并核验后，返回真正PID/start/token identity。原进程句柄及映像/目录句柄一直保留。Host据此建立Runtime和Grant；ready再次观察；resume只消费一次prepare_id并核对真实进程/token/Job。prepare TTL和数量有上限，未恢复的过期/终止项不能执行。生产路径绝不转primitive；primitive只供固定合成夹具。

原生Launcher必须已在批准的Worker标准身份中；不接受Host同SID、管理员/提升token、已有宿主AppContainer替代本项目profile。仅派生SID不创建profile；实际启动还核对Worker hive中已有profile。stderr/stdout以4KiB事件帧同步背压，NativeClient单帧有界，OutputChannel最多一块，最终流式ArtifactStore有总量和取消合同。关闭helper是终止请求，不是全树退出证明。

## 文件合同

FileGrant另签名，绑定operation、runtime/instance/boot、project/task/resource/profile、相对路径、READ/CREATE/SUBMIT、版本hash、内容hash、最大字节、nonce、epoch和期限。CREATE在首个await前复制有界内容；进入原生提交微任务前再fence，返回hash再次比对签名内容。只新建，覆盖/删除默认拒绝。

Native File Owner从drive锚逐组件用目录句柄和NtCreateFile相对打开，拒绝reparse/junction/ADS/device/UNC/hardlink，祖先句柄不分享write/delete，核对最终file ID/link count/hash。当前文件RPC限制24KiB；更大文件经此接口拒绝，不宣称具有大文件流式文件句柄协议。Artifact/output本身另走流式Store。读取也有授权和RESULT审计，记录实际file ID/版本hash/Artifact。

## 退出与释放

Proof v2分别记录termination、root exit、tree empty、每成员父链/创建身份/句柄、stdout/stderr producer EOF、sandbox状态、boot/profile/worker/operation、qualification和evidence hash。成员父链必须有限地走到唯一root；本地parent存在不能替代完整树。当前native采样历史不完整，始终membership_complete=false；WindowsSupervisor保留unknown_members=true及未实测network/filesystem/完整limits=false。结果因此EXIT_UNVERIFIED，不能生产释放。

Host只接收固定Broker公钥签名的proof，将Broker Artifact流式导入自身Store并校验hash/bytes；导入与send受同一取消/截止。Owner release要求当前boot、非UNKNOWN操作、真实完整proof、独立非UNKNOWN最终裁定，以及五资源精确版本快照。原M1.2 prepare/commit再次校验并原子消费receipt、释放Writer和其他四资源。模拟proof永无生产释放权。重启将远程executor保持UNKNOWN，不从本地库缺少START_INTENT推断NOT_INVOKED。
