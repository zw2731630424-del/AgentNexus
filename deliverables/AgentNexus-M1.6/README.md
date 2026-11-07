# AgentNexus M1.6

已实现可运行的**可信本地 Native Harness 核心**和统一三级资源账本；模型供应商均 **SIMULATED**。严格Windows累计CPU、完整生产执行链和生产资源释放仍 **BLOCKED**。最终测试、未通过项和源码绑定见 [验收报告](acceptance-report.md)。

本轮从M1.5.1独立100文件源码开发，根M1.3和M0—M1.5.1不变。原CPU58项的56 FAIL/2 PASS、所有历史FAIL和本轮迭代失败均保留。继承CPU弱断言偶然PASS不构成严格资格。

| 交付范围 | 入口 |
|---|---|
| 总体架构、A/B合同、ADR、协议 | [架构](architecture.md)、[内部协议](internal-protocols.md)、[ADR](adr.md)、[Phase 0](phase0-report.md) |
| Feature / Policy | [Feature](feature-catalog.md)、[Policy](policy-catalog.md)、source/config/agentnexus/完整JSON |
| CPU四合同、方案、资格 | [CPU合同](cpu-contract.md)、[官方方案比较](cpu-backends.md)、[资格记录](cpu-qualification-report.md) |
| Resource Engine、三级预算 | [资源治理](resource-governance.md)、[机器资格](resource-qualification.json)、source/src/agentnexus/resources/ |
| Runtime、Loop、Lifecycle、Scheduler、五类型 | [Native Harness](native-harness.md)、source/src/agentnexus/harness/ |
| Context、消息、Model Gateway | [组件合同](context-model-messaging.md)、对应context.ts/messages.ts/models.ts |
| Workflow、规则/角色/任务/证据/门/检查点/交接 | [原生工作流](workflow-runtime.md) |
| 完整源码、测试、复验 | [source/](source/)、[源码ZIP](AgentNexus-M1.6-source.zip)、[源码SHA256](source-sha256.json) |
| 原始日志、协作/上下文/资源验证 | evidence/runs/、evidence/components/、evidence/resource-line/、evidence/integration/ |
| 独立审查、保全、验收和后续 | [独立审查](independent-code-review.md)、[验收](acceptance-report.md)、[保全](preservation-verification.json)、[M1.7](m17-recommendations.md) |

从本目录复验，使用现有Node24.15.0和锁定TS5.9.3/@types/node24.10.1。无运行依赖安装、网络模型或系统部署。设置AGENTNEXUS_TYPE_TOOLS为已有隔离type-tools根；完整回归还可设置AGENTNEXUS_TEST_PYTHON_PATH及AGENTNEXUS_TEST_POWERSHELL_PATH为已有解释器。后者影响环境相关用例的NOT_RUN分类，不提供生产身份或资格。

```powershell
node source/tools/agentnexus/verify-m16.mjs --output-root I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.6\recheck --suite native
node source/tools/agentnexus/verify-m16.mjs --output-root I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.6\recheck --suite all
node source/tools/agentnexus/demo-m16.ts --output-root I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.6\demo --rules I:\AI_AgentNexus\AGENTS.md
```

每次验证创建独立完整源码副本、数据、TAP/JSON、strict tsc和SHA256；退出码不把旧FAIL转绿。输出路径经现有祖先realpath和Windows大小写处理，拒绝写入候选源码。演示创建五类逻辑Agent、两个结构化完成消息、受限原生工具和模拟模型协作，保留SQLite/Archive校验证据。

Native Harness顶层返回的administration、store/state、budgets、models属于可信Bootstrap。只把bindAgent得到的门面交给Agent；同进程任意恶意代码的OS隔离不在本轮资格内。真实LOCAL_WRITE经精确批准可被Gateway调用一次，但持久存储owner尚未实现，实际调用后Task/资源进入UNKNOWN，不自动结算或重试。

未创建或修改系统对象、未接真实Provider/读取Key/产生费用、未修改其他科研项目或运行正式实验，未Commit/Push。系统边界见 [部署说明](deployment-approval.md)。
