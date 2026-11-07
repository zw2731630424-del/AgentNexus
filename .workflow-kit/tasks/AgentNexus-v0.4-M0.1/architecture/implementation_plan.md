# M0.1 → M1 实施计划 v0.2

保留 [M0路线](../../AgentNexus-v0.4-M0/architecture/implementation_plan.md)，只调整 M1 的基础设施先后，M2—M7原则继续适用。本轮用户已授权完成补充设计后独立推进合法实现，不再为每个小步骤请求批准。

## M0.1 准入

先核验24份M0交付及112份受保护输入/规则/套件，逐份阅读全部交付、目录JSON与研究分册。新增目录独立版本化，不覆盖M0。四项设计、目录v0.2、接口、ADR形成后记录具体准入状态：

| 准入项 | 允许路径 | 阻断路径 |
|---|---|---|
| 套件授权 | 独立规格与独立实现，保留来源/指纹 | 未获许可原代码、模板、测试表达复制/发行 BLOCKED |
| M1依赖 | 零npm运行/开发依赖，已安装Node内建API；固定可信Python/PowerShell解析器外部调用 | 未审依赖安装、上游Harness代码打包、Node/OS/解释器再分发 BLOCKED待发行闭包 |
| OS隔离 | 可信库、合成工作区、无模型/无第三方代码的基础测试 | 任意Shell/外部Harness/科研执行、真实worker管理隔离 NOT_RUN/BLOCKED |
| 协议 | audit/context/artifact/decision分域、五维诊断、单次claim/outbox/fence | 自报admin、PDP故障自动旁路、无审计执行 禁止 |

## M1 切片和验收

1. Feature Registry/Module Manager：读取完整v0.2目录，只注册实际模块；ON/OFF/INHERIT、祖先OFF、作用域、依赖冲突、preview hash/revision、停止新派发/排空/失败状态、数据保留与恢复。
2. Policy：真实三模式、限定项目/条款范围、可降级白名单、challenge两次确认、原因/期限/一次性消费、epoch、过期先冻结/预检后恢复；可信句柄与Agent门面分离。OS管理员认证尚未部署则报告库测试通过、部署BLOCKED。
3. Storage：SQLite>=3.51.3、短事务、不可变audit/context、outbox、Artifact流、分段hash链/Zstd；重启前缀校验、坏尾隔离、索引/导出修复，有限队列和取消。
4. Audit+Tool+Policy 联测：输入/诊断/许可/claim/STARTED/输出/结果/Context链，单次执行、防旧epoch/参数篡改/重放、writer竞争、审计故障前后窗口、readonly任务重建。
5. Development Intelligence：稳定五维接口，首批实际Python AST/PowerShell AST/JSON与受限Git/Python argv检查；任意SQL prepare因PRAGMA编译阶段副作用不准入，SQL保持NOT_RUN。已有安全语法工具再择入，不安装Ruff/TS/Roslyn等来扩张M1。验证错误/正常/注入文本不执行、版本过期、OFF无调用/VALIDATION_BYPASSED。
6. 原生包完整性：full-relative-path双向集合、重复/别名冲突/链接/逃逸拒绝；原套件不改，用独立夹具覆盖嵌套同名/恶意新增/遗漏/哈希变更。可变树TOCTOU未封闭则不作为发行可信根。

测试结果统一 PASS/FAIL/NOT_RUN/INCONCLUSIVE/BLOCKED/BYPASSED；合成输入的真实SQLite/文件/解析器调用可为PASS，但必须说明范围；不用Fake模型冒充真实端到端。不运行正式科研实验、hooks、commit/push，不扫描Key。

## 交付和恢复

M0.1文稿在本目录；M1代码在src/agentnexus，测试在tests/agentnexus，运行记录在runtime/AgentNexus-v0.4-M1。每次重要修改追加工程变更记录，记录来源、文件指纹、实际命令、退出码与候选关联。最终交付清单涵盖新设计与实现，排除自身并锚定原M0清单。没有通过的OS、两模型、费用和长时soak不授予M1全部完成。

M1完成本轮可独立切片后停在明确检查点：保留in-flight和坏对象，不重放副作用；若库行为检查失败先修复与针对性回归，无法修复的部分标FAIL/BLOCKED并保持执行禁用。M2再用实际独立身份与平台helper关闭OS门，M3真实模型需明确可用凭证且不主动扫描。
