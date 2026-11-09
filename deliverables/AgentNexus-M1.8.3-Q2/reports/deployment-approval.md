# Q2 部署审批准备：NO-GO

**本文件仅提交精确审阅范围，不申请立即执行。本候选不可部署启用完整 Q2。** 没有账户创建、服务注册、安装、ACL/ML、防火墙、AppContainer、驱动、Ubuntu 或高权限部署动作；真实 Key/Provider 请求继续 BLOCKED。

## 当前必须先补齐的条件

1. Daily 生产 native Runtime 创建/保护/认证器及 Medium 传输仍未实现。不能靠签配置、放宽原pipe或批准本包安装来补齐。
2. Helper 进程/线程/token 与加载环境的同SID读取、注入、句柄、dump保护尚未完整实现并验证。High IL/UAC不等于内存隔离。
3. 最终外部签发证书DER pin、有效CMS计划、完整受保护Node/Electron运行时载荷与加载依赖闭包尚未取得。
4. 没有实际独立服务身份或第二获准攻击身份；70项OS测试全部NOT_RUN。不得复用宿主管理沙箱账户当攻击账户。

现有源码、合成结果与安装候选Hash只是审阅材料。待上述代码缺口关闭、重做最终Hash与独立审查后，才可单独提交可执行的资格测试部署范围。

## 未来审阅范围上限

|对象|精确拟议范围；本轮全部未执行|
|---|---|
|唯一服务|仍仅 AgentNexusCredential、own-process、Virtual Service Account `NT SERVICE\AgentNexusCredential`；不增加常驻Broker服务或每Agent账户|
|固定程序根|`C:\Program Files\AgentNexus`；service/client/node/可信helper/有限launcher/完整app与最终manifest；新增两个固定exe，不接收外部路径|
|服务镜像|带引号固定 `C:\Program Files\AgentNexus\AgentNexusCredential.exe`，无任意参数；初期资格验证仅手动受限计划|
|新增helper|固定 `trusted-credential-helper.exe`，用户每次确认凭证管理动作才由launcher请求UAC；禁止整个Electron提权|
|新增launcher|固定 `credential-launcher.exe`，保持Medium；仅有限无秘密意图，runas目标固定，退出即结束|
|完整性绑定|config和外部CMS同时绑定service/client/node/engine/app-manifest/helper/launcher完整SHA256；Q2拟议policy_epoch=2，不复用旧签名计划|
|安装ACL|管理员/SYSTEM/TrustedInstaller维护程序和配置；服务只读程序；受保护数据只允许原信任根/服务SID访问。遇已存在或reparse根先停，不接管未知对象|
|数据根|原 `C:\ProgramData\AgentNexusCredential`，qualification/temp/engine用途不变；不初始化/覆盖旧正式预算|
|普通UI数据|用户 AppData\AgentNexus，无真实凭证；旧受保护profile不搬动、不导入秘密|
|High pipe|原名/原DACL/原High ML/remote reject/first-instance全保留；协议收紧为helper管理白名单|
|Daily pipe|**本包不创建、不批准DACL/ML，不提供生产名称或启用开关**；后续方案具体化后单独审阅|
|资格材料|现模板仍BLOCKED、开关false、批准ref空；新Helper专项纳入原生required tests，不能只用原11项签全新Helper已合格|
|Token|沿用100m总授权，scope变更不可清零；没有新额度申请或预算重建|
|回滚|先撤销计划/停止获准实例、确认子进程退出；保留Vault/账本/审计；任何移除安装、修改ACL或删除另按精确批准|

未提议修改防火墙、Ubuntu、驱动或注册AppContainer。后续若最终技术方案需要额外系统权限、账户或服务，必须先明确新增范围，不能潜入本次清单。

本包的 [安装候选清单](../approval/installation-manifest.json)、[部署计划](../deployment-plan.json) 只能供审阅。缺完整运行时载荷、签发者或真实证据时不可以执行。审批系统部署、导入真实 Key、发送精确 Provider 请求是三个不同边界，当前后三者均未批准。
