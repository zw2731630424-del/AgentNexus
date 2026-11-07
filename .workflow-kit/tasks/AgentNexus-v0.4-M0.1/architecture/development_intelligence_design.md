# Development Intelligence — M0.1 设计 v0.2

状态：**DESIGN_ONLY**。本轮完成官方资料核对、本机工具只读发现与接口设计；没有实现产品诊断器、安装依赖、加载项目插件或执行待检查源码。M1 准入与真实测试结果由主报告登记。本设计对齐 [内部协议 v0.2](internal_protocols.md)、[ADR 007](adr/007-diagnostics-and-execution.md)、[ADR 008](adr/008-m1-admission.md)，不修改 M0 原件或项目规则。

## 决策与首批范围

Development Intelligence 是可独立关闭的原生诊断服务。优先封装成熟 Parser、Compiler、Linter 和 LSP，保留每个工具实际覆盖范围，不重写各语言完整语法。它读取不可变输入，产生诊断、结构化预览和证据；执行许可仍由 Tool Gateway / PEP / PDP 的独立路径产生。

M1 零 npm 依赖，以 Node 24.15.0 原生可擦除 TypeScript 为宿主；首批拟真实接入 **Python `ast.parse`、PowerShell `Language.Parser.ParseInput`、JSON `JSON.parse`**，加上 Git / Python 结构化 argv 的受限 Schema 与环境检查。外部解析器路径由可信 Host 显式提供；不搜索凭据、读取 Key、安装工具或调用用户 CLI 的 `--help`。本阶段不写 M1 代码。

SQL 首批保持 **NOT_RUN**。SQLite `prepare` 不是适用于任意 SQL 的纯解析替代：官方说明某些 PRAGMA 在 prepare 阶段生效，EXPLAIN 也不消除这种行为；同时空内存 schema 无法证明项目 SQL 有效。[SQLite PRAGMA 官方说明](https://sqlite.org/pragma.html)。自由 shell、任意文件写入、Git 发布、外部 Harness 与科研入口仍 **BLOCKED**，直到对应 OS 身份、文件、网络、进程树和绕过测试通过。解析成功不能解除这个封锁。

## 五个独立维度与状态

| 维度 | 能回答的问题 | 不能推出的结论 |
|---|---|---|
| `syntax` | 指定语言 / 方言 / 版本下，已选择的解析或编译阶段是否发现错误 | 命令存在、参数有效、业务正确、安全或已获授权 |
| `args` | 结构化 executable + argv 是否满足已注册命令合同、互斥项、类型及资源参数约束 | shell 展开后的真实值、外部程序运行成功、可以执行 |
| `environment` | 可信 Host 提供的解析器 / 执行器版本、必要资源及能力证据是否满足本次请求 | 可凭 PATH 名称信任任意二进制，或可替用户安装依赖 |
| `safety` | 静态规则识别出的副作用、动态执行入口与未知项 | 无风险证明、OS 隔离或授权；未发现风险不自动 PASS |
| `authorization` | 仅承接 Gateway / PEP 的独立权威判定 | 诊断器、LLM、LSP、项目文件或用户源码自授权限 |

诊断服务输出的 `authorization` 固定为 `NOT_RUN / OWNER_TOOL_GATEWAY`；Gateway 以独立授权结果关联同一 intent hash，不让诊断器签 permit。源文件诊断中不适用的 argv 检查为 `NOT_RUN / NOT_APPLICABLE`，必须保留适用性说明。

六态为 `PASS | FAIL | NOT_RUN | INCONCLUSIVE | BLOCKED | BYPASSED`，与 v0.2 共享合同一致：

- `PASS`：本次实际运行、版本匹配、未截断的明确检查在其声明 coverage 内通过；例如 `coverage=python_ast_parse_only`。Python AST 解析成功仍可能在编译阶段报错，不能称“完整 Python 编译通过”。[Python 3.12.10 固定版 AST 文档](https://github.com/python/cpython/blob/v3.12.10/Doc/library/ast.rst)。
- `FAIL`：已运行且发现明确错误；输入或合同本身不合法也明确返回原因，不吞异常为无诊断。
- `NOT_RUN`：尚未接入、不适用或本次未请求；例如 M1 的 SQL、C#、JS/TS、YAML、Dockerfile、LSP。
- `BLOCKED`：请求所需的可信解析器缺失 / 不匹配、执行器能力不足或准入拒绝，检查无法开始。未安装不报语法错误，也不报 PASS。
- `INCONCLUSIVE`：动态参数无法确定、超时、取消、解析器崩溃、诊断截断、版本过期或证据不足；分别给 `DYNAMIC_ARGUMENTS`、`TIME_LIMIT`、`CANCELLED`、`CHECKER_FAILED`、`OUTPUT_LIMIT`、`STALE_VERSION` 等 reason。
- `BYPASSED`：Feature OFF 导致跳过，reason 必须为 `VALIDATION_BYPASSED`；保留 Feature revision / epoch / 范围。关闭与未运行均不得转换为 PASS。

顶层 `status` 表示本次请求中明确适用、已声明覆盖的检查结果，不表示 `readyToExecute`。若必须汇总，保留所有维度原值，并按 `BLOCKED → FAIL → INCONCLUSIVE → NOT_RUN → BYPASSED → PASS` 合成适用检查；不适用的维度不参与汇总。授权另走 Gateway。任何汇总都不能删除失败、绕过或未知项。

## 八项能力及命令边界

| 能力 / Feature | 输入与输出 | 关闭后的真实路径 |
|---|---|---|
| Command Parser / `devint.command-parser` | 已明确 shell 方言的源码，或无需 shell 的 executable + argv；输出有位置的语法结构 / 动态节点 | 不调用 parser，相关检查 BYPASSED；不猜测 shell 语法 |
| Syntax Validator / `devint.syntax-validator` | 成熟解析器的语法诊断与 coverage | syntax=BYPASSED / VALIDATION_BYPASSED |
| Linter / `devint.command-linter` | 可信配置的静态建议，严重度、规则 ID、可选改法 | 停止建议；仍可运行已启用语法检查 |
| Argument Validator / `devint.argument-validator` | 版本化命令合同、argv、静态资源引用 | args=BYPASSED；L0 Tool Schema / permit 合同继续生效 |
| Safety Preflight / `devint.safety-preflight` | 副作用类别、动态入口、未解析资源、网络 / 进程需求 | safety=BYPASSED；PEP、OS 与独立底层能力保持 |
| Environment Checker / `devint.environment-checker` | Host 指定工具指纹、版本、环境 profile、资源状态 | environment=BYPASSED；执行器仍需核验必要能力 |
| Command Preview / `devint.command-preview` | argv 原样边界、cwd 资源、输入引用、预计影响、未知项 | 不生成可选预览；审批服务仍须展示必要授权对象 |
| Code Diagnostics / `devint.code-diagnostics` | 文档快照 / 版本，按语言汇总 Parser / Compiler / LSP 诊断 | 取消自有请求、清理发布缓存，不留下后台进程 / watcher |

`devint.runtime` OFF 关闭全部自有检查。语言与命令族独立开关见 [Feature Catalog](feature_catalog.md) 的 `devint.code.*`、`devint.command.*`；设计默认 ON 不等于模块已安装或 effective 可用。关闭依赖采用已有依赖闭包协议，不偷偷启用备用解析器。

| 命令族 | 诊断策略 | M1 边界 |
|---|---|---|
| Bash | 非交互 `bash -n` 仅做语法；ShellCheck 另做静态建议。显式方言，清除 `BASH_ENV` / `ENV` / 导出函数等启动影响，禁止 profile，固定可信 executable | 未接入 NOT_RUN；当前 Bash 版本探测未取得有效证据。自由执行 BLOCKED |
| Zsh | 单独 `zsh -n` 适配，不能借 Bash / ShellCheck 结果替代。`-f` 仍不消除系统 `/etc/zshenv`，需可信镜像及隔离 | 未发现工具且未接入；请求启用时依赖 BLOCKED。自由执行 BLOCKED |
| PowerShell | `Parser.ParseInput` 返回 AST / tokens / ParseError；动态调用、子表达式、splatting 不求值 | 首批语法适配；`Get-Command` 的结果不替代参数授权。自由执行 BLOCKED |
| Git | executable + argv 的版本化受限合同；拒绝未注册 alias、`-c` 配置注入、未知子命令 / 外部扩展。`--`、revision 与 pathspec 分开建模 | 首批 Schema / 环境检查；不运行 Git 来“测试”提交、合并、推送或任意 dry-run |
| Python CLI | 结构化 argv；区分脚本、`-m`、`-c`、解释器选项与脚本参数。模块 / 脚本只作输入，禁止 import 以发现参数 | 首批受限合同；`-c` 的源码可诊断但不执行，不读取项目 argparse 逻辑 |
| Docker CLI | 固定版本子命令 Schema；daemon、context、网络、挂载、Dockerfile frontend 单列需求 | 未接入 NOT_RUN。`docker build --check` 仍有 builder / frontend 依赖，不能视作纯离线 parser |
| custom CLI | 可信管理入口登记版本化 Schema、executable 身份和风险；用户程序的 `--help` 可能执行代码，不自动调用 | 无合同则 NOT_RUN / UNKNOWN_COMMAND_CONTRACT；执行能力保持独立拒绝 |

Shell AST 不会决定外部 CLI 的参数语义。变量、命令替换、glob、alias、`eval`、函数、动态路径与多级解释器嵌套保留未知节点，相关 args / safety 为 INCONCLUSIVE；不执行源码来消除未知。Bash `-n` 官方语义和非交互启动影响见 [Bash 5.3 手册](https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin)、[Bash Startup Files](https://www.gnu.org/software/bash/manual/bash.html#Bash-Startup-Files)；Zsh 启动例外见 [官方 Files](https://zsh.sourceforge.io/Doc/Release/Files.html)。

## 语言解析器、版本与许可证依据

本表的未安装样本用于固定研究证据，**不是 M1 依赖锁、最新版推荐或发行许可闭包**。原始证据和 SHA256 在 [diagnostic_sources.json](../research/diagnostic_sources.json) 与其 runtime 缓存索引；不复制第三方实现进入 AgentNexus。

| 语言 / 工具 | 首选适配与已核实依据 | 版本 / 许可范围与局限 |
|---|---|---|
| Python / AST | `ast.parse`；捕获 SyntaxError 并只输出有界位置 / 消息；不用 eval、exec、import 用户模块或执行 code object | 本机 3.12.10；[固定 AST 文档](https://github.com/python/cpython/blob/v3.12.10/Doc/library/ast.rst)、[PSF 等许可正文](https://github.com/python/cpython/blob/v3.12.10/LICENSE)。大 / 深输入仍可能使解析器崩溃，故需预算及进程边界 |
| Python / Ruff | 可选后续 lint；固定配置、`--isolated --no-cache --no-fix`，stdin 源码，禁止自动修复 / 外部配置扩展 | 研究样本 0.11.8；[固定配置 / CLI 文档](https://github.com/astral-sh/ruff/blob/0.11.8/docs/configuration.md)、[MIT 主许可及第三方条款](https://github.com/astral-sh/ruff/blob/0.11.8/LICENSE)。本机未发现，M1 不安装 |
| PowerShell | `System.Management.Automation.Language.Parser.ParseInput`；仅读 ParseError，不调用 AST 的执行 / 求值接口 | 本机 7.6.9，SMA 7.6.0.500；[SDK 7.6 API](https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.language.parser.parseinput?view=powershellsdk-7.6.0)、[v7.6.9 Parser 源文件](https://github.com/PowerShell/PowerShell/blob/v7.6.9/src/System.Management.Automation/engine/parser/Parser.cs)、[MIT](https://github.com/PowerShell/PowerShell/blob/v7.6.9/LICENSE.txt)。不把此许可套给 Windows PowerShell 5.1 |
| Bash / ShellCheck | `bash -n` + ShellCheck；ShellCheck 不是 Zsh parser，需显式指定其支持方言 | Bash 文档 Edition 5.3；文档自身 GFDL-1.3-or-later。ShellCheck 样本 0.11.0：[manpage](https://github.com/koalaman/shellcheck/blob/v0.11.0/shellcheck.1.md)、[Cabal 的 GPL-3 声明](https://github.com/koalaman/shellcheck/blob/v0.11.0/ShellCheck.cabal)、[GPLv3 全文](https://github.com/koalaman/shellcheck/blob/v0.11.0/LICENSE)。GPL 的具体文件 / 发行义务需引入前复核，不能由外部进程调用推导免除义务 |
| C# / Roslyn | `CSharpSyntaxTree.ParseText` + `GetDiagnostics`；语言版本明确。后续语义阶段使用受限引用 / Compilation，不运行 MSBuild、NuGet restore、分析器或 source generator | 本机 SDK 9.0.304 中已发现 Roslyn `4.14.0-3.25359.3+6dbcfd2f553ef1ef0ac48878ab17d18c1360735d`；[ParseText API](https://learn.microsoft.com/en-us/dotnet/api/microsoft.codeanalysis.csharp.csharpsyntaxtree.parsetext?view=roslyn-dotnet-4.14.0)、[对应 commit 源码](https://github.com/dotnet/roslyn/blob/6dbcfd2f553ef1ef0ac48878ab17d18c1360735d/src/Compilers/CSharp/Portable/Syntax/CSharpSyntaxTree.cs)、[MIT](https://github.com/dotnet/roslyn/blob/6dbcfd2f553ef1ef0ac48878ab17d18c1360735d/License.txt)。发现 DLL 不等于适配已验证，M1 NOT_RUN |
| JS / TS Compiler | 选择受版本约束的 Compiler / Language Service，区分 syntactic 与 semantic diagnostics；受限虚拟文件系统，不默认遍历项目或运行用户脚本 | 固定研究样本 TS 5.8.3：[诊断实现](https://github.com/microsoft/TypeScript/blob/v5.8.3/src/services/services.ts)、[Apache-2.0](https://github.com/microsoft/TypeScript/blob/v5.8.3/LICENSE.txt)。本轮官方 registry latest=7.0.2；[官方 Compiler API guide](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) 明确目前描述 6.0 及更早、7.1 将换 API。不能按旧示例承诺 7.x 兼容，M1 不安装 |
| JS / TS ESLint | 可选建议层；`lintText` 也会加载配置。JS 配置 / parser / plugin 都是代码，只允许可信固定配置和已准入插件，在隔离进程运行 | 研究样本 9.24.0：[实际 lintText / 配置加载代码](https://github.com/eslint/eslint/blob/v9.24.0/lib/eslint/eslint.js)、[MIT](https://github.com/eslint/eslint/blob/v9.24.0/LICENSE)、[官方配置说明](https://eslint.org/docs/latest/use/configure/configuration-files)。本机未发现，M1 NOT_RUN；不运行仓库 eslint.config.* |
| JSON | Node 固定运行时的 `JSON.parse`，不用 reviver / eval；仅 JSON，不把 JSONC / JSON5 当兼容语法 | Node 24.15.0；[ECMAScript JSON.parse](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.parse)、[Node 该版完整 LICENSE](https://github.com/nodejs/node/blob/v24.15.0/LICENSE)。语法 PASS 不等于 JSON Schema 通过；重复 key、超大数字等语义需求另列 validator |
| YAML | 后续成熟 YAML 1.2 parser，优先 CST / document 模式，禁止自定义 tag 构造器与任意对象实例化；限制 alias / document / node 数量 | [YAML 1.2.2 规范](https://yaml.org/spec/1.2.2/)；候选 `yaml` 2.7.1 的[官方发布 metadata](https://registry.npmjs.org/yaml/2.7.1) 声明 ISC，仅作初筛，未封闭发行物依赖与文件许可。M1 NOT_RUN |
| SQL | 后续 SQLGlot 等成熟方言 parser，必须指定 read dialect；不连接项目数据库，不执行 SQL | 研究样本 SQLGlot 26.16.3，[官方 metadata](https://pypi.org/pypi/sqlglot/26.16.3/json) 声明 MIT；[官方 API](https://sqlglot.com/sqlglot.html) 说明其解析较宽松，不能作为真实引擎接受性证明。M1 NOT_RUN，SQLite prepare 不冒充完整替代 |
| Dockerfile | 后续封装 BuildKit Dockerfile parser，禁止解析指令触发下载 frontend / build；建议检查与构建分开授权 | 固定样本 BuildKit 0.20.2：[parser.go](https://github.com/moby/buildkit/blob/v0.20.2/frontend/dockerfile/parser/parser.go)、[Apache-2.0](https://github.com/moby/buildkit/blob/v0.20.2/LICENSE)。[Docker checks 官方文档](https://docs.docker.com/build/checks/) 的 Buildx≥0.15 / Dockerfile 1.8 条件不是本机可用证据，M1 NOT_RUN |
| LSP | 作为可替换协议适配，进程不进 Broker 地址空间；不默认启用 workspace watcher、executeCommand、codeAction 应用或动态插件 | 固定研究 LSP 3.17；源快照 commit `440d8b03d784cf0bd3769b1abb33aacc24b586a6` 的[规格](https://github.com/microsoft/language-server-protocol/blob/440d8b03d784cf0bd3769b1abb33aacc24b586a6/_specifications/lsp/3.17/specification.md)、[CC-BY-4.0 规格许可](https://github.com/microsoft/language-server-protocol/blob/440d8b03d784cf0bd3769b1abb33aacc24b586a6/License.txt)。SDK / 各 language server 有各自许可，不能由规格许可替代；M1 NOT_RUN |

本机发现仅覆盖 PATH 和几个明确位置，不代表整机软件盘点：Python 3.12.10、PowerShell 7.6.9、Node 24.15.0、Git 2.54.0.windows.1、.NET SDK 1.1.14 / 9.0.304。Git Bash 路径存在，但本轮 `--version` 无有效版本输出，结束码 `-1073741502`，可用性 INCONCLUSIVE。Zsh、ShellCheck、Ruff、tsc、ESLint、Docker 未在 PATH 发现；选定全局 TS / ESLint 包路径也不存在。未安装依赖、未联系 Docker daemon、未调用项目构建或测试命令；此发现不等于产品验收。

## 共享 API 与结果绑定

建议由主代理统一维护 `types.ts`，实现方不另建竞争合同。以下为协议形状建议，最终以冻结的 v0.2 类型为准：

```ts
type DiagnosticRequest = {
  language: string;
  source: string;
  document_uri: string;
  version: number;
  dialect?: string;
};
// 认证身份、project/task、可信 parser 路径和 feature snapshot 由 Host 封套注入。
check(request: DiagnosticRequest, signal?: AbortSignal): Promise<ValidationResult>;

type ValidationResult = {
  request_id: string; uri: string; version: number; source_sha256: string;
  checker_id: string; checker_version: string;
  parserVersion: string; // 或统一使用 checker_version，避免两个独立权威值
  feature_epoch: number; config_revision: number;
  dimensions: { syntax: DimensionResult; args: DimensionResult;
    environment: DimensionResult; safety: DimensionResult;
    authorization: DimensionResult };
  status: Status; reason: string;
  diagnostics: Diagnostic[]; evidence_refs: Ref[];
  timing: { started_at: string; elapsed_ms: number };
};
```

每个 DimensionResult 保存 status / reason / coverage / applicability / evidence；Diagnostic 含稳定 code、原始 tool code、severity、来源 checker、零基范围、纯文本 message 和可选 related locations。诊断坐标统一为 UTF-16；Python AST 的 UTF-8 byte offset、PowerShell offset 与 LSP 协商编码需要显式转换，保留原始编码与坐标证据。错误缺失可靠范围时允许 `range=null`，不能伪造第 1 行定位。

缓存键至少为 `(project, workspace revision, document_uri, version, source_sha256, dialect, checker id/version, config revision, feature epoch)`；版本为 Host 管理的单调整数，重开文档增加 document generation。URI 只作不透明文档标识，不能据它自动读文件 / 网络；真实读资源需独立授权。命令检查再绑定规范化 executable / argv / cwd / environment profile / ToolDefinition revision 与最终 intent hash，任何参数改写必须重新检查及授权。

检查流程：验证有界请求 → 获取不可变文档与 Feature 快照 → 选择 Host 准入的检查器 → 环境预检 → 固定 argv 启动可信 checker、源文本走 stdin → 有界解析返回 → 校验输出 Schema / 坐标 → 再检查版本 / epoch fence → 追加审计与发布当前结果。source 绝不拼入 `-c`、`-Command` 或 shell 字符串。

## 无执行、反注入与资源边界

Python 以 Host 指定解释器运行可信脚本，至少 `-I -B`；仅用标准库 AST，不 import 目标项目。PowerShell 使用固定可信 `-NoProfile -NonInteractive -File <checker>`，stdin 是数据，只调用 Parser。Node JSON parser 不使用 reviver。项目根、用户源码目录与 PATH 不作为可信 checker 发现源；校验 executable / checker 文件指纹及版本，不将请求传入的 path 当授权。

源文本、注释、字符串、诊断消息与 LSP 响应全部不可信：不读取其中“忽略规则 / 切换模式 / 执行修复”的文字为控制指令；URI、suggested fix 和命令只显示为数据。Preview 由固定渲染器显示 argv 数组边界及资源身份，HTML / Markdown / ANSI / CRLF 做安全展示，不生成并执行一条拼接命令；不会通过一次 dry-run 隐式批准正式动作。

Linter、编译器和 LSP 的项目配置、分析器、source generator、插件、import 解析和 workspace scanning 都是额外能力。只解析不代表工具本身无漏洞；外部 checker 必须低权限 / 无凭据 / 默认无网络、最小文件视图。M1 的固定可信解析器限制是窄能力工程准入，不宣称已完成完整 OS 沙箱、硬内存限制或跨平台逃逸证明。需要项目插件或任意执行的能力继续 BLOCKED。

初始预算是待实现验证的设计值：source≤256KiB UTF-8；单协议 frame≤512KiB 且服从宿主更小上限；单文档≤200 条诊断、每条 message≤1KiB；stdout≤128KiB、stderr≤32KiB；普通检查 deadline 3 秒、后续 LSP 单请求 10 秒；单 Agent 最多 2 个检查、每个文档仅 1 个活动版本、全服务队列≤16 个 / 4MiB。JSON / AST 只返回诊断摘要，不序列化整个 AST；超限标 INCONCLUSIVE / OUTPUT_LIMIT，不截断后宣称 PASS。

外部进程目标 RSS 上限 256MiB、取消宽限 500ms；真正硬限制与进程树终止要以平台能力证据为准，当前为 NOT_RUN。AbortSignal 必须停止排队、关闭 stdin、取消活动工作并释放 reader / writer / timeout；超时后清理整个 checker 树。未确认退出不重新启动同一 writer，保持 BLOCKED / QUIESCING。Node worker thread 仅用于调度 / 故障隔离，不是恶意代码安全边界。缓存 / watcher / 自动重启均有容量、TTL 和重启次数上限，不无界累积。

## LSP 的 stale、取消与清理

固定 LSP 3.17 的[发布诊断](https://github.com/microsoft/language-server-protocol/blob/440d8b03d784cf0bd3769b1abb33aacc24b586a6/_specifications/lsp/3.17/language/publishDiagnostics.md)、[拉取诊断](https://github.com/microsoft/language-server-protocol/blob/440d8b03d784cf0bd3769b1abb33aacc24b586a6/_specifications/lsp/3.17/language/pullDiagnostics.md) 与[取消规范](https://github.com/microsoft/language-server-protocol/blob/440d8b03d784cf0bd3769b1abb33aacc24b586a6/_specifications/lsp/3.17/specification.md#cancelRequest) 是协议依据；以下是 Nexus 进一步收紧的实现合同：

1. `didOpen / didChange` 绑定 generation + uri + version + source hash；新版本到达即标旧结果 stale、取消旧请求，迟到响应只计观察事件，不覆盖当前结果。
2. push diagnostics 有 version 时必须与当前文档一致；无 version 无法证明对应快照，最多以非权威、非当前诊断展示，不转成当前 PASS。服务器推送新数组替换旧集合，空数组必须清除旧诊断。
3. pull 的 request ID 绑定发出时的文档版本；`resultId / previousResultId` 只表示服务端缓存身份，不能替代 source hash。`unchanged` 仅在相同上下文和已有有效结果下复用；ContentModified / ServerCancelled 有界重新请求。
4. `$/cancelRequest` 是取消请求，服务端仍可能返回；客户端永远做 late-result fence，不能把发送取消当进程已退出。服务端卡死时 deadline 后清理 / 隔离，连续崩溃触发熔断，不无限重启。
5. `didClose`、文档删除、语言切换、工作区切换、Feature OFF、checker 重启、配置 / epoch 变更均清空客户端当前发布和缓存引用，取消相关请求 / watcher / timer，释放文档。历史诊断仍保留在审计，不继续当当前证据。
6. 禁止 LSP `workspace/executeCommand`、自动应用 WorkspaceEdit / codeAction 或自启动任意服务器；发现新能力返回待准入状态，不隐式打开执行通道。

## 审计、关闭与恢复

每次请求记录操作身份、source / argv hash、checker 与版本、coverage、Feature revision / epoch、五维原值、取消 / 截断 / 缺依赖原因、耗时、证据 Ref 和最终版本 fence。源码原文通过 Context / Artifact 引用保存，不在普通诊断日志重复抄写；秘密入口遵循主协议，M1 无加密能力时拒绝敏感 payload，不扫描用户 Key。

`audit.diagnostic-logs` OFF 只关闭可选详细日志；检查结果、VALIDATION_BYPASSED、权限与启动前事实继续写核心 Audit Trail。写审计失败不能发执行许可。Runtime OFF 先阻止新派发、递增 epoch、取消自有工作、清理发布状态并证明无残留，再宣告 DISABLED；取消超时为 QUIESCING / FAILED。恢复由显式管理动作预检可信工具版本 / 配置，重新诊断当前快照，不补执行此前命令。

## M1 验收合同（本轮均 NOT_RUN）

| ID | 需要证明的实际行为 |
|---|---|
| DI-SYNTAX-POS / NEG | Python、PowerShell、JSON 正常 / 缺右括号、坏引号、非法 JSON；source hash、版本和 parserVersion 正确，未接入语言不是 PASS |
| DI-NOEXEC | 源码包含 import 写文件、throw、命令替换、子表达式、eval、网络 / 删除文本时只解析；无目标副作用。项目 profile / plugin / 配置不加载 |
| DI-ARGS | Git / Python 已注册 argv 合同、未知选项、互斥项、`--`、以连字符开头路径、alias / `-c` 注入、动态 shell 参数；不调用目标 CLI 求证 |
| DI-FIVE-DIM | syntax PASS + args FAIL / safety INCONCLUSIVE / authorization NOT_RUN 必须保留；任何组合都不自行获得 permit；自由 shell 仍 BLOCKED |
| DI-OFF | 父 / 子 Feature OFF 不启动进程；结果 BYPASSED + VALIDATION_BYPASSED；旧异步结果不能重新发布；恢复不自动执行 |
| DI-STALE / CANCEL | v1 慢、v2 快、同 URI 不同 hash、重复 / 迟到响应、取消后响应、文档关闭与 generation 更新；当前结果只属于 v2 |
| DI-BOUND | 超大 / 深源码、超量诊断、恶意 stdout、坏协议、timeout / crash / AbortSignal；拒绝 / 截断有真实状态，资源和队列可回收 |
| DI-COORD | 中文、emoji、组合字符、CRLF、非 UTF-8 输入；坐标转换与无可靠范围的处理正确，不错指源码 |
| DI-PREVIEW / AUDIT | 预览保留 argv 边界、转义注入内容；日志 OFF 仍审计；参数改写需新 hash；审计失败不准执行 |
| DI-LSP / CROSSPLATFORM | 后续真实 LSP 和 Windows / Ubuntu 分别验证 stale / 清理 / 停进程与能力边界，不能沿用另一平台 PASS；首批未接入时 NOT_RUN |

这些合同可成为 `P.DI_NOEXEC`、`P.DI_SYNTAX` 及相关 Feature 的测试证据，但本设计、版本发现和网页下载都不能代替运行验收或 OS 准入。
