# Model Gateway

原 ModelGateway 保留 MOCK 入口，可信Host通过modelRuntimeFactory注入统一port；Agent Loop核心不依赖供应商SDK。真实/模拟来源持久绑定请求，重启不按新transport重标。输入自有快照、Context reconstruct与manifest先验；SecretGuard覆盖所有持久入口。

Provider返回模型与请求ID绑定，三个Adapter有独立字段策略。只有完整SSE终止、完整tool arguments和已报告usage才可返回可用reply；无Usage/取消/断连/未知结果保留Key、四级账本和持久并发slot，不自动重发。当前默认一次尝试；401/429更新Key健康供下一独立请求使用，不在同一未知请求上无限切换。真实重试/故障切换联调NOT_RUN。
