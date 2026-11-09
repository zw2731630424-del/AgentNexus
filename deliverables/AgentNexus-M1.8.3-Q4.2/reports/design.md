# Q4.2 总体报告与设计

本轮交付独立审查后的本地资格签发工具、源码、离线测试及用户操作流程。实际用户证书尚未选择，DER SHA256 Pin 为 null；没有用户签名、安装或服务启动。整体保持 **UNSIGNED / NO-GO**。

Q4.1 原件及 Q3/Q4 历史原位保留。起始 HEAD 为 `36f7c4484991d0b6b8c3e0f523492b2caf9ed59c`，跟踪工作树干净。Q4.1 264 项源码、源码 ZIP、194 项载荷和 Q3/Q4/Q4.1 SHA256SUMS 已逐项核对；原载荷为 468,553,232 字节。完整结果见 [基线](../evidence/baseline.json)。

继续使用 LOCAL_QUALIFICATION、PRODUCTION_RELEASE、Q4.1 文档 schema、两份 detached CMS、DER Pin、安装清单、Verifier 及安装器。新的本地策略 epoch 为 5；旧 epoch 4 拒绝。生产合同没有获得任何资格。Q4.2 根目录只放工具及 staging，没有可签的 `approval/qualification-plan.json`；`reference/q41-approval/` 是历史模板，禁止直接签署。

实际修复集中在以下路径：

- 审阅时将输入保存为完整内存快照，并继续持有只读句柄；显示、签名和导出使用同一份 UTF-8 字节。签名前、最终 Yes 后和导出前后复核源集合与 Hash。
- 本地路径在文件访问前检查；目录从卷根逐级以 `FILE_LIST_DIRECTORY|FILE_READ_ATTRIBUTES`、仅共享读的句柄固定。叶文件以 OPEN_REPARSE_POINT 打开并核对句柄属性，拒绝 UNC、设备路径、网络盘及重解析点。
- 输出以独占新目录/CreateNew 创建，持续持有文件写句柄；读回完整文件与 CMS，在提交标记前后验证。没有标记的半成品不被接受，失败不自动重试或清理。
- 公开证书先限制精确 DER，再构造证书对象；拒绝 PFX/PEM/其他容器。显示名称、Subject、Issuer、serial、有效期、Pin、KU/EKU、算法，以及 CNG provider/container/export/UI policy。
- 公开加载不打开私钥。另一个用户按钮单独授权 CNG 属性访问，并明确它会取得具有密钥能力的句柄。实际签名另需最终 Yes。Framework 会按证书关联解析签名密钥；输出 CMS 必须对应原公开 DER，不能由此声称使用了同一个句柄或证明同 SID 隔离。
- 证书与 CMS 算法显式列入白名单；MD5/SHA1、弱 RSA、其他签名算法、本地到生产的模式变更均拒绝。生产分支补充整链 codeSigning ApplicationPolicy、detached 及 countersigner 检查，生产链实际资格仍 NOT_RUN。
- 准备工具要求公开 DER、独立 Pin、目标身份和新输出。它读取并核验完整工具快照，复用内存加载的现有 Verifier 合同检查公开证书；独占写出新的 ID、epoch、日期、config、launcher plan、194 项清单与两阶段草案。准备完成标记只表示公开材料完整，不授予签名或安装权限。

六个原生入口以 C#5 / Framework 编译，警告视为错误；Service/Client 各 90 个同源断言、Helper 138、Launcher 36。最终签名测试与回归计数见 [测试报告](testing.md) 和机读证据。相同断言不重复算作独立覆盖，更不计入原 70 项 OS 测试。

本轮没有读取或导出用户私钥，没有调用用户创建脚本主体、选择实际用户证书、修改证书库/信任、ACL、账户、服务或安装目录。模拟证书只在测试进程内生成，随后销毁；公开模拟 DER/CMS 与失败证据保留。真实 Key、真实 Provider 请求与费用均为 0，原 100,000,000 Token 授权不重置。没有 commit/push，也没有修改正式科研项目或项目规则。

独立审查、GUI 预览和文件系统控制的结论须分别阅读。真实 CNG/TPM 签名、每次交互、密钥 ACL、同 SID 调用抵抗和可信用户在场继续 NOT_RUN / INCONCLUSIVE。用户若不能提供代理不可访问的设备或安全主体，签发继续阻断。
