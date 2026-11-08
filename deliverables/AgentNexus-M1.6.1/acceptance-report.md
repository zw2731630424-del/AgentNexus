# M1.6.1 最终验收

本地 Native Harness 稳定性范围 **PASS**。完整回归 **FAIL**；严格累计 CPU 与完整生产执行 **BLOCKED**；Provider 全部 **SIMULATED**。

- 完整原始测试：479 项，469 PASS、8 NOT_RUN、2 FAIL。
- 本轮新增：99 项，99 PASS、0 FAIL。
- strict TypeScript / Node syntax：PASS / PASS。
- 140 文件候选集合：`d14401d7c39b069555f43c60360d5aab83e40bb32995008652cfcefb9862e9da`；原始运行 [TAP](evidence/runs/final-v4-2026-11-08T01-03-48-062Z-36472/all-tests.tap)、[JSON](evidence/runs/final-v4-2026-11-08T01-03-48-062Z-36472/results.json)。
- 8539 个历史文件及 34 个继承测试/fixture 逐 SHA 相同；原 FAIL 和所有迭代失败均保留。治理实际 PASS，独立审查另附。

当次继承 CPU 弱断言为 **FAIL**，严格资格不因此升级；M1.5.1 56 FAIL/2 PASS及M1.6原29062500 ticks/DEADLINE永久保留。真实 Junction 攻击安装、原生拒绝、并发与恢复已实际验证；不把受管环境无攻击的EPERM当PASS。

保留的旧 TOCTOU 测试本轮收到 WIN32_1921，旧允许列表未包含该码而 FAIL。原断言不变；[新增真实攻击报告](evidence/toctou/final-v4-report.json) 单独 PASS，没有拿它覆盖原失败。

原 CREATE_BREAKAWAY 夹具曾在捆绑 PowerShell WindowsApps 路径以 WIN32_5 失败；相同 executable SHA256 的隔离工作区副本按原断言复验，最终 **PASS**。这是工具路径环境差异，不是删除/修改旧测试；底层具体ACL机制仍未断言。

已交付持久写入 intent/temp/publish/ACK/显式核对、真实文件与Artifact/Audit关联、持久磁盘owner转交、精确输入/provenance重建、Task与消息事务交接、可恢复消息草稿、固定规则版本、真实检查器Gate及实际写入候选绑定、五角色并发与跨项目授权通知。

真实进程终止与本地文件/SQLite/Zstd为实际验证；ENOSPC/EACCES/EIO、调度barrier与Mock模型是明确注入/模拟。没有OS重启、断电、跨账户生产部署、真实Provider或科研实验。旧Gateway/Worker仍未知时不会因为文件确认而自动释放/重试；历史存储GC、长期自治、全平台隔离和多文件事务仍未资格。

未改OS账户/ACL/系统策略、根实现或其他科研项目；未读API Key、连接真实Provider、安装hooks或Commit/Push。
