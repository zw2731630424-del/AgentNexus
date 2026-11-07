# AgentNexus M1.5 独立安全审查

结论：**限定代码审查完成（PASS_LIMITED）；完整 Windows 生产执行链仍 BLOCKED。** 已回报问题的代码处置均已复核，当前范围未发现尚未关闭的 P0/P1 代码问题。本结论不授予生产运行、系统变更或资源释放资格。

## 字节绑定与独立性

最终集合：91 文件，SHA256 `a55823fae02fd565249cf0d2af1f3257d2e107b798b05b078b74ba15eb0e109e`。全部文件逐项与主代理最终清单相同；独立探针前后集合均相同。详见 [逐文件清单](source-snapshot-approved-after.json) 和 [独立比较结果](freeze-verification-approved-final.json)。

本代理只写自身 runtime 审查目录，未改产品源码或历史交付，未递归委派，未运行完整回归，未改账户/ACL/Profile/服务/防火墙，未读取 API Key 或连接 Provider。

全文审查主要覆盖 28 个产品文件：全部 11 个 bootstrap TS、13 个 production TS、两份原生 C#、runtime.ps1、CPU 资格工具；另核查存储锁、IPC、对账释放与新增模型测试。91 文件的散列覆盖不表示每个旧测试/目录均作完整语义审查。

## 发现与闭合

| 编号 | 问题 | 已复核的代码处置 | 证据范围 |
|---|---|---|---|
| IR15-01 | peer 复查与输出争用单飞 RPC | 有界共享串行门 | 独立 SIMULATED 交错探针 |
| IR15-02 | 已结算 prepare/helper 映射不退还 | 仅 root/Job/output 结算后退还内存与 helper；未知仍持有 | 独立 SIMULATED 连续 5 次结算 |
| IR15-03 | 配置路径大小写与两角色清单循环 | 统一外置配置 hash pin、路径规范化与 distinct Operator | 独立配置模型/静态接线 |
| IR15-04 | 通用解释器指纹不足以确认 Launcher | enrolled key 签署双方 pipe tuple、随机挑战、配置/源码/helper hash | 5 项独立签名模型；真实密钥 ACL/跨账户仍待验证 |
| IR15-05 | 源码/权限/数据库对象覆盖不足 | 完整逐文件 pin、ACL 语义、根互斥、4 batch/all-lease、私有存储只读 ACL 扫描 | 4 项权限模型、6 项配置模型与原生静态审查；真实部署 NOT_RUN |
| IR15-06 | crash 遗留锁阻断 ledger recovery | attestation 后先作已有 owner-death 恢复并保留锁证据 | 当前账户 storage 原语；真实 Host 重启未验证 |
| IR15-07 | 单次任务结束后身份能力仍可 ACTIVE | revoke runtime/endpoint；FileBroker 在审计前后复查 live identity | 独立撤销注入模型，nativeReads=0 |
| IR15-08 | Broker 账本无 owner release 确认通道 | 完整本地 proof + Host 独立释放回执；RELEASED 投影 revision+1 原子复用 | 6 项独立回执模型；真实释放未获资格 |
| IR15-09 | 挂起创建前缺审计/实时门禁 | REQUESTED/PREPARING 先 flush；原 Permit 事务 transfer；未知准备槽持久隔离 | 主代理自检发现；独立复核并重跑 3 项模型 |

另复核了新增 4KiB 文件摘要：原执行 Grant 与精确 FileGrant 双签名、operation/runtime/worker/resource/path/hash/epoch 绑定、不可变输入与 Launcher/Worker 两端验证，11 项独立模型按预期。原生 OS 版本与 profile 等值、只读路径范围、Node/PowerShell 父目录 pin，以及 CPU 测试隔离源码副本清单也已复核。

## 独立复核结果

| 范围 | 结果 | 限定 |
|---|---|---|
| RPC/回收、权限、Launcher proof、释放回执、文件输入、配置/batch 模型 | 34/34 按预期 | SIMULATED；真实临时签名/SQLite 不证明 OS 隔离 |
| 新准备槽/禁用 Launcher 模型测试 | 3/3 按预期 | 重跑作者的 3 项选定测试；审计失败/关闭状态下创建计数为 0 |
| 存储 crash/lock recovery | 1 个序列按预期 | REAL_OS_CURRENT_ACCOUNT_STORAGE_PRIMITIVE；不是生产 Host 重启 |
| 跨账户生产链/组合 Sandbox/真实 ExitProof 释放 | BLOCKED / NOT_RUN | 无本轮系统授权与组合 OS 证据 |

日志均以 `approved-final-` 开头，SHA256 与源码绑定记录在 [机器报告](independent-security-review-final.json)。所有失败、初始 harness 限制、早期不完整模型与 44b2be4… 中间冻结记录均保留，没有改写为最终通过。主代理最终完整回归与 CPU 运行结果由作者后续归档，本报告未代为认定。

## 生产阻断条件

Host、Operator、Launcher 标准账户、受保护启动对象、enrollment 私钥与批准的存储 mutator 属于可信计算基；受限 AppContainer Worker 是待验证的攻击边界。真实部署必须证明 Worker 读不到私钥/管理数据库/其他项目，且真实 peer、挂起进程、绑定、撤销与退出生命周期闭合。

WindowsSupervisor 的 network/filesystem/limits 观察仍为 false，CPU/磁盘硬限制与组合攻击资格未完成；局部原语、证书、设置读回或偶然 CPU PASS 均不能补齐。历史 CPU 失败原件必须保留。真实 Host 重启、未接管准备槽、完整 Job 历史、输出 producer、IPC 未知状态和独立 owner 释放仍须取得目标 OS 证据；未知状态没有自动释放兜底。

Ubuntu 仅有技术准备，实际部署和组合测试仍需单独授权。本审查的任何限定通过均不转移为 Windows 或 Ubuntu 生产通过。
