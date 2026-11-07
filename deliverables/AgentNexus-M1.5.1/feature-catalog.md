# M1.5.1 Feature Catalog 增量

完整机器定义继续位于 source/config/agentnexus/features.json，170 项、无重复 ID，与 M1.5 原字节相同。没有因本轮测试打开生产 Feature；默认保护与 dependency/off/drain 行为保留。Catalog 分析见独立 catalog-analysis.json。

| Feature 组 | 关联能力/本轮变化 | 当前资格 |
|---|---|---|
| runtime.bootstrap.host / worker | 外置配置/精确身份、准备槽、recover、启动审计 | 模型 PASS，真实独立身份 BLOCKED |
| runtime.ipc.persistent / runtime.ipc.windows.production | 持久 peer/session/MAC/nonce/epoch/长度/配额 | 同账户原语 PASS；跨账户生产 BLOCKED |
| runtime.host.production / worker.production / broker.production | 原 Permit 唯一入口与 Supervisor | 固定 Resource gate 拒绝 REAL_WINDOWS，高风险 BLOCKED |
| runtime.sandbox.windows.production | restricted token、零 capability、Job、workspace | 原语有限；完整文件/网络/CPU组合 BLOCKED |
| runtime.file_broker | root-relative handle、版本/hash/byte cap | hardlink/junction/大小原语 PASS；symlink/独立隔离 BLOCKED；TOCTOU原fixture FAIL保留 |
| runtime.process_supervisor / exit_proof.production / exit_closure | 新 CPU/time/CloseHandle 观察，不提升 completeness | 已观察成员原语 PASS；完整生产证明 BLOCKED |
| runtime.resource_release.production | 五资源 owner/closure/receipt，不确定不释放 | 模型 PASS；生产 release BLOCKED |
| audit.producer.broker / file / process | 操作链审计与失败关闭 | 模型/部分原语 PASS；长期生产完整性 INCONCLUSIVE |

Resource Governance 是可信内核能力检查，**不新增可关闭的 Feature 开关**。170 项完整目录未删改；这里是本轮变更与资格视图，不将目录里存在的名称当已实现硬限制。
