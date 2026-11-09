# 签名与证书验证

**UNSIGNED / NO-GO。** 用户确认没有已批准的外部签发者、数字签名证书和DER SHA256 Pin。未选择本机证书，未创建自签证书，未索取/处理/导出私钥，未签署任何文件。

194个载荷逐项进行Authenticode查询：108 NotSigned、83 UnknownError、3 Valid。83个UnknownError主要是非Authenticode格式的数据/脚本文件，不能当作签名有效或哈希失败。3个Valid分别是Node、d3dcompiler_47.dll和由本机系统Catalog识别的vk_swiftshader_icd.json；Catalog结果不构成项目外部签发批准。12个PE中只有Node和d3dcompiler_47.dll为Valid，其他10个均NotSigned，其中包括Service、Client、Helper、Launcher和Electron；安装脚本也是NotSigned。见 [逐文件原始状态](../evidence/payload-signatures.json)。

本机两个My存储中的7个公开证书元数据已记录，没有任何一个被批准用于项目；HasPrivateKey只是存储元数据，不表示访问私钥。资格和部署两份分离CMS均不存在，authority pin仍是BLOCKED占位符，launch plan已经过期。

签发者身份、公开证书及DER SHA256 Pin、签名方式/范围、同Host/Operator/Service SID/Epoch/期限/资格专用批准引用均待确定。Authenticode改变字节后必须完整重冻结Hash、重新检查依赖、严格构建、受影响测试及独立审查。当前清单是已核验基线，绝非最终签署安装清单。
