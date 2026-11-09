# LOCAL_QUALIFICATION 合同

[机读精确值](local-qualification.json)。固定 WINDOWS_BOUNDARY_ONLY / QUALIFICATION_ONLY，decision只能NOT_RUN/BLOCKED；epoch=4，单机/实际Operator SID/固定Service SID/随机部署ID/精确UTC round-trip期限最多7天。status=QUALIFIED、PASS资格或扩大范围一律拒绝。

用户通过独立渠道核对的公开证书DER SHA256（64小写hex）是信任锚；不是Windows SHA1 Thumbprint、本机生成、Subject文字或仓库certificate-pin.json。非CA，RSA>=3072，DigitalSignature，唯一RFC9336 documentSigning EKU，证书有效时间覆盖整份计划。数学CMS验证之外逐项检查Pin、用途、身份、算法与时间。

资格计划与部署批准是两份不同schema/确认类型/引用的detached CMS SHA256，单一签名者、无附带内容/计数签名；部署还绑定计划和计划CMS的原始字节Hash。缺任一签名或最后提交标记拒绝。签计划不批准部署；部署不批准真实Key；真实Key不批准Provider。

精确绑定主机MachineGuid小写UTF8 SHA256、主机名、Operator/Service SID、epoch、期限、安装清单/config/策略/系统变更/安装器/Verifier/Signer的Hash以及文件数/总字节。安装前重新读取实际机器与当前SID。离线工具无法实时观察另一目标机，用户必须独立核对目标身份。

real_import/live_provider/production_release/real_ledger_migration及旧real_import_enabled/live_enabled均为严格bool false；真实批准ref为空。19类精确名称/大小写复用运行期同一校验，只能NOT_RUN/BLOCKED。普通配置不可将本地证书升级到生产。

完整payload与app-manifest闭包逐项Hash，拒绝额外文件、重解析点、重复路径和Windows别名；持有只读流，从held stream导出/安装，复制后及运行期继续核验。运行期另验本地模式/两份CMS/完整清单/策略/权限/证书时间窗/受保护receipt。

安装器默认只读。实际Apply只允许用户自有Windows PowerShell5管理员会话，独立Pin、两份CMS、具体变更再次显示/短语确认；等待后复验时间和CMS，不自动提升。受保护DataRoot创建时附带DACL，先消费receipt再注册服务。已有目标/服务/receipt拒绝，失败保留。当前只安装stopped，start_service=true拒绝。

epoch4+receipt不是TPM单调计数器。管理员删除受保护状态、回退磁盘/时钟或替换验证器不在防重放承诺内；本包不支持无状态反复安装或自动恢复。更新/恢复另行设计与批准。
