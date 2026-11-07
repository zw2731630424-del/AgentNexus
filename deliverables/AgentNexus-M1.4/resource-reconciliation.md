# M1.4 Resource Reconciliation 更新

实现位于source/src/agentnexus/production/authority.ts、exit.ts及候选reconciliation.ts。原M1.2/M1.3文件原件保持不变。状态：拒绝未知释放的限定合同PASS；生产正向释放BLOCKED。

| 资源 | 持有及释放边界 |
|---|---|
| Writer Claim | 原control_writers唯一resource/operation；M1.4 receipt缺失时不能用手工SETTLED绕过 |
| Workspace Lock | m14_host_resources的resource/kind唯一绑定；UNKNOWN不释放 |
| Process Slot | 所有HELD/UNKNOWN均计入slot，不因IPC/父退出回收 |
| Worker Quota | 与operation/worker instance绑定；失败和结果不确定仍占用 |
| Sandbox Reservation | 与profile hash、operation及资源版本绑定 |

Host消费原Approval/Permit与五资源、审计同事务，屏障后才桥接。独立Broker有自身消费账本，断连/超时不恢复授权。错误返回必须保留已提交operation；无法可靠写入投影时也只能报告未知，不能声称NOT_RESERVED。

释放必须先有非UNKNOWN最终Owner裁定、真实完整Broker签名ExitProof及已验证Artifact，再由Verifier复验签名并准备current-boot receipt。receipt记录五资源的resource/kind/state/revision精确快照。原M1.2 prepare/commit在事务中重新检查Host非隔离状态、inflight=0、当前boot、已验证proof哈希、receipt单次性与资源版本；原子消费receipt和释放全部五项。审计flush失败不返回成功。

重开旧Host时，远程操作始终保留executor UNKNOWN，不能从Host库缺少Broker的START_INTENT推断NOT_INVOKED。旧boot/旧receipt不开放资源；无法重新证明Job、成员或producer就UNKNOWN_QUARANTINED。当前Native仍membership_complete=false，不能产生生产释放权，因此没有以最终测试通过自动解锁资源的路径。
