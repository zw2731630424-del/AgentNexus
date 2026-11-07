# Worker Bootstrap

Launcher属于可信的专用Worker标准账户，有限任务子进程属于Restricted Token+零capability AppContainer。二者信任级别不同：不可信任务不能取得Launcher私钥、Host管理库、Admin capability、native RPC stdin或会话MAC密钥。专用标准账户中的Launcher/其native helpers属于TCB，任意同标准账户的恶意中完整性进程不在本沙箱能够隔离的范围；这个前置不能用解释器hash代替。

Launcher先验证实际SID/token/OS、不可变配置/代码/密钥ACL和指纹，验证Host真实pipe peer，然后对Host新挑战签名。PREPARE/AUTHORIZE/START都检查其本地enable_features。WindowsSupervisor创建挂起子进程，读回实际token、AppContainer、Job、三句柄继承，返回真实PID/start/session/parent。Host建立runtime/instance/project/task/session/profile绑定；审批/Permit在这之后消费。

Worker入口 worker.ts仅接受固定public-key路径/hash，通过私有继承stdin接收<=16KiB规范JSON的单次签名引导。核对签名、期限、实际PID、tool/version及arguments hash。当前固定工具nexus.digest支持<=8KiB inline bytes或<=4KiB精确版本文件摘要；不接受shell、可执行路径、通用命令、模块加载回调、覆盖或删除。

文件模式额外核对Host签名FileGrant和operation/runtime/instance/boot/project/task/resource/path/profile/epochs/expected hash。实际文件由Host FileBroker读取并校验后注入；Launcher与Worker分别验证，Worker不直接打开项目文件。输出有界且走Broker流式Artifact。

一次request结束即撤销runtime并清理在线绑定；撤权只表示不能授权，不表示完整进程树已退出。正常可观察root/job/producer结算后关闭临时helper/内存映射；持久UNKNOWN资源保留。实际跨账户签名Worker进程启动仍需部署授权及组合测试；当前验证含模型函数/真实密码学，不能标作生产Worker PASS。
