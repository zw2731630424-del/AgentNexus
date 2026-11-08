# AgentNexus M1.8 工作记录

用户任务：真实模型接口、Credential Vault、Model Gateway 和自主研发验证。首先完成 M1.7 冻结与 Vault 设计，再持续实现当前授权范围内的代码、合成测试和交付；真实 Provider/Key/费用必须另行批准。

实现位于 `deliverables/AgentNexus-M1.8/source`。主代理与三个独立上下文工程代理分担基线阅读、Vault、Usage Ledger、Git Reviewer 集成与交叉安全审查；同文件始终单写者，子代理没有递归派发。工程子代理不属于 AgentNexus 中真实模型研发实验。

基线：main / c45822ac2867a4975cc6ba833430dc0140410bfe，初始工作树干净。M1.7 引擎 155 文件、源码集 SHA256 `8167ce3e78c602f43bee2b3a4d792a5054f76d7121a6a7730b14cc37eb5c4c6c`；15,510 个历史文件冻结。首轮沙箱复验 488 PASS / 30 NOT_RUN / 14 FAIL，宿主复验 514 PASS / 16 NOT_RUN / 2 FAIL；CPU 与 Windows 原语问题仍保留，不能回填 M1.7 原验收。

凭证/模型的真实网络与 OS 资格不随代码完成自动取得。当前没有真实 Key、真实 Provider 请求、费用、Commit/Push、Git Hooks、账户/ACL/AppContainer 修改。生产凭证隔离、严格累计 CPU 与普通 Worker PROCESS/EXTERNAL_EFFECT 继续 BLOCKED。

正式结果、所有尝试、独立审查、原始证据与 SHA256 见 M1.8 交付。临时数据与完整回归快照位于 `.workflow-kit/runtime/AgentNexus-M1.8/`，历史失败不覆盖。

交付后用户明确要求“全部保存提交推送”。本次据此提交并推送全部可发布 M1.8 文件；继续沿用既有公开发布范围，ZIP、临时数据库和原始运行目录保存在本地。此前“未 Commit/Push”的描述是实施阶段事实，不回写历史。该授权不包含真实模型调用或费用。发布绑定见 `publication.json` 与 Git 提交。
