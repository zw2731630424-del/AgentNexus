# M1.5.1 ADR030—036

- **ADR030：保持独立、精确字节基线。** M1.5 的 91 文件及全部历史证据不修改；新 release 100 文件、每次最终运行独立快照。保留 FAIL 与工具兼容/fixture 失败。
- **ADR031：拒绝错误硬预算合同。** Windows JOB_TIME 为周期 user-mode 机制，没有本任务要求的已资格上界。CPU_RATE 与 application watchdog 不替代累计 CPU 硬限制；严格合同继续 FAIL，而不是调大预算/容差。
- **ADR032：已知失败优先于资格证书。** Resource gate 位于 Host claim/prepare 前与 Broker admit 中，REAL_WINDOWS 固定拒绝当前 release；构造/Host 初始化与 SIMULATED 协议仍可检验，没有配置豁免。
- **ADR033：原语路径与生产身份隔离表述。** 复制现有 PS runtime 的逐 hash 同账户测试可以消除 WindowsApps handle-anchor 环境障碍，但不修改 ACL、不授 Host/Worker 身份，不推导跨 SID 有效 pipe 权限。
- **ADR034：退出观察增加而释放权不增加。** create/assign/resume、member CPU、CloseHandle 返回加入证据；未知历史/producer/Sandbox 事实仍令 ExitProof 不完整。外部 observer 固定句柄后的少数进程退出不代表整棵未知树。
- **ADR035：失败关闭不等于测试全绿。** TOCTOU 原用例收到安全拒绝 1921 但枚举未覆盖，原 FAIL 保留且不改白名单。独立补充 probe 验证严格安全后置条件，不能覆盖旧未完成 case 或生产未验证边界。
- **ADR036：在原截止内等待进程信号。** 修前 Job 空/EOF 与 root signaled 的取样先后可不一致；cleanup break 同时要求全部保留句柄 signaled，沿用原 cleanupUntil，不延长 deadline，不提升 membership_complete 或 release_authority。原失败冻结保留。
