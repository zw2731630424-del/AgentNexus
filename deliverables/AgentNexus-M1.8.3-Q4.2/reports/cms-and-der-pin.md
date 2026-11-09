# CMS 合同与 DER Pin 核验

沿用 Q4.1 两份合同及 schema，新的本地策略 epoch 为 5。计划的 `confirmation_kind=QUALIFICATION_PLAN`；部署批准为 DEPLOYMENT_APPROVAL，引用必须不同，并绑定计划 JSON 和计划 CMS 的完整原字节 SHA256。签署计划不批准部署，批准部署不批准安装、服务启动或真实权限。

| 项目 | LOCAL_QUALIFICATION 规则 |
|---|---|
| 信任锚 | 外部独立确认的公开证书完整 DER SHA256，64 小写 hex |
| 公开输入 | 精确 DER Cert；类型检查先于构造，RawData 全等且无私钥关联；PFX/PEM 拒绝 |
| 证书身份 | 精确 DER Pin + 非空精确 Subject；Issuer/serial 均由整个 DER 绑定并显示 |
| 用途 | 非 CA，KU 恰为 DigitalSignature，唯一 documentSigning EKU `1.3.6.1.5.5.7.3.36` |
| 公钥 | RSA OID `1.2.840.113549.1.1.1`，至少 3072 位 |
| 证书签名 | sha256/sha384/sha512WithRSA OID `.11/.12/.13`；其他拒绝 |
| CMS 摘要 | SHA256 OID `2.16.840.1.101.3.4.2.1` |
| CMS 签名 | RSA PKCS#1 v1.5，显式签名 OID rsaEncryption 或 sha256WithRSA；不支持的 PSS/其他算法拒绝 |
| CMS 结构 | definite DER、detached、单一 SignerInfo、有证书、无 countersigner、无尾随内容 |
| 时间 | 证书当前有效且覆盖整个计划；严格 round-trip UTC，计划不超过 7 天；准备默认最多 3 天 |

CMS 数学验证后仍检查 Pin、用途、算法、身份和时间。SignedCms 的构造参数不单独证明 detached；共享 DER 检查读取实际 EncapsulatedContentInfo。MD5/SHA1 CMS、SHA384 CMS（超出本地精确合同）、弱密钥、attached、多个签名者与 countersigner 均有模拟拒绝案例。新增签名 OID 解析测试与证书签名 OID 突变测试分别报告；突变公开 DER 不是有效新签发证书。

Signer 显示完整公开证书字段。私钥与证书的公共 modulus/exponent 比对只导出公共参数，最终实际 CMS 必须验证到原证书；真实用户 CNG 配对尚未运行。模拟的公钥不匹配用例验证比较器，不代表运行了错误用户 CNG 关联。

输出 signing-result 是事务完整性辅助标记，不是额外授权。signing-audit 中 `private_key_accessed_by_metadata_inspection=false` 仅指公开元数据读取本身，不否认真实签名工具将使用私钥。审计的本地 UTC 不是可信时间戳；用户签名路径加入 signingTime 属性，不能将其视为独立 TSA。

PRODUCTION_RELEASE 保留独立 codeSigning/链/19 类资格/真实权限门禁，新增整链 ApplicationPolicy 与 detached/countersigner 约束。本地 documentSigning 证书即使删除普通配置的 mode 字段仍被生产分支拒绝。本轮没有真实生产链证书夹具或生产资格，不将静态修复计为生产发布通过。

实际用户证书 Pin 为 null。所有真实 CMS 验证均 NOT_RUN；[模拟证据](../evidence/signing-tests.json) 与 [独立审查](cms-cng-independent-review.md) 不构成本地信任授权。
