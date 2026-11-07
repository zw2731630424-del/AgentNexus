# M1.4 Windows 系统部署审批清单 — 未执行

**没有系统变更授权。本文件不是部署已通过，也不是执行批准。** 用户任务第十三节要求系统级修改单独授权。本轮仅做源码、合成临时进程/内核对象/文件测试和只读preflight；未创建账户、未修改已有ACL、未创建AppContainer、未改防火墙/服务/Ubuntu。

实际起始状态保存在[evidence/phase0/preflight.json](evidence/phase0/preflight.json)：两账户不存在，以下部署目录不存在。批准前再次只读核实；如已有同名对象或状态变化，停止该项并重新提交差异。密码由操作者安全交互设置，不能写入脚本、argv、环境、源码、日志或让Host获得Worker密码。

## 确定的启动方案及限制

采用用户态Host/Broker和Worker Launcher，在两个标准账户下运行。计划采用Task Scheduler PASSWORD/批登录，不使用管理员服务，不授交互登录作为失败回退。批任务的登录权、Task对象及受保护entrypoint是独立授权项；现有服务存在不表示可以创建Task。[微软批登录说明](https://learn.microsoft.com/windows/security/threat-protection/security-policy-settings/log-on-as-a-batch-job)、[Task安全上下文](https://learn.microsoft.com/en-us/windows/win32/taskschd/security-contexts-for-running-tasks)。

当前代码为库及native RPC候选。长期Host/Broker/Worker的生产启动器、私有密钥bootstrap及持久Named Pipe接线尚未具备完整组合证据，CPU资格也不稳定；因此下面账户/新目录/Profile可单项审阅，**Task注册/生产启用目前不提交执行批准**。批准基础对象不会批准未来Task、网络能力或放宽资格。

## 可逐项批准的基础对象

| ID | 精确对象与允许变更 | 主要风险/前状态备份 | 回滚 |
|---|---|---|---|
| M14-SYS-01H | 新本机标准账户AgentNexusHostM14，创建时Disabled，仅Users；禁止Administrators及其他管理组 | 新持久身份；保存不存在证据、创建SID、禁用状态、全部组及本轮created标志；若同名已存在不修改。Users可能继承交互登录权，未批准精确拒绝/Batch权利前不启用 | 撤销新会话、核实全树/producer，再禁用；只删除created=true且SID完全匹配的本轮账户，审计保留 |
| M14-SYS-01W | 新本机标准账户AgentNexusWorkerM14，创建时Disabled，仅Users；独立密码，不向Host提供 | 同上；Worker不能控制Host/审批/Policy/Registry/数据库，不因创建账户自动获准登录 | 同上；不删除已有用户/profile或未确认的运行资源 |
| M14-SYS-02 | 仅创建下述新部署目录，并对新对象设置精确DACL；不递归更改仓库或现有运行时目录 | 保存每个路径不存在证据；新建后、改DACL前保存owner/原完整SDDL及精确新增ACE；若对象预存在则暂停该项 | 先停止并核实执行树；按保存SDDL恢复本轮新目录，撤销本轮新增ACE。未知锁和数据不删除；目录删除另列逐路径清单 |
| M14-SYS-03 | 仅为新Worker账户注册AppContainer Profile AgentNexus.M14.Worker（合同v1）；零capabilities；对SYS-02明确的只读/工作目录加入该Profile SID所需ACE。依赖另批SYS-04及可核实Worker hive/非交互bootstrap | 持久Profile及ACL；先保存Worker hive中该精确名字/SID的不存在状态及各目标SDDL，确认不是现有Profile；不能在操作者或Host的HKCU下替代创建。前置未就绪时不执行。低权限/网络/COM/其他目录仍需实际对抗 | 撤权并核实所有实例退出，删除created=true且SID匹配的本轮Profile，逐条撤销新增ACE；不覆盖其他Profile/ACL |

SYS-02仅覆盖根 `I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.4\deployment` 及这些精确子目录：`host`、`broker`、`code`、`runtime`、`worker`、`workspaces\m14-synthetic\task`、`workspaces\m14-synthetic\tmp`、`workspaces\m14-synthetic\output`，以及形成这些路径必需的新父目录。没有通配授权，不含I盘根、项目根、D:\Nodejs或其他用户目录。

拟定访问矩阵：host/broker控制目录只予Host及操作者/SYSTEM所需管理权限，Worker和AppContainer无读取；code/runtime由Host管理，Worker/Profile只读执行；task/tmp/input最小只读；output优先只允许Host File Broker创建，Worker不直接写，以免绕过Broker配额。每条实际ACE必须在执行前把新SID、SDDL和路径展开成最终清单，获批对象之外不变更。若Node加载器需要额外目录权限，应单列审批，不能扩大到整个仓库/用户目录。Node只复制到新runtime目录，不修改现有安装ACL。

## 后续单列，不包含于上项批准

| ID | 候选对象 | 当前状态/新增批准条件 |
|---|---|---|
| M14-SYS-04 | 新SID的SeBatchLogonRight，以及精确SeDenyInteractiveLogonRight/SeDenyRemoteInteractiveLogonRight | BLOCKED_PENDING_FINAL_BOOTSTRAP；先导出该SID修改前LSA权利，分析Users继承的交互登录权，逐项增量回滚；不改现有用户/域GPO，不授Service Logon/特权 |
| M14-SYS-05 | Task目录\\AgentNexus\\M1.4，候选HostBroker与WorkerLauncher两个Task | BLOCKED_NOT_READY；需先完成可审阅entrypoint、固定可执行/脚本hash、Task XML、无提权RunLevel、密码处理、重复启动锁、取消与崩溃恢复；备份原Task XML/不存在状态。批准后也只创建清单中Task，回滚仅停止/删除本轮新Task |
| M14-SYS-06 | 真实组合运行、跨账户/网络/目录/退出/重启资格 | NOT_RUN；必须先有完整代码接线与逐项系统批准，并修复或解释CPU不稳定，不能由原语或模拟结果替代 |

生产资格证书默认空，PROCESS/EXTERNAL_EFFECT仍BLOCKED。完整成员历史、默认拒绝网络、其他项目/管理库拒绝、硬磁盘/文件限制、实际Host重启、短命成员及外部producer未具备全证据；不能用人工勾选证书补齐。任何已批准项失败就保留证据和隔离状态，不自动授管理员权、放宽DACL/网络或改用交互登录。

明确不请求：防火墙变更、驱动、系统服务安装、Ubuntu账户/ACL/防火墙、Provider/API Key、科研任务或其他项目访问。可分别批准SYS-01H、SYS-01W、SYS-02、SYS-03；未点名项仍未授权。实际部署前状态快照必须与本清单重新比对，批准只适用于列明对象和权限边界。
