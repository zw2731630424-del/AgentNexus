# Harness 源码研究矩阵

本轮固定10类候选、11个主体仓库快照；另追踪LangChain等关键依赖。结论来自执行/权限/持久化路径的源码，范围不等于逐行审完整仓库。上游测试均NOT_RUN。详细路径、行号和各模块证据见三个审计分册，而非仅README。

## 仓库与控制流比较

| 候选与固定SHA | Loop与工具路径 | 上下文、保存和恢复 | 权限/隔离观察 | 采用方向与证据 |
|---|---|---|---|---|
| DeepSeek fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159 | ReactLoopAgent → tools.resolve → LLM stream → pipeline | Session事件、JSONL/Zstd、写租约、语义compaction另层；部分buffer/冷读需改造 | 同进程pre-execute默认allow；有实际Windows restricted token | REFERENCE_ONLY核心；独立纯函数/OS绑定可FORK_MODIFY候选；[主审计](primary_harness_audit.md#deepseek-harness-的真实控制流) |
| Cline ea16751d6ae3ae1e443681994906bf29cbc45039 | AgentRuntime.stream → beforeTool → approval → tool.execute | canonical/request/summary sidecar；team/session持久化 | SDK仅autoApprove显式false才询问；hook可改policy；进程分离不等于OS隔离 | 核心/权限REIMPLEMENT；context/team可FORK_MODIFY候选；[分册1](harness_secondary.md#1-cline) |
| OpenHands SDK 8dc712f618c01d730c453a87a8a3969859c53e69 | LocalConversation.run → agent.step → risk/confirmation → Python tool | EventLog逐事件文件锁；Condenser是派生视图；pending动作恢复需核对副作用 | 可配置NeverConfirm/风险分类；LocalFileStore词法边界非句柄隔离 | REFERENCE_ONLY；Nexus Loop/Archive/审批REIMPLEMENT；[主审计](primary_harness_audit.md#openhands-sdk-与当前-openhands-界面) |
| OpenHands UI 3d9986c07354812909bb72685b372dd2b00be3bb | 当前Agent Canvas/Server API/Electron | 会话API与后端/ACP agent发现分层 | UI/ingress不是OS安全边界；旧controller/enterprise路径不能套用 | 界面与连接层REFERENCE_ONLY；原生Studio REIMPLEMENT；[主审计](primary_harness_audit.md) |
| OpenCode 885df74024b6b540b63bfd487014252227713ea7 | Effect LLM step → tools.execute → driver | event投影DB、durable claim与恢复；native compaction与keepID | shell Permission.assert；local driver仍需OS约束；技能有许可例外 | 标准SDK REUSE候选，纯求值FORK_MODIFY候选；自有授权/日志REIMPLEMENT；[分册2](harness_secondary.md#2-opencode) |
| Goose 4facf56cbab049142809d9afa4648ebe6823ba80 | GDK load/step/apply → effects → model/tool | 持久会话重入，审批先落盘后通知；compaction与replace删除路径须区分 | Auto全允，SmartApprove依赖hint/模型；Job Object主要管进程生命周期 | 核心REFERENCE_ONLY；审批REIMPLEMENT；标准MCP/ACP SDK REUSE候选；[分册3](harness_secondary.md#3-goose) |
| Agensh 2dae4e14a653da48549fd9aa093f834841475d6c | router队列 → ACP session → 外部单Agent后端 | MySQL去重/重试/游标，shared board；boot退出tar归档 | 私有服务token/代理/Compose网络协作；质量main-health存在计时放松 | 协作/租约/manifest REFERENCE_ONLY；不用实验部署栈作桌面底座；[主审计](primary_harness_audit.md#agensh-的协作基础设施与限制) |
| Deep Agents 70dfbd597ae3d1ac348f6c46892464868f24b070 | middleware → LangChain factory/ToolNode → graph | raw state/checkpointer与summary/offload分层；SDK不等于默认持久库 | LocalShellBackend接口名含sandbox但无隔离；HITL未列工具可auto-approve | 核心/权限/原档案REIMPLEMENT；图/中间件只参考或局部FORK候选；[分册4](harness_secondary.md#4-deep-agents) |
| Codex 814347ecd21b49d25479f5499f168b9f7b7e1803 | app-server双向RPC；SDK实际spawn exec --experimental-json | rollout的record/persist/flush分开；resume；压缩和hook另路径 | 参数化审批、Windows restricted token/elevated backend实际存在 | app-server可选后端REUSE；自有审批/档案REIMPLEMENT；[公开接口](public_interfaces.md#codex) |
| Claude SDK 3be907edb9c86269d30d1427a77937dd788d6419 | SDK stream-json/control_request → 独立CLI | resume/fork/SessionStore物化与认证恢复 | can_use_tool可能被allow/bypass提前放行；CLI内部非本轮可见源码 | SDK可选适配REUSE；闭源CLI仅支持接口使用，许可分开；[公开接口](public_interfaces.md#claude-agent-sdk-python) |
| ZCode a9fe401eede6e6e5e01be9048679c206fe6f02d9 | 自有V4 host-port/runtime/permission-flow | node:sqlite迁移、session/part与checkpoint/mode恢复 | 传统入口鉴权可选；新入口loopback；yolo/guarded早于部分deny | 设计REFERENCE_ONLY，权限/鉴权REIMPLEMENT；少量纯函数FORK候选；[公开接口](public_interfaces.md#zcode) |

Goose官方canonical现为aaif-goose/goose，OpenCode为anomalyco/opencode。ZCode本轮可读Apache-2.0源码；Claude SDK可读不代表Claude Code CLI同为开源。MCP、ACP、自有RPC和Codex app-server是不同协议，不能互相代称。

## 按模块收敛的决策

| 模块 | 决策 | 参考实现和边界 | 后续准入 |
|---|---|---|---|
| Native Agent Loop | REIMPLEMENT | 参考DeepSeek、Cline、Goose的流式与状态分离；只运行一个Nexus Loop | 单Agent真实任务、取消/恢复、事件完整性 |
| Model Provider Adapter | REUSE通用HTTP/官方SDK；REIMPLEMENT路由 | OpenHands/LiteLLM、ZCode model port、各家接口 | 两家真实供应商；能力/费用/认证语义分别验证 |
| Context Assembly | REIMPLEMENT；纯配对/压缩视图可FORK_MODIFY候选 | 语义摘要与raw分离，不能依赖上游offload必成功 | 摘要关闭、超窗、规则不能静默丢失 |
| Tool Runtime | REIMPLEMENT；MCP/ACP协议类型REUSE | 参数Schema和最终参数审批，独立Broker/执行器 | Shell、文件、MCP、外部Harness同边界绕过测试 |
| File / Terminal / Browser | OS/终端基础设施REUSE；Nexus permit REIMPLEMENT | Codex/DeepSeek有Windows代码，但不抽一个函数冒充完整隔离 | 句柄级路径、Job进程树、网络、readonly实测 |
| Subagents / messages | REIMPLEMENT；参考Goose/Agensh/DeepSeek | 系统角色与工作角色分层，身份/预算不靠Prompt继承 | 双向唤醒、父等待、去重、深度/并发限制 |
| Session / persistence | REIMPLEMENT；SQLite/Zstd REUSE | 自有身份、事件封套、原档案提交屏障 | DB/文件双写窗口、字节一致、ACK后恢复 |
| Checkpoint / recovery | REIMPLEMENT | 参考rollout与writer lease；不把Git reset当副作用回滚 | 超时后进程仍活、重启后不重复一次性任务 |
| Permission / Sandbox | REIMPLEMENT控制面；OS绑定候选FORK_MODIFY | 同进程hook不是授权根；三模式独立管理员通道 | 模式切换与故障fail-closed、跨项目/凭证保护 |
| MCP / ACP / LSP | REUSE标准SDK候选 + REIMPLEMENT适配 | 各自Feature，协议能力按已证源码登记 | pin版本/许可闭包/认证/取消一致性 |
| UI / Desktop | REIMPLEMENT业务界面；REUSE通用UI库 | OpenHands/Codex/ZCode展示模式只参考 | Renderer无Key、无直接Shell、管理通道隔离 |
| Workflow / Skills / Rules | REIMPLEMENT功能；来源元数据REUSE | 105文件完整映射；不运行原安装器/提示附件 | 逐功能开关、Gate BYPASSED、兼容负例 |
| Logging / Telemetry | REIMPLEMENT最小事件策略 | 默认无外发；敏感原文受限加密引用 | 请求/异常/子进程环境泄漏与退出残留 |
| Testing / Evaluation | REUSE上游测试思想；Nexus用例重写 | 已有上游断言只作源码证据，本轮NOT_RUN | 每L0/L1正反/绕过/并发/恢复/升级及真实模型 |

REUSE表示拟复用独立协议/库/受控后端，**没有在M0引入上游产品代码**。FORK_MODIFY均为缩小文件集后的候选，不是已经授权发布的Fork。具体来源、补丁归属、许可证、同步策略见[ADR 001](../architecture/adr/001-native-boundaries.md)和[许可清单](license_inventory.md)。

## 资源与验证范围

本轮源码明确暴露的资源风险包括：whole-log解码、无字节上限的失败缓冲、内存事件缓存、无限/过宽worker派生、未知副作用后的重试。未对候选进行性能排名，没有运行它们的soak、构建、模型、bench或科研任务。AgentNexus小型存储探针仅支持单机数据层方向；不是这些候选的性能成绩，也不是完整产品测试。
