# 只读 Verifier 验证

命令行入口 `--describe`、`--identity`、`--public-certificate`、`--inspect`、`--verify` 只读取公开材料与目标身份。不调用 Apply、UAC、SCM 写操作、创建证书/服务、改信任、导入 Key 或连接 Provider。

`--verify` 使用目标实际 MachineGuid SHA256、当前 Operator SID、主机名、固定 Service SID，验证两份 CMS/Pin、完整清单/文件数量/字节、计划、部署批准、工具 Hash、epoch、时间和权限，成功仅返回 `SIGNED_LOCAL_VERIFIED_ONLY`。准备/签名设备不同于目标时，离线目标字段核对不能替代这一目标检查。

已有完整模拟两签输出能通过；被追加文件的原 valid fixture 会正确拒绝 PAYLOAD_FILE_SET。该 fixture 在套件末尾被故意修改，之后重跑早期正例必须使用 clean exported-approval，不能把预期拒绝说成产品回归。

新 194 项公开模拟准备输出只能通过 inspect，signed verify 因缺少真实确认/CMS拒绝。工具包 staging 本身没有资格计划与准备标记，不能直接签。公开证书入口与预览共享精确 DER 门禁，拒绝 PKCS12 后才可能构造证书对象。

安装器通过公开 VerifiedInstallation 验证/复制持有快照，并由其单独管理员 Apply 流程使用保护目录辅助函数；这些程序集辅助 API 不由只读 CLI 自动调用。本轮没有运行 Apply，也没有运行这些系统变更辅助方法。CMS 验证不会赋予程序 Authenticode 或生产信任。

测试结果分别见 [签名模拟](../evidence/signing-tests.json)、[完整准备](../evidence/preparation-tests.json)、[只读入口](../evidence/read-only-checks.json) 与独立审查原始记录。真实用户证书和两份真实 CMS 尚不存在，实际 `SIGNED_LOCAL_VERIFIED_ONLY` 资格仍 NOT_RUN。
