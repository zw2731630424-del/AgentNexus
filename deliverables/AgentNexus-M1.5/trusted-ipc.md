# Trusted IPC

BootstrapNative.cs新增长期Named Pipe owner；最多4端点、4连接、4 pin leases、8未完成native请求、128 helper lifetime opaque IDs。二进制帧4字节BE长度加<=24KiB payload，native RPC总帧<=64KiB。FIRST_PIPE_INSTANCE、REJECT_REMOTE_CLIENTS，server full rights，独立client具体0x0012019b，排除FILE_CREATE_PIPE_INSTANCE=4；实际DACL读回。test路由不产生生产资格。

双向kernel peer PID/session、固定进程句柄、创建时间、实际SID/token、映像路径/hash均重查；生产标准peer拒绝AppContainer/elevated/admin组。所有生产pin批次均复验/续idle lease，任一失效锁定；父Node死亡watcher终止helper。helper死亡只代表终止请求，不能替代ExitProof。

Host先验证Launcher Ed25519 enrollment挑战证明，绑定实际双方tuple、owner、配置、完整源码、helper及新nonce，然后才在已经认证的私有连接传送随机MAC key。key不进入argv/环境/日志。后续规范JSON/HMAC覆盖direction/session/sequence/nonce/issued/expires/request/operation/kind/payload，墙钟回拨锁定与本地截止、nonce不淘汰复用，4096消息上限，错误/超时关闭连接，禁止自动重放。

NativePipeChannel共享有界RPC串行门，peer监控与输出写入不能争用单飞NativeClient；最多一项上层RPC，帧有背压。Host对管理端点另验固定Operator SID，该端点不接Worker identity字段作为管理身份。

当前AppContainer宿主拒绝精确user-SID-only pipe正向连接；已保存NOT_RUN，未添加capability ACE或放宽权限。实际first-instance、部分伪造身份/长度负例和父进程死亡观察为限定原语PASS；持续多帧、真实client-instance有效拒绝与跨账户组合尚未证明。

API依据：[微软Named Pipe具体访问权及FILE_CREATE_PIPE_INSTANCE](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)、[受限primary token启动](https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens)、[Task安全上下文](https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks)。本轮仅为新临时pipe赋予精确描述符，没有修改现有文件/系统ACL。
