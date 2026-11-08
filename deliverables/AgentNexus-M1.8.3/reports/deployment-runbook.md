# 独立部署审批清单与回滚

本清单仅供批准，未执行。建议首批仅批准 QUALIFICATION_ONLY 安装与合成 OS 验证；不包含真实 Key 导入或模型请求。现有交互 SID 不足，因为其他同 SID 进程已实际解密其 DPAPI 数据；独立服务身份是必要变化。

|对象|精确拟议范围与权限|
|---|---|
|账户/服务|仅 SCM 服务 AgentNexusCredential，Virtual Service Account NT SERVICE\AgentNexusCredential；Service SID类型unrestricted(1)，单服务 own-process；不建每 Agent 账户|
|实际SID|只读 showsid 得到 S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873，STATUS Inactive；尚非活动身份|
|启动|固定带引号 `C:\Program Files\AgentNexus\AgentNexusCredential.exe` 无参，初期手动；子进程固定 node.exe + app/dist/src/agentnexus/credential-service/engine.js；无脚本/URL/env参数|
|登录权|仅服务登录；无交互/远程桌面/批量 Agent 登录，不授管理员/SeDebug；SCM实际token/privilege必须预检|
|程序树|C:\Program Files\AgentNexus：SYSTEM/Administrators/TrustedInstaller可写，服务仅读取/执行；普通主体不得替换，完整app manifest逐hash与锁定文件|
|数据|C:\ProgramData\AgentNexusCredential：配置/资格/签名只管理员写；engine、qualification、temp仅SYSTEM/管理员/服务SID读写；拒普通用户读/写及父目录替换、reparse|
|桌面profile|固定受保护desktop子目录，普通SID不可读取或修改；需实际验证所有新建cache/Crashpad/WER、owner-rights/继承和进程内存/句柄，代码没有把高IL等同证明|
|IPC|固定本地pipe，DACL仅SYSTEM/BA/服务SID，High label、拒remote/抢占；实际operator token必须高完整性/elevated及固定client镜像；真实双向token/进程绑定测试|
|配置/签发者|明确operator SID（建议当前交互SID，见deployment-plan.json）、外部证书DER SHA256 pin、主机/epoch/所有最终二进制hash；只签允许合成资格测试的计划，不签虚假PASS|
|原账本|初期qualification仅SIMULATED；生产升级时一次性核对并迁移原0真实消耗，review-only ledger-genesis.sql不能覆盖已有库，不能作为新的Token授权|

不提议修改防火墙、Ubuntu、AppContainer或驱动。所有实际账户/ACL/SCM/签发与启动动作均等待用户明确批准；这来自本轮用户的部署授权纪律。

回滚：撤回/等待计划过期，停止该服务并确认私有Job/Node/helper结束；解除获准SCM登记；保留加密Vault、原账本及审计在原保护ACL下以供明确恢复，不删除/重建预算。代码文件、账户/profile清理和任何删除另按批准范围处理，绝不递归删除计算路径或历史档案。

凭证资格通过以后，用户仍在原UI输入新Key，不需终端认证。真实请求还须审阅当时完整正文/Hash和绑定，再独立确认；1亿Token额度无需重复授权。
