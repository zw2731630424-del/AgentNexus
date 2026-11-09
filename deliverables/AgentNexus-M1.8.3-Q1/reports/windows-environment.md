# Windows 环境

采集时间：2026-11-09 06:37:37 Asia/Shanghai（原始 UTC 2026-11-08T22:37:37Z）。

|项目|观察|
|---|---|
|OS|CIM Caption=Microsoft Windows 11 专业版，Version=10.0.26200，Build=26200，x64|
|版本补丁|DisplayVersion=25H2，UBR=9711，EditionID=Professional|
|注册表兼容名称|ProductName 仍返回 Windows 10 Pro；报告依 CIM/Build 识别，不把这个兼容字符串改写为另一条原始观察|
|最近启动|2026-11-06 10:00:36.500036+08:00|
|MachineGuid 摘要|a013cd5e924eb5db1ba67eb28c65379f81b2d73f2cbd42fdb6645eb202681fe4；不记录原始 GUID|
|交互用户 SID|S-1-5-21-2532670394-1554971530-4095700938-1001|
|Explorer|PID 14652，Session 1，Medium，非 elevated|
|宿主采集器|PID 52428，同 SID，Medium，非 AppContainer，非 elevated，TokenElevationType=3|
|沙箱采集器|PID 5836，同 SID，Low，AppContainer=true；与普通桌面身份分开记录|
|UAC|EnableLUA 1；管理员 consent 5；标准用户 consent 3；secure desktop 1|
|宿主进程特权|SeChangeNotifyPrivilege enabled；Shutdown/Undock/IncreaseWorkingSet/TimeZone disabled；无 SeDebugPrivilege|
|现有服务身份|目标 VSA 尚不能解析，服务 SID inactive，实际服务 Token 不存在|

宿主采集器和 Explorer 的 Token/组/特权是本次实际 OS 查询；它们不是服务 Token。目标服务启动后必须另查 supervisor、Node、attester、DPAPI helper 的 TokenUser、服务 SID 组、IL、会话、全部权限及父子关系。[完整 Token](../evidence/preflight-host-medium/actual-process-tokens.json)

运行时候选：Node `D:\Nodejs\node.exe` 24.15.0，SHA256 `3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5`，OpenJS 签名 Valid。Windows PowerShell 文件 SHA256 `60c9b29843624dd8af6b6a7b26147753be6aeef65098b9a503cc50850afe410f`，Microsoft 签名 Valid。`.NET csc.exe` 4.8.9221.0 仅为历史构建工具候选，本轮未重编服务。[运行时文件与 ACL](../evidence/preflight-host-medium/runtime-candidates.json)

Supervisor 给 Node 配置受保护 `TEMP/TMP`；冻结的 DPAPI protector 启动 PowerShell 时只传 SystemRoot/WINDIR/遥测关闭项，没有传递这两个临时目录变量。不能因此声称 DPAPI helper 的实际临时路径已受同一 ACL 保护；实际 profile、临时路径、模块和异常缓存仍须在获批后的进程观察中单独核对。

已观察的 enabled SandboxOnline/Offline 是 Codex 宿主账户，不是本任务获准的攻击身份；不索取其凭据、不重设密码、不借用或授予登录权。不同 SID 普通用户测试保持 NOT_RUN，直到有范围内合法可用的测试身份。
