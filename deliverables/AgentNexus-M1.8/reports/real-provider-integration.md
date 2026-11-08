# 真实 Provider 联调：NOT_RUN / BLOCKED

真实 Provider 请求 0，真实凭证导入/发现 0，实际模型费用 0。用户尚未单独批准某个 Provider、具体 Model ID、数据范围和预算；本环境同账户 Worker/Vault 隔离也未获得生产资格。LIVE Vault 入口失败关闭，不以合成 DPAPI 实测冒称生产隔离。

OpenAI、DeepSeek、GLM 的三个 Adapter 已实现官方 Chat/SSE 协议字段差异，支持统一结构化回复、单个完整 Tool Call、Usage、Reasoning Token、错误分类、取消和有界流。当前联调用进程内 FixtureTransport，仅验证协议与 Harness 接缝；三家真实网络均 NOT_RUN。未登记任何凭模型名称猜测的真实能力或价格。

真实联调申请必须先确定并提交：Provider、具体 Model ID、精确 Endpoint、请求次数、输入/输出 Token 上限、最大费用、Host Vault Key 使用方式、具体数据发送范围/Context hashes、是否上传源码、ABORT_AND_REVOKE 停止方式。授权不跨 Provider，权限也不因模型切换改变。当前报告不构成批准，不请求在聊天中粘贴 Key。

公开协议依据：[OpenAI Chat](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[OpenAI Streaming](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events)、[DeepSeek Chat](https://api-docs.deepseek.com/api/create-chat-completion/)、[GLM 对话补全](https://docs.bigmodel.cn/api-reference/模型-api/对话补全)，核对日期 2026-11-08。能力和价格仍需按选定模型单独登记。

用户后续已明确选择 DeepSeek 作为首个准备方向；[具体联调草案](deepseek-smoke-proposal.md) 仍为 BLOCKED，并非 API/费用批准。
