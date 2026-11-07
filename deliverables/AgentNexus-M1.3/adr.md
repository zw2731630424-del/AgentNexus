# M1.3 ADR 010—013

- ADR-010：Logical Identity 与 Runtime Identity 分表，OS 来源仅由可信平台观察进入。身份撤销和退出证明互不替代，重启失效并隔离旧资源。没有部署证据的 Worker 不能得到生产 ACTIVE 授权。
- ADR-011：保持 M1.2 Gateway 的 PROCESS/EXTERNAL_EFFECT 强拒绝。Broker admission、协议状态机与原生原语可独立验证；requires_sandbox=false、Feature OFF、Policy DISABLED 均不成为执行许可。正式 Broker dispatch 需组合 profile 验收和独立审查。
- ADR-012：Windows helper 使用现有 PowerShell 7/.NET 内存编译自有 C# P/Invoke；无安装/驱动/服务。探针是固定合成子进程，创建 Job 与进程句柄是临时内核对象，不修改系统配置。完整沙箱部署另获具体授权。
- ADR-013：ExitProof 必须来自可信监督组件，先记录观察再授权释放。无法证明生命周期成员完整或网络隔离时只给 EXIT_UNVERIFIED；不发放能解除生产资源的完整证明。Linux 独立设计、独立 OS 测试，Windows 结果不移植。
