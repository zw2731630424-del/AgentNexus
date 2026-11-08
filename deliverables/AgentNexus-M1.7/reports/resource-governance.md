# Resource Governance 报告

Worker、Project、Platform 在同一原生store中统一预留与结算。最新 Pilot 并发3，结束平台活跃 worker/memory/process/model reservation归零，持久文件 disk claims仍保留；UNKNOWN reservation为0。平台累计71次模拟模型调用，322390 tokens为模拟账本计数，不是供应商账单。

固定 Host checker 也申请三级逻辑资源。只有明确未执行或非空全部命令真实close且结论确定才释放；throw、空命令/INCONCLUSIVE、输出管道丢失或未关闭保持UNKNOWN隔离，不自动重跑。独立审查发现空报告提前释放的P1，已修复并用真实 Harness 负面测试验证。

Storage 最终10文件、analytics版本2，其余1；所有21次发布的Gateway操作SUCCEEDED/SETTLED并消耗精确approval/permit。32MiB等大文件回归使用流式路径；新增Node/Type工具hash改为64KiB块读取。固定Runner输出和输入有界，事件/历史索引也有界。

严格累计CPU仍BLOCKED。逻辑memory/process/wall预算、观测CPU/内存以及可见close不等同Windows OS硬限制。未取得资格的普通Agent PROCESS/EXTERNAL_EFFECT继续拒绝；未改账户、ACL或AppContainer。跨Host全局平台预算没有验证。
