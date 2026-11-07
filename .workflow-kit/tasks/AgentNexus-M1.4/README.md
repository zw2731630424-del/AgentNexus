# AgentNexus M1.4 工作记录

当前阶段：Phase 0完成，候选源码与限定验证已归档；完整生产部署BLOCKED。用户要求的所有系统级变更必须单独批准。

适用入口：AGENTS.md；project-rules/README.md 不存在；project-workflows/README.md 无匹配流程；治理 lite 已启用。没有修改项目规则或启用额外模块。尝试 govern.py new 后全库遍历耗时较长，后续文件按 policy.json 的 deliverable/task/runtime 分类直接创建，最终完整治理仍必须通过。

基线和详细设计：[M1.4 design](../../../deliverables/AgentNexus-M1.4/design.md)、[freeze](../../../deliverables/AgentNexus-M1.4/evidence/phase0/freeze.json)。M1.3 全部非runtime源码/测试/工具及 ADR 由独立只读核查员阅读；主代理读取 runtime 全部源码/协议/Windows helper、Host/Gateway/Policy/Feature/存储接口和 M1.2 Reconciliation。独立核查不修改文件、不递归派发。

修改范围：deliverables/AgentNexus-M1.4/、本任务目录和 .workflow-kit/runtime/AgentNexus-M1.4/。初次开发和冻结阶段未提交、未推送，不覆盖 M1.2/M1.3，不更改现有 ACL/账户/AppContainer/防火墙/系统服务/Ubuntu。

最终冻结运行：2026-11-07T08-30-22-409Z-37176，255项：251 PASS/4 NOT_RUN/0 FAIL，67源码文件集合e2f95cb5c7557660dfbbf3cfcbb2a03a78460f9b408e66bd2fbb3f6ea96e3a88。Node语法、PowerShell parser、Python AST和原生编译/限定测试通过；无tsc。1829原tracked文件逐字节保全。

主代理实现Host/Permit/Broker/Identity/IPC/File/ExitProof/资源owner候选，Windows单写者实现原生token、pipe、目录句柄、Job与prepare/resume并运行限定原生测试；独立审查员早期运行限定模型探针，后续只读修复复核。14项反馈均闭合于审查范围，独立审查不代替组合实测。Native原始JSONL和所有失败/中间run保留；最终一次CPU PASS没有覆盖其他真实CPU FAIL，资格仍INCONCLUSIVE/BLOCKED。

仍需完成/验证：生产长期IPC/独立启动器接线、真正双账户/Profile/目录网络组合、完整成员历史、稳定CPU和硬磁盘限制、完整生产ExitProof/释放及OS重启恢复。审批清单把未就绪Task与生产启用列为NOT_READY，不以审批替代代码证据。基础账户仅建议创建Disabled；未获批准未执行。

后续用户明确授权“全部保存提交推送”。发布范围为本轮M1.4正式交付与本工作记录，包括清单内五个ZIP（源码、三个运行源码快照和合成测试数据）；逐文件SHA已复核，ZIP边界检查未发现凭据文件或运行时二进制。仅精确暂存这些被通用ZIP规则忽略的M1.4归档，不修改.gitignore，不纳入历史原件或重复临时运行目录。冻结验收中的NOT_PERFORMED仍表示验收时点事实，后续Git提交/远端记录保存发布事实；生产BLOCKED不变。
