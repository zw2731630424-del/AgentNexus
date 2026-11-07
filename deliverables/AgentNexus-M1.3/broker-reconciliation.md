# Execution Broker 与 Resource Reconciliation

实现边界：RuntimeControl 是有界持久 admission/identity/capability/nonce/资源隔离 owner；`ExecutionBroker.dispatch()` 始终 BROKER_OS_DEPLOYMENT_BLOCKED。独立生产 Broker 进程、Worker Supervisor、任意文件 Broker 及受限 Worker 组合执行尚未部署；本轮没有将拒绝桩描述为独立执行 Broker 已完成。工具只能通过旧 Gateway 的可信本地 handler 合同执行；不可信代码没有受支持通道。

能力 profile：PURE/READ_ONLY 保留可信本地例程；不可信 worker 同样需 OS profile。LOCAL_WRITE 保留原独立精确审批/Writer合同，新远程路径继续 BLOCKED。PROCESS 与 EXTERNAL_EFFECT 缺真实组合沙箱和结果 owner 时硬拒绝，即使 Policy DISABLED、requires_sandbox=false 或 Feature OFF。future dispatch 必须消费原 Gateway Permit/Approval，绑定 operation/intent/resource/epoch/profile 到已验证 runtime，执行前 flush 再最终 fence；此桥接还未实现，不通过新 admission 回执绕过旧 Gateway。

新表使用原 KernelStore 的短事务和审计 outbox；一 operation 绑定唯一 runtime/profile/generation 和能力意图 hash，ONE_OPERATION 实例拒绝改绑。ExitProof 只能引用已绑定操作，不能替原 M1.2 SETTLED 或人工裁定。缺完整 production_release_authority 时五种 reservation 全保留。

重启扫描旧 boot 身份并失效能力，operation置 INDETERMINATE，Workspace/Writer/Quota/Slot/Sandbox 都 UNKNOWN_QUARANTINED。没有自动启动同名 Worker、重发请求或释放锁。真实 Host 子进程在预留后、证明记录后和释放拒绝屏障被强杀；重开状态仍保留，原 M1.2 Writer 表无新释放路径。这里的强杀恢复只证明进程崩溃和同机 SQLite 恢复；全机重启/硬断电/OS树恢复分别 NOT_RUN。

审查发现已增加原生观察超时与取消、独立未settled观察配额、退出终态连接密钥清零回收、逻辑会话关闭撤权和相互矛盾证明拒绝。不合作 native observation 到期后仍占 owner 配额，最多32；重建 observer 需可信管理员核实旧观察，不无限补发。
