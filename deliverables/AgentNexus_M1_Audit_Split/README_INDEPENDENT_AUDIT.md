# AgentNexus M1 独立审查分包

本交付只拆分已有审计包。原始 ZIP、源码、测试、配置、规则、M0/M0.1 历史交付及测试结果均未修改，没有执行产品测试或 M1.1 开发。所有原始载荷保留 ZIP 内完整相对路径和原始字节。

## 用途与顺序

1. **01_Core_Source**：全部当前原生库、检查器、类型/接口、Feature/Policy/Gateway/Archive/Audit/Artifact/DIE/CLI，以及实际配置与启动脚本。全目录与最后实际测试候选核对，未按 24 文件白名单裁剪。
2. **02_Tests**：全部当前测试、辅助进程、审查探针、保留的历史测试源码和所有原始 M1 持久化合成样本。所有测试源码固定放在 Part1；大样本分配到其余 Part。数据库、对象、段是原始测试输入/输出证据，不是可删除的缓存。全部 Parts 合并才能恢复这些样本。
3. **03_Runtime_Evidence**：最终及早期原始 TAP/JSON、失败/跳过、整改前后审查、demo、执行环境、时间和版本绑定。样本本体位于 02；这不是删减或重写日志。135 项最终记录为 131 PASS、4 NOT_RUN/SKIP（真实 OS 链接权限 EPERM）、0 FAIL，本轮未重新执行。
4. **04_Architecture_and_Protocol**：全部 50 份 M0/M0.1/M1 历史交付，包括目录、协议、9 ADR、设计、矩阵、计划和许可证/安全/工作流分析。
5. **05_Dependencies_and_Build**：真实 package.json、配置/runner、实际依赖闭包和原始许可证据、工程验证工具。研究许可文本不是已引入的运行依赖。
6. **06_Original_References**：原始 M0/M0.1 清单和报告、源快照/旧版本、来源获取信息、Workflow Kit 原件和打包证据。部分设计文件按请求与 04 重复，原始字节相同，重复清单在总索引中。旧版源码与当前源码分开保存，不覆盖当前 src/。

| ZIP | 原始载荷文件数 | ZIP 大小 MB（十进制） |
|---|---:|---:|
| 01_Core_Source.zip | 18 | 0.091 |
| 02_Tests_Part1.zip | 188 | 43.771 |
| 02_Tests_Part2.zip | 1545 | 42.060 |
| 02_Tests_Part3.zip | 470 | 33.796 |
| 02_Tests_Part4.zip | 1 | 33.567 |
| 02_Tests_Part5.zip | 1 | 33.567 |
| 02_Tests_Part6.zip | 1 | 33.567 |
| 02_Tests_Part7.zip | 1 | 33.567 |
| 03_Runtime_Evidence.zip | 49 | 0.182 |
| 04_Architecture_and_Protocol.zip | 50 | 0.293 |
| 05_Dependencies_and_Build.zip | 59 | 0.225 |
| 06_Original_References.zip | 325 | 9.982 |

50 MB 是硬上限。原生代码和文档本来很小，未填入无关数据凑到 20 MB。Parts 都是完整、可单独打开的普通 ZIP，不是需要拼接的二进制分卷。

`package_inventory.json` 覆盖原始 ZIP 的每个文件，记录实际 SHA256、类型、角色、生成/历史/缓存/重复标记和逐路径排除原因。只排除了不被 M1 加载的 M0 上游研究源码缓存、M0 隔离临时副本和 M0 二进制探针残留；原始包继续保留。所有 M1 原始目录、45 个当前/附加工程源码候选、50 份历史交付均保留。合并要求是 inventory 里未排除的完整审查集合，不是原始 418MB 包中的非运行缓存；旧的 audit_package_manifest.json 仍按历史原件保留，不能把它当成缩减后目录的清单。

## 独立验证与恢复

每包根目录都有独立 `PACKAGE_MANIFEST.json`，记录原始载荷的完整路径和 SHA256。只有这个精确根路径不记录自哈希；其 SHA256 在总索引中，ZIP 的哈希在 SHA256SUMS 中。嵌套同名文件没有特殊豁免。

先校验整个交付目录的 SHA256SUMS，再按清单验证每包，最后合并。提供的工具仅用 Python 标准库，不导入或执行产品，也不需要原始 418MB ZIP：

```powershell
python -I -B verification/verify_split_packages.py --directory <分包目录绝对路径> --output-parent <新的临时目录绝对路径>
```

工具拒绝路径穿越、重复/大小写冲突、链接和未登记文件，逐包独立解压并复算 SHA256；同路径跨包重复必须是完全相同字节。各包的根 PACKAGE_MANIFEST 只保留在各自解压目录，不写进合并树，避免多包元数据相互覆盖。完整合并目录由输出报告的 `merged_directory` 给出，payload 文件集合须与 inventory 逐项双向相等。单包也可用标准 unzip/Expand-Archive 解压至自己的目录后按该包 manifest 校验；不要盲目把不同根 PACKAGE_MANIFEST 覆盖到同一文件。

`AgentNexus_M1_Audit_Package_Index.json` 列出全部 ZIP 大小、哈希、覆盖路径、重复关系和完整性范围。`verification/package_integrity.json`、`file_completeness.json`、`sensitive_data_scan.json` 是本次真实分包校验结果，不替代历史运行证据。

## 环境、依赖和测试

原始环境为 Windows 11、Node **24.15.0**（内置 SQLite 3.51.3、Zstd 1.5.7）、Python **3.12.10**、PowerShell **7.6.9**。实际 package.json 的 dependencies 和 devDependencies 均为空，传递 npm 依赖也为空；没有进行 npm install，因此 package-lock.json/其他锁文件不存在，明确 NOT_AVAILABLE。无需安装 npm 包，也不生成替代锁文件。没有独立 tsconfig、编译/Migration 目录；Node 原生擦除 TypeScript，SQL Schema 和验证代码在 src/agentnexus/storage.ts、control.ts、features.ts、policy.ts、gateway.ts、types.ts 等原件中。静态 tsc 检查 NOT_RUN。外部 Node/Python/PowerShell 安装按原始版本说明准备，二进制与完整再分发许可闭包未提供；不能靠不存在的锁文件复现这些外部二进制。

为了不覆盖历史证据，复跑时另建工作目录，只从已验证的合并目录复制 src/、tests/、tools/、config/、package.json。在副本根目录运行：

```powershell
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
Remove-Item Env:NODE_PATH -ErrorAction SilentlyContinue
node tools/agentnexus/run-tests.mjs > new-audit-run.tap 2>&1
node src/agentnexus/cli.ts demo > new-audit-demo.json 2> new-audit-demo.stderr.txt
```

运行测试会向固定相对 runtime 路径写新结果；不要在历史证据合并树运行，不要调用历史 final_verify.py 的交付更新入口。外部 OS 权限/解释器差异可能改变跳过数量，不能预先声明新测试通过。

已保存测试实际执行 Node/SQLite/Zstd/文件系统/受控进程及真实 JSON/Python AST/PowerShell AST 检查器，使用合成数据。控制和 Gateway 测试含注册的合成工具/模块/PDP 回调，部分包含受控时钟或转发 spawn spy；这些替身不等于真实模型后端。没有真实或 Fake 模型 Provider 联调记录，真实模型验证 NOT_RUN。原始 test_evidence_index.json 明确每项执行/替身/模拟标记。

## 已知限制与缺口

完整安全部署仍 BLOCKED：OS 管理身份/任意执行沙箱、真实 Provider/费用/Key 池、全部审计生产者、加密 Vault、完整工作流/五 Agent、多语言/LSP、硬断电和长期 soak 均未完成或 NOT_RUN。142 Feature/34 Policy 是完整设计目录，不是全部实现。

最终 TAP 未记录逐测试绝对起止时间；部分中间版本只有 hash 没有保留源码字节，部分内联审查程序/初次 Gateway 失败原始 transcript 未保存为文件，均沿用原始 missing_files.json 的 NOT_AVAILABLE，不补造。verification/missing_materials.json 另列本次锁文件/配置/Migration 的实际位置和缺失原因。

敏感检查仅针对拟交付文件和允许保留的嵌套 ZIP，不扫描本机 API Key、凭据库或环境变量值。所有 .env/凭据容器均禁止，原始包已排除的文件不会从工作区补回。合成数据库/压缩/损坏样本按原始来源保留；格式筛查不是对任意编码秘密的数学证明。原始许可证/Workflow Kit 权利限制保留，不把研究参考材料当成已许可的产品依赖。

审查结束前保留各包、总索引、SHA256SUMS 和验证报告。本次工作到打包验证为止，没有开展 M1.1。
