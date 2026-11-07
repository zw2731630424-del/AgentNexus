"""Export existing M1 material as byte-preserving Markdown; no product execution."""
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import runpy
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[3]
WORK_REL = '.workflow-kit/runtime/AgentNexus-M1-Text-Review'
OUT_REL = 'deliverables/AgentNexus_M1_Text_Review'
WORK, OUT = ROOT / WORK_REL, ROOT / OUT_REL
SPLIT = ROOT / 'deliverables/AgentNexus_M1_Audit_Split'
OLD = ROOT / 'deliverables/AgentNexus-M1-Independent-Audit'
R0 = '.workflow-kit/runtime/AgentNexus-v0.4-M0/'
R01 = '.workflow-kit/runtime/AgentNexus-v0.4-M0.1/'
R1 = '.workflow-kit/runtime/AgentNexus-v0.4-M1/'
CODE = {'.ts', '.js', '.mjs', '.cjs', '.py', '.ps1', '.sql', '.tsx', '.mts', '.cts', '.sh'}
SOFT_DOC_BYTES = 96000
PATTERNS = {
    'PRIVATE_KEY_MATERIAL': re.compile(rb'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{80,}'),
    'GITHUB_TOKEN_LITERAL': re.compile(rb'(?<![A-Za-z0-9_])(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})'),
    'PROVIDER_KEY_LITERAL': re.compile(rb'(?<![A-Za-z0-9_])sk-(?:(?:proj|ant-api03)-)?[A-Za-z0-9_-]{32,}'),
    'AWS_ACCESS_IDENTIFIER_LITERAL': re.compile(rb'(?<![A-Za-z0-9])(?:AKIA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])'),
    'SLACK_TOKEN_LITERAL': re.compile(rb'xox[baprs]-[0-9A-Za-z-]{30,}'),
}
MODULES = {
    'gateway.ts': 'Tool Gateway / 起跑许可 / 单写者 / 超时',
    'policy.ts': 'Policy Enforcement / 三模式 / 审批',
    'control.ts': '可信控制能力 / Scope / Challenge / 单调时钟',
    'storage.ts': 'SQLite / Context Archive / Audit / Outbox / 恢复',
    'artifacts.ts': 'Artifact Store / Zstd / 有界流 / 取消',
    'features.ts': 'Feature Registry / Module 生命周期',
    'diagnostics.ts': 'Development Intelligence / 五维检查 / 子进程',
    'host.ts': '可信启动 / 管理接口 / Agent 门面 / 注册工具',
    'records.ts': '记录 Schema / Hash 链 / 封套验证',
    'types.ts': '共享类型 / 接口 / JSON 约束 / 标识',
    'integrity.ts': '原生包完整性库（独立测试使用，未接入 Host）',
    'cli.ts': 'CLI demo 入口',
    'python_ast.py': 'Python AST 适配器',
    'powershell_ast.ps1': 'PowerShell AST 适配器',
    'run-tests.mjs': 'Node 测试发现与启动',
    'features.json': 'Feature 目录运行数据', 'policies.json': 'Policy 目录运行数据',
    'package.json': 'ESM / 版本 / 测试命令元数据',
}
RECORDS, PAYLOAD_DOCS, COUNTER = [], [], 0


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def emit(phase, **values):
    print(json.dumps({'phase': phase, **values}, ensure_ascii=False), flush=True)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as source:
        for block in iter(lambda: source.read(131072), b''):
            h.update(block)
    return h.hexdigest()


def load(path):
    return json.loads(Path(path).read_text('utf-8-sig'))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', 'utf-8')


def write_md(name, value):
    (OUT / name).write_bytes(value.encode('utf-8') if isinstance(value, str) else value)


def excluded_new(name):
    return name == WORK_REL or name.startswith(WORK_REL + '/') or name == OUT_REL or name.startswith(OUT_REL + '/')


def workspace_files():
    files = []
    for directory, dirs, names in os.walk(ROOT, followlinks=False):
        parent = Path(directory)
        dirs[:] = sorted(d for d in dirs if not excluded_new((parent/d).relative_to(ROOT).as_posix()))
        for name in names:
            path = parent/name
            if not excluded_new(path.relative_to(ROOT).as_posix()):
                files.append(path)
    return sorted(files)


def baseline():
    rows = []
    for i, path in enumerate(workspace_files(), 1):
        info = path.stat()
        rows.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': info.st_size, 'mtime_ns': info.st_mtime_ns, 'sha256': sha(path)})
        if i % 4000 == 0:
            emit('preserving_original_workspace', files=i)
    value = {'utc': utc(), 'files': rows, 'scope': 'Every preexisting workspace file, including previous ZIPs, all split packages and historical artifacts; only this new task/output excluded'}
    write_json(WORK/'original_workspace_baseline.json', value)
    return value


def preserve(before):
    expected = {r['path']: r for r in before['files']}
    actual = {p.relative_to(ROOT).as_posix(): p for p in workspace_files()}
    errors = [{'path': n, 'reason': 'FILE_SET_CHANGED'} for n in sorted(expected.keys() ^ actual.keys())]
    for name in sorted(expected.keys() & actual.keys()):
        p, row = actual[name], expected[name]
        info = p.stat()
        if info.st_size != row['bytes'] or info.st_mtime_ns != row['mtime_ns'] or sha(p) != row['sha256']:
            errors.append({'path': name, 'reason': 'BYTES_OR_MTIME_CHANGED'})
    return {'status': 'PASS' if not errors else 'FAIL', 'utc': utc(), 'checked_files': len(expected), 'errors': errors}


def classify(name):
    if name.startswith('src/'):
        return 'current_native_implementation'
    if name.startswith('tests/'):
        return 'current_test_source_or_helper'
    if name.startswith('config/'):
        return 'generated_runtime_configuration'
    if name == 'package.json':
        return 'current_package_metadata'
    if name.startswith('tools/'):
        return 'current_test_bootstrap'
    if '/storage/v1/' in name:
        return 'historical_test_or_helper' if '.test.' in name or name.endswith('owned-storage-child.mjs') else 'historical_native_source'
    if name.startswith(R01):
        return 'development_only_M01_utility'
    if name.startswith(R1):
        return 'development_only_M1_verification_or_probe'
    return 'original_runtime_evidence_or_index'


def language(name):
    return {'.ts':'typescript','.tsx':'tsx','.js':'javascript','.mjs':'javascript','.cjs':'javascript','.py':'python','.ps1':'powershell','.json':'json','.jsonl':'json','.sql':'sql','.sh':'bash','.md':'markdown'}.get(Path(name).suffix.lower(), 'text')


def check_sensitive(name, raw):
    findings = []
    last = Path(name).name.lower()
    if last.startswith('.env') or Path(last).suffix in {'.pem','.key','.p12','.pfx'}:
        findings.append({'path': name, 'line': 1, 'pattern_id': 'FORBIDDEN_CREDENTIAL_FILENAME'})
    for key, pattern in PATTERNS.items():
        for match in pattern.finditer(raw):
            findings.append({'path': name, 'line': raw.count(b'\n', 0, match.start()) + 1, 'pattern_id': key})
    if findings:
        write_json(WORK/'sensitive_findings_no_values.json', findings)
        raise ValueError('SENSITIVE_FILE_BLOCKED; only path/line/pattern recorded, no value: ' + name)


def item_workspace(name, expected=None):
    raw = (ROOT/name).read_bytes()
    raw.decode('utf-8', errors='strict')
    if expected:
        assert len(raw) == expected['bytes'] and digest(raw) == expected['sha256'], 'Original/source snapshot mismatch: ' + name
    check_sensitive(name, raw)
    return {'path': name, 'bytes': len(raw), 'sha256': digest(raw), 'raw': raw, 'origin': {'kind':'workspace','path':name}, 'category':classify(name), 'kind':'original'}


def item_zip(archive_path, member, expected):
    with zipfile.ZipFile(ROOT/archive_path) as z:
        raw = z.read(member)
    assert len(raw) == expected['bytes'] and digest(raw) == expected['sha256'], member
    raw.decode('utf-8', errors='strict')
    existing = ROOT/member
    if existing.is_file():
        assert existing.read_bytes() == raw, 'History differs from archived original: ' + member
    check_sensitive(member, raw)
    return {'path':member,'bytes':len(raw),'sha256':digest(raw),'raw':raw,'origin':{'kind':'zip','archive':archive_path,'member':member},'category':'original_runtime_evidence_or_index','kind':'original'}


def block(item):
    global COUNTER
    COUNTER += 1
    raw, name = item['raw'], item['path']
    longest = max((len(m) for m in re.findall(rb'`+', raw)), default=0)
    fence = '`' * max(3, longest + 1)
    padding = bool(raw and not raw.endswith(b'\n'))
    record_id = 'TEXT-' + str(COUNTER).zfill(4)
    meta = {'record_id':record_id,'path':name,'bytes':len(raw),'sha256':item['sha256'],'language':language(name),
            'fence':fence,'wrapper_padding_newline':padding,'category':item['category'],'kind':item['kind'],'origin':item['origin']}
    header = ('## ' + name + '\n\n' + '类别：`' + item['category'] + '`；原始字节数：' + str(len(raw)) + '。\n\n源文件 SHA256：\n\n```text\n' + item['sha256'] + '\n```\n\n' + '<!-- agentnexus-export-entry: ' + json.dumps(meta,ensure_ascii=False,separators=(',',':')) + ' -->\n' + fence + language(name) + '\n').encode('utf-8')
    footer = (b'\n' if padding else b'') + (fence + '\n<!-- agentnexus-export-end -->\n\n').encode('ascii')
    return header + raw + footer, {**meta, 'origin':item['origin']}


def write_payload_series(base, items, note, force_single=False, primary=False):
    prepared = [(item, *block(item)) for item in items]
    groups, group, size = [], [], 0
    for item, raw, meta in prepared:
        if group and not force_single and size + len(raw) > SOFT_DOC_BYTES:
            groups.append(group);group=[];size=0
        group.append((item,raw,meta));size+=len(raw)
    if group:
        groups.append(group)
    names = []
    for i, group in enumerate(groups, 1):
        name = base + ('' if force_single else '_Part'+str(i)) + '.md'
        title = '# ' + base.replace('_',' ') + ('' if force_single else ' — Part '+str(i)) + '\n\n' + note + '\n\n'
        body = bytearray(title.encode('utf-8'))
        for item, raw, meta in group:
            RECORDS.append({**meta,'document':name})
            body.extend(raw)
        write_md(name,bytes(body))
        PAYLOAD_DOCS.append(name);names.append(name)
    return names


def import_graph(paths):
    graph = collections.defaultdict(set)
    for name in paths:
        if Path(name).suffix not in {'.ts','.mjs','.js'}:
            continue
        raw = (ROOT/name).read_text('utf-8')
        # Value imports only; import type edges never imply runtime module evaluation.
        for match in re.finditer(r'^import\s+(?!type\b)([\s\S]*?)\s+from\s*([\'\"])([^\'\"]+)\2\s*;',raw,re.M):
            spec = match.group(3)
            if spec.startswith('.'):
                target = ((ROOT/name).parent/spec).resolve().relative_to(ROOT).as_posix()
                if target in paths:
                    graph[name].add(target)
    return graph


def reachable(graph, start):
    seen, pending = set(), [start]
    while pending:
        node = pending.pop()
        if node not in seen:
            seen.add(node);pending.extend(graph[node]-seen)
    return seen


def load_description(name, cli, tests):
    if name.startswith('src/agentnexus/checkers/'):
        return '是：原始诊断测试有真实解释器适配器执行；按需子进程资源，CLI JSON demo不启动它；不是ESM模块'
    if name == 'src/agentnexus/integrity.ts':
        return '是，仅原始独立完整性测试导入；未接入CLI/Host，不能称Host运行模块'
    if name in cli:
        return '是：原始CLI demo入口/值导入闭包；依据静态导入语义及保留执行记录推导，无逐文件动态trace'
    if name.startswith('tests/'):
        return '测试进程加载（原始TAP）；不是产品Host模块'
    if name.startswith('config/'):
        return 'Host默认启动读取的运行目录数据；不是可执行代码，目录条目不等于全部功能实现'
    if name == 'package.json':
        return 'Node ESM/脚本元数据；不是实现代码'
    if name.startswith('tools/'):
        return '原始测试启动脚本；产品CLI/Host不加载'
    if '/storage/v1/' in name:
        return '否，当前版本不加载；历史运行源码快照，原字节保留用于对照'
    return '否，开发/验证/审查辅助；未进入M1产品运行闭包'


def module_for(name):
    if name.startswith('tests/'):
        return Path(name).name.removesuffix('.test.ts') + ' 测试/夹具代码'
    return MODULES.get(Path(name).name,'M0.1/M1开发验证或历史审查辅助')


def write_index(items, verification, cli, tests, exclusions, scope, schema_lines):
    locations = collections.defaultdict(list)
    for row in verification['records']:
        locations[row['path']].append('['+row['document']+':'+str(row['body_line'])+']('+row['document']+')')
    text = '# AgentNexus M1 源码索引\n\n当前源码版本为既有 `0.4.0-m1.1`；这不是本轮开展M1.1。当前原生实现14文件，测试源码/辅助6文件，测试启动1文件，运行配置2文件、package元数据1文件；另保留9个开发/审查工具和5个历史源码/测试快照。代码文件总数35；加运行数据/元数据后为38个唯一原始文件。没有把旧工具或快照计入当前运行源码。\n\n'
    text += '“实际加载”依据为原始执行记录与**排除 import type 后的值导入图**；Python/PowerShell是按需进程资源。测试关联另外加入原始闭包登记的配置读取、适配器和辅助子进程资源边，这些资源边不冒充ESM值导入。没有动态模块trace或行/分支覆盖报告，不把静态可达当成逐分支执行证明。\n\n'
    text += '| 原始相对路径 | 类别 | 字节数 | SHA256 | 功能模块 | 实际加载/使用状态 | 对应当前测试 | 全文位置 |\n|---|---|---:|---|---|---|---|---|\n'
    for item in sorted(items,key=lambda x:x['path']):
        name=item['path']; mapped=tests.get(name,[])
        test_text='<br>'.join('`'+v+'`' for v in mapped) if mapped else 'NOT_AVAILABLE：无当前自动测试导入映射'
        if name == 'src/agentnexus/cli.ts':test_text='无当前单元/集成测试直接导入；只有原始CLI demo烟雾证据'
        text+='| `'+name+'` | '+item['category']+' | '+str(item['bytes'])+' | `'+item['sha256']+'` | '+module_for(name)+' | '+load_description(name,cli,tests)+' | '+test_text+' | '+'<br>'.join(locations[name])+' |\n'
    unmapped=[x['path'] for x in items if x['path'].startswith('src/') and not tests.get(x['path'])]
    text+='\n## 测试映射与未覆盖范围\n\n当前实现中未被当前测试值导入/子资源映射覆盖的文件：'+', '.join('`'+x+'`' for x in unmapped)+'。CLI保留demo验证，不能称为单元测试覆盖。其他13个实现文件有测试导入/解析器资源映射；这是依赖关联，不是覆盖率报告。全部源码的函数/分支覆盖率均为 NOT_AVAILABLE，未运行覆盖率工具。开发脚本和历史快照没有被新算作当前测试通过。\n\n'
    text+='## Schema、Migration、生成和未使用材料\n\n没有独立Migration或配置Schema文件。实际SQL创建和约束位于下列原始源码；类型/验证同时完整保留在 types/control/features/policy/gateway/records 等模块：\n\n'
    for name,lines in schema_lines.items():text+='- `'+name+'`：原文件行 '+', '.join(map(str,lines))+'。\n'
    text+='\n生成材料为 config 下的目录JSON，不是生成的产品代码。没有发现额外未登记的当前原生实现文件。独立 integrity 库仅测试使用；M0.1工具、原始final_verify/探针和 storage/v1 全部明确非Host当前模块。源码、测试及辅助材料的必需集合遗漏数为0。\n\n'
    text+='## 扫描范围与静态夹具\n\n'+scope+'\n\n所有测试夹具创建函数、内联输入、辅助子进程和运行配置均已全文导出；tests/没有单独提交的静态输入夹具。历史运行的SQLite/Zstd/段/对象/损坏样本是生成结果，不是这些测试的既有输入依赖，不做Base64伪源码导出。逐路径大小、SHA256、类别和原因见 [排除索引](AgentNexus_M1_Excluded_Artifacts_Part1.md)。这不影响源码和测试生成器的完整性，旧样本仍在原始分包，未删除。\n'
    write_md('AgentNexus_M1_Source_Index.md',text)


def write_exclusions(exclusions):
    rows=[]
    for row in sorted(exclusions,key=lambda x:x['path']):
        rows.append('| `'+row['path']+'` | '+str(row['bytes'])+' | `'+row['sha256']+'` | '+row['reason_id']+' |\n')
    parts=[];group=[];size=0
    for row in rows:
        if group and size+len(row.encode('utf-8'))>150000:parts.append(group);group=[];size=0
        group.append(row);size+=len(row.encode('utf-8'))
    if group:parts.append(group)
    for i, group in enumerate(parts,1):
        text='# 未导出历史运行产物与范围外材料 — Part '+str(i)+'\n\n这些是明确排除项，不是未发现的源码。原件及历史分包没有删除或修改。\n\n'
        text+='- **GENERATED_RUN_ARTIFACT**：M1历史运行生成的数据库、压缩对象、段、锁/尾部/损坏等输入输出样本。测试自己新建夹具，不读取这些旧文件作为静态输入；夹具创建源码全文已导出。本轮导出源码和原始报告，不把旧二进制/对象流转成Base64文档。\n'
        text+='- **HISTORICAL_ARCHIVE**：以前的源码ZIP快照，不是当前运行输入；保留旧ZIP SHA256，当前全部源码和已保留的v1文本已另外全文导出。\n'
        text+='- **M0_RESEARCH_UTILITY**：M0研究/可行性辅助，不属于当前M1实现，按任务排除历史研究执行工具。\n\n'
        text+='| 原始相对路径 | 字节数 | SHA256 | 原因 |\n|---|---:|---|---|\n'+''.join(group)
        write_md('AgentNexus_M1_Excluded_Artifacts_Part'+str(i)+'.md',text)


def main():
    assert not OUT.exists(), 'Refusing to overwrite any prior delivery'
    OUT.mkdir(parents=True)
    before=baseline()
    split_index=load(SPLIT/'AgentNexus_M1_Audit_Package_Index.json')
    by_path={}
    for package in split_index['packages']:
        manifest_path=SPLIT/package['external_manifest']
        assert sha(manifest_path)==package['manifest_sha256']
        for row in load(manifest_path)['files']:
            if row['path'] in by_path:
                assert row['sha256']==by_path[row['path']]['sha256'] and row['bytes']==by_path[row['path']]['bytes']
            by_path[row['path']]=row
    core=SPLIT/'01_Core_Source.zip'; evidence_zip=SPLIT/'03_Runtime_Evidence.zip'
    for file in [core,evidence_zip]:
        expected=next(p for p in split_index['packages'] if p['name']==file.name)
        assert sha(file)==expected['sha256']
    snapshot=load(OLD/'source_snapshot_manifest.json')
    live=[]
    for folder in ['src','tests','tools','config','app','lib','packages','scripts']:
        if (ROOT/folder).is_dir():live.extend(p.relative_to(ROOT).as_posix() for p in (ROOT/folder).rglob('*') if p.is_file() and not any(q in {'node_modules','.git','__pycache__','.pytest_cache'} for q in p.parts))
    live.append('package.json')
    expected_current={r['path']:r for r in snapshot['current_runtime_candidate_files']}
    assert set(live)==set(expected_current), 'Live source has missing/unaccounted implementation relative to original audited source candidate'
    current={n:item_workspace(n,expected_current[n]) for n in sorted(live)}
    with zipfile.ZipFile(core) as z:
        payload=[n for n in z.namelist() if n!='PACKAGE_MANIFEST.json']
        assert set(payload)=={n for n in live if not n.startswith('tests/')}
        for n in payload:assert z.read(n)==current[n]['raw'], 'Core ZIP/current file mismatch: '+n
    extra=[]
    for folder in [R01,R1]:
        for path in (ROOT/folder).rglob('*'):
            if path.is_file() and path.suffix.lower() in CODE:
                name=path.relative_to(ROOT).as_posix()
                assert name in by_path, 'Unregistered own code discovered recursively: '+name
                extra.append(item_workspace(name,by_path[name]))
    assert {x['path'] for x in extra}=={r['path'] for r in snapshot['additional_authored_engineering_sources'] if not r['path'].startswith(R0)}
    all_items=list(current.values())+extra
    native=[x for x in all_items if x['path'].startswith('src/')]
    assert len(native)==14
    evidence_manifest=load(SPLIT/'manifests/03_Runtime_Evidence.json')
    evidence=[item_zip(evidence_zip.relative_to(ROOT).as_posix(),r['path'],r) for r in evidence_manifest['files']]
    # Explicitly identify every excluded recorded M1 output, without treating it as source.
    original_names={x['path'] for x in all_items+evidence}
    exclusions=[]
    for n,row in by_path.items():
        if n.startswith(R1) and n not in original_names:
            exclusions.append({'path':n,'bytes':row['bytes'],'sha256':row['sha256'],'reason_id':'HISTORICAL_ARCHIVE' if n.endswith('.zip') else 'GENERATED_RUN_ARTIFACT'})
    for row in snapshot['additional_authored_engineering_sources']:
        if row['path'].startswith(R0):exclusions.append({**row,'reason_id':'M0_RESEARCH_UTILITY'})
    physical_m1={p.relative_to(ROOT).as_posix() for p in (ROOT/R1).rglob('*') if p.is_file()}
    assert physical_m1=={n for n in by_path if n.startswith(R1)}, 'M1 runtime file set differs from preserved inventory'
    scope='递归核对 src/、tests/、tools/、config/ 及可能的 app/lib/packages/scripts；逐文件比对01_Core_Source.zip和原始运行候选。另递归扫描M0.1/M1工程目录中的所有代码文件，排除第三方/缓存，未按24个旧候选截取源码。实际当前候选24文件、附加自有M0.1/M1源码14文件，均纳入；7个M0研究工具明确排除。'
    emit('materials_confirmed',current_files=len(current),additional_code=len(extra),evidence_files=len(evidence),explicit_exclusions=len(exclusions))
    priority=['gateway.ts','policy.ts','control.ts','storage.ts','artifacts.ts','features.ts','diagnostics.ts','host.ts','records.ts','types.ts','integrity.ts','cli.ts','python_ast.py','powershell_ast.ps1','package.json','run-tests.mjs','policies.json','features.json']
    rank={name:i for i,name in enumerate(priority)}
    source=sorted((x for x in current.values() if not x['path'].startswith('tests/')),key=lambda x:(rank.get(Path(x['path']).name,99),x['path']))
    note='原件逐字节嵌入，保留CRLF/BOM/末尾换行。原始内容不格式化。每节标记中的bytes只计原文件；无末尾LF时补的分隔换行属于包装。integrity库仅测试导入，不是Host模块；JSON是运行数据，runner是测试入口。'
    source_docs=write_payload_series('AgentNexus_M1_Source_Review',source,note)
    test_items=[x for x in current.values() if x['path'].startswith('tests/')]
    test_items += [current[n] for n in ['tools/agentnexus/run-tests.mjs','package.json','config/agentnexus/policies.json','config/agentnexus/features.json']]
    test_items += [x for x in extra if x['path'].startswith(R1) and (x['category']=='development_only_M1_verification_or_probe' or x['category']=='historical_test_or_helper')]
    def test_order(x):
        n=x['path']
        return (0 if n.startswith('tests/') else 3 if n.startswith('config/') else 2 if '/storage/v1/' in n else 1,n)
    test_items.sort(key=test_order)
    test_docs=write_payload_series('AgentNexus_M1_Test_Review',test_items,'完整当前测试、辅助进程、夹具生成代码、配置、研发验证器/探针和保留的历史测试。开发工具及v1不是Host运行模块。历史日志使用合成输入/回调和部分时钟/spy；没有真实模型验证，不重新执行这些代码。')
    aux=[x for x in extra if x not in test_items]
    aux_docs=write_payload_series('AgentNexus_M1_Auxiliary_and_Historical_Source',aux,'独立列出的M0.1开发辅助与M1旧版源码。当前M1 Host不加载这些文件；不得与当前实现混淆，也不得因保留代码而把未运行合同标为通过。')
    critical=[R1+n for n in ['all-tests.tap','test-results.json','final-verification.json','reviews/control-review.json','reviews/storage-integrity-review.json','demo.json','reviews/storage-integrity-review.v3.json']]
    evidence_by={x['path']:x for x in evidence}
    primary_docs=write_payload_series('AgentNexus_M1_Runtime_Evidence',[evidence_by[n] for n in critical],'以下为原始最终日志、结果、审查（包括整改前CHANGES_REQUIRED）、demo及后续存储复审。均原字节嵌入，没有重跑、没有重建结果。NOT_RUN/FAIL保留。',force_single=True)
    supplemental=[x for x in evidence if x['path'] not in critical]
    evidence_docs=write_payload_series('AgentNexus_M1_Runtime_Evidence_Supplement',supplemental,'补充原始运行/模块/早期失败/源码版本与测试索引记录，原始空v2预留仍为空；不将历史或空记录改成PASS。单个原始JSON若超过96KB，完整独占一份文档，不拆开文件或截断。')
    verifier_name=(WORK/'verify_text_export.py').relative_to(ROOT).as_posix()
    tool=item_workspace(verifier_name);tool['category']='new_export_verification_utility_not_M1';tool['kind']='new_export_tool'
    tool_docs=write_payload_series('AgentNexus_M1_Export_Verification_Tools',[tool],'本轮新建的独立字节校验工具，不是M1源代码或历史测试。只解析导出包装并读原件比对，不加载产品。',force_single=True)
    required=sorted({x['path'] for x in all_items+evidence})
    plan={'schema':'agentnexus/text-export-plan/1','utc':utc(),'records':RECORDS,'payload_documents':PAYLOAD_DOCS,'required_original_paths':required}
    write_json(WORK/'export_plan.json',plan)
    command=[sys.executable,'-I','-B','-X','utf8',str(WORK/'verify_text_export.py'),'--workspace',str(ROOT),'--directory',str(OUT),'--plan',str(WORK/'export_plan.json'),'--report',str(WORK/'byte_verification.json')]
    result=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',timeout=60)
    (WORK/'byte_verification.log').write_text(result.stdout+result.stderr,'utf-8')
    assert result.returncode==0,result.stdout+result.stderr
    checked=load(WORK/'byte_verification.json')
    graph=import_graph(set(current))
    cli=reachable(graph,'src/agentnexus/cli.ts')
    related_graph=collections.defaultdict(set,{k:set(v) for k,v in graph.items()})
    for edge in snapshot['runtime_closure']['non_import_runtime_resources']:
        related_graph[edge['from']].add(edge['to'])
    tests=collections.defaultdict(list)
    for name in sorted(n for n in current if n.startswith('tests/') and n.endswith('.test.ts')):
        for target in reachable(related_graph,name):tests[target].append(name)
    for resource in ['tools/agentnexus/run-tests.mjs','package.json']:
        tests[resource]=sorted(n for n in current if n.startswith('tests/') and n.endswith('.test.ts'))
    schema_lines={}
    for item in native:
        lines=[i for i,line in enumerate(item['raw'].decode('utf-8').splitlines(),1) if re.search(r'CREATE TABLE|CREATE (?:UNIQUE )?INDEX',line)]
        if lines:schema_lines[item['path']]=lines
    write_exclusions(exclusions)
    write_index(all_items,checked,cli,tests,exclusions,scope,schema_lines)
    readme='# AgentNexus M1 独立代码审查文本材料\n\n本目录只提供普通Markdown和一个SHA256文本清单，没有新ZIP。所有原始内容以完整文件为单位嵌入；源文件字节没有改动。本轮不运行产品测试、模型、科研实验或任何修复/M1.1开发。\n\n'
    readme+='## 建议阅读顺序\n\n- [源码索引](AgentNexus_M1_Source_Index.md)：运行/测试/开发/历史/生成配置的精确区分、测试映射和没有覆盖证据的范围。\n'
    for title,names in [('当前完整源码',source_docs),('完整测试/夹具生成器/辅助',test_docs),('开发与历史源码',aux_docs),('核心原始运行证据',primary_docs),('补充原始记录',evidence_docs),('字节校验工具',tool_docs)]:
        readme+='- '+title+'：'+' · '.join('['+n+']('+n+')' for n in names)+'。\n'
    readme+='- [完整性报告](AgentNexus_M1_Export_Verification.md)及[SHA256SUMS.txt](SHA256SUMS.txt)。\n\n'
    readme+='每个文件章节包含完整相对路径、原始字节数、原始SHA256及正确语言的代码块。没有摘要代替正文、没有省略号替代代码、没有删除注释/异常/边界检查。单个大JSON完整独占Part，不能在文件中间拆开。CRLF、BOM和原始末尾换行均直接按bytes保留；没有末尾LF时新增的分隔LF在机器标记中明确属于包装。不要通过复制粘贴后编辑器的换行规范化判断原始SHA；以磁盘文档和脚本提取的N个原始字节为准。\n\n'
    readme+='当前原生实现14文件，其中 integrity.ts 仅完整性测试导入、未接入Host；另外13个处于CLI值导入/按需检查器资源范围。没有逐文件动态加载trace或分支覆盖率，不把静态图当作全代码覆盖。测试源码与辅助6文件，另有runner和开发/历史工具；全部逐项列出，未只取24个旧候选。数据库Schema/约束在storage/control/features/policy/gateway/records/types等原文件中；没有独立Migration或配置Schema文件，不虚构缺失目录。配置目录142 Feature/34 Policy是设计数据，不是全部模块已实现。\n\n'
    readme+='测试夹具函数、内联数据、故障条件及辅助子进程已全部嵌入。tests目录无独立静态输入夹具。旧SQLite/Zstd/对象/段/损坏样本属于历史运行生成物，本轮不转Base64伪装成源码；所有未导出产物及M0研究工具的完整路径、大小、SHA256和原因在Excluded_Artifacts各Part登记，原件/旧分包不改动。\n\n'
    readme+='原始最终证据为135项：131 PASS、4因真实OS链接权限EPERM未运行、0 FAIL；本轮没有重跑。Node/SQLite/Zstd/文件/受控进程及Python/PowerShell AST的历史本地检查用合成输入；控制/Gateway有合成注册模块/PDP/工具回调，部分使用时钟mock和转发spawn spy，不能当作真实模型。真实Provider、OS管理员身份/沙箱、完整生产审计、Vault、全部工作流/五Agent、多语言/LSP、tsc、硬断电、长时soak均未完成或NOT_RUN/BLOCKED。完整安全部署仍BLOCKED。\n\n'
    readme+='原始missing_files.json完整嵌入补充证据：精确逐测试起止时间、部分中间源码版本和内联probe/transcript未保存，不补造。Node24.15.0原生运行TypeScript，无npm依赖、无安装产生的锁文件或tsconfig，外部Python3.12.10/PowerShell7.6.9环境不在本文中替代交付。现有package版本0.4.0-m1.1只是原件标签，不代表本轮开发。\n\n'
    readme+='完整性报告列出自动反向提取/原始字节比对结果及文件映射。所有Markdown（包括完整性报告自身）的SHA256在独立SHA256SUMS.txt；报告不尝试内嵌自己的自引用哈希。敏感筛查只针对本次候选原文和新文档，不读取本机Key池/凭据库/环境变量值；有强凭据格式时只登记路径/行号并阻止输出，不替换成假密钥。\n'
    write_md('README.md',readme)
    emit('byte_comparison_passed',records=checked['record_total'],unique_original_files=checked['unique_original_paths'],payload_documents=len(PAYLOAD_DOCS))
    with (WORK/'governance.log').open('wb') as output:
        gov=subprocess.run([sys.executable,'-B','-X','utf8','ai-workflow-kit-v4/tools/govern.py','check','--target','.'],cwd=ROOT,stdout=output,stderr=subprocess.STDOUT,timeout=240)
    assert gov.returncode==0,(WORK/'governance.log').read_text('utf-8')
    unchanged=preserve(before)
    assert unchanged['status']=='PASS',unchanged
    write_json(WORK/'original_preservation.json',unchanged)
    # Generate the human report only after the independent checks actually finish.
    code_total=sum(Path(x['path']).suffix.lower() in CODE for x in all_items)
    stats={'current_native_implementation_files':len(native),'current_test_files_and_helper':sum(n.startswith('tests/') for n in current),'current_test_entries':sum(n.endswith('.test.ts') and n.startswith('tests/') for n in current),'test_review_code_files_including_developer_tools_and_history':sum(Path(x['path']).suffix.lower() in CODE for x in test_items),'all_original_code_files_including_dev_history':code_total,'all_original_source_configuration_metadata_files':len(all_items),'original_evidence_files':len(evidence),'unique_original_files_exported':len(required),'original_codeblock_occurrences_with_shared_config':sum(r['kind']!='new_export_tool' for r in RECORDS),'codeblock_occurrences_including_new_verification_tool':checked['record_total'],'explicit_excluded_historical_outputs_and_M0_tools':len(exclusions)}
    proof='# AgentNexus M1 文本导出完整性报告\n\n状态：**PASS（本轮导出/字节完整性检查，不是新产品测试）**。核验UTC：'+utc()+'。\n\n## 数量与范围\n\n| 项目 | 数量 |\n|---|---:|\n'
    for key,value in stats.items():proof+='| '+key+' | '+str(value)+' |\n'
    proof+='\n额外1个本轮导出校验工具独立标记，不计入原始M1源码数。14原生实现含仅测试加载的integrity库；M0.1开发工具、M1验证器/探针和v1快照都未冒充Host当前模块。没有单独静态输入夹具、独立Migration/Schema、锁文件或tsconfig，分别说明NOT_AVAILABLE/内嵌位置，未造文件。\n\n'
    proof+='## 实际执行的自动比对\n\n使用与导出器分离的 verify_text_export.py，直接读取每份Markdown的bytes，寻找独立记录标记和动态长度fence，截取原始N个字节，核对closing fence/包装换行、SHA256、UTF8与原件字节相等。计划集合来自全目录枚举、Core ZIP、原始运行快照及03证据清单，不从导出的章节反推预期文件集合。逐项双向比较，防止遗漏或重复掩盖缺件。没有对源文件做换行替换、strip、JSON重排或AST重写。\n\n'
    proof+='- 原件与提取内容逐字节相等：PASS。\n- 源码、测试、研发/历史文本、原始证据必需集合完整：PASS；缺失0，截断0，未说明遗漏0。\n- Core ZIP载荷18文件与当前实际目录/运行快照逐字节相等：PASS；所有当前候选24文件均导出。\n- 全部当前源码的本地导入与固定适配器/配置/子进程资源：在既有闭包与正文核对中完整保留。\n- 现有测试结果不重跑，不改变FAIL/NOT_RUN/CHANGES_REQUIRED；原始正文SHA核对通过。\n- 治理check：PASS，只读检查；没有new/refresh/rules/hooks、commit/push。\n- 原始项目/所有历史包和交付保持：PASS，共'+str(unchanged['checked_files'])+'个既有文件大小、mtime及SHA256不变。\n\n'
    proof+='## 逐文件对应与原始SHA256\n\n| 原始完整相对路径 | 原始字节数 | 原始SHA256 | 文档及正文起始行 |\n|---|---:|---|---|\n'
    seen=collections.defaultdict(list)
    for row in checked['records']:seen[row['path']].append(row)
    for name in sorted(seen):
        row=seen[name][0]
        proof+='| `'+name+'` | '+str(row['bytes'])+' | `'+row['sha256']+'` | '+'<br>'.join('['+v['document']+':'+str(v['body_line'])+']('+v['document']+')' for v in seen[name])+' |\n'
    proof+='\n## 未导出与排除\n\n必需的当前源文件、测试/夹具代码、辅助和本轮指定原始报告没有未导出项。被有意排除的历史生成样本/旧ZIP及M0研究工具，均在Excluded_Artifacts各Part逐完整路径记录SHA256与原因；没有删除或覆盖原件。node_modules、第三方源码、缓存、无关构建产物不进入当前源文件集合，M0.1/M1自有代码已另作递归扫描而没有跟缓存一起忽略。\n\n'
    proof+='## 敏感信息与测试解释\n\n候选原始源码/测试/证据逐文件强格式筛查没有发现凭据；不会读取Live API Key、凭据库或环境变量值。若命中，将仅写路径、行号和模式ID并中止，不会替换秘密。合成测试数据/注册回调/时钟spy是原始测试的一部分，未宣称真实模型验证。所有未执行合同沿用NOT_RUN/BLOCKED。格式/来源检查不构成对任意编码内容的普适秘密证明。\n\n'
    proof+='## 所有文档的SHA256\n\n下表覆盖已生成的其他Markdown；本报告自身的准确SHA256位于[SHA256SUMS.txt](SHA256SUMS.txt)，避免自引用。SHA256SUMS包含本目录每一个Markdown，只有精确的SHA256SUMS.txt自身不做自哈希。\n\n| Markdown | 字节数 | SHA256 |\n|---|---:|---|\n'
    for path in sorted(OUT.glob('*.md')):
        proof+='| ['+path.name+']('+path.name+') | '+str(path.stat().st_size)+' | `'+sha(path)+'` |\n'
    write_md('AgentNexus_M1_Export_Verification.md',proof)
    # New headers/reports are also screened; source block bytes remain untouched.
    for path in OUT.glob('*.md'):check_sensitive(path.name,path.read_bytes())
    sums=[sha(p)+'  '+p.name for p in sorted(OUT.glob('*.md'))]
    (OUT/'SHA256SUMS.txt').write_text('\n'.join(sums)+'\n','ascii')
    for line in (OUT/'SHA256SUMS.txt').read_text('ascii').splitlines():
        checksum,name=line.split('  ',1);assert sha(OUT/name)==checksum
    # Re-run byte parsing after every Markdown has reached its final contents.
    verifier=runpy.run_path(str(WORK/'verify_text_export.py'))
    final=verifier['verify'](ROOT,OUT,plan)
    assert final['status']=='PASS'
    write_json(WORK/'final_verification.json',{'status':'PASS','utc':utc(),'statistics':stats,'original_preservation':unchanged,'all_markdown_checksums_pass':True,'markdown_files':len(sums),'byte_comparison':final,'source_zip_sha256':sha(core),'evidence_zip_sha256':sha(evidence_zip),'product_tests_executed':False,'no_new_zip_created':True})
    emit('complete',original_source_and_metadata_files=len(all_items),original_evidence_files=len(evidence),unique_original_files=len(required),markdown_documents=len(sums),maximum_document_bytes=max(p.stat().st_size for p in OUT.glob('*.md')),original_files_unchanged=unchanged['checked_files'])


if __name__=='__main__':main()
