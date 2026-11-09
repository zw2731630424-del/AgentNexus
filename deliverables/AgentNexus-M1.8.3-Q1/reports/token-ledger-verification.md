# Token Ledger 验证

**本轮实际服务账本验证 NOT_RUN。** 服务和数据根不存在，未创建资格账本、正式 engine、任何新的真实额度或预留，也未打开/迁移/写入旧 SQLite。沿用的输入+输出合计授权仍为 100,000,000；新增真实授权=0，AgentNexus 本轮真实请求/Token/费用=0。

已完整阅读 ServiceStore、Broker、旧 ModelUsageLedger/Campaign、Desktop service 和 Gateway。静态合同如下：

- REAL 服务根固定 `C:\ProgramData\AgentNexusCredential\engine\ledger.sqlite`；缺文件拒启，Owner 必须 `m181-deepseek-100m`，assurance=REAL，GLOBAL 只能一行且 id=`m181-deepseek`、lim=100000000。reserve 不补建 GLOBAL，RPC 无全局额度修改/重置入口。
- QUALIFICATION_ONLY 使用 `qualification\ledger.sqlite` 的 SIMULATED 计数。这个模拟容量不授予额外真实调用权，不能迁移/晋级为 REAL 账本。本轮连这份模拟计数也未创建。
- 外部服务端口存在时，Host 不初始化 REAL campaign；Gateway 远端分支不调用旧 ledger reserve，MODEL183_REMOTE_REQUEST 只记录 authoritative=false 的投影。旧账本代码仍在历史显式回归分支内，不能据此宣称本机所有历史进程的全局唯一性已实测。
- BEGIN IMMEDIATE 同事务处理 GLOBAL/PROJECT/AGENT/TASK hold、唯一 request/operation/nonce、prepared binding hash 与一次性消费。修改项目/Agent/Task limit 仅改变 lim，不清零 used/held。
- 重启将 RESERVED/SENT 转 UNKNOWN，保留占用、审计恢复、不重发；缺失/部分用量和取消不自动返还。Vault 与服务账本是独立数据库，不能声称跨库原子提交。

原 Provider UI 默认数据路径中的 kernel.sqlite/WAL/SHM 和合成 Vault 存在；本轮仅记录文件名/Hash 等只读指纹（见 [历史运行库观察](../evidence/original-ledger-files.json)），不连接 SQLite、不 checkpoint/backup、不解密。它们可能由任务外已运行的历史 UI 正常写入，因此 Hash 不是一致性数据库快照，也不能证明预算全局唯一。M1.8.2 原始 FAIL 与全部历史发布证据独立保留。

批准后必须用多真实客户端验证剩余额度竞争、四层原子性、唯一文件句柄 Owner、Host 不写第二 REAL 预算、原账本不覆盖、服务重启计数与 UNKNOWN 保留。原账本迁移/genesis SQL **不在本次 Q_ONLY 变更范围**。缺任何实际证据仍 BLOCKED。[Q1-OS-24、27—29](../tests/windows-attack-tests.json)
