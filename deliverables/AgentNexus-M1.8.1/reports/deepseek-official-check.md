# DeepSeek 官方接口核验

核验日期2026-11-08。POST https://api.deepseek.com/chat/completions；请求名deepseek-flash，当前服务标签DeepSeek-V4.1-Flash-1017。另有deepseek-v4-pro，本轮未选。别名不等于可固定的快照。响应示例的model是deepseek-flash，实测标识仍未知。[调用文档](https://api-docs.deepseek.com/quick_start/pricing/)、[模型元数据](https://api-docs.deepseek.com/api/list-models/)。

流式SSE以[DONE]终止。当前DeepSeek的Usage位于携带finish_reason的末内容块；原OpenAI式usage-only合成fixture保留兼容。输入缓存拆分须守恒，reasoning已包含在completion中。每个真实chunk必须绑定model；model变化或畸形Usage关闭失败。JSON空白、length、aborted、insufficient_system_resource不计成功。[Chat API](https://api-docs.deepseek.com/api/create-chat-completion/)、[JSON](https://api-docs.deepseek.com/guides/json_mode/)。

Flash每百万Token美元费率：峰时hit0.006/miss0.30/output1.20；非峰hit0.003/miss0.15/output0.60。本地预留用峰时全miss上界，不沿用旧0.01美元限制。公开费率估算与真实账单分开，不能以UTC时钟猜测跨时段请求账单。[官方价格](https://api-docs.deepseek.com/quick_start/pricing/)。

账户Flash并发上限2500，跨Key合计；本地策略更低。SSE可有keep-alive注释，等待推理10分钟后服务端可关闭连接；这不意味着取消后免费或结果确定。本地30秒deadline/Abort始终保留未知Usage且不自动重发。[限流与超时](https://api-docs.deepseek.com/quick_start/rate_limit/)。

400/422映射能力/参数拒绝，401/403认证，402请求/余额拒绝，429限流，5xx Provider失败；不回显供应商error正文。[错误码](https://api-docs.deepseek.com/quick_start/error_codes/)。Tool Calling只产生受限意图，真正执行仍由Tool Gateway决定。[工具格式](https://api-docs.deepseek.com/guides/tool_calls/)。

重要未实现项：原生多轮assistant/tool消息与tool_call_id回放、reasoning+tool历史保持、非流式自然文本资格。当前Gateway使用结构化ModelReply与Context拼接，强制reasoning disabled；不能冒称这些真实模型能力已通过。[Thinking约束](https://api-docs.deepseek.com/guides/thinking_mode/)。
