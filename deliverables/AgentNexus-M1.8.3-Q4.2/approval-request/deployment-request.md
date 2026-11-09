# Q4.2 最终部署审批申请材料 — NO-GO

**实际安装尚未申请批准，INSTALLATION_APPROVED=false。** 本文件给出已知范围与必须补齐的精确字段，不是可执行批准。实际证书、Pin 和两份签名未提供，所以不能编造签发者、签名时间、最终候选 Hash 或部署 ID。

| 字段 | 当前值 |
|---|---|
| 模式 / 用途 | LOCAL_QUALIFICATION / QUALIFICATION_ONLY；唯一 documentSigning EKU |
| 签发者 / 实际 DER Pin | null / null；用户尚未独立选择 |
| 计划签名时间 / 部署批准签名时间 | NOT_RUN / NOT_RUN |
| 最终 installation manifest / plan / approval Hash | null / null / null |
| 最终 deployment ID / UTC 窗口 | null / null；实际新候选才产生 |
| 拟定新 epoch | 5；不接受 Q4.1 epoch 4 |
| 已观察的拟定目标 Host | DESKTOP-OSWALD，须用户重新独立确认 |
| 已观察的 Machine ID SHA256 | a013cd5e924eb5db1ba67eb28c65379f81b2d73f2cbd42fdb6645eb202681fe4 |
| 拟定 Operator SID | S-1-5-21-2532670394-1554971530-4095700938-1001 |
| 预计算 Service SID | S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873；未激活服务身份 |
| 文件范围 | 194 项；真实最终长度/Hash 由新候选完整重算，当前 staging 不构成批准 |
| 服务启动 | false，安装后保持停止 |
| real_import / live_provider / production_release / real_ledger_migration | 全部 false |

拟定安装只创建唯一 own-process / demand Windows Service `AgentNexusCredential`，映像固定为 `C:\Program Files\AgentNexus\AgentNexusCredential.exe`、无启动参数；身份为 `NT SERVICE\AgentNexusCredential` 虚拟服务账户、Session 0、sidtype unrestricted。不创建自定义账户、不授予登录/debug 权限。SCM DACL 固定 `D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;CCLC;;;AU)`。

程序根 `C:\Program Files\AgentNexus` 由 BA 持有，受保护 DACL：SYSTEM/BA FullControl，service/Users ReadAndExecute。数据根 `C:\ProgramData\AgentNexusCredential` 由 BA 持有，SYSTEM/BA FullControl，service ReadAndExecute，普通用户无访问；仅 engine/qualification/temp 状态子树授予 service FullControl。config、签名、计划与消费 receipt 保持管理员可写。receipt 先于 SCM 创建并消费 epoch，失败仍保留。已有根、服务或 receipt 拒绝接管或覆盖。

固定 High/Daily 管道、Helper/Launcher/Runtime 的运行属于之后的服务启动范围，本轮不批准启动、就绪、UAC Helper 或 70 项 OS 攻击。未来启动还须另行精确批准、有限等待就绪及失败停止/子进程退出证据。此工具包拒绝 start_service=true。

只允许合成凭证、合成账本与 Synthetic Provider。不允许真实 Key、真实 Provider、真实费用、REAL Ledger 迁移/重置或正式生产发布，不改防火墙、驱动、Ubuntu/AppContainer，不开放 shell，不 commit/push。

用户先在独立签名环境选择/创建证书、独立核对 Pin，再生成新候选并两次分别签署。需重新填入最终全部 Hash、签名者/用途/时间、目标、epoch、期限、逐文件目标和变更，保存只读 Verifier 完整结果及独立复核。**这仍不同于批准实际安装。** 目前没有可直接执行的 Apply 命令。

失败回滚范围见 [回滚合同](rollback-plan.json)：保留 receipt、部分安装、Vault/Ledger/WAL/SHM、审计和签署材料；停止或移除须另行用户精确批准，禁止自动删除、重试、重发和重置预算。当前没有系统变更，无实际回滚动作。
