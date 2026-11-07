# ADR 007 成熟诊断器与独立授权

状态：授权范围内的工程决策。新增Development Intelligence是可关闭的原生诊断模块。

采用成熟AST/Compiler/LSP，首批用本机Python/PowerShell/JSON/SQLite语法能力，避免重写所有语言parser。syntax、args、environment、safety、authorization分开输出，关闭明确VALIDATION_BYPASSED。诊断PASS不能签发执行许可，LSP或插件不能进入可信Broker；运行可加载项目插件的linter需独立沙箱和信任准入。未安装工具不以猜测结果填PASS。

M1只保留固定可信解析器脚本与有界stdin，源文本不eval，不据ShellCheck或AST无错误推断安全；自由Shell在平台组合边界未通过前BLOCKED。具体版本/许可证/证据由[诊断设计](../development_intelligence_design.md)列明。
