# 治理与交付核查

原规则、治理policy/baseline、根目录结构未修改；所有本轮文件归独立deliverable或规范task/runtime。原M1.8.3/Q1的468文件保持Hash不变，产品源码242文件在最终完整验证前后不变。

优先尝试govern.py new时，普通Windows路径在既有超长runtime路径遇WinError3；未改规则或移动旧项目绕过。最终使用Windows长路径形式，在普通Medium宿主只读运行**未修改的完整govern.py check**，退出0、Governance check PASS，见 [原始输出](../evidence/governance-root-extended.stdout.txt) 与 [机器记录](../evidence/governance-root-extended.json)。早期失败/取消事实保留，未冒称初次通过。

最终打包检查还逐项验证所有本包文件分类、受保护规则Hash、源码ZIP、全包SHA清单、无交付数据库/私钥类型和历史冻结；它不打开运行Vault，不替代Windows身份/隔离资格。

独立测试的48个本轮合成SQLite从交付evidence移到规范Q2 runtime，迁移前后大小/SHA相同、无覆盖或删除。相应fixture固定写runtime，14项复验通过；原始日志、迁移清单保留。[迁移记录](../evidence/independent-review/state-runtime-migration.json)

没有commit/push；最终git status仅新增Q2交付和Q2 task目录。治理通过不改变生产BLOCKED或系统部署未批准状态。
