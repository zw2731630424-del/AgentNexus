import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const runtime = dirname(fileURLToPath(import.meta.url));
const source = fileURLToPath(new URL('../../../../deliverables/AgentNexus-M2.0/source/', import.meta.url));
const reports = fileURLToPath(new URL('../../../../deliverables/AgentNexus-M2.0/reports/', import.meta.url));
const workspace = fileURLToPath(new URL('../../../../', import.meta.url));
const readJson = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const before = await readJson(join(runtime, 'source-manifest-before-final-tests.json'));
const afterCore = await readJson(join(runtime, 'source-manifest-after-core-tests.json'));
const previousFinal = await readJson(join(runtime, 'source-manifest-before-hardening-status-delta.json'));
const incrementalBefore = await readJson(join(runtime, 'source-manifest-before-hardening-status-tests.json'));
const incrementalAfter = await readJson(join(runtime, 'source-manifest-after-hardening-status-tests.json'));
const after = await readJson(join(runtime, 'source-manifest-final.json'));
if (before.source_tree_sha256 !== afterCore.source_tree_sha256) throw Error('SOURCE_CHANGED_DURING_CORE_TESTS');
const allowedPostTestDelta = previousFinal.files.filter(file => afterCore.files.find(old=>old.path===file.path)?.sha256 !== file.sha256).map(file=>({path:file.path,before_sha256:afterCore.files.find(old=>old.path===file.path)?.sha256,after_sha256:file.sha256}));
if (allowedPostTestDelta.some(file=>file.path!=='tools/agentnexus/m20-desktop-e2e.mjs') || afterCore.files.some(old=>!previousFinal.files.some(file=>file.path===old.path))) throw Error('UNAUTHORIZED_POST_TEST_SOURCE_CHANGE');
const finalDelta = after.files.filter(file => previousFinal.files.find(old=>old.path===file.path)?.sha256 !== file.sha256).map(file=>({path:file.path,before_sha256:previousFinal.files.find(old=>old.path===file.path)?.sha256,after_sha256:file.sha256}));
const expectedFinalDelta = ['src/agentnexus/security/controller.ts','src/agentnexus/security/profile.ts','tests/agentnexus/m20-security.test.ts'];
if (finalDelta.map(f=>f.path).sort().join('|')!==expectedFinalDelta.sort().join('|') || previousFinal.files.some(old=>!after.files.some(file=>file.path===old.path))) throw Error('UNAUTHORIZED_FINAL_INCREMENTAL_CHANGE');
if (incrementalBefore.source_tree_sha256!==incrementalAfter.source_tree_sha256 || incrementalAfter.source_tree_sha256!==after.source_tree_sha256) throw Error('SOURCE_CHANGED_DURING_INCREMENTAL_TESTS');
for (const file of after.files) if (sha(await readFile(join(source, file.path))) !== file.sha256) throw Error('FROZEN_SOURCE_CHANGED:' + file.path);
const probes = await readJson(join(runtime, 'independent-probes-latest.json'));
const countTap = async filename => {
  const text = await readFile(join(runtime, filename), 'utf8');
  const n = key => Number(new RegExp('^# ' + key + ' (\\d+)', 'm').exec(text)?.[1] ?? 0);
  return { tests: n('tests'), pass: n('pass'), fail: n('fail'), skipped: n('skipped'), evidence: join(runtime, filename), sha256: sha(Buffer.from(text)) };
};
const targeted = await countTap('final-targeted.tap.txt'), vault = await countTap('final-vault.tap.txt');
const incremental = await countTap('hardening-status-delta.tap.txt');
const riskProbe = await readJson(join(runtime,'hardening-status-risk-probe.json'));
if (targeted.fail || vault.fail || probes.findings.some(f => f.status !== 'PASS')) throw Error('INDEPENDENT_FINAL_CHECK_NOT_PASSING');
if(incremental.tests!==16||incremental.fail||riskProbe.status!=='PASS')throw Error('INCREMENTAL_CHECK_NOT_PASSING');
const primaryTargetedPath = join(workspace, '.workflow-kit/runtime/AgentNexus-M2.0/verification/2026-11-09T21-10-09-346Z-53600/results.json');
const primaryFullPath = join(workspace, '.workflow-kit/runtime/AgentNexus-M2.0/verification/2026-11-09T20-28-37-968Z-26960/results.json');
const primaryComparisonPath = join(workspace, '.workflow-kit/runtime/AgentNexus-M2.0/baseline-comparison/2026-11-09T20-45-14-918Z/results.json');
const primaryTargeted = await readJson(primaryTargetedPath), primaryFull = await readJson(primaryFullPath), comparison = await readJson(primaryComparisonPath);
const baselineComparison = await readJson(join(runtime, 'legacy-native-baseline-comparison.json'));
const e2ePath = process.argv[2];
const e2e = e2ePath ? await readJson(e2ePath) : undefined;
const important = ['src/agentnexus/security/profile.ts','src/agentnexus/security/controller.ts','src/agentnexus/security/os-credentials.ts','src/agentnexus/security/wincred.ps1','src/agentnexus/security/local-transport.ts','src/agentnexus/desktop/service.ts','src/agentnexus/desktop/synthetic-credential-fixture.ts','src/agentnexus/model-runtime/vault.ts','src/agentnexus/model-runtime/gateway.ts','src/agentnexus/model-runtime/ledger.ts','src/agentnexus/model-runtime/campaign.ts','src/agentnexus/model-runtime/transport.ts','src/agentnexus/policy.ts','src/agentnexus/gateway.ts','src/agentnexus/harness/index.ts','src/agentnexus/harness/messages.ts','desktop/main.mjs','desktop/preload.cjs','desktop/sender.mjs','desktop/renderer/security.js','desktop/renderer/app.js','tests/agentnexus/m20-security.test.ts','tests/agentnexus/m20-recovery.test.ts','tests/desktop/m20-local.test.ts','tools/agentnexus/m20-desktop-e2e.mjs','README.md'];
const reviewedFiles = important.map(path => { const file = after.files.find(f => f.path === path); if (!file) throw Error('MANIFEST_FILE_MISSING:' + path); return file; });
const findings = [
  { id: 'IR-01', severity: 'P1', title: '新提交 Key 在导入校验之前写入凭证意图审计', discovery: 'SYNTHETIC_OFFLINE_REPRODUCED', status: 'FIXED_AND_RETESTED', files: ['src/agentnexus/desktop/synthetic-credential-fixture.ts'], original_evidence: 'pending-secret-probe.json', final_probe: 'newly_submitted_secret_audit', resolution: '导入前对 Provider、scope、label、rotate_id 等完整 metadata 扫描新提交 Secret；最终意图审计行数为 0。' },
  { id: 'IR-02', severity: 'P2', title: 'OS 删除已成功但 ACK 丢失导致 Vault 重开失败；删除态可被过期或隔离覆盖', discovery: 'SYNTHETIC_FAULT_INJECTION_REPRODUCED', status: 'FIXED_AND_RETESTED', files: ['src/agentnexus/model-runtime/vault.ts'], original_evidence: ['delete-failure-probe.json','delete-expiry-probe.json','delete-guard-probe.json'], final_probe: ['delete_success_ack_lost','pending_delete_expiry_and_guard'], resolution: '先持久化 DELETING；重开跳过待删除引用；expiry、setState、guard quarantine 不复活删除态，可重试删除。' },
  { id: 'IR-03', severity: 'P1', title: '关闭 OS Storage 后空 Guard 仍声称固定防泄漏生效，并允许秘密进入 metadata', discovery: 'SYNTHETIC_OFFLINE_REPRODUCED', status: 'FIXED_AND_RETESTED', files: ['src/agentnexus/security/profile.ts','src/agentnexus/security/controller.ts','src/agentnexus/desktop/service.ts','src/agentnexus/model-runtime/vault.ts'], original_evidence: ['storage-off-redaction-probe.json','storage-off-profile-probe.json'], final_probe: 'storage_disabled_known_redaction', resolution: 'metadata-only 不读取 OS Secret；防泄漏显示 BLOCKED，任意文本 metadata 写入与 Agent prompt capture 前阻断；无 Guard 时不允许添加自由文本 scope。' },
  { id: 'IR-04', severity: 'P2', title: '可配置预算改动丢失既有 overdrawn 隔离；自动 configure 可清除标记', discovery: 'EXISTING_REGRESSION_TEST_REPRODUCED_AND_STATIC_REVIEW', status: 'FIXED_AND_RETESTED', files: ['src/agentnexus/model-runtime/ledger.ts'], original_evidence: 'integration-regression.tap.txt', final_evidence: 'final-targeted.tap.txt', resolution: '无可选 controls 时保持旧 overdrawn 阻断；启用维度的 overrun 继续阻断；相同 limits 不重置标记，修改 limits 保留 overrun。' },
  { id: 'IR-05', severity: 'P2', title: '远程 Broker 先返回导致新准入钩子被绕过，Remote Profile 控制未绑定', discovery: 'STATIC_CONTROL_FLOW_CONFIRMED', status: 'MITIGATED_BY_BLOCKING_UNBOUND_HARDENED_PATH', files: ['src/agentnexus/model-runtime/gateway.ts','src/agentnexus/security/profile.ts','src/agentnexus/security/controller.ts','src/agentnexus/desktop/service.ts'], resolution: 'beforeDispatch 已移至 Broker 分支前；未绑定 Hardened Budget Controls 无论 desired=true/false 均显示 BLOCKED；preview 明确 requested disable 未获 owner acknowledgement，不再声称 will stop。整体 Hardened 派发阻断，完整 Remote Profile 绑定仍未完成。' },
  { id: 'IR-06', severity: 'P2', title: '原生 Helper 队列等待后未重查 poison 可在未确认终止后继续派发', discovery: 'STATIC_REVIEW_ONLY', status: 'STATIC_FIX_VERIFIED', files: ['src/agentnexus/security/os-credentials.ts'], resolution: '取得队列 slot 后再次检查 poison，已排队项在 restart-required 状态拒绝；本审查未把该静态检查当作原生终止资格测试。' },
  { id: 'IR-07', severity: 'P2', title: '部分注册开关只有配置状态，缺少使用方绑定', discovery: 'STATIC_REFERENCE_SEARCH_CONFIRMED', status: 'LOCAL_BINDINGS_VERIFIED_REMOTE_LIMITATIONS_RETAINED', files: ['desktop/renderer/app.js','src/agentnexus/harness/index.ts','src/agentnexus/harness/messages.ts','src/agentnexus/desktop/service.ts','src/agentnexus/security/local-transport.ts'], final_probe: 'local_https_admission', resolution: 'Local 的 costDisplay、消息/凭证附加审计、requestsPerMinute、Key rate control 与 endpoint restriction 已绑定使用方；其中 endpoint 控制另有离线正反向准入验证。远程未绑定项保持 BLOCKED。' },
];
const commands = [
  { id: 'SOURCE_BEFORE', command: 'node ' + join(runtime,'capture-source-manifest.mjs') + ' source-manifest-before-final-tests.json' },
  { id: 'TARGETED', environment: { AGENTNEXUS_TEST_DATA_ROOT: join(runtime,'final-targeted-data') }, command: 'node --test --test-concurrency=1 --test-reporter=tap tests/agentnexus/m20-security.test.ts tests/agentnexus/m20-recovery.test.ts tests/agentnexus/m18-ledger.test.ts tests/agentnexus/m18-gateway.test.ts tests/agentnexus/gateway.test.ts', result: targeted },
  { id: 'VAULT_SYNTHETIC', environment: { AGENTNEXUS_TEST_DATA_ROOT: join(runtime,'final-vault-data') }, command: "node --test --test-concurrency=1 --test-reporter=tap --test-skip-pattern='DPAPI|refuses wrong' tests/agentnexus/m18-vault.test.ts", excluded_by_name: ['DPAPI','refuses wrong'], result: vault },
  { id: 'INDEPENDENT_PROBES', command: 'node ' + join(runtime,'independent-probes.mjs'), result: { groups: probes.findings.length, pass: probes.findings.filter(f=>f.status==='PASS').length, fail: probes.findings.filter(f=>f.status!=='PASS').length } },
  { id: 'SOURCE_AFTER', command: 'node ' + join(runtime,'capture-source-manifest.mjs') + ' source-manifest-final.json' },
  { id: 'FINAL_INCREMENTAL', environment: {AGENTNEXUS_TEST_DATA_ROOT:join(runtime,'hardening-status-delta-data')}, command: 'node --test --test-concurrency=1 --test-reporter=tap tests/agentnexus/m20-security.test.ts tests/agentnexus/m20-recovery.test.ts', result: incremental },
  { id: 'FINAL_STATUS_RISK_PROBE', command: 'node '+join(runtime,'hardening-status-risk-probe.mjs'), result: riskProbe },
];
const limitations = [
  '真实 API Key 和真实 Provider 请求均为 0；Local HTTPS 只验证网络前准入/拒绝，未验证真实 Provider 连通性、费用或账单。',
  '独立审查员未执行原生 OS Credential Manager/DPAPI 资格测试；主代理的 32/32 定向原始记录包含真实当前用户 CredMan 对合成字节的写读删与 Local Desktop 迁移测试，作为单独来源引用。',
  'Hardened 整体保持 BLOCKED，OS 身份/隔离、sandbox、TPM/CMS、资源限制资格不是 PASS；Remote Profile Budget Controls 完整绑定仍缺失。',
  '已存在旧 Host 且无 Profile 时保留严格模式和 UNRESOLVED_LEGACY_LEDGER_NO_MIGRATION；切回 Local 也不自动重建 REAL 100M 授权或放行 REAL。',
  '完整回归保留 782 PASS / 3 FAIL / 20 SKIP。CPU、uncooperative-owner 和 breakaway 三项原始失败均保留；baseline/candidate 后续对照均 1 PASS / 2 FAIL，不覆盖或抹除原始全量失败。',
  'Electron 全流程与截图由主代理执行。本审查独立检查了 IPC 来源绑定、preload 白名单、renderer escaping/CSP、UI 到后端的静态绑定及截图工具增量；E2E 结果按原始证据另行归属，不被改记为独立执行。',
  'Local 仅承诺当前用户凭证静态保护；不承诺抵抗同 SID 或管理员恶意进程。',
];
const result = {
  schema: 'agentnexus/m20/independent-review/1', generated_at: new Date().toISOString(), status: 'LOCAL_SCOPE_VERIFIED_WITH_EXPLICIT_LIMITATIONS',
  conclusion: '基础快照的独立测试 84/84 与 5 组离线探针通过；最后 3 文件一致性增量另行重跑 16/16 并验证状态与风险文案通过。相关缺陷均修复或通过明确阻断缓解；Local 授权范围可接受，此结论不表示全量测试或 Hardened/OS 资格通过。',
  reviewer: { role: 'Independent safety and integration reviewer', product_source_modified: false, recursive_delegation: false },
  environment: { platform: process.platform, node: process.version, executable: process.execPath, cwd: source },
  source: { candidate: source, baseline: join(workspace,'deliverables/AgentNexus-M1.8.3-Q4.2/source'), source_tree_sha256: after.source_tree_sha256, core_test_before_sha256: before.source_tree_sha256, core_test_after_sha256: afterCore.source_tree_sha256, unchanged_during_core_tests: true, first_review_final_sha256:previousFinal.source_tree_sha256, allowed_post_test_delta: allowedPostTestDelta, final_incremental_delta:finalDelta, incremental_test_before_sha256:incrementalBefore.source_tree_sha256, incremental_test_after_sha256:incrementalAfter.source_tree_sha256, unchanged_during_incremental_tests:true, unrelated_sources_unchanged:true, delta_review: 'Base-run followup only changed the E2E test tool. Final incremental review changed exactly profile.ts, controller.ts and m20-security.test.ts: unbound remote desired=false remains BLOCKED and risk text does not acknowledge disable. Relevant 16 tests and a direct risk-text/status probe reran; unrelated suites were not rerun.', file_count: after.file_count, method: after.method, excluded: after.excluded, manifest: join(runtime,'source-manifest-final.json'), manifest_sha256: sha(await readFile(join(runtime,'source-manifest-final.json'))), reviewed_files: reviewedFiles },
  independent_verification: { attribution:'84 tests and 5 probe groups belong to the preserved base snapshot; incremental 16 tests overlap prior coverage and are reported separately, not as 100 distinct tests.', tests: targeted.tests+vault.tests, pass: targeted.pass+vault.pass, fail: targeted.fail+vault.fail, probe_groups: probes.findings.length, probe_groups_pass: probes.findings.filter(f=>f.status==='PASS').length, incremental_validation:{...incremental,source_tree_sha256:after.source_tree_sha256,risk_probe:riskProbe}, real_keys: 0, real_provider_requests: 0, hardened_os_qualification: 'NOT_RUN', commands, probes, evidence_root: runtime },
  findings, open_confirmed_m20_bugs: [],
  primary_agent_evidence: { attribution: 'Raw artifacts read by reviewer; execution performed by primary agent, not reclassified as independent execution.', targeted: { path: primaryTargetedPath, results: primaryTargeted }, full: { path: primaryFullPath, results: primaryFull }, baseline_comparison: { path: primaryComparisonPath, results: comparison }, independent_legacy_hash_comparison: baselineComparison, electron_e2e: e2e ? {path:e2ePath,results:e2e,independently_executed:false,source_tree_sha256:previousFinal.source_tree_sha256,rerun_after_final_incremental_change:false,applicability:'Preserved Local UI run and unapplied blocked Hardened plan only; not a claimed E2E rerun on the final source tree.'} : { status: 'NOT_INDEPENDENTLY_ATTESTED', ownership: 'PRIMARY_ACCEPTANCE_REPORT' } },
  limitations,
  actions_not_performed_by_reviewer: ['real credential/provider usage','account or service creation','ACL/TPM/certificate/UAC changes','commit/push'],
};
await mkdir(reports,{recursive:true});
await writeFile(join(reports,'independent-review.json'),JSON.stringify(result,null,2)+'\n');
const lines = [
  '# AgentNexus M2.0 独立安全与集成审查', '',
  result.conclusion, '',
  `审查时间：${result.generated_at}（UTC）。独立审查员仅审查和测试，未修改产品源码；修复由主代理完成。`, '',
  '## 审查范围与方式', '',
  '读取 AGENTS.md、治理 policy 与工作流路由；project-rules/README.md 不存在。对 Security Profile/Controller、CredMan/WinCred、Desktop Service、Vault、统一 Model/Tool Gateway、Ledger/Campaign、Policy、IPC/preload、renderer 进行静态控制流和调用点检查，并以合成离线探针检验数据落盘、删除故障、空 Guard、预算与网络前准入。', '',
  `源码：${source}`, '',
  `基线：${result.source.baseline}`, '',
  '## 冻结与 SHA256', '',
  `最终交付源码树：\`${after.source_tree_sha256}\`，覆盖 ${after.file_count} 个文件。`, '',
  `84 项基础核心/离线回归执行前后源码树均为 \`${before.source_tree_sha256}\`，完全相同。其后仅 E2E 工具补充实际截图绘制同步与真实进程退出等待，形成已审快照 \`${previousFinal.source_tree_sha256}\`；UI 11/11 记录属于这一快照。`, '',
  `最后一致性增量仅修改 profile.ts、controller.ts、m20-security.test.ts 三文件。已独立确认无其他文件变化或删除，并重跑相关 16 项测试；该增量复测前后源码树均为最终交付 hash，完全相同。旧 84 项、5 组探针及 UI 11/11 的执行记录保留，不伪装成最终新树上的重跑。`, '',
  '算法：按路径排序，每项拼接“相对路径 + NUL + 文件 SHA256 + LF”后再计算 SHA256。包含 src、desktop、config、native、tools、tests 与根 README/package/tsconfig/.gitignore；排除 dist、node_modules、.git、__pycache__。完整逐文件清单见运行证据 source-manifest-final.json；本报告 JSON 内另附重点审查文件散列。', '',
  '| 重点源码 | SHA256 |', '|---|---|',
  ...reviewedFiles.map(f=>`| ${f.path} | \`${f.sha256}\` |`), '',
  '## 最终实际验证', '',
  '| 执行来源 | 范围 | 结果 |', '|---|---|---|',
  `| 独立审查员（基础快照） | M20 security/recovery + Ledger + Model/Tool Gateway | ${targeted.pass}/${targeted.tests} PASS |`,
  `| 独立审查员（基础快照） | Vault 合成回归；按名称排除 DPAPI 与 unsafe-path 测试 | ${vault.pass}/${vault.tests} PASS |`,
  `| 独立审查员（基础快照） | 5 组独立离线探针，含 6 个 Local HTTPS 准入检查 | 5/5 PASS |`,
  `| 独立审查员（最终增量） | M20 security/recovery 重跑 | ${incremental.pass}/${incremental.tests} PASS；与旧覆盖重叠，不相加为独立用例数 |`,
  '| 独立审查员（最终增量） | Hardened desired=false 状态及风险文案；Local 对照 | PASS：BLOCKED / 未 acknowledgement；Local DISABLED |',
  '| 主代理原始证据 | strict typecheck、build、M20/native Local/旧 Desktop 定向 | typecheck/build PASS；32/32 PASS |',
  '| 主代理原始证据 | 完整回归 | 782 PASS / 3 FAIL / 20 SKIP |', '',
  ...(e2e ? [`主代理 Electron E2E：${e2e.status}；${e2e.steps.filter(s=>s.status==='PASS').length}/${e2e.steps.length} 步 PASS，截图 ${e2e.screenshots.length} 张。原始结果：${e2ePath}。该运行不是独立审查员执行，且早于最终三文件增量；保留为 Local 行为及未应用 Hardened 阻断计划的证据，不宣称在最终新树上重跑过 UI。`, ''] : ['主代理 Electron E2E 最终结果在总体验收报告单独记录；本报告不替代该门禁。', '']),
  '独立探针分别验证：新 Secret 不产生意图审计；外部存储删除成功但 ACK 丢失后可重开；expiry/known-secret quarantine 不复活 DELETING；关闭 OS 存储时零 unprotect、阻断 metadata/prompt 落盘；端点开关、HTTPS、价格、请求内容与 Profile revision 的网络前约束。调用 send 的两个负向探针还使用已 aborted 的 signal，网络请求为 0。环境中的 REAL/价格标签仅是准入测试 metadata，不作为 OS 保护证据。', '',
  '命令均以 source 为工作目录，测试数据写入独立 runtime 路径；输出文件名和环境变量见 JSON 的 commands。', '',
  '```powershell',
  '$env:AGENTNEXUS_TEST_DATA_ROOT = "' + join(runtime,'final-targeted-data') + '"', commands[1].command,
  '$env:AGENTNEXUS_TEST_DATA_ROOT = "' + join(runtime,'final-vault-data') + '"', commands[2].command,
  commands[3].command, commands[0].command, commands[4].command,
  '$env:AGENTNEXUS_TEST_DATA_ROOT = "'+join(runtime,'hardening-status-delta-data')+'"',commands[5].command,commands[6].command,'```', '',
  '最终三文件一致性修正由主代理收尾自检发现，独立审查员另行复核：Hardened 未绑定预算开关即使 requested=false 也保持 BLOCKED；影响计划不再称其会停止执行，而说明关闭尚未得到 owner 确认。该修正没有使远程预算绑定或整体 Hardened 获得资格。', '',
  '## 确认问题与修复状态', '',
  '| ID / 级别 | 问题 | 最终状态及证据 |', '|---|---|---|',
  ...findings.map(f=>`| ${f.id} / ${f.severity} | ${f.title} | ${f.status}：${f.resolution} |`), '',
  '初次运行还发现测试 fixture 的 PROCESS 注册缺 writer_resource；修正后相关 validation、write-approval 和 sandbox owner 测试实际执行通过。原生 namespace 检查为同步拒绝的断言也由主代理修正；测试修正不被算作新的 OS 资格。', '',
  '## 保留限制与未通过门禁', '',
  ...limitations.map(x=>'- '+x), '',
  '全量三项失败为 m14-native.test.ts 的 cumulative Job CPU、m14-production.test.ts 的 uncooperative owners、m151-lifecycle.test.ts 的 CREATE_BREAKAWAY_FROM_JOB。只读 baseline 对照和独立 SHA256 对照显示相关旧测试与 production 逻辑未为本次通过而修改；这不证明所有失败都只是环境原因，也不使旧门禁获得 PASS。', '',
  '## 证据位置', '',
  `- 独立证据：${runtime}`, `- 主代理最终定向：${primaryTargetedPath}`, `- 主代理完整回归：${primaryFullPath}`, `- 主代理 baseline 对照：${primaryComparisonPath}`, '',
  '审查员未使用真实 Key/Provider，未创建账户/服务，未修改 ACL、TPM、证书或 UAC，未 commit/push。主代理的图形界面最终结果由总体验收报告单独记录。', '',
];
await writeFile(join(reports,'independent-review.md'),lines.join('\n'));
console.log(JSON.stringify({status:result.status,reports:[join(reports,'independent-review.md'),join(reports,'independent-review.json')],source_tree_sha256:after.source_tree_sha256,tests:result.independent_verification.tests,pass:result.independent_verification.pass,probe_groups_pass:result.independent_verification.probe_groups_pass}));
