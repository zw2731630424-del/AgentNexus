# CNG / TPM 本地资格方案

本地资格不需要购买商业证书。采用用户 CurrentUser\My、RSA 3072+、SHA256 证书、DigitalSignature、非 CA、唯一 documentSigning EKU `1.3.6.1.5.5.7.3.36`、不可导出用户 CNG 密钥。信任来自用户独立确认的完整 DER SHA256 Pin，不来自 Subject、生成地点或 Windows 公共信任。

| 选项 | Provider | 适用与边界 |
|---|---|---|
| SOFTWARE_CNG | Microsoft Software Key Storage Provider | 没有 TPM 硬件隔离保证；需独立主体及真实策略/交互验证 |
| TPM_CNG | Microsoft Platform Crypto Provider | 设备支持才考虑；未探明硬件或策略时失败，不回退软件 |

Signer 另保留已审的 Microsoft Smart Card KSP 接受路径，创建脚本不自动配置智能卡。任何实际设备、PIN 和交互均未验证。[微软 TPM 说明](https://learn.microsoft.com/en-us/windows/security/hardware-security/tpm/how-windows-uses-the-tpm) 区分硬件密钥保护和操作系统对密钥的使用；硬件存在不构成本应用的授权证明。

创建脚本仅供用户在独立 Windows PowerShell 5 会话手工运行。UI 明示 CurrentUser\My 的变化，分别请求创建及属性访问授权；默认没有方法，大小写不同的合法 TPM_CNG 输入也必须选中 Platform Provider，不会静默改为软件。脚本请求 NonExportable/ProtectHigh，读取真实 ExportPolicy、UIPolicy、provider、container、unique container、machine-key 与 usage；不支持即失败保留。只写公开 DER 和元数据，不导入 Root 或 Trusted Publishers，不签任何计划。

证书有效期请求为 90 天；候选窗口最多 3 天并限制在证书有效区间，验证合同上限仍为 7 天。当前实际证书、Pin、provider、container、ExportPolicy、UIPolicy、每次提示、密钥 ACL 与 attestation 全部为 null / NOT_RUN。受限预检的 TPM 查询是 INCONCLUSIVE，不能据此断言设备有无 TPM。

用户应分别保存：证书完整公开字段、独立 Pin 核对记录、真实 provider/container、导出策略、UI policy、实际提示/拒绝/取消结果、代理与签名主体隔离说明及密钥调用权限证据。不尝试导出私钥来“验证不可导出”，不让代理进入签名桌面。条件无法满足时继续 INCONCLUSIVE / NO-GO。

证书只用于限定设备的 LOCAL_QUALIFICATION CMS，不是商业 CA，不赋予 Authenticode 或 Windows 公共信任，不能加入生产信任链，也不能绕过企业发布策略。
