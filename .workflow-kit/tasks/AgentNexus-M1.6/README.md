# AgentNexus M1.6 工作记录

目标：建立统一资源治理基础与可运行的 Native Harness Core。当前实现和验收入口是 [M1.6 交付](../../../deliverables/AgentNexus-M1.6/README.md)，根目录 M1.3 产品和 M0—M1.5.1 历史交付保持原字节。

- Phase 0：读取项目规则、历史合同/架构/研究映射；冻结100个M1.5.1运行文件与3341个历史文件。分工读取清单和主代理补充清单位于交付 evidence；原始请求见 original-request.txt。
- 设计：总体架构、A/B共享协议和ADR037—043；主执行者统一schema、Catalog与集成，A/B执行者使用独立上下文、独占写面，不递归派发。
- A线：资源registry、三级持久预算、预留/核算/等待/闭合/UNKNOWN；CPU四合同和官方技术比较，未放宽原严格预算。
- B线：Runtime/Lifecycle/Loop、Context、消息、调度、五类型、模拟Provider、工作流合同/证据/门/检查点/显式交接。
- 集成：原Gateway执行链、Feature关闭、取消、消息恢复、旧审批撤销、真实持久磁盘所有权等故障路径整改；所有修前日志和独立复现保留。
- 收尾：冻结源码、完整回归、独立审查、交付SHA256与历史保全验证。最终数字及限定范围以交付 acceptance-report.md 为准。

系统账户、ACL、AppContainer注册、Windows任务/防火墙/服务、Ubuntu、真实Key/Provider、科研、Commit/Push均未执行。原CPU资格FAIL与生产链BLOCKED持续保留。
