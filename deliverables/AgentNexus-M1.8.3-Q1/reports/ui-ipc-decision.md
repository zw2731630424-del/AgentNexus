# 桌面 UI 与高权限 IPC 决策

用户于 **2026-11-09（Asia/Shanghai）明确回复“选1”**，确认采用“普通权限主 UI + 短生命周期可信录入辅助程序”：正常打开 AgentNexus，点击原 UI 的 Add Key 后，仅该操作出现 UAC 与独立可信录入窗口。主程序保持普通权限。

这项选择已关闭界面偏好待定项，只确定界面方向，未批准创建账户、修改 ACL、注册/启动服务或安装程序。辅助程序和日常 Gateway 的安全访问链尚未实现、部署或取得 Windows 资格；**部署准入仍为 NO-GO，生产 Vault 保持 BLOCKED**。

## 本机与源码证据

- 2026-11-09 06:37（Asia/Shanghai）实际交互 Explorer PID 14652、历史 Provider UI 主进程 PID 56992 均为用户 SID `S-1-5-21-2532670394-1554971530-4095700938-1001`、Medium `S-1-16-8192`、非 elevated、非 AppContainer。历史 UI 进程不是已安装的 M1.8.3，不能据此宣布新窗口或服务集成通过。[原始 Token](../evidence/preflight-host-medium/actual-process-tokens.json)
- `Common.cs:183` 的 RequireOperator 要求指定用户 SID、Elevated=true、Integrity>=0x3000、非 AppContainer；`PipeClient.cs` 在连接前执行此检查。`client.ts` 使用普通 spawn，未提供 UAC 提升或可信输入窗口。普通父进程的客户端不会自行获得高完整性。
- `CredentialService.cs` 仅接受 SYSTEM / Administrators / 服务 SID 的 pipe DACL，并设置 `S:(ML;;NW;;;HI)`。这不是给 Medium UI 的普通用户接口。
- `desktop/main.mjs` 在精确安装路径下把 Chromium profile 固定为 `C:\ProgramData\AgentNexusCredential\desktop\chromium-profile`。原计划保护该目录；普通用户没有写权限时，启动阶段的 mkdir/profile 操作也有冲突。只放宽 pipe 不能解决整条启动链。
- 当前授权针对的是已部署独立服务的资格验证，并未允许把整个 UI 长期提升为管理员，也未授权重做服务安全协议。本轮不修改历史源码。

## 方案比较

|方案|对现有 IPC 的影响|原 UI 体验|安全裁定|
|---|---|---|---|
|整个 Electron UI 提升|可望满足现有 high/elevated 门禁，仍须实测|每次启动涉及管理员权限|拒绝采用；与用户要求冲突，扩大高权限 Chromium/Host 面积|
|短生命周期可信凭证辅助程序|保留现有高权限服务 pipe；辅助程序内完成可信录入|正常打开原 UI；Add Key 点击后只对该操作出现 UAC 与独立可信表单|选定后续方向；不是原表单无感直传，且当前没有实现/Hash/OS 证据|
|受限本地 Broker|需要 Medium 入口与明确的类型/授权分层|可以隐藏管理复杂度|当前无合格实现。将任意 Medium 请求转发到高权限 pipe 会形成 confused deputy；新增服务/常驻 Broker 也超出当前单服务范围|
|放宽原 pipe 给 operator SID + 路径/签名/PID 白名单|改变 DACL/MIC/RequireOperator|原 UI 可以连通|不采用；同 SID 的进程访问/注入、继承环境和可信请求来源仍未证明，不能以路径/hash 冒充授权|
|Windows 打包身份、受保护进程、Hello 或其他 IPC|需要额外平台/身份/协议工程及实际攻击验证|取决于新方案|当前没有可直接替换的已验证组件；不注册 AppContainer、不改驱动/系统策略来补齐|

Microsoft 说明对象访问同时受 DACL 和 MIC 控制，默认 MIC 策略禁止向更高完整性写入；降低管道标签会改变现有合同。[MIC](https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)

## 辅助程序设计合同（待实现和独立实测）

可信根为 Windows、管理员维护的固定安装文件、外部批准的签发者和独立服务身份。攻击者为 operator 同 SID 的普通 Medium/Low 进程、其他普通账户和 Agent/Worker/Reviewer；管理员/SYSTEM/内核失陷不在该边界承诺内。普通 UI 的输入、进程 PID、声称的 role 和 PUBLIC 标签都不提供管理授权。

1. 主 UI 与日常元数据留在普通权限、用户可写且无凭证的独立 profile。Add Key 只发起固定、无秘密的操作意图。禁止调用方提供可执行路径、脚本、任意命令、URL、环境或原始 RPC。
2. 用户只为当前操作同意 UAC。受保护、固定 Hash 的短时辅助程序显示实际 Provider、模型范围、录入/轮换动作与凭证用途。**新 Key 在辅助程序自己的表单内录入**；不从 Medium Renderer 的 argv/env/临时文件/通用 stdin 收取任意秘密或授权指令。它没有任意命令或通用 invoke 接口。
3. 辅助程序经固定 pipe-client 连接服务，服务保持 RequireOperator、固定镜像、每消息 token 验证和会话绑定。必须新增可审查的 helper→client 启动链、进程句柄/创建时间/会话及完整安装 manifest 绑定；现有 native client 并未验证一个这样的 UI 父链。不能把 Medium UI 的路径/hash 当成抗同 SID 注入的证明。
4. 服务端真实取得 `GetNamedPipeClientProcessId/SessionId`，读取最后消息的 impersonation token，查询 TokenUser/TokenElevation/TokenIntegrityLevel/TokenIsAppContainer/TokenSessionId，并与实际进程 token 比对。只接受已批准 operator；失败立即断开，必须成功 RevertToSelf。客户端在提交秘密前核对 SCM 实例 PID、服务 TokenUser、Session 0、固定镜像与创建时间。请求中的 PID、SID、start_id、role 一律不作为身份来源。[客户端身份 API](https://learn.microsoft.com/en-us/windows/win32/api/namedpipeapi/nf-namedpipeapi-impersonatenamedpipeclient)
5. 每次录入使用服务签发的 30 秒一次性 ticket，绑定真实 channel、operation、metadata hash、secret hash、epoch；DPAPI 后、Vault 提交前再次检查。断线、取消、超时、身份变化、轮换或重启使旧票据失效。只返回存储结果及凭证元数据；不返回完整 Key、密文、解密结果或认证头。
6. 辅助程序完成后退出；关闭私有句柄与缓冲。禁止持久记住管理员身份、禁止给整个 Electron 主进程高完整性、禁止把 UAC 确认等同 Windows 隔离资格。进程内存、句柄复制、缓存、剪贴板与 dump 拒绝均需真实测试，JS 字符串不承诺即时完全清零。

微软的 UAC 交互指导支持将需提升的任务放入单独进程，并在任务结束后回到最小权限；这是设计参考，不能作为本机隔离 PASS。[UAC 任务分离](https://learn.microsoft.com/en-us/windows/win32/uxguide/winenv-uac)

## 尚未解决的日常 Gateway 路径

**只增加录入 helper 还不够。** 现有 `snapshot/budget.configure/broker.prepare/broker.execute` 同样通过要求 High Token 的固定 pipe。不能让短时 helper 变成长期通用 RPC 转发器，也不能在正常启动 UI 时偷偷提升一个长期 Host。

要完整保留普通权限使用体验，需要另行设计并验证“无凭证读回、类型受限、只消费服务已持有的精确审阅 grant”的日常请求接口，并绑定可信 Harness 来源、真实进程 token/防注入条件、精确 body/context/subject/nonce/epoch 和唯一预算。当前源码没有这条 Medium 路径；它属于服务/客户端协议变更，无法在“冻结 M1.8.3 只部署”的限制内凭配置完成。

用户已接受由原 UI 发起的独立可信表单。本包仍不声称辅助程序或完整 Gateway 链已经实现；须补齐日常请求链和实际 OS 证据，再冻结新候选与重发精确部署清单。

## 失败行为与回滚

当前所有安装/启动动作被本包的 NO-GO 门阻止。未来 helper 的取消、校验失败或服务不可用应保留原 UI 元数据功能，清空新输入，显示“未确认保存”，不得退回同 SID Vault。可通过服务列表/审计核对 ACK 丢失的提交，不能自动重放。

未来停用 helper 只停用录入入口并撤回未用 ticket；不更改现有 Vault/预算/审计、不放宽原 pipe、不删除安装或数据。移除新文件、账户或 ACL 仍须独立明确批准。完整服务回滚见 [回滚验证](rollback-validation.md)。
