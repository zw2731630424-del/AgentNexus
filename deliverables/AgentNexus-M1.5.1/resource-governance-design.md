# Resource Governance Engine 独立设计

本轮实现的是固定能力失败门禁和机制描述 resources.ts；统一预算 engine、project/platform allocator、硬限额新后端尚未实现。无任何新硬限制因本设计标为 PASS。

| 资源 | Worker 范围 | 项目范围 | 平台范围 | 当前 Windows 事实 |
|---|---|---|---|---|
| CPU | user/kernel 分账、累计预算与调度带宽分离 | 多 Worker 聚合、已退出进程入账 | 各项目容量/保留额度 | JOB_TIME readback/计量真实；严格累计上界 FAIL；rate cap不等于累计 |
| RAM | committed process/job memory | 父 Job 聚合与 admission reservation | 分配上限/系统保留 | 现有 Job 配置/原语，不冒充部署组合资格 |
| Disk | workspace/Artifact/object bytes | 项目合计和 staging | 总配额/安全保留空间 | Broker 单次 byte cap；无 OS disk quota |
| Process | 同时进程数、spawn 生命周期计数分离 | 项目总 slot/active process | 平台并发容量 | ACTIVE_PROCESS_LIMIT 真实配置；不是累计创建数上限 |
| I/O | 流式 stdout/stderr、日志速率/吞吐 | 项目磁盘带宽 | 平台吞吐分配 | 输出上限/背压真实；OS 磁盘吞吐硬 cap NOT_RUN |
| Network | 允许目标、连接数、带宽 | 项目共享预算 | 出站容量/目标策略 | AppContainer 候选；默认全路径拒绝和硬带宽 NOT_RUN |
| Model | token/request/费用 reservation | provider/model 项目总账 | 平台总费用/频率 | 设计，未连接 provider；不是 OS 资源 |
| Time | monotonic task/lifecycle deadline | 项目时间窗口 | 平台任务寿命 | 可信 Supervisor 请求终止+退出观察；不能按计时释放 |

## 合同与状态

每次预算申请绑定 scope/owner/operation/resource/worker instance/profile/boot/epoch、单位、计量时钟、机制版本和能力资格。状态为 RESERVED → STARTED → SETTLED 或 UNKNOWN_QUARANTINED；实际创建挂起进程之前保留容量，恢复前再次校验，未知不能通过释放/重试获得新预算。子进程、已退出成员和外部 producer 分开计入与结算。

分 Worker、project、platform 三层先做原子 admission，限额采用最严格交集。Windows Job 层级可提供某些聚合计量/commit 限制，但不能由“能嵌套”推导所有资源均可硬限制。多 Job 独立性、Job 释放、版本/boot 重启恢复需要独立证据。模型费用采用 provider/应用层账本，并明确可能有远端结算延迟。

每个能力返回 HARD_OS / APPLICATION_BOUND / OBSERVE_ONLY / UNSUPPORTED 与证据摘要；签名证书不能覆盖 release 内置已知失败。当前 CPU strict cumulative 属于未资格能力，REAL_WINDOWS admission 固定 BLOCKED，无参数开关；SIMULATED 只运行协议测试，不产生 OS 执行/释放授权。

## 后续实现顺序

先为每个资源确定 OS 能给出的真实单位、统计周期、可证明上界与 failure mode；独立实现可信 resource ledger 和能力后端。CPU 若继续 Windows user-time periodic 方案，只能另行批准明确降级合同，不能沿用现有硬预算名称。选择虚拟化/其他后端也必须实际资格化，不能把设计替换当实现证明。预算监控/告警不补齐硬限制；未知状态继续由资源 owner 人工有证据裁定。
