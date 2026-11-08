# M1.8 建议

1. 另行授权后接入单一真实Provider，先用很小的请求/费用预算与真实Vault后端，验证原输入来源、失败后UNKNOWN、取消、费用对账及人工停机。用未提供代码fixture的新需求评估真实规划、缺陷发现与研发能力，保持相同Gateway/Owner/Gate边界。
2. 独立关闭累计CPU根因：稳定采样Job CPU累计、区分JOB_TIME与deadline/主动停止、保留系统事件/ExitProof，再验证跨账户生产组合。资格未关闭前维持PROCESS/EXTERNAL_EFFECT BLOCKED。
3. 持续运行从本次实际2小时扩至24小时、多项目、崩溃注入/断电恢复；启动前冻结完整源码/toolchain/config快照，监测热索引、SQLite与Artifact增长，加入有界保留/备份策略，原Archive不能被摘要覆盖。
4. 将已保存的计划priority明确映射到Pilot入队优先级，再做有依赖/资源竞争的原生端到端验证（当前只有事件层单独priority测试）。对更大项目增加接口合同与冲突重基、Task历史检索工具和更长但有界的工作序列。多文件原子发布、跨Host平台预算与常驻Git watcher仅在明确需求和授权下单独设计验证，避免把现有逻辑进程误称OS隔离。
