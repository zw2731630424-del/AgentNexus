# Q2 Windows 攻击测试记录

日期：2026-11-09。**真实 Windows 攻击测试：70 项 NOT_RUN，0 PASS；生产资格：BLOCKED。** 本记录不能作为 native service 的生产 qualification 文件。

## 未执行的原因

针对自有良性目标的真实攻击验证已获授权。本包没有实现并部署的 Daily native listener 或服务创建、保护和认证 Runtime 的链，目标服务/Helper 也未部署；系统部署动作尚未批准。本轮没有启动 UAC、修改账户/ACL、安装/注册/启动服务、修改防火墙、AppContainer/Ubuntu 或使用真实 Key/API。没有构造或运行针对系统敏感程序的注入、dump 或句柄窃取程序。

统一未执行原因：`NO_DEPLOYED_TARGET_OR_NATIVE_DAILY_AUTHENTICATOR; SYSTEM_DEPLOYMENT_NOT_APPROVED`。这不是把自有目标攻击验证笼统判为未授权。同账户独立合成子进程与其 crash/restart 已实际验证，但不充当已部署目标的 Windows 隔离证据。

纯合成协议测试即使通过，也只证明注入对象/假通道/fixture 下的逻辑拒绝、持久状态和发送计数，不能证明 Windows 防注入、内存隔离、句柄不可窃取、ACL 或 native 调用者认证。真实测试没有用 synthetic “PASS” 填充。

机器可读计划：[windows-attack-tests.json](../tests/windows-attack-tests.json)。机器可读资格：[windows-qualification.json](../tests/windows-qualification.json)。比较依据：[daily-trust-options.md](daily-trust-options.md)。独立代码与合成测试结果：[independent-security-review.md](independent-security-review.md)。

## 测试矩阵

| 编号 | 数量 | 必须覆盖 | 真实执行结果 |
|---|---:|---|---|
| HLP-01–12 | 12 | 短时 import ticket 的重放、过期、取消、崩溃、替换、CLI/URL/env 注入、伪服务、元数据/secret hash 篡改、内存/clipboard/dump、跨方法与并发 | 全部 NOT_RUN |
| SRC-01–14 | 14 | 同 SID fake Host/CLI、公开 PID/path/hash/SID、伪 native 属性、VM/thread/token 权限、句柄窃取/继承、owner/DACL、PID reuse、创建窗口、依赖/loader/debug/env、session/remote、插件、包身份与 PPID | 全部 NOT_RUN |
| DLY-01–10 | 10 | Daily grant 跨 channel/runtime/service 重放、agent/task 身份、nonce/operation 并发、过期/时钟、取消/revoke、epoch/key、管理方法隔离、自签 grant、schema 与 mutation | 全部 NOT_RUN |
| REQ-01–10 | 10 | endpoint/header/model/body/context、重复 JSON、隐藏消息、内部数据/路径、自封 PUBLIC、task/key scope、资源上限与发送前栅栏 | 全部 NOT_RUN |
| BDG-01–08 | 8 | Daily/既有 High broker 共用账本、服务端估算、crash points、UNKNOWN/冻结余额、rotation/revoke、不清零、存储损坏/回滚及并发 | 全部 NOT_RUN |
| LIF-01–05 | 5 | Host/service 崩溃、重启/重连、部署/批准过期、复制句柄残留、假服务重放 | 全部 NOT_RUN |
| STR-01–05 | 5 | 错/漏/跨连接 ACK、backpressure、UTF-8/partial SSE、owner 交叉、cancel/usage 竞争和消费者崩溃 | 全部 NOT_RUN |
| PRV-01–06 | 6 | Key/canary 在 metadata/error/audit、持久状态 ACL、CLI/env/clipboard/DOM、dump、错误日志和资格混淆 | 全部 NOT_RUN |

每条 JSON 用例包含攻击说明、预期拒绝/状态、必须保存的观察、状态、未执行原因与空的真实 evidence 列表。它们是设计与资格门槛，未生成攻击可执行文件，也未尝试打开系统敏感进程。

## 后续真实资格应保留的原始证据

明确的受控部署目标与 OS build、签名/构建 hash、部署/批准清单、服务 instance、native Runtime 活进程句柄/创建时间/token/session 事实；进程、线程、token、IPC、文件/祖先的实际 owner/DACL/MIC 与逐权限拒绝码；仅自有良性 fixture 的句柄继承/复制、canary、崩溃和 stream 观察；服务端授权/ledger/send 的去敏时间线。不能只提交一组“PASS”字符串或客户端构造的 peer JSON。

安全接受结果应同时满足：伪来源没有 provider send、状态未被越权改变、合法操作仍可运行、原 High 管道保护未放宽、grant 不跨连接/实例重用、同一操作最多一次发送、所有 UNKNOWN 保持冻结且无自动 retry。注入/内存/clipboard/dump 未实测之处须逐项保留 NOT_RUN，不可从静态代码推断 PASS。

## 合成执行范围

最终独立复审实际运行：独立攻击 14/14、Q2 Daily 22/22、Q2 Desktop 契约 10/10、既有 Desktop service 回归 14/14、Helper 纯自测 117/117、Launcher 纯自测 21/21、native service 纯自测 40/40、实际合成 snapshot 的跨语言探针 4/4，通过范围均为纯/合成。重复的历史运行没有重复累加。命令、原始日志、精确 reviewed-file hashes 与限制见 [independent-security-review.md](independent-security-review.md) 及 `evidence/independent-review/`。

没有运行真实输入窗口、UAC/launcher 正常入口、目标服务或任何 native 隔离攻击。真实 Windows 70 项继续全部 NOT_RUN。
