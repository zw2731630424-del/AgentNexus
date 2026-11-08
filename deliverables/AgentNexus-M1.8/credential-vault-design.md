# Credential Vault 技术设计

采用独立 `CredentialProviderInterface`，把 OS 加密保护与 Pool/Lease 管理分离。Windows 候选使用 DPAPI CurrentUser，以固定 PowerShell helper 的匿名 stdin/stdout 管道传递有界字节，子进程不继承凭证环境；无交互、无命令行 secret、无明文文件。测试 AES-GCM 后端的随机主密钥只在内存，必须明确 SYNTHETIC，不允许作为生产后端或恢复依据。Ubuntu 预留 Secret Service/独立密钥服务适配器，无明文降级路径。

凭证数据库与 NativeState/Audit/Context Archive 分离，仅保存密文和白名单元数据。Host 管理对象按对象身份认证；Worker facade 不暴露 Vault。导入真实凭证需要独立安全交互和合格的 Host/Worker OS 隔离，本环境全部关闭。不能把测试 fixture 密钥当成真实 API Key，也不能扫描既有环境/凭证文件。

Key 状态：ACTIVE、DISABLED、INVALID、RATE_LIMITED、EXPIRED、ROTATING、QUARANTINED。租约将请求、完整 Subject、Provider、Model、估计费用绑定；原子事务选择满足健康/并发/频率/费用条件的 Key 并占用额度。轮换生成新 Key，旧 Key 不接新请求，旧租约可完成；UNKNOWN 不释放、不重试。删除只能针对已无占用项。

模型四级费用账本在单事务内预留 Agent/Task/Project/Platform 的 Token、请求和费用；Key lease 是独立的第二道准入。两者在发送前都必须成功；第二阶段失败只释放确认未发送的预留。发送意图先持久化，发送之后的超时、取消、断连或畸形 Usage 均保留 UNKNOWN。HTTP 401/429/5xx 分类记录，不以响应质量差自动切 Provider。

已知 secret 防护在 Prompt、模型完整响应、Audit/Context/Artifact 发布前扫描原始、JSON 转义、URL 编码、base64 表示。流式内容先在严格上限的内存中完成预检；不把分片 secret 写入普通 partial。泄漏事件仅记录固定原因和 Key handle，隔离 Key、阻止发布。未知或任意变换编码并无通用检测保证，依靠最小暴露与禁止把 secret 发送给模型；同账户内存读取和公开可信库 DB 绕过不属于已获生产隔离。

参考资料（核对日期 2026-11-08）：[Microsoft CryptProtectData](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata)、[.NET ProtectedData](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-use-data-protection)、[Secret Service 规范](https://specifications.freedesktop.org/secret-service/latest-single/)。从 DPAPI 的用户绑定推断本环境同账户 Worker 缺少隔离；此推断不是已执行的跨账户攻击试验。
