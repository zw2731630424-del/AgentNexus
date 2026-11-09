# 回滚步骤预验证

**只读步骤复核已完成；真实回滚演练 NOT_RUN。** 目标服务、安装根、数据根和 pipe 均不存在；当前无 Q1 服务进程可停止或 SCM 登记可撤销。没有执行 stop/delete，也没有为了演练而先安装服务。不存在的对象不构成真实恢复 PASS。

|阶段|批准部署后的精确动作与成功证据|
|---|---|
|冻结观察|记录已启动实例的 SCM PID、创建时间、Job、Node/helper PID/创建时间及目标 pipe；读完 Vault/Ledger/Audit 的保留清单。仅纳入本次新增 Q1 对象|
|停服务|只向 `AgentNexusCredential` 发送 STOP；等待 SCM STOPPED，核原服务实例退出，不把命令返回或停止请求被接受当作退出证明|
|核子进程|核对应 Job、Node、DPAPI/attestation helper 全部退出；不得按镜像名称杀所有 node.exe/electron.exe。出现孤儿/UNKNOWN 立即记 FAIL，保留现场并按原批准范围处置|
|核 IPC|确认目标服务的 pipe 句柄关闭、名称不存在；若同名对象出现，辨认真实实例，不能凭列表同名误判为原服务仍活跃或安全恢复|
|保留数据|原地保留合成 Vault、qualification ledger、原 REAL ledger（若已有）、WAL/SHM/journal、审计、受保护 temp 证据、原程序/ACL、VSA profile/DPAPI 状态；记录最终 hash/逻辑完整性，不重新初始化|
|解除 SCM|只有该项被最终用户批准时，撤销本次新建的 `AgentNexusCredential` SCM 登记；若标记删除未完成或尚有句柄则等待/记录，不清理其他对象|
|再次观察|重新只读核服务已注销、精确进程退出、pipe 关闭、保留数据仍存在、used/held/UNKNOWN 未被重置；原历史指纹未变|

停止和仅撤销登记的命令形状分别为 `sc.exe stop AgentNexusCredential`、`sc.exe delete AgentNexusCredential`；这里是审阅文本，没有执行脚本。二者均要求最终批准范围包含该动作，执行者具备相应服务控制权。

不执行目录/程序/账户/profile/ACL/LSA 权利删除或撤销；不运行 Remove-Item /rd/rmdir、预算 genesis SQL、清空数据库或批量进程终止。任何此类后续清理另获明确批准，不由回滚默许。

与源码核对：OnStop/OnShutdown/异常路径设置 stop、关闭 Job、取消 pipe 并释放安装文件锁；Job 配置 KILL_ON_JOB_CLOSE。该静态路径和微软 API 语义不能替代真实 SCM/嵌套 Job、挂起 DPAPI helper、崩溃和重启演练。回滚/崩溃试验见 [Q1-OS-21—24](../tests/crash-recovery-tests.json)。

部署门禁保持 NO-GO；将来必须在合成范围内实测这些步骤并由独立审阅者核对，才能回答“回滚是否安全”。
