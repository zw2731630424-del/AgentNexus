# Phase 0 基线冻结与读取

当前分支main，HEAD `112d915c97ee6e6214f7ce05eab8bd492bbb9bc6`。任务开始时工作树干净；本轮只新增M1.6交付、任务材料和构建工具，没有自动Commit/Push。根目录产品仍是M1.3，实际开发输入选定独立M1.5.1/source。

M1.5.1完整100文件逐SHA256与原source-sha256.json一致；ASCII路径排序的规范集合为 `3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0`。初始附加清单使用Windows Path排序，集合标识不同；逐文件完全相同，不把排序差异误报为源码改变。规范集合已由原验证runner独立复算。

另外冻结3341个M0—M1.5.1交付/任务历史文件，保留原ZIP、原FAIL与报告。独立审查和最终保全重新逐hash验证。完整文件清单见evidence/phase0/；本轮没有覆盖任何历史交付。

按主执行者/两条独立上下文执行线分工完整读取100个运行文件与测试；配置全文解析并索引全部ID/default/dependency/owner。实际读取人、模式与逐文件SHA见evidence/phase0/reading-coverage.json，A/B原始读取清单单独保留。已读M1.5.1 README/验收/CPU根因与资格/审查/部署、M1.2—M1.5.1架构与ADR、Feature/Policy、Archive/Audit/Gateway/Reconciliation、M0研究矩阵及105文件Workflow映射。没有重复全部上游Harness研究，只补CPU后端的官方资料。

项目规则入口AGENTS.md、治理policy和类型工作流路由已读；project-rules/README.md不存在，无always子规则。路由无匹配项目类型，不扫描套件子目录寻找流程，不新增增强门禁。已有lite治理保持，最终check必须通过。

历史M1.5.1为305项296 PASS/8 NOT_RUN/1 FAIL，CPU58项2 PASS/56 FAIL，strict TypeScript PASS。此次在当前受管Host环境复跑同一100文件：305项277 PASS/27 NOT_RUN/1 FAIL，strict/syntax PASS；更多token/pipe/link/独立部署相关用例因当前Host环境被阻断，逐项原因保留，不与历史8项混淆。

已有170 Feature、44 Policy均保留；M1.6扩至190/52，没有删除旧ID。依赖仍为Node24.15.0原生SQLite/Zstd，无运行npm依赖；TS5.9.3/@types/node24.10.1/undici-types7.16.0使用原锁定工具，不安装或更新依赖。

持续问题：严格CPU、真实独立账户/生产组合、完整ExitProof、持久存储owner、真实Vault/Provider、Ubuntu资格和长期运行尚未关闭。原始问题及失败不因本轮Native Harness通过而消失。
