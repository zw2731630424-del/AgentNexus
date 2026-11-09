# 四种签名与当前状态

资格计划CMS、部署批准CMS、PE/脚本Authenticode、证书DER SHA256 Pin相互独立。当前真实用户证书/Pin=null，两份用户CMS与提交标记均不存在，UNSIGNED / NO-GO。模拟测试DER/CMS不得用作真实本地信任锚。

本地策略明确authenticode_required=false，依靠用户独立批准的CMS精确绑定最终载荷Hash；不将PE宣称为Authenticode可信，也不授予生产发布。正式生产仍要求其正式代码签名政策/链/吊销证据和最终字节重新冻结。本轮12个payload PE的只读查询为10 NotSigned、2 Valid（Node和d3dcompiler依赖）；依赖已有签名不替代项目两份审批CMS。具体原始文件Hash和状态见[只读检查](../evidence/readonly-checks.json)。

公开DER输入必须是原始DER，拒绝PFX/PEM/额外编码；报告值为证书RawData SHA256。Windows SHA1 Thumbprint不是该Pin。创建/信任/用户私钥使用均未执行。
