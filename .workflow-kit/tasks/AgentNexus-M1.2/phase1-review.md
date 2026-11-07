# M1.2 独立复核（修改前）

基线：main / 67063eabcab2e29cdf7cf81f541ac7e244b5936e，初始工作树干净。24 个运行候选逐字节匹配 M1.1 独立审查包清单；冻结见 runtime/AgentNexus-M1.2/baseline/freeze.json。项目没有 project-rules/README.md；治理 policy 没有额外注册规则，工作流路由没有匹配项。未修改规则或历史交付。

已读实际 types/control/policy/gateway/host、存储相关实现、M1 报告/ADR009/内部协议/平台与审计设计、Control Review、Storage v3、源码审查索引及 M1 交付清单。Source Review Part1–3 是当前源码的文字导出，当前源码哈希与其索引一致。Runtime Evidence 是历史证据，新的测试另存。任务提到的“本轮独立技术审查报告”没有作为单独输入找到；不将未提供的结论当作事实。

| 编号 | 复核结论 | 实际代码与影响 | 验收条件 |
|---|---|---|---|
| PE-01 | 已确认 | policy.ts 构造仅去重；未知 level 落入默认 ALLOW，owner/modes 未校验 | 已知 ID 与固定安全元数据校验；无实现的策略默认 DENY |
| PE-02 | 已确认 | gateway.ts 注册无能力类别；空 policy_ids 可执行合成写入 | 分类必填；副作用空策略拒绝；独立精确审批不能被应用模式关闭 |
| PE-03 | 已确认 | ToolContext.store 提供任意 SQLite/审计/对象写入能力 | 普通上下文无 Store、DB、管理或授权接口 |
| PE-04 | 边界风险已确认，Agent 入口未复现 | options.ruleEvaluator/definitions/policies 和注册 API 只有可信 Host 持有；Agent 门面未暴露。恶意同进程 JS 本就可导入 fs，不能靠类型包装隔离 | 保留可信 bootstrap 边界；注入 PDP 只可收紧默认决定；未知配置拒绝；OS 隔离仍 BLOCKED |
| PE-05 | 已存在修复 | Approval/Permit 单次消费、boot+单调时钟、精确 intent、epoch 和执行前二次校验已经实现 | 全部回归保留，新增绕过负例 |
| PE-06 | 已存在保护，声明不足 | requires_sandbox=true 必定拒绝，但 false 缺少能力约束 | EXTERNAL_EFFECT/PROCESS 无论布尔值都拒绝；未知类型拒绝 |
| REC-01 | 已确认缺口 | host.ts 重启将 CLAIMED/STARTED/RESULT_RECORDED 转 INDETERMINATE；没有正式核实/人工裁定 API | 带证据、intent、管理员、版本和一次性 challenge 的追加裁定；无自动重试 |
| REC-02 | 已确认缺口 | 超时保留 handler lease/Writer Claim，但无独立退出观察与释放合同 | 结果确认与退出确认分离；未知 producer/未退出执行器不得释放 |
| REC-03 | 新发现 | RESULT 与 ACK 间恢复会丢失“已持久化结果”的投影区分（原 RESULT 审计仍在） | 恢复保留原始 phase/previous_state，裁定引用原 intent/RESULT，绝不重调用 |
| CTRL-001～008 | 源码中修复仍存在 | 实际 OFF 排空、FAILED DIE、单调期限、会话绑定/隔离/关闭、单调超时、迟到 stop 防恢复 | 新全量回归，不重写已关闭实现 |
| STOR-REV-01～03 | 源码中修复仍存在 | flush target、非合作 producer UNKNOWN/失败关闭、统一 Close Promise | 保持 storage/artifacts 原字节，新全量回归 |
| OS-01 | 需要独立平台证据 | 本地 capability 不是 OS 身份认证；任意沙箱未实现 | 设计交付；没有真实证据不授 PASS，不改账户/ACL/防火墙 |
| SCI-01 | 独立合同缺失 | Tool Permit 没有协议、seed 和多臂共享训练的原子语义 | 只交付设计/状态机/数据合同/验收计划，不运行实验 |

基线真实复跑：135 tests / 131 PASS / 4 NOT_RUN（OS 链接 EPERM）/ 0 FAIL。机器可读结果在 baseline 验证阶段生成；原始 all-tests.tap、exit-code.txt 保留。修改前安全探针只对独立副本进行本地合成操作，不接模型/外部服务。
