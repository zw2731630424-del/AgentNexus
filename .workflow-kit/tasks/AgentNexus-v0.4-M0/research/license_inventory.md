# 许可证与复用准入清单

审计窗口2026-11-06至07。根许可已读，重要嵌套例外已定位；直接依赖按固定lock或声明范围分层核对。**本轮没有生成完整产品依赖锁、发行包或传递依赖SBOM，未授予整仓复制/发行许可准入。** 研究快照只作只读证据，不加入产品依赖，也未运行安装器。

## 主体与例外

| 来源与固定版本 | 已核实根许可 | 重要额外义务或限制 | 当前采用/准入 |
|---|---|---|---|
| Workflow Kit v4.0.0，ZIP 4cad510c…36ec | NOASSERTION：105文件无LICENSE/NOTICE授权正文 | SOURCES.json和文件哈希不等于版权授权；用户提供研究资料不能自动推出对外发行许可 | 私有研究/来源归档；功能规格独立REIMPLEMENT；复制源代码/模板原文BLOCKED |
| DeepSeek fcc0ad46…0159 | [MIT根许可](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/LICENSE) | HMR、fs-patch等有自带许可；experimental/subagent-oar有Apache-2.0 LICENSE-OAR；FortuneSheet notice单列 | 设计参考；任何抽取需文件级notice与native依赖复核 |
| Cline ea16751d…5039 | [Apache-2.0](https://github.com/cline/cline/blob/ea16751d6ae3ae1e443681994906bf29cbc45039/LICENSE) | Radix颜色等UI资源有独立MIT声明；SDK/VSCode/CLI发布包范围不同 | 模块候选；不把根Apache覆盖第三方资产 |
| OpenHands UI 3d9986c0…e3bb | [MIT](https://github.com/OpenHands/OpenHands/blob/3d9986c07354812909bb72685b372dd2b00be3bb/LICENSE) | 本SHA是Agent Canvas；旧版enterprise目录不存在，不能套历史许可结论；UI依赖闭包未完成 | 只参考UI，不搬整仓 |
| OpenHands SDK 8dc712f6…3e69 | [MIT](https://github.com/OpenHands/software-agent-sdk/blob/8dc712f618c01d730c453a87a8a3969859c53e69/LICENSE) | uv.lock固定的模型/MCP/观测/解析依赖另有许可；工具和server子包单列 | 只参考；依赖实际wheel/native closure待准入 |
| OpenCode 885df740…ea7 | [MIT](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/LICENSE) | Figma skills的NOTICE指向Figma Developer Terms，MIT不重授；Test262/WPT BSD，IBM Plex OFL | 排除受额外条款约束的skills/字体，选文件后再审 |
| Goose 4facf56c…3ba80 | [Apache-2.0](https://github.com/aaif-goose/goose/blob/4facf56cbab049142809d9afa4648ebe6823ba80/LICENSE) | 图表/地图/嵌入资源MIT/ISC/BSD混合，native crates/binaries另审 | 协议SDK候选，UI/内核仅参考 |
| Agensh 2dae4e14…d6c | [MIT](https://github.com/microsoft/Agensh/blob/2dae4e14a653da48549fd9aa093f834841475d6c/LICENSE) | Docker外部镜像、Copilot/Codex/Claude/Pi二进制及模型权限不由该MIT授予 | 不引入实验部署栈；队列/manifest思想参考 |
| Deep Agents 70dfbd59…b070 | [MIT](https://github.com/langchain-ai/deepagents/blob/70dfbd597ae3d1ac348f6c46892464868f24b070/LICENSE) | evals/vendor有Apache-2.0和tau2衍生notice；LangChain、LangGraph、checkpointer分包 | 不包含eval vendor进产品；实际选择包后锁依赖 |
| Codex 814347ec…1803 | [Apache-2.0](https://github.com/openai/codex/blob/814347ecd21b49d25479f5499f168b9f7b7e1803/LICENSE) | 固定rmcp Git rev处MIT→Apache过渡；OpenAI websocket forks须查实际rev许可；Windows/native链另审 | app-server可选外部后端，不整仓Fork |
| Claude SDK 3be907ed…6419 | [SDK MIT](https://github.com/anthropics/claude-agent-sdk-python/blob/3be907edb9c86269d30d1427a77937dd788d6419/LICENSE) | SDK运行独立Claude Code CLI，SDK许可不扩展至该CLI或订阅认证；未下载/再分发CLI | 官方SDK可选适配；闭源核心仅用官方公开接口 |
| ZCode a9fe401e…02d9 | [Apache-2.0](https://github.com/zai-org/ZCode/blob/a9fe401eede6e6e5e01be9048679c206fe6f02d9/LICENSE) | THIRD-PARTY-NOTICES说明部分原始导入rev/完整notice缺失，React skill来源notice未全；并含EPL/GPL双许可、GCC例外等资产 | 只参考审过模块；不能把整个仓库作单一Apache组件复制 |

完整固定SHA在[研究矩阵](harvest_matrix.md)。上表缩写只用于阅读，不作为下载版本键。

嵌套许可的实际位置：[DeepSeek OAR](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/experimental/subagent-oar/LICENSE-OAR)、[FortuneSheet](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/client/ui-sidebar-documentpreview/licenses/FortuneSheet.txt)、[OpenCode Figma NOTICE](https://github.com/anomalyco/opencode/blob/885df74024b6b540b63bfd487014252227713ea7/packages/plugins/figma/skills/NOTICE.md)。ZCode的具体notice行号和rmcp/fork依赖rev见[公开接口审计](public_interfaces.md)，其他vendored组件证据见[四Harness审计许可段](harness_secondary.md)。

## 依赖证据分级

- **源码许可已读**：上表根许可、关键嵌套notice，以及Codex实际Git fork许可文件。它证明对应文件/版本的授权文字，不能扩大到所有打包资产。
- **锁版本发布者metadata**：四Harness的71条官方npm/PyPI/crates元数据，来自其固定lock；另核实主审计的8条Python依赖及koffi，均保全URL/SHA256。它是许可证初筛，不是wheel/tarball所有文件license已验证。
- **声明区间内样本**：Claude SDK、部分Codex/ZCode依赖只按声明范围查一个版本；不视为可复现lock。实现前必须锁实际版本并按发行资产重新审查。
- **INCONCLUSIVE**：未封闭的传递依赖、native动态库、外部CLI/容器镜像、缺notice资产，或metadata未给足许可。这些不是PASS。

依赖原始证据位于runtime的 `harness-secondary-dependency-licenses.json`、`primary-dependency-metadata/inventory.json` 和 `upstream/iface-{codex,zcode,claude}/dependency-metadata/manifest.json`。前三项目分册明确区分精确Git rev与宽版本样本，不能合并成“全部依赖已审完”。

| 本轮主审计直接依赖 | 固定来源 | metadata结果 | 证据与限制 |
|---|---|---|---|
| agent-client-protocol 0.12.1 | SDK uv.lock | 许可字段空，INCONCLUSIVE | PyPI该版本JSON已保全；需读实际发行LICENSE，不自行猜MIT/Apache |
| fastmcp 3.2.0 | SDK uv.lock | Apache-2.0 | 元数据声明 |
| filelock 3.20.3 | SDK uv.lock | Unlicense | 不能沿用其他版本旧印象 |
| httpx 0.28.1 | SDK uv.lock | BSD-3-Clause | 元数据声明 |
| litellm 1.105.1 | SDK uv.lock | MIT | 不代表整个Gateway企业/部署组件许可相同 |
| lmnr 0.7.60 | SDK uv.lock | Apache-2.0 | 观测出口和依赖闭包另审 |
| pydantic 2.13.5 | SDK uv.lock | MIT | pydantic-core native包另审 |
| tree-sitter 0.25.2 | SDK uv.lock | classifier为MIT，license字段空 | 仍需核对发行LICENSE/native包 |
| koffi 3.1.1 | DeepSeek Windows包精确依赖 | MIT | 只读官方版本JSON，不验证预编译FFI二进制内容 |
| Agensh mini-router的17个lock条目 | package-lock.json | MIT/Apache-2.0声明 | 含mysql2 3.24.5、ws 8.22.0、ACP SDK 0.20.0；只是该子包锁文件所列，不代表Docker总栈 |

## 推荐基础库与发行合同

Node 24.15.0的主代码与大量内置第三方组件在[该版本LICENSE](https://raw.githubusercontent.com/nodejs/node/v24.15.0/LICENSE)分别列明；不能只保留一行“Node MIT”。SQLite核心为[上游公开声明的public domain](https://sqlite.org/copyright.html)，不把构建脚本的其他许可自动套到运行库。Zstandard通过Node内置库使用，发行Node运行时仍需保留其完整第三方许可，不自行删除压缩库notice。

实际REUSE或FORK_MODIFY记录必须含：upstream repo、精确commit、导入文件与SHA256、SPDX/完整许可文本、版权/NOTICE、修改范围与日期、构建/打包依赖图、选择的双许可分支、同步owner、回滚版本及本项目兼容测试。MIT需保留许可/版权，Apache-2.0需遵守许可、修改标记及适用NOTICE等要求；是否要求同源码公开必须按真正采用文件的许可判断，不能由“开源”二字推导。

上游同步策略：不跟随浮动main自动升级；由人工创建升级候选、比较所用文件/依赖/许可差异，重新跑Nexus边界与协议测试，再发布独立模块版本。许可证或notice不清的候选保持隔离，不因为模块可关闭就允许不清来源进入发行物。

M0输出为研究与独立设计；未选择项目最终对外许可证，也未把用户私有资料声明成开放许可。Workflow Kit的授权确认、选定文件的传递依赖闭包和实际发行物SBOM属于引入/发行前的明确准入项，不伪装为已完成。
