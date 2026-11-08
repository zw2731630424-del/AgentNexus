# 验证矩阵与执行边界

最终服务测试：[14 PASS / 0 FAIL / 0 SKIP](../raw/2026-11-08T13-48-03-693Z/result.json)。最终原生 UI：[2 PASS / 0 FAIL](../raw/ui-2026-11-08T13-49-17-975Z/results.json)。[严格 TypeScript 与 7 项语法检查](../raw/static-2026-11-08T13-53-22-178Z/checks.json) 共 8 项 PASS。全部模型响应为 SIMULATED，真实模型请求 0。

| 用户要求 | 实际证据 | 结论 |
|---|---|---|
| Provider 添加、修改、删除 | service 测试 1；原生 UI 添加/修改 | PASS，本地持久配置 |
| 自定义 Provider / Base URL / 协议 | 测试 1；原生 Custom Provider | PASS OpenAI-compatible；Anthropic/Google 明确不支持 |
| API Key 添加与保存 | 测试 2/4；原生 UI DPAPI | PASS SYNTHETIC |
| 保存失败不能显示成功 | 测试 3 故障保护器；原生非合成前缀拒绝 | PASS，无成功回报 |
| 显示、隐藏、清空、粘贴输入 | 原生 UI 密码类型切换与清空；原生 HTML 密码框支持系统粘贴 | 显隐/清空 PASS；未独立操作用户 OS 剪贴板 |
| 轮换、禁用、启用、撤销、删除 | 测试 2；原生 Key Pool | PASS SYNTHETIC，新请求被撤销拒绝 |
| 多 Key 并发状态 | 测试 8/12；独立探针 | PASS，两个 Key 独立占用，共享 Host 四名额 |
| Key 健康、限流、使用量、请求、错误 | Vault 状态和 Usage 投影；Key Pool 原生截图 | 已接 Host，不称为已获真实账户健康证据 |
| 模型添加、删除、重命名、能力和开关 | 测试 1/5；原生模型新增与设置 | PASS，本地 Registry |
| Provider/全局默认、模型切换 | 测试 1/5；原生默认与选择器 | PASS，实际 wire Model ID 经 Gateway 发送到本地 FixtureTransport |
| 官方/手动/Provider 返回/验证状态区分 | Registry 合同与 UI 标签；测试 1/4 | 当前 MANUAL/官方目录可用；实时 Provider 目录/VERIFIED 未开放 |
| 搜索、收藏、最近使用 | 测试 5；原生搜索/收藏；成功结果写最近列表 | PASS，重启恢复 |
| Agent 绑定、Task 覆盖与恢复继承 | 测试 5；原生 Agents/Messages | PASS，经现有 ModelRouter |
| 备用、自动路由、发送前失败切换 | 测试 5/13；独立 RPM 探针 | PASS，仅证明未发送时重试，最多 3 attempts |
| UNKNOWN 不自动重发、不因轮换释放预算 | 测试 7/14；独立 UNKNOWN 重启探针 | PASS SYNTHETIC，生产部署未资格化 |
| 共享预算和 Agent 限制 | 测试 6/12；原生 Usage | PASS，增加 Key 不扩大全局限额 |
| 连接测试 | 测试 4；原生 Connection | LIVE 资格前拒绝，合成真实走 Gateway；不伪装 CONNECTED |
| 错误状态 | 测试 10 枚举、11 实际 403、14 实际超时 | PASS，403=UNAUTHORIZED；超时保留 UNKNOWN |
| Token 统计、真实与合成区分、费用空值 | 测试 4/6/7；原生 Usage | PASS 本地账本；真实用量 0，账单 null |
| 100,000,000 输入+输出授权上限 | Campaign 与平台 Ledger；测试 4/6 | 固定总额，无 UI 重置入口；生产唯一账本仍 BLOCKED |
| 刷新、Host 重启恢复 | 测试 4/5/7；原生 UI 关闭实际 PID 后重启 | PASS SYNTHETIC / Windows DPAPI |
| UI 无法取回保存的明文 | 测试 2/9；原生 safety.json METHOD_DENIED | PASS 接口边界 |
| Agent/Subagent 无 Key 管理/read 能力 | 测试 5；独立 facade/范围探针 | PASS 库边界；生产 OS 跨身份不能据此判 PASS |
| 秘密不进配置、Audit/Archive/错误正文 | 测试 2/3/9；继承 secret-boundary 测试；静态日志检查 | 合成值接口纪律 PASS；非通用 DLP 证明 |
| IPC 自称 admin / 第二窗口伪造 | 原生 ipc-denials.json；测试 9 | PASS 实际 Electron sender 检查；非 OS 跨账户资格 |
| 独立审查 | 四项初审反例及相同探针复验 | FIXED_VERIFIED；13 项完整独立运行 + TIMEOUT 1 项定向独立运行 |
| 生产凭证隔离 | M1.8.2 已有同 SID 解密反例 | FAIL 反例保留，生产 Vault/LIVE BLOCKED |

## 完整回归

使用正确的可执行路径和独立测试根，顺序运行候选与未修改 M1.8.2 基线：

- 候选：[695 项，647 PASS / 33 SKIP / 15 FAIL](../raw/2026-11-08T13-37-05-687Z/result.json)。
- 基线：[695 项，648 PASS / 33 SKIP / 14 FAIL](../raw/2026-11-08T13-42-33-720Z/result.json)。
- 14 项共同失败集中在 Windows CPU/进程/文件原语和 Storage 资格前提。未修这些历史专项，不能宣布完整回归 PASS。
- 候选额外一次 `M14-BROKER REAL_OS_PROCESS / SIMULATED_SECURITY` 返回 BLOCKED，原始失败保留。随后在同环境只运行相同断言：[候选 1/1 PASS](../raw/2026-11-08T13-50-59-941Z/result.json)、[基线 1/1 PASS](../raw/2026-11-08T13-51-01-059Z/result.json)。涉及的 M1.4 源码/测试字节未改变。该一次性差异未证明为新增代码回归；也不把完整失败结果改写为通过。

更早的两个回归尝试错误地使用不存在的 `C:/Program Files/PowerShell/7/pwsh.exe`，产生更多失败；已保留 raw/13-12-03 和 13-26-50，不能与修正环境后的计数混用。原生启动早期的继承 Node 模式、Windows 尾斜杠、ESM ready 等待、profile 与测试关闭问题也保留失败结果及截图。最终通过不覆盖失败历史。

## 原始记录与截图

原生最终 [safety.json](../raw/ui-2026-11-08T13-49-17-975Z/safety.json) 记录无 Node/require、LocalStorage=0、无 canary 投影、外部请求=[]、刷新/Host 重启恢复；[ipc-denials.json](../raw/ui-2026-11-08T13-49-17-975Z/ipc-denials.json) 记录自称 admin 与实际第二窗口的拒绝。UI 截图为真实 Electron 页面，目录含 01–08。测试使用固定合成 fixture；旧失败上下文可能包含测试源码中的合成常量，它们不是应用日志读回的凭证，更不是真实 Key。
