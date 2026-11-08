# M1.7 最终验收

交付状态：完成，保留明确资格限制。**本地原生执行闭环 PASS；真实 Provider 与通用自主研发 SIMULATED。** M1.6.1 历史失败不回填，严格累计CPU和完整生产执行链继续BLOCKED。

| 范围 | 实际结果与边界 |
|---|---|
| 单Agent / Loop / 工具 / Task / Context | 继承与新增测试通过；实际71份模型输入来源重建 |
| Multi-Agent | 16角色Task；三个独立编码任务逻辑并发峰值3；真实消息与21文件发布 |
| 研发 / 审查 / 修复 | 有意植入NaN真实失败 → 独立只读Review通知 → lead决策 → Debug版本替换 → 10/10复验 |
| Resident | 两小时实际观察 PASS；详见报告的源快照限制 |
| Coordinator | 获准同store跨项目状态/优先级/预算，非跨Host全局服务 |
| Context / Scheduler恢复 | 同lead原Task受控Host重开，旧facade失效、重开自动模型调用0、显式恢复继续；热索引滚动但原Archive可读 |
| Workflow | 最终G0–G6均程序PASS，修复前G3/G4 FAIL保留；无人工门profile |
| Resource | 三级逻辑预留、持久磁盘claim、UNKNOWN隔离；不等同OS硬资源资格 |
| 完整回归 | 532项：523 PASS / 9 NOT_RUN / 0 FAIL；syntax与strict types PASS |
| 新增M1.7 | 53项：52 PASS / 1 NOT_RUN / 0 FAIL |
| 生产资格 | 累计CPU、OS生产组合、普通Agent PROCESS/EXTERNAL_EFFECT BLOCKED |
| 真实模型 | SIMULATED，0真实请求/费用；Vault生产后端未验证 |

引擎源码155文件，修改5个继承文件、新增15个；原测试与Catalog未改。源码集 `8167ce3e78c602f43bee2b3a4d792a5054f76d7121a6a7730b14cc37eb5c4c6c`。最终Pilot候选证据 `4efb37521e7ff918500ad30bb8f211c82f99b36792e305ad637e330d5b098a7e`。全部证据hash和原运行路径见 [acceptance.json](acceptance.json)，完整回归skip逐项记录，不能把NOT_RUN解释为通过。

最终原生运行位于 `.workflow-kit/runtime/AgentNexus-M1.7/v/r-cc1c68b6fcfb/data/native-pilot/2026-11-08T03-36-35-394Z-2120`；其源码快照与回归快照一致。原始数据库/Context/Audit/Artifact/命令输出在 evidence/raw/v.zip 中完整保留；导出源码仅为字节核验的包装复制。旧M0–M1.6.1与本轮所有失败详见历史保护和原始运行索引。

本轮未授权事项均保持未执行：真实Provider、API Key读取、Commit/Push、Git Hooks、账户/ACL/AppContainer修改、正式科研项目或实验。OS reboot、硬断电、真实Provider切换、自动Commit/Push Watcher为NOT_RUN。固定Host Runner不向普通Agent开放任意Shell。
