# 本地证书与独立签发

无需购买商业证书即可准备本地CMS审批。用户先选择代理不可访问的独立离线Windows设备/会话，再自行决定是否运行[创建脚本](../source/native/qualification-signer/user-create-certificate.ps1)。SOFTWARE_CNG或TPM_CNG必须手工选择；脚本再次展示范围并要求精确短语后，才创建CurrentUser My非CA/RSA3072/SHA256/DigitalSignature/单用途documentSigning证书，期限90天。请求NonExportable+ProtectHigh，不支持则失败，无静默降级。只导出公开DER，不导入Root/TrustedPublisher，不自动信任或选Pin。

Windows Certificate Store保存公开证书及关联，CNG KSP管理私钥。Microsoft Platform Crypto Provider使用TPM；软件/硬件KSP边界不同。NonExportable、保护请求、硬件存在、实际提示和可信用户在场必须分别测量。[微软New-SelfSignedCertificate](https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate?view=windowsserver2025-ps)、[CNG UI policy](https://learn.microsoft.com/en-us/windows/win32/api/ncrypt/ns-ncrypt-ncrypt_ui_policy)。

唯一EKU为标准[RFC9336 documentSigning](https://www.rfc-editor.org/rfc/rfc9336.html) `1.3.6.1.5.5.7.3.36`，用于供用户审阅的批准内容，不能作代码签名。还必须有独立核对的准确Pin/身份/LOCAL schema，不接受任意文档证书。初次模拟中的UUID大数字OID被Framework4解码为空，正例失败；公开DER探针确认后改用标准用途。旧失败证据保留，未把它伪装为成功。

Signer仅从用户CurrentUser My精确Pin选择一张证书，检查非导出用户CNG策略，用provider句柄计算CMS；没有PFX/私钥文件/密码/环境变量密钥/CLI自动确认接口。输入内容完整展示，两项独立环境/目标身份复选框、摘要短语与最终MessageBox确认缺一不可。资格与部署分别操作。

`ComputeSignature(signer,false)`允许provider交互；Framework不使用silent参数来保证提示，实际提示依provider而定。普通窗口/false参数不是可信用户在场证明。[微软ComputeSignature](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.pkcs.signedcms.computesignature?view=netframework-4.8.1)。`CheckSignature(true)`只做数学签名，本地另验Pin/用途/身份/期限，生产另验链。[微软CheckSignature](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.pkcs.signedcms.checksignature?view=netframework-4.8.1)。

本轮未运行创建脚本、未生成用户资格证书、未选择已有证书、未改证书库或使用用户私钥。当前受限上下文TPM只读查询INCONCLUSIVE；实际TPM key/强交互/硬件证明NOT_RUN。模拟测试仅RSA.Create+CertificateRequest内存证书，不入库、不导出私钥，不作为真实信任锚。
