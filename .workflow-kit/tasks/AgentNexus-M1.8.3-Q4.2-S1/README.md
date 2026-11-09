# Q4.2-S1 — 只读预检与 TPM_CNG 用户移交

当前状态为 **WAITING_USER_PUBLIC_CERTIFICATE / UNSIGNED / NO-GO**。用户已选择另一台由本人控制、Codex 无法访问的 Windows 设备，并选择拟新建 **TPM_CNG**、不回退软件。选择已记录，独立设备的具体身份、密钥策略与实际交互仍待用户在设备上核实；Codex 未连接该设备、未创建证书或私钥。

## 已完成与证据

- HEAD `2936fb8e32c9d19c973e607b7dd76cc242484217`；开始时工作树为空。Q4.2 最终报告、Signer 源码/构建、两份独立审查、证书/私钥边界、两阶段合同、CMS/DER 验证器、freeze/build、部署与回滚、Q3/Q4/Q4.1 失败记录已读取。
- Q3 / Q4 / Q4.1 / Q4.2 的完整 SHA256SUMS 集合分别为 **650 / 88 / 1,644 / 5,649** 项，全部逐项匹配，无缺失/额外文件。清单自身另算 Hash。
- Q4.2 源码 **264** 项与源码清单、ZIP 精确一致；审查目标 **19/19** 匹配。staging 为 **194 项 / 468,592,656 字节**。历史模拟准备目录的 468,592,646 字节是另一份、重新生成 launcher-plan 的集合，不能借用为真实候选数值。
- 最终 Verifier 的 `--describe` / `--identity` 实际返回 0；Signer PE 启动后拒绝 `--approve --automatic`，退出 21。此次没有运行真实 Signer GUI 签署流程，没有新增模拟签名测试。
- 原 `tools/verify-delivery.py` 实际退出 **1 / FAIL / [head-changed]**：冻结基线 HEAD `36f7c4484991d0b6b8c3e0f523492b2caf9ed59c` 是当前 HEAD 的直接父提交。其余校验未报错。保留原始失败，未改验证器或历史基线；当前逐文件闭包校验单独记录，不能称旧工具整体 PASS。
- 目标观察为 `DESKTOP-OSWALD`、Operator SID `S-1-5-21-2532670394-1554971530-4095700938-1001`；同 SID / Low IL 不能证明签名私钥隔离。SCM 查询退出 1060，服务不存在；安装/数据根不存在。CurrentUser My 为 0 份证书，LocalMachine My 为 2 份，无 documentSigning 候选；仅读取公开元数据。
- 当前宿主 `Get-Tpm` 没有取得非空 present/ready，**TPM 可用性为 INCONCLUSIVE**，原始捕获的 READ_ONLY_METADATA 标签仅表示执行过命令，不能证明 TPM 存在。这也不代表独立签名设备状态。

[预检结果](../../runtime/AgentNexus-M1.8.3-Q4.2-S1/preflight-20261109T181900Z/preflight-result.json) · [原始命令/退出码/日志 Hash](../../runtime/AgentNexus-M1.8.3-Q4.2-S1/preflight-20261109T181900Z/commands.json) · [原验证器输出](../../runtime/AgentNexus-M1.8.3-Q4.2-S1/preflight-20261109T181900Z/q42-verify-delivery.stdout.log) · [194 项实际 Hash](../../runtime/AgentNexus-M1.8.3-Q4.2-S1/preflight-20261109T181900Z/staging-file-hashes.json)

## 当前交付与未运行状态

离线移交包位于 `deliverables/AgentNexus-M1.8.3-Q4.2-S1/AgentNexus-Q42-S1-offline-handoff.zip`；包内保留原 Q4.2 全部 5,650 个文件（含 SHA256SUMS）和原目录层级。附加 START-HERE 说明、目标观察及待填写公开核对记录放在包外层，原 Q4.2 不增删文件。它是**原工具移交包**，不是新部署候选。

| 所需结果 | 当前结果 |
|---|---|
| 独立签名环境 | 用户已选择独立设备；具体身份/控制边界待用户实证 |
| 实际 TPM_CNG 证书 / 独立完整 Pin | NOT_RUN / null |
| 新 deployment ID / epoch 5 候选 / UTC 窗口 / 最终 Hash | NOT_RUN；等待公开 DER、独立 Pin 和目标确认 |
| Qualification Plan JSON / p7s / signing-result | NOT_RUN |
| Deployment Approval JSON / p7s / signing-result | NOT_RUN |
| 目标 `SIGNED_LOCAL_VERIFIED_ONLY` | NOT_RUN |
| 可批准的最终精确部署申请 | NOT_RUN；不能用旧草案代替 |
| 安装 / 启动 / 70 项 OS 资格 | 未安装 / 未启动 / 0 PASS、70 NOT_RUN |
| 生产 Vault / 真实 Key / Provider | BLOCKED / 0 / 0 |

原输入与输出合计 100,000,000 Token 上限保留，不重置，也不视为真实 Provider 许可。没有改信任存储、账户、ACL，未提升、安装、启动服务或 commit/push。

## 用户现在的操作

将离线移交包复制到你选择的独立 Windows 设备，在本地固定/可移动盘无重解析点的全新目录解压。**不要把那台设备接入本代理，不要把私钥/PFX/密码/密钥目录传回。** 从独立可信来源核对原清单及下面三个完整 Hash；仅工具与同包清单自洽不建立来源信任。

| 文件（相对 Q4.2 根） | SHA256 |
|---|---|
| `signer/AgentNexus.Qualification.Signer.exe` | `6668d6a16739a31fea0d3c474bfc6f17a2bd8e0eb7760b7a8f2cb9728a23ce9b` |
| `signer/AgentNexus.Qualification.Verifier.exe` | `5963e6f7200ef6b5e4f57632e1f6e5833d7c95b9dd71292e87f43de8893fccd2` |
| `source/native/qualification-signer/user-create-certificate.ps1` | `568dbcfcf8db83db10c7ce6028c1189ab9b3fb6239483bffdb4b9d882f1a461e` |
| `SHA256SUMS` | `bd87f3fb7903e5627ab6cb63a94c75848f4734ca626aab8fc52ab42709d95ffe` |

在**解压根目录**打开该签名用户的普通权限 **Windows PowerShell 5.1**，先只读核对（不要用 PowerShell 7 运行创建脚本）：

```powershell
$reviewRoot = (Get-Location).ProviderPath
$toolkit = Join-Path $reviewRoot 'deliverables\AgentNexus-M1.8.3-Q4.2'
whoami /user
hostname
$PSVersionTable
Get-Tpm
(Get-FileHash -LiteralPath (Join-Path $toolkit 'SHA256SUMS') -Algorithm SHA256).Hash.ToLowerInvariant()
foreach ($line in [IO.File]::ReadAllLines((Join-Path $toolkit 'SHA256SUMS'))) {
    $parts = $line -split '  ', 2
    $actual = (Get-FileHash -LiteralPath (Join-Path $toolkit $parts[1]) -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -cne $parts[0]) { throw ('HASH_MISMATCH: ' + $parts[1]) }
}
```

核实当前是你控制的另一台设备/签名用户，代理不能控制其桌面、密钥或工具目录。`Get-Tpm` 有非空结果也不证明 RSA3072、ProtectHigh 和用户在场可用；缺信息或不支持时停止，不修改 TPM/账户/ACL/信任，不静默回退软件。没有联网签名需求；离线本身不证明工具可信。源码与审查报告在原包内可独立阅读。

**实际创建只在你另外明确同意后手工执行。** 下面的命令没有被 Codex 执行；脚本还会要求你键入 `CREATE LOCAL QUALIFICATION CERTIFICATE`，该短语授权创建及创建后的 CNG 属性句柄访问：

```powershell
$publicOut = Join-Path $reviewRoot 'public-tpm-01'  # 父目录存在，本目录必须不存在
& (Join-Path $toolkit 'source\native\qualification-signer\user-create-certificate.ps1') -Method TPM_CNG -NewPublicOutputDirectory $publicOut
```

脚本只修改**运行该命令的独立设备用户 `CurrentUser\My`**，请求 RSA3072 / SHA256 / DigitalSignature / 非 CA / 唯一 documentSigning EKU `1.3.6.1.5.5.7.3.36`、90 天、NonExportable、ProtectHigh。公开证书在用户 My 逻辑存储；私钥由该用户的 **Microsoft Platform Crypto Provider / TPM** 容器管理，实际 container/unique_container 记录在公开 metadata。它不会把私钥写入 `$publicOut`。Microsoft Software KSP 则通常在 `%APPDATA%\Microsoft\Crypto\Keys` 存储用户软件钥，没有 TPM 硬件保护，本轮未选择它。[Microsoft 密钥存储](https://learn.microsoft.com/en-us/windows/desktop/SecCNG/key-storage-and-retrieval)、[KSP](https://learn.microsoft.com/en-us/windows/win32/seccertenroll/cng-key-storage-providers)、[创建参数](https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate?view=windowsserver2025-ps)。

NonExportable 限制导出，不独自限制同 SID 程序申请签名；TPM 也不消除 OS 调用权限。实际调用权限取决于独立用户、KSP 和容器访问控制；本轮没有测量独立设备的密钥 ACL。创建会检查真实 provider、用户范围、ExportPolicy.None、ForceHighProtection；可能显示 Provider 交互。每次签署的真实提示还要分别观察，策略字段不能替代用户在场证明。脚本不改 Root/Trusted Publishers，不签资格计划。

在确认短语前取消：不创建证书/密钥/输出。确认后若 Provider 取消、策略不支持、属性检查或公开输出失败：可能已留下证书、密钥或新输出目录；保留原件和错误，不自动清理、重试或切换 KSP，不把失败后的对象当作已合格。之后 Signer 的属性授权和最终签名授权各自独立；拒绝最终签名不会撤销此前已批准的属性访问。

若创建成功，在独立设备再次读取**完整 DER SHA256**：

```powershell
$publicCer = Join-Path $publicOut 'local-qualification-public.cer'
$pin = (Get-FileHash -LiteralPath $publicCer -Algorithm SHA256).Hash.ToLowerInvariant()
$pin
Get-Content -LiteralPath (Join-Path $publicOut 'public-metadata.json') -Raw
& (Join-Path $toolkit 'signer\AgentNexus.Qualification.Verifier.exe') --public-certificate $publicCer $pin
if ($LASTEXITCODE -ne 0) { throw 'PUBLIC_CERTIFICATE_REJECTED' }
```

逐位核对 64 位 Pin、Subject、Issuer、有效期、RSA 位数、KU/EKU，与脚本 metadata 一致；不要使用 Windows SHA1 Thumbprint。上述计算值不会自动授予信任。请你在独立于开发工作区的设备/可信工具上核对后，通过独立可信渠道确认完整 Pin，并保留核对时间、来源及结果。

只转交 `local-qualification-public.cer`、`public-metadata.json`，以及你亲自确认的完整 Pin；附独立设备 Host/签名用户 SID、实际提示/取消观察，以及目标是否仍为以下身份的明确确认。不要转交任何私钥或密钥存储目录。可填写包外层 `public-inputs.pending.json`，未核实字段保持 null/false。

## 待用户独立确认的目标

签名设备和目标设备是两台机器。以下是本轮在拟部署设备实际读取的值，**不是签名设备的值**，不自动替用户批准：

```json
{
  "host": "DESKTOP-OSWALD",
  "machine_id": "a013cd5e924eb5db1ba67eb28c65379f81b2d73f2cbd42fdb6645eb202681fe4",
  "operator_sid": "S-1-5-21-2532670394-1554971530-4095700938-1001",
  "service_sid": "S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873",
  "policy_epoch": 5
}
```

Service SID 是预计算值，SCM 为 Inactive，尚无真实服务 Token。若更换目标，在真正目标上以拟定操作员运行原 `Verifier.exe --identity` 并独立核对，不能拿签名设备的 identity 替换目标。

## 公开材料回来后的既有流程

Codex 只用你允许公开的精确 DER、独立确认 Pin、目标身份运行原 `tools/freeze.py`，输出到原工具包之外的全新本地目录。生成新 GUID、epoch **5**、新 UTC 窗口（准备默认最多 3 天，限制在证书期限内；验证合同上限 7 天），重新计算 194 项实际数量/字节/Hash，并绑定 Signer、Verifier、安装器、配置及清单。届时展示具体候选和全部 Hash；目前不填虚构 ID/窗口，不签旧 staging 或 reference。

你在独立设备打开同一 Hash 的 Signer，阶段一选择 **仅签署资格计划**，输入新候选、独立 Pin 和全新输出目录，审阅目标/四种身份、epoch/期限、全部 Hash、系统变更、合成范围、最终 JSON、证书，以及真实权限全部 false。键入 UI 根据**实际待签 JSON Hash**生成的短语，分别确认 CNG 属性访问和最终签名；观察实际 Provider 提示。短语及最终 plan Hash 不能从当前未签草案预先抄入。产物为 `approval/qualification-plan.json`、`.p7s`、`.signing-result.json`、`.signing-audit.json` 及绑定文件。

阶段一只批准计划；完成后停止，不自动进入阶段二或部署。第一阶段结果核验通过且你再次决定继续后，阶段二以**阶段一完整输出**为输入、另一个新目录为输出，重新核验 CMS/Pin/清单/目标/SID/epoch/期限/计划/权限，独立审阅最终 Deployment Approval JSON 并再次签署。产物为 `approval/deployment-approval.json`、`.p7s`、`.signing-result.json`、`.signing-audit.json`。两份 signing-result 均带文档前缀，不是共用一个会覆盖的文件。始终 `start_service=false`。

最后在目标 Windows、同一操作员运行原 `Verifier.exe --verify <阶段二完整输出绝对目录> <独立确认完整Pin>`，保存 stdout/stderr/退出码/时间及最终文件 Hash；仅成功才记录 **SIGNED_LOCAL_VERIFIED_ONLY**。不是 DEPLOYED、SERVICE_RUNNING、OS_QUALIFIED 或 PRODUCTION_VAULT_READY。

验签成功后才生成新精确部署申请：填入最终证书/两个 JSON 和 CMS/逐文件 Hash、目标/epoch/窗口、唯一服务和 Virtual Service Account、安装/数据根、ACL/SDDL、High/Daily Pipe、Helper/Runtime、SCM/管理员变更及回滚。**A 仅安装并保持停止、B 启动、C 合成 OS 70 项测试必须分别批准**；现有合同只接受 stopped 安装，不把两次 CMS 当作安装指令。没有批准的操作窗口，不扩大合同。本轮停在用户证书操作边界。
