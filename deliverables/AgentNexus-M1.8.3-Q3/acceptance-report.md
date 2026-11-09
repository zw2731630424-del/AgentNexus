# M1.8.3-Q3 验收报告

**合成端到端闭环 PASS；生产资格 BLOCKED，实际 Windows 部署未执行。** 本轮已关闭 Q2 的“只有协议、普通请求最终 IPC_BLOCKED”功能缺口：普通 Medium Electron 实际打开独立 WinForms 合成录入窗口，将固定合成凭证保存到同一服务进程；Development Agent 随后经原 Router / Model Gateway、服务创建的 Runtime、实际 Daily Named Pipe、Credential Service 和 Synthetic Provider 返回流式结果，UI 显示响应，服务账本核销 20 输入 + 10 输出 Token，held=0。日常请求未再次启动 Helper。

该运行的 Electron、合成服务、Runtime 和窗口均使用实际进程 Token 观察，属于同 SID、Medium、非 elevated。**它不是 UAC、虚拟服务账户或跨身份隔离证明。** 合成窗口使用单独测试构建；固定 dummy canary 经测试桥接进入普通 Main，不能用这份证据宣称 Main 内存隔离已证明。生产构建排除测试窗口和桥接入口，生产 Main 不接收 Key。

## 四项分别裁定

|范围|裁定|
|---|---|
|A — COMPILED|PASS：生产 Helper 与固定 Launcher 已编译|
|A — UI_LAUNCHED|PASS_SYNTHETIC_MEDIUM：实际独立 WinForms，共享生产表单和 Ticket 事务|
|A — UAC_VERIFIED|NOT_RUN|
|A — SERVICE_CONNECTED / CREDENTIAL_STORED|PASS_SYNTHETIC：同一真实合成服务进程 ACK、保存和退出；原生已部署服务 NOT_RUN|
|A — OS_QUALIFIED|BLOCKED / NOT_RUN|
|B — IMPLEMENTED|PASS：固定服务身份 native Runtime、创建时进程/线程安全描述符、私有继承句柄、Job、生命周期监管和撤销代码|
|B — LAUNCH_VERIFIED / IPC_VERIFIED|PASS_SYNTHETIC_PROCESS；生产 native 启动和 IPC NOT_RUN|
|B — IDENTITY_VERIFIED / SAME_SID_ATTACK_TESTED|原生 OS 身份、防注入和句柄边界 NOT_RUN；同 SID 合成协议攻击另有 PASS 证据|
|C — MEDIUM_LISTENER_IMPLEMENTED|PASS_CODE：独立原生 Medium listener；实际同 SID 合成 listener PASS|
|C — REAL_PROCESS_REQUEST_PASS / STREAMING_PASS / BUDGET_PASS / EGRESS_PASS|PASS_SYNTHETIC：真实独立进程和实际管道，不是 live Provider|
|C — PRODUCTION_QUALIFIED|BLOCKED|
|D — SYNTHETIC_E2E_PASS|PASS|
|D — REAL_WINDOWS_OS_QUALIFIED|NOT_RUN：原 70 项保持 0 PASS / 70 NOT_RUN|
|D — LIVE_PROVIDER_READY|BLOCKED|

完整机读裁定见 [acceptance.json](acceptance.json)。

## 实现与验证

最终完整限定回归 **229 PASS / 0 FAIL / 0 SKIP**，严格 TS、桌面 build、语法检查和 native 编译全部通过；该冻结运行源码前后相同。Service / Client 各 90 个纯断言（同一组 Common 断言，不相加宣称独立覆盖）、Helper 138、Launcher 36。真实合成 UI 保存/直接取消/确认页取消均通过。[原始验证](evidence/verification/result.json) · [桌面整链](evidence/desktop-e2e/result.json)

独立审查实际运行 5 个同 SID 管道攻击场景、Host 路由与预算检查、7 个安装入口只读场景。覆盖非法管理/代理/文件/签权方法、伪造 native 字段、跨连接、重放、篡改、无 ACK、超限和坏帧。Runtime/Service crash、断线和无 Usage 保留 UNKNOWN/预算占用，重启不重发、不重置。过期、撤销和 egress 的原 Daily 回归仍执行。[独立安全审查](reports/independent-security-review.md)

真实 Egress 审阅保存的完整请求、exact grant、reservation、响应、Streaming 和 Usage 原始记录已导出；没有读取 Vault 数据库。[原始服务记录](evidence/desktop-e2e/raw-service-records.json) · [请求/响应/Usage](evidence/desktop-e2e/request-response-usage.json)

完整回归之后仅调整安装器错误诊断、许可证打包和原 Vault 测试的 Junction 清理。安装器 7 个只读场景独立复验；Vault 原套件 27/27 复验。没有产品行为改动，逐文件差异公开，不把重叠测试重复累加。[后续变更](evidence/post-verification-deltas.json)

## 部署与剩余阻断

已准备完整 Electron 45.2.3 / Node 24.15.0、Helper、Launcher、Service、固定 Runtime 入口与应用依赖，共 **194 个载荷文件 / 468,433,910 字节**。逐文件安装目标、启动参数、Hash 和未签署审批资料齐全。安装入口默认只读；`-Apply` 需要外部证书 pin、分离 CMS 部署批准和资格测试计划，拒绝既有安装/数据/服务，不能初始化或重置 REAL 账本。[部署审批包](reports/deployment-approval.md) · [完整载荷清单](approval/installation-manifest.json)

尚缺独立签发者及明确部署批准、真实 UAC/虚拟服务 Token/High 与 Medium pipe DACL/MIC、Runtime/Helper 进程线程令牌对象与依赖加载、跨身份 DPAPI、同 SID 句柄/内存/注入和恢复攻击证据。Helper 新对象权限初始化的 WinForms/CLR 兼容性、启动期/既有句柄竞态仍未证明；标准用户借另一管理员凭证提升被明确拒绝。固定 Hash / High IL / 本轮纯测试不消除这些限制。REAL 账本保护式迁移、真实 Key 导入与每个 live exact 请求仍各需独立准入。

## 历史与完整性

862 个 M1.8.3/Q1/Q2 原文件 SHA256 收尾不变；起始 HEAD 为 `91ae8e269e1522502b86ac5297ab4223231d94b5`。Q2 原 **215 PASS / 0 FAIL / 2 SKIP**、70 项 NOT_RUN 和历史同 SID 解密 ISOLATION_FAIL 原样保留。当前 Medium 环境可运行旧两项链接夹具；没有更改系统权限制造 PASS。[历史复核](evidence/historical-preservation.after.json)

交付含 258 个源码文件、[源码变化清单](source-changes.json)、[源码 ZIP](AgentNexus-M1.8.3-Q3-source.zip)、[源码清单](source-manifest.json) 和 [SHA256SUMS](SHA256SUMS)。真实 Key、真实 Provider 请求、实际模型费用均为 0；既有 100,000,000 Token 授权未重置。未创建/启动 Windows Service、账户或安装，未修改系统 ACL/策略，未启动提升部署程序，未 commit/push。只删除了本轮测试生成的四个 Junction 链接，逐目标 Hash 确认数据未变。
