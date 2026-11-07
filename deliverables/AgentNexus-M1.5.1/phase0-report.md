# Phase 0 基线与历史保全

初始 main / HEAD `4c714583e9971bc510218dc9274d4692b8ab70d2`，tracked 工作树干净。冻结脚本记录时仅有本轮新未跟踪目录。根 AGENTS.md、治理 policy、workflow 路由已读；I:\AGENTS.md、父/根 override、project-rules/README 均不存在，没有扫描所有 workflow 子目录或修改规则。

M1.5 91 文件原字节集合 `a55823fae02fd565249cf0d2af1f3257d2e107b798b05b078b74ba15eb0e109e` 与交付清单一致。完整源码复制到独立 M1.5.1；原始源码 ZIP、10 次 CPU 原始 stdout/stderr/report/manifest 在 evidence/phase0。M1.2、M1.3、M1.4、M1.5 全树与 tracked 逐文件 SHA256 见同目录 historical-manifest/tracked-manifest。最终仍须通过 preservation-verification.json 全量保全核验。

主代理完整读取 NativeRuntime/BootstrapNative/NativeProbe、原生 PS、CPU 工具/fixtures 与两个 native 专用 TS；独立审查者完整读取继承 TS、其余工具/fixtures/checker、全部相关 ADR001—029、历史报告和 M1.2 issue ledger。逐文件读取与仅 hash/JSON 结构解析明确区分，见 evidence/independent-review/reading-manifest.json。170 Feature/44 Policy 全结构解析，不冒充逐行文字审读。M1.3/M1.4 未发现独立同名 issue-ledger 文件，开放边界从验收/安全报告汇总。

| 历史 | 原始结论 | 本轮处理 |
|---|---|---|
| M1.2 | 167 PASS / 4 NOT_RUN | 不覆盖；OS-01、SCI-01 等边界继承 |
| M1.3 | 203 PASS / 3 NOT_RUN | 身份/退出协议模型不升级为 OS 保证 |
| M1.4 首轮 | 247 PASS / 1 FAIL / 4 NOT_RUN | CPU 原始失败保留 |
| M1.4 最终 | 251 PASS / 4 NOT_RUN | 旧 CPU PASS 实耗 2859.375ms / 80ms，不是预算资格 |
| M1.5 最终 | 265 PASS / 23 NOT_RUN / 1 FAIL | 本轮相同源码复现 |
| M1.5 CPU | 10/10 FAIL | 原始记录逐次归因，永久保留 |

历史 CPU 4875、2828.125、2906.25、2859.375ms 记录与最终 PASS/FAIL 不一致的原因之一是旧断言仅检查非 helper DEADLINE，未检查预算。本轮宿主同账户同源码又出现 2593.75ms 被旧测试 PASS，进一步复现这个断言盲点；不回写历史标签。

第一轮本轮 baseline 选用了 Windows PowerShell 5，造成 20 项工具兼容失败，原始 282-case TAP/数据完整保存；改用 7 后恢复 289-case 265/23/1。首次调查 image 查询在已退出进程返回 WIN32_31，三项 INCONCLUSIVE 原件保留，随后从活句柄采集 image 解决调查 fixture。上述运行不作为最终资格。

原测试数据与运行 workspace 在逐成员 hash 验证后归档 ZIP，仅删除本轮已完成临时副本以解决治理长路径；原 M1.5/历史证据未动。开发 focused run 未捕获完整源集合，单列开发证据；最终回归与 58-case CPU 均绑定精确 100 文件冻结集。
