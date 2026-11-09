# Q3 实现和复现入口

共享协议、Vault、Provider Adapter、Token Ledger、Data Egress 与 Audit 继续复用 Q2；没有新 Vault/Key Pool/Policy Engine。258 文件源码副本与50项新增/修改的逐项 SHA 在 [source-changes.json](../source-changes.json)。历史目录没有覆盖。

生产 native 路径为 service → 固定同 EXE native Runtime → 私有继承 stdio → engine 的 DAILY_RUNTIME 信封。服务持有真实子进程句柄；创建时设置受保护 owner/DACL，最小继承列表和 kill-on-close Job。普通 SID、OS 服务身份、Runtime identity、逻辑 Subject 和具体请求 Grant 各自独立。服务端实际 Token 认证、不可从公开接口提交的 runtime/channel/expiry，加上签署 exact consent 和持久单次 grant 共同限制请求，逻辑 Agent ID 不授予权限。

原有 DailyGateway 增加 native 私有注册，绑定不可延长的 native 到期时间和签署计划 expiry。公开 Daily 只有 snapshot/prepare/execute/cancel/ack；输入变更、重放、cross-channel、过期和撤销均失败关闭。Native 60 个普通 + 4 个 cancel 位置、4MiB admission、单次实际 delta ACK 与有限 retired tombstone；engine 另限16/channel、64输出帧和4MiB。崩溃撤销 Runtime，不重发旧执行；client 只对只读 snapshot/新通道重连，execute 无重试。

生产 Helper 保留旧 Ticket/metadata hash/secret hash/epoch/operation/channel。新 Launcher 从受保护公开启动计划只读验证固定二进制，先确认同 SID split-admin linked token，拒绝标准用户借另一管理员身份。Helper 完整部署验证后、pipe/UI 前收紧自身对象 owner/DACL，并给服务查询位。不能由此宣称启动竞态、既有句柄、CLR/immutable string 或 dump 已绝对隔离。

合成路径使用服务创建的独立 Node Runtime 和实际 Named Pipe，另一个 pipe-client 进程为 UI 连接；Credential Service 和管理录入共享同一 broker/store。单独 WinForms 测试构建复用生产表单/事务，只接受固定 canary 和固定无网络 test root；其测试桥接不是生产 Main 的秘密隔离证明。完整 Electron E2E 中 Renderer 只有非秘密 intent，没有 Key 输入框。

实际联调关闭了三个组件缺口：Electron 与 Node 的 V8 advanced 序列化不兼容改为 JSON；本地模型配置 ID 与 Helper wire scope 映射在 Gateway/Router 边界统一，旧纯合成兼容路径保留；Helper 与 Node 的粗时钟误差通过精确 Windows UTC 修正，仍保持严格30秒票据上限。服务端预算在 UI 显式只读，普通日常通道不能改服务限额。完整测试通过后测试 Junction 增加非递归 unlink 清理，原拒绝断言保持。

本机复现需要 Node24.15、固定 C# Framework64编译器、已存在的 pinned TS5.9.3 / @types24.10.1 / Electron45.2.3 / Playwright1.65。未在本轮安装这些软件。源码可用既有 workspace toolchain；完整部署载荷独立包含 Electron/Node/应用，不依赖 dev node_modules。

```powershell
$env:AGENTNEXUS_POWERSHELL=(Get-Process -Id $PID).Path
$env:Q3_RUN_SYNTHETIC_HELPER_UI='1'
node tools/agentnexus/verify-q3.mjs
```

此命令必须由普通 Medium 会话执行才能做实际 UI；不 UAC、不部署、不接真实 Provider。输出写 `.workflow-kit/runtime/AgentNexus-M1.8.3-Q3`。测试不重置已有生产预算。`package-q3.py` 只为新空 staging 目录生成载荷/源码ZIP/审批候选，拒绝覆盖既有载荷；重建应使用新的审阅副本。正式安装入口和前置签发要求见 [部署审批](deployment-approval.md)。
