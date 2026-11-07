# M1.5 Phase 0 基线冻结

HEAD `83e45e378846dfb568bf635a67e4664c76504e5f`。初始 tracked 工作树干净；冻结1986个 tracked 文件和1670个 M1.2/M1.3/M1.4 历史交付文件。根实现仍为M1.3，本轮所有产品修改仅在本交付的 source。未改 AGENTS、治理策略、其他科研项目、账户、ACL、Profile、服务或防火墙；未 Commit/Push。

M1.4 67源码集合 SHA256 `e2f95cb5c7557660dfbbf3cfcbb2a03a78460f9b408e66bd2fbb3f6ea96e3a88`，与最终隔离测试 manifest 一致；M1.4 delivery manifest 153项验证通过。复制原字节后才在M1.5开发。完整逐文件前状态见 evidence/phase0/freeze.json。

主代理全文读M1.4全部 production 模块、NativeRuntime.cs/runtime.ps1及协议/设计。独立 baseline_evidence 全文读全部18个测试/fixture、9个工具、3个build tools、全部顶层报告与ADR014—020、M1.3协议/设计/ADR010—013和M1.2策略恢复资料；完整程序解析所有M1.4原始证据。typescript_baseline全文读19个继承TS、2个checker、NativeProbe.cs、package，共3921行；两个catalog按完整JSON递归解析单列，不冒充逐行人工阅读。范围与逐项hash见 evidence/typecheck/inherited-reading-coverage.json。

历史基线：M1.2 167 PASS/4 NOT_RUN；M1.3 203 PASS/3 NOT_RUN；M1.4最终251 PASS/4 NOT_RUN，之前真实运行247 PASS/1 FAIL/4 NOT_RUN。M1.4最终原始测试数据1076成员全量校验，16 native JSONL共56帧核对raw原文；压缩审计和SQLite在只读/内存副本中检查，没有改变原件。

关键开放问题为生产启动链/持续IPC、真实独立账户与Profile/ACL、完整树与producer观察、默认拒绝网络/跨项目/管理库真实攻击、CPU累计预算、生产审计与重启，以及Ubuntu实际部署。旧CPU80ms配置先后产生4875ms、2828.125ms、2906.25ms实耗并需墙钟终止；最后旧测试PASS对应2859.375ms，测试仅看非helper DEADLINE，未验证预算。相同源码的FAIL/PASS没有根因修复证据。本轮保持历史FAIL和资格关闭。
