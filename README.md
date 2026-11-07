# AgentNexus

AgentNexus v0.4 的原生 Harness 研究与受限本地内核，当前版本 `0.4.0-m1.3`。

M1.3 增加 Runtime Identity/Trusted IPC 协议状态机、审计 SDK、资源隔离恢复和 Windows 原语探针。完整 OS 部署和独立执行 Broker 仍 **BLOCKED**；PROCESS/EXTERNAL_EFFECT 不开放。平台真实证据、独立审查与系统部署授权清单见 [M1.3 交付](deliverables/AgentNexus-M1.3/README.md)。

当前实现包含 Feature Registry、Policy 三模式、Tool Gateway、Context Archive、Audit Trail、Artifact Store，以及 JSON / Python AST / PowerShell AST 开发诊断。运行边界为**可信本地库**，完整安全部署仍 **BLOCKED**：OS 管理身份与任意执行沙箱、真实 Provider、Key 池、费用、完整工作流/五 Agent、Vault、全部审计生产者和长期运行验收尚未完成。

M1.2 增加严格策略合同、工具执行能力声明、不可被应用模式降级的副作用审批、精确资源绑定与 Operation Reconciliation。未知结果不自动重试；未确认退出或输出 producer UNKNOWN 时保留 Writer Claim。完整设计、修复账本、源码与真实测试证据见 [M1.2 交付](deliverables/AgentNexus-M1.2/README.md)。

## 阅读入口

- [M0 研究](.workflow-kit/tasks/AgentNexus-v0.4-M0/README.md)
- [M0.1 / M1 设计与实现](.workflow-kit/tasks/AgentNexus-v0.4-M0.1/README.md)
- [M1 实现边界](.workflow-kit/tasks/AgentNexus-v0.4-M0.1/reports/M1_report.md)
- [源码](src/agentnexus/) · [测试](tests/agentnexus/)
- [普通 Markdown 独立审查材料](deliverables/AgentNexus_M1_Text_Review/README.md)
- [公开发布范围与排除说明](.workflow-kit/tasks/AgentNexus-M1-Publication/README.md)

M1.1 基线、M0/M0.1/M1 原始报告和审查证据保持原字节；新工作记录在 `.workflow-kit/tasks/AgentNexus-M1.2/`。

## 本地运行

原始环境：Node **24.15.0**（内置 SQLite 3.51.3 / Zstd 1.5.7）、Python **3.12.10**、PowerShell **7.6.9**。无直接或传递 npm 包依赖，无需 npm install；没有锁文件或 tsconfig，静态 tsc 检查 NOT_RUN。Python 和 PowerShell 为可选诊断适配器所需的外部环境，不随源码分发。

推荐用 M1.2 验证入口：自动复制完整运行候选至独立目录，设置独立测试数据根，保留每次 TAP/JSON、源码清单及失败结果，不覆盖历史记录：

```powershell
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
node tools/agentnexus/verify-m12.mjs
node src/agentnexus/cli.ts demo
```

M1.1 历史最终测试为 **135 项：131 PASS、4 OS 链接权限 NOT_RUN/SKIP、0 FAIL**；M1.2 已在独立副本重新执行原回归并新增安全测试，最终计数见交付中的 test-results.json。测试使用合成输入、实际本地 Node/SQLite/Zstd/解析器及受控进程；部分注册工具/PDP回调和时钟/spy是测试替身，不是真实模型验证。142 Feature / 34 Policy 为完整设计目录，不代表全部功能已经实现。

## 资料与许可证边界

仓库发布自有源码、测试、设计、原始运行文本证据和可公开的审查文档。原始大型 ZIP、历史数据库/压缩对象、上游源码缓存、AI Workflow Kit 原件及安装源树继续保留在本地，未上传。有关这些本地资料的 SHA256 / 原始清单仍保留作历史指纹；不表示它们可从这个仓库下载。

工作流套件及运行时二进制的分发授权/完整许可证闭包未解决，不能把参考研究材料当作已获授权的产品依赖。原始许可证审查保持原样。项目尚未选定新的开源许可证，本次不擅自添加第三方授权声明。

`.gitattributes` 禁止 Git 对字节做换行、filter 或 ident 转换，以保留历史 SHA256。没有安装 Git hooks，也没有配置自动部署或 CI。
