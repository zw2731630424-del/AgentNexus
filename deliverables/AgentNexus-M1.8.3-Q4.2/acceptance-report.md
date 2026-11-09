# Q4.2 最终阶段验收

**独立审查、修复、最终构建和离线准备完成；实际用户签发 NOT_RUN，部署继续 UNSIGNED / NO-GO。** [逐项机读裁定](acceptance.json)

| 验收域 | 裁定 |
|---|---|
| A SOURCE_AUDITED / BINARY_BUILT / INDEPENDENT_REVIEWED | PASS：源码、发布 PE、公开材料、模拟与文件系统限定范围；已发现问题关闭 |
| A UI_VERIFIED | PASS_PREVIEW_ONLY：最终 PE 两阶段模拟布局及证书字段可见，属性/签名按钮关闭 |
| A PRIVATE_KEY_BOUNDARY_VERIFIED | INCONCLUSIVE：实际用户环境、同 SID 隔离和可信用户在场未证明 |
| B 证书选择 / DER Pin / CNG创建 / 不可导出 / 每次交互 / 实际签名 | 全部 NOT_RUN；实际 Pin=null |
| C 真实最终计划冻结 / 复核 / 签名 / CMS | 全部 NOT_RUN；历史合同与模拟路径已审，不是用户最终计划 |
| D 真实最终批准冻结 / 复核 / 签名 / CMS | 全部 NOT_RUN；最终精确 Hash 等待真实候选与两次签署 |
| E 安装批准 / 服务启动 / 真实 Key / Live Provider | 全部 false |

签名/合同/异常测试 **107/107 PASS**（SIMULATED），公开准备 **14/14 PASS**（194 文件 / 468,592,646 字节，仅模拟公开 DER）；严格类型检查与最终限定回归 **224 PASS / 0 FAIL / 5 SKIP**。独立 Signer 审查 **98 命令**与 **21 项补审**均符合预期，两份独立报告没有未关闭阻断性实现问题。重叠结果不累计。

六项警告即错误构建通过，264 项完整源码、7 项源文件修改、源码 ZIP、staging 清单与原始失败证据已归档。原 Q3/Q4/Q4.1 与规则 Hash 保持；最终检查由 [验证工具](tools/verify-delivery.py)、[治理结果](evidence/governance-result.json) 和 [SHA256SUMS](SHA256SUMS) 共同核对。治理及最终完整性以实际证据文件和最后只读运行结果为准。

修复包括内存快照、最终 Yes 后复核、目录 0x81 共享锁、叶 nofollow、本地路径门禁、原子新输出/整包读回、精确 DER 前置类型检查、完整公开/CNG 字段显示、属性与签名独立授权、算法白名单、生产链用途约束、公开准备快照与完成标记。见 [总体报告](reports/design.md)、[TOCTOU](reports/toctou.md) 和 [独立复核](reports/independent-signer-audit.md)。

没有选择或创建实际用户证书，没有使用用户私钥、签署用户计划/批准、改 My/Root/Trusted Publishers、安装、UAC、服务、账户或 ACL。原 70 项 OS 测试和 19 类生产证据保持 NOT_RUN；生产 Credential Vault BLOCKED；真实 Key/Provider/费用均 0，原一亿 Token 授权不重置，无 commit/push。

用户下一步先在独立安全主体/设备自行选择证书并独立核对完整 DER Pin，然后按 [操作说明](signer/README.md) 生成新的实际候选、两次分别签署并只读验证。两次签名之后，实际安装仍需另行精确批准。当前 [部署申请](approval-request/deployment-request.md) 的最终证书、签名时间、ID/窗口和 Hash 都为 null / NOT_RUN，没有可执行 Apply 命令。
