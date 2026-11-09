# Q4.2 用户独立签发操作说明

**当前仅工具准备完成，实际证书/Pin/签名和部署均未完成。以下步骤由用户按各自授权在独立环境中执行；不是请 Codex 代办。**

先阅读 [总体报告](../reports/design.md)、[私钥边界](../reports/private-key-boundary.md)、[证书方案](../reports/cng-tpm-plan.md) 和两份独立审查。GUI [预览](../evidence/signer-preview.png) 使用模拟公开证书，签名按钮关闭，不代表真实 CNG 已验证。

1. 选择代理不能访问的独立 Windows 签名设备，或具有独立安全主体且代理无法进入的环境。同 SID 的另一个桌面/登录会话不充分。目标安装设备可以与签名设备不同。普通 GUI、TPM 或不可导出标志均不能自行证明代理无法调用密钥。
2. 将完整工具包保留在 `<审阅根>\deliverables\AgentNexus-M1.8.3-Q4.2\` 目录层级，从可信渠道独立检查整个工具包、源码和 SHA256SUMS，核对 Signer/Verifier 的完整 SHA256。校验清单本身也须从可信渠道取得；攻击者若能同时替换工具与清单，自校验没有独立信任作用。需要重新构建时在审阅过的开发工作区使用 `python -B tools/build.py`；新 PE Hash 变化后必须重新测试、审查、生成全部清单，不能沿用原候选。`verify-delivery.py` 是依赖原历史交付和 runtime 的开发复核工具；独立签名设备使用完整清单与 Signer/Verifier，不依赖这些历史运行目录。
3. 用户独立选择现有兼容 CNG 证书，或另行决定是否创建证书。创建脚本是 `source/native/qualification-signer/user-create-certificate.ps1`，仅在用户自有 Windows PowerShell 5 会话运行。必须显式选择 SOFTWARE_CNG 或 TPM_CNG 并键入创建确认短语。它将修改**该签名用户 CurrentUser\My**，创建 CNG 密钥并打开句柄检查策略；不导入 Root/Trusted Publishers、不签名。失败后保留已创建对象和半成品，用户自行审查，禁止自动重试。Codex 没有执行此步骤。
4. 用户在签名设备独立核对公开 DER 的完整 SHA256（64 位小写 hex，不是 Windows SHA1 Thumbprint），并确认用途、有效期和主机范围。只转交 `.cer` 公钥和确认后的 Pin；不要转交 PFX、PEM 私钥、密码、私钥文件或句柄。
5. 在**目标安装设备**以拟批准的操作员身份运行只读 `signer/AgentNexus.Qualification.Verifier.exe --identity`，以 UTF-8 保存其 JSON。通过可信渠道核对 host、Machine ID、Operator SID、预计算 Service SID。离线准备工具不能替代用户确认另一台设备的身份。
6. 在本工具包根目录，用公开材料准备一个新候选：

   ```text
   python -B tools/freeze.py --public-certificate <本地绝对路径-public.cer> --independent-pin <独立确认的64位小写hex> --target-identity <目标身份JSON绝对路径> --new-output <不存在的本地绝对目录>
   ```

   所有路径须位于本地 Fixed/Removable 卷，祖先无重解析点；输出父目录须存在，输出不能位于原工具包内。需要本地 Python 3.11+、Windows PowerShell 5 和 Framework。准备只用公开材料，产生新的 deployment ID、epoch 5、UTC 窗口（不超过 3 天及证书期限）、194 项清单、config/launcher plan/工具 Hash 和 SHA256SUMS。窗口到期、任何字节/目标改变都重新准备；不要签 Q4.1 候选或 staging。
7. 将完整新候选和工具转交独立签名环境。运行 Signer，选择阶段一、填写候选目录、独立 Pin、新本地输出目录。点击“读取文件快照与公开证书”，审阅全部摘要、系统变更、最终 JSON、证书字段和完整 Hash。滚动到证书和 JSON 部分；UI 显示文本的换行与实际 UTF-8 LF 字节区别已标明。
8. 勾选独立环境/目标核对并键入当前内容 Hash 派生的精确短语。若决定继续，点击“单独授权读取 CNG 密钥属性”。此独立操作会打开关联 CNG 句柄并显示 provider、container、export/UI policy；它没有计算签名，但句柄不是无签名能力的公钥句柄。Silent 属性读取可能失败，不会自动降级。
9. 核对不可导出、用户密钥、provider、Key Usage 和 ForceHighProtection。实际提示和同 SID 隔离仍需用户观察验证；策略字段不是证明。再点击签名按钮，另行最终 Yes 后才进行实际签名。取消/拒绝不授予该签名；之前已另行批准的属性访问不被抹去。
10. 阶段一新输出含 `approval/qualification-plan.json`、`.p7s`、`.signing-result.json` 及全套绑定材料；它**不批准部署**。阶段二以这一完整新输出为输入，重新加载和验证计划 CMS，再选择另一个新输出目录，审阅新生成的最终部署批准 JSON，重复独立属性授权与最终签名确认。部署批准绑定计划和计划 CMS 原字节，`start_service=false`，真实权限全部 false。
11. 在目标设备/操作员身份运行只读 `Verifier.exe --verify <最终完整输出> <独立Pin>`。成功为 `SIGNED_LOCAL_VERIFIED_ONLY`；它检查两份 CMS、Pin、全载荷、目标/SID、epoch、期限和权限，不安装、不导入信任、不创建服务、不录入 Key 或连接 Provider。若在不同目标/用户运行，拒绝是预期行为。GUI 签名设备上的离线目标绑定不等于目标实测。
12. 用户真实签发成功后保存 CMS、原 JSON、完整输出、Pin 的独立核对记录、CNG provider/container/UI policy、提示/取消观察及 Verifier 原始结果，另行生成精确部署申请并独立批准实际安装。当前 [申请](../approval-request/deployment-request.md) 仍 NO-GO，没有提供可执行 Apply 命令。

输出目录必须全新；不要覆盖、删除半成品或续写。准备完成标记与签名提交标记缺失时保留原件，使用新目录重新审阅。标记不是独立授权；有效 CMS 也不批准安装或生产。提交标记写入后发生进程退出，材料仍须重新完整验证，不能自动重试签名或部署。

软件 KSP 无 TPM 硬件隔离保证；TPM 的非导出也不保证恶意同 SID 进程不能请求签名。若独立安全主体、桌面控制和实际交互无法确认，保持 INCONCLUSIVE，停止签发。真实服务启动、UAC Helper、70 项 OS 资格和真实 Key/Provider 均需要之后各自审批。
