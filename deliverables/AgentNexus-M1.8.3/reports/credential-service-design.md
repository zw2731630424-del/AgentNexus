# 独立 Credential Service

实现由 `source/native/credential-service/` 和 `source/src/agentnexus/credential-service/` 组成。SCM supervisor 固定启动 Node，先验证受保护安装树/代码清单、配置、CMS 签名、主机、真实服务 token、SID/会话及资格模式。挂起子进程先加入 kill-on-close Job，再恢复；只继承明确列出的匿名 pipe，最小环境不含 Key、PATH 或 NODE_OPTIONS。固定 attester 重验 Node→SCM 父链和有效期。

QUALIFICATION_ONLY 必须由外部签发者签署已获批准的测试计划。它不声明任何 OS PASS；只能固定 qualification 数据根、synthetic-test-* 和本地 Fixture。没有命令行/环境变量开关能将其变成 REAL。QUALIFIED 才能使用固定 engine 生产根；缺唯一账本拒绝启动，缺真实导入批准拒收 Key，缺精确请求用户审阅拒绝 HTTPS。计划到期关闭 pipe/Job，Node 也按到期时间拒绝后续请求。

Vault 复用 M1.8 的加密/租约/Key Pool/Guard，加了服务许可、固定 REAL 路径和句柄筛选。CurrentUser 指服务账户，绝非交互用户。真实 profile/DPAPI master key 重启恢复必须在部署阶段实测。明文只在受保护服务执行认证时使用；无 RPC 能选择 unprotect、回调或导出。Native helper 的明文 DPAPI 输出只经服务内部匿名 pipe，仍须真实 handle/DACL 验证。

Provider Broker 只使用 `https://api.deepseek.com/chat/completions`、POST、固定 JSON/SSE、首轮 `deepseek-flash`，禁 redirects、proxy 环境、任意 headers、任意 URL 和自动重试；请求体≤256 KiB、输出≤4096 Token、并发≤4、期限≤120秒，默认30秒。Flash 事实到期后拒绝生产，须重新核官方资料。Pro 仍可管理元数据，未获本轮执行资格。

独立账本与 Vault 是两个持久存储，不宣称跨库原子性。顺序为原子四级 Token hold→租约/最终 fence→持久 send intent→Provider；窗口不确定时只保守保留，不返还预算或重发。提交成功而 UI ACK 丢失时可能出现未标注的已保存 Key，列表和审计可核对，不能以失败重试自动重新发模型请求。

安装/ACL/账户/防火墙/AppContainer/Ubuntu 全未变更。部署和实际 Windows 资格见独立审批清单与机器资格报告。
