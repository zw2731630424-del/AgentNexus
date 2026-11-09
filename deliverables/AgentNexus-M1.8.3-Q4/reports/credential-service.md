# Credential Service 部署验收

**NOT_RUN / BLOCKED。未安装、未启动。** 真实 SCM 查询退出1060，目标服务不存在。`sc showsid` 计算出的 `S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873` 状态 Inactive；NTAccount 翻译未解析。它不是服务身份激活、实际 Token 或登录会话证据。

本轮只有操作员 PowerShell 真实 Token（Medium8192、未提升、非AppContainer、Session1及Logon ID），不能替代 Service Token。服务 Token、Privileges、IL、Session0、父子关系、停止/重启、无SeDebug及无交互/RDP登录权限全部 NOT_RUN。完整原始服务清单与操作员 Token 见 [真实宿主采集](../evidence/host-medium/host-preflight.json)，服务字段见 [service-sid-and-token.json](../evidence/service-sid-and-token.json)。
