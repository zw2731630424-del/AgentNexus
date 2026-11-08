# 唯一 Token Ledger Owner

真正 REAL Owner 固定为 Credential Service，文件 `C:\ProgramData\AgentNexusCredential\engine\ledger.sqlite`，不可由 UI/Host/RPC 选择根或 campaign。沿用输入+输出共100,000,000 Token 授权；当前真实消耗/预留均0，不再申请这项额度。生产账本缺失或 owner/assurance/全局额度不符时拒绝启动，不自动创建新的真实额度。

一次性初始化/迁移必须在获准部署中核对原账本和旧0用量证据；`evidence/deployment/ledger-genesis.sql` 仅供审阅，未向生产执行，非空库不得覆盖。之后更换 Key、Session 或 Host 重启都只使用原库。QUALIFICATION_ONLY 使用固定 qualification 子目录的 SIMULATED 计数，不能计入或授权真实额度。

SQLite BEGIN IMMEDIATE 在单事务内检查 GLOBAL、PROJECT、AGENT、TASK，预留四级 hold，写请求与审计并消费 prepared nonce。GLOBAL必须恰有一行且主键为m181-deepseek，计数合法；错误ID/重复行拒启，reserve绝不补建GLOBAL。UI 的 Agent/Task Limit 通过受认证 budget.configure 交给服务；只能更新限制且不能低于已提交用量，used/held 不被重置，GLOBAL 无修改 API。Host 原有账本只用于显式旧合成回归；远端路径没有 REAL campaign、REAL ModelUsageLedger 或二次额度，Host MODEL183_REMOTE_REQUEST 只是 authoritative=false 的审计投影。

完整 Provider Usage 且不超预留才核销；缺失/部分/超额/崩溃保留整个 hold，已观察用量仍只入账一次，并阻断新外发直至显式 reconciliation。重启将 RESERVED/SENT 转 UNKNOWN，不自动返还或重发。成本按服务内核验 Flash 费率计算保守估算，不能把估算称 Actual Cost；实际发票费用保留 null。

应用 Token Ledger 不宣称 OS CPU/RAM/Disk 等硬预算。原 Resource Governance 的严格 CPU、Worker 和生产文件门禁保持原裁定，不因模型接入放宽；后续真实 Agent 工具运行仍须走 Harness/Message Bus/Scheduler/Gates。
