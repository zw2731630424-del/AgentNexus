# Broker / IPC 验证报告

生产 Broker 唯一应用执行路径：Agent facade → 精确审批/原 Permit → signed Grant → MAC endpoint → Broker 账本单次消费 → Supervisor。旧 Gateway 对 PROCESS/EXTERNAL_EFFECT 始终拒绝。Host prepare 与 Broker admit 现在还受固定资源失败门禁约束，外部 Harness 的原语测试不是可用的生产 Adapter。

| 边界 | 当前证据 | 资格 |
|---|---|---|
| 长期 endpoint、双向多帧 | copied-runtime 下真实 Windows pipe，连续交换与 peer recheck | PASS，同账户原语 |
| 精确 DACL / first-instance / remote deny | 原生 CreateNamedPipe 与 descriptor readback；owner/client mask 分离 | PASS，descriptor/first-instance 原语；跨 SID 有效拒绝 BLOCKED |
| Peer SID/PID/start/session/image/hash/token | 保留进程/镜像句柄；逐帧核验，伪造拒绝 | PASS，真实同账户 Peer |
| 长度、deadline、关闭撤销、四连接/owner quota | 过长输入/输出、timeout/EOF、并发占满/复用槽实际测试 | PASS，真实原语 |
| MAC/nonce/epoch/deadline/instance | 认证 session 与 endpoint、断连重放和参数改变拒绝 | PASS，crypto/SQLite 模型；生产组合 BLOCKED |
| Permit operation/intent/resource/worker/profile | 原始 Permit 原子 transfer、精确字段绑定/nonce、双账本一次消费 | PASS，模型与本地进程；真实跨账户闭环 BLOCKED |
| Broker 独占高风险入口 | 独立 probe：有效签名 REAL 证书仍在消费前被拒；原 Gateway 执行次数为 0 | PASS，失败关闭模型；生产执行未启用 |

测试 runtime 只复制现有 PowerShell 658 个文件，逐 SHA256 比较完全一致。原 WindowsApps 镜像在按目录句柄逐层固定时 NtCreateFile 返回 ACCESS_DENIED，因此之前多个“pipe access denied”skip 的笼统诊断不足以证明是 pipe ACL 问题。本轮没有为通过而添加能力 ACE、放宽 DACL 或取消 image anchor；同样代码和权限要求在正常测试副本路径运行。copied runtime 的默认 DACL仍不是生产部署 ACL。

同账户 client SID 同时也是 owner full-control SID，故 descriptor 中去除 create-instance 位并不能证明该 SID 的有效创建实例权已撤销。必须使用真实不同标准 SID 再验，这个测试显式 BLOCKED。原正向 protected pin 也因 Node 现有 inherited DACL 不受保护而 NOT_RUN，不能改现有安装 ACL。

任何原 Permit、Operation、intent、resource、worker tuple、profile hash、epoch、expiry、MAC/nonce 或消息字节变化均拒绝；IPC 断开关闭通道，不恢复旧授权。真实生产密钥/账户/Profile/Task 和 full bootstrap 未部署，因此 PROCESS/EXTERNAL_EFFECT 不放行。
