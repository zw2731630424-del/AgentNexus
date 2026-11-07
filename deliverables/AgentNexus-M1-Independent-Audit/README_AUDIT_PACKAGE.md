# AgentNexus M1 独立技术审查包

本包收集当前实际实现和原始证据，保留工作区相对目录。全部原始文件按字节复制，没有编辑源码、测试、配置、规则或历史交付，没有重跑产品测试，没有开展 M1.1 开发。`package.json` 既有版本 `0.4.0-m1.1` 原样保留。

## 内容和定位

- `src/`、`tests/`、`tools/`、`config/`、`package.json`：完整当前运行候选，含 TypeScript、Python/PowerShell 检查器、类型、内嵌 SQL Schema、管理接口、测试辅助进程和自动测试入口。基于全目录枚举收集，未按预先指定的 24 文件白名单裁剪。
- `.workflow-kit/tasks/AgentNexus-v0.4-M0/`：原始 M0 报告、verification、delivery_manifest、108/22 目录、内部协议、5 ADR、源码矩阵、许可证、安全分析和 Workflow Kit 映射。
- `.workflow-kit/tasks/AgentNexus-v0.4-M0.1/`：原始 M0.1/M1 报告、142/34 目录、ADR006–009、协议、计划、来源、验证、交付及源码快照清单。
- `.workflow-kit/runtime/AgentNexus-v0.4-M1/`：原始最终 TAP/JSON、demo、审查前后证据、失败/跳过日志、模块日志、先前完整运行、保留的源码版本、辅助审查源码及合成测试产生的数据库/对象/段。
- `.workflow-kit/runtime/AgentNexus-v0.4-M0/`、`...-M0.1/`：原始研究、许可证及来源指纹、保全基线、准入、设计冻结、探针及审计缓存。研究中的第三方源码和测试不是 AgentNexus 产品依赖，不要执行缓存中的项目或安装脚本。
- `ai-workflow-kit-v4/`、`inputs/`：原始套件及任务输入，仅用于核对历史研究及权利链，不代表已获得产品复制/分发授权。
- 根目录新增加的 JSON/本说明、`audit_tools/`：此次打包的索引、清单和独立验证工具；不替代任何原始证据。

`audit_package_manifest.json` 逐完整相对路径记录字节数、SHA256、类别和原始/当前/测试标记。`source_snapshot_manifest.json` 绑定全部当前候选与最终真实运行；附加工程脚本和历史源码另外列出。源码枚举后的实际当前候选恰为 24 文件，此外仍收集全部可用工程、测试及审查材料；这不是只交付 24 文件。

Schema/Migration 的实际位置：记录域表及索引位于 `src/agentnexus/storage.ts`，控制/Feature/Policy/Gateway 的 SQL 在对应模块；类型及验证在 `types.ts` 等模块中。不存在独立 Migration 目录或配置 Schema 文件，不虚构交付。

## 运行环境和复跑方法

原始环境为 Windows 11 / Node 24.15.0（SQLite 3.51.3、Zstd 1.5.7）、Python 3.12.10、PowerShell 7.6.9。无直接或传递 npm 包依赖，无 npm install 或构建步骤，无锁文件、tsconfig 或已通过的 tsc 检查。二进制及完整再分发许可证闭包未打包，详见 `dependency_inventory.json` 和原始许可证报告。

先验证交付 ZIP，再为复跑另建一个目录：只从已验证的树复制 `src/`、`tests/`、`tools/`、`config/`、`package.json`。必须在这个独立副本中运行，因为原测试会向固定相对 runtime 路径写入新结果；不要在保存原始历史证据的解压目录执行测试或 `final_verify.py`，不要覆盖原始证据。

在副本根目录执行（PowerShell 示例；路径仅为显式本地工具配置，不是凭据）：

```powershell
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
Remove-Item Env:NODE_PATH -ErrorAction SilentlyContinue
node tools/agentnexus/run-tests.mjs > audit-rerun.tap 2>&1
node src/agentnexus/cli.ts demo > audit-rerun-demo.json 2> audit-rerun-demo.stderr.txt
```

测试入口动态枚举 5 个 `.test.ts`，包括辅助 `owned-storage-child.mjs`。也可通过 `node --test --test-concurrency=1 --test-reporter=tap tests/agentnexus/<模块>.test.ts` 分别检查 `control`、`gateway`、`storage`、`diagnostics`、`integrity`。测试目录本身创建新的合成输入、SQLite/Artifact 和故障情景，不访问科研工作区或真实 Provider。不同 OS 权限/解释器可用性会改变跳过数量，不能预先承诺同样结果。

`control`、`gateway` 中有合成注册工具、模块/PDP 回调和受控时钟，索引以 `uses_fake_backend=true` 保守标记这些测试替身；实际 SQLite/文件/Node 代码仍执行。Python spawn spy 转发真实进程。没有真实或 Fake 模型 Provider 联调；合成数据与本地检查器 PASS 不等于模型或 OS 安全 PASS。

## 原始验证结果及限制

最终原始 `all-tests.tap` 与 `test-results.json`、`final-verification.json` 一致：135 项，131 PASS，0 FAIL，4 NOT_RUN/SKIP。4 项为真实文件 symlink、目录 symlink、junction、hardlink 情景，权限 EPERM，没有把模拟结果冒充 OS 测试。早期失败、CHANGES_REQUIRED 审查、复审、治理超时以及空的 storage v2 预留文件均保留，不将这些记录改写为最终 PASS。

`test_evidence_index.json` 给每次测试唯一的打包索引 ID，包含源码/测试/原始日志行引用、结果、跳过原因、合成输入和替身标记。ID 是此次索引赋予，不是伪称历史就有。最终日志没有逐测试绝对起止时间，也没有精确测试进程起止；相应字段为 NOT_AVAILABLE，仅保留已记录的运行标记和 duration。部分早期中间版本仅有 hash、没有保留源码字节，部分 inline 审查程序未存为独立文件，初次 Gateway 失败的原始工具 transcript 不在本机文件中；见 `missing_files.json`，不重建这些证据。

现有功能为可信本地内核：Feature ON/OFF/INHERIT、策略三模式和独立保护、Gateway、Context/Audit/Artifact、JSON/Python AST/PowerShell AST 诊断。完整安全部署 BLOCKED：可信 OS 管理身份/任意执行沙箱、五 Agent 和全部工作流、真实模型/Key 池/费用、全部审计生产者、加密 Vault、完整 LSP/多语言检查、硬断电和长期 soak 未完成或 NOT_RUN。目录 142 Feature/34 Policy 是设计规格，不是全部已实现模块。详见原始 M1_report.md 和 M1_test_matrix.json。

敏感信息检查只处理候选打包材料；排除所有 `.env*`、凭据形文件、密钥/证书容器及命中强凭据格式的研究文件，不读取本机密钥库、环境变量值或私人凭据。原始下载源码 ZIP 中存在未审计/不完整或重复的整包内容，未直接嵌套交付；保留它们的 SHA256、原始获取记录及经筛选的已缓存源码。排除清单逐完整路径记录，未删改原件。合成数据库/压缩流包含故障和截断样本，保留作为原始测试数据，不作为健康生产数据库打开。筛查方法和适用范围见 `sensitive_information_exclusion_report.json`。

## 指纹验证

在原始工作区之外，将 ZIP 及附带 SHA256、manifest、完整性验证报告放在同一目录。首先：

```powershell
Get-FileHash -Algorithm SHA256 .\AgentNexus_M1_Independent_Audit_Package.zip
Get-Content .\AgentNexus_M1_Independent_Audit_Package.zip.sha256
```

使用包内 `audit_tools/verify_audit_package.py`（Python 标准库，不导入产品）再作独立解压和双向校验，预期 ZIP SHA256 从外部 sidecar 读取后填入：

```powershell
python -I -B audit_tools/verify_audit_package.py --zip <ZIP绝对路径> --expected-zip-sha256 <SHA256> --manifest-file <外部audit_package_manifest.json> --extract-parent <新的临时目录> --report <新的验证报告.json>
```

验证器拒绝逃逸、重复、大小写/Unicode 冲突、文件与目录冲突、加密/链接条目；流式解压后再次逐文件计算 SHA256，双向比较文件集合，并检查当前源码和测试引用。也可完全独立编写标准 ZIP/SHA256 验证工具，清单不依赖 AgentNexus 的完整性模块。

只排除根目录精确路径 `audit_package_manifest.json` 的自哈希，避免自引用；其字节由 ZIP SHA256、外部同字节 manifest 的 SHA256 sidecar 和外部验证报告绑定。所有嵌套同名文件均为普通载荷，不能按 basename 排除。打包后的完整性验证报告放在 ZIP 外以避免自引用/先验证再改包；包内 `prepackage_integrity_report.json` 是打包前检查。所有外部报告和打包 manifest 均有 SHA256 sidecar。
