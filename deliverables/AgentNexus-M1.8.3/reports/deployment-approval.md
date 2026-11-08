# M1.8.3 部署审批准备

当前状态：**未批准部署，未安装服务，真实 Windows 资格 BLOCKED，真实 Key / LIVE 未启用**。

本轮授权只覆盖代码、synthetic 模拟和只读预检。这些工作不会建立系统账户、改系统 ACL/注册表/服务设置或向供应商出站。`build.ps1` 只在工作区 runtime 生成两个 exe 和构建报告；`preflight.ps1` 只读现状。本交付没有安装/启用脚本，也没有真实凭据或签名资格。

## 可审阅的下一阶段变更范围

以下是后续部署所需的具体系统变更，**本轮没有执行**；表中的每一类均需要用户批准后再安排实施。

| 项目 | 拟议变更 | 当前状态 |
|---|---|---|
| 安装文件 | 建立 `C:\Program Files\AgentNexus`，放固定 service/client/node、编译 app 和完整 SHA-256 manifest | 未批准，目录不存在 |
| 服务数据 | 建立 `C:\ProgramData\AgentNexusCredential`；Q_ONLY 固定 qualification/temp，正式资格固定 engine；qualification-evidence 由管理员保管 | 未批准，目录不存在 |
| 系统 ACL | 程序/配置/签名资格仅管理员/SYSTEM/TrustedInstaller 可写；engine/qualification/temp 仅受信管理员和服务 SID 可读写；拒绝普通用户读取敏感状态、reparse、宽 DACL | 未批准，未修改 |
| SCM | 建立独立服务 `AgentNexusCredential`、固定带引号无参镜像、虚拟账户 `NT SERVICE\AgentNexusCredential`、unrestricted service SID | 未批准，服务不存在 |
| 服务启动 | 首阶段仅按明确的受控资格计划手动运行；自启动、自动恢复和长期驻留策略需另行审阅 | 未批准，未启动 |
| operator 身份 | 由用户指定唯一 operator SID；高完整性已提升管理员入口，固定 pipe-client 镜像/hash | 未配置，不代猜用户选择 |
| 外部签发者 | 单独批准资格签发证书的 DER SHA-256 pin、保管方式和吊销/更新流程 | 未批准，无 pin/签名 |
| 资格测试签名计划 | 外部 CMS 签名 status=QUALIFICATION_ONLY，绑定当前主机/SID/二进制/app hash/有效期/独立测试批准ref；真实开关false、11项NOT_RUN/BLOCKED | 未批准，无签名计划 |
| OS 资格测试 | 针对真实安装取得 11 项绑定同主机/同程序 hash 的证据；不得用模拟报告签发 PASS | BLOCKED，未执行 |
| 真实 Key | 用户单独批准后经高完整性受认证 IPC 导入，服务身份 CurrentUser DPAPI；不得放入交付物/argv/env/日志 | 未批准，未导入 |
| 单次 LIVE 请求 | 用户审阅明确来源、分类、确切 body/context/subject、范围和成本；生成受保护外部签名 consent，单次使用 | 未批准，无 consent / API 请求 |

配置模板默认 `real_import_enabled=false`、`live_enabled=false`，qualification 模板 status=BLOCKED，测试批准引用为空。把 JSON 改成 true 或自报 QUALIFIED 不构成授权：native 必须完整验证外部 CMS。独立批准的 QUALIFICATION_ONLY 计划允许尚无 OS PASS 的版本在服务 SID 上收集合成值证据；该模式 `qualified=false`、真实开关严格false、无出站 consent，固定数据根为 qualification，Node 只能 SIMULATED fixture。正式 QUALIFIED 仍需11项真实证据全PASS；真实导入和LIVE仍各自独立批准，不能由宿主或 RPC 自报通过。

## 审批前已有成果

- 可编译源码：`source/native/credential-service/` 的 Common、SCM supervisor、固定 stdio client、构建/只读预检脚本与三个 BLOCKED 模板。
- 构建使用系统 .NET Framework 4.x C# 编译器、x64、warning 视为错误；无额外下载、NuGet、安装依赖。
- 两个 exe 各 40 项纯自测通过；六个未部署入口探测（含伪资格专用 CLI 开关）均拒绝。新增模式策略、qualified=false 摘要、到期拒绝、敏感读ACL位和合成 Key 前缀检查仍是纯 fixture，不能替代 Windows 身份/有效DACL/句柄读取/pipe/DPAPI/崩溃资格。
- 只读预检确认固定程序/数据根不存在，服务未安装，没有账户/ACL/系统设置变更，没有 named pipe 或供应商 API 连接。

证据位置：`.workflow-kit/runtime/AgentNexus-M1.8.3/native/build-report.json`、`entry-negative-report.json`、`preflight-report.json`。交付整合时以最终 source hash 对应的最后构建为准；重新编译会改变旧版 csc 的 PE hash，资格必须绑定最终安装版本。

## 仍需关闭的部署条件

完整条件和协议见 [Windows 服务设计](windows-service-design.md)。11 项 OS 资格目前全部 BLOCKED；不能将缺项、配置布尔值、synthetic fixture、源码检查或本预检冒充真实 PASS。外部 verifier 的签名只能证明声明来源，真实观察、主机/程序绑定、单项证据审阅仍需人和经批准的验证流程负责。

首次真实安装、固定资格专用目录 ACL、测试计划签发和回滚安排仍需单独审批。只有签名、到期受限、全固定绑定的 QUALIFICATION_ONLY 计划才允许首次测试，不能使用 CLI/env 开关绕过；计划过期会关闭 Job/pipe。真实 OS 证据收集与独立审阅完成后，需停服务、发布新签名 QUALIFIED 资料并重启，绝不在运行中把合成账本晋级为正式 engine 账本。拟议回滚也涉及停止/删除 SCM 服务、移除已批准文件和处理加密凭据保留，不能在未批准时先行执行。

批准部署不等于批准真实 Key 或任何 API 请求；这些是表中独立审阅项。当前结论保持：**可供审阅的实现与模拟已交付，生产部署和真实资格未完成**。
