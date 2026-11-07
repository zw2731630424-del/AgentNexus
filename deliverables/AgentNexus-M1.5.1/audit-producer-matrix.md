# Audit Producer 覆盖矩阵

Operation ID 与 Resource ID 从可信配置、原 Permit/Grant/账本传递；不能从 Worker 自报 SID/字符串推导身份。生产事件写入失败时必须在高风险准备、授权消费或 START 前失败关闭。现有模型及独立故障探针验证这个顺序；长期独立生产组合未运行。

| Producer | 事件来源/身份来源 | Operation / Resource / 状态与证据 | 接入与实际验证 |
|---|---|---|---|
| Host | native parent attestation、Control Plane | bootstrap hash/boot、PREPARING/BOUND/UNKNOWN、storage fingerprint | 已接线；模型+SQLite PASS，独立 Host BLOCKED |
| Broker | TrustedEndpoint + signed original Grant | operation/resource/intent、consume/start/result/quarantine/proof hash | 已接线；模型/本地进程 PASS，生产 BLOCKED |
| Worker | Host-bound instance、固定 Worker 入口 | 原 Grant/签名输入摘要、stdout/stderr/返回 hash | 已接线；固定 fixture/模型，生产 identity BLOCKED |
| IPC | kernel peer retained process/image handles、MAC session | channel/request/operation、nonce/epoch/deadline、close/revoke | 真实同账户原语 PASS；跨账户 BLOCKED |
| Sandbox | 可信 native token/Job readback | instance/profile/job/process tuple、create/assign/resume/termination | 实际原语；零网络/跨项目/管理库组合未测 |
| File Broker | 签名 FileGrant、root handle/file identity | operation/resource/path/version/hash/max bytes、read/create/deny | 模型+真实 hardlink/junction/size；symlink BLOCKED |
| Process Supervisor | retained OS handles、Job accounting | Job GUID、成员/parent/CPU、exit/EOF/handle close | 实际已观察成员 PASS；全历史不完整 |
| ExitProof | 可信 Supervisor + Broker key + Artifact evidence | operation/worker/profile/boot/hash、EXIT_UNVERIFIED 或满足闭合 | 原语始终无释放权；模型拒绝/签名 PASS |
| Resource Release | Host owner ledger、原最终裁定、独立 closure | 五资源 ID/version、proof hash、receipt nonce/单次消费 | 模型/SQLite PASS；真实生产 release BLOCKED |

大型输出使用 4KiB 分块、跨流总预算和 stdout 背压，不无限内存聚合；仅有限 preview。真实 flood 测试验证超上限终止/未 settled，不据此释放资源。新 EvidenceRpc 证据也有 4MiB 测试上限，CPU 证据流式落盘并有字节上限。

原始 native RPC/fixture JSONL 是 OS 证据，但它们不是伪造为独立生产 audit 的替代品。启动账户/持久任务尚缺时，不标全部 producer“生产完整 PASS”。审计消费、导出、归档与重启 crash 窗口仍须在部署后的合成操作上逐 Operation 对账。
