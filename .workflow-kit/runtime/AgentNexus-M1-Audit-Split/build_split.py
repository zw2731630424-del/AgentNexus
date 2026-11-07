"""Read-only repack of an existing audit ZIP; never executes product/tests."""
import collections
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[3]
WORK_REL = '.workflow-kit/runtime/AgentNexus-M1-Audit-Split'
OUT_REL = 'deliverables/AgentNexus_M1_Audit_Split'
WORK, OUT = ROOT / WORK_REL, ROOT / OUT_REL
ORIGINAL = ROOT / 'deliverables/AgentNexus-M1-Independent-Audit/AgentNexus_M1_Independent_Audit_Package.zip'
EXPECTED_ORIGINAL_SHA = 'e4bb0e83e855a2a56b9a51cd5daedbe161328c42bb3b61923b7db420d6e10b4a'
TEMP_ROOT = Path(r'C:\Users\28642\.codex\visualizations\2026\11\06\01a1b17a-8a97-75c1-b739-34fe99357da5')
R0 = '.workflow-kit/runtime/AgentNexus-v0.4-M0/'
R01 = '.workflow-kit/runtime/AgentNexus-v0.4-M0.1/'
R1 = '.workflow-kit/runtime/AgentNexus-v0.4-M1/'
M0 = '.workflow-kit/tasks/AgentNexus-v0.4-M0/'
M01 = '.workflow-kit/tasks/AgentNexus-v0.4-M0.1/'
MANIFEST = 'PACKAGE_MANIFEST.json'
VERSION = '1.0.0'
GROUPS = ['01_Core_Source', '02_Tests', '03_Runtime_Evidence', '04_Architecture_and_Protocol', '05_Dependencies_and_Build', '06_Original_References']
CHUNK = 131072
MAX_ZIP_BYTES = 50_000_000
TARGET_ZIP_BYTES = 44_000_000
CODE = {'.ts', '.mjs', '.js', '.py', '.ps1', '.sql', '.sh', '.rs', '.go', '.cs', '.tsx', '.cpp', '.c', '.h'}
PATTERNS = {
    'PRIVATE_KEY_MATERIAL': re.compile(rb'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{80,}'),
    'GITHUB_TOKEN_LITERAL': re.compile(rb'(?<![A-Za-z0-9_])(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})'),
    'PROVIDER_KEY_LITERAL': re.compile(rb'(?<![A-Za-z0-9_])sk-(?:(?:proj|ant-api03)-)?[A-Za-z0-9_-]{32,}'),
    'AWS_ACCESS_IDENTIFIER_LITERAL': re.compile(rb'(?<![A-Za-z0-9])(?:AKIA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])'),
    'SLACK_TOKEN_LITERAL': re.compile(rb'xox[baprs]-[0-9A-Za-z-]{30,}'),
}


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def emit(phase, **values):
    print(json.dumps({'phase': phase, **values}, ensure_ascii=False), flush=True)


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as data:
        for block in iter(lambda: data.read(CHUNK), b''):
            digest.update(block)
    return digest.hexdigest()


def load(path):
    return json.loads(Path(path).read_text('utf-8-sig'))


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded(value))


def file_set_digest(rows):
    h = hashlib.sha256()
    for row in sorted(rows, key=lambda x: x['path']):
        h.update((row['path'] + '\0' + str(row['bytes']) + '\0' + row['sha256'] + '\n').encode('utf-8'))
    return h.hexdigest()


def new_path(name):
    return name == WORK_REL or name.startswith(WORK_REL + '/') or name == OUT_REL or name.startswith(OUT_REL + '/')


def workspace_files():
    result = []
    for directory, dirs, names in os.walk(ROOT, followlinks=False):
        parent = Path(directory)
        dirs[:] = sorted(d for d in dirs if not new_path((parent / d).relative_to(ROOT).as_posix()))
        for name in sorted(names):
            path = parent / name
            if not new_path(path.relative_to(ROOT).as_posix()):
                result.append(path)
    return sorted(result)


def baseline():
    rows = []
    for i, path in enumerate(workspace_files(), 1):
        info = path.lstat()
        assert stat.S_ISREG(info.st_mode), 'Unexpected non-regular preexisting file'
        rows.append({'path': path.relative_to(ROOT).as_posix(), 'bytes': info.st_size, 'mtime_ns': info.st_mtime_ns, 'sha256': sha(path)})
        if i % 4000 == 0:
            emit('original_workspace_baseline', files=i)
    result = {'schema': 'agentnexus/split-original-baseline/1', 'utc': utc(), 'scope': 'Every preexisting workspace file including previous audit ZIP, reports and old packaging utilities; excludes only this new task/output', 'files': rows}
    write(WORK / 'original_workspace_baseline.json', result)
    return result


def preservation(before):
    actual = {p.relative_to(ROOT).as_posix(): p for p in workspace_files()}
    expected = {r['path']: r for r in before['files']}
    errors = [{'path': n, 'reason': 'FILE_SET_CHANGED'} for n in sorted(actual.keys() ^ expected.keys())]
    for name in sorted(actual.keys() & expected.keys()):
        path, row = actual[name], expected[name]
        info = path.stat()
        if info.st_size != row['bytes'] or info.st_mtime_ns != row['mtime_ns'] or sha(path) != row['sha256']:
            errors.append({'path': name, 'reason': 'BYTES_OR_MTIME_CHANGED'})
    return {'schema': 'agentnexus/split-original-preservation/1', 'status': 'PASS' if not errors else 'FAIL', 'utc': utc(), 'checked_files': len(expected), 'errors': errors, 'baseline_sha256': sha(WORK / 'original_workspace_baseline.json'), 'original_zip_sha256_before': EXPECTED_ORIGINAL_SHA, 'original_zip_sha256_after': sha(ORIGINAL), 'product_tests_executed': False}


def sensitive_name(name):
    parts = name.split('/')
    last = parts[-1].lower()
    if any(p.lower() in {'.aws', '.ssh', '.gnupg', '.azure', '.kube'} for p in parts):
        return 'credential_directory'
    if last.startswith('.env') or last in {'.npmrc', '.netrc', '.pypirc', 'credentials', 'credentials.json', 'secrets.json', 'id_rsa', 'id_ed25519'}:
        return 'credential_or_environment_filename'
    if Path(last).suffix in {'.pem', '.key', '.pfx', '.p12', '.jks', '.keystore'}:
        return 'key_or_certificate_container'
    return None


def identify_type(name, head):
    if head.startswith(b'SQLite format 3\x00'):
        return 'SQLite_database'
    if head.startswith(b'\x28\xb5\x2f\xfd'):
        return 'Zstandard_stream_or_fault_fixture'
    if head.startswith((b'PK\x03\x04', b'PK\x05\x06')):
        return 'ZIP_archive'
    if head.startswith((b'\x37\x7f\x06\x82', b'\x37\x7f\x06\x83')):
        return 'SQLite_WAL'
    if head.startswith(b'\x7fELF') or head.startswith(b'MZ'):
        return 'native_binary'
    if not head:
        return 'empty_file'
    if b'\0' not in head:
        try:
            head.decode('utf-8')
            suffix = Path(name).suffix.lower()
            return {'.ts': 'TypeScript_source', '.mjs': 'ES_module_source', '.py': 'Python_source', '.ps1': 'PowerShell_source', '.json': 'JSON_data_or_metadata', '.jsonl': 'JSONL_records', '.md': 'Markdown_document', '.tap': 'TAP_log', '.log': 'text_log', '.sql': 'SQL_source'}.get(suffix, 'UTF8_text')
        except UnicodeDecodeError:
            pass
    return 'binary_or_partial_fault_fixture'


def fingerprint_member(z, info, scan=False):
    digest, total, head, previous, hits = hashlib.sha256(), 0, b'', b'', set()
    with z.open(info) as source:
        for block in iter(lambda: source.read(CHUNK), b''):
            if not head:
                head = block[:8192]
            total += len(block)
            digest.update(block)
            if scan:
                value = previous + block
                for key, pattern in PATTERNS.items():
                    if pattern.search(value):
                        hits.add(key)
                previous = value[-32768:]
    assert total == info.file_size, info.filename
    return digest.hexdigest(), head, sorted(hits)


def fixture_role(name):
    if not name.startswith(R1):
        return False
    tail = name[len(R1):].split('/')
    return tail[0] in {'controls', 'gateway', 'demos'} or tail[:2] in [['storage', 'fixtures'], ['integrity', 'fixtures'], ['diagnostics', 'fixtures']] or (tail[0] == 'reviews' and len(tail) > 2)


def classify(name, head, current, upstream_references):
    """Role uses closed source graph, actual test data roots and provenance, not basename importance."""
    role, packages, reason, fixture, original_evidence = None, [], None, False, False
    if name in current:
        if name.startswith('src/'):
            role, packages = 'current_M1_native_source_checker_or_types', [GROUPS[0]]
        elif name.startswith('tests/'):
            role, packages = 'current_M1_test_source_or_child_helper', [GROUPS[1]]
        elif name.startswith('config/'):
            role, packages = 'current_runtime_configuration', [GROUPS[0], GROUPS[1], GROUPS[4]]
        else:
            role, packages = 'current_package_or_test_bootstrap', [GROUPS[0], GROUPS[1], GROUPS[4]]
    elif fixture_role(name):
        role, packages, fixture, original_evidence = 'original_M1_synthetic_persisted_test_fixture', [GROUPS[1]], True, True
    elif name.startswith(R1):
        original_evidence = True
        tail = name[len(R1):]
        if tail.startswith('storage/v1/'):
            role, packages = 'historical_M1_storage_source_or_evidence', [GROUPS[5]]
            if Path(name).suffix in CODE and ('.test.' in name or name.endswith('owned-storage-child.mjs')):
                packages.append(GROUPS[1])
            elif Path(name).suffix not in CODE:
                packages.append(GROUPS[2])
        elif Path(name).suffix == '.zip':
            role, packages = 'historical_M1_source_snapshot_archive', [GROUPS[5]]
        elif Path(name).suffix in CODE:
            role = 'original_M1_test_or_review_engineering_utility'
            packages = [GROUPS[1]] if tail.startswith('reviews/') else [GROUPS[4]]
        else:
            role, packages = 'original_M1_runtime_log_environment_or_review', [GROUPS[2]]
            if name == R1 + 'license-closure.json':
                packages.append(GROUPS[4])
    elif name.startswith((M0, M01)):
        role, packages, original_evidence = 'original_M0_M01_M1_design_or_report', [GROUPS[3], GROUPS[5]], True
        if '/research/license_' in name or name.endswith('architecture/workflow_license_remediation.md'):
            packages.append(GROUPS[4])
    elif name.startswith(R01):
        role, packages, original_evidence = 'original_M01_admission_design_freeze_or_provenance', [GROUPS[5]], True
    elif name.startswith(R0 + 'upstream/'):
        original_evidence = True
        last = Path(name).name.lower()
        license_candidate = last.startswith(('license', 'notice', 'copying'))
        license_content = any(marker in head.lower() for marker in [b'apache license', b'permission is hereby granted', b'mit license', b'copyright', b'gnu general public license', b'license agreement', b'creative commons'])
        if name in upstream_references or (len(name[len(R0 + 'upstream/'):].split('/')) == 2 and last in {'acquisition.json', 'audit-manifest.json', 'tree.json', 'metadata.json'}):
            role, packages = 'original_upstream_acquisition_or_fingerprint_metadata', [GROUPS[5]]
        elif license_candidate and license_content:
            role, packages = 'third_party_license_reference_not_runtime_dependency', [GROUPS[4], GROUPS[5]]
        else:
            role = 'M0_third_party_research_source_cache_not_loaded_by_M1'
            reason = 'EXCLUDED_RESEARCH_CACHE: outside exact M1 source/import/resource/test closure; no npm dependency on this code. M0 research reports, acquisition metadata, fingerprints and applicable license texts retained.'
    elif name.startswith(R0):
        original_evidence = True
        tail = name[len(R0):]
        if tail.startswith(('workflow-sandbox/', 'workflow-hardlink/', 'storage-probe/')):
            role = 'M0_isolated_scratch_or_redundant_workflow_copy'
            reason = 'EXCLUDED_M0_TEMPORARY_DATA: not used by M1; canonical Workflow Kit and original M0 logs/probe programs/results retained.'
        elif identify_type(name, head) in {'SQLite_database', 'SQLite_WAL', 'Zstandard_stream_or_fault_fixture', 'binary_or_partial_fault_fixture', 'native_binary'}:
            role = 'M0_generated_binary_feasibility_artifact'
            reason = 'EXCLUDED_M0_BINARY: M0-only feasibility fixture, not an M1 runtime component or input; M1 tests generate their own data, and all recorded M1 binary evidence is retained.'
        else:
            role, packages = 'original_M0_research_or_verification_metadata', [GROUPS[5]]
            if tail.startswith('primary-dependency-metadata/'):
                packages.append(GROUPS[4])
    elif name.startswith('ai-workflow-kit-v4/') or name == 'ai-workflow-kit-v4.0.0.zip' or name.startswith('inputs/'):
        role, packages, original_evidence = 'original_Workflow_Kit_or_user_reference_not_runtime_dependency', [GROUPS[5]], True
    elif name in {'test_evidence_index.json', 'source_snapshot_manifest.json', 'missing_files.json'}:
        role, packages, original_evidence = 'original_audit_evidence_version_or_availability_index', [GROUPS[2], GROUPS[5]], True
    elif name == 'dependency_inventory.json':
        role, packages, original_evidence = 'original_actual_dependency_inventory', [GROUPS[4]], True
    else:
        role, packages, original_evidence = 'original_audit_or_rule_snapshot', [GROUPS[5]], True
    source_test_markers = any(marker in head.lower() for marker in [b'unittest', b'pytest', b"from 'node:test'", b'from "node:test"', b'describe(', b'test(', b'#[test]', b'@test'])
    referenced_test_source = Path(name).suffix in CODE and any(p in {'test', 'tests', '__tests__'} for p in name.split('/')) and source_test_markers
    return {'category': role, 'package_groups': sorted(set(packages)), 'excluded': not packages, 'exclusion_reason': reason,
            'is_actual_runtime_source': name in current and name.startswith('src/'),
            'is_current_runtime_candidate': name in current,
            'is_test': referenced_test_source or (name in current and name.startswith('tests/')) or (name.startswith(R1) and Path(name).suffix in CODE and ('/reviews/' in name or '.test.' in name or name.endswith('owned-storage-child.mjs'))),
            'is_current_M1_test_source': name in current and name.startswith('tests/'),
            'is_test_fixture': fixture or role == 'M0_generated_binary_feasibility_artifact', 'is_original_runtime_evidence': original_evidence and name.startswith(R1) and Path(name).suffix not in CODE,
            'is_historical_evidence': original_evidence, 'is_historical_version': '/storage/v1/' in name or '/design-freeze-v1/' in name or '/final-run-1/' in name,
            'is_generated': fixture or Path(name).suffix in {'.tap', '.log', '.sqlite', '.zst'} or name.endswith('manifest.json'),
            'is_cache': role in {'M0_third_party_research_source_cache_not_loaded_by_M1', 'M0_isolated_scratch_or_redundant_workflow_copy'} or '/.pytest_cache/' in name,
            'is_build_artifact': identify_type(name, head) == 'native_binary', 'is_actual_third_party_dependency': False,
            'classification_basis_id': 'PROVENANCE_CONTENT_AND_CLOSED_RUNTIME_GRAPH_V1'}


def read_inventory(z, original_sha):
    prior_manifest = json.loads(z.read('audit_package_manifest.json'))
    prior = {row['path']: row for row in prior_manifest['files']}
    snapshot = json.loads(z.read('source_snapshot_manifest.json'))
    current = {row['path']: row for row in snapshot['current_runtime_candidate_files']}
    source_references = json.loads(z.read(M0 + 'research/source_snapshots.json'))
    refs = {row['manifest'].replace('\\', '/') for row in source_references['snapshots']}
    assert MANIFEST not in z.namelist(), 'Reserved root split manifest collides with original payload'
    assert set(z.namelist()) == set(prior) | {'audit_package_manifest.json'}
    rows, duplicates = [], collections.defaultdict(list)
    for i, info in enumerate(z.infolist(), 1):
        digest, head, _ = fingerprint_member(z, info)
        if info.filename != 'audit_package_manifest.json':
            expected = prior[info.filename]
            assert digest == expected['sha256'] and info.file_size == expected['bytes'], info.filename
        facts = classify(info.filename, head, current, refs)
        row = {'path': info.filename, 'bytes': info.file_size, 'sha256': digest, 'file_type': identify_type(info.filename, head),
               'original_zip_compressed_bytes': info.compress_size, **facts,
               'is_build_artifact_or_cache': facts['is_build_artifact'] or facts['is_cache'],
               'assigned_packages': []}
        if sensitive_name(info.filename):
            assert row['excluded'], 'Sensitive filename in necessary review payload: ' + info.filename
        rows.append(row)
        duplicates[(info.file_size, digest)].append(info.filename)
        if i % 3000 == 0:
            emit('original_archive_inventory', files=i)
    duplicate_groups = []
    duplicate_ids = {}
    for (size, digest), paths in sorted(duplicates.items(), key=lambda x: x[0][1]):
        if len(paths) > 1:
            group_id = 'DUP-' + digest
            duplicate_groups.append({'duplicate_group_id': group_id, 'bytes_each': size, 'sha256': digest, 'paths': sorted(paths)})
            for path in paths:
                duplicate_ids[path] = group_id
    for row in rows:
        row['is_duplicate_file'] = row['path'] in duplicate_ids
        row['duplicate_group_id'] = duplicate_ids.get(row['path'])
    # Reconcile a full live directory inventory, not a whitelist limited to old 24 paths.
    live = []
    for name in ['src', 'tests', 'tools', 'config']:
        live += [p.relative_to(ROOT).as_posix() for p in (ROOT / name).rglob('*') if p.is_file()]
    live.append('package.json')
    assert set(live) == set(current), 'Live current implementation has unaccounted files relative to original snapshot'
    for name in live:
        path = ROOT / name
        assert path.stat().st_size == current[name]['bytes'] and sha(path) == current[name]['sha256'], 'Live source differs from original audit candidate: ' + name
    return rows, duplicate_groups, snapshot


def partition(rows):
    result = []
    for group in GROUPS:
        files = [row for row in rows if group in row['package_groups']]
        assert files, 'Empty required category: ' + group
        pinned = []
        if group == GROUPS[1]:
            pinned = [r for r in files if r['is_test'] or r['path'] in {'package.json', 'tools/agentnexus/run-tests.mjs'} or r['path'].startswith('config/')]
        pinned_names = {r['path'] for r in pinned}
        def weight(row):
            return row['original_zip_compressed_bytes'] + len(row['path'].encode('utf-8')) * 3 + 1300
        bins = [{'files': pinned, 'weight': sum(weight(r) for r in pinned)}] if pinned else []
        for row in sorted((r for r in files if r['path'] not in pinned_names), key=lambda r: (-weight(r), r['path'])):
            amount = weight(row)
            assert amount + 100000 < MAX_ZIP_BYTES, 'Single original file cannot fit a standalone <=50MB ZIP'
            selected = next((b for b in bins if b['weight'] + amount <= TARGET_ZIP_BYTES), None)
            if selected is None:
                selected = {'files': [], 'weight': 0}
                bins.append(selected)
            selected['files'].append(row)
            selected['weight'] += amount
        for i, bucket in enumerate(bins, 1):
            package_id = group + ('_Part' + str(i) if len(bins) > 1 else '')
            for row in bucket['files']:
                row['assigned_packages'].append(package_id)
            result.append({'package_id': package_id, 'package_group': group, 'name': package_id + '.zip', 'part': i, 'parts_total': len(bins), 'rows': sorted(bucket['files'], key=lambda r: r['path'])})
    return result


def build_packages(z, packages, original_sha):
    result = []
    for package in packages:
        package_id, rows = package['package_id'], package['rows']
        entries = []
        for row in rows:
            entries.append({'path': row['path'], 'bytes': row['bytes'], 'sha256': row['sha256'], 'category': row['category'],
                            'original_source': {'archive_sha256': original_sha, 'member_path': row['path']}, 'is_historical_evidence': row['is_historical_evidence'],
                            'is_current_actual_source': row['is_actual_runtime_source'], 'is_current_runtime_candidate': row['is_current_runtime_candidate'],
                            'is_test': row['is_test'], 'is_test_fixture': row['is_test_fixture'], 'is_original_runtime_evidence': row['is_original_runtime_evidence']})
        manifest = {'schema': 'agentnexus/audit-split-package/1', 'package_id': package_id, 'package_version': VERSION, 'package_group': package['package_group'],
                    'part': package['part'], 'parts_total': package['parts_total'], 'created_utc': utc(),
                    'file_total': len(entries), 'file_total_including_manifest': len(entries) + 1, 'total_bytes': sum(r['bytes'] for r in rows),
                    'totals_scope': 'Original payload only; exact root PACKAGE_MANIFEST.json is self-excluded to avoid recursive hashing.',
                    'exact_self_exclusion': MANIFEST, 'self_hash_binding': 'Archive SHA256 and this manifest SHA256 are in the external master index and SHA256SUMS.txt.',
                    'original_archive_sha256': original_sha, 'payload_file_set_sha256': file_set_digest(rows), 'files': entries}
        data = encoded(manifest)
        target = OUT / package['name']
        with zipfile.ZipFile(target, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as dest:
            for row in rows:
                with z.open(row['path']) as source, dest.open(row['path'], 'w', force_zip64=True) as output:
                    shutil.copyfileobj(source, output, CHUNK)
            dest.writestr(MANIFEST, data)
        assert target.stat().st_size <= MAX_ZIP_BYTES, (target.name, target.stat().st_size)
        external_manifest = 'manifests/' + package_id + '.json'
        (OUT / external_manifest).parent.mkdir(parents=True, exist_ok=True)
        (OUT / external_manifest).write_bytes(data)
        record = {'package_id': package_id, 'package_version': VERSION, 'package_group': package['package_group'], 'name': target.name,
                  'bytes': target.stat().st_size, 'sha256': sha(target), 'file_total': len(rows), 'archive_file_total_including_manifest': len(rows) + 1,
                  'uncompressed_payload_bytes': manifest['total_bytes'], 'manifest_sha256': hashlib.sha256(data).hexdigest(), 'external_manifest': external_manifest,
                  'part': package['part'], 'parts_total': package['parts_total'], 'payload_file_set_sha256': manifest['payload_file_set_sha256'],
                  'covered_files': [r['path'] for r in rows], 'coverage_complete': True, 'overlap_with_other_packages': []}
        result.append(record)
        emit('package_written', name=target.name, bytes=record['bytes'], files=record['file_total'])
    return result


def make_readme(packages):
    table = '\n'.join('| ' + p['name'] + ' | ' + str(p['file_total']) + ' | ' + f"{p['bytes']/1000000:.3f}" + ' |' for p in packages)
    return '''# AgentNexus M1 独立审查分包

本交付只拆分已有审计包。原始 ZIP、源码、测试、配置、规则、M0/M0.1 历史交付及测试结果均未修改，没有执行产品测试或 M1.1 开发。所有原始载荷保留 ZIP 内完整相对路径和原始字节。

## 用途与顺序

1. **01_Core_Source**：全部当前原生库、检查器、类型/接口、Feature/Policy/Gateway/Archive/Audit/Artifact/DIE/CLI，以及实际配置与启动脚本。全目录与最后实际测试候选核对，未按 24 文件白名单裁剪。
2. **02_Tests**：全部当前测试、辅助进程、审查探针、保留的历史测试源码和所有原始 M1 持久化合成样本。所有测试源码固定放在 Part1；大样本分配到其余 Part。数据库、对象、段是原始测试输入/输出证据，不是可删除的缓存。全部 Parts 合并才能恢复这些样本。
3. **03_Runtime_Evidence**：最终及早期原始 TAP/JSON、失败/跳过、整改前后审查、demo、执行环境、时间和版本绑定。样本本体位于 02；这不是删减或重写日志。135 项最终记录为 131 PASS、4 NOT_RUN/SKIP（真实 OS 链接权限 EPERM）、0 FAIL，本轮未重新执行。
4. **04_Architecture_and_Protocol**：全部 50 份 M0/M0.1/M1 历史交付，包括目录、协议、9 ADR、设计、矩阵、计划和许可证/安全/工作流分析。
5. **05_Dependencies_and_Build**：真实 package.json、配置/runner、实际依赖闭包和原始许可证据、工程验证工具。研究许可文本不是已引入的运行依赖。
6. **06_Original_References**：原始 M0/M0.1 清单和报告、源快照/旧版本、来源获取信息、Workflow Kit 原件和打包证据。部分设计文件按请求与 04 重复，原始字节相同，重复清单在总索引中。旧版源码与当前源码分开保存，不覆盖当前 src/。

| ZIP | 原始载荷文件数 | ZIP 大小 MB（十进制） |
|---|---:|---:|
''' + table + '''

50 MB 是硬上限。原生代码和文档本来很小，未填入无关数据凑到 20 MB。Parts 都是完整、可单独打开的普通 ZIP，不是需要拼接的二进制分卷。

`package_inventory.json` 覆盖原始 ZIP 的每个文件，记录实际 SHA256、类型、角色、生成/历史/缓存/重复标记和逐路径排除原因。只排除了不被 M1 加载的 M0 上游研究源码缓存、M0 隔离临时副本和 M0 二进制探针残留；原始包继续保留。所有 M1 原始目录、45 个当前/附加工程源码候选、50 份历史交付均保留。合并要求是 inventory 里未排除的完整审查集合，不是原始 418MB 包中的非运行缓存；旧的 audit_package_manifest.json 仍按历史原件保留，不能把它当成缩减后目录的清单。

## 独立验证与恢复

每包根目录都有独立 `PACKAGE_MANIFEST.json`，记录原始载荷的完整路径和 SHA256。只有这个精确根路径不记录自哈希；其 SHA256 在总索引中，ZIP 的哈希在 SHA256SUMS 中。嵌套同名文件没有特殊豁免。

先校验整个交付目录的 SHA256SUMS，再按清单验证每包，最后合并。提供的工具仅用 Python 标准库，不导入或执行产品，也不需要原始 418MB ZIP：

```powershell
python -I -B verification/verify_split_packages.py --directory <分包目录绝对路径> --output-parent <新的临时目录绝对路径>
```

工具拒绝路径穿越、重复/大小写冲突、链接和未登记文件，逐包独立解压并复算 SHA256；同路径跨包重复必须是完全相同字节。各包的根 PACKAGE_MANIFEST 只保留在各自解压目录，不写进合并树，避免多包元数据相互覆盖。完整合并目录由输出报告的 `merged_directory` 给出，payload 文件集合须与 inventory 逐项双向相等。单包也可用标准 unzip/Expand-Archive 解压至自己的目录后按该包 manifest 校验；不要盲目把不同根 PACKAGE_MANIFEST 覆盖到同一文件。

`AgentNexus_M1_Audit_Package_Index.json` 列出全部 ZIP 大小、哈希、覆盖路径、重复关系和完整性范围。`verification/package_integrity.json`、`file_completeness.json`、`sensitive_data_scan.json` 是本次真实分包校验结果，不替代历史运行证据。

## 环境、依赖和测试

原始环境为 Windows 11、Node **24.15.0**（内置 SQLite 3.51.3、Zstd 1.5.7）、Python **3.12.10**、PowerShell **7.6.9**。实际 package.json 的 dependencies 和 devDependencies 均为空，传递 npm 依赖也为空；没有进行 npm install，因此 package-lock.json/其他锁文件不存在，明确 NOT_AVAILABLE。无需安装 npm 包，也不生成替代锁文件。没有独立 tsconfig、编译/Migration 目录；Node 原生擦除 TypeScript，SQL Schema 和验证代码在 src/agentnexus/storage.ts、control.ts、features.ts、policy.ts、gateway.ts、types.ts 等原件中。静态 tsc 检查 NOT_RUN。外部 Node/Python/PowerShell 安装按原始版本说明准备，二进制与完整再分发许可闭包未提供；不能靠不存在的锁文件复现这些外部二进制。

为了不覆盖历史证据，复跑时另建工作目录，只从已验证的合并目录复制 src/、tests/、tools/、config/、package.json。在副本根目录运行：

```powershell
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
Remove-Item Env:NODE_PATH -ErrorAction SilentlyContinue
node tools/agentnexus/run-tests.mjs > new-audit-run.tap 2>&1
node src/agentnexus/cli.ts demo > new-audit-demo.json 2> new-audit-demo.stderr.txt
```

运行测试会向固定相对 runtime 路径写新结果；不要在历史证据合并树运行，不要调用历史 final_verify.py 的交付更新入口。外部 OS 权限/解释器差异可能改变跳过数量，不能预先声明新测试通过。

已保存测试实际执行 Node/SQLite/Zstd/文件系统/受控进程及真实 JSON/Python AST/PowerShell AST 检查器，使用合成数据。控制和 Gateway 测试含注册的合成工具/模块/PDP 回调，部分包含受控时钟或转发 spawn spy；这些替身不等于真实模型后端。没有真实或 Fake 模型 Provider 联调记录，真实模型验证 NOT_RUN。原始 test_evidence_index.json 明确每项执行/替身/模拟标记。

## 已知限制与缺口

完整安全部署仍 BLOCKED：OS 管理身份/任意执行沙箱、真实 Provider/费用/Key 池、全部审计生产者、加密 Vault、完整工作流/五 Agent、多语言/LSP、硬断电和长期 soak 均未完成或 NOT_RUN。142 Feature/34 Policy 是完整设计目录，不是全部实现。

最终 TAP 未记录逐测试绝对起止时间；部分中间版本只有 hash 没有保留源码字节，部分内联审查程序/初次 Gateway 失败原始 transcript 未保存为文件，均沿用原始 missing_files.json 的 NOT_AVAILABLE，不补造。verification/missing_materials.json 另列本次锁文件/配置/Migration 的实际位置和缺失原因。

敏感检查仅针对拟交付文件和允许保留的嵌套 ZIP，不扫描本机 API Key、凭据库或环境变量值。所有 .env/凭据容器均禁止，原始包已排除的文件不会从工作区补回。合成数据库/压缩/损坏样本按原始来源保留；格式筛查不是对任意编码秘密的数学证明。原始许可证/Workflow Kit 权利限制保留，不把研究参考材料当成已许可的产品依赖。

审查结束前保留各包、总索引、SHA256SUMS 和验证报告。本次工作到打包验证为止，没有开展 M1.1。
'''


def governance():
    started = utc()
    command = [sys.executable, '-B', '-X', 'utf8', 'ai-workflow-kit-v4/tools/govern.py', 'check', '--target', '.']
    with (WORK / 'governance.log').open('wb') as output:
        result = subprocess.run(command, cwd=ROOT, stdout=output, stderr=subprocess.STDOUT, timeout=240)
    record = {'status': 'PASS' if result.returncode == 0 else 'FAIL', 'started_utc': started, 'ended_utc': utc(), 'command': command, 'exit_code': result.returncode, 'scope': 'Read-only existing lite governance; no new/refresh/rules/hooks or existing metadata changes'}
    write(WORK / 'governance.json', record)
    return record


def checksums():
    rows = []
    for path in sorted(OUT.rglob('*')):
        if path.is_file() and path != OUT / 'SHA256SUMS.txt':
            rows.append(sha(path) + '  ' + path.relative_to(OUT).as_posix())
    (OUT / 'SHA256SUMS.txt').write_text('\n'.join(rows) + '\n', 'utf-8')


def main():
    assert not OUT.exists(), 'Refusing to overwrite a split delivery'
    OUT.mkdir(parents=True)
    (OUT / 'verification').mkdir()
    before = baseline()
    original_sha = sha(ORIGINAL)
    assert original_sha == EXPECTED_ORIGINAL_SHA, 'Original archive fingerprint differs'
    emit('original_archive_verified', bytes=ORIGINAL.stat().st_size, sha256=original_sha)
    # Independent path validator is a packaging utility, never product code.
    import runpy
    validate_paths = runpy.run_path(str(WORK / 'verify_split_packages.py'))['validate_paths']
    with zipfile.ZipFile(ORIGINAL) as original:
        validate_paths(original.namelist())
        rows, duplicates, snapshot = read_inventory(original, original_sha)
        selected = [row for row in rows if not row['excluded']]
        current = snapshot['current_runtime_candidate_files']
        selected_names = {row['path'] for row in selected}
        assert {r['path'] for r in current} <= selected_names
        assert {r['path'] for r in snapshot['additional_authored_engineering_sources']} <= selected_names
        assert all(row['path'] in selected_names for row in rows if row['path'].startswith((R1, M0, M01)))
        packages = partition(rows)
        inventory = {'schema': 'agentnexus/original-audit-package-inventory/1', 'created_utc': utc(), 'original_archive': {'name': ORIGINAL.name, 'bytes': ORIGINAL.stat().st_size, 'sha256': original_sha},
                     'original_file_total': len(rows), 'original_uncompressed_bytes': sum(r['bytes'] for r in rows), 'selected_review_file_total': len(selected), 'excluded_file_total': len(rows) - len(selected),
                     'current_source_snapshot_id': snapshot['source_snapshot_id'], 'live_source_correspondence': 'PASS; full live src/tests/tools/config enumeration and every candidate hash equal original actual run snapshot',
                     'classification_evidence': {'PROVENANCE_CONTENT_AND_CLOSED_RUNTIME_GRAPH_V1': {'method': 'Exact verified source candidate/import/resource closure plus actual test/fixture provenance, historical manifests, content magic and license text. A filename alone does not establish runtime importance.', 'records': ['source_snapshot_manifest.json', R1+'final-verification.json', R1+'license-closure.json', 'test_evidence_index.json', R1+'storage/v1/snapshot.json', M0+'research/source_snapshots.json'], 'external_runtime_dependencies': 'Node/Python/PowerShell are externally installed, not archived payloads. No direct/dev/transitive npm dependencies.'}},
                     'selected_review_file_set_sha256': file_set_digest(selected), 'duplicate_groups': duplicates, 'files': rows,
                     'importance_policy': 'Retain all actual M1 implementation, tests/probes, persistent test data and original logs; all 50 historical deliveries and source/rights/version evidence. Exclude only explicitly classified M0 research caches/temp/binary artifacts outside complete M1 runtime closure. No currently used module, real M1 evidence or fixture removed.',
                     'dependency_note': 'Actual npm direct/dev/transitive dependency sets are empty; upstream research source caches are not introduced dependencies.'}
        write(OUT / 'package_inventory.json', inventory)
        emit('inventory_complete', original_files=len(rows), selected_files=len(selected), excluded_files=len(rows)-len(selected), packages=len(packages))
        records = build_packages(original, packages, original_sha)
    memberships = collections.defaultdict(list)
    for row in selected:
        for package in row['assigned_packages']:
            memberships[row['path']].append(package)
    overlaps = [{'path': row['path'], 'bytes': row['bytes'], 'sha256': row['sha256'], 'packages': memberships[row['path']], 'reason': 'Intentional byte-identical bootstrap/test configuration or historical evidence repeated in requested categories; merge once, never overwrite different bytes.'} for row in selected if len(memberships[row['path']]) > 1]
    for record in records:
        record['overlap_with_other_packages'] = [{'path': x['path'], 'packages': [p for p in x['packages'] if p != record['package_id']]} for x in overlaps if record['package_id'] in x['packages']]
    shutil.copyfile(WORK / 'verify_split_packages.py', OUT / 'verification/verify_split_packages.py')
    (OUT / 'README_INDEPENDENT_AUDIT.md').write_text(make_readme(records), 'utf-8')
    missing = {'schema': 'agentnexus/split-missing-materials/1', 'status': 'PASS', 'required_available_original_files_missing': [], 'items': [
        {'path': 'package-lock.json', 'status': 'NOT_AVAILABLE', 'reason': 'No npm packages installed or required; dependencies/devDependencies/transitive npm dependencies all empty. No lockfile fabricated.'},
        {'path': 'pnpm-lock.yaml / yarn.lock', 'status': 'NOT_AVAILABLE', 'reason': 'Not used by this implementation.'},
        {'path': 'tsconfig.json', 'status': 'NOT_AVAILABLE', 'reason': 'Node native TypeScript stripping; static tsc NOT_RUN.'},
        {'path': 'standalone database migration / configuration schema files', 'status': 'NOT_AVAILABLE', 'reason': 'SQL creation and validators are embedded in the preserved src/agentnexus modules, no separate files exist.'},
        {'path': 'original intermediate-source/timing/probe-transcript gaps', 'status': 'NOT_AVAILABLE', 'reason': 'Use original missing_files.json, preserved verbatim. No absent history regenerated.'},
        {'path': 'Node/Python/PowerShell runtime binaries and redistribution closure', 'status': 'NOT_AVAILABLE', 'reason': 'Original source-only delivery did not bundle them; versions and purpose are in dependency_inventory.json. No npm lockfile can install these OS runtimes.'}]}
    write(OUT / 'verification/missing_materials.json', missing)
    external_names = ['package_inventory.json', 'README_INDEPENDENT_AUDIT.md', 'verification/verify_split_packages.py', 'verification/missing_materials.json']
    index = {'schema': 'agentnexus/M1-audit-split-index/1', 'package_version': VERSION, 'created_utc': utc(), 'complete': True,
             'completeness_scope': 'Complete selected review file set: every M1 implementation/test/original runtime file, all historical deliveries, version/license provenance. Explicitly excluded non-runtime M0 caches and temporary/binary artifacts are listed per original path in package_inventory.json.',
             'original_archive': inventory['original_archive'], 'source_snapshot_id': snapshot['source_snapshot_id'], 'current_source_version': snapshot['current_source_version'],
             'package_total': len(records), 'maximum_zip_bytes': MAX_ZIP_BYTES, 'target_zip_bytes': TARGET_ZIP_BYTES, 'packages': records,
             'selected_original_file_total': len(selected), 'selected_original_file_set_sha256': file_set_digest(selected),
             'all_original_M1_runtime_file_total': sum(r['path'].startswith(R1) for r in rows), 'current_runtime_candidate_total': len(current), 'additional_engineering_source_total': len(snapshot['additional_authored_engineering_sources']),
             'intentional_cross_package_duplicates': overlaps, 'duplicate_policy': 'Only original payload paths with identical size/hash may overlap. PACKAGE_MANIFEST.json is per-package metadata, not a merged payload; kept in separate per-package extraction roots.',
             'files': [{'path': name, 'bytes': (OUT/name).stat().st_size, 'sha256': sha(OUT/name)} for name in external_names],
             'verification_reports': ['verification/package_integrity.json', 'verification/file_completeness.json', 'verification/sensitive_data_scan.json', 'verification/original_preservation.json'],
             'checksums': 'SHA256SUMS.txt covers every published file except this exact checksum file; index itself is covered there.',
             'history_status': '135 original final tests: 131 PASS, 4 OS links NOT_RUN/SKIP, 0 FAIL; no product tests rerun in splitting.'}
    write(OUT / 'AgentNexus_M1_Audit_Package_Index.json', index)
    # Independent extraction is outside the governed source tree; archived rules stay data.
    container = Path(tempfile.mkdtemp(prefix='AgentNexus-M1-Audit-Split-', dir=TEMP_ROOT)).resolve()
    write(WORK / 'verification_location.json', {'temporary_container': str(container), 'outside_original_workspace': not container.is_relative_to(ROOT)})
    command = [sys.executable, '-I', '-B', '-X', 'utf8', str(WORK/'verify_split_packages.py'), '--directory', str(OUT), '--output-parent', str(container), '--report-directory', str(OUT/'verification'), '--allow-checksums-not-yet-written']
    emit('independent_verification_started', packages=len(records), temporary_container=str(container))
    with (WORK/'independent_verification.log').open('wb') as output:
        checked = subprocess.run(command, stdout=output, stderr=subprocess.STDOUT, timeout=600)
    assert checked.returncode == 0, (WORK/'independent_verification.log').read_text('utf-8')
    gov = governance()
    assert gov['status'] == 'PASS', gov
    after = preservation(before)
    assert after['status'] == 'PASS' and after['original_zip_sha256_after'] == original_sha, after
    write(OUT/'verification/original_preservation.json', after)
    report = load(OUT/'verification/package_integrity.json')
    report['original_workspace_preservation'] = after
    report['governance'] = gov
    write(OUT/'verification/package_integrity.json', report)
    shutil.copyfile(WORK/'governance.log', OUT/'verification/governance.log')
    checksums()
    checksum_errors = []
    for line in (OUT/'SHA256SUMS.txt').read_text('utf-8').splitlines():
        digest, name = line.split('  ', 1)
        if sha(OUT/name) != digest:
            checksum_errors.append(name)
    assert not checksum_errors, checksum_errors
    write(WORK/'completion.json', {'status': 'PASS', 'utc': utc(), 'output': str(OUT), 'packages': len(records), 'selected_files': len(selected), 'excluded_files': len(rows)-len(selected), 'zip_bytes_total': sum(p['bytes'] for p in records), 'zip_bytes_max': max(p['bytes'] for p in records), 'original_files_unchanged': after['checked_files'], 'all_checksums_pass': True, 'product_tests_executed': False})
    emit('complete', packages=len(records), selected_files=len(selected), excluded_files=len(rows)-len(selected), maximum_zip_bytes=max(p['bytes'] for p in records), original_files_unchanged=after['checked_files'])


if __name__ == '__main__':
    main()
