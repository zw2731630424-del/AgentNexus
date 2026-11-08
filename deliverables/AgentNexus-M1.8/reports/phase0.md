# Phase 0：M1.7 基线冻结

读取根 AGENTS.md 与项目工作流路由；`project-rules/README.md` 不存在，无可匹配类型流程，也没有新增规则或安装增强模块。主代理和独立上下文工程代理分批读取 M1.7 全部运行时源码与测试、README、完整验收文本、独立安全审查、模型/资源/Context/消息/调度/五类合同/Workflow/Gate 报告；同时读取 M0 Harness 研究矩阵、主流源码研究及 Workflow Kit 映射。Catalog 完整结构化解析并读取全部控制字段，关键 Feature/Policy 定义完整阅读；未把未展开的叙述字段冒称逐字 FULL。

main / `c45822ac2867a4975cc6ba833430dc0140410bfe`，开始前工作树干净。基线 155 文件的源码集 hash 与 M1.7 声明完全一致。`evidence/baseline.json` 记录逐文件 hash、分支、HEAD 和历史文件，历史保护在交付时重新计算。根产品仍是 M1.3；本轮复制独立 M1.7 引擎，不替换根产品。

基线机制：ModelGateway 仅 MOCK，Key Handle 仅 vault:mock opaque 字符串；71 次原 Pilot 请求的 Usage 都是合成。资源由原三级逻辑 Owner 原子预留，不等于 OS CPU 硬限制；UNKNOWN 不释放，Context 保留原始字节和 manifest。原 Pilot 固定源码白名单和固定检查器不是任意模型代码执行沙箱。

本轮同字节复验：沙箱 532 项＝488 PASS / 30 NOT_RUN / 14 FAIL；宿主 532 项＝514 PASS / 16 NOT_RUN / 2 FAIL。宿主两项失败是累计 Job CPU 依然依赖 deadline 终止，以及 CREATE_BREAKAWAY 测试中的 NtCreateFile WIN32_5。原始结果分别保留；不修改历史测试以消除失败，也不将新的运行覆盖 M1.7 的 523/9/0 原验收。

生产安全边界：Vault 同账户 OS 隔离未资格，真实 Key 接收关闭；严格 CPU/生产执行链和普通 Worker PROCESS/EXTERNAL_EFFECT 仍 BLOCKED。M1.8 的模型接口不赋予工具权限。
