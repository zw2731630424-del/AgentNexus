# M1.8 最终验收

**授权离线范围 PASS；完整 M1.8 真实模型目标 BLOCKED。** 新增测试 108：108 PASS / 0 NOT_RUN / 0 FAIL；完整回归 640：623 PASS / 16 NOT_RUN / 1 FAIL。语法、严格 TypeScript PASS。

| 验收问题 | 结论 |
|---|---|
| 多 Provider 凭证存储/轮换/并发 | 合成凭证与真实 CurrentUser DPAPI 本地测试 PASS；生产 Worker 隔离 BLOCKED |
| Agent 能否读取完整 Key | 受限 facade 与泄漏门测试 PASS；同账户 OS 隔离未资格 |
| Provider/Gateway/Streaming | 三个协议 adapter 的 fixture PASS；三家真实连接均 NOT_RUN |
| 按 Agent 路由/升级/费用 | 能力登记、最多两次升级、四级原子 Owner 和合成计量 PASS；真实账单 NOT_RUN |
| 自主规划/Subagent/Reviewer/Debug | 真实 Harness 执行与合成 wire 路径 PASS；模型智能 SIMULATED，未知问题发现 NOT_RUN |
| Resident | 短实测 PASS，24 小时 NOT_RUN；没有模拟时间换算 |
| Multi vs Single | 三组真实实验 NOT_RUN，优越性 INCONCLUSIVE |
| Context/Gates/权限 | 原始输入可重建；G0–G6 继承 Pilot 与 Git G4 接缝有程序证据；生产 OS/CPU/PROCESS/EXTERNAL_EFFECT BLOCKED |

完整回归失败（保留原文；不回填历史）：

- M151 REAL_WINDOWS_PRIMITIVE: CREATE_BREAKAWAY_FROM_JOB is denied by the private Job: {"code":"WIN32_5","message":"NtCreateFile component"}

false !== true


原版同字节宿主基线为 514/16/2，沙箱基线为 488/30/14。各次原始日志、source hash、skip 原因见 evidence/verification-attempts.json、evidence/verification 和 raw/runtime.zip。最终新增项无 FAIL 不意味着历史 OS 资格已关闭。

25 个新 Gateway 工程请求、35 条模型请求/响应转录均 SIMULATED，原始 Archive/SQLite/Artifact 保留于 raw/runtime.zip；没有真实 Provider 计量。账本 REAL 分支的纯算法测试不纳入实际费用。

源码集 `cddca8b1cc71876d8a078018aaac09fc8804df7ce0453b8fd455d150ed5475dc`；source.manifest.json、source-changes.json 和 SHA256SUMS.txt 可逐字核验。独立审查限定可信本地工程边界，完整生产隔离尚未通过。

根目录治理检查 PASS；临时联接只移除本体，5 个目标目录和全部历史字节均保留。详见 evidence/governance。
