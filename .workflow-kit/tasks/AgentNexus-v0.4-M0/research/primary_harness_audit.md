# DeepSeek OpenHands 与 Agensh 源码审计

取证窗口：2026-11-06至07，Asia/Shanghai。本文记录实际静态源码观察、设计推断和未执行项目，不把README或上游测试文件当成本轮测试通过。源码为只读下载，未启动任何候选Harness、容器、模型或科研实验。

## 固定版本与阅读范围

| 候选 | 固定commit | 版本与维护快照 | 许可与本地证据 |
|---|---|---|---|
| DeepSeek Harness | fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159 | root 0.2.2-rc.1；master；commit 2026-11-04 | MIT；部分嵌套许可另列；runtime/upstream/deepseek/acquisition.json |
| OpenHands Software Agent SDK | 8dc712f618c01d730c453a87a8a3969859c53e69 | openhands-sdk 1.60.1；main；commit 2026-11-06 | MIT；runtime/upstream/ohsdk/acquisition.json |
| OpenHands 当前主仓库 | 3d9986c07354812909bb72685b372dd2b00be3bb | @openhands/agent-canvas 1.37.0；main；commit 2026-11-06 | MIT；runtime/upstream/openhands/acquisition.json |
| Microsoft Agensh | 2dae4e14a653da48549fd9aa093f834841475d6c | main；commit 2026-11-03 | MIT；runtime/upstream/agensh/acquisition.json |

runtime指仓库 `.workflow-kit/runtime/AgentNexus-v0.4-M0/`。上游元数据均未标archived；这仅是抓取时状态，不证明维护质量或长期支持。主仓库OpenHands目前是Agent Canvas界面及集成代码，不能把旧版Python controller路径套到这个SHA，也不能沿用旧版enterprise目录的许可证推断。

SDK、Agensh、OpenHands的递归tree完整且truncated=false；DeepSeek巨大tree下载中断，保留为partial，仅使用已返回的完整条目及固定SHA raw文件，**不宣称完整仓库盘点**。大型ZIP中断残片不作为完整归档。实际采用的文件有下载SHA256；最终M0校验再核对已保全源文件与Git blob。第三方项目规则未用作本项目执行指令。

## DeepSeek Harness 的真实控制流

1. `ReactLoopAgent.kick` 驱动turn，`preStep`取得inbox消息、模型与工具集，组装system prompt和运行上下文。step构建请求、流式接收响应，追加assistant事件后再提取tool-call，统一交给tools.execute。重试有显式request-error通道，不是无条件继续。[agent.ts:268—312](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/agent-loop/src/agent.ts#L268-L312)、[step:435—603](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/agent-loop/src/agent.ts#L435-L603)。
2. Native executor只负责连接批处理和共享pipeline。pipeline先对参数做无损JSON快照和冻结，再执行 `tools/pre-execute` waterfall、可选approval、最终guards；通过后才dispatch工具。**未安装策略hook时默认allow**是该扩展点的实际默认值，不能当AgentNexus的default-deny控制面。[Native executor:8—20](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tool-executor-native/src/index.ts#L8-L20)、[pipeline:147—229](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/core/tools/src/pipeline.ts#L147-L229)。
3. approval service的ask/never不能按字面误读：这里never表示不询问并拒绝ask，而不是全部放行；缺answerer或异常为unavailable。会话policy切换被追加为事件，但这是同进程服务接口，尚不是本项目要求的独立管理员身份边界。[approval:117—121](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/interaction/user-approval/src/index.ts#L117-L121)、[配置与失败合同:151—171及225—235](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/interaction/user-approval/src/index.ts#L151-L235)。
4. 持久化append先快照再排队，序号连续性与跨进程写租约在实际写前检查；低层append写完调用sync，部分写失败回滚到先前长度，初次发布另处理命名空间刷盘。可借鉴明确的durability barrier，而不能把session内存append或UI收到事件直接当落盘ACK。[storage:187—211](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/src/storage.ts#L187-L211)、[contiguous/lease:319—353](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/src/storage.ts#L319-L353)、[fsync/rollback:1409—1448](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/src/index.ts#L1409-L1448)。
5. 对长期内存有明确改造需求：live buffer使用push，写失败把batch合回buffer并暂停drain；该路径没有看到字节高水位。冷读先取得完整bytes，再解码为事件数组。它可用于有限Session，不符合直接搬到无限原档案的要求；需在AgentNexus改成分段、字节预算、背压与分页。[live buffer:274—312](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/src/storage.ts#L274-L312)、[完整快照解码:810—840](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/src/index.ts#L810-L840)。此为所读路径的资源边界观察，不是经soak复现的泄漏结论。
6. 磁盘Zstandard和语义compaction是不同模块：前者编码帧、校验与尾部恢复，后者在Token压力下选择可压缩范围、调用摘要器并可先prune工具结果。Node私有解码器还有public fallback。不能把compaction等同完整历史保存。[zstd:111—155](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/session/session-persistence-jsonl/src/zstd.ts#L111-L155)、[语义压缩:292—368](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/compaction/compaction-basic/src/index.ts#L292-L368)。
7. 沙箱policy默认read-only，workspace-write与danger-full-access分开；真正Windows runner使用restricted token/write SID启动，错误合同要求不能改为unrestricted spawn。这个实现确实存在，不能简单写“Windows无沙箱”；但它覆盖什么读取/网络/子进程能力，仍需完整token/ACL/进程树绕过测试。[policy模式:59—92](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/sandbox/sandbox-policy/src/index.ts#L59-L92)、[runner:1—43](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/sandbox/sandbox-windows-acl/src/runner.ts#L1-L43)。
8. subagent工具从真实调用Agent取得parent、对模型路线预检并在派生前复查provider是否变化，再解析maxDepth。该设计可参考，但AgentNexus仍需独立预算、身份、工作区和手工开关，不把插件可卸载等同OS撤权。[subagent:274—320](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/subagent/tool-subagent/src/index.ts#L274-L320)。

| 模块 | M0采用意见 | 必要边界 |
|---|---|---|
| Loop / prompt / provider | REFERENCE_ONLY设计；原生loop REIMPLEMENT | Cordis服务、事件、session surface高度关联，不抽整个内核当最终底座 |
| Tool Contract / pipeline | REIMPLEMENT；纯配对/快照函数可列FORK_MODIFY候选 | 最终参数绑定、独立PEP、default-deny，插件不能授权 |
| Archive / recovery | REIMPLEMENT；Zstandard通用库REUSE | 分段分页、高水位、ACK屏障和元数据双写恢复，去除私有Node API依赖 |
| Windows sandbox | REFERENCE_ONLY；最小OS绑定FORK_MODIFY候选 | 许可闭包、native依赖和Windows实测前不能授予高风险权限 |
| Subagent / plugin lifecycle | REFERENCE_ONLY | 五系统角色、任务角色与能力租约由Nexus定义 |
| UI / MCP / Skills / telemetry | UI和配置设计REFERENCE_ONLY；标准SDK可REUSE候选 | 本轮未追完所有实现，不宣称MCP/ACP/遥测整体安全；集成默认关闭 |

已读Windows路径测试断言源码 [path-boundary.spec.ts](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/sandbox/sandbox-windows-acl/tests/path-boundary.spec.ts#L1-L58)，**NOT_RUN**。本轮只证明代码存在，不证明所有安全通道不可绕过。

## OpenHands SDK 与当前 OpenHands 界面

SDK `LocalConversation._run`持有状态锁检查运行条件、处理stop hook、调用agent.step；Agent处理已存在但未匹配Observation的动作时可继续执行，这要求宿主恢复必须先核对外部副作用，不能简单重复run作为通用恢复。[LocalConversation:2104—2187](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/conversation/impl/local_conversation.py#L2104-L2187)、[Agent pending actions:740—755](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/agent/agent.py#L740-L755)。

安全分析产生risk事件，再由confirmation_policy决定是否WAITING_FOR_CONFIRMATION；NeverConfirm返回false，ConfirmRisky可配置UNKNOWN处理。实际工具最终是同步/并行线程调用Python tool(action, conversation)。这是一组有价值的SDK扩展点，但不是独立OS保护层，LLM风险判断不能替代L0/L1。[risk/confirmation:1197—1235](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/agent/agent.py#L1197-L1235)、[确认策略:27—61](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/security/confirmation_policy.py#L27-L61)、[实际tool dispatch:1546—1608](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/agent/agent.py#L1546-L1608)。

LLM summarizing condenser产生包含forgotten_event_ids、summary和插入offset的Condensation事件；这是视图变化，而不应被解释为原始档案字节已永久保全。[condenser:249—278](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/context/condenser/llm_summarizing_condenser.py#L249-L278)。EventLog实际有文件锁与按事件文件持久化，同时自身维护_event_cache；FileStore另有默认20MiB LRU，两者不是同一个资源预算。[EventLog:241—300](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/conversation/event_store.py#L241-L300)、[FileStore:20—46](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/io/local.py#L20-L46)。

LocalFileStore以normpath/commonpath拒绝词法目录逃逸，随后普通open/写入；这段检查本身不提供符号链接、reparse/硬链接的句柄级隔离，也不是整个SDK安全性的证明。[路径与写入:48—71](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/openhands/sdk/io/local.py#L48-L71)。相关测试源码 [test_local_filestore_security.py](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/tests/sdk/io/test_local_filestore_security.py#L1-L90)、[test_security_policy_integration.py](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/tests/sdk/agent/test_security_policy_integration.py#L1-L80) **NOT_RUN**；未执行上游代码做逃逸演示。

当前OpenHands主仓库的conversation API构建Agent Server请求并管理会话，ACP service按后端配置查询可用agent；Electron负责桌面进程/窗口，ingress脚本另管理入口。这印证“Studio不是业务安全核”的模块边界，不能因有桌面UI就复用整个服务体系。[conversation API](https://github.com/OpenHands/OpenHands/blob/3d9986c07354812909bb72685b372dd2b00be3bb/src/api/conversation-service/agent-server-conversation-service.api.ts#L1-L100)、[ACP API](https://github.com/OpenHands/OpenHands/blob/3d9986c07354812909bb72685b372dd2b00be3bb/src/api/acp-service/acp-service.api.ts#L1-L120)、[Electron入口](https://github.com/OpenHands/OpenHands/blob/3d9986c07354812909bb72685b372dd2b00be3bb/electron/main.mjs#L1-L90)。这些是源码接口观察，未验证任何部署后端的真实连通性。

采用意见：Agent/Conversation/Context和risk策略均REFERENCE_ONLY；Nexus事件存储、确认许可、上下文分层REIMPLEMENT。ACP/MCP等标准协议SDK可REUSE；SDK中LiteLLM等通用依赖单独评估，不把整个SDK默认选为底座。UI只参考。其Python>=3.12与多个model/MCP/observability依赖会扩大移植和许可证闭包，详见 [pyproject](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/openhands-sdk/pyproject.toml#L1-L28)。

## Agensh 的协作基础设施与限制

Mini-router用MySQL事件状态pending→sending→sent/failed/retrying、按agent去重键与source cursor。dispatcher串行化同一Agent的prompt，把batch标sending后等待ACP turn完成再记sent；成功后的账本失败与模型失败分开，避免轻易重复成功turn。重启recoverSendingToPending仍需要宿主实际副作用核对。[dispatcher:51—84](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/mini-router/src/dispatcher.ts#L51-L84)、[发送/成功/失败:125—187](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/mini-router/src/dispatcher.ts#L125-L187)、[队列SQL](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/mini-router/sql/01_events_schema.sql#L1-L28)、[重试事务与恢复](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/mini-router/src/state.ts#L221-L279)。

共享board维护增量gist与pending租约；secret-service要求internal auth，从只读token目录取指定worker token，拒绝缺配置与越界路径。实际模型代理可在外侧持真实凭据、worker用局部令牌；可借鉴这种凭据分离，但并不等于完整通用Credential Pool或本机管理员隔离。[board lease:262—288](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/board-service/main.py#L262-L288)、[secret service:18—29及50—84](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/secret-service/main.py#L18-L84)、[upstream proxy实现](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/scripts/strip_metadata_proxy.py#L1-L100)。

agent/archive.py做的是每次boot退出时的home/work整树tar.gz，流式哈希、刷盘、原子manifest和清理前检查。它有好的sealed归档合同，却不是每条交互已确认即durable的追加式原始事件Archive；还会打包Git与ignored文件，Nexus不能无筛选把工作区和秘密复制进普通历史。[shutdown archive:14—77](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/agent/archive.py#L14-L77)、[清理验证:83—108](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/agent/archive.py#L83-L108)。

网络allowlist代理校验目标host/port并用drain双向转发；其安全性还依赖Compose网络是否真正禁止worker直连，不能只移植is_allowed函数。[egress filter:83—129](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/scripts/egress_filter.py#L83-L129)、[Compose网络/服务](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/docker/docker_compose.team.yml#L1-L75)。没有运行Docker，本机也未发现Docker可执行文件。

质量模块有自动放松main-health门的行为，且peer review按文件模式/非作者的最新审查处理。60分钟后放松的是上游质量门，不是安全PDP；AgentNexus不能把它复用成Policy服务故障/超时自动旁路。[quality.py:154—180](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/agensh/quality.py#L154-L180)。测试源码 [test_quality.py](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/tests/unit/test_quality.py#L1-L100) 与 [dispatcher.test.mjs](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/mini-router/test/dispatcher.test.mjs#L1-L100) **NOT_RUN**。

采用意见：事件outbox、幂等/租约、凭据注入、sealed manifest思路REFERENCE_ONLY；按Nexus单机SQLite与内部协议REIMPLEMENT。不直接引入MySQL/Gitea/Mattermost/实验启动栈；不继承默认模型、任务自分配、自动Git合并与科研实验配置。底层ACP官方SDK可REUSE，控制协议与五系统角色由Nexus统一。未复现实验论文的Agent数量、速度或成功率，不能用其论文数字作为本项目性能验证。

## 跨项目结论

真实可复用单元应是稳定协议、通用数据库/压缩库、经过许可闭包的独立纯函数或受控后端接口。AgentLoop、可修改的插件授权、原生事件数据库和商业账号认证不能未经转换拼接成系统核心。四份实现都提供有价值的具体设计，但没有证据证明可直接满足AgentNexus全部原始历史、管理员三模式、五系统角色、可选功能关闭及恢复合同。

本轮没有运行上游测试、安全exploit或性能benchmark；安全观察仅针对引用的源码路径。未来选择FORK_MODIFY必须再固定实际拷入文件集、依赖和本地补丁，建立上游更新差异与安全回归，不能把M0的候选标记当引入批准。
