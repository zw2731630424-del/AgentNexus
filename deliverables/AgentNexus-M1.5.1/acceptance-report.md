# M1.5.1 最终验收报告

**总体资格：BLOCKED；CPU 与主回归状态 FAIL。没有宣称完成生产执行闭环。** 已完成授权范围内的调查、固定失败关闭整改、真实原语与独立代码审查；系统级部署未获批准，且系统批准本身也不能修复 CPU 合同不成立。

冻结 100 文件 SHA256 `3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0`。最终 Run `final-2026-11-07T19-55-23-372Z-7880`：**305 项，296 PASS / 8 NOT_RUN / 1 FAIL，exit 1**；Node syntax / strict tsc PASS。CPU Run `2026-11-07T19-49-58-861Z-25456`：**58 项，56 FAIL / 2 PASS，exit 1**。M1.5 历史 10/10 FAIL、原 289-case 的 1 FAIL、M1.4 原始 FAIL 和后来旧 PASS 全部保留。

| 验收问题 | 证据对应结论 |
|---|---|
| 1. CPU真实失败原因 | OS_BEHAVIOR_LIMITATION；周期用户态限制没有已资格的超支时延上界；精确内核 cadence 仍 INCONCLUSIVE |
| 2. 单进程和子进程累计CPU稳定限制 | FAIL，最终58场景 56 FAIL / 2 PASS；预算和容差未放宽 |
| 3. Host真正创建管理独立Worker | BLOCKED，候选代码/模型通过，真实账户/Profile/Task未部署 |
| 4. IPC真实Peer | PASS，同账户实际 PID/start/SID/image；真实跨账户和有效ACL仍 BLOCKED |
| 5. Broker唯一高风险入口 | PASS，代码与独立失败关闭模型；当前实际生产高风险仍 BLOCKED |
| 6. Worker无法访问其他项目与管理库 | BLOCKED，未有独立OS用户的实际攻击证据 |
| 7. 文件链接/路径逃逸 | Junction/Hardlink/最终40次TOCTOU原语PASS；symlink与独立隔离BLOCKED；修前TOCTOU fixture FAIL永久保留 |
| 8. 父退出后发现子残留 | PASS，M14/M151特定同账户原语；完整历史与生产Host重启未验证 |
| 9. ExitProof足以释放 | BLOCKED，未知成员/producer/Sandbox事实仍不完整，五资源保持 |
| 10. 关键活动完整审计 | 模型/部分原语接入PASS；独立长期生产完整性 INCONCLUSIVE |

## 最终主套件失败与修前记录

- M1.4 REAL_WINDOWS_PRIMITIVE: cumulative Job CPU time kills a busy fixture before wall deadline：CPU_TIME FAIL/BLOCKED: infinite busy fixture accumulated 29531250 ticks and required helper termination (DEADLINE); configuring JOB_TIME is not enforcement evidence

修前 305 项为 295 PASS/8 NOT_RUN/2 FAIL：CPU 超限和 TOCTOU 拒绝码枚举缺口。后者 OS 拒绝路径解析、没有返回外部 payload，原 fixture 只完成 17 次 attack 响应，不能算完整通过；原断言未改，最终同一未修改断言完成 40/40 并通过，不覆盖此历史 FAIL，也没有修正 fixture 的码枚举可移植性缺口。独立 80 次严格攻击同样单列，不覆盖原记录。CPU 无资格继续是实质性生产 blocker。

## 最终未运行项

- real OS file symlink is rejected without following its target：NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
- real OS dir link is rejected：NOT_RUN: real OS link fixture unavailable (EPERM); no simulated OS PASS
- M1.4 production combination and independent pre-pinned bootstrap/Grant bridge：NOT_RUN / BLOCKED: independent approved accounts/profile and deployment bootstrap wiring are unavailable
- positive protected-pin attestation：NOT_RUN: existing Node image has an unprotected inherited DACL; no ACL was modified. The actual unprotected DACL was rejected.
- M15-PIPE production cross-account protected bootstrap and effective client-instance denial：NOT_RUN / BLOCKED: approved distinct standard accounts, exact deployment ACL/profile and startup objects are absent; same-account primitives grant no qualification
- M151 REAL_WINDOWS_PRIMITIVE: actual file link cannot escape the directory handle boundary：BLOCKED: OS refused file fixture (EPERM); no privilege or policy changed
- M151 REAL_WINDOWS_PRIMITIVE: actual dir link cannot escape the directory handle boundary：BLOCKED: OS refused dir fixture (EPERM); no privilege or policy changed
- job-orphan：Parent-exited/child-alive window not observed in this managed environment

8 个 TAP skip 在总数计为 NOT_RUN，其中新 symlink fixture 明确因 OS 禁止而 BLOCKED；两种视图不混淆。未部署的其他攻击如真实 Host 重启、网络/管理库/其他项目/Artifact 直接访问也 BLOCKED/NOT_RUN，不能因为没有空壳测试项就从报告省略。

## 交付和边界

完整源码、测试、fixtures、逐事件 JSON、TAP、stdout/stderr、环境、源码/数据快照、CPU 原始请求/响应、独立报告、历史保全与 SHA256 清单均随交付保存。临时源码/测试数据只有在 zip 逐成员验证后才删除本轮副本；原始文件字节在 ZIP 中可复验。

没有创建 Windows 用户、配置 ACL/AppContainer/登录权/Task/防火墙/服务/驱动，没有修改 Ubuntu 或其他项目，没有 Provider/科研/Git commit/push。只读部署预检和新逐项审批清单已给出。PROCESS/EXTERNAL_EFFECT 固定 BLOCKED，所有不确定资源保留，未知副作用没有自动重试。

## 全部本轮完整运行

| Run | 源集合前缀 | PASS / FAIL / NOT_RUN | exit |
|---|---|---|---|
| baseline-2026-11-07T19-12-47-387Z-18824 | a55823fae02f | 253 / 20 / 9 | 1 |
| baseline-corrected-2026-11-07T19-16-22-964Z-38000 | a55823fae02f | 265 / 1 / 23 | 1 |
| baseline-host-account-2026-11-07T19-19-25-025Z-18624 | a55823fae02f | 276 / 0 / 13 | 0 |
| final-2026-11-07T19-34-37-992Z-27356 | 4825d2432a01 | 295 / 2 / 8 | 1 |
| final-2026-11-07T19-55-23-372Z-7880 | 3f4c9e1b30f7 | 296 / 1 / 8 | 1 |

| CPU Run | 源集合前缀 | PASS / FAIL | 根/树/EOF/历史闭合 | Job/process句柄关闭 |
|---|---|---|---|---|
| 2026-11-07T19-32-42-737Z-19340 | 4825d2432a01 | 1 / 57 | 56/58 | 58/58 |
| 2026-11-07T19-49-58-861Z-25456 | 3f4c9e1b30f7 | 2 / 56 | 58/58 | 58/58 |

原始 M1.5 为 265 PASS / 1 FAIL / 23 NOT_RUN，CPU 0 PASS / 10 FAIL；所有历史标签保留。表中 PS5 工具选择失败不作产品资格，新源码通过的任何用例不覆盖旧失败。
