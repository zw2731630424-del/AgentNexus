# DeepSeek 首轮联调申请草案

状态：**BLOCKED / 尚未执行或批准**。用户已选择 DeepSeek 作为首个准备方向；该选择不授权读取 Key、发送数据或产生费用。此草案用于审阅范围，生产隔离和安全凭证入口尚未资格，不请求现在提供 Key。

| 必需项目 | 拟议范围 |
|---|---|
| Provider | DeepSeek 官方服务，其他 Provider 不包含在授权中 |
| 具体 Model ID | `deepseek-flash`；官方当前列出的服务版本为 DeepSeek-V4.1-Flash-1017，实际 response model/别名须严格核对 |
| API Endpoint | `https://api.deepseek.com/chat/completions` |
| 请求数量 | 最多 3 次，串行；不自动重发 UNKNOWN 请求 |
| Token 上限 | 总输入最多 24,000、总输出最多 1,536；单请求输入预留最多 8,000、输出 512，包含协议/合同开销 |
| 费用 | 建议硬上限 **USD $0.01**；按峰时、全部缓存未命中的官方费率，24,000 输入及 1,536 输出核算约 $0.0090432，按请求分别向上取整后合计预留不超过 $0.009045；不是实际账单 |
| Key 使用 | 待资格的 Host-only Vault/凭证服务接收专用 DeepSeek Key；Agent/子 Agent 不读取完整 Key；不经聊天、源码、命令行或环境变量提供 |
| 数据发送范围 | 公开固定协议指令、三个合成任务、独立 smoke 项目的最小 Agent/Task 合同；执行前完整列出实际 Context hashes 和请求正文供审阅 |
| 是否上传项目源码 | **否**；也不发送本仓库实际规则正文、历史档案、科研材料或 Host 数据 |
| 退出/停止 | 任意时刻 Abort 并撤销 Grant，默认 30 秒请求 timeout、全轮最多 2 分钟；停止新调用，未知 Usage/连接/Key/预算保留至 Owner 核对 |

三个拟议任务分别验证：完整 JSON 回复、UTF-8 流式 JSON 回复、仅提出纯 `native.echo` 意图的结构化回复。没有 Search/Fetch、付费外部工具、Shell 或源码执行。

官方价格核对日期 **2026-11-08**：Flash 每百万 Token 峰时缓存未命中输入 $0.30、输出 $1.20；非峰时 $0.15 / $0.60。预算使用较高费率，不假定缓存优惠。来源：[官方模型与价格](https://api-docs.deepseek.com/quick_start/pricing/?helper=penn&method=individual)、[官方调用入口/模型名称](https://api-docs.deepseek.com/quick_start/pricing)、[Chat API](https://api-docs.deepseek.com/api/create-chat-completion/)。执行前必须重新核对价格和版本，草案不是永久价格保证。

执行前仍需闭合：Host/Worker 凭证隔离资格、真实安全凭证交互入口、实际 Context hash/公开数据准入合同、缓存/时段计费和 response-model 别名验证。本版网络授权 Owner 对普通 Harness 请求采取保守的源码许可门，本“无源码”smoke必须先具备相符的公开数据合同，不能把源码许可字段伪称已获用户批准。上述资格未完成前，LIVE Vault 保持拒绝；之后再提交最终可执行申请，等待用户明确批准。
