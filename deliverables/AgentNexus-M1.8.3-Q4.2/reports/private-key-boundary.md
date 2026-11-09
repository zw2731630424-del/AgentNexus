# 私钥安全边界

本轮验证的是源码与离线公共材料路径，不是实际私钥隔离资格。真实用户证书未选择、CNG/TPM 未创建或签名；`PRIVATE_KEY_BOUNDARY_VERIFIED=INCONCLUSIVE`。

Signer 不接收 PFX、PEM、私钥明文或密码，没有网络签发、密钥导出、环境变量私钥或自动批准参数。公开 DER 入口先检查内容类型再构造对象，拒绝任何 PKCS12。GUI 公钥加载和预览不打开私钥；CNG 属性访问有独立授权并披露句柄能力；实际 GetRSAPrivateKey/ComputeSignature 在最后签名 Yes 后。只导出 RSA 公共 modulus/exponent 作匹配，绝不导出私有参数。模拟测试的临时签名证书与真实用户钥分开。

| 性质 | 源码要求 | 实际裁定 |
|---|---|---|
| 私钥不可导出 | 用户 CNG、ExportPolicy.None | NOT_RUN |
| 访问主体独立 | 用户选择代理不可访问的设备/安全主体 | INCONCLUSIVE |
| 私钥不能被普通同 SID 进程调用 | 不由 NonExportable 或 GUI 推导 | NOT_RUN / 未证明 |
| 每次签名需用户交互 | 要求 ForceHighProtection 并显示策略；提示须实测 | NOT_RUN |
| TPM 硬件保护 | 仅 Platform KSP 方案；硬件/attestation 另验 | NOT_RUN |
| 密钥 ACL/实际调用权限 | 需要用户在独立环境测量并记录 | NOT_RUN |

微软将 [ExportPolicy.None](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cngexportpolicies?view=netframework-4.8.1) 定义为不可导出。由此不能推出其他进程没有使用权限。UI 信息与要求通过 [NCRYPT_UI_POLICY](https://learn.microsoft.com/en-us/windows/win32/api/ncrypt/ns-ncrypt-ncrypt_ui_policy) 独立表达，属性值不能替代用户在场实测。

Framework 的 [ComputeSignature](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.pkcs.signedcms.computesignature?view=netframework-4.8.1) 不使用 silent 参数保证提示。源码保留被检查的 CNG 句柄并验证最终 CMS 与完整公开 DER；Framework 仍按证书关联解析实际签名钥，所以不声称同一句柄或同一策略实例已获证明。

同 SID 的另一个会话仍可能有相同密钥权限。普通复选框、短语、GUI 和当前代理 Low/AppContainer Token 都不是隔离证明。独立设备优先；独立账户也必须由用户确认桌面与密钥不能被开发代理、管理员或其他同权限进程控制。签名环境失陷、管理员/SYSTEM、时钟/磁盘回退、验证器及独立 Hash 同时被替换均不在当前保证中。

没有为了获得测试通过而变更 ACL、证书库或系统策略。用户创建脚本主体未运行；只读测试仅解析脚本、编译公开 PE 快照加载器并验证公共文件输出。报告中的 provider/container 等没有实际用户值，不得把模板或模拟值填写成真实已验证证据。
