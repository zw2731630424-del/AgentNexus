"""Package observed M1.7 evidence; never executes candidate/engine code."""
from pathlib import Path
import argparse, collections, datetime, hashlib, json, os, shutil, sqlite3, stat, subprocess, zipfile

ROOT = Path('I:/AI_AgentNexus')
RUN = ROOT / '.workflow-kit/runtime/AgentNexus-M1.7'
OUT = ROOT / 'deliverables/AgentNexus-M1.7'
VERIFY = RUN / 'v/r-cc1c68b6fcfb'
PILOT = next((VERIFY / 'data/native-pilot').glob('*/report.json')).parent
SOAK = RUN / 'soak/2026-11-08T02-21-27-844Z-6864'
EXPECTED = '8167ce3e78c602f43bee2b3a4d792a5054f76d7121a6a7730b14cc37eb5c4c6c'

def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def read(p): return json.loads(p.read_text(encoding='utf-8'))
def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''): h.update(b)
    return h.hexdigest()
def write(p, x):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(x, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
def md(p, s):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s.strip() + '\n', encoding='utf-8', newline='\n')
def cp(a, b):
    b.parent.mkdir(parents=True, exist_ok=True)
    if b.exists() and digest(a) != digest(b):
        archive = b.parent / ('previous-' + digest(b)[:16] + '-' + b.name)
        if not archive.exists(): shutil.copyfile(b, archive)
    shutil.copyfile(a, b)
    assert digest(a) == digest(b)
def longpath(p): return Path('\\\\?\\' + str(p.resolve()))
def inventory(p):
    files, links = [], []
    root = longpath(p)
    for d, ds, fs in os.walk(root, followlinks=False):
        ds.sort(); fs.sort()
        for n in ds[:]:
            q = Path(d) / n
            if getattr(q.lstat(), 'st_file_attributes', 0) & 0x400:
                links.append({'path': q.relative_to(root).as_posix(), 'target': os.readlink(q), 'kind': 'DIRECTORY_REPARSE_POINT'})
                ds.remove(n)
        for n in fs:
            q = Path(d) / n
            if getattr(q.lstat(), 'st_file_attributes', 0) & 0x400:
                links.append({'path': q.relative_to(root).as_posix(), 'target': os.readlink(q), 'kind': 'FILE_REPARSE_POINT'})
            else: files.append((q.relative_to(root).as_posix(), q))
    return sorted(files), links
def archive_dir(p, target):
    files, links = inventory(p)
    target.parent.mkdir(parents=True, exist_ok=True)
    manifest = {'schema': 'agentnexus/m17/raw-archive/1', 'original_root': str(p), 'files': [], 'links_not_followed': links,
                'semantics': 'Byte-preserving packaging. Copied file identities are not original Storage Owner identities.'}
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as z:
        for rel, q in files:
            before = q.stat(); h = hashlib.sha256(); size = 0
            info = zipfile.ZipInfo(rel, (2026, 11, 8, 0, 0, 0)); info.compress_type = zipfile.ZIP_DEFLATED
            with q.open('rb') as f, z.open(info, 'w', force_zip64=True) as o:
                for b in iter(lambda: f.read(1024 * 1024), b''):
                    h.update(b); size += len(b); o.write(b)
            after = q.stat()
            assert before.st_size == size == after.st_size and before.st_mtime_ns == after.st_mtime_ns, str(q)
            manifest['files'].append({'path': rel, 'bytes': size, 'sha256': h.hexdigest()})
        z.writestr('PACKAGING-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    write(target.with_suffix('.manifest.json'), {**manifest, 'zip_sha256': digest(target), 'zip_bytes': target.stat().st_size})
    print(json.dumps({'archive': target.name, 'files': len(files), 'bytes': target.stat().st_size}, ensure_ascii=False), flush=True)

def prepare():
    p = read(PILOT / 'report.json'); v = read(VERIFY / 'results.json')
    assert p['status'] == v['status'] == 'PASS' and p['source_set_sha256'] == v['source_set_sha256'] == EXPECTED
    source_manifest = read(VERIFY / 'source-manifest.json')
    for f in source_manifest['files']:
        q = OUT / 'source' / f['path']; assert q.stat().st_size == f['bytes'] and digest(q) == f['sha256']
    cp(VERIFY / 'source-manifest.json', OUT / 'source-sha256.json')
    archive_dir(OUT / 'source', OUT / 'AgentNexus-M1.7-source.zip')
    for name in ['report.json', 'plan.json', 'storage-writes.json', 'recovery.json', 'events.json', 'coordinator-status.json',
                 'checks-before-tests.json', 'checks-before-independent-review.json', 'checks-final-tests.json',
                 'checks-final-independent-review.json', 'git-diff-before.json', 'git-diff-final.json', 'source-manifest.json']:
        cp(PILOT / name, OUT / 'evidence/native' / name)
    for name in ['run.json', 'results.json', 'typecheck.json', 'syntax.json', 'source-manifest.json', 'all-tests.tap',
                 'events.jsonl', 'runner.stderr.txt', 'tsc.stderr.txt', 'tsc.stdout.txt']:
        cp(VERIFY / name, OUT / 'evidence/verification' / name)
    exported = []
    for f in p['provenance']['source_manifest']['files']:
        a = Path(p['project_root']) / f['path']; b = OUT / 'pilot/AgentNexus-Pilot-Project' / f['path']
        assert a.stat().st_size == f['bytes'] and digest(a) == f['sha256']; cp(a, b)
        exported.append({**f, 'original_path': str(a), 'export_path': b.relative_to(OUT).as_posix()})
    write(OUT / 'pilot/export-manifest.json', {'schema': 'agentnexus/m17/pilot-export/1', 'kind': 'PACKAGING_COPY',
        'native_run': str(PILOT), 'candidate_evidence_sha256': p['candidate_sha256'],
        'content_tree_sha256': p['provenance']['source_manifest']['tree_sha256'], 'files': exported,
        'owner_identity': 'Storage Owner versions/inodes in the original run only; the export preserves bytes, not those identities.'})
    c = sqlite3.connect((PILOT / 'host/kernel.sqlite').as_uri() + '?mode=ro', uri=True)
    def entities(k): return [json.loads(row[0]) for row in c.execute('select body from m16_entities where kind=? order by id', (k,))]
    runtime = {'schema': 'agentnexus/m17/runtime-export/1', 'original_database': str(PILOT / 'host/kernel.sqlite'),
        'source_set_sha256': EXPECTED, 'agents': entities('AGENT'), 'projects': entities('PROJECT'),
        'models': entities('MODEL_MODEL'), 'providers': entities('MODEL_PROVIDER'), 'budgets': entities('resource_budget'),
        'tasks': entities('TASK'), 'quality_checks': entities('PILOT_QUALITY_CHECK'),
        'note': 'Public runtime records, explicit MOCK provider only. No real credential backend or provider calls.'}
    write(OUT / 'runtime-config.json', runtime)
    native_stats = {'records': c.execute('select count(*) from anx_records').fetchone()[0],
        'record_domains': dict(c.execute('select domain,count(*) from anx_records group by domain')),
        'entity_counts': dict(c.execute('select kind,count(*) from m16_entities group by kind')),
        'operation_states': dict(c.execute('select state,count(*) from control_operations group by state')),
        'storage_operation_checks': []}
    for w in read(PILOT / 'storage-writes.json'):
        row = c.execute('select o.state,o.executor_state,p.consumed,a.consumed from control_operations o join control_permits p on p.operation_id=o.operation_id join control_approvals a on a.intent_hash=o.intent_hash where o.operation_id=?', (w['id'],)).fetchall()
        assert row and all(tuple(r) == ('SUCCEEDED', 'SETTLED', 1, 1) for r in row), (w['id'], row)
        native_stats['storage_operation_checks'].append({'id': w['id'], 'state': 'SUCCEEDED', 'executor': 'SETTLED', 'permit_consumed': True, 'exact_approval_consumed': True})
    c.close(); write(OUT / 'evidence/native/database-summary.json', native_stats)
    changes = []
    old = read(ROOT / 'deliverables/AgentNexus-M1.6.1/source-sha256.json')['files']
    old_map = {f['path']: f for f in old}; new_map = {f['path']: f for f in source_manifest['files']}
    for path in sorted(set(old_map) | set(new_map)):
        a, b = old_map.get(path), new_map.get(path)
        if a != b: changes.append({'path': path, 'kind': 'ADDED' if a is None else 'REMOVED' if b is None else 'MODIFIED', 'baseline': a, 'current': b})
    write(OUT / 'evidence/source-changes.json', {'baseline_source_set': 'd14401d7c39b069555f43c60360d5aab83e40bb32995008652cfcefb9862e9da',
        'current_source_set': EXPECTED, 'baseline_files': len(old), 'current_files': len(new_map), 'changes': changes,
        'inherited_tests_byte_identical': all(new_map.get(f['path']) == f for f in old if f['path'].startswith('tests/'))})
    print(json.dumps({'prepared': True, 'primary_pilot': str(PILOT), 'source_set': EXPECTED, 'changes': len(changes), 'native_records': native_stats['records']}))

def history():
    original = read(RUN / 'historical-freeze.json')['files']; errors = []
    for f in original:
        p = longpath(ROOT / f['path'])
        if not p.is_file() or p.stat().st_size != f['bytes'] or digest(p) != f['sha256']: errors.append(f['path'])
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    branch = subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
    status = subprocess.check_output(['git', 'status', '--short', '--untracked-files=normal'], cwd=ROOT, text=True)
    result = {'schema': 'agentnexus/m17/history-preservation/1', 'verified_at': now(), 'status': 'PASS' if not errors else 'FAIL',
        'files_verified': len(original), 'mismatches': errors, 'head': head, 'branch': branch, 'git_status': status,
        'scope': 'All original files listed by Phase0 freeze: root selected files, source/tests/tools/config/inputs/deliverables/tasks and governance policy/baseline. Historical runtime directories were not frozen and are not claimed byte-audited.',
        'commit_created': False, 'push_performed': False, 'hooks_installed': False}
    write(OUT / 'evidence/history-preservation.json', result)
    cp(RUN / 'historical-freeze.json', OUT / 'evidence/baseline/historical-freeze.json')
    assert not errors and head == '78a9d54b96417c262321be35ee44e86e300ca46d' and branch == 'main'
    print(json.dumps({'history': result['status'], 'files': len(original), 'head': head}, ensure_ascii=False))

def metadata():
    for q in RUN.glob('baseline-*-read.json'): cp(q, OUT / 'evidence/baseline' / q.name)
    cp(RUN / 'catalog-read.json', OUT / 'evidence/baseline/catalog-read.json')
    for q in (RUN / 'independent-engineering').glob('*.json'): cp(q, OUT / 'evidence/reviews' / q.name)
    for name in ['governance-path-probe.json', 'governance-enumeration-probe.json', 'retired-test-links.json']:
        if (RUN / name).exists(): cp(RUN / name, OUT / 'evidence/governance' / name)
    coverage = {}
    for q in RUN.glob('baseline-*-read.json'):
        x = read(q)
        for f in x.get('files', []):
            path = f.get('path', '')
            marker = 'deliverables/AgentNexus-M1.6.1/source/'
            if marker in path: path = path.split(marker, 1)[1]
            elif path.startswith('source/'): path = path[7:]
            full = f.get('complete') is True or f.get('content_read') == 'FULL' or f.get('coverage') == 'FULL_CONTENT_READ'
            if isinstance(f.get('coverage'), dict): full = full or f['coverage'].get('complete') is True
            coverage.setdefault(path, []).append({'ledger': q.name, 'full': full})
    old = read(ROOT / 'deliverables/AgentNexus-M1.6.1/source-sha256.json')['files']
    covered = [f['path'] for f in old if any(x['full'] for x in coverage.get(f['path'], []))]
    missing = [f['path'] for f in old if f['path'] not in covered]
    write(OUT / 'evidence/baseline/read-coverage.json', {'schema': 'agentnexus/m17/read-coverage/1', 'baseline_files': len(old),
        'files_with_read_ledger': len(covered), 'missing': missing, 'ledger_by_file': {p: coverage[p] for p in covered},
        'scope': 'Collective complete content reading by Codex engineering agents, plus main-agent targeted integration reads; not an independent full audit of legacy OS production safety.'})

def archives(include_soak=False):
    for q in sorted(RUN.iterdir()):
        if not q.is_dir() or q.name == 'delivery-runtime' or (q.name == 'soak' and not include_soak): continue
        target = OUT / 'evidence/raw' / (q.name + '.zip')
        if target.exists(): continue
        archive_dir(q, target)
    if include_soak:
        assert read(SOAK / 'report.json')['status'] == 'PASS'
        for n in ['start.json', 'samples.jsonl', 'report.json', 'sha256.json']:
            cp(SOAK / n, OUT / 'evidence/resident' / n)
    index = []
    for rel, q in inventory(RUN)[0]:
        if q.name not in {'report.json', 'results.json'}: continue
        try:
            x = read(q)
            if not isinstance(x, dict): continue
            index.append({'path': str(RUN / rel), 'sha256': digest(q), 'schema': x.get('schema'), 'status': x.get('status'),
                'error': x.get('error', x.get('failure')), 'summary': x.get('summary'), 'source_set_sha256': x.get('source_set_sha256')})
        except (OSError, ValueError): pass
    write(OUT / 'evidence/raw-run-index.json', {'schema': 'agentnexus/m17/raw-run-index/1', 'runs': index,
        'note': 'Every raw runtime directory is retained and byte-packaged. FAIL/NOT_RUN/short run evidence is not replaced by later PASS.'})

def retire_links():
    """Remove only three owned junction aliases after recording them; keep all targets."""
    allowed = {
      'v/r-bfa1fa2f0549/data/case-R7W58X/aliased-pilot',
      'v/r-cc1c68b6fcfb/data/case-6ENVyf/aliased-pilot',
      'verification-final/verification/2026-11-08T03-14-52-234Z-18624-3e0ff54a-f666-4821-b354-73a996892970/data/case-TDcLBK/aliased-pilot'}
    records = []
    for name in ['v', 'verification-final']:
        manifest = read(OUT / 'evidence/raw' / (name + '.manifest.json'))
        assert digest(OUT / 'evidence/raw' / (name + '.zip')) == manifest['zip_sha256']
        for link in manifest['links_not_followed']:
            relative = name + '/' + link['path']; assert relative in allowed
            original = RUN / relative
            assert original.is_absolute() and original.name == 'aliased-pilot'
            assert os.path.commonpath([str(RUN), str(original)]) == str(RUN)
            q = Path('\\\\?\\' + str(original))
            before = q.lstat(); assert getattr(before, 'st_file_attributes', 0) & 0x400
            target = Path(os.readlink(q)); assert str(target) == link['target']
            assert str(target).casefold().startswith(('\\\\?\\' + str(RUN) + '\\').casefold())
            target_before = target.stat()
            os.rmdir(q)  # Junction entry only. No recursion and no target traversal.
            target_after = target.stat()
            assert (target_before.st_dev, target_before.st_ino, target_before.st_mtime_ns) == (target_after.st_dev, target_after.st_ino, target_after.st_mtime_ns)
            assert not q.exists()
            records.append({'path': str(original), 'target': str(target), 'attributes_before': before.st_file_attributes,
                'action': 'REMOVE_OWNED_TEST_JUNCTION_ENTRY_ONLY', 'target_identity_unchanged': True,
                'metadata_preserved_in_raw_zip_manifest': name + '.zip/PACKAGING-MANIFEST.json'})
    write(RUN / 'retired-test-links.json', {'schema': 'agentnexus/m17/test-link-retirement/1', 'at': now(), 'records': records,
        'reason': 'Completed negative checker fixtures left three junction aliases; root governance rejects reparse paths. Targets and all source/evidence bytes remain; exact alias metadata is preserved.'})
    print(json.dumps({'retired_owned_junction_entries': len(records), 'targets_preserved': True}))

def documents(final=False):
    p = read(PILOT / 'report.json'); v = read(VERIFY / 'results.json')
    soak = read(SOAK / 'report.json') if (SOAK / 'report.json').exists() else None
    long_status = soak['status'] if soak else 'RUNNING'
    new_cases = [c for c in v['cases'] if 'm17-' in c.get('file', '')]
    new_counts = dict(collections.Counter(c['status'] for c in new_cases))
    gates = [{'gate': g['gate_id'], 'status': g['status'], 'id': g['id'], 'candidate': g['candidate_hash']} for g in p['gate_records']]
    changes = read(OUT / 'evidence/source-changes.json')
    common = '所有模型输出由明确标记的 Codex 编写模拟策略提供；以下 PASS 仅表示实际本地运行与断言通过，不表示真实模型自主研发通过。'
    roles = '\n'.join(f"| {a['id']} | {a['type']} | {a['model_binding']} | {a['state']} | {a['turns']} |" for a in p['role_tasks'])
    md(OUT / 'README.md', f'''
# AgentNexus M1.7 交付

已完成 M1.6.1 上的原生多 Agent 本地研发闭环与工程验证。**模型规划、代码生成和审查推理由模拟 Provider 驱动；真实自主研发结论为 SIMULATED。** 固定 Host 检查器实际执行了源码检查、严格 TypeScript 与测试；Pilot 文件实际经过 Agent Loop、Tool Gateway、精确授权、Storage Owner、Message Bus、审计和 G0–G6。

| 验收范围 | 结果 |
|---|---|
| 完整回归 | PASS：532 项，523 PASS / 9 NOT_RUN / 0 FAIL |
| M1.7 新增测试 | 53 项，52 PASS / 1 NOT_RUN / 0 FAIL |
| 语法、严格类型检查 | PASS |
| 本地模拟 Provider Pilot | PASS：三编码任务并发峰值 3；21 次受管发布；最终 10 文件 |
| 修复与再审 | 实际 zero-weight NaN 测试失败 → Debug 版本替换 → 10/10 测试通过 |
| Gate | G0–G6 本地证据 PASS；修复前 G3/G4 FAIL 保留 |
| Resident 两小时实测 | {long_status}，详见独立报告 |
| 真实 Provider / 通用自主研发 | SIMULATED，未联调真实模型 |
| 严格累计 CPU / 生产 OS / 普通 Agent PROCESS、EXTERNAL_EFFECT | BLOCKED |

交付入口：[最终验收](acceptance-report.md)、[机器验收](acceptance.json)、[Phase0](reports/phase0.md)、[架构](architecture.md)、[合同与配置](agent-contracts.md)、[运行配置原记录](runtime-config.json)、[源代码](source/)、[源码 ZIP](AgentNexus-M1.7-source.zip)、[Pilot 导出](pilot/AgentNexus-Pilot-Project/README.md)、[SHA256 清单](SHA256SUMS.txt)。

专项报告：[协作](reports/multi-agent.md)、[主 Agent 研发](reports/development.md)、[子 Agent 并行](reports/subagent-parallel.md)、[Resident](reports/resident-longrun.md)、[Reviewer](reports/background-reviewer.md)、[Coordinator](reports/coordinator.md)、[Context](reports/context-provenance.md)、[Message Bus](reports/message-bus.md)、[Scheduler](reports/task-scheduler.md)、[Model Gateway](reports/model-gateway.md)、[资源治理](reports/resource-governance.md)、[Gates](reports/gates.md)、[独立安全审查](reports/independent-security-review.md)、[历史失败与限制](reports/failures-and-qualifications.md)、[重现](reproduce.md)、[M1.8 建议](m18-recommendations.md)。

证据：[最新 Native 运行](evidence/native/report.json)、[真实发布链](evidence/native/storage-writes.json)、[原 Context 派生转录](evidence/native/context-transcript.jsonl)、[全记录与引用 Artifact 核验](evidence/native/evidence-decoding.json)、[回归原日志](evidence/verification/all-tests.tap)、[原始运行索引](evidence/raw-run-index.json)、[完整原始 ZIP](evidence/raw/)、[基线冻结](evidence/baseline/phase0.json)、[历史文件保护](evidence/history-preservation.json)、[源码变更](evidence/source-changes.json)。所有历史 FAIL 均保留。

引擎源码集：`{EXPECTED}`（155 文件，Unicode codepoint 路径排序；UTF-8 `path + NUL + sha256 + LF`）。M1.6.1 的 140 文件中仅 5 文件修改，15 文件新增；所有继承测试和 Feature/Policy Catalog 字节保持。主仓库源码、规则和历史交付保持。未 Commit/Push、未安装 Hook、未读取 API Key、未连接真实 Provider、未修改账户/ACL/AppContainer。

Pilot 导出属于包装复制；原生所有权、版本和文件身份引用原运行目录，不能把复制文件的 inode 当作原 Storage Owner 身份。审计和压缩 Artifact 的完整副本位于 `evidence/raw/v.zip` 内的 `r-cc1c68b6fcfb/data/native-pilot/2026-11-08T03-36-35-394Z-2120/host`。
''')
    if (OUT / 'architecture.md').exists() and not (OUT / 'evidence/architecture-initial.md').exists(): cp(OUT / 'architecture.md', OUT / 'evidence/architecture-initial.md')
    md(OUT / 'architecture.md', f'''
# M1.7 总体架构

{common}

```mermaid
flowchart TD
  R[原需求与冻结规则] --> C[Context Archive 与 Assembly]
  C --> M[MOCK Model Gateway]
  M --> P[Development 结构化计划]
  P --> A[可信准入: DAG、所有权、资源、合同]
  A --> E[持久事件循环与 Task Scheduler]
  E --> S[Research / Architecture / 三 Coding / Test / Docs]
  S --> B[持久 Message Bus]
  B --> E
  S --> T[Tool Gateway 精确意图与许可]
  T --> O[Storage Owner 原始来源与版本]
  O --> Q[固定 Host 检查器]
  Q --> V[只读 Reviewer]
  V --> D[Development 决定修复]
  D --> X[独立 Debug Task]
  X --> O
  Q --> G[程序 Gate G0–G6]
  G --> F[受 Gate 绑定的交付任务]
```

增量沿用 M1.6.1 的存储、来源、消息、规则和 Gate 内核。引擎只改 models/index/scheduler 与 package 版本；新增 development/event-loop/pilot-checker/pilot-fixtures/pilot-run、7 组测试与3个入口。根目录旧产品不被替换。

模型只能给提案和工具意图。可信 Host 校验同一 Task 历史中的原模型结果与原需求引用，准入有界 DAG，分配独立 Agent/runtime/task/context/model/budget/资源范围。拒绝大小写路径别名、原型名称、目录前缀冲突和无原始上下文的伪造计划。通过实际获准计划设置任务目标、依赖、产出、模型策略和预算。

事件层是持久有界控制面：历史512、待处理256、并发默认3且上限4。没有常驻模型轮询；只在内部事件/消息/期限唤醒。重开不会自动恢复 DISPATCHING，先转 INDETERMINATE，明确恢复后再启动；UNKNOWN 不自动重试。普通 Agent facade 不暴露 Store、admin、Gate 注册或权限修改入口。

每次代码发布都走不可变原始模型回复 → Gateway stage → 精确路径与内容批准 → G1 → Storage Owner。候选每文件不超过64 KiB、合计不超过1 MiB；固定 Runner 在独立快照上用已固定 Node/TypeScript、固定参数与最小环境检查。它只允许已登记 fixture 内容，不是任意代码沙箱，也不授予普通 Agent PROCESS。

多文件交付是逐文件发布后整套再校验，不声称多文件原子事务。逻辑预算和可观测进程关闭不等同 OS 硬限制；CPU/生产执行资格保持 BLOCKED。代码生成 fixture 是 Codex 工程输入，真实本地执行链与通用模型智能的证据必须分别阅读。
''')
    md(OUT / 'agent-contracts.md', f'''
# 五类 Agent 运行合同

{common}

| 类型 | 合同与允许操作 | 强制边界 |
|---|---|---|
| DEVELOPMENT | 读原始需求/规则、提交计划、经 Message Bus 派发与整合；独立 delivery Task 绑定 G6 | 模型不能自行授予权限、设置 Gate PASS 或运行 Shell |
| SUBAGENT | Research/Architecture/Coding/Test/Debug/Docs；独立 Task、Runtime、Context、Model Binding、Worker Budget | 文件写仅限合同产出与指定 resource；Debug 限单文件的原版本替换 |
| RESIDENT | 接收持久消息、按事件唤醒安全等待 Task、报告遗漏与最终结果 | 无代码写工具，不改目标/规则，不唤醒待审批/UNKNOWN 副作用 |
| BACKGROUND_REVIEWER | 读取原始代码、Diff、候选与实际检查报告；返回文件/行号/复现 | 只读；不修代码、不 Commit、不改 Policy 或审计 |
| COORDINATOR | 只读获准项目状态，给出就绪/优先级/资源建议 | read_projects 精确授权；不批准高风险、不改项目决策、不写代码 |

| 实际 Task/Agent | 类型 | 模型策略绑定 | 结束时 Task 状态 | 回合 |
|---|---|---|---|---|
{roles}

完整 ID、runtime_instance_id、原 Context 引用、文件范围、工具授予、规则版本、历史窗口、Task Contract 与三级预算见 [runtime-config.json](runtime-config.json)。这些是最新真实 Native 数据库的只读导出，而非推测配置。Resident/Coordinator/Reviewer 的 WAITING 是事件角色的有效等待状态；源码写者和交付 Task 均 SUCCEEDED。Host 关闭后服务处于停止状态，不能把报告时 WAITING 误解为交付后仍有后台服务。

平台/项目 workers4、memory256MiB、disk64MiB、processes8、model_requests1000、tokens2000000；每 Worker workers1、memory64MiB、processes1、model_requests128。调度并发3、Task 最大32回合、上下文65536bytes、输出4096tokens。预算为 Native Harness 逻辑账本；不声称每个 Agent 是独立 OS 进程或 OS 内存硬隔离。
''')
    reports = {
      'phase0.md': '''# Phase0 基线与读取核验

初始主仓库main，HEAD 78a9d54b96417c262321be35ee44e86e300ca46d，工作树clean。根src仍是早期产品；实际开发基线选择M1.6.1独立交付source，140文件逐SHA核验后复制到M1.7，未推倒底层或覆盖根实现。

适用规则为根AGENTS、治理policy和Workflow路由；project-rules/README不存在、registered_rules为空、无匹配专项workflow，不额外启用规则或Hooks。规则、policy、baseline哈希保留。govern.py new最初因保留测试目录长路径枚举失败，文件未创建；按现有deliverable/runtime/task分类创建后，使用同一root inode的Windows扩展路径执行未修改的完整治理check，不降低检查范围。

三位独立上下文工程代理与主代理协作读取全部M1.6.1源码/测试：原FULL清单112文件＋最终补充28文件=140；原index/scheduler的TARGETED记录没有冒充FULL。193 Feature和52 Policy的完整JSON字段、数组及历史条目以可逆公共字段/覆盖字段视图阅读，重建逐节点相等；其余原文完整分块。覆盖证据见 baseline/read-coverage 和四份原read清单。

已读M1.6.1 README、完整验收、独立审查、Storage Owner/恢复、Context Provenance、消息可靠性、Task Scheduler恢复、Rules Compiler、Gate Runtime、五角色验证，及M0 primary_harness_audit、workflow_kit_mapping。工程阅读是集体内容覆盖，不声称对所有旧Windows OS模块完成新的独立安全审计。

本地可用能力：Native五类型逻辑Agent、模拟Model Gateway、固定受限工具、SQLite/Artifact/Raw Context、Storage Owner、规则/Gates、逻辑三级预算。真实Provider和生产Vault未接入；严格CPU、完整生产执行组合及普通PROCESS/EXTERNAL_EFFECT继续BLOCKED。已有Node24.15.0、TS5.9.3、@types/node24.10.1、隔离PowerShell与明确Python/Git用于固定检查，无网络安装。

历史freeze的15,294文件包含既有src/tests/tools/config/inputs/deliverables/tasks和选定根/治理文件，最终逐SHA全部匹配。历史runtime目录未纳入此freeze，不冒称全量历史runtime逐字审计；本轮新runtime及成功/失败原证据均另外完整包装。
''',
      'multi-agent.md': f'''# Multi-Agent 协作报告

最新运行从原始需求生成并准入8项计划工作；Research → Architecture → 三个独立编码与文档 → Test → Integration，后续独立审查、Debug、复验、交付。实际共有16个角色 Task；三编码峰值3，调度峰值3。{common}

71 次真实 Gateway 模型请求均用71份来源可校验 Context View；32条 Message、31份持久交接记录、21次真实文件发布。原始命令、消息引用、任务状态与所有权分别位于 native report、runtime-config、storage-writes 和原数据库。Model Binding 不改变文件权限。Host 通过获准消息控制适配器执行调度，不把模型文本当作管理员命令。

主子双向消息包括派发、进度、code-cli 提问、lead 回答、协助与 Artifact/测试证据通知、修复追加任务。按业务 correlation 去重，避免对已停止 code-cli 重发 ANSWER；该首次失败保留。系统没有直接改另一 Agent 内部状态来冒充消息交接。

实际 Pilot 检查源代码与 Artifact、固定工具结果、Storage 版本和 Gate，不按完成自报验收。原任务在 Host close/reopen 后保留合同与上下文，旧 facade 被拒绝，显式恢复后继续至交付。未做 OS 重启或真实模型研发联调。
''',
      'development.md': f'''# Development 研发报告

模型层结论为 SIMULATED。Codex 工程作者编写受控 responder 和代码 fixture；Native lead 实际读取原需求/规则上下文、产出结构化提案，再由可信准入和 Host 适配器落实。没有声称这些预设策略证明了通用规划或通用编码智能。

Pilot 是离线任务管理与估算加权进度分析 CLI：版本化 CRUD、状态转移、持久 JSON、并发锁、原子替换、数据损坏拒绝、容量与流式输入上限。独立模块分别实现 model、analytics、CLI/入口；测试覆盖单位/集成与真实进程持久化。最终10文件源码和测试见 pilot 导出，运行测试实证为10/10。

计划保存了依赖、优先级、角色、资源估计、精确产出和验收。准入重建 lead 原模型请求，要求提案与同一原始需求来源对应；新建相同字节但不同来源不足以通过。检测重复所有者、原型属性、前缀冲突、无关需求、预算超限和依赖环。

lead 接到只读 Reviewer 的 zero-weight NaN 问题与实际失败报告，决定单文件修复；Debug 读原 analytics 与 finding 的原始引用，以 Storage 版本1与hash替换为版本2。其余最终文件仍版本1；再测试和再审后 G6 才绑定交付。修复前 G3/G4 的 FAIL 原记录仍在。
''',
      'subagent-parallel.md': f'''# Subagent 并行报告

code-model、code-analytics、code-cli 分别有独立逻辑 Agent、Runtime、Task、Context、Model Binding、Worker Budget 和工作区。任务合同不相互写文件；接口由先行 Architecture 与需求约束。三个实际 dispatch→settled 区间有重叠，峰值3，见 native/report.json 的 concurrency。

编码开始的有界 barrier 用于可重复观察同时活跃的三个任务；之后每个任务确实调用 Gateway/Storage 并提交独立产物。这里证明 Node 进程内异步 Native 任务与资源预留的并发，不声称三台机器、三个模型服务或三个独立 CPU 进程的物理并行。

文件冲突和取消/失败恢复由继承 Storage/Task/Resource 及新增事件负面测试验证；单文件单所有者、expected_version/hash 保证 Debug 不能覆盖未知新版本。Integration 读取实际来源，逐文件发布到 delivery resource，再校验完整 manifest。跨文件发布不是原子事务。
''',
      'background-reviewer.md': f'''# Background Reviewer 报告

本轮使用明确请求的审查 Task 与 G4 触发。实际 Git 以固定 `--no-index --no-ext-diff --no-textconv` 获取空基线到候选的工作树 Diff，exit1 表示有差异；没有创建 Pilot Commit 或 Push，原仓库 HEAD 只作为基线标记。Commit/Push Watcher 未启用。

review-before 与 review-final 是独立只读 BACKGROUND_REVIEWER；无 Storage write 授予。每次读取候选、真实 Diff、需求原文和 Host checker 报告。前次发现 src/analytics.ts 的零总权重0/0生成NaN，记录路径/行号/复现并通过 Message Bus 通知 lead。发现是有意植入的实际数值错误；识别决策采用模拟策略，不声称未知缺陷发现能力。

固定检查器实际执行语法/严格类型/10项测试，修复前 G3/G4 FAIL，修复后相同范围 PASS。Reviewer 不自行修补；lead 另派 Debug 后再审。越权写、规则/Policy/审计与伪 Gate 拒绝来自继承/新增负面测试，不能把“权限拒绝测试 PASS”当成允许生产写操作。
''',
      'coordinator.md': f'''# Coordinator 报告

Coordinator 以单独 COORDINATOR Runtime 读取精确授权的 pilot/other 项目状态，保存 [coordinator-status.json](../evidence/native/coordinator-status.json)，在 Message Bus 向 lead 给出依赖与资源建议；无代码资源或管理工具。项目 other 仅为获准状态摘要夹具，没有科研任务。

Pilot按已准入DAG执行；计划priority字段被保存，但没有把work.priority映射到Pilot enqueue。事件调度器的priority支持由单独测试验证，不能将本次Pilot当作计划优先级落地实证；该映射标记NOT_RUN。三级预算在预留时同步限制共享并发；Coordinator模型策略无法提高授权。继承测试覆盖同库Worker/Project/Platform超额、跨项目边界和越权；未证明多Host/多数据库的全局平台协调。其边界为同一可信Harness store内已授权项目。
''',
      'context-provenance.md': f'''# Context Provenance 报告

71 次模型请求均绑定71份实际 Context View、原始 input/manifest/hash。组成包括平台/项目规则、角色、Task Contract、状态、必要消息/历史、文件/工具结果和 Artifact 引用；模型 responder 只收到重建输入与公开请求主体，不得到 Store/admin/Key Handle。

新增可选 historyWindow 将 Task 热索引保持最多32引用，并把移出引用逐条写进审计。Raw Archive/Artifact 不被摘要、索引或滚动窗口覆盖；旧数据可按原引用重读验hash。默认行为不改，仍拒绝第33条；Pilot 显式启用窗口。Task/Handoff 的创建hash固定 history_window，跨相反 Host 默认不静默更改；旧 pending handoff 缺策略时失败关闭，要求明确迁移。

4项专项历史测试覆盖默认与窗口模式、close/reopen、两方向 handoff 和先前原文可读。旧 Pilot 确实因32条历史上限失败，原日志与快照保留；修复后的 lead16回合 SUCCEEDED，移出初始 plan 的审计仍能追到原 Artifact。

恢复保留原 Task、rules version、需求与计划引用；同字节不同来源不是同一历史。未增加向量数据库或宣称无限记忆，所有 Context 容量仍有界。Native 项目规则是 Host createProject 输入的已归档规则；不冒称模型逐行读取了主仓库整份 AGENTS。
''',
      'message-bus.md': f'''# Message Bus 报告

沿用 M1.6.1 持久消息、租约、去重、原文、确认和原子 Task 交接。最新 Pilot 保存32条消息和31份交接，包括受控 Host 重开时的待处理消息；每次有效交接绑定原 payload hash 和接收 Task revision。原文本与交接均可通过 host/kernel.sqlite 与压缩 Artifact 追溯。

新增事件循环以消息原始 ContextSource 的规范hash绑定 wake 事件，区分可安全恢复的 WAIT 与待审批/UNKNOWN。重复、过期、离线、取消、唤醒失败、晚到消息与队列容量竞态由消息/事件测试验证；真实发送、接收、恢复、继续与回复在 Pilot/Resident 中实际发生。业务 ANSWER 去重补上时，首次 AGENT_UNAVAILABLE 失败没有删除。

消息和事件均有容量上限，不做无限轮询或无限内存增长。过期处理和失败关闭不产生隐式重试外部副作用。
''',
      'task-scheduler.md': f'''# Task Scheduler 与恢复报告

事件队列512历史/256待处理；可配置并发默认3/最高4，Task 单实例执行、依赖与优先级受控。等待消息的任务在安全交接后恢复原 Task，审批等待与 UNKNOWN 不由普通 wake 绕过。

最新 Pilot 执行受控 Host close/reopen：同一 lead Task/合同/原需求/规则/计划持续，runtime id更新、旧 facade 拒绝、重新打开自动模型调用0。持久消息在明确 recoverEvents/startEvents/resume 后继续，最终 lead 和 delivery 成功。事件 DISPATCHING 恢复成 INDETERMINATE，不自动重新派发未知动作。实际运行有独立旧测试覆盖进程崩溃/退出证明；Pilot 自身这里是受控关闭，不能称作断电测试。

Task 回合32、消息接收索引32、热历史32等边界仍保留；历史窗口仅移出可追溯索引，不删除Archive。取消、资源竞争、依赖、过期、Feature 停止栅栏等测试都列在完整 results 原记录。OS reboot/硬断电 NOT_RUN。
''',
      'model-gateway.md': f'''# Model Gateway 报告

真实 Provider、真实费用和真实 API Key 均未接入。显式 pilot-mock Provider、pilot-small/design/review 三模型与 cheap/design/review/lead/delivery 路由完成71次请求；调用和 usage 均 SIMULATED，真实费用0。普通角色采用低成本策略，设计与审查分别映射较强模拟策略；模型能力不提升权限。

继承 Provider Registry、Model Registry、Router、Opaque Mock Key Handle、Usage Ledger 与预算。第三构造参数仅允许可信 Host 提供同步 MockResponder；原第二参数严格 schema 不放宽。hook 只看冻结的原输入、公开subject/request/model；不暴露 Store/admin/凭据、网络或文件句柄。fixture文件hash和版本被审计。

请求 SENT 后 throw、畸形结果、取消或未知副作用保留 UNKNOWN、Key与预算，不 fallback、不自动发第二个付费请求；明确未发送才可切换。新负面测试覆盖上下文/权限不泄露、错误/取消与资源保留。Vault 目前是接口与模拟句柄，真实秘密存储、真实Provider故障联调 NOT_RUN；不声称已完成生产密钥体系。
''',
      'resource-governance.md': f'''# Resource Governance 报告

Worker、Project、Platform 在同一原生store中统一预留与结算。最新 Pilot 并发3，结束平台活跃 worker/memory/process/model reservation归零，持久文件 disk claims仍保留；UNKNOWN reservation为0。平台累计71次模拟模型调用，322390 tokens为模拟账本计数，不是供应商账单。

固定 Host checker 也申请三级逻辑资源。只有明确未执行或非空全部命令真实close且结论确定才释放；throw、空命令/INCONCLUSIVE、输出管道丢失或未关闭保持UNKNOWN隔离，不自动重跑。独立审查发现空报告提前释放的P1，已修复并用真实 Harness 负面测试验证。

Storage 最终10文件、analytics版本2，其余1；所有21次发布的Gateway操作SUCCEEDED/SETTLED并消耗精确approval/permit。32MiB等大文件回归使用流式路径；新增Node/Type工具hash改为64KiB块读取。固定Runner输出和输入有界，事件/历史索引也有界。

严格累计CPU仍BLOCKED。逻辑memory/process/wall预算、观测CPU/内存以及可见close不等同Windows OS硬限制。未取得资格的普通Agent PROCESS/EXTERNAL_EFFECT继续拒绝；未改账户、ACL或AppContainer。跨Host全局平台预算没有验证。
''',
      'gates.md': f'''# Workflow / G0–G6 报告

采用 M1.6.1 NativeGateEngine 语义：G0准入、G1规则/输入、G2计划、G3代码测试、G4独立审查、G5交付证据、G6最终验收。每条记录绑定实际候选、基线、规则registry/hash/version、feature/policy epoch、checker版本和对应不可变证据Artifact；G3/G4保存完整固定checker原始报告，其余五门引用候选manifest。计划的DAG/所有权/预算另由DevelopmentAdmission在执行前校验。模型文本不能把Gate改成PASS。

最新7条本地Gate全部PASS，同一候选证据hash `{p['candidate_sha256']}`。其中文件内容tree hash另为 `{p['provenance']['source_manifest']['tree_sha256']}`，二者结构与用途不同。程序校验实际文件/Storage版本/来源/报告，原修复前G3和G4 FAIL保留。G6事先绑定受保护delivery Task，成功后才允许其dispatch。

本轮profile无人工审查门，人工Gate不冒充已运行；继承测试验证缺失/伪造/过期证据、独立审查角色、规则更新绑定、NOT_RUN/INCONCLUSIVE/BYPASSED和人工门失败关闭。Feature或可选Gate关闭不能放行核心策略。详细7条记录和失败前2条见 [report](../evidence/native/report.json)。
''',
      'failures-and-qualifications.md': '''# 历史失败、尝试与资格

M1.6.1原验收为469 PASS / 8 NOT_RUN / 2 FAIL，原文件、问题和资格原样保留。M1.7基线重现包括错PowerShell路径的一次417/31/24、正确工具但沙箱原语受限的一次439/28/12、原生链接条件下的一次470/8/1；都保留原日志，不能把最终通过回填历史。

M1.7首次完整回归531=520 PASS/9 NOT_RUN/2 FAIL：旧最大路径测试被过深输出根触发；Native固定Runner的过深cwd spawn ENOENT并引出ENOTCONN。未降低旧路径240限制，改为短运行目录；增加spawn/pipe失败关闭，pin工具改流式hash。之后新增53=52PASS/1NOT_RUN，最终完整532=523PASS/9NOT_RUN/0FAIL。

早期Pilot一次因向已停止code-cli重复ANSWER失败，一次在7Gate已PASS后lead触及32历史引用上限而整体FAIL；均保留。按业务关联去重和显式历史窗口修复后，原lead恢复连续研发成功。单独history测试最初只查前100审计导致查询断言失败，后来完整分页查询通过；它不是原Archive丢失。

CPU/JOB_TIME与TOCTOU旧断言本次可能因时序通过，但不补足严格累计CPU或生产组合所需资格。历史累计CPU失败与deadline终止原因不改变。最终完整回归PASS仅指当前断言，OS生产、PROCESS/EXTERNAL_EFFECT与严格累计CPU仍BLOCKED。

9项NOT_RUN逐条见验收JSON/原results：真实文件/目录symlink权限、保护DACL正例、跨账户生产启动、旧orphan观测窗口和新增checker真实symlink。未改OS权限去消除skip。普通junction/hardlink反例有实际运行证据，不用它们替代需要symlink权限的正例。
''',
    }
    for name, s in reports.items(): md(OUT / 'reports' / name, s)
    md(OUT / 'reports/resident-longrun.md', resident_doc(soak))
    matrix_specs = [
      ('A', '单 Agent', ['m16-harness.test.ts','m161-harness.test.ts','m17-models.test.ts'], '创建、Loop、原Context、Gateway工具、Task状态、受控恢复；未知副作用不自动重放。', '模型语义SIMULATED；OS独立进程/生产隔离不在本地PASS内。'),
      ('B', 'Multi-Agent', ['m16-harness.test.ts','m161-harness.test.ts','m16-resources.test.ts','m161-storage.test.ts','m17-pilot.test.ts'], '三个逻辑Native编码任务并行、双向/同级消息、交接、所有权冲突、资源竞争、取消及恢复。', '物理多CPU并行/真实Provider NOT_RUN；开发策略SIMULATED。'),
      ('C', 'Resident', ['m16-messages.test.ts','m161-messages.test.ts','m161-message-drafts.test.ts','m17-events.test.ts'], '持久接收/去重/过期/离线、唤醒、恢复、积压边界、真实受控Host重开；另读独立2小时报告。', 'OS reboot/断电NOT_RUN；2小时全源码启动快照NOT_CAPTURED。'),
      ('D', 'Reviewer', ['m17-checker.test.ts','m17-pilot.test.ts','m161-gates.test.ts'], '真实Git工作树Diff、只读权限、数值NaN复现、类型/语法/测试、通知和修复后复验。', '有意植入缺陷；Review推理SIMULATED；Git commit/push Watcher NOT_RUN。'),
      ('E', 'Coordinator', ['m16-harness.test.ts','m16-resources.test.ts','m17-events.test.ts','m17-development.test.ts'], '同store获准项目状态、共享预算、资源竞争、项目隔离、越权拒绝；事件priority独立测试。', 'Pilot计划priority尚未映射入队（NOT_RUN/未实现）；跨Host全局预算NOT_RUN。'),
      ('F', 'Context', ['m16-context.test.ts','m161-context.test.ts','m161-rules.test.ts','m17-history.test.ts','m17-models.test.ts'], '原历史/来源重建、明确缺失/不匹配拒绝、上下文上限、原规则绑定、跨Host窗口策略和恢复。', '热索引32且原Archive不覆盖；无限历史/向量检索未实现，不作长期智能记忆PASS。'),
      ('G', 'Workflow', ['m161-gates.test.ts','m161-rules.test.ts','m17-development.test.ts','m17-pilot.test.ts'], 'G0–G6、证据缺失/伪造/失效、BYPASSED不授权、人工门负例、规则版本与迁移。', '本轮profile无需人工门；人工实际签署NOT_RUN。模型建议不能授权。'),
      ('H', 'Resource Governance', ['m16-resources.test.ts','m151-resources.test.ts','m161-storage.test.ts','m17-quality-budget.test.ts'], 'Worker/Project/Platform逻辑超额、并发预留、已知关闭释放、持久disk owner与UNKNOWN隔离。', '严格累计CPU、生产OS硬限制、普通PROCESS/EXTERNAL_EFFECT全部BLOCKED。'),
    ]
    matrix = []
    for code, label, files, scope, limitation in matrix_specs:
        cases = [c for c in v['cases'] if c.get('file','').replace('\\','/').split('/')[-1] in files]
        matrix.append({'area':code,'name':label,'status':'PASS','scope':scope,'limitation':limitation,
            'supporting_test_files':files,'supporting_cases_overlap_other_areas':True,
            'supporting_case_counts':dict(collections.Counter(c['status'] for c in cases)),
            'case_references':[{'name':c['name'],'file':c.get('file'),'line':c.get('line'),'status':c['status'],'skip':c.get('skip')} for c in cases]})
    write(OUT / 'reports/test-matrix.json', {'schema':'agentnexus/m17/area-test-matrix/1','source_set_sha256':EXPECTED,
        'qualification':'LOCAL_EXECUTION_AND_NEGATIVE_ASSERTIONS_ONLY','model_semantics':'SIMULATED','areas':matrix,
        'resident_two_hour_status':long_status,'counting_note':'Supporting file sets overlap areas; do not add their case counts. Authoritative full total is532=523PASS/9NOT_RUN/0FAIL. A negative assertion PASS is evidence of refusal, not capability qualification.'})
    matrix_rows = '\n'.join('| '+x['area']+' '+x['name']+' | '+x['scope']+' | '+x['limitation']+' |' for x in matrix)
    md(OUT / 'reports/test-matrix.md', '''# A–H 分项测试与验收范围

完整原始结果为532项：523 PASS、9 NOT_RUN、0 FAIL。以下按用户A–H分类列证据，支撑用例集合允许重叠，不可把分组数相加。负面断言PASS表示预期拒绝/隔离，不表示被拒功能获得资格；所有模型规划/编码/审查语义仍SIMULATED。

| 分项 | 本地执行通过范围 | 明确限制 |
|---|---|---|
'''+matrix_rows+'''

每项对应原用例名、绝对测试快照路径、行号、PASS/NOT_RUN与skip原理由 [机器矩阵](test-matrix.json)给出。新增测试53项中52PASS/1NOT_RUN；唯一新增skip是真实file symlink夹具被OS拒绝，没有改变权限。
''')
    md(OUT / 'README.md', (OUT / 'README.md').read_text(encoding='utf8') + '\n\n[A–H 分项测试与验收矩阵](reports/test-matrix.md)包含每项范围、原测试位置及尚未验证事项。')
    reviews = []
    for q in sorted((OUT / 'evidence/reviews').glob('*.json')):
        x = read(q)
        if not isinstance(x, dict): continue
        reviews.append({'file': q.name, 'sha256': digest(q), 'status': x.get('status'), 'scope': x.get('scope', x.get('qualification'))})
    md(OUT / 'reports/independent-security-review.md', '''# 独立工程安全审查

三位Codex工程子代理在独立上下文中进行交叉审查，同文件单写者；这与Native Pilot的模拟BACKGROUND_REVIEWER执行是不同证据。各自不把本人编写模块的自审标成独立审查。execution作者实现checker/验证入口，审查models/admission/Host预算；storage/models作者实现responder接口，审查development/fixture/Host差异；context作者实现event-loop，审查其余集成、scheduler/history和真实原始证据。

发现并关闭：空/INCONCLUSIVE checker报告提前释放资源；计划prototype与路径前缀冲突；TaskBook容量上限；提案缺原需求来源绑定；空/错来源完整manifest提前完成；code-cli回答必须真正消费；消息重复ANSWER；历史窗口/跨Host handoff固定；固定Runner管道故障与过深cwd。原发现、探针和先前FAIL均保留。

最终独立runtime审查只读重算155源码hash，核对Native原数据库、21发布操作的permit/approval/settlement、原始模型Context/plan、Archive、9项Gate证据绑定、压缩Artifact及四轮真实checker的stdout/stderr/close。范围是当前可信本地模拟Pilot；没有审计出可生产部署的OS安全资格，也没有验证未知模型的通用研发能力。各报告保留自己的快照hash；后续最终源码由runtime-review绑定，较早审查不冒称重新审计后续每行修改。

机器报告见 [security-review](../evidence/reviews/security-review.json)、[fixture-review](../evidence/reviews/fixture-review.json)、[runtime-review](../evidence/reviews/runtime-review.json)。同目录previous/原始版本保留发现过程。
''')
    write(OUT / 'evidence/reviews/review-index.json', reviews)
    acceptance = {'schema': 'agentnexus/m17/acceptance/1', 'generated_at': now(), 'delivery_status': 'COMPLETE_WITH_DECLARED_LIMITS' if final else 'IN_PROGRESS',
        'source_set_sha256': EXPECTED, 'native_local_execution': p['status'], 'mock_provider_pilot': p['status'],
        'real_autonomous_development': 'SIMULATED', 'real_provider': 'SIMULATED', 'real_provider_calls': 0, 'real_model_cost': 0,
        'strict_cumulative_cpu': 'BLOCKED', 'production_os_execution': 'BLOCKED', 'ordinary_agent_process': 'BLOCKED', 'external_effect': 'BLOCKED',
        'full_regression': {'status': v['status'], 'counts': v['summary']['counts'], 'syntax': 'PASS', 'strict_types': 'PASS', 'attempt': str(VERIFY)},
        'new_tests': {'tests': len(new_cases), 'counts': new_counts}, 'not_run_cases': [c for c in v['cases'] if c['status'] == 'NOT_RUN'],
        'native_pilot': {'path': str(PILOT), 'report_sha256': digest(PILOT / 'report.json'), 'coding_concurrency_peak': p['concurrency']['coding_peak'],
            'writes': 21, 'final_files': 10, 'unit_integration_tests': {'passed': 10, 'failed': 0}, 'model_requests': 71, 'verified_context_views': 71,
            'gate_records': gates, 'pre_repair_gate_states': [{'gate': g['gate_id'], 'status': g['status']} for g in p['pre_repair_gates']], 'recovery': p['recovery']},
        'resident_two_hour': {'status': long_status, 'scope': 'ACTUAL_LOCAL_EVENT_DRIVEN_MODULE_OBSERVATION',
            'full_source_snapshot_at_start': 'NOT_CAPTURED', 'runner_sha256': digest(OUT / 'source/tools/agentnexus/soak-m17.ts'),
            'event_loop_sha256': digest(OUT / 'source/src/agentnexus/harness/event-loop.ts'), 'observations': soak},
        'history_preservation': read(OUT / 'evidence/history-preservation.json') if (OUT / 'evidence/history-preservation.json').exists() else None,
        'governance': read(OUT / 'evidence/governance/check.json') if (OUT / 'evidence/governance/check.json').exists() else {'status': 'PENDING'},
        'reviews': reviews, 'limitations': p['limitations'] + ['Resident soak did not capture a complete starting source tree; only stable event-loop module/runner provenance and actual observed behavior are claimed.'],
        'os_reboot': 'NOT_RUN', 'hard_power_loss': 'NOT_RUN', 'git_commit_push_watcher': 'NOT_RUN', 'cross_host_platform_budget': 'NOT_RUN',
        'pilot_plan_priority_to_event_mapping': 'NOT_RUN',
        'human_gate_profile': 'NOT_REQUIRED', 'commits_created': 0, 'pushes': 0, 'hooks_installed': 0}
    if final:
        assert soak and soak['status'] == 'PASS' and soak['duration_observed_ms'] >= 7200000
        assert acceptance['governance']['status'] == 'PASS'
        assert acceptance['history_preservation']['status'] == 'PASS'
        assert read(OUT / 'evidence/baseline/read-coverage.json')['missing'] == []
    write(OUT / 'acceptance.json', acceptance)
    md(OUT / 'acceptance-report.md', f'''
# M1.7 最终验收

交付状态：{'完成，保留明确资格限制' if final else '整理中'}。**本地原生执行闭环 PASS；真实 Provider 与通用自主研发 SIMULATED。** M1.6.1 历史失败不回填，严格累计CPU和完整生产执行链继续BLOCKED。

| 范围 | 实际结果与边界 |
|---|---|
| 单Agent / Loop / 工具 / Task / Context | 继承与新增测试通过；实际71份模型输入来源重建 |
| Multi-Agent | 16角色Task；三个独立编码任务逻辑并发峰值3；真实消息与21文件发布 |
| 研发 / 审查 / 修复 | 有意植入NaN真实失败 → 独立只读Review通知 → lead决策 → Debug版本替换 → 10/10复验 |
| Resident | 两小时实际观察 {long_status}；详见报告的源快照限制 |
| Coordinator | 获准同store跨项目状态/优先级/预算，非跨Host全局服务 |
| Context / Scheduler恢复 | 同lead原Task受控Host重开，旧facade失效、重开自动模型调用0、显式恢复继续；热索引滚动但原Archive可读 |
| Workflow | 最终G0–G6均程序PASS，修复前G3/G4 FAIL保留；无人工门profile |
| Resource | 三级逻辑预留、持久磁盘claim、UNKNOWN隔离；不等同OS硬资源资格 |
| 完整回归 | 532项：523 PASS / 9 NOT_RUN / 0 FAIL；syntax与strict types PASS |
| 新增M1.7 | 53项：52 PASS / 1 NOT_RUN / 0 FAIL |
| 生产资格 | 累计CPU、OS生产组合、普通Agent PROCESS/EXTERNAL_EFFECT BLOCKED |
| 真实模型 | SIMULATED，0真实请求/费用；Vault生产后端未验证 |

引擎源码155文件，修改5个继承文件、新增15个；原测试与Catalog未改。源码集 `{EXPECTED}`。最终Pilot候选证据 `{p['candidate_sha256']}`。全部证据hash和原运行路径见 [acceptance.json](acceptance.json)，完整回归skip逐项记录，不能把NOT_RUN解释为通过。

最终原生运行位于 `{PILOT.relative_to(ROOT).as_posix()}`；其源码快照与回归快照一致。原始数据库/Context/Audit/Artifact/命令输出在 evidence/raw/v.zip 中完整保留；导出源码仅为字节核验的包装复制。旧M0–M1.6.1与本轮所有失败详见历史保护和原始运行索引。

本轮未授权事项均保持未执行：真实Provider、API Key读取、Commit/Push、Git Hooks、账户/ACL/AppContainer修改、正式科研项目或实验。OS reboot、硬断电、真实Provider切换、自动Commit/Push Watcher为NOT_RUN。固定Host Runner不向普通Agent开放任意Shell。
''')
    md(OUT / 'm18-recommendations.md', '''# M1.8 建议

1. 另行授权后接入单一真实Provider，先用很小的请求/费用预算与真实Vault后端，验证原输入来源、失败后UNKNOWN、取消、费用对账及人工停机。用未提供代码fixture的新需求评估真实规划、缺陷发现与研发能力，保持相同Gateway/Owner/Gate边界。
2. 独立关闭累计CPU根因：稳定采样Job CPU累计、区分JOB_TIME与deadline/主动停止、保留系统事件/ExitProof，再验证跨账户生产组合。资格未关闭前维持PROCESS/EXTERNAL_EFFECT BLOCKED。
3. 持续运行从本次实际2小时扩至24小时、多项目、崩溃注入/断电恢复；启动前冻结完整源码/toolchain/config快照，监测热索引、SQLite与Artifact增长，加入有界保留/备份策略，原Archive不能被摘要覆盖。
4. 将已保存的计划priority明确映射到Pilot入队优先级，再做有依赖/资源竞争的原生端到端验证（当前只有事件层单独priority测试）。对更大项目增加接口合同与冲突重基、Task历史检索工具和更长但有界的工作序列。多文件原子发布、跨Host平台预算与常驻Git watcher仅在明确需求和授权下单独设计验证，避免把现有逻辑进程误称OS隔离。
''')
    md(OUT / 'reproduce.md', '''# 重现与证据读取

环境：Windows，本次实际 Node24.15.0、TypeScript5.9.3、@types/node24.10.1；PowerShell/Python/Git使用原机器的固定路径。代码入口不读取现有API Key，不安装依赖，不连接网络Provider。工具完整hash在原checker报告；不重新分发第三方toolchain。

在原工作区 PowerShell 设置以下显式工具路径，然后执行固定验证入口（输出应在源码目录之外，保持短路径）：

```powershell
$env:AGENTNEXUS_TYPE_TOOLS='I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-M1.5\\type-tools'
$env:AGENTNEXUS_TEST_PYTHON_PATH=(Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH='I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-M1.6.1\\toolchain\\powershell-host\\pwsh.exe'
$env:AGENTNEXUS_TEST_GIT_PATH=(Get-Command git).Source
node deliverables/AgentNexus-M1.7/source/tools/agentnexus/verify-m17.mjs --output-root I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-M1.7\\repro --suite all
```

`--suite m17`只运行新增测试；`--suite all`包括所有继承用例，Native Pilot本身是实际运行的集成测试。Runner冻结源码、使用最小环境、输出真实TAP/JSON和退出证据，不隐藏非零码。原生hardlink/junction夹具在限制沙箱中可能EPERM，需要运行环境具有本次获准的普通本地文件操作能力；不改OS账户/ACL来规避。

独立Pilot入口：`node deliverables/AgentNexus-M1.7/source/tools/agentnexus/pilot-m17.ts --output-root <短的独立输出路径> --type-tools-root <已存在工具根> --git-path <固定git.exe>`。有界Resident：`node deliverables/AgentNexus-M1.7/source/tools/agentnexus/soak-m17.ts --output-root <独立输出路径> --duration-ms 7200000`。模型仍是SIMULATED；固定Runner拒绝非allowlist代码，不是任意软件运行器。

Pilot导出需在同样Node环境、该项目目录下，将AGENTNEXUS_PILOT_SCRATCH设为新的独立空目录，再运行 `node --test tests/model.test.ts tests/analytics.test.ts tests/cli.test.ts`；CLI用法见该目录README。该手动重现是用户对导出副本的运行，不产生原生Storage Owner版本，也不能替代已交付的原始执行证据。

ZIP内 PACKAGING-MANIFEST.json 保存每文件原字节SHA。外部同名manifest还绑定ZIP SHA/大小。SHA256SUMS不包含自身，delivery-manifest对清单另行hash并记录排除项，避免自引用。解压副本的路径、inode和原Owner身份不等价；原始报告中的绝对路径有意不重写。读取原SQLite用只读mode，.zst可由Node内建zstd解压后按Artifact的原始/存储hash校验。
''')
    print(json.dumps({'documents': True, 'final': final, 'resident': long_status, 'new_tests': new_counts}, ensure_ascii=False))

def resident_doc(s):
    if not s: return '# Resident 长期运行报告\n\n实际两小时观察正在进行，尚未宣称长期PASS。启动/逐分钟样本在原runtime/soak中保存；完成后才生成最终状态。\n'
    a = s['samples']; final = a[-1]
    return f'''# Resident 两小时实际运行报告

状态 **{s['status']}**，实际开始 {s['started_at']}，结束 {s['ended_at']}；观测 {s['duration_observed_ms']:.0f} ms（不少于7200000ms）。这是同一实际Node进程中的本地事件驱动Resident/Message Bus/Scheduler观察，Provider为SIMULATED，不是通用长期自治资格。

实际 {s['events']} 次独立消息/Task完成，{s['store_reopens']} 次受控Host store关闭重开；每个事件等待真实持久交接COMPLETED与Task SUCCEEDED，空闲分钟内模型请求数不变。重开先recoverEvents再startEvents，没有OS reboot/硬断电。

| 观测 | 数值 |
|---|---|
| 最后queued_messages / unknown_tasks / active_reservations | {final['queued_messages']} / {final['unknown_tasks']} / {final['active_reservations']} |
| RSS首/末/峰值 bytes | {a[0]['rss']} / {final['rss']} / {max(x['rss'] for x in a)} |
| heap首/末/峰值 bytes | {a[0]['heap_used']} / {final['heap_used']} / {max(x['heap_used'] for x in a)} |
| 进程累计CPU user / system 微秒 | {final['cpu_user_us']} / {final['cpu_system_us']} |
| SQLite首/末 bytes | {a[0]['sqlite_bytes']} / {final['sqlite_bytes']} |
| Host文件首/末 bytes | {a[0]['disk']['bytes']} / {final['disk']['bytes']} |
| 模型请求 | {final['requests']}，仅按事件调用模拟模型 |

逐分钟原样本与最终store验证见 [report.json](../evidence/resident/report.json)、[samples.jsonl](../evidence/resident/samples.jsonl)、[SHA](../evidence/resident/sha256.json)，完整host/Audit/Artifact在raw/soak.zip。观察到持久Archive/SQLite随事件增长是保留审计的成本，未做无限时长稳定性推断；热事件队列、Agent总量和历史均有界。CPU/memory是实际观测而不是OS硬预算证明。

重要来源限制：启动时未冻结完整源码集；本次运行缓存的事件模块与Runner保持不变，event-loop SHA `315cdb564506578c4e167dded5aa34725661d0e259ff1580687bd434a79c927f`，Runner完整hash见acceptance.json。同期引擎其它源码发生工程更新，因此本报告只给实际事件层与该运行的观测结论，不宣称最终155文件源码集在两小时全树一致浸泡。最终冻结源码集另经532项完整回归和独立Pilot验证。
'''

def sums():
    exclude = {'SHA256SUMS.txt', 'delivery-manifest.json'}; files = []
    for q in sorted(OUT.rglob('*')):
        if q.is_file() and q.relative_to(OUT).as_posix() not in exclude:
            files.append({'path': q.relative_to(OUT).as_posix(), 'bytes': q.stat().st_size, 'sha256': digest(q)})
    md(OUT / 'SHA256SUMS.txt', '\n'.join(f"{f['sha256']}  {f['path']}" for f in files))
    write(OUT / 'delivery-manifest.json', {'schema': 'agentnexus/m17/delivery/1', 'generated_at': now(), 'files': files,
        'sha256sums_sha256': digest(OUT / 'SHA256SUMS.txt'), 'self_hash_excluded': ['delivery-manifest.json'],
        'checksums_file_excluded_from_own_listing': 'SHA256SUMS.txt', 'source_set_sha256': EXPECTED,
        'evidence_qualification': 'REAL_LOCAL_NATIVE_EXECUTION_WITH_EXPLICIT_SIMULATED_MODELS'})
    print(json.dumps({'delivery_files': len(files), 'bytes': sum(f['bytes'] for f in files), 'sums_sha256': digest(OUT / 'SHA256SUMS.txt')}, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('command', choices=['prepare', 'history', 'metadata', 'archives', 'archives-final', 'retire-links', 'documents', 'final', 'sums'])
    args = parser.parse_args()
    {'prepare': prepare, 'history': history, 'metadata': metadata, 'archives': archives, 'archives-final': lambda: archives(True), 'retire-links': retire_links,
     'documents': documents, 'final': lambda: documents(True), 'sums': sums}[args.command]()
