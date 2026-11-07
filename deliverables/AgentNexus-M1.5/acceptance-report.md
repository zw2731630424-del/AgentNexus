# M1.5 最终验收报告

**完整Windows生产执行链：BLOCKED；M1.5不是生产闭环完成声明。** 已在授权范围内完成代码候选、严格类型检查、原语/模型/故障验证与独立复核；账户、ACL、Profile、登录权与Task等系统部署未获批准。CPU严格资格实际失败，真实隔离事实仍缺，基础系统批准也不会自动使生产链通过。

最终源码91文件，集合SHA256 `a55823fae02fd565249cf0d2af1f3257d2e107b798b05b078b74ba15eb0e109e`；版本0.4.0-m1.5。最终隔离运行 `2026-11-07T10-56-36-121Z-10852`：**289项，265 PASS、23 NOT_RUN、1 FAIL、0 cancelled**，退出1，未超时。唯一FAIL为继承的 `M1.4 REAL_WINDOWS_PRIMITIVE: cumulative Job CPU time kills a busy fixture before wall deadline`；未改弱旧断言、未跳过失败或重跑挑绿。语法与真正严格tsc通过，不能把两者混为一谈。

| 范围 | 裁定 | 证据与边界 |
|---|---|---|
| Phase0规则/冻结/保全 | PASS | 1986 tracked +1670历史交付逐hash保全 |
| Bootstrap/准备槽/精确Grant/故障拒绝 | PASS_LIMITED | 代码、SQLite/crypto模型；真实独立身份BLOCKED |
| 持久IPC/签名Launcher证明 | PASS_LIMITED | 内存模型和部分真实原语；正向持续/跨账户NOT_RUN |
| File Broker/4KiB双签名文件摘要 | PASS_LIMITED | 模型与继承句柄文件原语；真实跨账户边界BLOCKED |
| Windows组合Sandbox/网络/管理库隔离 | BLOCKED | 标准账户/Profile/ACL/完整攻击未部署；三个native隔离事实false |
| 完整树/producer/退出环境证明 | INCONCLUSIVE/BLOCKED | 最终计数/parent改进不能替代全部真实组合证据 |
| ExitProof/closure/五资源与Broker释放 | PASS_LIMITED / production BLOCKED | 拒绝/签名/版本/回滚/幂等模型；无真实完整生产proof |
| Audit Producer九组件 | INCONCLUSIVE | 源码已接线、有界流及失败关闭模型；长期真实组合未执行 |
| CPU累计Hard Limit | FAIL | 冻结91文件下10/10真实同账户场景失败，历史FAIL保留 |
| TypeScript | PASS | Node24.15/TS5.9.3/@types-node24.10.1，58TS入程序，配置/语义诊断0 |
| 独立安全审查 | PASS_LIMITED | 37模型+1当前账户storage序列按预期；非生产资格 |
| Ubuntu | 准备PASS_LIMITED / OS NOT_RUN | 严格计划和SO_PEERCRED源码；未改服务器 |

Host/Worker脚本、配置和入口、角色/指纹/ACL全pin、存储子对象只读核验、锁恢复、enrollment挑战、MAC、prepare->bind->原始Permit原子transfer、固定Worker/精确FileBroker输入、监督、closure和双账本release回执均已实现候选。Host/Broker同可信Host控制进程；标准Worker Launcher及私钥存储属于TCB，不声称防御任意同标准账户恶意进程。有限工具只做受控摘要，不开放通用宿主命令。

## 所有完整回归均保留

| Run | PASS | FAIL | NOT_RUN | 绑定 |
|---|---:|---:|---:|---|
| 2026-11-07T10-33-58-198Z-41836 | 261 | 1 | 23 | 中间，非当前字节 |
| 2026-11-07T10-44-49-119Z-10120 | 262 | 1 | 23 | 中间，非当前字节 |
| 2026-11-07T10-56-36-121Z-10852 | 265 | 1 | 23 | 最终 |

前两run与最终字节不同，不能用其通过数背书最终源。每次有完整manifest、实际测试源码ZIP、TAP/events/results、stdout/stderr和合成数据ZIP+逐成员hash。最终CPU实验也有独立完整源码快照。M1.4原始失败和原始交付未改。开发中harness EPERM、首轮12个tsc错误、类型报告数量脚本误判、长路径治理失败均单列保留；修正后不覆盖原件。

## 最终NOT_RUN

- real OS file symlink is rejected without following its target
- real OS dir link is rejected
- real OS junction link is rejected
- real OS hardlink to an outside object is rejected by link count
- M1.4 REAL_WINDOWS: broker rejects an actual hardlink
- M1.4 REAL_WINDOWS: broker rejects an actual junction
- M1.4 REAL_WINDOWS: protected named pipe binds both actual peer handles
- M1.4 production combination and independent pre-pinned bootstrap/Grant bridge
- M15-PIPE REAL_WINDOWS_PRIMITIVE: persistent bidirectional frames bind kernel peers and exclude client instance right
- M15-PIPE REAL_WINDOWS_PRIMITIVE: forged sid cannot authenticate a persistent native peer
- M15-PIPE REAL_WINDOWS_PRIMITIVE: forged image cannot authenticate a persistent native peer
- M15-PIPE REAL_WINDOWS_PRIMITIVE: forged hash cannot authenticate a persistent native peer
- M15-PIPE REAL_WINDOWS_PRIMITIVE: forged pid cannot authenticate a persistent native peer
- M15-PIPE REAL_WINDOWS_PRIMITIVE: forged start cannot authenticate a persistent native peer
- M15-PIPE REAL_WINDOWS_PRIMITIVE: oversized outbound payload revokes the channel without retry
- M15-PIPE REAL_WINDOWS_PRIMITIVE: oversized inbound length destroys a raw same-account connection
- M15-PIPE REAL_WINDOWS_PRIMITIVE: read deadline, explicit close and endpoint revocation are terminal
- M15-PIPE REAL_WINDOWS_PRIMITIVE: four live native channels fill owner quota and a closed slot can be reused
- positive protected-pin attestation
- M15-PIPE production cross-account protected bootstrap and effective client-instance denial
- job-orphan
- pipe-True
- pipe-False

这些用例不是PASS，某些真实链接/管道原语受当前宿主权限限制；额外本账户focused原语也不补齐最终跨账户组合。默认网络能力空不等于所有网络路径已拒绝。当前数据不证明OS重启/断电或生产完整树退出。

## 部署与剩余工作

只读预检确认两个候选账户及新/旧部署根仍不存在；Task读取INCONCLUSIVE，Worker hive/Profile/LSA NOT_RUN。新的deployment-approval.md只提交禁用标准账户与精确空目录基础项，其他配置/ACL/Profile/Task/启用另列，不擅自执行。未读API Key、未连接Provider、未正式科研、未改Ubuntu、未Commit/Push。

实际OS identity/peer/启动撤销、网络/文件/磁盘/CPU、全树/producer、真实Host重启、完整ExitProof/owner release须独立证据。WindowsSupervisor的network/filesystem/limits仍false；未知准备槽无自动释放兜底。M1.6建议明确列出这些未关闭工作，不能把“等待授权”当作唯一剩余条件。
