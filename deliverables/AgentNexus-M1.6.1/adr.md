# M1.6.1 ADR044—052

- ADR044：从 M1.6 的 123 文件独立复制；历史交付、根实现和原测试冻结，不追求修改合同后的全绿。
- ADR045：CPU 严格资格与普通回归分开裁定；真实动态路径攻击必须先证明替换发生，环境拒绝不是安全 PASS。
- ADR046：Storage Owner 是单一可信 namespace owner；文件 intent、temp、publish、Audit ACK 分离，不用 SQLite 事务虚构跨文件系统原子性。
- ADR047：CREATE 以 no-clobber hardlink 发布，REPLACE 需已知 owned version；异常与重启只隔离，不自动重新发布。显式 reconciliation 只采用身份/hash/原意图共同证据。
- ADR048：磁盘容量从 Worker reservation 转交永久 Project/Platform claim；文件仍在时释放 Worker 不能释放该磁盘。旧版本采用保守保留，GC 后续单独资格。
- ADR049：精确模型输入单独存 immutable Artifact 和 provenance manifest，原 Archive 永不被摘要或索引替换。读槽只覆盖读取阶段，不能跨持有到等待写槽。
- ADR050：消息送达、ACK、Task 接纳、处理和完成分开；Task 交接与 ACK 同事务，跨项目 Coordinator 仅能发送授权的固定内部通知，不能读跨项目原文或扩大工具权限。
- ADR051：自然语言不推断成程序规则；显式有限 DSL 才产生机械约束。Task 冻结 registry/hash/epochs/workflow，迁移显式并撤销旧 Gate 绑定。
- ADR052：Native Gate 运行可信注册检查器并核真实证据；legacy ledger、模型 PASS、SIMULATED 与 BYPASSED 均不是许可。Gate 候选须一路绑定实际文件输入。共享 Artifact 使用有界 opt-in 排队，保持旧 API 拒第三流的历史合同。
