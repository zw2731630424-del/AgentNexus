# Credential Vault / Desktop 安全边界

本轮只接收合成 Key，不索取真实 Key，不读取既有真实凭证库，不发送真实模型请求，不更改系统账户、ACL、AppContainer、规则或历史交付。

## 新增验证

服务测试验证：提交字节清零、拒绝真实格式值、失败不回报成功、列表无秘密、未知 read 方法拒绝、Agent/Subagent 仅 completion facade、元数据秘密注入被阻止、轮换/禁用/撤销、多个 Key 的并发隔离、UNKNOWN 占用/重启和不重试、伪造载荷身份与撤销管理 session。

原生 Electron 测试另验证：密码框显示/隐藏/清空、真实格式值在 Host 拒绝、合成 DPAPI 保存、刷新和 Host 重启、正常 Renderer 无 Node/require、LocalStorage 为空、投影不含合成 canary。另一个由测试 Main 创建、同 origin 且开启 Node 的攻击窗口，直接调用原生 IPC 仍被实际 sender 检查拒绝；正常产品窗口没有开放这些设置。最终原始结果见验收报告指向的 raw 目录；失败尝试保留，不以设计推导替代执行结果。

独立审查复现的共享并发、在途关闭、NOT_SENT 备用路由和 403 状态映射问题已经修复并复验。详见 [独立报告](independent-review.md) 及随交付脚本/JSON。

## 不得扩大的结论

M1.8.2 已实际观察到同 SID 真实子进程可读取新建合成 Vault 并 CurrentUser 解密。该反例仍为 FAIL；本轮没有完成生产跨身份拒绝。使用 DPAPI、Electron sandbox、固定 helper 路径或对象能力，都不能单独证明同 SID 不可读取。

生产 Credential Service、可信录入部署、完整 Host/Worker/Subagent/Reviewer OS 隔离和唯一账本仍 **BLOCKED**。生产 Data Egress、真实模型响应、账单核对、长期运行和任意模型生成代码执行没有取得新的资格。历史 PROCESS、EXTERNAL_EFFECT、严格 CPU 等门不被 UI 放宽。

当前原生 Main 与 Operator 是同一可信本地工程边界。`app.getPath`/数据根、源码及 helper 没有新的生产 ACL 证明，Electron 自动化的 inspector 只属于测试进程，正常启动器不启用 inspector。不得把这些合成通过项写成生产 Vault PASS。

参考：[M1.8.2 Vault 资格](../../AgentNexus-M1.8.2/reports/credential-vault-qualification.md)、[M1.8.2 原始负证据](../../AgentNexus-M1.8.2/evidence/probes/vault-final.json)、[DPAPI 官方说明](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata)。
