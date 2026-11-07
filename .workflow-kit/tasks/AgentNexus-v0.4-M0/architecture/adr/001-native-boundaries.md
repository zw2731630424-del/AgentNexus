# ADR 001 原生架构与模块采用边界

状态：M0工程建议，待架构审阅；没有把建议登记为用户已批准决策。用户明确的原生Harness、完整原档案、供应商独立与不靠Prompt强制要求视为本轮约束。

决策：AgentNexus拥有Agent/Task/Event/Tool/Session/Archive/Policy/Approval/Feature协议与状态，不选择任何整套Harness作为最终底座。原生Loop只实现一套，外部Codex/Claude等通过可关闭适配器转换；它们各自原生Session ID保留在命名空间，不污染Nexus主键。

源码依据见[14模块矩阵](../../research/harvest_matrix.md)。DeepSeek的插件管线、Cline的beforeTool、Goose的GDK、OpenHands的Conversation、Deep Agents的图和Agensh的外部ACP loop具有不同事件/许可/恢复语义；直接拼接会产生多个授权根、预算账本和不可兼容恢复模型。Nexus因此REIMPLEMENT业务核心与独立执行许可，REFERENCE_ONLY这些设计。

REUSE成熟通用组件：SQLite、Zstandard、Git、标准HTTP/协议SDK和受控后端公开接口。FORK_MODIFY只保留最小纯函数/平台绑定候选，如工具配对/可审查的纯规则求值/OS helper；未完成依赖切割和许可前不导入。不会为了“全自研”重写压缩、TLS、数据库或Git。

每次实际引入需登记：文件列表/哈希、精确rev、许可/NOTICE、修改、owner、同步/回滚策略及兼容测试。上游变动不自动升级生产。所有FORK候选目前是未实施提案，不能把表格当已fork或已获发行许可。

后果：M1先建设原生状态/开关/归档/管理模式，M2才接完整工具与OS执行；M6再做外部后端。成本是维护统一转换协议，收益是不会让外部产品更改内部安全和数据模型。若某后端无法限制真实执行通道，适配器只读或禁用；不以界面方便换取高风险权限。
