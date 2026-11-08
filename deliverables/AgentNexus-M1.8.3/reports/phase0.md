# Phase 0 基线与源码冻结

起始 HEAD `1e77c6627769ecc82cac11c8b4010bc08b53eddc`，起始 tracked 工作树干净；本轮新增 AgentNexus-M1.8.3，没有 commit/push。原 M1.8.2 与 Model Provider UI 共 706 文件已在实施前 SHA256 冻结，交付前全部复核无漂移。根产品及其他历史 tracked 文件未变，没有搬动历史目录或覆盖同 SID 失败。

AGENTS、存在性检查后的 project-rules（索引不存在）、治理 policy 和工作流路由已读；registered_rules 为空，无附加 always 规则。适用工作流路由没有已启用匹配子流程。优先 govern new 尝试在旧长路径失败，最终采用原工具 extended-length 根检查；未修改规则/策略或增加忽略项。

已核对 M1.8.2 完整 README/验收/Vault与egress资格/独立安全审查、原同 SID 原始记录、原 UI 验收和独立审查；相关源码与 M0—ADR052、M1.7—M1.8.2 历史问题、Resource Governance、Feature/Policy 目录作任务相关复核。完整机器读取与语义复核区分见 read-coverage，历史栈追踪/重复测试不冒称逐行审查。目录 Feature 193 项、Policy 52 项保持原字节。

实际旧架构是 Host 内 Vault，DPAPI helper 与 Host 同用户 SID；不是独立服务。Electron frame 验证不等于 OS pipe 认证。旧 ModelUsage/Campaign Owner 均在 Host；新产品远端分支转移至唯一服务 Owner，Host 只留审计投影。

最终源码 225 文件，集合 SHA256 `108e724d0b5796f472d5eb46a9088c556f04084c4bca0dad9bceb9a691d0090a`。最终运行前后同集合；新旧文件逐项清单见 source.manifest。原始失败、各候选及独立报告分别保存，不混用新旧 SHA/测试结论。
