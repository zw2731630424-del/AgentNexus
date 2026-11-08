# Streaming

Pull式SSE增量UTF-8解码、CRLF/多行/注释处理；chunk/event各64KiB，总wire1MiB，事件4096，最终输出32KiB。有背压、取消、deadline、断连/partial/length/未完成Tool Call拒绝。reasoning只做有界跨事件泄漏检查，不归档推理正文；reported reasoning tokens包含在output内不重复收费。

使用完整有界响应预检后再发布；从不把未完成Tool Call传给工具执行器。无自动连接恢复重发；UNKNOWN保持owner资源。
