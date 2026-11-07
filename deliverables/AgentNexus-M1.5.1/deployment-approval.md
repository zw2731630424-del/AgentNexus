# M1.5.1 系统部署审批清单

**未执行，等待用户逐项批准。M1.5 清单不是授权。** 只读快照为 `2026-11-07T19:34:00.3106587Z`（对应 2026-11-08 Asia/Shanghai），原始字段在 evidence/phase0/preflight-current.json。当前两个新账户均 ABSENT；新部署目录未创建；Task Scheduler 只读访问被拒，INCONCLUSIVE，不能说 Task 不存在。Worker hive/Profile/LSA 权限 NOT_RUN。

## 可单独批准的精确基础变更

| ID | 对象及实际变更 | 前状态、风险与执行约束 | 逐项回滚 |
|---|---|---|---|
| M151-SYS-01H | 创建本地标准账户 AgentNexusHostM151，创建时 Disabled，仅 Users；不授额外权利 | 当前 ABSENT；执行前再次查同名，已存在即停。随机独立密码仅 SecureString/内存，不入 argv/日志；保存本轮 created 标志、新 SID、全部 group/disabled 状态。不会授 Administrators、交互或服务登录 | 先禁用并核无本轮会话/执行树；仅 created=true 且 SID 精确一致才删除新账户。已有/重用/状态不明则保留，不删其 Profile/hive |
| M151-SYS-01W | 创建本地标准账户 AgentNexusWorkerM151，Disabled，仅 Users；密码独立且不交给 Host | 同上；不授管理数据库、Admin Capability 或私钥；本项不启用、不配置登录权 | 与 01H 独立同样校验，不用批准 Host 推导 Worker 获批 |
| M151-SYS-02 | 仅创建下列新空目录（含必要父目录），不复制程序/密钥/数据、不设 ACL | 当前列明路径 ABSENT；执行前逐组件确认无 reparse、最终绝对路径在精确根内。保存本轮 created 标志和创建后 owner/SDDL。不修改项目根/盘符或现有目录 ACL | 从叶到父，只删除本轮 created=true、仍为空且仍在根内的目录；任何非空/归属变化/未知进程一律保留，不递归删数据 |

SYS-02 精确根：`I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5.1\deployment`。

精确相对目录：`.`、`host`、`broker`、`code`、`runtime`、`launcher`、`configuration`、`workspaces`、`workspaces\m151-synthetic`、`workspaces\m151-synthetic\input`、`task`、`tmp`、`output`；最后三个均为 m151-synthetic 的子目录。没有其他隐含目录。现有本轮测试目录 m151-ps、m151-final 等不是生产部署根，也不作为批准目标。

## 本次不请求执行的后续阶段

| ID | 后续对象 | 进入批准前必须具体化 |
|---|---|---|
| M151-SYS-03 | 新代码/runtime/config/storage 的 owner 与精确 DACL、key 与 public pins | 必须等新 SID 和已有独立标准 Operator SID 确认后，展开逐文件真实 SDDL/hash/复制源/现状与回滚；本清单没有可批准的 ACL 变更，不改现有安装 |
| M151-SYS-04 | Worker hive 下 AgentNexus.M151.Worker AppContainer，零 capabilities | 真实 Worker hive/映射前状态、Profile SID、默认 LocalState 路径和逐对象 ACL；不以当前操作者 HKCU 代替 |
| M151-SYS-05 | 精确新 SID 的 batch/deny interactive/deny remote logon、账户启用 | LSA 前状态、Users/GPO 继承分析、增量授权与回滚、安全凭据接口；不导出密码、不授服务/管理员特权 |
| M151-SYS-06 | \AgentNexus\M1.5.1\HostBroker 与 WorkerLauncher 两个 Task | 重新只读查询、最终 XML/DACL/Node/入口/config hash/LeastPrivilege/PASSWORD/IgnoreNew/锁与关闭策略；当前没有完整可批准 Task XML |
| M151-SYS-07 | 独立身份组合验收和未来 Feature 启用 | CPU 硬预算仍 FAIL，本 release 固定阻断；需先完成能力设计、独立 OS 资格和新代码审查，不能用基础对象批准解除 |

Operator 必须是已有且与两角色不同的可信标准账户；当前未选择，不创建第三用户。审批 01H/01W/02 仅让后续状态具体化，不构成生产启动或完整部署授权。系统服务、驱动、防火墙、Ubuntu、其他项目、Provider/API Key、科研执行、Git commit/push 都不在变更范围。
