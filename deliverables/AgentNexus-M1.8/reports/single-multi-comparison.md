# Single / Multi-Agent 对照：NOT_RUN，优越性 INCONCLUSIVE

没有真实模型样本，不比较“哪组更好”，没有把合成费用或生成代码数量当研究结论。A Single、B 同 Provider Multi、C 跨 Provider Multi 三组当前全部 NOT_RUN。

已冻结试验合同见 `pilot/experiment-plan.json`。沿用 M1.7 的独立 Pilot 起始代码，三组从相同逐文件 SHA256 开始；需求、固定验收、测试和公共输入相同。任务为现有分析 CLI 增加有界 JSONL 流输入及明确错误定位，不能修改正式科研项目。真正开始前必须固定模型版本、采样字段、同一费用/Token/时间上限、独立隐藏测试 hash 和评估者身份；缺任一条件不开始。

指标至少包括任务完成/测试通过/最终缺陷/Reviewer 发现率/返工/墙钟/Token/费用/消息数/人工介入/目标偏离。客观测试与独立审查评分，模型自评单列。三个 Provider 的授权分别取得，样本不足时不作统计优越性结论。
