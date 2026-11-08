# Storage Recovery

真正终止独立 Node Host 子进程后，先由 KernelStore 核实旧 writer PID 已退出并恢复 abandoned lock，再打开同一 SQLite/Artifact 根。没有重启 Windows 或进行断电试验。

| 中断窗口 | Owner 的显式裁定 |
|---|---|
| REQUESTED / AUTHORIZED / WRITE_INTENT | 保留原记录；确认从未进入发布阶段且目标未变，才能明确中止 |
| TEMP 创建 / 实际写入中 / 写完 / 内容验证后 | 先保留 UNKNOWN；显式核对 owned temp 身份后清理，中止状态与 path claim 原子提交 |
| PUBLISH_READY，目标未出现 | 无法仅靠未出现目标证明所有历史副作用，继续 INDETERMINATE |
| CREATE 已 link，尚未 unlink temp | 两个名字都必须匹配原 temp identity、完整 hash/bytes 和 nlink=2；显式删除已证明的 owned 第二名字，再核 nlink=1 |
| 原子发布后、Audit ACK 前 | 由 temp identity + 实际目标 hash/size + Operation/intent/version 记录 + 原 Artifact 完整验证裁定 RECONCILED |
| Audit ACK 后、调用方收结果前 | 查询原 operation 返回既有确认；不重复写、不发布第二版本 |

同一 operation 的并发恢复占同一执行锁，并服从两操作上限；关闭 Host 能看到尚在运行的 reconciliation。独立审查复现过的“并发恢复把成功降回 UNKNOWN”和“已中止但 claim 仍 HELD”均已修正，修前和修后证据保留。

已注入 ENOSPC/EACCES 与 unlink EIO，并测试发布后内容被改写、容量不足、并发同资源争抢和历史文件保护。这些 I/O 故障是明确的 fault injection，不称为真实磁盘耗尽、实际 ACL 变更或 OS 事故。真实文件读写、hardlink/rename、SHA256、SQLite/Zstd 和进程终止分别实际发生。

Owner 文件结果与 Gateway/Task/资源结果分属不同 owner。崩溃后即使文件被显式确认，原 Gateway 执行/输出及旧 Worker 退出事实不足时，Task 和资源仍 UNKNOWN，不自动转成功、不自动释放，也不自动重新派发。保留原 Operation Reconciliation 管理接口，不能用文件存在替代生产 ExitProof。

Windows portable Node 没有可用的目录 fsync；文件 sync 实际执行。当前结论限定本地进程崩溃恢复，硬断电、OS 重启、恶意同账户写入和生产部署均不在 PASS 范围。
