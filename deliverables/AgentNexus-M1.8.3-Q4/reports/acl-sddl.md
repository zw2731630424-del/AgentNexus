# 实际 ACL / SDDL

已只读取得 `C:\`、`C:\Program Files`、`C:\ProgramData` 的真实 owner/DACL SDDL，见 [实际父目录证据](../evidence/host-medium/actual-parent-acl-sddl.json)。本轮未启用特权读取 SACL/mandatory label，不据此判定 MIC 通过。

两个目标目录均不存在；安装文件/配置/合成 Vault/ledger/audit 的实际 ACL 和普通用户访问拒绝全部 NOT_RUN。未应用预期 ACL，未做替换、Reparse Point 或父目录攻击。未来需验证每个实际对象及实际拒绝，不能用安装器 SDDL 字符串替代。
