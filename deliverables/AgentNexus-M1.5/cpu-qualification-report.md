# M1.5 CPU Hard Limit 资格报告

**FAIL：10/10最终场景未通过，production_qualified=false。** 最终冻结源码集合 `a55823fae02fd565249cf0d2af1f3257d2e107b798b05b078b74ba15eb0e109e`，全部91文件复制至隔离workspace并生成逐文件manifest后运行。报告/原始JSONL/进程stderr/源码ZIP见 evidence/cpu/final；开发阶段另外10次失败及M1.4原始历史均保留。

被测对象为本账户原生私有Job；根挂起加入后恢复、无breakaway，子成员计入Job accounting。cpu_ms配置PerJobUserTimeLimit，单位100ns，比较累计**用户态**CPU；kernel CPU另记录且不声称受该预算约束；cpu_rate=10000只是带宽设置，与累计CPU/墙钟不同。并行成员CPU总和可以大于墙钟。历史进程数量使用实际Job计数，不假定只有预期脚本个数。

本次有限判据为实际user CPU>0且<=budget+max(50ms,5%)、root/tree退出、无helper墙钟终止，以及USER_MODE/TERMINATE配置。它不是生产终止因果证明；overall即使数字通过也不发生产资格，仍需真实目标Worker/组合/负载/长时资格。本次实际全部失败，没有该歧义。

| 场景 | CPU预算ms | 容差ms | Job user CPU ms | 墙钟ms | 实际历史进程 | helper终止原因 | 结果 |
|---|---:|---:|---:|---:|---:|---|---|
| single-80-1 | 80 | 50 | 4953.125 | 6721.239 | 2 | DEADLINE | FAIL |
| single-80-2 | 80 | 50 | 4953.125 | 6277.143 | 2 | DEADLINE | FAIL |
| single-80-3 | 80 | 50 | 156.25 | 1418.983 | 2 | None | FAIL |
| multi-300-1 | 300 | 50 | 14406.25 | 6152.045 | 6 | DEADLINE | FAIL |
| multi-300-2 | 300 | 50 | 14421.875 | 6132.048 | 6 | DEADLINE | FAIL |
| child-300-1 | 300 | 50 | 546.875 | 1754.887 | 4 | None | FAIL |
| child-300-2 | 300 | 50 | 4796.875 | 6150.141 | 4 | DEADLINE | FAIL |
| long-3000-1 | 3000 | 150 | 6375 | 7877.503 | 2 | None | FAIL |
| multi-300-3-concurrent | 300 | 50 | 14140.625 | 6146.236 | 6 | DEADLINE | FAIL |
| single-300-4-concurrent | 300 | 50 | 4796.875 | 6215.734 | 2 | DEADLINE | FAIL |

80ms三次实耗4953.125、4953.125和156.25ms；第三次未由helper DEADLINE终止也超130ms上界，说明旧“非DEADLINE即PASS”不能资格化。多进程300ms出现14421.875ms累计实耗；3s较长场景6375ms。设置/readback、偶然OS quota退出或终止信号均不等于稳定预算保证。

覆盖重复单进程、多进程、父/子、较长运行、并发Job；当前宿主/嵌套环境与目标实际Worker不同，真实独立身份、目标OS负载矩阵、长期soak未运行。没有改CPU策略、系统配置或为通过放宽容差。最终主套件另有1个旧CPU真实FAIL，仍保留。先查明目标OS行为与可接受granularity，未获稳定证据前继续阻断CPU Hard Limit生产保证。

API语义参考：[微软PerJobUserTimeLimit的用户态/周期检查合同](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information)、[Job accounting与通知保证边界](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)。这些合同不替代实际资格证据。
