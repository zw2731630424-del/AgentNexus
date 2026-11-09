# Q3 精确部署审批包

**当前状态：完整载荷已准备，UNSIGNED / 未批准 / 未安装。** 用户本轮指令明确要求真实 Windows Service、提升、账户/ACL 和安装操作等待独立批准。此包只提供可审阅内容，不构成部署、真实 Key 或模型费用授权。

## 固定部署范围

唯一服务 `AgentNexusCredential`，own-process / demand，虚拟身份 `NT SERVICE\AgentNexusCredential`，Session 0。服务固定执行 `C:\Program Files\AgentNexus\AgentNexusCredential.exe`，无外部参数；其唯一 native Runtime 子入口是同一二进制 `--daily-runtime`，必须经服务保留句柄、私有继承通道和实际服务 Token 父链验证，不能由 Medium 自注册。

普通 UI 启动为 `C:\Program Files\AgentNexus\app\runtime\electron.exe`，唯一参数 `C:\Program Files\AgentNexus\app`。Daily client 固定为 `pipe-client.exe --daily --stdio`。只有 Add Key / 管理动作调用固定 Launcher → UAC → Helper，Helper 结束即退出。Launcher 不读取服务私有数据树；受保护、非秘密 `launcher-plan.json` 只描述启动，不能授予凭证或模型权限。

程序根 `C:\Program Files\AgentNexus`：BA/SYSTEM 维护，服务和普通用户 RX。`C:\ProgramData\AgentNexusCredential` 根、service-config、qualification 和签名仅 BA/SYSTEM 可写、服务 RX；仅 `engine` / `qualification` / `temp` 状态子树服务可写。普通 Chromium profile 使用用户 AppData。安装入口在复制前保护新根，只复制签名清单中的持有文件流，禁止额外文件、重解析点、路径别名和重复目标；复制后重新核对 Hash 与完整文件集合。拒绝接管任何既有安装、数据或服务，失败保留停止的部分安装供审阅，不自动删除。

High pipe `\\.\pipe\AgentNexus.Credential.v1` 保留管理白名单和 High MIC。Daily pipe `\\.\pipe\AgentNexus.Daily.v1` 独立，Medium MIC，operator rights `0x00120183` 不含 CREATE_INSTANCE，拒绝远程。每个消息实际 impersonated Token 验证 SID / Medium / session / logon，kernel PID 仅用于连接连续性；不把普通调用者 PID/path/hash 当 Runtime 身份。管理、Shell、HTTP 代理、文件读取、预算修改与签权不在日常通道。

## 签发和审批顺序

1. 审阅 [installation-manifest.json](../approval/installation-manifest.json)、源码 ZIP、完整 SHA256 和独立报告。当前二进制为本地编译候选，没有在本轮伪造 Authenticode 或自签生产资格。
2. 确定独立批准的签发证书和其 DER SHA256 pin。若做 Authenticode 签名，会改变二进制字节，必须重新生成全部载荷/配置/资格 Hash、重新审阅，不可沿用本包旧 Hash。
3. 在 `approval/candidate` 填写同一机器/原 operator/虚拟 service SID、epoch=3、有效期限不超过 7 天。资格计划只允许 `status=QUALIFICATION_ONLY`、`decision=NOT_RUN/BLOCKED`、19 类实际测试均 NOT_RUN/BLOCKED；real_import/live 必须为 false，真实授权 ref 必须为空，资格测试 ref 必须是单独 APPROVED 引用。外部签发 `qualification.p7s`。Launcher 计划也需精确 Hash、原 operator、同一 epoch 和有限 UTC 期限。
4. 重新冻结清单，外部签署 `deployment-approval.UNSIGNED.json` 的批准版本及分离 CMS，绑定安装清单、config、qualification 的 Hash。当前模板 `deployment_approved=false`、空批准 ref、过期时间和缺 pin 会失败关闭。不得把一般“同意开发”或 1 亿 Token 授权填成部署批准。
5. 只有明确批准精确系统变更后，才在已授权管理员会话调用安装入口 `-Apply`。`-StartService` 还要求签署文档 `start_service=true`；脚本本身不调用 runas。先执行原 70 项 OS 资格，保留原始 Token/ACL/拒绝记录。native 部分自动探针为 `pipe-client.exe --approved-os-probe APPROVED-<ref>`，仅在 Q_ONLY 运行，剩余项目仍须真实系统程序执行，不能由探针补 PASS。
6. Q_ONLY 仅使用独立 synthetic Vault/store/FixtureTransport；native Daily 的服务端合成审阅仍复用现有 exact grant，不发真实网络。QUALIFIED 仍需要19类签署证据；真实 Key 导入、REAL 账本保护式迁移和 live exact consent/费用授权另行审批。

只读验证命令（已执行，无系统变更）：

```powershell
& .\source\tools\agentnexus\install-q3-qualification.ps1 -BundleRoot 'I:\AI_AgentNexus\deliverables\AgentNexus-M1.8.3-Q3'
```

实际安装的参数均来自批准文件；当前不得执行 Apply。脚本源和默认拒绝测试见 [独立安全审查](independent-security-review.md)。生产服务源码/19类门禁及原70项映射见 [native README](../source/native/credential-service/README.q3-native.md)。

## 回滚

撤销未用计划和新请求授权；在批准范围内停止唯一服务并确认服务、Node engine 和 native Runtime 子进程退出。Job kill-on-close 和断线撤销收回旧通道，已经 SENT/UNKNOWN 的请求不自动重试，Token 占用继续保留。

保存 Vault、ledger、审计、签署材料和原安装。不得为回滚重建空 REAL 账本或清零预算。卸载服务、删除程序/账户、删除数据或改变 ACL 都需要另一个精确批准；本包没有自动清理脚本。更新必须停服并重签新 Hash/epoch，不能替换受运行期锁定的依赖。若安装中途失败，保留停止的部分安装，核对真实状态后再批准恢复；默认安装器拒绝覆盖它。

## 明确尚未验证

实际 SCM 注册/虚拟账户、UAC split token、服务和 Helper 的查询授权、进程/线程/token 对象 DACL、MIC/pipe、加载闭包与依赖劫持、Standard-user over-the-shoulder 限制、WinForms/CLR 对象默认权限兼容性、注入/句柄/内存/clipboard/dump、跨身份 DPAPI、服务与 Runtime 重启全部需要真实部署资格。安装器 Apply 只做过静态审阅，从未执行。不得把完整载荷、纯编译或只读默认分支视为这些项目通过。
