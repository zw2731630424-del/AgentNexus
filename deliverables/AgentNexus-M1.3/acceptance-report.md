# AgentNexus M1.3 限定范围验收报告

**整体部署：BLOCKED。协议与持久控制切片通过限定验证；M1.3 完整 OS Identity/Trusted IPC/Broker/Sandbox/ExitProof 目标尚未完成。** 版本 0.4.0-m1.3；基线 main / 56a52ffee6e2d531957a8bbc697c995396d3f3fb；没有 commit/push。实际源码指纹、完整原始结果及独立报告随交付保存，不能只用未提交 HEAD 标识新实现。

## 基线与回归

开始时工作树干净。32 个 M1.2 文件与交付源码及最终测试 run 2026-11-07T03-39-19-800Z-33960 全部相等；925 个 tracked 文件冻结。重新运行 M1.2 得 171 项：167 PASS / 4 NOT_RUN / 0 FAIL。

最终 M1.3 隔离副本运行：**206 项，203 PASS / 3 NOT_RUN / 0 FAIL**，运行 ID `2026-11-07T06-20-28-431Z-15440`。原171个用例名称无遗漏。最终未运行断言：文件/目录 symlink 夹具 EPERM 两项，父退出子残留窗口未观察一项。原先 NOT_RUN 的 junction/hardlink 夹具在该次真实运行通过，不能反写历史记录。新的协议/崩溃测试28项全部通过；Windows原语测试7项中6 PASS、1未完成断言（包括父分组计数）。

Windows 原生测试曾在工具隔离内 pipe EPERM，保留 INCONCLUSIVE 原始尝试。获准在隔离外执行同样固定探针和完整回归后，真实 pipe peer验证通过。NOT_RUN 是测试框架跳过断言计数；原生尝试的 INCONCLUSIVE 状态另列，不能互换或宣称未运行故障场景已通过。

## 已实现并通过限定验证

- Logical 与 Runtime 合同分离；可信 Bootstrap/Supervisor接口持有创建、观察和撤销权。身份含 PID/start/SID/session、worker instance、boot、generation、profile hash。Agent 门面不含 runtime/admin；普通请求字段不能声明管理员或替代 peer。
- 持久生命周期、Capability单次消费、scope/operation/资源/profile绑定、MAC/规范帧/nonce/epoch/墙钟+单调期限、并发竞争、会话关闭撤权与重启旧 boot失效。测试 provider 显式 MODEL，回执只为 AUTHORIZED_CONTRACT_ONLY，不授执行。
- 五类资源独立投影、原始请求 operation保留、失联/超时/重启 UNKNOWN隔离；真实 Host 进程在资源预留、证明记录和释放拒绝屏障强杀后仍保留隔离。未修改原 M1.2 Writer释放规则。
- ExitObservation来源限定、operation归属、矛盾字段拒绝、终态连接密钥回收、有界原生观察与未settled配额。候选proof追加存储和完整性hash，所有生产release硬拒绝。
- Windows固定原语：真实GetProcessTimes/token SID/session；合法管道peer允许、同SID其他进程拒绝、payload自报SID/PID不起作用；挂起入Job、正常/终止后另观察空Job和进程句柄；Restricted Token创建。均不是组合沙箱。
- 审计SDK/覆盖矩阵和12 Feature/7独立L0 Policy目录；关闭安全Feature和应用三模式不开放高风险执行。原M1.2精确审批、受限ToolContext、原子Permit/Writer、Reconciliation、UNKNOWN producer、Flush target、统一Close Promise及其回归保留。

## 最终问题回答与未完成边界

| 验收问题 | 当前结论 |
|---|---|
| 确认 Agent 对应真实运行进程 | 协议绑定与Windows身份原语 PASS；生产Agent/Supervisor绑定未部署，BLOCKED |
| 确认 IPC 来自合法 Worker | Windows精确peer原语和协议防伪各自 PASS；生产受保护端点/独立Worker组合 BLOCKED |
| Worker 无法访问其他项目/管理库 | 实际独立用户与文件权限未部署，BLOCKED / 攻击测试 NOT_RUN |
| 工具仅经受控 Broker | 原可信本地 Gateway PASS；独立生产Broker/远程Permit桥接未实现，BLOCKED |
| 超时确认真实退出 | Job终止/等待原语 PASS；完整树/输出/资源释放证据 BLOCKED；超时不自动释放 PASS |
| 子进程残留 | 状态合同和拒绝不完整证据 PASS；实际父退出子残留窗口 INCONCLUSIVE |
| Host 重启恢复 | 实际进程强杀/库重开隔离 PASS；OS重启/重开Job完整核实 NOT_RUN |
| 未知执行结果保持隔离 | 协议与真实Host崩溃保留 PASS；无自动重试/无新释放路径 |
| 审计覆盖进程通信 | 新协议生产者 PASS；实际产品Broker/Sandbox/File生产者覆盖仍 BLOCKED，探针日志独立保留 |
| Windows/Ubuntu独立真实证据 | Windows有原语证据；Ubuntu仅设计，NOT_RUN / BLOCKED |

网络隔离、跨项目OS权限、子进程逃逸对抗、CPU/文件大小硬限额、独立Host/Worker身份、完整ExitProof、进程树恢复、长期soak与硬断电均不报 PASS。未连接Provider、未读取API Key、未修改其他项目、未运行科研、未创建账户/修改已有ACL/防火墙/服务器。

## 审查与验证限度

独立代理用独立上下文只读审查并校验最终45文件与测试快照一致；3项P2发现经修复和作者执行回归后复核，报告明确审查者未自行运行测试。初始与中间失败日志全部保存。Node语法检查、Python AST及PowerShell parser通过；没有静态tsc检查。完整治理门禁 PASS；Git whitespace按当前仓库保留CRLF的规则使用 `core.whitespace=cr-at-eol` 检查，无空格错误，不修改Git配置或历史字节。

本轮没有可发放 production_release_authority 的源，因此没有实现危险的自动解锁桥接。系统级后续工作需用户原任务第十六节所要求的单独授权；具体范围、风险与回滚见 [deployment-approval.md](deployment-approval.md)。
