# M1.7 实施建议

1. 使用本轮本地可信库范围开展合成仓库多 Agent 自主研发验证；明确任务、候选 Artifact、Gate profile、独立 Reviewer、预算和退出条件，保留全部失败。
2. 先把真实 Node 测试检查器、diff/commit 审查和交付 manifest 作为可信注册器接入 G3—G6；模型只能提交提案。多文件候选需要显式 manifest → 写入集合的 binding，不复用当前单文件 hash 桥接宣称多文件事务。
3. 为旧 Gateway/Worker UNKNOWN 建立独立的真实退出、输出与资源 owner 核对流程；不能仅凭 Storage 已确认就自动释放旧 Worker 或重投工具。
4. 存储历史容量 GC、所有权转移和销毁需单独审计证据；Windows 目录 durability、OS 重启/硬断电与恶意同账户目录竞争尚无资格。
5. 严格累计 CPU 维持 BLOCKED，另行选择可证明原合同的后端。不要把 JOB_TIME、CPU_RATE 或采样杀进程重新包装成生产硬预算。
6. Provider 仍全部 SIMULATED；真实网络模型、Vault、API Key、费用和生产执行账户/ACL 要另行明确授权与验收。本轮未读取 Key、连接 Provider 或发生真实模型费用。
7. Resident 长期服务、自动 Git watcher、Coordinator 优先级调度与长期 soak 分开建设；当前事件唤醒、状态摘要和受限通知不等于完整自治平台。不得自动 Commit/Push、安装 hooks、改变科研目标或运行正式科研实验。
