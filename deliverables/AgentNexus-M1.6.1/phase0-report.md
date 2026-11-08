# Phase 0 基线冻结

当前分支main，HEAD `3e2890bafe505ff7d02886c8e2b800ff685083ce`；最初工作树干净，无Commit/Push。根AGENTS已读；无project-rules索引；项目workflow路由无额外匹配流程；policy.json已读，未改规则或启用增强模块。

M1.6的123文件与原集合 `242bf84892d7db9539baa5fca36119af97aa658cf0757ba97c58a17190542f80`完全一致后复制到独立source。冻结8539历史文件；原完整验收、Issue Ledger、资格、原始380测试结果复制为baseline原件。完整M1.6复验380=350PASS/27NOT_RUN/3FAIL，strict与syntax PASS；两个原FAIL和新增工具路径失败均保留。

阅读覆盖M1.6 README/验收/逐字独立审查、设计/Workflow/Feature/Policy/ADR/issues、M1.5.1 CPU根因与资格、M0/M0.1相关合同、实际实现和测试。团队实际阅读/片段审阅范围按组件read-manifest逐路径SHA登记；语义审查是定向模块审查，不冒充所有历史C#/OS部署代码逐行独立审阅。全123文件的源扫描、严格类型/语法和完整原回归单独提供全量证据。

开放边界：严格CPU、完整生产OS隔离、未知Worker释放、真实Provider/费用、硬断电/OS重启、长期自治与GC。最终保持状态见acceptance.json。历史和原始测试逐SHA复验PASS。
