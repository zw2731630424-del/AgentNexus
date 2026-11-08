# M1.8.1 最终验收

**完整目标BLOCKED；新增离线工程范围PASS。真实DeepSeek请求0，Token0，费用$0。**

新增41项：41 PASS / 0 SKIP / 0 FAIL。完整回归681项：635 PASS / 32 SKIP / 14 FAIL；语法PASS，严格TypeScript PASS。当前沙箱原版M1.8基线见evidence/regression-comparison.json，所有失败未覆盖。

| 验收问题 | 结论 |
|---|---|
| 真实Key安全管理、Agent无法读取完整Key | 合成接口与泄漏门通过；生产OS隔离BLOCKED |
| Gateway真实请求 | NOT_RUN；LIVE拒绝在凭证读取和网络前生效 |
| Streaming可靠、Usage费用准确 | 离线协议/失败Usage/有界解析通过；真实长流和账单NOT_RUN |
| 程序控制数据外发 | 精确Host许可与撤销/秘密扫描离线通过；生产资格BLOCKED |
| Development自主规划、Subagent研发 | NOT_RUN；已有工程fixture为SIMULATED |
| Reviewer未知问题发现、Debug真实修复 | NOT_RUN；独立Codex安全审查单列 |
| Multi-Agent完整研发闭环 | NOT_RUN；生成代码PROCESS资格未关闭 |
| Resident长期运行 | 24小时NOT_RUN |
| 全部真实调用可追溯 | 真实调用0；离线请求/来源/Usage/Audit/哈希可重建 |
| Single/Multi质量与成本 | 样本0，INCONCLUSIVE |

未完成项包括原生tool消息历史、Gateway reasoning选项、隔离原始partial分块持久化、生产singleton账本和真实账单核对，均未宣称实现或验收。必须先补批准的OS身份/部署/可信凭证入口，当前不能安全推进真实API。授权的1亿Token是总上限，没有被消耗目标。

源码集 `d2091ef71fbd7a62f17ff8a42a922357759817073d97f1343d27b6ff7c9c3bb1`。最终SHA清单与历史保护结果另附，M0–M1.8原字节保留。未修改根产品、规则、系统账户/ACL；未Commit/Push。

完整根治理检查PASS；最终交付路径增量核验与历史保护结果见[治理报告](reports/governance.md)。
