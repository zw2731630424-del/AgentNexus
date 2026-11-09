# 最终部署审阅包 · 当前环境 NO-GO

**范围固定为 QUALIFICATION_ONLY；尚不具备批准后直接执行的完整条件。此包没有授权任何系统变更。** 本轮按用户要求停在只读预检和审阅材料阶段。此前 M1.8.3 的模板、历史 Token 授权或本包里的候选 JSON 均不构成部署批准。

当前 HEAD `69ad728ed74e5bd7979dcebecdb07d94260b9089`；冻结源码 225 文件集合 SHA256 `108e724d0b5796f472d5eb46a9088c556f04084c4bca0dad9bceb9a691d0090a`。本包的逐文件指纹见 [SHA256SUMS](../SHA256SUMS.txt)。机器绑定、完整动作顺序与门禁见 [deployment-plan.json](../deployment-plan.json)。

## 审批前必须解决的事项

|门禁|现状与处理|
|---|---|
|Q1-P0-UI|用户已于 2026-11-09 选择方案 1：普通主 UI + 添加 Key 时 UAC/短时可信录入窗口。界面偏好已确认；helper、普通权限 Gateway 的安全入口与 profile 调整尚未实现/实测，系统部署仍未批准。本轮不长期提升全 UI、不放宽 pipe。见 [设计裁定](../reports/ui-ipc-decision.md)|
|Q1-P0-SIGNER|尚无用户明确认可的外部签发者公证书 DER/pin；没有精确 CMS 计划。候选 pin=null，approval_ref 为空，签名文件不存在；不得生成虚假批准或自签 OS PASS|
|Q1-P0-PAYLOAD|已冻结 111 条可用候选映射；包含全部 107 个选定 app 文件和 service/client/node/app-manifest。可信 UI helper/启动器和完整 Electron runtime 尚未选定；不能把现有映射称为完整可用桌面部署|
|Q1-P0-IDENTITY|没有已获准可登录的普通第二 SID 攻击身份；不借用 Codex Sandbox 账户、不创建每 Agent 账户。缺项保留 NOT_RUN，不能取得完整资格|

**后续须先关闭安装门禁，按新候选重算所有 hash、证书 pin、实际 ACL 计划和有效期，再取得用户对那份精确清单的明确批准。** 对本包笼统说“批准”不会自动补全缺失组件、签发者或允许扩大范围。本包不附可误运行的安装脚本。

## 已查明的系统现状

Windows 11 专业版 25H2 / Build 26200.9711；操作者当前为 Medium、非 elevated。目标服务与程序/数据根均不存在。SCM 查询实际返回 1060，Service SID 仅为 showsid 计算值 Inactive，尚无实际服务 Token 或进程树。现有父目录实际 ACL/SDDL、继承与原始查询另附，不能把拟议 SDDL当成已生效权限。[只读预检](../reports/read-only-preflight.md)

## 拟议系统变更边界（全部未执行）

|对象|明确拟议值/动作|
|---|---|
|唯一服务|`AgentNexusCredential`，WIN32_OWN_PROCESS=0x10，初期 DEMAND_START=3，非交互，无自动恢复/自启动|
|唯一账户|SCM 管理的 Virtual Service Account `NT SERVICE\AgentNexusCredential`；不运行 `net user`，不创建额外 Agent/Worker/Reviewer 账户|
|目标 SID|`S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873`；SID type UNRESTRICTED=1；启动后必须重新读取真实 TokenUser，不能只匹配配置或 SID 组|
|SCM 启动镜像|精确带引号 `"C:\Program Files\AgentNexus\AgentNexusCredential.exe"`，服务参数为空，拒绝环境/CLI 选择程序或根路径|
|服务权限|拟议 RequiredPrivileges 仅 SeChangeNotifyPrivilege；不授管理员组、不授 SeDebugPrivilege，不用特权绕过文件 ACL。实际 Token 不符合即停，不为启动成功临时加权限|
|登录权|仅对目标服务 SID 配置/核对 SeServiceLogonRight；显式拒绝 SeDenyInteractiveLogonRight、SeDenyRemoteInteractiveLogonRight。实际组的 deny 优先与有效服务登录需真实启动验证；不改其他账户权利|
|程序目录|新建 `C:\Program Files\AgentNexus` 及 manifest 对应 app 子目录；SYSTEM/BA/TrustedInstaller 可维护，服务 RX，普通用户 RX，无普通写入/替换|
|数据目录|新建 `C:\ProgramData\AgentNexusCredential`、`qualification`、`temp`；顶层配置仅可信维护者写；状态/temp 仅维护者和服务读写；当前不创建正式 engine 或 REAL 预算|
|父目录|不改变 C:\、Program Files、ProgramData 的 ACL。原子创建受保护根，若对象已存在、owner/ACL/reparse/父级替换权限异常即停，不接管既有目录|
|配置/签名|`service-config.json`、`qualification.json`、`qualification.p7s`。仅最终外部批准的 signer 签 QUALIFICATION_ONLY，decision/11 tests 为 NOT_RUN/BLOCKED；real_import/live 严格 false。当前只有不可启动的候选，未安装|
|IPC|仅服务启动时建立固定 `\\.\pipe\AgentNexus.Credential.v1`；无另行永久 pipe“注册”；4 个实例、first-instance、reject-remote、High NW label、受保护 DACL；不新增 Medium 通用代理|
|管理员权限|安装程序目录/数据 ACL/SCM/服务登录权需要管理员；日常整个 UI 不得因此长期提升。当前查询仅是未提升 Medium，没有进行安装|
|VSA profile/DPAPI|首次 SCM 服务登录可能初始化系统管理的 profile/DPAPI 状态，属于将来需观察的登录副作用。实际 profile 路径/权限未知，不能预填；回滚保留，不删除 profile/master keys|

登录身份和服务 SID 是两个必须独立核对的事实；SCM 启动时才产生实际进程 Token，配置读取不足以证明其权限。[Microsoft 服务账户](https://learn.microsoft.com/en-us/windows/win32/services/service-user-accounts)

RequiredPrivileges 用来限制 SCM 启动 Token 的特权，而不是新增账户特权。微软说明 Identification 级 named-pipe impersonation 不要求授予 SeImpersonatePrivilege；因此本计划不先授予该权限。若实测不可用应停测并重新审阅。[最小特权配置](https://learn.microsoft.com/en-us/windows/win32/api/winsvc/ns-winsvc-service_required_privileges_infoa) · [Identification 条件](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-impersonatenamedpipeclient)

## 文件与 Hash

所有 111 条源文件绝对路径、目标绝对路径、字节数和 SHA256 均列在 [installation-manifest.json](installation-manifest.json)。这里只列主要绑定：

|组件|SHA256|
|---|---|
|AgentNexusCredential.exe|06a7cda4ed06172c2ba5612b6e661d42d569978c7851ff31d6dd8c1e7a11b754|
|pipe-client.exe|224a451717beb8cce345364a214673afee1cd1bd683a6616c9adb07a65f80029|
|Node 24.15.0|3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5|
|编译 engine.js|8a75b003c2a756d02279a705d071d6cc0ca1d0150a3bc1ae0a6e43dc8b2c2df6|
|完整候选 app-manifest.json|56319bcd54f4506b1ccc8798ec2a9e68ce10cc4e3463721aa2d628b674b28dd4|

Node 内含的 V8 由 node.exe 整体 hash 覆盖；全部外部 JS 与 dpapi.ps1 由 app manifest 覆盖。系统 PowerShell、.NET/GAC、实际 DLL/模块以及未来 Electron runtime 另须平台依赖基线和启动后实测，不能把当前候选当成“全部实际载入文件已完成”。当前 `C:\Program Files\PowerShell\7\pwsh.exe` 不存在，冻结代码选择 Windows PowerShell 路径；本包不安装 PowerShell/Node/Electron 更新、不下载依赖。

## 拟议 ACL 与进程树

每个对象的完整精确 SDDL 与说明见 [security-descriptors.json](security-descriptors.json)；父级实际 SDDL 见 [原始 ACL](../evidence/preflight-host-medium/actual-acl-sddl.json)。拟议描述符单独解析核对，不调用 Set-Acl。配置的 service SID 与数据子树的访问名单必须与实际服务 Token/继承一起检验。

预期 Session 0 树：`services.exe -> AgentNexusCredential.exe -> node.exe engine.js -> attestation helper / Windows PowerShell DPAPI helper`。Node 在恢复运行前进入私有 kill-on-close Job，进程上限 6，不 breakaway；只继承三个指明的匿名管道端点。无 PATH/NODE_OPTIONS/Key/代理环境。实际树目前为空，取得服务启动批准后逐进程记录 PID、创建时间、Token 与模块。

## 验证、停止与回滚

先重核源文件/目标父级/机器/版本/签发者/操作者，任何 drift 立即停。安装并启动后第一步采实际 Token、ACL/SDDL、pipe High label、加载清单和 profile；异常则不录入合成值。只有专门生成的 `synthetic-test-AgentNexus-M183-Q1-*` 值可用于后续测试。

按 [32 项 OS 测试合同](../tests/windows-attack-tests.json) 与 [11 项资格](../tests/windows-qualification.json) 执行，每项真实进程身份/IL/对象/操作/原始结果齐全才可裁定。所有当前结果为 NOT_RUN，没有把本轮 Hash/转译检查算成 OS 隔离 PASS。测试结束后安排独立上下文安全审阅；任何关键 FAIL/INCONCLUSIVE 保持 BLOCKED。

回滚只停止精确服务、核 Job/Node/helper/pipe 退出，并在获准范围内解除本次 SCM 登记。保留 Vault、原账本、资格账本、审计、程序、ACL 和 profile；不删除账户/文件/ACL、不重建额度、不递归删除。真实回滚尚未执行，部署前已做只读前提与步骤核对。[回滚步骤与证据门禁](../reports/rollback-validation.md)

本轮不包含真实 Key、DeepSeek/OpenAI/GLM 请求、真实 Token/费用、科研/其他项目、commit/push/hooks、防火墙、AppContainer、驱动、Ubuntu、任意 shell 或任何凭证/egress/policy 绕过。未来资格全部通过也不自动批准真实 Key 和真实请求。
