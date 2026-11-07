# CPU 资格测试报告

**FAIL：58 项中 56 FAIL、2 PASS、0 INCONCLUSIVE。生产 CPU 资格 false。** [原始机器报告](evidence/cpu-qualification/2026-11-07T19-49-58-861Z-25456/report.json)、同目录 plan/request/stdout/stderr/result/source-manifest 和完整 source 快照均保留。源集合 `3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0` 与最终代码一致。

计划在运行前写入：三种拓扑各 12 轮交错执行，6 个较长场景，8 对独立并发 Job，共 58 项，所有用例执行，不按失败提前选留。预算/容差沿用 M1.5，80/50、300/50、3000/150ms，wall deadlines 6000/20000ms。原 fixture 与 Job 限制没有放宽。裁定还要求根退出、Job 空、历史成员可核、EOF、实际句柄关闭；helper 自身退出也单独留存。

| 受控条件/拓扑 | N | PASS | FAIL | Job user ms 最小/中位/最大 |
|---|---:|---:|---:|---|
| ONE_TEST_JOB/single | 12 | 1 | 11 | 125 / 937.5 / 4921.875 |
| ONE_TEST_JOB/multi | 12 | 0 | 12 | 1953.125 / 14093.75 / 14296.875 |
| ONE_TEST_JOB/child | 12 | 0 | 12 | 375 / 4750.0 / 4796.875 |
| ONE_TEST_JOB/long | 6 | 0 | 6 | 5500 / 5601.5625 / 7015.625 |
| TWO_INDEPENDENT_JOBS/multi | 8 | 0 | 8 | 1312.5 / 13992.1875 / 14437.5 |
| TWO_INDEPENDENT_JOBS/single | 8 | 1 | 7 | 93.75 / 2773.4375 / 4781.25 |

最终每个结果逐 case 保留，不能用个别 PASS 覆盖 FAIL。58/58 有 native Job/process 句柄关闭观测，58/58 同时满足完整历史/根/树/EOF。修前集合 4825 的 58 项为 57 FAIL/1 PASS（seq-child-9 343.75ms）；其中两次 Job/EOF 先完成、root 取样先 false 而后续成员句柄已 signaled，历史成员并无缺失。修后只在原 cleanupUntil 内增加全部保留句柄等待，再执行同一 58 矩阵。任何原语观察都不是生产资源释放证据。最终逐进程/Job CPU有24帧小额差异（最大user/kernel各62.5ms），来源INCONCLUSIVE，未放大资格结论；原始值与复算表全部保留。

重复数用于跨启动时相、拓扑和并发条件描述失效，不作为统计充分性凭证。样本共享同一宿主与周期检查行为，不假定独立 Bernoulli；有一个失败就不满足严格上界。全部成功时工具也只会 INCONCLUSIVE，不自动签资格。没有计算可以掩盖超支的均值门槛。

运行环境：Microsoft Windows NT 10.0.26200.0；Node v24.15.0；同账户受管外层 Job。PowerShell 测试副本 hash/provenance 已记录。受控一/两个 CPU Job 条件均失败；修前 20 个 case 与主套件有背景工作重叠，已明示；修后 CPU 与主回归顺序执行。两者均不归因于机器负载，也不声称已做真实目标全负载矩阵。独立标准 Worker、长 soak、Host 重启、OS 重启均 NOT_RUN。

历史 M1.5 10/10 FAIL 和 M1.4 FAIL/PASS 在 phase0 原件及根因报告共同展示，没有覆盖、改阈值或把软件监控叫 OS 硬限制。CPU 保护、PROCESS/EXTERNAL_EFFECT 阻断保持。
