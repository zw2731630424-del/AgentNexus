# 治理与历史保护

本轮只新增 `deliverables/AgentNexus-M1.8.3-Q1/` 及 `.workflow-kit/tasks/AgentNexus-M1.8.3-Q1/README.md`。不改 AGENTS.md、policy、baseline 或其他项目规则；无额外门禁/增强模块/hooks、无 commit/push、无系统部署动作。

已优先尝试原 `govern.py new` 创建 Q1 入口；沙箱长路径遍历耗时，重复检查被终止，没有把未完成的 new 算作成功。随后按已登记 deliverable/task 类创建文件，使用原工具的 `path_at`/`classify` 逐路径核验；没有扩大 ignored_paths 或改规则以通过检查。

普通路径完整根检查因历史 M1.7 超过 260 字符的目录报 WinError 3，原失败保留于 [原始记录](../evidence/governance-normal-path-failure.txt)。不移动/删除该历史路径。随后用**未修改的** `govern.py check --target \\?\I:\AI_AgentNexus` 在宿主 Medium 只读执行，完整根检查 exit=0、`Governance check: PASS`。[完整根结果](../evidence/governance-full-root.json)

源码 225 个文件与原冻结 manifest 完全一致；379 项 M1.8.3 发布 SHA256 匹配；100 项现有生成文件与冻结构建规则的内存转译/资源拷贝预期一致，没有重编/改写历史 dist。构建比对未执行应用/Provider，没有把它称为完整类型/回归测试。

M1.8.2、M1.8.3 和原 Provider UI 的 969 个已归档文件进行前后逐字节 Hash 对照，排除已明确列出的依赖/生成目录。任何生成文件本轮只读、不写；实际选定的 100 个生成候选已另比对并固定 Hash。[历史初始指纹](../evidence/historical-preservation.before.json) · [收尾对照](../evidence/historical-preservation.after.json) · [逐路径治理](../evidence/governance-delta.json)

历史运行 UI 的 SQLite/WAL/SHM 只读文件指纹另列，未打开 SQLite；这些可变文件不冒称一致性快照或静态历史保护 PASS。M1.8.2 真实同 SID 解密 FAIL 单独保存引用与原 JSON，不改原始字节。

本包校验文件不自引用；`SHA256SUMS.txt` 覆盖其余 Q1 文件。收尾 JSON/链接/manifest 检查与实际系统资格分别报告。[包内验证](../evidence/package-validation.json)

后续用户确认 UI 方案 1 时，只更新既有 Q1 内容、生成器与任务说明，文件路径集合不变。完整根 PASS 保留为此前记录；本次复用原 `path_at`/`classify`、规则 Hash、包内验证与 SHA256 重新核对，不将界面选择记录为系统变更批准。
