# 复现

Node24.15.0 / TypeScript5.9.3 / @types/node24.10.1，使用继承lockfile。无需新增npm依赖。可信工程Runner不向Agent开放任意Shell。

```powershell
$env:AGENTNEXUS_TYPE_TOOLS = 'I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\type-tools'
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
$env:AGENTNEXUS_TEST_GIT_PATH = (Get-Command git).Source
node deliverables/AgentNexus-M1.8/source/tools/agentnexus/verify-m18.mjs --output-root .workflow-kit/runtime/AgentNexus-M1.8/reproduce --suite all
node deliverables/AgentNexus-M1.8/source/tools/agentnexus/soak-m18.ts --output-root .workflow-kit/runtime/AgentNexus-M1.8/soak-reproduce --duration-ms 86400000
```

后者需要真实24小时，当前交付未执行该长测。短测不能冒充24小时。Runner复制不可变源码，有界输出、每次独立目录、语法/strict TypeScript/原始TAP/JSON与源码hash。宿主Windows原语资格问题可能使继承测试FAIL；不得改权限或断言来隐藏。

原始数据包跳过文件系统链接/重解析点本体，文字元数据与原运行目录保留。ZIP为包装副本，不把其中inode当原StorageOwner文件身份。源ZIP与所有交付文件用SHA256SUMS核验；清单不包含自身。真实Key不要通过环境变量、命令行、聊天、源码或此工程Runner提供。
