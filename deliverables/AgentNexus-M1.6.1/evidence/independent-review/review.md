**独立审查结论：新增本地范围通过；完整回归失败。**

最终同源码完整回归实际为 **479 项：469 PASS、8 NOT_RUN、2 FAIL，exit 1**；strict tsc 与 syntax 均 PASS。M161 前缀的 99 项均 PASS。两项原始失败继续保留，本地新增范围通过不替代全回归，也不授予 CPU 或生产资格。

绑定最终 source_set：`d14401d7c39b069555f43c60360d5aab83e40bb32995008652cfcefb9862e9da`，140 文件的路径、字节数和 SHA256 均已独立核实。语义审阅限于 [source-checks.json](source-checks.json) 中列明的 13 个模块及具体部分；没有逐行审查全部历史原生代码。审查者未修改产品源码。

初始失败、修后结果和试验强度完整保留在 [observations.jsonl](observations.jsonl)；精确位置、修复说明和逐模块哈希见 [review.json](review.json)。审阅范围内 11 项发现已闭合，范围外原始回归失败单独保留。静态发现与修前实测明确区分：

| ID | 优先级 | 问题 | 修前依据 | 观察序号 |
|---|---|---|---|---|
| R01 | P1 | CREATE双链接发布窗口无法显式确认 | 静态路径；修后定向验证 | 8, 28 |
| R02 | P1 | 确认未发布的崩溃没有安全裁定分支 | 静态路径；修后定向验证 | 7 |
| R03 | P1 | 失败记录与路径claim解锁不是原子提交 | 静态路径；修后定向验证 | 2, 7 |
| R04 | P1 | 并发reconcile绕过限额并把成功终态回退 | 修前独立实测 | 4, 5, 26 |
| R05 | P2 | 规则版本接受的格式无法进入Context | 修前独立实测 | 9, 12 |
| R06 | P1 | Gate候选哈希未绑定实际文件副作用 | 静态路径；修后定向验证 | 11 |
| R07 | P2 | 交接重试动态重算合同而冲突 | 修前独立实测 | 10, 14, 16 |
| R08 | P1 | 重开覆盖交接pending标记而阻断完成 | 静态路径；修后定向验证 | 14, 16 |
| R09 | P1 | 读池与排队Artifact写入形成循环等待 | 修前独立实测 | 19, 20 |
| R10 | P1 | sendText持久草稿在重开后永久在途 | 修前独立实测 | 21, 23, 25 |
| R11 | P2 | 瞬时队列拒绝留下同boot不可重试草稿 | 修前独立实测 | 22, 24 |

最终定向证据包括：真实 hardlink 发布后、删除临时名之前注入 EIO，显式恢复使 nlink 2→1 并确认精确内容；ACK 前真实目标内容变更被拒；同一恢复操作受并发限额和关闭门禁约束。预发布失败和 claim 原子解锁，重复恢复不增加 revision。

预算验证中，Gateway 未 settled 时转交被拒且没有半个 claim；16 字节仅转交一次，任务释放后 Worker 持有 0、Project/Platform 各保留 16。owner 恢复不会自动解除 Task/Gateway UNKNOWN；真实发布窗口试验仍保留原任务及 Worker claim。

消息/上下文的既有定向组件例 5+3 项通过。读写池循环等待修后，四个正常调用无需取消全部完成；sendText 重开及队列拥塞后精确重试均仅生成一条消息。Coordinator 重复通知复用同一 ContextSource，未授予跨项目原文读取或管理方法。

325793d0 的 140 文件审查绑定完整另存 [source-checks-325793d0.json](source-checks-325793d0.json)。最终 d14401d7 仅回退一行逻辑 resolver；已通过重建旧模块 SHA256 独立证明，草稿、队列、Gate、存储代码哈希未变。复用探针的逐模块依据写在 source-checks.json；原候选失败没有改标为最终 PASS。

边界：这是本地可信库审查。Windows 目录 fsync/硬断电、OS 重启、敌对 Worker 沙箱、严格 CPU/资源限制与生产资格均未因此通过。队列有 2 活动/16 等待数量上限，等待时长和调用方 producer 内存由调用方管理；磁盘台账按保留的逻辑内容保守计费。

[final-v4 原始结果](../runs/final-v4-2026-11-08T01-03-48-062Z-36472/results.json)；结果 SHA256 为 `6f6b1fe4b2e00ec22423857a0892899b5c98af61368ca6280f0c2e9a91854c8b`。原始失败标识：

- `M1.4 REAL_WINDOWS_PRIMITIVE: cumulative Job CPU time kills a busy fixture before wall deadline`
- `M151 REAL_WINDOWS_PRIMITIVE: concurrent directory replacement never returns junction target bytes`

审查者只核对汇总、失败标识和源码绑定，不复测或诊断 OS/CPU，不把历史 FAIL 改标为通过。**CPU 与 production 继续 BLOCKED。** 项目治理原文已核对为 `Governance check: PASS`（主执行者执行）；审查者自己的已取消扫描不计为通过。
