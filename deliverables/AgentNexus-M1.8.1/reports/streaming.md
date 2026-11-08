# Streaming 与长上下文

新增官方末块Usage/cache格式、UTF-8与中文分块、截断JSON/tool、取消、连接中断和异常finish验证。SSE拉取模式保持背压，chunk64KiB/event64KiB/总wire1MiB/规范输出32KiB有界；Context最大256KiB，Gateway输出4096Token。本版没有宣称实测官方1M上下文或384K输出。

response-evidence.ts逐块计算精确wire哈希与bytes/chunks，失败保留不完整状态；请求正文SHA和Context/source manifest独立绑定。为避免跨块secret与reasoning泄漏，普通Archive只写guard通过的规范回复，未完整验证的原始partial不落普通档案。**安全隔离的原始partial分块持久化尚未实现**，不能据此验收用户要求的完整长流恢复能力。

真实Streaming/背压/网络断连/超长输出/任务恢复均NOT_RUN；既有合成测试和短流不等于真实稳定性。
