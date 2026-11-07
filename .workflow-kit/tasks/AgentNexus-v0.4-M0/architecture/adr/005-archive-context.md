# ADR 005 原始档案与派生上下文

状态：M0工程建议；无损保存和不以摘要覆盖原文为用户明确要求。

决策：原始观察事件和payload为第一层、当前项目状态/账本为可重建投影、摘要/向量/知识为派生层、模型当前请求为有限视图。四者不能合并。关闭检索Agent、摘要、向量或Evidence Manager都不停止原始捕获。

Archive单写者按Session顺序追加，64KiB分块与字节高水位，封段时Zstandard无损压缩，manifest记录序列、codec、原文/压缩hash与前段hash。大工具输出进对象流，模型只接有明确raw引用的预算内片段；不能把模型窗口截断等同删除工具原文。DB索引与文件无分布式事务，ACK屏障及orphan/未索引完整记录reconcile协议必须显式实现。[内部协议](../internal_protocols.md)。

原始内容指系统实际收到的消息、返回、工具/状态事件，不包括供应商未暴露的隐藏推理。Gateway不让API Key经过worker；意外敏感原文加密隔离，普通档案保留脱敏视图和受限引用，完整原文不被语义替换。检索子Agent仅获授权范围，返回event/range/hash、条件、缺失和冲突；不能改raw。

证据：DeepSeek有真实JSONL/Zstd/尾部恢复但buffer/整日志解码需缩小；OpenHands Condensation事件、Goose agent_visible、Cline sidecar均说明上下文视图与历史分离的重要性；Deep Agents offload失败仍summary显示raw持久化不能依赖摘要支路成功；Agensh退出tar不是逐事件durability。[研究矩阵](../../research/harvest_matrix.md)。

本轮真实Zstd round-trip/损坏检查、SQLite并发、合成半条尾记录已验证可行性；没有实现产品归档、备份恢复、断电或长期内存稳定。M1必须围绕已确认事件不丢失、manifest切换崩溃、磁盘满/背压和索引重建做故障注入，M7再做长时soak。哈希能检测变化，不独自提供对机器管理员的防篡改保证。
