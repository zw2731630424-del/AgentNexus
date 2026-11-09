# Q4 精确部署范围申请草案

**UNSIGNED / NO-GO / BLOCKED。当前不可批准执行。** 用户已明确没有获准外部签发者、证书及 DER SHA256 Pin，要求仅完成只读预检与材料。此文档固定未来请求的范围，不能替代最终签署字节和用户明确部署批准。

|绑定|当前值|
|---|---|
|Host|`DESKTOP-OSWALD`|
|MachineGuid 的 SHA256|`a013cd5e924eb5db1ba67eb28c65379f81b2d73f2cbd42fdb6645eb202681fe4`|
|原 Operator SID|`S-1-5-21-2532670394-1554971530-4095700938-1001`|
|预期 Service SID|`S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873`；真实激活 NOT_RUN|
|Epoch|3；Q3 native 合同固定 epoch=3，Q4 不擅自升级|
|草案期限 UTC|`2026-11-09T12:10:50.0000000Z` 至 `2026-11-16T12:10:50.0000000Z`；不构成批准有效期|
|当前安装清单 SHA256|`2021e60599b1c3996cd1393f4881621c1b8accd9c0ef4933ac6f779d38eabb5a`|
|完整源码 ZIP SHA256|`bf1319b198f8c8f4ab4e4bad1522de60802278a05db16ea6769cb3ed0419535a`|
|安装器 SHA256|`8985976a9be9758c7288cfb2a6b3482f41401bc5aa95a687b208fc932c797bcd`|
|资格草案 SHA256|`e055392965705f3da1fa4f2009e2af50270bc1dd74e9f707b201b6f4f3896210`|
|部署批准未签名文档 SHA256|`d485bfc5673305a1d3b059807fad6f4fa9d6f6456741f368b5ab86ae67d6cefb`|
|最终签署安装清单、批准 Hash|尚不存在；不能把以上基线 Hash 冒充最终签署值|

未来范围仅涉及 `AgentNexusCredential` own-process/demand 服务、`NT SERVICE\AgentNexusCredential` 虚拟身份、Session 0、`C:\Program Files\AgentNexus` 与 `C:\ProgramData\AgentNexusCredential`。服务无参数；唯一 native Runtime 是同 EXE `--daily-runtime`。普通 UI 用固定 Electron 和 app 参数；Daily client 固定 `--daily --stdio`。逐文件目标见 [当前基线安装清单](installation-manifest.json)，逐项系统影响见 [机读申请](deployment-request.json)。不创建自定义账户，不授予 SeDebugPrivilege，不授予交互/RDP登录权限，不修改父目录或其他项目。

先确定正式签发方案和公开证书 Pin；是否为各 PE/安装脚本添加 Authenticode 必须明确，不能因为存在签署清单而忽略本轮“缺签名即停止”的要求。若二进制签名改变内容，重新构建/测试/独立审阅，按最终字节重新生成 app-manifest、config、Helper/Launcher计划、资格计划和安装清单。`launcher-plan.json` 当前过期，修改它本身也会改变安装清单 Hash。两份分离 CMS、资格专用批准引用、同 Host/Operator/Service SID/Epoch/有限期限必须重新绑定。

签署前须验证 Launcher 的 UTC 精确 round-trip `o` 日期和19类测试名精确大小写，关闭安装前与运行时的合同差异。安装器的 `service_started=true` 不能替代就绪证明；未来精确批准须涵盖有限等待、实际 SCM/engine/Daily 验证，以及失败时停止唯一服务、确认子进程/pipe退出的范围。原 Q3 安装器未修改。

**目前不提供可直接执行的 Apply 命令。** 待最终签署材料冻结并复核后，再提交含最终 Hash、证书 Pin、批准引用和完整参数的精确申请；用户明确批准后才进入变更阶段。当前没有任何安装/启动/账户/ACL/提升权限部署许可。
