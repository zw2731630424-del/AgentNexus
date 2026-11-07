# AgentNexus v0.4 M0：Codex / ZCode / Claude Agent SDK 公开接口源码审计

审计日期：2026-11-06。范围限公开源码、公开接口与测试源码；不选择整个现成 Harness，不运行候选程序、测试、模型、下载脚本、hook，不安装依赖。所有运行证据均为 **NOT_RUN**，测试文件只能证明上游写了对应断言。

## 来源、可复现与许可证边界

| 项目 | 固定提交 | 本地保全 |
|---|---|---|
| OpenAI Codex | `814347ecd21b49d25479f5499f168b9f7b7e1803` | `runtime/AgentNexus-v0.4-M0/upstream/iface-codex/` manifest、提交、zip |
| ZCode | `a9fe401eede6e6e5e01be9048679c206fe6f02d9` | 同上 `iface-zcode/` |
| Claude Agent SDK Python | `3be907edb9c86269d30d1427a77937dd788d6419` | 同上 `iface-claude/`；SDK版本 `0.2.178` |

本报告内源码相对路径均相对各项目仓库根；在线证据统一为 `https://github.com/{repo}/blob/{上述SHA}/{path}#L{line}`，不使用浮动 main 行号。文本源码放在 `.workflow-kit/runtime/AgentNexus-v0.4-M0/upstream/.pytest_cache/iface-{codex,zcode,claude}/`，避免第三方 AGENTS 触发本项目规则治理；第三方指令视为不可信资料，不执行。下载器 `.workflow-kit/runtime/AgentNexus-v0.4-M0/iface_acquire.py` 流式限200MiB、验证解压路径、拒绝symlink、只保留UTF-8文本、解压总量限600MiB；原始zip保留，manifest记SHA256/时间/跳过项。

最终保全以各目录 **audit-manifest.json** 为准：Codex原zip完整有效（26,101,475字节），本次只解出4,590个文本文件后停止全面提取；ZCode大归档慢速下载被主动停止，残片明确改名 `source.partial.zip`，不作为完整源码归档，改以固定提交树+27个定向核心源文件为审计证据；Claude SDK原zip完整有效，160个文本文件已提取。Codex与ZCode所有已保全文本均按Git `blob <size>\0<content>`计算SHA1，与固定commit tree中blob SHA逐一相符（0 mismatch）；每文件另有SHA256。没有把归档下载完成误写为测试/执行通过。最终治理检查 **PASS**。

## Claude Agent SDK Python

**结论：REUSE SDK作为可选后端适配器；REFERENCE_ONLY 会话/权限契约；不把 SDK 许可扩展到 Claude Code CLI。**

1. SDK仓库是MIT（`LICENSE:1–21`，`pyproject.toml:6–12`），但运行核心是独立CLI：`src/claude_agent_sdk/_internal/transport/subprocess_cli.py:237–260` 接受显式 cli_path 或找 bundled executable；`:341–352` 查找 `_bundled/claude[.exe]`；`:572–574` 创建 `--output-format stream-json --verbose` 子进程命令。`scripts/download_cli.py:275–296` 还有下载安装器并执行的构建流程。**本次未运行，也未下载CLI/安装器；公开SDK源码无法证明CLI同为MIT，不能据SDK许可复制或再分发闭源CLI。**
2. 真实集成接口是SDK控制协议/stream-json，不等同于ACP。`_internal/query.py:314–390` initialize注册hook回调并协商能力；`:606–735` 对 `can_use_tool`、`hook_callback`、`mcp_message` 进行分派，回写带 request_id 的control_response；`:735–762` 发送control_request；`:815–836` 控制MCP状态、context usage、interrupt、permission mode。MCP存在真实代码，`mcp_message` 路由SDK内MCP服务器；本次没有发现ACP server/app-server实现证据，不将私有control协议称为标准ACP。
3. 权限回调不是所有工具调用的强制网关。`types.py:2229–2283` 明确警告 `bypassPermissions`、allowed_tools与设置中的allow规则可能在回调前放行；`_configure_can_use_tool:2292–2316` 将permission prompts路由stdio；`query.py:615–667` 接受Allow（可更新input/permissions）或Deny（可interrupt）。AgentNexus需要单独的调用预算、进程/网络/文件系统强约束，不能只把can_use_tool当沙箱；审批UI显示工具原始参数与覆盖后参数。
4. resume/fork是真实功能：`types.py:2408–2415` resume/session_id，`subprocess_cli.py:647–649` `--resume=value`，`:703–712` fork-session/resume-session-at；`client.py:117–126` 可先将外部SessionStore物化到临时CLAUDE_CONFIG_DIR。`_internal/session_resume.py:152–198` 校验UUID、载入数据并创建临时目录；`:351–385` 恢复认证及设置，`:391–395` 剥离可能触发市场安装的插件设置。导入session是高信任数据边界，应保留原生会话ID加后端命名空间，勿默认等价于AgentNexus可移植事件日志。
5. Windows有实际防护：`subprocess_cli.py:415–445` 拒绝 `.bat/.cmd` CLI路径，避免cmd解释参数；`:647–649` 用 `--resume=value` 并检查元字符。可参考进程边界实现，但不替代OS隔离。
6. 测试源码证据：`tests/test_transport.py:104–113` resume参数；`:2793` batch路径拒绝、`:2863` native exe允许、`:3076–3117` Windows元字符与普通标题断言；`tests/test_option_warnings.py:77–115,201–207` bypass/allow规则遮蔽回调断言；`tests/test_sdk_mcp_integration.py`、`test_session_resume.py`、`test_session_store_conformance.py` 分别覆盖MCP/恢复/store契约。全部 **NOT_RUN**。

直接依赖声明 `pyproject.toml:28–34`：anyio、sniffio、typing_extensions（Python<3.11）、mcp、jsonschema。已独立读取PyPI发布者元数据并保全于 `iface-claude/dependency-metadata/*.json`：anyio 4.16.0 MIT，sniffio 1.3.1 MIT OR Apache-2.0，typing_extensions 4.16.0 PSF-2.0，mcp 2.3.0 MIT，jsonschema 4.26.0 MIT。**这是声明约束内当前版本的直接依赖初筛，不是可复现lock/SBOM或完整传递依赖许可审计**；仓库宽版本区间在实现阶段必须锁版本，再核实实际wheel的LICENSE/NOTICE。SDK增加会话恢复和平台代码变动，适配器应锁SDK版本、检测CLI版本和initialize能力，避免内部协议漂移。

## Codex

**结论：REUSE公开app-server作可选后端；TypeScript SDK用于批处理的薄适配；REFERENCE_ONLY内核权限/压缩/Windows代码，M0不fork整套Rust Harness。** 仓库Apache-2.0（`LICENSE:1–202`，`codex-rs/Cargo.toml:181`）。

| 模块 | 实际证据（固定SHA下路径:行号） | 建议、边界与风险 |
|---|---|---|
| App-server/RPC | `codex-rs/app-server-protocol/src/protocol/common.rs:523,575–585,1107,1885–1895` 定义initialize、thread/start/resume、turn/start、command/file审批；`app-server-transport/src/transport/stdio.rs` 实现stdio | **REUSE**协议适配；必须完成initialize并处理双向request/notification、连接取消与未知扩展字段。是Codex app-server协议，不能因为JSON-RPC就称ACP。 |
| 流式SDK | `sdk/typescript/src/exec.ts:95` 实际是 `codex exec --experimental-json`；`:124–125,157–174` 传sandbox/network/approval/resume；`:203–205` spawn并传AbortSignal；`thread.ts:65–114` 逐行JSON解析并从thread.started保存id | **REUSE**批处理；需要交互审批的主界面优先app-server，因为SDK这条路径只是exec子进程事件流，不提供上述app-server审批回调握手。`experimental-json`意味着必须锁版本并做事件兼容。 |
| 审批 | `app-server-protocol/src/protocol/v2/item.rs:69–126` 一次/session/policy amendment、decline与cancel区分；`:1684–1745` thread/turn/item/approval ID、command/cwd/network上下文及可选availableDecisions；`:1760–1786` 响应；`core/src/tools/sandboxing.rs:72–114` session缓存、`:239–263` 只有已审批的显式提权可扩展文件系统 | **REUSE**后端审批能力，**REIMPLEMENT**AgentNexus统一审批记录/有效期；不能把accept-for-session转换成全局授权，也不能把decline和cancel合并。审批事件必须与原始request ID绑定，且按照availableDecisions能力显示按钮。 |
| 网络监听 | `app-server-transport/src/transport/websocket.rs:99–108` 拒绝Origin header，`:121–125` upgrade授权，`:167–171` 无鉴权的非loopback监听启动失败；stdio另有实现 | **REUSE**本地stdio；远程为后续单独集成。浏览器不能直接假设能连这个WS，因为Origin被显式拒绝；token/代理边界仍由宿主配置。 |
| 持久化/恢复 | `rollout/src/recorder.rs:893–910,1008,1027–1033` 物化/恢复、单写者锁和异步writer；`:1073–1125` record/persist/flush队列及ack；`:1129–1198` 加载rollout历史 | **REFERENCE_ONLY**writer/flush/锁设计；保存后端原生thread_id，AgentNexus自己持久化指令、审批与任务状态，不能直接把rollout当跨后端标准事件存储。源码明确分record、persist、flush，UI“已保存”应绑定持久化ack而非收到了模型token。 |
| 上下文压缩 | `core/src/compact.rs:70–85` 独立checkpoint元数据，`:178–227` Pre/PostCompact hooks，`:299–375` 模型调用/retry/超窗删最老历史，`:399` summary处理 | **REFERENCE_ONLY**；压缩会调用模型且可能运行hook，本次没调用。M0可实现独立摘要策略和原始日志保全，不复制复杂模型/会话内核。压缩失败与丢弃历史必须是显式事件。 |
| Windows沙箱 | `windows-sandbox-rs/src/token.rs:372–450,470–517` capability SID/restricted token/CreateRestrictedToken；`lib.rs:263,279–281,488–494` ConPTY、elevated与legacy路径；`:745` restricted read-only要求elevated backend | **REFERENCE_ONLY**，有真实Windows实现，不能标成“仅Linux”。平台安全模块横跨token/ACL/provisioning/service/IPC且用unsafe FFI；不宜摘一个函数声称具备同级沙箱。M0委托Codex后端原生沙箱并验证实际选择的backend，失败时不静默退化full access。 |

测试源码：`sdk/typescript/tests/runStreamed.test.ts:15,65,111` 事件、连续turn、按ID恢复；`app-server/tests/suite/v2/thread_resume.rs:332–337` 并发writer拒绝、`:704,857` workspace roots恢复、`:1205,1298–1318` 审批reviewer/policy恢复及覆盖；`sdk/typescript/tests/mcpConformance.test.ts` 有真实MCP协议一致性测试。上述均 **NOT_RUN**。

MCP真实实现由 `common.rs:1306–1348` MCP OAuth/status/resources/tool call RPC及workspace依赖 `Cargo.toml:474` rmcp支持。未在所审协议/SDK发现ACP server实现；本次裁定为 **app-server=YES / MCP=YES / ACP=UNVERIFIED**，不要把未发现提升成仓库全局不存在的证明。

关键直接依赖已单独核查：workspace `Cargo.toml:474` rmcp是精确Git rev `98a54789b80110ad210495c4ad845c89e1980471`，其实际LICENSE明确MIT到Apache-2.0过渡、未取得重授权同意的旧贡献仍MIT（`iface-codex/dependency-metadata/modelcontextprotocol_rust-sdk.txt:1–5`），**不能粗写全库单一Apache**；`:681–682` websocket依赖采用OpenAI forks固定rev，已读取tokio-tungstenite `02cb49fa827411e9279e3688d19ab9e82661b0e8` LICENSE（MIT）；tungstenite fork `db4be399bc1b8b5de2edb46c7187834edabf7e30` 的 `LICENSE-MIT` 也已直接核实并保全（MIT），不以crates.io同名包替代fork证据。windows-sys 0.61.2发布者元数据MIT OR Apache-2.0；tokio 1.52.1 MIT、zstd 0.13.3 MIT（后两者为声明范围内版本初筛，最终仍须按Cargo.lock核对）。完整仓库及原生传递依赖不是本M0审计已完成的SBOM。

固定源码入口：[RPC与审批](https://github.com/openai/codex/blob/814347ecd21b49d25479f5499f168b9f7b7e1803/codex-rs/app-server-protocol/src/protocol/common.rs#L1885)、[Windows token](https://github.com/openai/codex/blob/814347ecd21b49d25479f5499f168b9f7b7e1803/codex-rs/windows-sandbox-rs/src/token.rs#L470)、[SDK实际exec路径](https://github.com/openai/codex/blob/814347ecd21b49d25479f5499f168b9f7b7e1803/sdk/typescript/src/exec.ts#L95)。

## ZCode

**结论：公开Apache-2.0源码；按模块REFERENCE_ONLY/少量FORK_MODIFY，权限核与对外服务边界REIMPLEMENT；不选整个ZCode作为Harness底座。** `LICENSE:1–202`为Apache-2.0；本次固定提交消息为source sync v3.17.2（Source-Commit `84aed26c781e3ba08e15f22b00370b3564614489`）。已有CLI/core/adapters/bootstrap、desktop/server/web等公开源文件；不得沿用“闭源”的旧结论。

| 模块 | 实现证据 | 建议与风险 |
|---|---|---|
| CLI/宿主协议 | `apps/zcode-cli/packages/bootstrap/src/zcode-protocol/server.ts:240–340` 服务/host注入，`:638–639` V4 rowsRange，`:903` 能力；`zcode-protocol-v4/v4-gateway.ts` 实现请求与事件桥接 | **REFERENCE_ONLY**host-port分层和分段历史；这是ZCode自有V4协议，不将其称ACP或Codex app-server。模块在private monorepo workspace内耦合，非稳定发布SDK。 |
| 传统web/server入口 | `packages/server/src/http.ts:245–261` Bearer/query token或HttpOnly SameSite=Lax cookie；`:353–364` 只有options.authToken非空时才安装鉴权；`:264–265`保护/ws与/api；`:366–367`server-info和host-capability路由 | **REIMPLEMENT**鉴权包装。token可选意味着调用者漏配后路由未获该中间件保护，不能宣称server默认全面认证；query token存在URL日志/历史暴露面，优先header或一次性交换。没有运行暴露验证，未声称可外网利用。 |
| 新server-core入口 | `packages/zcode-server-cli/src/server-core/http.ts:213–218`默认127.0.0.1且拒绝非loopback；`:220–271`可选ingressToken，Bearer/query读取、长度检查和timingSafeEqual，缺失/错误令牌除最小server-info外返回401；`ingressToken.ts:6–17`32随机字节、临时文件原子rename，POSIX权限600 | **REFERENCE_ONLY**loopback fail-closed和令牌生命周期。必须区分新旧入口；仅loopback不是多用户身份隔离。Windows分支没有POSIX chmod，实际ACL需实现阶段验证。 |
| 权限/工具执行 | `core/src/permission/service.ts:111–149` plan切换/alwaysAsk/guarded规则后，非plan的yolo或guarded直接allow；`:161–179` disallowedTools与project deny/ask随后才判；`:389–397`注释也明确承认yolo优先于disallowedTools；`core/src/tool/executor/permission-flow.ts:103–125`实际执行调用同服务 | **REIMPLEMENT**本项目“硬禁止 > 模式便利”的权限优先级。不能直接复用此服务作为强制安全边界；保留按能力/原始输入判断、拒绝与询问区分的设计思路。这里只判定语义与本项目不符，不把上游有意yolo模式称已证实漏洞。 |
| MCP | `adapters/src/mcp/index.ts:2–16,159–160`真实Client、stdio、StreamableHTTP、SSE transport；`:390–425`timeout/abort；registry/工具权限仍在core executor | **REFERENCE_ONLY**生命周期/取消；可直接**REUSE上游MCP SDK**而不forkZCode adapters整层。MCP不等于agent-to-client协议，不继承宿主权限。 |
| 模型gateway | `adapters/src/model/runner.ts:155–163,292–315`由配置构建模型；`:183–219`执行域requestAuth失效时拒绝；`:391–392`刷新不得改变绑定模型身份；`official-coding-plan-gateway.ts:9–10,24–38`只将两个官方HTTPS Anthropic endpoint映射到注入endpointOrigin的ultra路径 | **REFERENCE_ONLY**模型port和身份绑定；**FORK_MODIFY**最小纯URL路由函数仅在确需兼容时考虑。自定义provider不是自动无限制网络出口；本项目要重建目标allowlist/凭据隔离/预算控制，不能继承商业gateway与账户假设。 |
| telemetry | `telemetry/src/bootstrap.ts:75–100,120–125`解析OTLP endpoint且显式disabled/无endpoint时不启动；`:151–185`创建Exporter与header；`:198–208`用户/设备身份；`bootstrap/src/telemetry-bootstrap.ts:10–26`捕获配置留进程，不把OTLP私密header放Tool/MCP子进程env；`adapters/src/model/runner.ts:126`full model IO retention默认false | **REFERENCE_ONLY**进程级owner/env过滤。不能因此宣称全产品默认无遥测：这里只核实该CLI telemetry bootstrap，桌面其他telemetry未穷尽。AgentNexus默认关闭外发、显式配置endpoint和脱敏，避免继承设备/账户关联ID。 |
| 持久化/恢复 | `adapters/src/storage/session-store/sqlite-session-store.ts:5,256–277`node:sqlite打开与migration；`:417–449,488–535`message/part/session entry写入；`core/src/runtime/methods/resume.ts:63–109`读store，`:204–240`恢复checkpoint/rewind/mode/workflow/features/permission-grant marker | **REFERENCE_ONLY**事务、迁移与hydrate职责；**FORK_MODIFY**独立codec/纯函数需先割断workspace依赖。恢复不仅聊天文本，也包括权限状态，因此导入/恢复应重新裁定当前宿主policy，不直接恢复高权限grant。 |

测试源码：`core/tests/permission-service.test.ts:177–197` plan只读和allowedTools不可绕过plan；`:448–469`guarded单次确认和plan不更宽松；`:551–575`project deny/ask与MCP的优先级；`adapters/tests/session-store-transaction-isolation.test.ts:42–80`fork回滚隔离、并发fork、退出后再开；`bootstrap/tests/v4-cold-resume.test.ts:1–11`说明真实cold resume调host.resumePersistedSession并区分notFound/resumeFailed。均 **NOT_RUN**；未伪造web认证测试通过。

直接关键依赖独立核验（发布者npm registry元数据保存在 `iface-zcode/dependency-metadata/`）：`@zcode/adapters/package.json:116–141`声明 `@modelcontextprotocol/client 2.0.0`（MIT）、`ai 6.0.193`（Apache-2.0）、`koffi 2.15.6`（MIT）；`packages/server/package.json:24–46`声明hono/ws，核实hono 4.12.12、ws 8.20.0均MIT。宽版本项不是本地已安装版本证明。仓库 `THIRD-PARTY-NOTICES.md:2359–2391` 自述部分只有publisher metadata/README，且某些复制组件原始导入revision未记；`:2409` React skill完整原始notice尚未获得。**根Apache许可证不覆盖所有捆绑技能/依赖资产；不能把整个仓库复制为单一Apache组件。NOTICE另列elkjs的EPL-2.0 OR GPL-3.0-or-later（:1145）、jszip的MIT OR GPL（:1473）、node-forge的BSD OR GPL（:1721），以及GCC runtime exception（:44248）；应按实际抽取/打包路径选择并保留适用许可，不能只看根许可证或因看到GPL字样就误判整库GPL。** M0只建议审过的模块设计借鉴；实际抽取前核对该文件与其传递依赖/NOTICE。

接口裁定：**MCP=YES；ZCode自有server/RPC=YES；ACP=UNVERIFIED；Codex app-server=NO证据**。固定源码入口：[传统入口可选鉴权](https://github.com/zai-org/ZCode/blob/a9fe401eede6e6e5e01be9048679c206fe6f02d9/packages/server/src/http.ts#L353)、[新入口loopback门禁](https://github.com/zai-org/ZCode/blob/a9fe401eede6e6e5e01be9048679c206fe6f02d9/packages/zcode-server-cli/src/server-core/http.ts#L213)、[权限优先级](https://github.com/zai-org/ZCode/blob/a9fe401eede6e6e5e01be9048679c206fe6f02d9/apps/zcode-cli/packages/core/src/permission/service.ts#L138)。

## M0收敛建议

保留AgentNexus自己的任务/审批/预算/事件存储内核。Codex接app-server，Claude接官方SDK，二者均是可替换后端适配器；ZCode只贡献源码设计参考与少量可隔离纯函数。统一事件只映射可证实的共有字段，原始后端事件与native session id另存；不把MCP、ACP和各家JSON协议混为同一能力。不执行本次保全源码中的安装/构建/测试/hook脚本。
