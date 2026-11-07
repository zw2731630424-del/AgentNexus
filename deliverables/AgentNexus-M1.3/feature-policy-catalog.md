# M1.3 Feature / Policy Catalog 增量

机器目录：交付源码的 `config/agentnexus/features.json`（原142+新增12）与 `policies.json`（原34+新增7）。旧条目内容与 M1.2 相等；旧目录顶层 0.2-design 标识保留历史意义，新条目显式 version=0.4.0-m1.3。

新增 Feature：security.identity.runtime、security.ipc、security.broker、security.sandbox.windows、security.sandbox.linux、security.process.supervisor、security.exit_proof、security.resource_reconciliation、audit.producer.ipc/worker/process/sandbox。全部 OPTIONAL、默认 OFF、全局 G、无已知互斥项；每项含 depends_on、off_behavior、degradation、recovery、tests。当前不注册可执行模块以防把协议或探针标为生产 READY。开启请求为 NOT_IMPLEMENTED；关闭不撤销独立保护，不给任何直连或无隔离 fallback。

新 L0 owner：P.RUNTIME_IDENTITY → Runtime Identity Registry；P.IPC_PEER → Trusted IPC Adapter；P.WORKER_SCOPE → Execution Broker；P.SANDBOX_PROFILE → Sandbox Controller；P.PROCESS_OWNER → Worker Supervisor；P.EXIT_PROOF → ExitProof Verifier；P.RESOURCE_RELEASE → Resource Reconciliation。均 non-degradable、ENFORCE、owner 未部署即 DENY/BLOCKED。三模式不能把任何条款放进应用旁路表。

映射测试：M13-IDENTITY/M13-IPC/M13-EXIT/M13-FEATURE/M13-RECOVERY/M13-IR，以及原 M12-PE-SANDBOX/M12-PE-MODE。完整 Linux/Windows组合准入测试仍未执行，见对应平台报告。实际通过计数只来自 test-results.json。
