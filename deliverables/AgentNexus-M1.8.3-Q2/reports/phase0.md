# Phase 0：基线与当前调用链

起始 HEAD `e0604475b03d3d9ba6558601fe07b10d900cc262`，起始 git status --short 无输出。原 M1.8.3 225源码集合 SHA256 `108e724d0b5796f472d5eb46a9088c556f04084c4bca0dad9bceb9a691d0090a` 逐项匹配；冻结 M1.8.3/Q1 共468个非生成交付文件，原始同 SID 解密 FAIL 复制保留但不覆盖原证据。[完整冻结记录](../evidence/baseline-freeze.json)

根 AGENTS.md 已读取；project-rules/README.md 不存在，policy.registered_rules 为空。工作流路由没有匹配的项目类型流程，未启用增强模块、改规则或整理旧文件。Q2 所有新增源码、测试、报告在独立 deliverables/AgentNexus-M1.8.3-Q2；任务与临时数据分别归原规范路径。原 UI、Vault、Gateway、Adapter、Router/Runtime 源码作为基线复用。

读取范围包含用户指定的 README/完整验收、Q1 ui-ipc-decision、Service设计/IPC/部署审批与runbook/威胁模型/同SID根因/独立审查；Vault/DPAPI、全部 Credential Service TS/native、Electron Main/Preload/Renderer/desktop服务、Model Gateway/Adapter/Router、Ledger/Campaign 与 Egress/最终审阅。分工读取与后续审查不能代替实际 OS 资格。

原调用链：Electron Main 启动普通 pipe-client --stdio → client 首先 RequireOperator(elevated/high/非AppContainer/固定operator SID) → 固定 High pipe → 每消息 impersonate/token/进程与SCM校验 → 服务 Node engine → CredentialBroker → Vault/Egress/ServiceStore。普通 Host 不会因 spawn 自动取得提升；snapshot、credential.*、budget.configure、broker.prepare/execute、cancel/stream ACK 全依赖原 High 通道。原 ProgramData 受保护 desktop profile 也不适配普通 UI 写入。

Q2 将普通 profile 放到 AppData，凭证管理改用独立 helper；普通 Host 不再启动旧 High client。Daily生产认证链缺失即返回IPC_BLOCKED；合成链单独受测。

2026-11-09 13:13（Asia/Shanghai）只读宿主采集：collector PID6816、Medium8192、elevated=false、非AppContainer；Explorer PID14652与历史 UI Main PID56992也是 Medium/未提升。旧 UI 镜像来自 AgentNexus-Model-Provider-UI，不是新 Q2 原生窗口。沙箱 collector PID28748 为同SID Low4096/AppContainer，单独记录，不能冒充普通Medium攻击者。

目标 AgentNexusCredential 服务、受保护安装根/数据根和目标 Named Pipe 均未发现；sc查询1060，实际服务Token、实际pipe DACL/ML无对象可测。High SDDL/ML来自源码，不能作为本机配置事实。父目录真实ACL只读记录，SACL/ML未启用权限读取。没有安装、提权运行或系统修改。[宿主原始预检](../evidence/preflight-host-medium/preflight.json) · [实际进程Token](../evidence/preflight-host-medium/actual-process-tokens.json) · [实际ACL](../evidence/preflight-host-medium/actual-acl-sddl.json)

同 SID 历史失败仍为 ISOLATION_FAIL：DPAPI CurrentUser 属于交互用户，其他同SID进程已成功解密合成密文；新服务方案尚无真实身份隔离证据，不能关闭旧反例。
