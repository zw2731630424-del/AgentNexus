# DeepSeek 官方接口增量复核

核对日期2026-11-08，均为公开文档，未带Key请求/models或/chat/completions。POST目标https://api.deepseek.com/chat/completions；请求ID为deepseek-flash，当前文档服务标签DeepSeek-V4.1-Flash-1017。旧deepseek-v4-flash等兼容名由官方转发，本轮不用；标签不等于可固定快照。真实response model与fingerprint仍null。[价格/模型](https://api-docs.deepseek.com/quick_start/pricing/)、[模型元数据](https://api-docs.deepseek.com/api/list-models/)。

stream=true的SSE以[DONE]终结；Usage跟随最后一个含finish_reason的内容choice，非独立usage-only块。prompt=cache_hit+cache_miss，total=prompt+completion；reasoning是completion细分，单列不再相加。Json Output需json提示与合理max_tokens，空白/截断不计成功；Tool Calling先产生意图，结果回放需独立原生多轮实现。[Chat协议](https://api-docs.deepseek.com/api/create-chat-completion/)、[JSON](https://api-docs.deepseek.com/guides/json_mode/)、[工具](https://api-docs.deepseek.com/guides/tool_calls/)、[Thinking](https://api-docs.deepseek.com/guides/thinking_mode/)。

每百万token美元价格：Flash峰时hit0.006/miss0.30/output1.20，非峰减半。草案按全miss峰价保守预留，实际invoice仍未知。Flash账户并发2500，跨Key合计；本地更低。服务可发keepalive，未开始推理等待10分钟后可关闭；本地30秒deadline独立，取消不等于未计费。[价格](https://api-docs.deepseek.com/quick_start/pricing/)、[限流/超时](https://api-docs.deepseek.com/quick_start/rate_limit/)。

400/422参数、401认证、402余额、429限流及5xx服务错误分类保留。所读官方页没有提供所有失败/中断情形一律免费或一律收费的充分合同；不得推断0费。有合法失败Usage则计入，无Usage保留UNKNOWN并停后续请求，不自动重发。[错误码](https://api-docs.deepseek.com/quick_start/error_codes/)。
