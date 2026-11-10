# AgentNexus M2.0 独立安全与集成审查

基础快照的独立测试 84/84 与 5 组离线探针通过；最后 3 文件一致性增量另行重跑 16/16 并验证状态与风险文案通过。相关缺陷均修复或通过明确阻断缓解；Local 授权范围可接受，此结论不表示全量测试或 Hardened/OS 资格通过。

审查时间：2026-11-09T21:13:48.359Z（UTC）。独立审查员仅审查和测试，未修改产品源码；修复由主代理完成。

## 审查范围与方式

读取 AGENTS.md、治理 policy 与工作流路由；project-rules/README.md 不存在。对 Security Profile/Controller、CredMan/WinCred、Desktop Service、Vault、统一 Model/Tool Gateway、Ledger/Campaign、Policy、IPC/preload、renderer 进行静态控制流和调用点检查，并以合成离线探针检验数据落盘、删除故障、空 Guard、预算与网络前准入。

源码：I:\AI_AgentNexus\deliverables\AgentNexus-M2.0\source\

基线：I:\AI_AgentNexus\deliverables\AgentNexus-M1.8.3-Q4.2\source

## 冻结与 SHA256

最终交付源码树：`90fc4f36f6d3798dc0163d81eb1647b4930c30c79fc26d24fdc5ebe9e0619f0b`，覆盖 283 个文件。

84 项基础核心/离线回归执行前后源码树均为 `3f75bb9ec4332cb607c04ae554f30b3167e7ff3e7350e9e1aa0406dfd2bb4bc2`，完全相同。其后仅 E2E 工具补充实际截图绘制同步与真实进程退出等待，形成已审快照 `ac57c46408b911a5cf73aeb2c9815c6d5ac7faa4b119c812a82f2313e16333b9`；UI 11/11 记录属于这一快照。

最后一致性增量仅修改 profile.ts、controller.ts、m20-security.test.ts 三文件。已独立确认无其他文件变化或删除，并重跑相关 16 项测试；该增量复测前后源码树均为最终交付 hash，完全相同。旧 84 项、5 组探针及 UI 11/11 的执行记录保留，不伪装成最终新树上的重跑。

算法：按路径排序，每项拼接“相对路径 + NUL + 文件 SHA256 + LF”后再计算 SHA256。包含 src、desktop、config、native、tools、tests 与根 README/package/tsconfig/.gitignore；排除 dist、node_modules、.git、__pycache__。完整逐文件清单见运行证据 source-manifest-final.json；本报告 JSON 内另附重点审查文件散列。

| 重点源码 | SHA256 |
|---|---|
| src/agentnexus/security/profile.ts | `4e87a6ddb4408c8e1218bc2911cbde69f2112809786c1048f1c9e7915aba173c` |
| src/agentnexus/security/controller.ts | `7f1050451ac41b8334b5a507d9017885b58c714f8811053283e16cba67223bd3` |
| src/agentnexus/security/os-credentials.ts | `07d8058963a51ed9274c35cb44a4aee34376b1c432cca09d6d0a839a9d714316` |
| src/agentnexus/security/wincred.ps1 | `85c5a27141226f7c1313b82a07f2f8209d18c29f440ec49a561b108b6e5f15d5` |
| src/agentnexus/security/local-transport.ts | `eb1d412840cce4d742900c535b0ed20ef1b8d6dd2016bd07c8a365cf78fe70d1` |
| src/agentnexus/desktop/service.ts | `68d5d8f9da9b8058175266fb6b8c102878511020f6a2b54e3c2b40c422a7bbbb` |
| src/agentnexus/desktop/synthetic-credential-fixture.ts | `3747b929ee15919fb37beccd347a999619d69b67a8a4cb847c8e0d2dccf68535` |
| src/agentnexus/model-runtime/vault.ts | `4a040e322b53e6345cc38c31df412dd8c1b3e8f3f97c1b2c9d49ece92fc12e6d` |
| src/agentnexus/model-runtime/gateway.ts | `6336c8c7ec297809ff6828bddde60cd68f38266b2740d1936117eee82fb366d7` |
| src/agentnexus/model-runtime/ledger.ts | `550bb262dfcf31980d8b807eb2a12585a23dfbc8ee067f82191c1748c8025d44` |
| src/agentnexus/model-runtime/campaign.ts | `a5dc50b421095acde5f7dbb506b715ab81d391d2d482fbb0684994d67ed3b77f` |
| src/agentnexus/model-runtime/transport.ts | `0bf624ca603644592a8c6160cca8b9dfa718e9c940720dcb6717ddbaa9aff128` |
| src/agentnexus/policy.ts | `6f44c4fb12fa8069304a2b46ff04f4285db32e7e6f7bb47d6bb4c50401e4deca` |
| src/agentnexus/gateway.ts | `dbd04f9ee13a593d8d83baec5965d1e5cc0e2e8d60335566775784cd626953ae` |
| src/agentnexus/harness/index.ts | `b68d45cb277a961f90483c2db3f2631d2f51e6647cb17942171e3c647f5eeffb` |
| src/agentnexus/harness/messages.ts | `8dfb52b20d4ecce466efe7069899eeee87c0902db33a9666acab2c98d8208821` |
| desktop/main.mjs | `a6eccd481a92f198591a0a9b29d3b793dacb90c13416a98b35565bf69b0fd842` |
| desktop/preload.cjs | `2373f38e779eb7bc13cd6ba352d48f7c1665dadd9b562865f32e5f285f013c23` |
| desktop/sender.mjs | `b6169254d2dd8ff6a9e57baa45c224c3c917a2001fd95b4ed24408e3c1333e73` |
| desktop/renderer/security.js | `8c532f77731a3349ae1737d1a069ce45c14c2f5e64aaca582afd037050d5ae54` |
| desktop/renderer/app.js | `b0e3b6b45a55845819b7f89c531705010c00d73a189fb03de85dd0cf88dc7caf` |
| tests/agentnexus/m20-security.test.ts | `1eb411069184a2c2d6e144b24b653d720e94c8646ef013f60e94ce84b9315a7d` |
| tests/agentnexus/m20-recovery.test.ts | `a5f571b3f7ae201754be8cfe035653ded7fcfb4c47f05d8e1acac0a9a7519312` |
| tests/desktop/m20-local.test.ts | `db783682d66c40c7f7bdc203e61691a602045fdd3893ef9d33ac7a0459bf675a` |
| tools/agentnexus/m20-desktop-e2e.mjs | `27125861987721fddccd22e3824403d135e6771fe40fba5f3d88699afc347e60` |
| README.md | `0c4b54fedb23fada4d87c75116903f646607d55adf2c0c5f346d85006257d4f5` |

## 最终实际验证

| 执行来源 | 范围 | 结果 |
|---|---|---|
| 独立审查员（基础快照） | M20 security/recovery + Ledger + Model/Tool Gateway | 64/64 PASS |
| 独立审查员（基础快照） | Vault 合成回归；按名称排除 DPAPI 与 unsafe-path 测试 | 20/20 PASS |
| 独立审查员（基础快照） | 5 组独立离线探针，含 6 个 Local HTTPS 准入检查 | 5/5 PASS |
| 独立审查员（最终增量） | M20 security/recovery 重跑 | 16/16 PASS；与旧覆盖重叠，不相加为独立用例数 |
| 独立审查员（最终增量） | Hardened desired=false 状态及风险文案；Local 对照 | PASS：BLOCKED / 未 acknowledgement；Local DISABLED |
| 主代理原始证据 | strict typecheck、build、M20/native Local/旧 Desktop 定向 | typecheck/build PASS；32/32 PASS |
| 主代理原始证据 | 完整回归 | 782 PASS / 3 FAIL / 20 SKIP |

主代理 Electron E2E：PASS；11/11 步 PASS，截图 5 张。原始结果：I:/AI_AgentNexus/.workflow-kit/runtime/AgentNexus-M2.0/desktop-e2e/run-fukypu/results.json。该运行不是独立审查员执行，且早于最终三文件增量；保留为 Local 行为及未应用 Hardened 阻断计划的证据，不宣称在最终新树上重跑过 UI。

独立探针分别验证：新 Secret 不产生意图审计；外部存储删除成功但 ACK 丢失后可重开；expiry/known-secret quarantine 不复活 DELETING；关闭 OS 存储时零 unprotect、阻断 metadata/prompt 落盘；端点开关、HTTPS、价格、请求内容与 Profile revision 的网络前约束。调用 send 的两个负向探针还使用已 aborted 的 signal，网络请求为 0。环境中的 REAL/价格标签仅是准入测试 metadata，不作为 OS 保护证据。

命令均以 source 为工作目录，测试数据写入独立 runtime 路径；输出文件名和环境变量见 JSON 的 commands。

```powershell
$env:AGENTNEXUS_TEST_DATA_ROOT = "I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\independent-review\final-targeted-data"
node --test --test-concurrency=1 --test-reporter=tap tests/agentnexus/m20-security.test.ts tests/agentnexus/m20-recovery.test.ts tests/agentnexus/m18-ledger.test.ts tests/agentnexus/m18-gateway.test.ts tests/agentnexus/gateway.test.ts
$env:AGENTNEXUS_TEST_DATA_ROOT = "I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\independent-review\final-vault-data"
node --test --test-concurrency=1 --test-reporter=tap --test-skip-pattern='DPAPI|refuses wrong' tests/agentnexus/m18-vault.test.ts
node I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\independent-review\independent-probes.mjs
node I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\independent-review\capture-source-manifest.mjs source-manifest-before-final-tests.json
node I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\independent-review\capture-source-manifest.mjs source-manifest-final.json
$env:AGENTNEXUS_TEST_DATA_ROOT = "I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\independent-review\hardening-status-delta-data"
node --test --test-concurrency=1 --test-reporter=tap tests/agentnexus/m20-security.test.ts tests/agentnexus/m20-recovery.test.ts
node I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\independent-review\hardening-status-risk-probe.mjs
```

最终三文件一致性修正由主代理收尾自检发现，独立审查员另行复核：Hardened 未绑定预算开关即使 requested=false 也保持 BLOCKED；影响计划不再称其会停止执行，而说明关闭尚未得到 owner 确认。该修正没有使远程预算绑定或整体 Hardened 获得资格。

## 确认问题与修复状态

| ID / 级别 | 问题 | 最终状态及证据 |
|---|---|---|
| IR-01 / P1 | 新提交 Key 在导入校验之前写入凭证意图审计 | FIXED_AND_RETESTED：导入前对 Provider、scope、label、rotate_id 等完整 metadata 扫描新提交 Secret；最终意图审计行数为 0。 |
| IR-02 / P2 | OS 删除已成功但 ACK 丢失导致 Vault 重开失败；删除态可被过期或隔离覆盖 | FIXED_AND_RETESTED：先持久化 DELETING；重开跳过待删除引用；expiry、setState、guard quarantine 不复活删除态，可重试删除。 |
| IR-03 / P1 | 关闭 OS Storage 后空 Guard 仍声称固定防泄漏生效，并允许秘密进入 metadata | FIXED_AND_RETESTED：metadata-only 不读取 OS Secret；防泄漏显示 BLOCKED，任意文本 metadata 写入与 Agent prompt capture 前阻断；无 Guard 时不允许添加自由文本 scope。 |
| IR-04 / P2 | 可配置预算改动丢失既有 overdrawn 隔离；自动 configure 可清除标记 | FIXED_AND_RETESTED：无可选 controls 时保持旧 overdrawn 阻断；启用维度的 overrun 继续阻断；相同 limits 不重置标记，修改 limits 保留 overrun。 |
| IR-05 / P2 | 远程 Broker 先返回导致新准入钩子被绕过，Remote Profile 控制未绑定 | MITIGATED_BY_BLOCKING_UNBOUND_HARDENED_PATH：beforeDispatch 已移至 Broker 分支前；未绑定 Hardened Budget Controls 无论 desired=true/false 均显示 BLOCKED；preview 明确 requested disable 未获 owner acknowledgement，不再声称 will stop。整体 Hardened 派发阻断，完整 Remote Profile 绑定仍未完成。 |
| IR-06 / P2 | 原生 Helper 队列等待后未重查 poison 可在未确认终止后继续派发 | STATIC_FIX_VERIFIED：取得队列 slot 后再次检查 poison，已排队项在 restart-required 状态拒绝；本审查未把该静态检查当作原生终止资格测试。 |
| IR-07 / P2 | 部分注册开关只有配置状态，缺少使用方绑定 | LOCAL_BINDINGS_VERIFIED_REMOTE_LIMITATIONS_RETAINED：Local 的 costDisplay、消息/凭证附加审计、requestsPerMinute、Key rate control 与 endpoint restriction 已绑定使用方；其中 endpoint 控制另有离线正反向准入验证。远程未绑定项保持 BLOCKED。 |

初次运行还发现测试 fixture 的 PROCESS 注册缺 writer_resource；修正后相关 validation、write-approval 和 sandbox owner 测试实际执行通过。原生 namespace 检查为同步拒绝的断言也由主代理修正；测试修正不被算作新的 OS 资格。

## 保留限制与未通过门禁

- 真实 API Key 和真实 Provider 请求均为 0；Local HTTPS 只验证网络前准入/拒绝，未验证真实 Provider 连通性、费用或账单。
- 独立审查员未执行原生 OS Credential Manager/DPAPI 资格测试；主代理的 32/32 定向原始记录包含真实当前用户 CredMan 对合成字节的写读删与 Local Desktop 迁移测试，作为单独来源引用。
- Hardened 整体保持 BLOCKED，OS 身份/隔离、sandbox、TPM/CMS、资源限制资格不是 PASS；Remote Profile Budget Controls 完整绑定仍缺失。
- 已存在旧 Host 且无 Profile 时保留严格模式和 UNRESOLVED_LEGACY_LEDGER_NO_MIGRATION；切回 Local 也不自动重建 REAL 100M 授权或放行 REAL。
- 完整回归保留 782 PASS / 3 FAIL / 20 SKIP。CPU、uncooperative-owner 和 breakaway 三项原始失败均保留；baseline/candidate 后续对照均 1 PASS / 2 FAIL，不覆盖或抹除原始全量失败。
- Electron 全流程与截图由主代理执行。本审查独立检查了 IPC 来源绑定、preload 白名单、renderer escaping/CSP、UI 到后端的静态绑定及截图工具增量；E2E 结果按原始证据另行归属，不被改记为独立执行。
- Local 仅承诺当前用户凭证静态保护；不承诺抵抗同 SID 或管理员恶意进程。

全量三项失败为 m14-native.test.ts 的 cumulative Job CPU、m14-production.test.ts 的 uncooperative owners、m151-lifecycle.test.ts 的 CREATE_BREAKAWAY_FROM_JOB。只读 baseline 对照和独立 SHA256 对照显示相关旧测试与 production 逻辑未为本次通过而修改；这不证明所有失败都只是环境原因，也不使旧门禁获得 PASS。

## 证据位置

- 独立证据：I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\independent-review
- 主代理最终定向：I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\verification\2026-11-09T21-10-09-346Z-53600\results.json
- 主代理完整回归：I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\verification\2026-11-09T20-28-37-968Z-26960\results.json
- 主代理 baseline 对照：I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M2.0\baseline-comparison\2026-11-09T20-45-14-918Z\results.json

审查员未使用真实 Key/Provider，未创建账户/服务，未修改 ACL、TPM、证书或 UAC，未 commit/push。主代理的图形界面最终结果由总体验收报告单独记录。
