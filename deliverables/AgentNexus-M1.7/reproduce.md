# 重现与证据读取

环境：Windows，本次实际 Node24.15.0、TypeScript5.9.3、@types/node24.10.1；PowerShell/Python/Git使用原机器的固定路径。代码入口不读取现有API Key，不安装依赖，不连接网络Provider。工具完整hash在原checker报告；不重新分发第三方toolchain。

在原工作区 PowerShell 设置以下显式工具路径，然后执行固定验证入口（输出应在源码目录之外，保持短路径）：

```powershell
$env:AGENTNEXUS_TYPE_TOOLS='I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\type-tools'
$env:AGENTNEXUS_TEST_PYTHON_PATH=(Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH='I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.6.1\toolchain\powershell-host\pwsh.exe'
$env:AGENTNEXUS_TEST_GIT_PATH=(Get-Command git).Source
node deliverables/AgentNexus-M1.7/source/tools/agentnexus/verify-m17.mjs --output-root I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.7\repro --suite all
```

`--suite m17`只运行新增测试；`--suite all`包括所有继承用例，Native Pilot本身是实际运行的集成测试。Runner冻结源码、使用最小环境、输出真实TAP/JSON和退出证据，不隐藏非零码。原生hardlink/junction夹具在限制沙箱中可能EPERM，需要运行环境具有本次获准的普通本地文件操作能力；不改OS账户/ACL来规避。

独立Pilot入口：`node deliverables/AgentNexus-M1.7/source/tools/agentnexus/pilot-m17.ts --output-root <短的独立输出路径> --type-tools-root <已存在工具根> --git-path <固定git.exe>`。有界Resident：`node deliverables/AgentNexus-M1.7/source/tools/agentnexus/soak-m17.ts --output-root <独立输出路径> --duration-ms 7200000`。模型仍是SIMULATED；固定Runner拒绝非allowlist代码，不是任意软件运行器。

Pilot导出需在同样Node环境、该项目目录下，将AGENTNEXUS_PILOT_SCRATCH设为新的独立空目录，再运行 `node --test tests/model.test.ts tests/analytics.test.ts tests/cli.test.ts`；CLI用法见该目录README。该手动重现是用户对导出副本的运行，不产生原生Storage Owner版本，也不能替代已交付的原始执行证据。

ZIP内 PACKAGING-MANIFEST.json 保存每文件原字节SHA。外部同名manifest还绑定ZIP SHA/大小。SHA256SUMS不包含自身，delivery-manifest对清单另行hash并记录排除项，避免自引用。解压副本的路径、inode和原Owner身份不等价；原始报告中的绝对路径有意不重写。读取原SQLite用只读mode，.zst可由Node内建zstd解压后按Artifact的原始/存储hash校验。
