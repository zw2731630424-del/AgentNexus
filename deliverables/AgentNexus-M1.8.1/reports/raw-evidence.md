# 原始请求、响应与 Audit

真实请求/响应/Usage证据为空，见evidence/live-requests.json。所有有内容的转录都是明确标记的SIMULATED fixture；模型请求/规范脱敏回复原Artifact hash已经逐字重建校验，见evidence/fixtures/model-traces.jsonl与request-index.json。

evidence/fixtures/audit.jsonl保留1882条本轮wire/campaign工程fixture Audit（含纯账本REAL assurance算法测试，但没有网络）。测试原始TAP/事件/错误、语法和strict TS结果全保留于evidence/verification；完整原始SQLite/Zstd对象留在对应.workspace运行目录，没有把离线工程Audit当作真实Provider Audit。
