# M1.3 工作记录

用户授权：M1.2 基线之上的 OS Identity、Trusted IPC、Broker、Sandbox、ExitProof、审计及独立验证；不允许修改系统账户/ACL/防火墙/服务器，不运行 Provider/科研，不 commit/push。

规则：根 AGENTS、治理 policy、工作流路由已读；无 project-rules 索引，无匹配项目类型流程。项目规则不修改。治理 new 已用于首个工具；其全库扫描每文件耗时数分钟，后续批量文件按已批准分类写入并在结尾运行完整治理门禁。

基线：main / 56a52ffee6e2d531957a8bbc697c995396d3f3fb，初始干净。32 个运行文件与 M1.2 交付源码、最终测试清单三方 SHA256 全部相等。冻结 925 个 tracked 文件及源码 ZIP 于 `.workflow-kit/runtime/AgentNexus-M1.3/baseline/20261107T055738035639Z/`。M1.2 独立副本重新运行 171 项：167 PASS / 4 NOT_RUN / 0 FAIL，运行目录 `.workflow-kit/runtime/AgentNexus-M1.2/verification/2026-11-07T05-57-41-057Z-11248/`。

Phase 0：先确定保守的原生辅助进程适配设计与协议，再实现；独立只读审查代理读取完整历史源码/测试，禁止递归与共享文件写入。设计和原始失败日志保留，不把模型测试当 OS 证据。

本轮交付：Phase0设计/协议/目录/ADR完成。Phase1—4的协议状态、持久控制、候选证明、资源隔离、审计及Windows原语切片已实现验证；独立生产身份/IPC/Broker/OS组合沙箱/完整ExitProof和释放桥接尚未部署，仍BLOCKED。Phase5对本轮切片已完成完整回归、实际Host强杀和独立只读审查，不代表全M1.3验收。

最终206项：203 PASS/3 NOT_RUN/0 FAIL；三项独立P2修后复核，45文件与测试快照一致，集合SHA256 `6a2f9f9f60c86ec7d72c4f64357172d604786ad0defe03c220b67156fb410005`。源代码HEAD不变，历史文件除7项明确预期变化外保持925清单内其余文件原字节。系统变更批准清单已交付而未执行；Ubuntu/Provider/科研/硬断电NOT_RUN。

最终入口：[M1.3](../../../deliverables/AgentNexus-M1.3/README.md)。真实原语在工具隔离内外结果分别保留；完整能力边界以acceptance-report/acceptance.json为准。
