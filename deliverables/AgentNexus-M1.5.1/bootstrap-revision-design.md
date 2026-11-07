# Bootstrap 修订设计与验证

Host 入口仍为 source/src/agentnexus/bootstrap/entry.ts host；Worker launcher 走 launcher，同一路径必须传外置绝对 config 路径与外部受保护 SHA256。缺配置、pin、密钥、独立 SID、权限或组合资格都拒绝，不能填入当前操作者逻辑身份替代 OS Host。

| 启动步骤 | 来源与实现 | 当前裁定 |
|---|---|---|
| 外部配置与 SHA256/Schema | config.ts 精确字段、路径、版本、hash | PASS，合成/拒绝模型 |
| 程序与依赖指纹 | 完整 source_files、Node/PS/native/pins、保留文件/目录句柄 | 拒绝与 hash 原语 PASS；生产 protected pins BLOCKED |
| Host Runtime Identity | native 实际 parent PID/start/SID/session/token | 当前账户原语 PASS；独立 Host BLOCKED |
| 私钥与公钥匹配 | 实际加载 Host/Broker/Launcher 各自 key，pin/ACL 先行 | 合成 key 验证 PASS；生产 key 未部署 |
| Control/Policy/Broker | Host 控制平面、独立 Broker 账本、固定工具 | 模型 PASS |
| Named Pipe/Supervisor | Kernel Peer、Launcher challenge、MAC session | 同账户原语 PASS；跨账户 BLOCKED |
| 未完成 operation 恢复 | registry/authority/broker/reservation recover | SQLite/故障模型 PASS；真实 Host 重启 NOT_RUN |
| 启动审计 | OS_ATTESTED/READY，flush 先于高风险准备/执行 | 模型失败关闭 PASS；持续生产未验证 |
| 高风险资格 | M1.5.1 固定资源 gate 先于 claim/prepare 与 Broker consume/start | PASS，拒绝合成的有效签名 REAL 证书 |

Worker 的 Instance/Runtime/ProcessIdentity/ProfileHash、精确 workspace、capability、Operation 和 IPC session 绑定保留。原生路径使用独立标准 Worker launcher 自身 token，挂起创建零网络 capability AppContainer、restricted token、私有 Job，验证后绑定 Grant，再单次恢复。当前没有这些独立 OS 对象，不能把本账户合成进程说成生产 Worker。

Host/Broker 管理库、私钥、Admin Capability 不交给 Worker；输入经 File Broker 双签名/hash，Worker 只做固定摘要；没有通用宿主 shell Adapter。Supervisor 未实测的 network/filesystem/limits 仍 false。关闭/撤销身份仅中止链路，不释放五类资源；旧 boot 和不确定 START 保守隔离，无自动副作用重试。

本轮只强化资格与观察，不替换已有身份/Permit/加密原语。完整部署要求见 deployment-approval.md；基础对象批准不会解除资源门禁。
