# AgentNexus M1.2 工作记录

授权输入：[user_request.txt](user_request.txt)。基线 main / 67063eabcab2e29cdf7cf81f541ac7e244b5936e；初始工作树干净，24 个候选文件全部匹配 M1.1 审查快照。

阶段记录：

- Phase 0：项目规则/工作流路由/治理 policy 已读；没有额外 project-rules 索引。冻结源码及 2394 个历史/规则文件，独立复跑基线 131 PASS / 4 NOT_RUN / 0 FAIL。
- Phase 1：[修改前独立复核](phase1-review.md)。通过实际独立副本探针确认未知 level ALLOW 与空策略/Store 写入；不把既有修复重算成缺陷。
- Phase 2：交付目录中保存 Policy Enforcement、Reconciliation、OS 边界与科研授权设计，先于相应实现。
- Phase 3：实现 P1-A/P1-B，加入精确资源绑定、执行/输出总期限与真实强杀恢复测试。P1-C/P1-D 仅形成设计和准入计划。
- Phase 4：根据项目独立上下文协作规则，由单独只读审查代理检查安全代码；没有递归派发或与作者同时改同一文件。保留审查发现、原始探针和修后复核证据。
- Phase 5：最终完整复跑、历史哈希保护、原 135 回归名称比对、源码快照/ZIP 双向校验和治理检查见交付 verification.json。

全部原始中间运行保留在 `.workflow-kit/runtime/AgentNexus-M1.2/`，包含失败 TAP/JSON 和当时源码副本。首轮的夹具错误/深目录路径限制、输出超时回归的恢复状态差异均保留，不改写为 PASS。原 M0/M0.1/M1 证据、规则、其他研究目录不作修改；没有 Git commit/push、Hook、OS 安全配置修改、模型/Provider/科研执行。

正式交付入口：[M1.2 交付目录](../../../deliverables/AgentNexus-M1.2/README.md)。

最终打包验证识别并修正了 TAP 测试名转义与 JSON 事件原名之间的比对差异；原 135 个用例没有缺失。最终测试与源码绑定使用 2026-11-07T03-39-19-800Z-33960，171 项中 167 PASS、4 NOT_RUN、0 FAIL。
