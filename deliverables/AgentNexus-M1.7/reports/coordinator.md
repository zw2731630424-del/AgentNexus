# Coordinator 报告

Coordinator 以单独 COORDINATOR Runtime 读取精确授权的 pilot/other 项目状态，保存 [coordinator-status.json](../evidence/native/coordinator-status.json)，在 Message Bus 向 lead 给出依赖与资源建议；无代码资源或管理工具。项目 other 仅为获准状态摘要夹具，没有科研任务。

Pilot按已准入DAG执行；计划priority字段被保存，但没有把work.priority映射到Pilot enqueue。事件调度器的priority支持由单独测试验证，不能将本次Pilot当作计划优先级落地实证；该映射标记NOT_RUN。三级预算在预留时同步限制共享并发；Coordinator模型策略无法提高授权。继承测试覆盖同库Worker/Project/Platform超额、跨项目边界和越权；未证明多Host/多数据库的全局平台协调。其边界为同一可信Harness store内已授权项目。
