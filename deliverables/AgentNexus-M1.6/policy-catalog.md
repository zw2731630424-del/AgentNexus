# M1.6 Policy Catalog

完整机器定义52项，保留原44个已知ID/level/degradable/owner，并新增以下8个L0独立owner。Catalog文本不授予权限；PolicyEngine固定白名单/owner/schema仍校验，L0不进入可降级应用PDP，DISABLED申请拒绝。

| Policy | Owner | ENFORCE / AUDIT_ONLY / DISABLED | 实际正/负/绕过测试 |
|---|---|---|---|
| P.NATIVE_IDENTITY | Native Agent Runtime | 独立owner强制；应用模式不能关闭 | M16-HARNESS-TYPES, M16-HARNESS-SCOPE, M16-HARNESS-POLICY-OWNER |
| P.AGENT_SCOPE | Native Tool Runtime | 独立owner强制；应用模式不能关闭 | M16-HARNESS-LOOP, M16-HARNESS-SCOPE, M16-HARNESS-POLICY-OWNER |
| P.MESSAGE_DELIVERY | Native Message Bus | 独立owner强制；应用模式不能关闭 | M16-MESSAGE-DURABLE, M16-MESSAGE-AUTH, M16-HARNESS-POLICY-OWNER |
| P.RESOURCE_ADMISSION | Resource Governance Engine | 独立owner强制；应用模式不能关闭 | M16-HARNESS-BUDGET, M16-HARNESS-REQUEST-ACCOUNTING, M16-HARNESS-POLICY-OWNER |
| P.MODEL_CREDENTIAL | Model Gateway | 独立owner强制；应用模式不能关闭 | M16-MODEL-POOL, M16-MODEL-REAL-BLOCKED, M16-HARNESS-POLICY-OWNER |
| P.CONTEXT_PROVENANCE | Context Assembly | 独立owner强制；应用模式不能关闭 | M16-CONTEXT-RAW, M16-CONTEXT-SCOPE, M16-HARNESS-POLICY-OWNER |
| P.NATIVE_LIFECYCLE | Native Agent Runtime | 独立owner强制；应用模式不能关闭 | M16-HARNESS-RECOVERY, M16-HARNESS-CANCEL-FENCE, M16-HARNESS-POLICY-OWNER |
| P.WORKFLOW_BINDING | Workflow Runtime | 独立owner强制；应用模式不能关闭 | M16-HARNESS-WORKFLOW-CONTRACT, M16-HARNESS-WORKFLOW, M16-HARNESS-POLICY-OWNER |

NativeState审计记录固定ownerPolicyIDs、Feature/Policy epoch、runtime/model/budget/scope和CONTROL_STATE_CHANGE_ONLY裁定；这不是工具Permit或人工批准。工具的具体PDP/精确审批/Permit审计仍由原Gateway产生。原Archive、Artifact、Decision与审计域不合并。

M16 security回归把旧44项计数更新为精确52并逐项核8个新L0/nondegradable ID；全部未知/错level/owner/mode/权限字段负例保留。没有放宽CPU或TOCTOU断言。测试PASS的范围是本地owner与模拟Provider合同，不能当OS或真实Key安全资格。
