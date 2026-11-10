# 模式切换与配置迁移

每次变更使用严格 Schema、revision、短期单次 plan id、完整 plan hash和明确确认字符串。后端生成 before/after、当前/目标状态、影响 Agent/工具、启停模块、不兼容配置、重启服务和重新验证条件。提交在同一 SQLite事务中写 Profile 与配置审计，其他Host的旧revision不能覆盖新状态。

普通功能开关在没有活动模型请求时热应用；模式、凭证后端和部署模块变更保存为 desired，active继续显示真实旧状态直到Host重启。重启重新验证所有依赖；不会隐式降级。Agent/Subagent得不到管理对象或Operator facade。

仅支持明确的v0 `{version:0,mode:...}` 到v1默认配置迁移，以及v1严格导入。未知版本拒绝。导出只有Profile，没有Key、账本、审计正文或部署记录。恢复默认和导入仍需同一影响计划与风险确认。

切换不复制或删除Key，不重置账本，不删Audit/Context Archive，不卸载服务，不删账户，不改ACL，不导入证书，不创建TPM密钥，不签部署，不改其他项目或Ubuntu。不同凭证后端保留各自原始数据，跨后端凭证搬运与REAL账本迁移未授权，不自动执行。

当前Hardened缺少远程Profile预算绑定与OS资格，所以迁移计划可以保存和往返，实际Hardened模型派发保持BLOCKED。用户回到Local后重新打开原本地凭证引用与同一Host账本。
