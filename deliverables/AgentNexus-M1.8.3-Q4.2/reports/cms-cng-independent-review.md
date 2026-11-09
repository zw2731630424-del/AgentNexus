# Q4.2 CMS / CNG 与公开准备工具独立审查

**最终限定范围裁定：本次源码、固定目标 Hash、公开准备证据与既有模拟 CMS 验证范围内通过，未发现尚未关闭的阻断性问题。Q42-CMS-05 / P2 准备工具文件访问问题已补审关闭。实际用户签发、CNG/TPM 资格、安装、Windows OS 与生产权限仍未授予。**

本报告绑定 [review-targets.json](../evidence/review-targets.json)，SHA256 为 `a24e37cc0350c320364088e649f12f7ff7708d520e054428a8248ad07e5222f6`。19 项源码、工具、证据与 Signer/Verifier PE 已逐项读回，19/19 Hash 一致。Signer SHA256 为 `6668d6a16739a31fea0d3c474bfc6f17a2bd8e0eb7760b7a8f2cb9728a23ce9b`；Verifier 为 `5963e6f7200ef6b5e4f57632e1f6e5833d7c95b9dd71292e87f43de8893fccd2`。详细定位、目标 Hash、日志核对与只读执行结果见 [机读证据](../evidence/cms-cng-independent-review.json)。

本审查只写本报告及对应 JSON；产品源码和原始证据保持只读。未派发子代理，未执行用户创建脚本主体、Signer 签名路径、签名生成器或 prepare；未生成/选择用户证书、访问私钥、枚举或修改用户证书库，也未执行安装、服务、ACL、UAC 或真实 Provider 操作。

## 发现与关闭

| 项目 | 最终实现与证据 |
|---|---|
| 生产链的 codeSigning 用途 | SigningContracts.cs:139–146 同时检查叶 EKU 和 ChainPolicy.ApplicationPolicy，保留 Offline 吊销与 NoFlag。源码缺口关闭；真实生产链/吊销资格未运行。 |
| 生产兼容分支的 CMS 结构 | Common.cs:605–616 检查原始 detached DER、单签名者及无 countersigner。LOCAL 继续复用严格共享验证。 |
| 元数据的私钥访问字段 | 字段限定为 private_key_accessed_by_metadata_inspection=false；签名审计没有据此声称签名工具未使用密钥。当前公开 DER 元数据输出已独立验证。 |
| 准备完成门禁 | Candidate 拒绝 INCOMPLETE，要求 complete 的部署 ID、epoch、manifest 与计划一致；中断和缺标记模拟负例通过。 |
| **Q42-CMS-05 / P2：准备工具文件访问** | **已关闭。** 新 local_files.py 根到叶持有目录句柄，文件 leaf 不跟随重解析点；freeze 完整快照后才核对 Hash，后续复制和校验使用同一批 bytes。14 项公开准备证据、475 项整包文件及独立原生检查均已核对。 |
| 公开预览的 PFX 前置门禁 | PublicCertificate 在构造 X509Certificate2 之前要求 Cert 类型，再核对原始 DER 与无私钥关联；预览、Verifier、prepare 复用。现有 keyless PKCS12 被当前 Verifier 拒绝。 |

## 证书、算法和两份授权

LOCAL 信任锚是用户独立核对的完整公开 DER SHA256。共享验证比较精确 Subject；Issuer、serial、KU/EKU、公钥算法/位数、证书签名算法和期限均展示为公开元数据。Issuer 与 serial 同时被完整 DER pin 固定，Subject 文本本身不授予信任。

本地证书要求非 CA、RSA 至少 3072 位、仅 DigitalSignature KU、唯一 documentSigning EKU `1.3.6.1.5.5.7.3.36`。证书签名算法只允许 RSA SHA256/384/512，对应 OID `1.2.840.113549.1.1.11/.12/.13`；证书有效区间覆盖整个计划。共享 PublicCertificate 先判类型、后构造证书，并要求原始字节与 RawData 完全一致且不含私钥关联。

LOCAL CMS 要求 detached、单签名者、无 countersigner，摘要仅 SHA256；签名算法 OID 仅允许 rsaEncryption `1.2.840.113549.1.1.1` 或 sha256WithRSAEncryption `1.2.840.113549.1.1.11`。原始结构解析、SignedCms 数学签名验证和 pin/用途检查共同构成门禁。直接 OID 测试覆盖两个允许值、PSS、未知值及截断结构；PSS/未知测试的预期解析结果为 UNSUPPORTED，ACCEPTED 日志表示预期值断言成立。MD5、SHA384 CMS 和 countersigner 负例也保留。

epoch 为 5，继续使用资格计划和 Q41 部署批准 schema，旧 epoch 被拒绝。两份文档仍分别审阅、确认和签署，部署批准额外绑定资格计划与计划 CMS 原始字节 Hash。计划、安装与运行期检查保留实际主机、Machine ID、Operator/Service SID、期限、部署 ID、清单/config/策略/系统变更、安装器/Verifier/Signer Hash、完整 payload 集合及总量绑定。真实/生产开关必须为 false，start_service=true 拒绝。

生产兼容配置仍拒绝本地 EKU；要求 codeSigning 叶 EKU、相应用途的 Windows 链与离线吊销证据。该源码门禁未被本地资格流程降低；未来生产候选仍须单独复核。[微软 ApplicationPolicy 文档](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.x509chainpolicy.applicationpolicy?view=net-7.0)

## 公开准备流程的补审

PublicFiles 对本地固定/可移动盘路径做前置限制，根到叶打开并持有目录，使用 access 0x81 / share 1；leaf 使用 OPEN_REPARSE_POINT 并按句柄属性拒绝重解析点或错误类型。文件读取时获取固定 bytes，完整 toolkit 快照随后逐项匹配 SHA256SUMS。输出采用 CREATE_NEW、持有读写句柄且只分享读取权限，最终核对文件集合、长度与 Hash，额外目录也拒绝。

freeze 对 Verifier PE、公开 DER 和目标身份 JSON 均使用已取得的固定 bytes。PowerShell 反射 Assembly.Load 加载同一份已校验 PE，复用既有 PublicCertificate、Certificate、CertificateMetadata、Policy/SystemChanges；没有在校验后按原 Verifier 路径重新执行程序，也没有第二份私钥签名实现。

仅在公开 DER、独立 pin、目标身份及新输出目录校验后，才准备新部署 ID、epoch 5、194 项清单和相关 Hash。计划未确认、部署未批准、真实权限均 false。输出读回后移除自己的 INCOMPLETE，写入绑定部署 ID/epoch/manifest 的 complete，随后再次检查。Signer 与 Verifier 的 Candidate 强制该门禁。

本审查未运行 prepare。已对既有公开准备模拟结果逐项核对：整包 **475 文件**与独立 prepared-public-file-manifest 一致，**474 条 SHA256SUMS**一致；其中 payload 为 **194 文件 / 468,592,646 字节**，集合、长度、Hash 和 complete 绑定均正确，批准与用户确认 false，两份 CMS 均不存在。它只使用既有 SIMULATED 公开 DER，无实际用户证书或安装授权。

## CNG / TPM 的保证边界

公开加载阶段读取证书与 provider 关联。用户另行授权后，Signer 才取得 CNG 句柄检查用户范围、RSA signing usage、ExportPolicy.None、ForceHighProtection 和 provider；UI 明示该访问，Silent 不把句柄限制为只能读属性。最终签名 Yes 之后才 GetRSAPrivateKey，再检查当前策略和公钥 modulus/exponent；Framework 按证书关联生成的 CMS 经精确 pin 后验验证。源码没有声称先前检查的句柄就是 ComputeSignature 使用的同一对象。

NonExportable 约束导出，UI policy 规定另一组保护要求，实际提示行为由 KSP 决定。Framework 的 ComputeSignature 不使用 silent 参数来保证提示。由这些属性不能推导同 SID 恶意进程被禁止请求签名，也不能推导普通 GUI 是可信内容显示。[导出策略](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cngexportpolicies?view=net-10.0)、[UI policy](https://learn.microsoft.com/en-us/windows/win32/api/ncrypt/ns-ncrypt-ncrypt_ui_policy)、[KSP 保护行为](https://learn.microsoft.com/en-us/windows/win32/api/certenroll/ne-certenroll-x509privatekeyprotection)、[Framework 提示](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.pkcs.signedcms.computesignature?view=netframework-4.8.1)

TPM 保护密钥材料，操作系统仍可请求密码运算。实际每次提示、用户在场、同 SID 抵抗和硬件证明须分别测量，本轮仍未运行。签名环境必须是代理不可访问的独立设备或安全主体，同 SID 的另一桌面/会话不足以建立隔离。[微软 TPM 说明](https://learn.microsoft.com/en-us/windows/security/hardware-security/tpm/how-windows-uses-the-tpm)、[NCryptOpenKey](https://learn.microsoft.com/en-us/windows/win32/api/ncrypt/nf-ncrypt-ncryptopenkey)

用户创建脚本的创建及后续私钥关联属性访问均有明确授权；核对实际导出/UI 策略，失败保留，不自动清理或重试。公开工具 bootstrap 以同一 byte[] 做 Hash 和 Assembly.Load；Method 选择与 ValidateSet 的大小写行为一致。脚本主体未被本审查执行。SigningTime 和本地审计时间也不构成可信时间戳。

## 最终证据与独立只读检查

- review-targets 的 **19/19 项**一致；构建运行 `build-20261109T171614423815Z` 的六个当前 PE 及编译日志 Hash 一致。未重新编译，不将记录匹配称作可复现构建证明。
- `signing-tests-20261109T171616717426Z` 为 **107 PASS / 0 FAIL**；107 条结果及 **321 份** input/stdout/stderr 原件和交付副本 Hash 一致。未重跑签名生成器或整套模拟测试。
- `preparation-tests-20261109T172208502390Z` 的 **14/14** 公开准备记录、原件/副本和上述 194 项实际准备夹具均已核对；这不是实际用户签发或系统安装试验。
- 最终回归 `regression-20261109T172344873713Z` 原始/交付日志与 TAP 计数一致：**224 PASS / 0 FAIL / 5 SKIP**；strict typecheck 记录通过。未重跑回归。
- 当前 Verifier 已独立只读运行：describe、公开模拟 DER 元数据和既有 clean 模拟导出包两份 CMS 验证通过；keyless PKCS12 拒绝为 PUBLIC_DER_ONLY_NO_PFX。
- 对既有 194 项公开准备目录，当前 Verifier 的 inspect 返回 **UNSIGNED_CANDIDATE_INSPECTED_NO_GO / 194 / 468592646 / approved=false**；严格 verify 返回 **21 / USER_CONFIRMATION_REQUIRED**。工具 staging 仍拒绝为 DirectoryNotFoundException。
- 历史 Q41 reference 的 12 个模板此前已按原字节核对。当前工具包根目录仍无 approval 或 preparation-complete；根 payload 是 staging。公开准备模拟位于独立 runtime 目录，没有实际用户 pin、用户证书候选或安装批准。

**上述源码与公开/模拟证据范围内的审查已完成。任何未来用户证书绑定候选、后续最终 SHA256SUMS、真实签发、安装、Windows OS 或生产资格均须各自核验；本报告不授予这些权限。**

