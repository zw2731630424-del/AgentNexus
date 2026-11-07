# M1.6 最终验收

已交付可运行的可信本地Native Harness与三级资源治理基础，完成授权的源码、测试、独立审查和证据封装。**新增本地范围通过；完整回归FAIL，严格CPU及完整生产链BLOCKED。** Provider全部SIMULATED，未进行真实模型联调或系统部署。

最终版本0.4.0-m1.6，123文件，规范源码集合 `242bf84892d7db9539baa5fca36119af97aa658cf0757ba97c58a17190542f80`；HEAD仍main上的112d915c97ee6e6214f7ce05eab8bd492bbb9bc6，没有新Commit。M1.5.1原100文件与3341历史文件逐SHA相同，根M1.3不修改。

| 验证 | 最终结果 | 范围 |
|---|---|---|
| 完整回归 | 380：351 PASS /27 NOT_RUN /2 FAIL，exit1 | 实际v2完整源码副本，全部原始结果保留 |
| 本轮新增 | 75/75 PASS，0未运行 | 真实SQLite/Zstd/本地解析/Gateway；Provider与OS观察SIMULATED |
| 严格TypeScript / Node语法 | PASS / PASS | 全src/tests/tools，未关闭strict或添加skip豁免 |
| 独立审查 | 13发现闭合、15实际探针通过 | v1/v2复用边界逐hash说明，v2 security22及strict重新运行 |
| 五类型演示 | lead/sub/reviewer任务完成，7模型请求、2完成消息 | 模型SIMULATED；原JSON诊断器和Gateway实际运行 |
| CPU严格资格 | BLOCKED，原M1.5.1 56 FAIL/2 PASS保留 | 未重跑58矩阵、不改预算/容差 |
| 项目治理 | PASS | lite规则/分类检查；未修改规则或启用增强门禁 |

两项当前FAIL：继承CPU用例Job累计29062500 ticks且须Helper DEADLINE；继承TOCTOU用例没有完成实际junction替换（swaps=0），原swaps>0断言保留，动态攻击覆盖INCONCLUSIVE。没有证据据此宣称逃逸发生，也不能据“未返回外部字节”签资格。v1还记录了旧Policy计数44与新52不一致；只在M1.6测试副本维护为精确52+8个L0 ID，全部安全负例保留。v1弱CPU断言偶然PASS也不消除原严格FAIL。

27个NOT_RUN包含当前受管Host的token/pipe/link权限、未部署独立账户/Profile/有效跨账户ACL、无受保护Node pin及未捕获孤儿窗口等，逐条原文在test-results.json。没有为运行它们改ACL、账户、系统策略或权限。

A线：CPU bandwidth/consumption/wall/accounting独立合同、官方后端比较、Resource Registry与三级原子预留/累计核算/等待取消/UNKNOWN已经实现。预算、Feature或证书不能把OS未资格能力放开。实际LOCAL_WRITE经精确审批最多调用一次；缺存储owner时固定UNKNOWN并保留claims，包括大输出后的记录失败窗口。

B线：独立Agent身份/上下文/预算与可信生命周期、原生Loop、来源可追踪的Context、持久双向消息、单次调度/依赖/等待/取消/恢复/显式交接、五类系统Agent、Mock模型/key-handle池、工作流合同/角色/证据/Gate ledger/检查点已经贯通。所有工具经原统一Gateway/Policy/Permit/Audit；原始Archive不被摘要覆盖。

当前为基础实现：没有恶意Worker OS隔离、真实Provider/Vault、生产ExitProof/资源释放、持久disk owner、完整规则编译/自动质量Gate、自动Git watcher或长期自主Resident/Coordinator。模型HANDOFF只等待，显式可信handoffTask才转交。安全close/reopen测试不冒充真实Host/OS重启或断电资格。

源码、测试、原始TAP/JSON/stdout/stderr、各次源码/数据ZIP及逐成员SHA、原CPU58矩阵完整历史副本、独立修前/修后复现和交付清单均附后。所有FAIL保留；没有自动重试未知副作用，没有按超时或Agent自报释放资源。

未创建Windows账户、改ACL/AppContainer/系统任务/防火墙/服务/驱动；未修改Ubuntu/其他科研项目、读取真实Key、连接真实Provider、产生模型费用、运行正式科研实验或Commit/Push。后续边界见m17-recommendations.md。
