# Phase0 基线与读取核验

初始主仓库main，HEAD 78a9d54b96417c262321be35ee44e86e300ca46d，工作树clean。根src仍是早期产品；实际开发基线选择M1.6.1独立交付source，140文件逐SHA核验后复制到M1.7，未推倒底层或覆盖根实现。

适用规则为根AGENTS、治理policy和Workflow路由；project-rules/README不存在、registered_rules为空、无匹配专项workflow，不额外启用规则或Hooks。规则、policy、baseline哈希保留。govern.py new最初因保留测试目录长路径枚举失败，文件未创建；按现有deliverable/runtime/task分类创建后，使用同一root inode的Windows扩展路径执行未修改的完整治理check，不降低检查范围。

三位独立上下文工程代理与主代理协作读取全部M1.6.1源码/测试：原FULL清单112文件＋最终补充28文件=140；原index/scheduler的TARGETED记录没有冒充FULL。193 Feature和52 Policy的完整JSON字段、数组及历史条目以可逆公共字段/覆盖字段视图阅读，重建逐节点相等；其余原文完整分块。覆盖证据见 baseline/read-coverage 和四份原read清单。

已读M1.6.1 README、完整验收、独立审查、Storage Owner/恢复、Context Provenance、消息可靠性、Task Scheduler恢复、Rules Compiler、Gate Runtime、五角色验证，及M0 primary_harness_audit、workflow_kit_mapping。工程阅读是集体内容覆盖，不声称对所有旧Windows OS模块完成新的独立安全审计。

本地可用能力：Native五类型逻辑Agent、模拟Model Gateway、固定受限工具、SQLite/Artifact/Raw Context、Storage Owner、规则/Gates、逻辑三级预算。真实Provider和生产Vault未接入；严格CPU、完整生产执行组合及普通PROCESS/EXTERNAL_EFFECT继续BLOCKED。已有Node24.15.0、TS5.9.3、@types/node24.10.1、隔离PowerShell与明确Python/Git用于固定检查，无网络安装。

历史freeze的15,294文件包含既有src/tests/tools/config/inputs/deliverables/tasks和选定根/治理文件，最终逐SHA全部匹配。历史runtime目录未纳入此freeze，不冒称全量历史runtime逐字审计；本轮新runtime及成功/失败原证据均另外完整包装。
