# AgentNexus v0.4 M0 研究交付

已完成资料核对、固定版本源码研究、工作流全量盘点和架构建议。产品代码、真实模型、OS安全准入和发行许可闭包没有在M0假报完成。先读[M0报告](reports/M0_report.md)，再按下表审查证据。

| 交付 | 内容 |
|---|---|
| [源码研究矩阵](research/harvest_matrix.md) | 10类候选、11仓库、14模块与采用决策 |
| [主源码审计](research/primary_harness_audit.md) | DeepSeek、OpenHands SDK/UI、Agensh控制流与固定SHA行号 |
| [四Harness审计](research/harness_secondary.md) | Cline/OpenCode/Goose/Deep Agents；141条源码引用、71项锁版本依赖metadata |
| [公开接口审计](research/public_interfaces.md) | Codex/Claude/ZCode；真实协议、Windows、权限与许可例外 |
| [许可证清单](research/license_inventory.md) | 根许可、嵌套条款、依赖证据级别与未封闭范围 |
| [安全报告](research/security_review.md) | 攻击面、已复现缺陷、三模式与底层保护边界 |
| [Workflow Kit完整审计](research/workflow_kit_audit.md) | 105文件指纹、源码缺陷、真实测试与继承报告区分 |
| [Feature Catalog](architecture/feature_catalog.md) / [JSON](architecture/feature_catalog.json) | 108项设计定义，默认/作用域/依赖/关闭/恢复与测试合同 |
| [Policy Catalog](architecture/policy_catalog.md) / [JSON](architecture/policy_catalog.json) | 22条、三模式逐条效果、L0/L1测试ID |
| [Workflow映射](architecture/workflow_kit_mapping.md) | 105文件、准确G0—G6、四角色、15业务模板和工具/测试/验证材料 |
| [内部接口](architecture/internal_protocols.md) | 身份/生命周期/消息/工具/档案/许可/开关/模型/恢复 |
| [ADR目录](architecture/adr/) | 原生边界、栈/存储、工作流、策略降级、原档案5个建议 |
| [总体实施计划](architecture/implementation_plan.md) | M1—M7切片、门槛、降级、资源与长期验证 |
| [本轮验证记录](reports/verification.md) | 实际结果、跳过、引用/哈希/链接/目录与治理检查 |

原始资料在仓库 `inputs/AgentNexus-v0.4/`；证据缓存、脚本和日志在 `.workflow-kit/runtime/AgentNexus-v0.4-M0/`。第三方源码只读隔离，未执行其中项目指令。交接包的Start Prompt仅归档作参考，不是额外权限来源。
