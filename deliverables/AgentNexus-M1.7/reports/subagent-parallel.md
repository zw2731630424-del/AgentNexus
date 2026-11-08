# Subagent 并行报告

code-model、code-analytics、code-cli 分别有独立逻辑 Agent、Runtime、Task、Context、Model Binding、Worker Budget 和工作区。任务合同不相互写文件；接口由先行 Architecture 与需求约束。三个实际 dispatch→settled 区间有重叠，峰值3，见 native/report.json 的 concurrency。

编码开始的有界 barrier 用于可重复观察同时活跃的三个任务；之后每个任务确实调用 Gateway/Storage 并提交独立产物。这里证明 Node 进程内异步 Native 任务与资源预留的并发，不声称三台机器、三个模型服务或三个独立 CPU 进程的物理并行。

文件冲突和取消/失败恢复由继承 Storage/Task/Resource 及新增事件负面测试验证；单文件单所有者、expected_version/hash 保证 Debug 不能覆盖未知新版本。Integration 读取实际来源，逐文件发布到 delivery resource，再校验完整 manifest。跨文件发布不是原子事务。
