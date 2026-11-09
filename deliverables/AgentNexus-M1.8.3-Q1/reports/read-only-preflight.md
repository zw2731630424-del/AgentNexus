# 部署前只读预检

结论：**预检已取得本机证据；部署准入 NO-GO，生产 Vault BLOCKED。** 本轮没有创建账户、修改 ACL、注册/启动服务、运行安装程序或连接目标 Named Pipe。只有 Q1 文档、清单和原始观察文件写入工作区。

## 基线与读取

已读取根 AGENTS.md、现有治理策略/基线、工作流路由。`project-rules/README.md` 不存在，注册规则列表为空，未启用额外模块、hooks 或修改规则。用户指定的全部 M1.8.3 报告、完整 native/TypeScript Credential Service，以及 Electron Main/Preload/Renderer、Vault/Key Pool、服务账本、旧 Ledger/Campaign、Gateway 与最终 Egress 实现已按相关性读取。[读取与文件 Hash](../evidence/read-coverage.json)

当前 HEAD `69ad728ed74e5bd7979dcebecdb07d94260b9089`。任务开始时 `git status --short` 无输出；本轮仅新增独立 Q1 材料，不 commit/push。225 个冻结源码文件逐项匹配，集合 SHA256 `108e724d0b5796f472d5eb46a9088c556f04084c4bca0dad9bceb9a691d0090a`。M1.8.3 已发布清单 379 项匹配；Q1 前后对 969 个历史交付文件分别留存指纹。完整历史保护结论以收尾对照为准。[源码验证](../evidence/source-verification.json) · [发布清单核对](../evidence/m183-published-checksums.json) · [Git 观察](../evidence/git-baseline.json)

## 实际状态

|检查|真实观察|裁定|
|---|---|---|
|Windows|Windows 11 专业版 25H2，10.0.26200，UBR 9711，x64|OBSERVED|
|交互 SID|S-1-5-21-2532670394-1554971530-4095700938-1001|OBSERVED|
|宿主查询 Token|Medium 8192，elevated=false，Session 1，非 AppContainer；管理员组 deny-only|OBSERVED|
|沙箱查询 Token|同用户 SID，Low 4096，AppContainer=true|单独记录，不冒充普通 Medium 攻击身份|
|UAC|EnableLUA=1，ConsentPromptBehaviorAdmin=5，PromptOnSecureDesktop=1|OBSERVED|
|目标服务 AgentNexusCredential|sc queryex/qc/qsidtype/qprivs/sdshow/qfailure 等均 1060；CIM 无记录|未安装|
|Service SID|showsid 返回 S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873，Inactive；NTAccount 解析失败|预计算值，不是活动身份|
|实际服务 Token/IL/特权/进程树|没有服务实例|NOT_RUN，不能从模板推导|
|程序根 C:\Program Files\AgentNexus|不存在|尚无目标 ACL 或安装文件|
|数据根 C:\ProgramData\AgentNexusCredential|不存在|尚无 Vault、temp、目标 ACL|
|目标 Pipe|只枚举名称未发现；未连接|实际 DACL/ML/远程拒绝均 NOT_RUN|
|LSA 显式账户权|只读 LsaOpenPolicy 成功；目标 SID 查询返回 Win32 2 / NTSTATUS c0000034|不能宣称有效登录权已配置|
|不同 SID 测试身份|唯一已启用普通交互账户为当前用户，另有宿主管理的 SandboxOnline/Offline|没有获准可用于此任务的普通第二身份，不复用宿主账户或创建 Agent 账户|

[宿主预检 JSON](../evidence/preflight-host-medium/preflight.json) · [逐命令退出码与原始输出](../evidence/preflight-host-medium/native-command-results.json) · [真实 Token](../evidence/preflight-host-medium/actual-process-tokens.json)

## 父目录与 ACL

已读取 `C:\`、`C:\Program Files`、`C:\ProgramData` 的 owner、DACL、继承位、每条 SID/权限掩码和实际 SDDL；均未发现这些路径自身为 reparse point。完整值见 [实际 ACL/SDDL](../evidence/preflight-host-medium/actual-acl-sddl.json)。未取得父目录 SACL/ML，本轮未启用特权补读，不能称“完整安全描述符全部合格”。

`C:\ProgramData` 的 Users ACE 允许创建子对象，当前目标根不存在。因此获批安装必须**带最终安全描述符原子创建目录，遇已存在对象即停**；不允许先信任普通用户预先创建的同名目录、再接管/改 ACL。当前父级未观察到普通主体可在父目录本身 DELETE_CHILD/WRITE_DAC/WRITE_OWNER/GENERIC_ALL；这是静态掩码观察，实际对象替换拒绝测试仍 NOT_RUN。所有祖先和继承还须安装前即时复核。

## 会改变原部署计划的发现

1. 普通 Medium UI 与原高权限 pipe 的矛盾是源码确定的准入缺口；受保护 desktop profile 也与普通启动写入冲突。[UI/IPC 决策](ui-ipc-decision.md)
2. 本机不存在 `C:\Program Files\PowerShell\7\pwsh.exe`。冻结服务将使用系统 `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`，不是当前工具命令行所用的 Codex PowerShell。其 hash 与 ACL 已采集；实际 DPAPI helper/加载模块必须按这个路径验证。
3. 没有已批准的外部签发者 DER pin、最终 CMS 签名计划、可信短时 helper/启动器或完整 Electron 安装清单。原部署模板不能视作本次批准。[审批包](../approval/deployment-approval.md)
4. 历史 UI 进程正在运行，但来源是旧 Provider UI 路径，不是受保护 M1.8.3；本轮不关闭、调试或改写它。

QUALIFICATION_ONLY 选择合成 Vault 语义与 FixtureTransport；`CredentialVault.open` 默认仍使用 Windows CurrentUser DPAPI，未传 SyntheticMemoryProtector。所以批准后可用合成字节检验真实服务身份 DPAPI，而不接触真实 Key；目前尚未执行。

本轮沙箱内 CIM/本地账户读取失败原样保留，随后使用沙箱外 **Medium、未提升** 的只读查询取得所需观察。没有通过 UAC 或管理员进程进行部署。服务启动后的 Token、实际 ACL/pipe、内存/句柄及攻击测试必须留待新批准后的独立进程执行。
