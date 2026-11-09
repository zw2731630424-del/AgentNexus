# AgentNexus M1.8.3-Q2

**离线候选已交付；完整 Q2 BLOCKED，部署 NO-GO。** 不能正常使用真实 Key 或日常模型请求，不能宣称本轮最终目标已实现。

- **通道 A：** 独立原生录入窗口、固定普通权限启动器、一次 UAC 的代码流程、原 UI 非秘密意图、服务票据/取消已实现并离线测试。实际 UAC、窗口、独立服务及内存隔离未取得资格；进程/线程/token/加载环境的保护仍有实现缺口。
- **通道 B：** 受限 Daily 协议、精确一次性 Grant、channel/runtime 绑定、唯一账本原子消费与崩溃恢复已在合成服务运行。**生产 native Runtime 来源认证器与 Medium listener 未实现**；普通 Host 无 UAC 地返回 IPC_BLOCKED，尚不能正常调用模型。

冻结回归 **215 PASS / 0 FAIL / 2 SKIP**，严格 TS、桌面编译和语法通过；源码执行前后相同。源码242文件，集合 SHA256 `82097622ac84a60b16bc2b896df0f64857d3ae0af0aecc2ada2a921c9334ad7c`。Helper117、Launcher21、Service/旧Client各40项纯测分开记录，不冒称Windows隔离。70项目标OS攻击测试全部NOT_RUN，历史同SID解密ISOLATION_FAIL保留。

[最终验收](acceptance-report.md) · [机器验收状态](acceptance.json) · [总体架构](architecture.md) · [源码](source/) · [源码ZIP](AgentNexus-M1.8.3-Q2-source.zip) · [源码Hash](source.manifest.json) · [全包SHA256](SHA256SUMS.txt)

[Helper技术方案](reports/helper-technical-design.md) · [Helper威胁模型](reports/helper-threat-model.md) · [日常信任方案比较](reports/daily-trust-options.md) · [Daily协议](reports/daily-ipc-protocol.md) · [服务变更](reports/credential-service-changes.md) · [原UI集成](reports/ui-integration.md) · [账本一致性](reports/token-ledger-consistency.md) · [Egress绑定](reports/data-egress-binding.md) · [独立安全审查](reports/independent-security-review.md)

[Phase0/当前权限](reports/phase0.md) · [实际只读预检](evidence/preflight-host-medium/preflight.json) · [OS攻击矩阵](tests/windows-attack-tests.json) · [新资格状态](tests/windows-qualification.json) · [部署NO-GO](reports/deployment-approval.md) · [安装候选清单](approval/installation-manifest.json) · [回滚](reports/rollback.md) · [离线复现](reproduce.md)

原 UI 页面、Vault、Gateway、Provider Adapter、Router 和 Runtime 沿用；原 M1.8.3/Q1的468个非生成交付文件保持字节一致。未安装、提权启动、创建账户或修改ACL/ML/防火墙/AppContainer/Ubuntu。真实Key、Provider请求、Token和费用均0；沿用100m总授权，不重置或新增额度。没有commit/push。

后续需要先补齐生产 Runtime 与 Helper 启动/内存保护代码，再冻结并重新提交精确部署审批；批准安装本包本身不能解决这些缺口。

## 本次 Git 发布

用户后续明确授权“全部保存提交推送”。本次发布完整Q2源码、源码ZIP、自有native二进制、编译payload、测试与只读证据、独立审查、BLOCKED验收、NO-GO审批及回滚材料。上文与原报告中的“没有commit/push”为实施阶段事实；原README与SHA清单保存在evidence/*before-publication.txt。[授权与范围记录](../../.workflow-kit/tasks/AgentNexus-M1.8.3-Q2/publication.json)。Git发布不解除生产BLOCKED，不授权系统部署、真实Key或模型请求，100m额度不重置。
