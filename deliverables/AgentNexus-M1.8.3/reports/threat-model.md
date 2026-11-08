# Credential Service 威胁模型

可信根为 Windows 内核、管理员批准的部署/签发者、受保护服务二进制及服务身份。管理员/内核完全攻陷不在普通用户进程模型内；没有将 UAC 或 high IL 声称为普遍安全边界。

| 主体/事件 | 读密文 | 独立解密 | 调用服务 | 完整 Key | 代表 Agent 发请求 |
|---|---|---|---|---|---|
| 独立服务身份 | 必需 | 内部必需 | 内部 | 仅受保护内存使用 | 须精确审阅/预算/Handle/epoch |
| 用户可信输入界面 | 不需要 | 不允许 | 受认证录入/管理 | 仅正在输入的新值；无读回 | 不能把保存当连接成功 |
| 普通同 SID / 不同 SID 进程 | OS 测试须拒绝；攻击仍假设可获副本 | 必须拒绝 | 普通 token 必须拒绝 | 必须拒绝 | 不得伪造可信身份 |
| Agent/Subagent/Reviewer/Worker | 无 Vault API | 无 decrypt API | 仅 Harness scoped completion | 禁止 | 限冻结 Subject、Task、Project、Context |
| Prompt 诱导 Worker | 不因文本扩权 | 同上 | 不接受自报 PUBLIC/approval | 禁止 | 最终服务重验全请求 |
| 伪造 IPC / 旧消息 | 身份声明无效 | 无接口 | native token + 保护镜像 + channel | 无返回路径 | nonce/operation/request 单次消费 |
| 普通配置/缓存读取者 | 配置不含 Key | 无主密钥 | 公开 SID/PID/hash 不能授权 | 应拒绝缓存/转储读取 | 不授予出站能力 |
| Host/服务崩溃重启 | 密文保留 | 服务身份重开 | 旧在途转 UNKNOWN | 不输出异常正文 | 保留预算、不自动重发 |

同 SID 威胁包括普通用户权限本地恶意程序；实际 VM_READ/WRITE、DUP_HANDLE、dump、profile/Cache/Crashpad/WER 拒绝均尚未完成，生产继续 BLOCKED。输入 Renderer 能接触新输入，JS/Chromium 的字符串内存也无法证明全部即时清零；默认隐藏、清空和无持久化不能替代这些 OS 条件。

Provider 请求权不同于完整 Key 读取权。即使可信请求入口获准，也只可发送服务持有的 exact reviewed PUBLIC/SYNTHETIC grant；无任意 URL、方法、模型或认证头代理。授权和预算持久化不依赖模型声明。
