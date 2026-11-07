# M1.5 系统部署授权清单

**待用户逐项批准，尚未执行。** M1.4 清单不是本轮批准。本清单也不因代码/模型/原语通过而自动生效。用户任务第五、十四节明确要求“单独等待用户系统级授权”“不得擅自创建账户、修改ACL、注册AppContainer”。

只读预检时间为 **2026-11-07 18:33:57（Asia/Shanghai）**，原文和SHA见 evidence/phase0/preflight.json、delivery manifest。两个候选账户均ABSENT；M1.5新部署根和列出的子目录均ABSENT，旧M1.4部署根也ABSENT。计划任务读取被当前上下文拒绝，结果INCONCLUSIVE，不能说任务不存在。Worker hive/Profile和登录权NOT_RUN；没有创建或修改。

## 本次可单独批准的基础对象

| ID | 精确变更 | 前置状态与风险 | 回滚 |
|---|---|---|---|
| M15-SYS-01H | 新本地标准账户 `AgentNexusHostM14`，创建时Disabled，仅加入Users，不加入Administrators/管理组 | 执行前重新确认同名不存在；保存新SID、disabled状态、全部组、本轮created标志。高随机独立密码仅SecureString/内存，不入argv、日志或仓库；暂不启用，Task阶段再单列安全凭据处理 | 撤销本轮会话并确认无执行树后，保持Disabled；仅created=true且SID完全一致的本轮账户可删。已有同名/SID变化/使用状态不明则停止，不删除 |
| M15-SYS-01W | 新本地标准账户 `AgentNexusWorkerM14`，创建时Disabled，仅Users；密码独立且不交给Host | 同上。不授管理数据库、Admin Capability、交互/远程/服务登录；disabled不等于已完成未来登录权限制 | 同上；不删既有用户/hive/Profile或不确定运行资源 |
| M15-SYS-02 | 仅创建下列精确新空目录及列明父目录；此阶段不复制代码、runtime、凭据或数据，不设置/修改ACL | 前提每个目标及中间组件都不存在或为已确认正常父目录；拒绝reparse/重定向。保存创建后owner/完整SDDL，供下一阶段展开。不改项目根、I盘、现有Node/PowerShell安装ACL | 仅删除本轮created=true、路径解析仍在下述根内且仍为空的目录，从叶到父；非空、未知锁/归属变化一律保留，不递归删除数据 |

SYS-02 精确根：`I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\deployment`。精确相对目录（含必要新父级）：

```text
.
host
broker
code
runtime
launcher
configuration
workspaces
workspaces\m15-synthetic
workspaces\m15-synthetic\input
workspaces\m15-synthetic\task
workspaces\m15-synthetic\tmp
workspaces\m15-synthetic\output
```

不复用、覆盖或移动旧M1.4部署对象。实际操作前必须重新生成只读快照；若账户/目录前状态变化，本项停止，不把ABSENT假设用于已有对象。账户创建与空目录可以分项批准；未点名项未授权。

## 后续仍不请求执行的对象

| ID | 对象 | 进入批准前仍须提供 |
|---|---|---|
| M15-SYS-03 | 上述新对象的最终owner/精确DACL、代码与Node/PowerShell runtime复制、Host/Broker/Launcher独立签名key及public pins | 新SID生成后逐文件展开真实SID/SDDL/hash/复制源和回滚。Host/Broker/输入只予Host/既有Operator/SYSTEM/Administrators所需权限；Worker/AppContainer不得读管理库/私钥。公开代码/runtime只读，叶文件也单独核验。不修改现有安装ACL；本地runtime分发/依赖清单须先核实 |
| M15-SYS-04 | Worker hive中 `AgentNexus.M14.Worker` Profile，零capabilities及精确Profile SID ACE | 真实Worker hive/原不存在状态、Profile SID和默认LocalState等路径逐项ACL；拒绝以操作者HKCU代替。只对新对象逐条新增ACE，保存原SDDL；退出未知不删Profile |
| M15-SYS-05 | 两新SID的精确SeBatchLogonRight与SeDenyInteractiveLogonRight/SeDenyRemoteInteractiveLogonRight、启用账户、Task凭据 | LSA前状态逐SID导出、Users继承登录权分析、增量回滚；不改现有用户/GPO、不授Service Logon/特权。PASSWORD只经Windows受保护凭据接口，不让Host持Worker密码，不把失败改成交互登录 |
| M15-SYS-06 | `\AgentNexus\M1.5\HostBroker`、`\AgentNexus\M1.5\WorkerLauncher` 两固定Task | 先确认任务真实不存在；最终Task XML、Task DACL、精确Node/入口/外置配置hash、实际标准Operator SID、LeastPrivilege/PASSWORD、安全凭据流程、IgnoreNew/锁/重启与终止策略。当前未登记Task，也没有可批准的完整XML；不是Service安装批准 |
| M15-SYS-07 | 合成真实独立账户组合验收和生产Feature启用 | 真实identity/peer/启动/撤销/网络/文件/CPU/进程树/producer/重启/ExitProof/owner释放全部攻击矩阵。CPU严格资格当前FAIL，WindowsSupervisor network/filesystem/limits仍false，不能以手填证书或基础对象批准打开PROCESS |

Operator须是一个**已有**、与Host/Worker不同的可信标准账户，并在真实非AppContainer上下文验证；本清单不创建第三个账户。预检当前用户SID仅是观察值，不自动选择或授予管理权限。

基础批准只让后续前置状态具体化，**不会使完整Windows生产链通过**。未知准备槽目前无自动释放接口，原资源继续隔离。网络、磁盘/CPU硬预算、默认可写Profile目录和真实重启仍需后续工作。

明确不包含：防火墙、驱动、系统服务、Ubuntu、Provider/API Key、正式科研实验、自动Commit/Push、现有项目/目录迁移或ACL改动。
