from pathlib import Path
import hashlib, importlib.util, json, re, zipfile
from datetime import datetime, timezone

ROOT = Path('I:/AI_AgentNexus')
D = ROOT / 'deliverables/AgentNexus-Model-Provider-UI'
S = D / 'source'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def write(rel, value):
    path = D / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

static = load(D / 'raw/static-2026-11-08T14-02-23-332Z/checks.json')
manifest = load(D / 'raw/static-2026-11-08T14-02-23-332Z/source-manifest.json')
for f in manifest['files']:
    assert sha(S / f['path']) == f['sha256'], 'Source changed after final static check: ' + f['path']

old_manifest = load(ROOT / 'deliverables/AgentNexus-M1.8.2/source.manifest.json')
changed = []
for f in old_manifest['files']:
    old = ROOT / 'deliverables/AgentNexus-M1.8.2/source' / f['path']
    assert sha(old) == f['sha256'], 'Historical source changed: ' + f['path']
    if sha(S / f['path']) != f['sha256']: changed.append(f['path'])
assert set(changed) == {'package.json', 'package-lock.json', 'src/agentnexus/model-runtime/vault.ts'}, changed
write('evidence/source-preservation.json', {'historical_m182_source_files': len(old_manifest['files']), 'historical_source': 'UNCHANGED_ALL_MANIFEST_HASHES_MATCH', 'derived_source_changed_files': changed, 'derived_source_files': len(manifest['files']), 'derived_source_set_sha256': static['source_set_sha256']})

candidate = load(D / 'raw/2026-11-08T13-37-05-687Z/result.json')
baseline = load(D / 'raw/2026-11-08T13-42-33-720Z/result.json')
clean = lambda names: {re.sub(r'^not ok \d+ - ', '', x) for x in names}
cf, bf = clean(candidate['failures']), clean(baseline['failures'])
assert len(cf & bf) == 14 and len(cf - bf) == 1
write('evidence/regression-comparison.json', {'status': 'FULL_REGRESSION_FAIL_PRESERVED', 'candidate': {'tests': 695, 'pass': 647, 'skip': 33, 'fail': 15, 'evidence': 'raw/2026-11-08T13-37-05-687Z/'}, 'baseline': {'tests': 695, 'pass': 648, 'skip': 33, 'fail': 14, 'evidence': 'raw/2026-11-08T13-42-33-720Z/'}, 'shared_failures': sorted(cf & bf), 'candidate_only_observation': sorted(cf - bf), 'targeted_candidate': load(D / 'raw/2026-11-08T13-50-59-941Z/result.json'), 'targeted_baseline': load(D / 'raw/2026-11-08T13-51-01-059Z/result.json'), 'conclusion': 'One additional full-run Broker failure did not reproduce in either targeted run. Full failed results remain failed; no historical gate is waived.'})

write('evidence/normal-launch-smoke.json', {'method': 'ACTUAL_WINDOWS_UI_SKY_COMPUTER_USE', 'normal_launcher': 'source/tools/agentnexus/launch-desktop.mjs', 'test_inspector': False, 'old_instance_closed': True, 'old_window_disappeared': True, 'first_normal_relaunch_visible': True, 'returned_window_id': 9377732, 'title': 'AgentNexus', 'observed_page': 'Model Providers, zero configured providers, LIVE BLOCKED banner', 'unsaved_user_input': False, 'final_window_left_open': True, 'main_sha256': sha(S / 'desktop/main.mjs'), 'note': 'Final normal-only window.show/window.focus branch was verified after the earlier Electron E2E run. No real Key was entered.'})

write('acceptance.json', {'schema': 'agentnexus/model-provider-ui/acceptance/1', 'date': '2026-11-08', 'authorized_engineering_scope': 'PASS_SYNTHETIC_DESKTOP_UI', 'complete_production_goal': 'BLOCKED', 'live': 'BLOCKED', 'credential_service': 'BLOCKED', 'same_sid_counterexample': 'HISTORICAL_FAIL_PRESERVED', 'real_keys_imported': 0, 'real_provider_requests': 0, 'real_provider_tokens': 0, 'actual_provider_cost': None, 'global_authorized_input_output_tokens': 100000000, 'new_service_tests': {'pass': 14, 'fail': 0, 'skip': 0, 'evidence': 'raw/2026-11-08T13-48-03-693Z/'}, 'native_desktop_tests': {'pass': 2, 'fail': 0, 'evidence': 'raw/ui-2026-11-08T13-49-17-975Z/'}, 'normal_launcher_smoke': 'PASS_ACTUAL_WINDOWS_WINDOW', 'static_checks': {'pass': 8, 'fail': 0, 'evidence': 'raw/static-2026-11-08T14-02-23-332Z/'}, 'independent_review': 'FOUR_FINDINGS_FIXED_VERIFIED', 'full_regression': 'FAIL_PRESERVED_SEE_COMPARISON', 'governance': 'FULL_ROOT_PASS_PLUS_FINAL_DELIVERY_INCREMENTAL_VALIDATION', 'source_set_sha256': static['source_set_sha256'], 'unsupported_protocols': ['anthropic-compatible', 'google-native'], 'not_run': ['production cross-identity Host/Worker/Subagent/Reviewer denial', 'live model account entitlement and real API connections', 'real provider billing reconciliation', 'production singleton ledger qualification', '24-hour Resident qualification']})

components = [
 ('UI architecture', 'architecture.md'), ('Provider Settings', 'source/desktop/renderer/app.js#providersPage'),
 ('Add Provider', 'source/desktop/renderer/app.js#providerDialog'), ('API Key input', 'source/desktop/renderer/app.js#keyDialog'),
 ('Key Pool', 'source/desktop/renderer/app.js#keyPool'), ('Model Registry', 'source/desktop/renderer/app.js#modelsPage'),
 ('Model Selector', 'source/desktop/renderer/app.js#selectorDialog'), ('Agent binding', 'source/desktop/renderer/app.js#bindingDialog'),
 ('Usage', 'source/desktop/renderer/app.js#usagePage'), ('Credential IPC', 'source/desktop/main.mjs'),
 ('Frontend/Backend contract', 'contracts.md'), ('Native UI tests', 'source/tests/desktop/desktop.spec.mjs'),
 ('Vault and safety tests', 'source/tests/desktop/service.test.ts'), ('Raw records', 'raw/'),
 ('Independent review', 'reports/independent-review.md'), ('SHA256', 'SHA256SUMS.txt'), ('Acceptance', 'acceptance-report.md')
]
write('delivery-index.json', {'components': [{'name': n, 'path_or_function': p} for n,p in components], 'source_set_sha256': static['source_set_sha256'], 'production': 'BLOCKED'})

(D / 'README.md').write_text('''# AgentNexus Desktop — Model Providers

可运行的 Windows 桌面实现。供应商、模型、多 Key 池、Agent/Task 模型选择和 Usage 已接入 M1.8.2 后端；本轮 **合成工程范围通过，真实 Key 与 LIVE 仍 BLOCKED**。

双击 [Launch-AgentNexus.cmd](Launch-AgentNexus.cmd) 打开。当前机器已安装固定依赖，窗口已正常打开；无需编辑 JSON、环境变量或执行模型认证命令。

1. 点击 **Add Provider**，选择供应商或 Custom Provider，填写 Base URL 和初始模型。
2. 在 **Models** 中增加/编辑模型和默认设置。
3. 在 **API Key Pool** 中添加、禁用、轮换或删除合成 Key。真实 Key 录入尚未开放；测试值必须以 `synthetic-test-` 开头。
4. **Test Connection** 显示资格封锁；**运行合成测试** 经过现有 Gateway 与统一账本，成功也不会显示真实 Connected。
5. 在 **Agents / Messages** 选择默认或 Task 模型，在 **Usage & Billing** 查看 Host 账本。合成测试与真实总额分开。

新增服务测试 **14/14 PASS**，原生桌面测试 **2/2 PASS**，严格类型/语法 **8/8 PASS**。独立审查发现的四项问题均修复复验。完整历史回归仍 FAIL，保留原始结果及同环境基线比较。

[验收报告](acceptance-report.md) · [架构](architecture.md) · [IPC 合同](contracts.md) · [测试矩阵](reports/test-matrix.md) · [独立审查](reports/independent-review.md) · [安全边界](reports/security-boundary.md) · [机器验收](acceptance.json) · [交付索引](delivery-index.json) · [源码压缩包](AgentNexus-Model-Provider-UI-source.zip) · [SHA256](SHA256SUMS.txt)

当前仅实现 OpenAI-compatible 适配器集成；Anthropic-compatible 和 Google Native 明确不支持。生产跨身份凭证服务、唯一账本和真实 Data Egress 资格必须独立完成，不能因桌面测试通过而开启真实 API。

## 开发者复现

在 `source/` 使用 Node 24.15.0、固定 package-lock 依赖。新机器先 `npm ci`、`node node_modules/electron/install.js` 下载并校验 Electron，再 `npm run desktop`。这是依赖安装，不是让用户通过终端配置模型或 Key。网络不可达时恢复同 SHA256 的 Electron 官方包，不跳过校验。

运行 `node tools/agentnexus/verify-desktop.mjs` 验证服务，`npm run test:ui` 验证 Electron UI，`node tools/agentnexus/verify-desktop-static.mjs` 运行严格类型/语法检查。完整回归需把当前实际 Python/PowerShell/Git 可执行路径传给继承测试工具；详见原始记录。模拟调用、生产边界及失败历史见验收报告。

源码包不含 node_modules、编译缓存、Electron 二进制或运行时数据库。已有历史源和项目规则保持原字节；本轮未 commit/push、未部署生产服务。
''', encoding='utf-8')

(D / 'acceptance-report.md').write_text('''# 最终验收 — Model Provider Management UI

日期：2026-11-08。**当前授权的合成桌面工程范围通过；完整生产目标 BLOCKED。** 已实际实现页面、IPC、持久状态与后端集成，没有以设计文档或前端 Mock 冒充交付。

## 已交付

独立 Electron 桌面入口、统一导航、Provider Registry 驱动的供应商设置与自定义配置、独立秘密输入、多 Key 池、模型增删/能力/默认、统一模型选择器、Agent 模型绑定/备用路由/任务覆盖/预算，以及 Host 账本驱动的 Usage。复用 M1.8.2 Gateway、Adapter、Router、Vault 和 Usage Ledger；旧根产品与历史快照保持。

窗口曾因测试继承 Node 模式、Windows 尾斜杠参数和 ESM ready 等待而启动失败；这些问题已修正。固定 PowerShell 7 不存在时改用 Windows 自带 helper；普通隐藏启动器下补显式 show/focus。最终普通启动器已实际重新打开可见 AgentNexus 窗口，保留给用户。此最后显示差异只在非 E2E 模式执行，已经独立短复核、实际 Windows UI 核对和最终静态检查，未改变服务逻辑。

## 验证结果

- 新增服务：14 PASS / 0 FAIL / 0 SKIP。
- 原生桌面：2 PASS / 0 FAIL；含合成 DPAPI 保存/轮换、显隐/清空、连接状态、模型选择与 Task 路由、Usage、刷新、实际 Host 退出后重启和真实第二窗口 IPC 拒绝。
- 严格 TypeScript 和 7 项 Node 语法检查：8 PASS。
- 独立审查：四项可复现问题均 FIXED_VERIFIED；UNKNOWN 不切换、并发/关闭、403 和 TIMEOUT 另有定向证据。
- 根治理完整检查 PASS；最终交付文件按实际治理分类器增量校验、规则和 policy 哈希一致。初次长路径读取失败及重复中断不计作通过。

完整历史回归未通过：候选 695 项为 647 PASS / 33 SKIP / 15 FAIL，未改 M1.8.2 基线 648 PASS / 33 SKIP / 14 FAIL。14 项共同失败保留；额外一次 Broker BLOCKED 在随后候选与基线的相同定向断言中都 PASS，未证明为新增源码回归。**完整回归仍为 FAIL，不把定向通过覆盖到原失败。** 详见 [矩阵](reports/test-matrix.md) 与 [机器比较](evidence/regression-comparison.json)。

## 凭证与 LIVE

输入经受控本地 IPC 进入 Vault，保存后清空，不提供读回 Key API；Agent/Subagent 只获 scoped completion。原生 Renderer 无 Node/require、LocalStorage=0，输出投影无合成 canary。生产跨身份隔离未完成，同 SID 解密反例仍 FAIL；以上只证明合成接口纪律，不能证明生产 Worker 无法读取凭证。

真实 Key 导入、真实模型请求与真实 Provider Token 均为 0。统一真实授权上限仍为输入+输出合计 100,000,000，剩余 100,000,000；实际费用未取得，以 null 显示。当前本地 Store 仍缺生产唯一账本资格。所有 Key/Provider 的合成请求共用已有平台预算；轮换不重发 UNKNOWN。

Anthropic-compatible/Google Native、实时 Provider 模型目录、真实账户权限、真实账单与长期运行未验收。生产 Credential Service、Data Egress 和 LIVE 必须在独立部署资格通过后再开放，不要求用户现在输入真实 Key。

## 交付与完整性

17 项交付入口见 [delivery-index.json](delivery-index.json)，完整测试记录和截图见 `raw/`。原始失败尝试保留。历史 M1.8.2 189 源文件全部与原清单匹配；派生快照只修改原有 package.json/package-lock 与 Vault 的 Host-only setModels，另加桌面集成文件。源集合 SHA 见 [最终清单](raw/static-2026-11-08T14-02-23-332Z/source-manifest.json)。

[源码保全](evidence/source-preservation.json) · [治理记录](reports/governance.json) · [普通启动核对](evidence/normal-launch-smoke.json) · [独立报告](reports/independent-review.md) · [SHA256](SHA256SUMS.txt)。未修改规则、账户、ACL、AppContainer、Hook 或正式项目；未提交/推送。
''', encoding='utf-8')

# Archive only the frozen source set, so the outer SHA manifest can cover it without a self-reference.
archive = D / 'AgentNexus-Model-Provider-UI-source.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in manifest['files']:
        info = zipfile.ZipInfo('source/' + f['path'], (2026,11,8,0,0,0))
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, (S / f['path']).read_bytes())

policy = load(ROOT / '.workflow-kit/governance/policy.json')
(D / 'SHA256SUMS.txt').touch(exist_ok=True)
state = load(ROOT / '.workflow-kit/governance/baseline.json')
assert sha(ROOT / '.workflow-kit/governance/policy.json') == state['policy_sha256']
for p, expected in state['protected_rules'].items(): assert sha(ROOT / p) == expected
spec = importlib.util.spec_from_file_location('govern', ROOT / 'ai-workflow-kit-v4/tools/govern.py')
govern = importlib.util.module_from_spec(spec); spec.loader.exec_module(govern)
paths = [p for p in D.rglob('*') if p.is_file() and not any(x in ('node_modules','dist','.git','test-results') for x in p.relative_to(D).parts)]
for p in paths:
    rel = p.relative_to(ROOT).as_posix()
    assert govern.classify(rel, policy, state) is not None, rel
    govern.path_at(ROOT, rel)
write('reports/governance.json', {'full_root': {'command': r'python -X utf8 ai-workflow-kit-v4/tools/govern.py check --target \\?\I:\AI_AgentNexus', 'observed_exit_code': 0, 'transcribed_stdout': 'Governance check: PASS', 'scope': 'full root inventory; existing historical runtime included; extended Windows path prefix used'}, 'final_incremental': {'status': 'PASS', 'classifier': 'actual govern.classify + govern.path_at, unchanged policy/baseline/protected-rule hashes', 'files': len(paths)}, 'policy_sha256': state['policy_sha256'], 'protected_rules': state['protected_rules'], 'rules_modified': False, 'history_modified': False, 'initial_attempts': 'Existing overlength historical runtime path caused WinError 3; duplicate slow invocations stopped, not counted as PASS.'})

# Validate local document links; the explicit function references in delivery-index are source entry names.
missing = []
for p in [D/'README.md', D/'architecture.md', D/'contracts.md', D/'acceptance-report.md', *sorted((D/'reports').glob('*.md'))]:
    for target in re.findall(r'\]\(([^)]+)\)', p.read_text(encoding='utf-8')):
        if re.match(r'^[a-zA-Z]+:', target) or target.startswith('#'): continue
        target = target.split('#',1)[0]
        if target and not (p.parent / target).exists(): missing.append({'document': str(p.relative_to(D)), 'target': target})
assert not missing, missing
write('evidence/delivery-verification.json', {'local_document_links': 'PASS', 'source_manifest_matches_bytes': True, 'source_archive_files': len(manifest['files']), 'source_archive_sha256': sha(archive), 'normal_window_visible': True, 'real_key_entry': 'BLOCKED', 'source_set_sha256': static['source_set_sha256']})

paths = [p for p in D.rglob('*') if p.is_file() and p.name != 'SHA256SUMS.txt' and not any(x in ('node_modules','dist','.git','test-results') for x in p.relative_to(D).parts)]
paths.sort(key=lambda p:p.relative_to(D).as_posix())
(D/'SHA256SUMS.txt').write_text(''.join(sha(p)+'  '+p.relative_to(D).as_posix()+'\n' for p in paths), encoding='utf-8')
print(json.dumps({'status':'PASS_SYNTHETIC_DESKTOP_LIVE_BLOCKED','source_files':len(manifest['files']),'historical_files_verified':len(old_manifest['files']),'source_set_sha256':static['source_set_sha256'],'sha_entries':len(paths),'archive_sha256':sha(archive),'local_links':'PASS'}, ensure_ascii=False))
