# 重现

Node24.15.0、TypeScript5.9.3、@types/node24.10.1，沿用现有受信工具目录，无新依赖。候选source为独立交付，根产品未替换。只运行合成工程测试，绝不填Key环境变量。

```powershell
$env:AGENTNEXUS_TYPE_TOOLS='I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\type-tools'
$env:AGENTNEXUS_TEST_PYTHON_PATH=(Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH=(Get-Command pwsh).Source
$env:AGENTNEXUS_TEST_GIT_PATH=(Get-Command git).Source
node deliverables/AgentNexus-M1.8.2/source/tools/agentnexus/verify-m182.mjs --output-root .workflow-kit/runtime/AgentNexus-M1.8.2/reproduce --suite all
```

suite m182只跑14项新增，model跑模型相关。Runner每次独立目录、wx写原始证据、固定工具版本、最小环境与有界stdout/time；所有FAIL和SKIP保留。根tools/agentnexus/m182-probes.mjs可执行filesystem/native-paths/vault/reader-denial：只使用新建合成材料，vault是预期ISOLATION_FAIL反例，不是接入入口。根m182-evidence.mjs只生成无许可草案。build-tools为根工具归档副本，按原仓库路径运行。

治理普通路径可能因历史>260字符路径失败，必须用同一个未修改工具与Windows extended-length根，不忽略历史目录：

```powershell
python ai-workflow-kit-v4/tools/govern.py check --target '\\?\I:\AI_AgentNexus'
```

真实入口仍未启用。不得把审查callback、synthetic fixture、simulated资格或一个新DB当LIVE授权。
