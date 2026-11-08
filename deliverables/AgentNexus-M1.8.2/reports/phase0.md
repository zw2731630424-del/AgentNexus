# Phase 0 基线冻结与读取

分支main，HEAD `0bec61babb0e0b06c0cdf6c653e0bdb0b9094e7c`。起始工作树干净；本轮仅新增M1.8.2及根构建工具。M1.8.1 185文件集合SHA256 `d2091ef71fbd7a62f17ff8a42a922357759817073d97f1343d27b6ff7c9c3bb1`，其SHA256SUMS逐项无漂移；冻结16,040项历史文件。原始M1.8.1报告与全部FAIL均保留。

AGENTS、治理policy与工作流路由已读；project-rules/README不存在，registered_rules为空，没有额外always规则。M1.8/M1.8.1 README、完整验收、Vault资格、安全审查、官方核验、Data Egress和Token账本已读；M1.7 Native合同、M0/M0.1九项ADR和相关版本Feature/Policy登记纳入核查。完整文本机器扫描185文件的路径/哈希/导入/测试名见read-coverage.json；对模型链和失败链做语义复核，FULL_TARGETED与PARTIAL明确分开，完整机器读取不冒称每个继承文件已逐行语义审查。

未修改M1.8.1重跑681项：634 PASS /32 SKIP /15 FAIL；原版M1.8同环境640项：594 PASS /32 SKIP /14 FAIL。原14项在两个版本同环境均FAIL，相关六个测试文件与失败链八个运行时文件同字节。额外累计CPU测试在分次运行间变化，另册记录，不回填历史635/32/14。

当前候选189文件SHA `95cd2da54b0e854a469eb5e0df8f4b52ce89fe67e452ab57b758aeb8e8335b50`。所有原始TAP、JSON、source manifests、syntax/typecheck及每次失败在evidence/verification独立目录。Windows、SQLite/Node、DPAPI均为真实本地探针；模型请求0。
