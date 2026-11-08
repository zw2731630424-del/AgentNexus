# 复现

Node24.15.0、TypeScript5.9.3、@types/node24.10.1；继承锁文件，没有新增依赖。只能由可信工程Runner运行，不给模型任意Shell。

```powershell
$env:AGENTNEXUS_TYPE_TOOLS = 'I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\type-tools'
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
$env:AGENTNEXUS_TEST_GIT_PATH = (Get-Command git).Source
node deliverables/AgentNexus-M1.8.1/source/tools/agentnexus/verify-m181.mjs --output-root .workflow-kit/runtime/AgentNexus-M1.8.1/reproduce --suite model
```

suite m181只跑新增项，all跑全部继承回归。每次独立目录、源码快照、TAP/JSON和SHA；不覆盖历史。当前沙箱部分Windows原语和存储链接测试会FAIL/SKIP，不能改断言隐去。工具路径环境变量只提供可执行文件路径，禁止以此传Key。这里不提供任何LIVE绕过或自动API入口。
