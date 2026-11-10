# Policy、Data Egress 与预算合同

Policy 模式由可信 Host 注入现有 PolicyEngine：ENFORCED 计算并阻断；ADVISORY 继续计算 WOULD_DENY 但不以该 PDP 拒绝；OFF 不计算可选 PDP、明确标记 BYPASSED。Policy 文件不被修改。重新开启恢复阻断。关闭 engine 必须同时选择 OFF；非法组合拒绝。未知规则的默认拒绝与注册工具校验独立开关生效。

File Write Approval 的两个 UI 注册项是同一 owner 条件的别名，必须同步。可由用户关闭可选 LOCAL_WRITE 审批，但固定身份、精确资源、writer claim、permit、恢复协议仍生效。任意 shell / PROCESS / EXTERNAL_EFFECT 没有已验证执行后端，始终 BLOCKED，Policy OFF 不授予此能力。Sandbox / OS Resource Limits 不会借用普通 OS 权限假称通过。

Data Egress 使用 Host 配置分类 PUBLIC / SYNTHETIC / INTERNAL / CONFIDENTIAL / SECRET，Provider/Project/Agent 条件组合，拒绝优先，分类取更高敏感级。默认 INTERNAL + DENY。Synthetic 无网络路径有显式分类与请求记录。ENFORCED 拒绝不满足条件的请求，ADVISORY 记录 WOULD_DENY，OFF 记录 NOT_ENFORCED；关闭分类会显示 NOT_CLASSIFIED。不会创建伪造 grant/PASS。已知 Key guard 是固定边界；通用 secret pattern scan 独立开关。

`APPROVAL` scope 和 advisoryConfirmation 当前保留为阻断条件：精确逐请求外发审批 UI 尚未实现，不会静默允许。用户可以通过一次明确确认的 Profile 变更，配置特定 Provider/Project/Agent 的 ALLOW；这是配置授权，不能称为精确逐请求审批通过。

ModelUsageLedger 始终记录真实与模拟用量、估算、UNKNOWN和hold；扩展 PROVIDER 与 KEY_POOL scoped budget，所有 Key仍共用 PLATFORM。global/project/agent/task/provider/keyPool/cost/rate 可独立调整。关闭费用展示只影响 renderer；关闭限制不会删除账本。已发生实际超出 reservation 的 owner reconciliation 门禁不因相同限额的自动 configure 而清除。

CampaignTokenLedger 保留原不可重置的100,000,000输入+输出授权上限；Local 的所有已配置 Provider共用这个原账本ID。该授权不等于实际网络调用许可，也不是每个Key的独立额度。未知旧 REAL 账本不自动迁移或清零。真实费用估算有来源声明，与实际账单区分。
