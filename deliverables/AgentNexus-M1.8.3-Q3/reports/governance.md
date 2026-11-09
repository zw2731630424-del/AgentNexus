# 治理与交付核查

未修改 AGENTS.md、治理 policy/baseline、项目规则或 workflow-kit 源码。本轮只写独立 Q3 deliverable、规范 task/runtime。普通 `govern.py new/check` 在历史超长路径失败；随后长路径、普通 Medium 的完整原检查实际发现 Q3 Vault 负测遗留的 `linked-root` Junction 并拒绝通过。[原始扫描](../evidence/governance/govern-medium.log)

只对本轮四个已核对路径调用非递归目录链接删除，目标仍在 Q3 runtime；逐目标所有文件 SHA 前后相同。没有移动/删除历史数据，没有修改 ACL。随后原 Vault 测试注册 `unlink` 清理，保持原 VAULT_UNSAFE_PATH 断言，Medium 单独复验 27 PASS / 0 FAIL / 0 SKIP。[清理证据](../evidence/governance/test-junction-cleanup.json) · [复验](../evidence/governance/fixture-cleanup.tap.log)

历史目录有大量深层条目，逐祖先重复 stat 很慢。实际使用 runtime 中的只读包装器调用**未修改的原治理模块 main/check、分类、策略、Hash 和 path guard**，缓存重复 Path.stat/lstat/resolve；结束后对缓存路径重新读取对象类型/设备/文件身份/Windows 属性，发现变化即失败。清理前它与原完整检查拒绝同一路径；清理后退出0，Governance check PASS，858,498个stat条目、429,249个lstat条目，重新核对没有变化，耗时256.924秒。[缓存前负测](../evidence/governance/govern-cached-before-cleanup.log) · [最终检查](../evidence/governance/govern-cached-final.log)

这是冻结文件系统条件下的检查加速。缓存及结束复核不构成对瞬时并发替换的通用隔离保证，也没有独立重新计算每个 resolve 结果；不拿它替代 Windows 资格。包装器、原工具 SHA 和该限制已独立静态审阅，见 [审查附录](../evidence/independent-review/post-review-addendum.json)。规则/分类/检查条件未删减，未通过修改规则、移动历史材料或关闭系统安全机制制造 PASS。

最终交付另外逐文件核对载荷 Hash/文件集合、源码 ZIP、全包 SHA256SUMS、原历史文件和规则 Hash、产物中无测试数据库/私钥。源代码变更与最后的工具/夹具调整均公开记录。未 commit/push。治理通过不改变生产 BLOCKED 或系统部署尚未获批准的事实。
