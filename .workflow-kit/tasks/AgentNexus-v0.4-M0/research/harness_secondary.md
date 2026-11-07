# AgentNexus v0.4 M0 — Secondary Harness 源码审计

日期：2026-11-06 UTC。范围：Cline、OpenCode、Goose、Deep Agents。只读下载和源码审计；未运行候选Harness、安装依赖、调用模型、启用hooks、修改产品代码/项目规则、commit/push。所有上游测试均 **NOT_RUN**，阅读了测试不代表执行通过。

## 结论

不建议将任何一个完整Harness选作底座。可借鉴Cline的canonical transcript与request projection分离、OpenCode的事件投影与durable execution claim、Goose的持久状态重入与审批先落盘、Deep Agents的backend/middleware分层。AgentNexus的权限仲裁、执行隔离、凭证最小暴露、可恢复副作用日志应独立实现。下文REUSE/FORK_MODIFY均为模块候选方向，**不是已通过代码引入门禁**。

最需要保留的边界：Cline SDK仅`autoApprove===false`才询问且beforeTool hook能改policy；Goose Auto全允、SmartApprove能凭第三方readonly hint或LLM判断自动通过；Deep Agents的`LocalShellBackend`实现`SandboxBackendProtocol`却明确无隔离；OpenCode的本地driver裸node:fs/spawner。名称、提示词、进程树清理、UI审批都不构成OS沙箱证明。

## 固定来源与版本

| 项目 | 官方入口与canonical | SHA | 包声明版本 | 根许可证 |
|---|---|---|---|---|
| Cline | cline/cline；main | ea16751d6ae3ae1e443681994906bf29cbc45039 | VSCode4.1.26；CLI3.0.74；core/agents0.2.0 | Apache-2.0 |
| OpenCode | anomalyco/opencode仍现名；dev | 885df74024b6b540b63bfd487014252227713ea7 | 2.2.5 | MIT |
| Goose | block/goose重定向到**aaif-goose/goose**；main | 4facf56cbab049142809d9afa4648ebe6823ba80 | workspace1.58.0；goose-agent0.1.0-alpha.13 | Apache-2.0 |
| Deep Agents | langchain-ai/deepagents；main | 70dfbd597ae3d1ac348f6c46892464868f24b070 | SDK0.7.34；code0.2.5 | MIT |

版本源码证据：[apps/vscode/package.json:1](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/apps/vscode/package.json#L1-L15)；[apps/cli/package.json:1](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/apps/cli/package.json#L1-L15)；[sdk/packages/core/package.json:1](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/package.json#L1-L12)；[package.json:1](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/package.json#L1-L15)；[Cargo.toml:1](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/Cargo.toml#L1-L25)；[crates/goose-agent/Cargo.toml:1](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose-agent/Cargo.toml#L1-L18)；[libs/deepagents/pyproject.toml:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/pyproject.toml#L1-L37)；[libs/code/pyproject.toml:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/pyproject.toml#L1-L38)。

四份recursive tree都未截断。Cline与Deep Agents完整ZIP可读并有SHA256；Cline15个symlink成员拒绝落地。Goose/OpenCode的ZIP因网络耗时中断，不作为完整归档证据；正文引用来自固定SHA的raw下载。源码在`runtime/AgentNexus-v0.4-M0/upstream/.pytest_cache/harness-secondary-*`隔离，避免上游AGENTS.md被本地治理当项目规则；原始ZIP保留。未执行任何上游代码，不声称逐行审完全部仓库。

## 1. Cline

### model → tool → permission → persist → resume

`AgentRuntime.execute`迭代准备请求，实际模型入口`config.model.stream(request)`；tool calls经准备和执行，结果回消息。[sdk/packages/agents/src/agent-runtime.ts:801](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/agents/src/agent-runtime.ts#L801-L860)；[sdk/packages/agents/src/agent-runtime.ts:950](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/agents/src/agent-runtime.ts#L950-L1001)；[sdk/packages/agents/src/agent-runtime.ts:2110](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/agents/src/agent-runtime.ts#L2110-L2140)。

准备tool先跑beforeTool，可改input、policy、context或skip；再合并全局/具体工具/dependency policy。`enabled=false`拒绝，只有`autoApprove===false`要求callback；显式需审批但未配置callback则拒绝。API未设置policy不代表默认询问。执行最终调用`prepared.tool.execute`再跑afterTool。[sdk/packages/agents/src/agent-runtime.ts:216](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/agents/src/agent-runtime.ts#L216-L234)；[sdk/packages/agents/src/agent-runtime.ts:2467](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/agents/src/agent-runtime.ts#L2467-L2545)；[sdk/packages/agents/src/agent-runtime.ts:2580](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/agents/src/agent-runtime.ts#L2580-L2645)。

shell的spawn合并`process.env`；subprocess sandbox同样spawn Node/Bun并传环境。两者是本地执行链，不能由`Sandbox`类名推断文件/网络隔离。desktop审批IPC还把tool input明文写JSON，因此应视作敏感数据面。[sdk/packages/core/src/extensions/tools/executors/bash.ts:717](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/extensions/tools/executors/bash.ts#L717-L743)；[sdk/packages/core/src/runtime/tools/subprocess-sandbox.ts:302](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/runtime/tools/subprocess-sandbox.ts#L302-L320)；[sdk/packages/core/src/runtime/tools/tool-approval.ts:30](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/runtime/tools/tool-approval.ts#L30-L82)。

orchestrator从message event同步canonical conversation；LocalRuntimeHost在assistant-message保存，失败记录日志/遥测而不终止。manifest store写完整transcript，compaction sidecar另存。restore把历史作为initialMessages启动；compaction投影以prefix hash/boundary检查来源。[sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts:1323](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/runtime/orchestration/session-runtime-orchestrator.ts#L1323-L1333)；[sdk/packages/core/src/runtime/host/local-runtime-host.ts:1002](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/runtime/host/local-runtime-host.ts#L1002-L1034)；[sdk/packages/core/src/session/stores/session-manifest-store.ts:219](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/session/stores/session-manifest-store.ts#L219-L250)；[sdk/packages/core/src/session/stores/session-manifest-store.ts:281](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/session/stores/session-manifest-store.ts#L281-L314)；[sdk/packages/core/src/runtime/host/local-runtime-host.ts:1232](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/runtime/host/local-runtime-host.ts#L1232-L1254)；[sdk/packages/core/src/extensions/context/compaction.ts:772](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/extensions/context/compaction.ts#L772-L842)。

Git checkpoint restore另有stash/ref交易、untracked捕获、reset/clean；不是外部网络/数据库副作用rollback。[sdk/packages/core/src/session/checkpoint-restore.ts:43](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/session/checkpoint-restore.ts#L43-L107)。

| 模块 | 候选 | 理由/必要改动 |
|---|---|---|
| Agent Loop/provider | REFERENCE_ONLY | @cline/agents依赖@cline/llms/shared，直接抽loop并不独立；重试策略可参考 |
| context/truncation | FORK_MODIFY | canonical/request分层、summary sidecar、来源hash有价值；增加归档失败门禁与raw journal |
| tool schema/execution | REIMPLEMENT | schema可参考，执行统一过宿主broker、大小预算与最终参数审批 |
| permission | REIMPLEMENT | hook不能放宽中央权限；approval绑定最终参数/hash/时效 |
| sandbox | REIMPLEMENT | worker/subprocess隔离故障，不等价OS权限边界 |
| subagent/team | FORK_MODIFY | 参考生命周期、消息/状态存储；验证权限缩减、并发/递归/费用限额 |
| persistence/resume | REIMPLEMENT | transcript/sidecar/team持久化分层参考；自有append-only journal与幂等副作用 |
| checkpoint | REFERENCE_ONLY | 不自动触发上游Git reset/clean恢复实现 |
| MCP/ACP协议 | REUSE候选 | 官方schema/SDK待许可闭包；产品适配层REIMPLEMENT |
| rules/skills/hooks | REIMPLEMENT | 明确来源、信任层级、优先级和显式规则更新授权 |
| UI/telemetry | REFERENCE_ONLY | 可借鉴审批/压缩/team状态；遥测出口白名单重做 |

子代理实际透传toolPolicies/requestToolApproval：[sdk/packages/core/src/extensions/tools/team/delegated-agent.ts:72](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/extensions/tools/team/delegated-agent.ts#L72-L88)、[sdk/packages/core/src/extensions/tools/team/delegated-agent.ts:126](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/extensions/tools/team/delegated-agent.ts#L126-L145)。规则renderer选enabled并稳定排序：[sdk/packages/core/src/runtime/safety/rules.ts:35](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/runtime/safety/rules.ts#L35-L70)。hook以宿主spawn执行并收JSON payload：[sdk/packages/core/src/hooks/subprocess-runner.ts:179](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/hooks/subprocess-runner.ts#L179-L202)。TelemetryService区分emit/emitRequired，派发由adapter决定；这个类不能证明整产品默认无遥测或全部脱敏：[sdk/packages/core/src/services/telemetry/TelemetryService.ts:72](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/services/telemetry/TelemetryService.ts#L72-L87)。

测试**NOT_RUN**：compaction hash拒绝陈旧canonical前缀、reload/display-only边界见[sdk/packages/core/src/session/models/session-compaction.test.ts:85](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/session/models/session-compaction.test.ts#L85-L175)；启动/恢复connector认证见[sdk/packages/core/src/runtime/host/local-runtime-host.test.ts:225](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/core/src/runtime/host/local-runtime-host.test.ts#L225-L280)。Windows、多进程崩溃与权限不可绕过未验证。

许可证：根与VSCode Apache2：[LICENSE:1](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/LICENSE#L1-L18)、[apps/vscode/LICENSE:1](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/apps/vscode/LICENSE#L1-L18)；UI Radix颜色另有MIT版权[sdk/packages/ui/RADIX-COLORS-LICENSE:1](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/sdk/packages/ui/RADIX-COLORS-LICENSE#L1-L21)。SDK core22个外部直接运行时依赖已查精确lock版本metadata；@cline/llms/shared及peer/dev/optional native/transitive未闭包。shell环境、hook payload、session明文及可选messagesArtifactUploader均是潜在秘密/内容外流面，不能宣称已安全清零。

## 2. OpenCode

### model → tool → permission → persist → resume

本SHA实际代码迁至`packages/core`，不是旧`packages/opencode/src/session/processor.ts`。`runner/step.ts`调llm.stream，遇非provider-executed tool-call fork工具fiber；SessionModelRequest进入tools.execute，并把Permission.DeclinedError从defect恢复成failure，避免工具将拒绝吞作普通输出。[packages/core/src/session/runner/step.ts:90](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/runner/step.ts#L90-L126)；[packages/core/src/session/model-request.ts:412](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/model-request.ts#L412-L435)。

shell先解析commands与目录，authorizeExternal后permission.assert，对最终cwd在审批后再检查。Permission先deny，allow直接返回，ask等待Deferred；always回复保存project范围grant。pending本身为内存Map，因此重启后的审批语义不能仅靠这个服务保证。[packages/core/src/tool/plugin/shell.ts:114](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/tool/plugin/shell.ts#L114-L141)；[packages/core/src/permission.ts:175](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/permission.ts#L175-L205)；[packages/core/src/permission.ts:248](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/permission.ts#L248-L285)；[packages/core/src/permission.ts:340](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/permission.ts#L340-L361)。

工具/step结果由publisher发事件，projector/updater写SQLite session/message/part；SessionStore持久化execution claim与resume计数。restart读orphan claim，先durable countResume，超限aborted/release，再execution.resume；shell/image/subagent后台任务各有结果恢复通知，不是全部工具盲重放。[packages/core/src/session/runner/publish-llm-event.ts:548](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/runner/publish-llm-event.ts#L548-L577)；[packages/core/src/session/projector.ts:30](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/projector.ts#L30-L57)；[packages/core/src/session/store.ts:69](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/store.ts#L69-L94)；[packages/core/src/session/execution/restart.ts:78](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/execution/restart.ts#L78-L100)；[packages/core/src/session/execution/restart.ts:222](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/execution/restart.ts#L222-L259)。

| 模块 | 候选 | 理由/必要改动 |
|---|---|---|
| loop/provider | REFERENCE_ONLY | Effect服务/插件/runner/event强耦合，不作为整体底座 |
| context | FORK_MODIFY | summary/native compaction记录、keepID引用原消息与投影重建值得借鉴 |
| tools | REIMPLEMENT | 参数验证、输出截断/归档、错误中秘密脱敏与最终参数审批统一 |
| permission | FORK_MODIFY | 纯action/resource求值可独立审阅；持久审批/中央授权REIMPLEMENT |
| sandbox | REIMPLEMENT | local driver裸node:fs/spawner，shell解析批准不能替代OS隔离 |
| subagent | FORK_MODIFY | child session/background job归属、恢复通知、取消回执 |
| persistence/resume | REIMPLEMENT | 参考claim与次数上限，自有journal/idempotency contract |
| checkpoint | REFERENCE_ONLY | provider-native window绑定model与Git/worktree快照是不同机制 |
| MCP/ACP协议 | REUSE候选 | 官方协议类型；私有产品协议不当Nexus标准 |
| rules/hooks | REIMPLEMENT | ancestor/global/remote规则有来源冻结与信任限制，plugin不能抬权 |
| UI/telemetry/credential | REFERENCE_ONLY | 参考权限状态机；凭证与遥测出口重新设计 |

context保留/重放原文：[packages/core/src/session/history.ts:202](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/history.ts#L202-L239)；tool错误含input参数，需秘密脱敏：[packages/core/src/tool/runtime.ts:89](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/tool/runtime.ts#L89-L101)；local裸filesystem：[packages/core/src/environment/local.ts:8](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/environment/local.ts#L8-L28)、[packages/core/src/environment/local.ts:48](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/environment/local.ts#L48-L69)。subagent实际child/background语义：[packages/core/src/tool/plugin/subagent.ts:51](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/tool/plugin/subagent.ts#L51-L73)。远程instructions失败留last-good/skip：[packages/core/src/config/plugin/instruction.ts:148](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/config/plugin/instruction.ts#L148-L175)；hook含permission/shell/tool/session/aisdk：[packages/core/src/plugin/hooks.ts:13](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/plugin/hooks.ts#L13-L29)；插件可见WebSocket handshake headers/frames：[packages/core/src/session/model-request.ts:390](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/session/model-request.ts#L390-L406)。credential.value写DB路径可见，未证明各部署加密：[packages/core/src/credential.ts:154](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/credential.ts#L154-L178)。EventLogger只筛5种更新事件，不代表其他遥测出口不存在：[packages/core/src/event-logger.ts:7](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/src/event-logger.ts#L7-L16)。

测试**NOT_RUN**：已读permission、compaction/checkpoint transport、subagent测试文件；Windows slash normalize例[packages/core/test/permission.test.ts:175](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/core/test/permission.test.ts#L175-L197)。真实服务重启、native provider状态兼容、Windows命令权限绕过未验证。

许可证：根MIT[LICENSE:1](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/LICENSE#L1-L21)；**根MIT不覆盖所有目录**。Figma skills NOTICE明确不由OpenCode MIT重授权，受Figma Developer Terms，默认REFERENCE_ONLY不复制分发：[packages/plugins/figma/skills/NOTICE.md:1](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/plugins/figma/skills/NOTICE.md#L1-L14)。process-daemon与Ghostty各MIT版权[packages/process-daemon/LICENSE:1](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/process-daemon/LICENSE#L1-L21)、[packages/process-daemon/src/ghostty/LICENSE:1](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/process-daemon/src/ghostty/LICENSE#L1-L21)。codemode Test262含BSD/专利提示、WPT BSD3：[packages/codemode/test/LICENSE.test262:1](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/codemode/test/LICENSE.test262#L1-L18)、[packages/codemode/test/LICENSE.wpt:1](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/codemode/test/LICENSE.wpt#L1-L11)。IBM Plex字体OFL1.1：[services/changelog/public/changelog/fonts/LICENSE.txt:1](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/services/changelog/public/changelog/fonts/LICENSE.txt#L1-L15)。

core32项外部直接运行时依赖锁版本metadata已查；MCP2.3.1为Apache2（不同于Cline1.x MIT）、Effect4.1.0 MIT、Drizzle rc Apache2、diff8 BSD3。workspace包、patched MCP client、native binary、UI/desktop/dev及transitive尚未许可闭包；不能宣称整仓MIT可搬运。

## 3. Goose

### model → tool → permission → persist → resume

builder有序编排ToolApproval → PreToolCallHook → ToolExecution → Subagent ... → Inference。GDK每次load持久session → step → apply_effects；model返回tool request后，下次从审批开始重入。[crates/goose/src/agents/state_machine_builder.rs:119](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine_builder.rs#L119-L156)；[crates/goose/src/agents/state_machine_builder.rs:197](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine_builder.rs#L197-L219)；[crates/goose-agent/src/machine.rs:233](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose-agent/src/machine.rs#L233-L247)。

PermissionInspector未知结果默认ask，但Auto全允；SmartApprove信任readonly annotation或LLM分类。ToolApproval把需审批request设不可执行并产生action-required；人工答复从conversation识别且先persist decision。tool执行仅dispatch advertised/disposition=Execute请求，并检查lease/expired approval。[crates/goose/src/permission/permission_inspector.rs:89](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/permission/permission_inspector.rs#L89-L139)；[crates/goose/src/permission/permission_inspector.rs:170](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/permission/permission_inspector.rs#L170-L213)；[crates/goose-agent/src/tool_approval.rs:120](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose-agent/src/tool_approval.rs#L120-L147)；[crates/goose-agent/src/tool_approval.rs:167](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose-agent/src/tool_approval.rs#L167-L192)；[crates/goose/src/agents/state_machine/tool_confirmation.rs:148](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine/tool_confirmation.rs#L148-L185)；[crates/goose/src/agents/state_machine/ops_toolcalling.rs:823](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine/ops_toolcalling.rs#L823-L875)；[crates/goose/src/agents/state_machine/ops_toolcalling.rs:916](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine/ops_toolcalling.rs#L916-L934)。

SessionManager effect handler写append/replace/compaction/meta；审批提示**先持久化再向UI发布**，避免立即回答的竞态。下次load同conversation重入即resume基础，不仅是等待future。[crates/goose/src/agents/state_machine/session.rs:44](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine/session.rs#L44-L86)；[crates/goose/src/agents/state_machine/session.rs:143](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine/session.rs#L143-L170)。

| 模块 | 候选 | 理由/必要改动 |
|---|---|---|
| loop/GDK | REFERENCE_ONLY | Rust Operation/Effect/SessionLoader可参考，不直接替换底座 |
| context/archive | FORK_MODIFY | compact保存更新agent_visible并插summary，保留旧行；区别普通replace的DELETE路径 |
| tool/MCP | REUSE候选 | 官方rmcp schema/SDK待许可闭包；dispatch、output预算重做 |
| permission | REIMPLEMENT | Auto/SmartApprove不是安全边界；工具名grant需细化参数/resource |
| sandbox/shell | REIMPLEMENT | process group/Windows Job Object清理不等价文件/网络sandbox |
| subagent | FORK_MODIFY | 保存recipe/provider/model/extensions再resume，默认并发5不照搬 |
| persistence/resume | REIMPLEMENT | 借鉴审批先落盘和状态重入；补副作用幂等journal |
| checkpoint | REFERENCE_ONLY | 未证明任意shell/网络操作能回滚，不宣传全工作区恢复 |
| rules/hooks | REIMPLEMENT | hooks.json命令hook执行sh -c并继承环境，默认禁用待用户显式信任 |
| ACP/UI | 协议REUSE候选；UI REFERENCE_ONLY | 参考事件/权限映射，不搬desktop壳 |
| telemetry | REIMPLEMENT | 最小事件白名单与用户授权出口 |

compaction保存事务只更新visibility/插新消息，旧content仍在DB：[crates/goose/src/session/session_manager.rs:2312](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/session/session_manager.rs#L2312-L2365)。shell普通host Command、清理策略：[crates/goose/src/agents/platform_extensions/developer/shell_process.rs:11](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/platform_extensions/developer/shell_process.rs#L11-L31)、[crates/goose/src/agents/platform_extensions/developer/shell_process.rs:94](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/platform_extensions/developer/shell_process.rs#L94-L130)；shell选择[crates/goose/src/agents/platform_extensions/developer/shell.rs:548](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/platform_extensions/developer/shell.rs#L548-L586)。hook命令宿主spawn、超时与sh -c：[crates/goose/src/hooks/mod.rs:1031](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/hooks/mod.rs#L1031-L1098)。子session恢复参数[crates/goose/src/agents/subagent_handler.rs:34](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/subagent_handler.rs#L34-L77)。message content遥测须`OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true`，不能推断其他log/exporter也已脱敏：[crates/goose/src/agents/gen_ai_telemetry.rs:9](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/gen_ai_telemetry.rs#L9-L17)。

测试**NOT_RUN**：持久grant撤销/atomic替换[crates/goose/tests/permission_persistence.rs:1](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/tests/permission_persistence.rs#L1-L83)；context-error恢复/重复错误停止[crates/goose/src/agents/state_machine/tests/compaction_lifecycle.rs:233](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine/tests/compaction_lifecycle.rs#L233-L261)、[crates/goose/src/agents/state_machine/tests/compaction_lifecycle.rs:340](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine/tests/compaction_lifecycle.rs#L340-L361)。

许可证根Apache2[LICENSE:1](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/LICENSE#L1-L18)。嵌入图表地图资源另有MIT/ISC/BSD：D3 ISC[crates/goose-mcp/licenses/d3-js.license:1](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose-mcp/licenses/d3-js.license#L1-L13)、D3-sankey BSD3[crates/goose-mcp/licenses/d3-sankey.license:1](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose-mcp/licenses/d3-sankey.license#L1-L24)、Leaflet BSD2[crates/goose-mcp/licenses/leaflet.license:1](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose-mcp/licenses/leaflet.license#L1-L22)；Chart.js/markercluster/Mermaid MIT文件也已保留。仅查Cargo.lock选定9项协议/进程/密钥/DB/网络/遥测依赖metadata，不是所有直接依赖。native/linking闭包、平台credential backend、sqlite/crypto bundled来源、UI依赖仍未审完。

## 4. Deep Agents

### model → tool → permission → persist → resume（含依赖侧）

create_deep_agent默认StateBackend，组装filesystem/subagent/summarization/memory/skills/HITL middleware，把checkpointer传LangChain create_agent；本身是graph assembly，不是独立模型loop。[libs/deepagents/deepagents/graph.py:666](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/graph.py#L666-L675)；[libs/deepagents/deepagents/graph.py:909](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/graph.py#L909-L940)；[libs/deepagents/deepagents/graph.py:968](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/graph.py#L968-L1024)。

继续追lock版本LangChain1.4.9，官方tag固定SHA为d1d95b79213b0212613ae1aa4fad38bea6f1dccf。factory建ToolNode/组合tool wrappers，实际model.invoke/ainvoke，graph.compile(checkpointer)。HITL对配置工具interrupt并处理approve/edit/reject/respond，**未列工具默认auto-approve**。[libs/langchain_v1/langchain/agents/factory.py:1091](https://github.com/langchain-ai/langchain/blob/d1d95b79213b0212613ae1aa4fad38bea6f1dccf/libs/langchain_v1/langchain/agents/factory.py#L1091-L1148)；[libs/langchain_v1/langchain/agents/factory.py:1499](https://github.com/langchain-ai/langchain/blob/d1d95b79213b0212613ae1aa4fad38bea6f1dccf/libs/langchain_v1/langchain/agents/factory.py#L1499-L1514)；[libs/langchain_v1/langchain/agents/factory.py:1558](https://github.com/langchain-ai/langchain/blob/d1d95b79213b0212613ae1aa4fad38bea6f1dccf/libs/langchain_v1/langchain/agents/factory.py#L1558-L1573)；[libs/langchain_v1/langchain/agents/factory.py:1909](https://github.com/langchain-ai/langchain/blob/d1d95b79213b0212613ae1aa4fad38bea6f1dccf/libs/langchain_v1/langchain/agents/factory.py#L1909-L1919)；[libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py:499](https://github.com/langchain-ai/langchain/blob/d1d95b79213b0212613ae1aa4fad38bea6f1dccf/libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py#L499-L509)；[libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py:735](https://github.com/langchain-ai/langchain/blob/d1d95b79213b0212613ae1aa4fad38bea6f1dccf/libs/langchain_v1/langchain/agents/middleware/human_in_the_loop.py#L735-L757)。

SDK将filesystem interrupt与用户interrupt map合并且用户同名优先；compiled/async child不自动继承所有审批。Filesystem权限只在内建tool middleware，不在backend。LocalShell最终subprocess.run(shell=True,env=...,cwd=...)且无隔离；SDK默认StateBackend不提供shell，CLI local enable_shell才构建LocalShellBackend。[libs/deepagents/deepagents/graph.py:192](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/graph.py#L192-L209)；[libs/deepagents/deepagents/graph.py:495](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/graph.py#L495-L544)；[libs/deepagents/deepagents/backends/local_shell.py:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/backends/local_shell.py#L1-L6)；[libs/deepagents/deepagents/backends/local_shell.py:303](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/backends/local_shell.py#L303-L315)；[libs/code/deepagents_code/agent.py:3191](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/deepagents_code/agent.py#L3191-L3224)。

CLI get_checkpointer提供OwnedSqliteSaver/fencing与connection清理；处理decision后Command(resume=resume_payload)继续。SDK可不传checkpointer，故持久化不是默认保证；LangGraph checkpoint-sqlite依赖完整实现本次未审完。[libs/code/deepagents_code/sessions.py:2050](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/deepagents_code/sessions.py#L2050-L2069)；[libs/code/deepagents_code/client/non_interactive.py:2365](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/deepagents_code/client/non_interactive.py#L2365-L2395)；[libs/deepagents/deepagents/graph.py:591](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/graph.py#L591-L598)。

| 模块 | 候选 | 理由/必要改动 |
|---|---|---|
| loop/graph | REFERENCE_ONLY | LangChain/LangGraph runtime与CLI server强依赖，不选整个底座 |
| context/archive | FORK_MODIFY | raw state保留与summary event投影；归档失败继续、参数先truncate需加强 |
| backend/filesystem/tools | FORK_MODIFY | protocol/result分层有价值；权限在executor统一落实 |
| permission | REIMPLEMENT | 不允许user map/child spec放宽parent capability，所有高风险工具最终参数审批 |
| sandbox | REIMPLEMENT | LocalShell无隔离；remote providers另带服务条款/凭证/成本，不默认连接 |
| subagent | FORK_MODIFY | stateless/fork/compiled/async生命周期参考；private-state与权限缩减重做 |
| persistence/resume | REIMPLEMENT | 自有journal；checkpoint-sqlite闭包未审完不能宣称崩溃一致性通过 |
| checkpoint | REFERENCE_ONLY | graph state不是shell/网络副作用rollback；CLI还patch私有adapter |
| rules/memory/skills | REIMPLEMENT | 配置sources顺序合并；prompt含自动存学习策略不适用本项目规则显式治理 |
| hooks | REIMPLEMENT | hook可代人工decision；名称过滤secret环境不等价绝对无泄漏/隔离 |
| ACP/MCP | REUSE候选 | 独立协议类型/SDK待许可闭包；产品适配重做 |
| UI/telemetry | REFERENCE_ONLY | Textual UI专用；LangSmith tracing有配置/redaction仍可能含业务内容 |

subagent permissions可替换父规则[libs/deepagents/deepagents/middleware/subagents.py:180](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/middleware/subagents.py#L180-L195)、private-state过滤[libs/deepagents/deepagents/middleware/subagents.py:774](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/middleware/subagents.py#L774-L787)。summary保留raw state[libs/deepagents/deepagents/middleware/summarization.py:1635](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/middleware/summarization.py#L1635-L1653)，但旧tool参数先truncate[libs/deepagents/deepagents/middleware/summarization.py:1667](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/middleware/summarization.py#L1667-L1689)后再offload；失败仍生成summary并警告原文/媒体可能不可恢复[libs/deepagents/deepagents/middleware/summarization.py:1702](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/middleware/summarization.py#L1702-L1734)。因此offload Markdown不自动等于逐字全原文，必须依赖独立raw journal/checkpointer保留。

Memory将磁盘内容明确作reference、偏好用户/验证证据，但prompt也鼓励主动更新学习[libs/deepagents/deepagents/middleware/memory.py:107](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/deepagents/middleware/memory.py#L107-L124)。hook env按secret变量名称过滤[libs/code/deepagents_code/hooks/env.py:18](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/deepagents_code/hooks/env.py#L18-L33)；tracing显式关闭与redaction设置[libs/code/deepagents_code/config.py:4613](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/deepagents_code/config.py#L4613-L4632)。不能借这些局部防护宣称所有秘密不出站。

测试**NOT_RUN**：递归delete权限边界[libs/deepagents/tests/unit_tests/test_permissions.py:149](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/tests/unit_tests/test_permissions.py#L149-L183)；一次overflow恢复/重复失败停止[libs/deepagents/tests/unit_tests/middleware/test_compaction_recovery.py:114](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/tests/unit_tests/middleware/test_compaction_recovery.py#L114-L149)；checkpointer adapter fast path[libs/code/tests/unit_tests/test_checkpointer_adapter.py:64](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/tests/unit_tests/test_checkpointer_adapter.py#L64-L87)。真实模型、remote sandbox与并发恢复未运行。

许可证：root/SDK/code/ACP各MIT[LICENSE:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/LICENSE#L1-L21)、[libs/deepagents/LICENSE:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/deepagents/LICENSE#L1-L21)、[libs/code/LICENSE:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/LICENSE#L1-L21)、[libs/acp/LICENSE:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/acp/LICENSE#L1-L21)。例外eval vendor/contextbench、drbench为Apache2[libs/evals/harbor_adapters/contextbench/vendor/LICENSE:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/evals/harbor_adapters/contextbench/vendor/LICENSE#L1-L18)、[libs/evals/harbor_adapters/drbench/vendor/LICENSE:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/evals/harbor_adapters/drbench/vendor/LICENSE#L1-L18)；tau2_airline为Sierra衍生MIT且独立notice[libs/evals/tests/evals/tau2_airline/LICENSE:1](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/evals/tests/evals/tau2_airline/LICENSE#L1-L28)。

SDK7个直接依赖锁版本metadata已查（另查LangGraph传递依赖）；CLI lock的LangGraph1.2.20、packaging26.2与SDK lock1.2.18/26.0不同。CLI Python>=3.14,<3.15，SDK>=3.11,<4，不能混用兼容性结论。CLI全部直接依赖、runtime-inmem/CLI extras、native QuickJS、remote服务条款、全transitive尚未闭包，未来引入前阻断。

## 4a. 补全的模型与协议控制流证据

Goose的InferenceProvider适配实际委托reply_parts，最终provider.stream(model_config,system_prompt,messages,tools)；请求只投影agent_visible消息，内容遥测受前述开关控制。[crates/goose/src/agents/state_machine/ops_llm.rs:148](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/state_machine/ops_llm.rs#L148-L205)；[crates/goose/src/agents/reply_parts.rs:249](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/reply_parts.rs#L249-L305)。ACP load遇待审批可start_resumed_state_machine_turn并调用services.resume_turn，把持久审批恢复接回执行链：[crates/goose/src/acp/server/load_session.rs:248](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/acp/server/load_session.rs#L248-L285)。prompt manager加载工作区hints并合入extras：[crates/goose/src/agents/prompt_manager.rs:90](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/prompt_manager.rs#L90-L99)、[crates/goose/src/agents/prompt_manager.rs:138](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/crates/goose/src/agents/prompt_manager.rs#L138-L151)。

ACP提供传输和交互，不能提供执行隔离，也不能把四产品授权scope/会话持久化当作一致：

- Cline传rawInput；handlePermissionResponse将allow_once与allow_always均变成approved=true，在该helper输出处未保留grant scope。Nexus适配应保留scope/时效并验证调用方保存语义：[apps/cli/src/acp/permissions.ts:37](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/apps/cli/src/acp/permissions.ts#L37-L85)
- OpenCode ACP把once/always/reject映射回permission.reply，取消/未知默认reject，preview可显示diff；返回类型与Cline helper不同：[packages/cli/src/acp/permission.ts:39](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/cli/src/acp/permission.ts#L39-L80)
- Goose桌面tool-permission管理走toolsPermissionsSet_unstable扩展，不能称作跨产品通用ACP核心能力：[ui/desktop/src/acp/permissions.ts:1](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/ui/desktop/src/acp/permissions.ts#L1-L18)
- Deep Agents ACP要求session/load有checkpointer，普通prompt若无则注入MemorySaver，随后Command(resume=decisions)处理审批。MemorySaver不证明重启后持久恢复：[libs/acp/deepagents_acp/server.py:804](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/acp/deepagents_acp/server.py#L804-L816)、[libs/acp/deepagents_acp/server.py:965](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/acp/deepagents_acp/server.py#L965-L973)、[libs/acp/deepagents_acp/server.py:1001](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/acp/deepagents_acp/server.py#L1001-L1018)

## 4b. UI层源码抽查（未启动UI）

- Cline CLI有tool-specific参数预览、fallback JSON只显示前200字符、spawn任务只显示前80字符；Y/Enter通过、N/Esc拒绝。这证明UI可能只呈现参数摘要，Nexus审批应绑定可展开的完整最终参数，不能把截短预览当授权对象。[apps/cli/src/tui/components/dialogs/tool-approval.tsx:131](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/apps/cli/src/tui/components/dialogs/tool-approval.tsx#L131-L160)
- OpenCode权限dock以attempt编号隔离过期reply/timeout，双击只第一个decide有效，replied终态不重新启用按钮。可借鉴这个纯状态机，但它不替代服务端授权日志。[packages/app/src/session/requests/permission-machine.ts:51](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/app/src/session/requests/permission-machine.ts#L51-L101)
- Goose设置modal按工具列always/ask/never，加载依赖active session；handleSave把修改批量发setToolPermissions，失败console.error并保持弹窗。grant是工具级设置，不是具体命令执行参数审批。[ui/desktop/src/components/settings/permission/PermissionModal.tsx:86](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/ui/desktop/src/components/settings/permission/PermissionModal.tsx#L86-L112)、[ui/desktop/src/components/settings/permission/PermissionModal.tsx:155](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/ui/desktop/src/components/settings/permission/PermissionModal.tsx#L155-L180)
- Deep Agents Textual ApprovalMenu有Y/A/N、展开command与拒绝反馈；A可在eligible场景启用thread Auto。权限UI应明确一次批准、持久grant和Auto mode的范围差别。[libs/code/deepagents_code/tui/widgets/approval.py:119](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/deepagents_code/tui/widgets/approval.py#L119-L143)、[libs/code/deepagents_code/tui/widgets/approval.py:482](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/libs/code/deepagents_code/tui/widgets/approval.py#L482-L497)

## 5. 许可证证据清单与未决门禁

下表71条均为**精确锁版本官方metadata，METADATA_ONLY_NOT_CODE_LICENSE_CLEARANCE**。原始JSON与SHA256保留在harness-secondary-dependency-licenses.json及upstream/.pytest_cache/harness-secondary-license-metadata/。包license字符串不等于逐文件/native/NOTICE/专利/商标/服务条款完成审计；Goose只是关键依赖抽样，LangGraph为Deep Agents传递依赖额外追查。Cline/OpenCode的workspace内部包与其外部闭包尚未清理。

| 范围 | 包@锁版本 | 官方license metadata |
|---|---|---|
| cline | `@modelcontextprotocol/sdk@1.30.0` | [MIT](https://registry.npmjs.org/@modelcontextprotocol%2fsdk/1.30.0) |
| cline | `@opentelemetry/api@1.9.1` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fapi/1.9.1) |
| cline | `@opentelemetry/api-logs@0.214.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fapi-logs/0.214.0) |
| cline | `@opentelemetry/exporter-logs-otlp-http@0.214.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fexporter-logs-otlp-http/0.214.0) |
| cline | `@opentelemetry/exporter-metrics-otlp-http@0.214.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fexporter-metrics-otlp-http/0.214.0) |
| cline | `@opentelemetry/exporter-trace-otlp-http@0.214.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fexporter-trace-otlp-http/0.214.0) |
| cline | `@opentelemetry/resources@2.10.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fresources/2.10.0) |
| cline | `@opentelemetry/sdk-logs@0.214.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fsdk-logs/0.214.0) |
| cline | `@opentelemetry/sdk-metrics@2.10.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fsdk-metrics/2.10.0) |
| cline | `@opentelemetry/sdk-trace-base@2.10.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fsdk-trace-base/2.10.0) |
| cline | `@opentelemetry/sdk-trace-node@2.10.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fsdk-trace-node/2.10.0) |
| cline | `@opentelemetry/semantic-conventions@1.43.0` | [Apache-2.0](https://registry.npmjs.org/@opentelemetry%2fsemantic-conventions/1.43.0) |
| cline | `http-proxy-agent@7.0.2` | [MIT](https://registry.npmjs.org/http-proxy-agent/7.0.2) |
| cline | `https-proxy-agent@7.0.6` | [MIT](https://registry.npmjs.org/https-proxy-agent/7.0.6) |
| cline | `jiti@2.7.0` | [MIT](https://registry.npmjs.org/jiti/2.7.0) |
| cline | `node-machine-id@1.1.12` | [MIT](https://registry.npmjs.org/node-machine-id/1.1.12) |
| cline | `nanoid@5.1.16` | [MIT](https://registry.npmjs.org/nanoid/5.1.16) |
| cline | `proxy-from-env@2.1.0` | [MIT](https://registry.npmjs.org/proxy-from-env/2.1.0) |
| cline | `simple-git@3.36.0` | [MIT](https://registry.npmjs.org/simple-git/3.36.0) |
| cline | `ws@8.21.3` | [MIT](https://registry.npmjs.org/ws/8.21.3) |
| cline | `yaml@2.9.0` | [ISC](https://registry.npmjs.org/yaml/2.9.0) |
| cline | `zod@4.4.3` | [MIT](https://registry.npmjs.org/zod/4.4.3) |
| opencode | `@ai-sdk/provider@3.0.19` | [Apache-2.0](https://registry.npmjs.org/@ai-sdk%2fprovider/3.0.19) |
| opencode | `@ai-sdk/provider-utils@4.0.62` | [Apache-2.0](https://registry.npmjs.org/@ai-sdk%2fprovider-utils/4.0.62) |
| opencode | `@effect/platform-node@4.1.0` | [MIT](https://registry.npmjs.org/@effect%2fplatform-node/4.1.0) |
| opencode | `@effect/platform-node-shared@4.1.0` | [MIT](https://registry.npmjs.org/@effect%2fplatform-node-shared/4.1.0) |
| opencode | `@effect/sql-sqlite-bun@4.1.0` | [MIT](https://registry.npmjs.org/@effect%2fsql-sqlite-bun/4.1.0) |
| opencode | `@effect/sql-sqlite-node@4.1.0` | [MIT](https://registry.npmjs.org/@effect%2fsql-sqlite-node/4.1.0) |
| opencode | `@ff-labs/fff-bun@0.10.5` | [MIT](https://registry.npmjs.org/@ff-labs%2ffff-bun/0.10.5) |
| opencode | `@ff-labs/fff-node@0.10.5` | [MIT](https://registry.npmjs.org/@ff-labs%2ffff-node/0.10.5) |
| opencode | `@lydell/node-pty@1.2.0-beta.12` | [MIT](https://registry.npmjs.org/@lydell%2fnode-pty/1.2.0-beta.12) |
| opencode | `@modelcontextprotocol/client@2.3.1` | [Apache-2.0](https://registry.npmjs.org/@modelcontextprotocol%2fclient/2.3.1) |
| opencode | `@modelcontextprotocol/core@2.3.1` | [Apache-2.0](https://registry.npmjs.org/@modelcontextprotocol%2fcore/2.3.1) |
| opencode | `@modelcontextprotocol/server@2.3.1` | [Apache-2.0](https://registry.npmjs.org/@modelcontextprotocol%2fserver/2.3.1) |
| opencode | `@opencode/pty@0.4.0` | [MIT](https://registry.npmjs.org/@opencode%2fpty/0.4.0) |
| opencode | `@parcel/watcher@2.5.1` | [MIT](https://registry.npmjs.org/@parcel%2fwatcher/2.5.1) |
| opencode | `@silvia-odwyer/photon-node@0.3.4` | [Apache-2.0](https://registry.npmjs.org/@silvia-odwyer%2fphoton-node/0.3.4) |
| opencode | `@standard-schema/spec@1.1.0` | [MIT](https://registry.npmjs.org/@standard-schema%2fspec/1.1.0) |
| opencode | `bun-pty@0.4.11` | [MIT](https://registry.npmjs.org/bun-pty/0.4.11) |
| opencode | `diff@8.0.4` | [BSD-3-Clause](https://registry.npmjs.org/diff/8.0.4) |
| opencode | `drizzle-orm@1.0.0-rc.5-169397b` | [Apache-2.0](https://registry.npmjs.org/drizzle-orm/1.0.0-rc.5-169397b) |
| opencode | `effect@4.1.0` | [MIT](https://registry.npmjs.org/effect/4.1.0) |
| opencode | `fuzzysort@3.1.0` | [MIT](https://registry.npmjs.org/fuzzysort/3.1.0) |
| opencode | `gitlab-ai-provider@6.23.1` | [MIT](https://registry.npmjs.org/gitlab-ai-provider/6.23.1) |
| opencode | `gray-matter@4.0.3` | [MIT](https://registry.npmjs.org/gray-matter/4.0.3) |
| opencode | `htmlparser2@8.0.2` | [MIT](https://registry.npmjs.org/htmlparser2/8.0.2) |
| opencode | `http-proxy-agent@7.0.2` | [MIT](https://registry.npmjs.org/http-proxy-agent/7.0.2) |
| opencode | `https-proxy-agent@7.0.6` | [MIT](https://registry.npmjs.org/https-proxy-agent/7.0.6) |
| opencode | `immer@11.1.4` | [MIT](https://registry.npmjs.org/immer/11.1.4) |
| opencode | `jose@6.0.11` | [MIT](https://registry.npmjs.org/jose/6.0.11) |
| opencode | `jsonc-parser@3.3.1` | [MIT](https://registry.npmjs.org/jsonc-parser/3.3.1) |
| opencode | `mime-types@3.0.2` | [MIT](https://registry.npmjs.org/mime-types/3.0.2) |
| opencode | `which@6.0.1` | [ISC](https://registry.npmjs.org/which/6.0.1) |
| opencode | `zod@4.6.7` | [MIT](https://registry.npmjs.org/zod/4.6.7) |
| goose | `rmcp@3.4.1` | [Apache-2.0](https://crates.io/api/v1/crates/rmcp/3.4.1) |
| goose | `agent-client-protocol@2.2.0` | [Apache-2.0](https://crates.io/api/v1/crates/agent-client-protocol/2.2.0) |
| goose | `agent-client-protocol-schema@1.9.1` | [Apache-2.0](https://crates.io/api/v1/crates/agent-client-protocol-schema/1.9.1) |
| goose | `keyring@3.6.3` | [MIT OR Apache-2.0](https://crates.io/api/v1/crates/keyring/3.6.3) |
| goose | `tokio@1.53.1` | [MIT](https://crates.io/api/v1/crates/tokio/1.53.1) |
| goose | `sqlx@0.9.0` | [MIT OR Apache-2.0](https://crates.io/api/v1/crates/sqlx/0.9.0) |
| goose | `sqlx-sqlite@0.9.0` | [MIT OR Apache-2.0](https://crates.io/api/v1/crates/sqlx-sqlite/0.9.0) |
| goose | `opentelemetry@0.32.0` | [Apache-2.0](https://crates.io/api/v1/crates/opentelemetry/0.32.0) |
| goose | `reqwest@0.13.5` | [MIT OR Apache-2.0](https://crates.io/api/v1/crates/reqwest/0.13.5) |
| deepagents | `langchain@1.4.9` | [MIT](https://pypi.org/pypi/langchain/1.4.9/json) |
| deepagents | `langchain-core@1.7.6` | [MIT](https://pypi.org/pypi/langchain-core/1.7.6/json) |
| deepagents | `langchain-anthropic@1.7.10` | [MIT](https://pypi.org/pypi/langchain-anthropic/1.7.10/json) |
| deepagents | `langchain-google-genai@4.4.3` | [MIT](https://pypi.org/pypi/langchain-google-genai/4.4.3/json) |
| deepagents | `langsmith@0.14.17` | [MIT](https://pypi.org/pypi/langsmith/0.14.17/json) |
| deepagents | `packaging@26.0` | [Apache-2.0 OR BSD-2-Clause](https://pypi.org/pypi/packaging/26.0/json) |
| deepagents | `wcmatch@11.0` | [MIT](https://pypi.org/pypi/wcmatch/11.0/json) |
| deepagents | `langgraph@1.2.18` | [MIT](https://pypi.org/pypi/langgraph/1.2.18/json) |

M0后的代码引入必须先确定精确模块文件并补全：

1. 完整直接/传递依赖、native/optional平台包、patch/vendor/NOTICE与服务条款审计；本报告不能作为整仓许可清零。
2. 离线fake model+受控临时sandbox验证拒绝/参数修改/审批过期、hooks不能提升权限、child capability缩减、秘密不入模型/日志/trace/子进程。本次上游测试全NOT_RUN。
3. 模型输出到最终tool参数hash、重启失去waiting future、执行成功而persist失败、重复恢复、取消超时与跨平台路径/进程树等失败窗口；不能从checkpoint存在推导exactly-once。
4. 分清canonical原消息、provider projection、summary、裁剪tool output、媒体；归档失败必须可观察且有明确策略。Cline部分persist失败仅警告、Deep Agents offload失败仍压缩，Nexus若需更强保证应独立实现。

## 6. 本地证据索引

- harness-secondary-*-tree.json：四个固定SHA完整目录树。
- harness-secondary-raw-downloads.json、raw-supplement.json、raw-final.json：raw下载URL/成功失败/字节/hash；旧404路径不作为已审源码。
- harness-secondary-downloads.json、harness-secondary-cline-skipped-links.json：ZIP完整/中断、hash及拒绝symlink清单。
- harness-secondary-dependency-requests.json、dependency-licenses.json：锁版本依赖与官方metadata原文路径/hash；未安装。
- harness-secondary-dependency-source.json、langchain-version.json：依赖侧源码/固定SHA；checkpoint-sqlite tag路径404未冒充已通过。
- harness-secondary-evidence.json：正文每个固定SHA文件/行号/文件hash；harness-secondary-source-inventory.json：本审计缓存文件hash清单。
