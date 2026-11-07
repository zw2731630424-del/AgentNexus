"""Original-workspace packaging utility; writes only new audit artifact directories.

The exported copy is provenance, not a relocation-safe product/test entry point.
Use verify_audit_package.py for independent review of a delivered archive.
"""
import argparse
import collections
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import re
import runpy
import shutil
import stat
import subprocess
import sys
import time
import zipfile

ROOT = Path(__file__).resolve().parents[3]
WORK_REL = '.workflow-kit/runtime/AgentNexus-M1-Independent-Audit'
OUT_REL = 'deliverables/AgentNexus-M1-Independent-Audit'
WORK, OUT = ROOT / WORK_REL, ROOT / OUT_REL
LOCATION_FILE = WORK / 'staging_location.json'
LOCATION = json.loads(LOCATION_FILE.read_text('utf-8')) if LOCATION_FILE.exists() else {}
STAGE_BASE = Path(LOCATION.get('stage', str(WORK / 'stage')))
STAGE = Path('\\\\?\\' + str(STAGE_BASE)) if os.name == 'nt' else STAGE_BASE
EXTRACT_PARENT = Path(LOCATION.get('verification_parent', str(WORK / 'verification')))
M0 = '.workflow-kit/tasks/AgentNexus-v0.4-M0'
M01 = '.workflow-kit/tasks/AgentNexus-v0.4-M0.1'
R0 = '.workflow-kit/runtime/AgentNexus-v0.4-M0'
R01 = '.workflow-kit/runtime/AgentNexus-v0.4-M0.1'
R1 = '.workflow-kit/runtime/AgentNexus-v0.4-M1'
MANIFEST = 'audit_package_manifest.json'
ZIP_NAME = 'AgentNexus_M1_Independent_Audit_Package.zip'
CHUNK = 131072
CODE_EXTENSIONS = {'.ts', '.mts', '.cts', '.mjs', '.cjs', '.js', '.py', '.ps1', '.sql', '.sh'}
PRIMARY_DIRS = ('src/', 'tests/', 'tools/', 'config/', 'app/', 'lib/', 'packages/', 'scripts/', 'test/')
STRONG_PATTERNS = {
    'PRIVATE_KEY_MATERIAL': re.compile(rb'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{80,}'),
    'GITHUB_TOKEN_LITERAL': re.compile(rb'(?<![A-Za-z0-9_])(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})'),
    'PROVIDER_KEY_LITERAL': re.compile(rb'(?<![A-Za-z0-9_])sk-(?:(?:proj|ant-api03)-)?[A-Za-z0-9_-]{32,}'),
    'AWS_ACCESS_IDENTIFIER_LITERAL': re.compile(rb'(?<![A-Za-z0-9])(?:AKIA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])'),
    'SLACK_TOKEN_LITERAL': re.compile(rb'xox[baprs]-[0-9A-Za-z-]{30,}'),
}


def stamp():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def emit(phase, **detail):
    print(json.dumps({'phase': phase, **detail}, ensure_ascii=False), flush=True)


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as handle:
        for block in iter(lambda: handle.read(CHUNK), b''):
            h.update(block)
    return h.hexdigest()


def load(path):
    return json.loads(Path(path).read_text('utf-8-sig'))


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', 'utf-8')


def rel(path):
    return Path(path).relative_to(ROOT).as_posix()


def new_artifact_path(name):
    return name == WORK_REL or name.startswith(WORK_REL + '/') or name == OUT_REL or name.startswith(OUT_REL + '/')


def original_files():
    result = []
    for directory, dirs, names in os.walk(ROOT, followlinks=False):
        parent = Path(directory)
        dirs[:] = sorted(d for d in dirs if not new_artifact_path(rel(parent / d)))
        for name in sorted(names):
            path = parent / name
            if not new_artifact_path(rel(path)):
                result.append(path)
    return sorted(result)


def fingerprint(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode):
        return {'path': rel(path), 'bytes': info.st_size, 'sha256': None, 'file_type': 'NON_REGULAR', 'mtime_ns': info.st_mtime_ns}
    return {'path': rel(path), 'bytes': info.st_size, 'sha256': sha(path), 'file_type': 'REGULAR', 'mtime_ns': info.st_mtime_ns}


def preserve(baseline):
    actual = {rel(path): path for path in original_files()}
    expected = {row['path']: row for row in baseline['files']}
    errors = [{'path': p, 'reason': 'REMOVED'} for p in sorted(expected.keys() - actual.keys())]
    errors += [{'path': p, 'reason': 'UNREGISTERED_NEW_ORIGINAL_SCOPE_FILE'} for p in sorted(actual.keys() - expected.keys())]
    for name in sorted(expected.keys() & actual.keys()):
        row, path = expected[name], actual[name]
        info = path.lstat()
        if info.st_size != row['bytes'] or info.st_mtime_ns != row['mtime_ns'] or (row['sha256'] is not None and sha(path) != row['sha256']):
            errors.append({'path': name, 'reason': 'BYTES_OR_MTIME_CHANGED'})
    return {'status': 'PASS' if not errors else 'FAIL', 'checked_files': len(expected), 'errors': errors, 'checked_utc': stamp()}


def sensitive_filename(name):
    parts = name.replace('\\', '/').split('/')
    last = parts[-1].lower()
    if any(part.lower() in {'.aws', '.ssh', '.gnupg', '.azure', '.kube'} for part in parts):
        return 'CREDENTIAL_DIRECTORY_NAME'
    if last.startswith('.env'):
        return 'ENVIRONMENT_FILE_EXCLUDED_EVEN_IF_EXAMPLE'
    if last in {'.npmrc', '.netrc', '.pypirc', 'credentials', 'credentials.json', 'secrets.json', 'id_rsa', 'id_ed25519'}:
        return 'CREDENTIAL_LIKE_FILENAME'
    if Path(last).suffix in {'.pem', '.key', '.pfx', '.p12', '.jks', '.keystore'}:
        return 'KEY_OR_CERTIFICATE_CONTAINER_EXCLUDED_CONSERVATIVELY'
    return None


def strong_hits(handle):
    hits, previous = set(), b''
    while True:
        block = handle.read(CHUNK)
        if not block:
            break
        data = previous + block
        for name, pattern in STRONG_PATTERNS.items():
            if pattern.search(data):
                hits.add(name)
        previous = data[-32768:]
    return sorted(hits)


def nested_archive_check(path):
    issues, members = [], 0
    def inspect(source, prefix, depth):
        nonlocal members
        if depth > 3:
            issues.append({'entry': prefix, 'reason': 'NESTED_ARCHIVE_DEPTH_NOT_INSPECTABLE'})
            return
        try:
            with zipfile.ZipFile(source) as archive:
                infos = archive.infolist()
                if sum(i.file_size for i in infos) > 128 * 1024**2:
                    issues.append({'entry': prefix, 'reason': 'NESTED_ARCHIVE_INSPECTION_BUDGET'})
                    return
                paths = [i.filename.rstrip('/') for i in infos if not i.is_dir()]
                for name in paths:
                    # No execution or extraction. Inner paths remain inert bytes.
                    if name.startswith(('/', '\\')) or '\\' in name or any(p in ('', '.', '..') for p in name.split('/')):
                        issues.append({'entry': prefix + name, 'reason': 'NESTED_UNSAFE_PATH'})
                seen = set()
                for info in infos:
                    if info.is_dir():
                        continue
                    members += 1
                    key = info.filename.casefold()
                    if key in seen:
                        issues.append({'entry': prefix + info.filename, 'reason': 'NESTED_DUPLICATE_OR_CASE_CONFLICT'})
                    seen.add(key)
                    reason = sensitive_filename(info.filename)
                    if reason:
                        issues.append({'entry': prefix + info.filename, 'reason': reason})
                        continue
                    if info.flag_bits & 1:
                        issues.append({'entry': prefix + info.filename, 'reason': 'ENCRYPTED_NESTED_ARCHIVE_ENTRY'})
                        continue
                    if info.filename.lower().endswith('.zip'):
                        inspect(io.BytesIO(archive.read(info)), prefix + info.filename + '!/', depth + 1)
                    else:
                        with archive.open(info) as data:
                            hits = strong_hits(data)
                        if hits:
                            issues.append({'entry': prefix + info.filename, 'reason': 'CREDENTIAL_PATTERN_EXCLUSION', 'pattern_ids': hits})
        except (zipfile.BadZipFile, RuntimeError, OSError) as error:
            issues.append({'entry': prefix, 'reason': 'NESTED_ARCHIVE_NOT_FULLY_INSPECTABLE', 'error_type': type(error).__name__})
    inspect(path, '', 0)
    return {'status': 'PASS' if not issues else 'EXCLUDED', 'members_checked': members, 'issues': issues}


def is_current(name):
    return name.startswith(PRIMARY_DIRS) or name in {'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'tsconfig.json', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'Cargo.lock'}


def is_test(name):
    parts = name.split('/')
    last = parts[-1].lower()
    return name.startswith(('tests/', 'test/')) or any(p in {'tests', 'test', '__tests__', '__fixtures__', 'fixtures'} for p in parts) or last.startswith('test_') or '.test.' in last


def category(name):
    if name.startswith(('src/', 'app/', 'lib/', 'packages/')):
        return 'current_product_source'
    if name.startswith(('tests/', 'test/')):
        return 'current_test_source_or_helper'
    if name.startswith('config/'):
        return 'current_runtime_configuration'
    if name.startswith(('tools/', 'scripts/')):
        return 'current_runtime_or_test_runner'
    if name == 'package.json':
        return 'current_package_metadata'
    if name.startswith((M0 + '/', M01 + '/')):
        return 'original_historical_delivery'
    if name.startswith(R0 + '/upstream/'):
        return 'original_third_party_research_cache_not_product_dependency'
    if name.startswith((R0 + '/', R01 + '/', R1 + '/')):
        return 'original_engineering_source_or_probe' if Path(name).suffix in CODE_EXTENSIONS else 'original_runtime_evidence_or_synthetic_fixture'
    if name.startswith(('ai-workflow-kit-v4/', 'inputs/')) or name == 'ai-workflow-kit-v4.0.0.zip':
        return 'original_research_input_not_licensed_product_dependency'
    return 'original_project_rules_or_governance'


def validate_history(baseline):
    errors, counts = [], {}
    table = {r['path']: r for r in baseline['files']}
    for title, name, prefix in [('M0_delivery', M0 + '/reports/delivery_manifest.json', M0 + '/'), ('M01_delivery', M01 + '/reports/delivery_manifest.json', '')]:
        document = load(ROOT / name)
        rows = document['files']
        counts[title] = len(rows)
        for row in rows:
            full = prefix + row['path']
            actual = table.get(full)
            if not actual or actual['sha256'] != row['sha256'] or actual['bytes'] != row['bytes']:
                errors.append({'manifest': name, 'path': full, 'reason': 'HISTORICAL_FINGERPRINT_MISMATCH'})
    frozen = load(ROOT / R01 / 'integrity/preservation_before.json')['files']
    counts['complete_M0_preservation'] = len(frozen)
    for name, row in frozen.items():
        actual = table.get(name)
        if not actual or actual['sha256'] != row['sha256'] or actual['bytes'] != row['bytes']:
            errors.append({'manifest': R01 + '/integrity/preservation_before.json', 'path': name, 'reason': 'M0_PRESERVATION_MISMATCH'})
    return {'status': 'PASS' if not errors else 'FAIL', 'manifest_records_checked': counts, 'errors': errors}


def runtime_closure(current):
    names = {r['path'] for r in current}
    edges, unknown = [], []
    for row in current:
        name = row['path']
        if Path(name).suffix not in {'.ts', '.mjs', '.js'}:
            continue
        text = (ROOT / name).read_text('utf-8')
        # Include type edges, static ESM edges and literal dynamic import edges.
        for match in re.finditer(r'(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)([\'\"])([^\'\"]+)\1', text):
            spec = match.group(2)
            target = None
            if spec.startswith('node:'):
                kind = 'Node_builtin'
            elif spec.startswith('.'):
                target = rel((ROOT / name).parent.joinpath(spec).resolve())
                kind = 'local_file'
                if target not in names:
                    unknown.append({'from': name, 'specifier': spec, 'target': target})
            else:
                kind = 'external_unresolved'
                unknown.append({'from': name, 'specifier': spec})
            edges.append({'from': name, 'specifier': spec, 'kind': kind, 'to': target})
    resources = [
        ('src/agentnexus/host.ts', 'config/agentnexus/features.json'),
        ('src/agentnexus/host.ts', 'config/agentnexus/policies.json'),
        ('src/agentnexus/diagnostics.ts', 'src/agentnexus/checkers/python_ast.py'),
        ('src/agentnexus/diagnostics.ts', 'src/agentnexus/checkers/powershell_ast.ps1'),
        ('tests/agentnexus/storage.test.ts', 'tests/agentnexus/owned-storage-child.mjs'),
    ]
    for source, target in resources:
        if target not in names:
            unknown.append({'from': source, 'target': target})
    test_names = sorted(name for name in names if name.startswith('tests/agentnexus/') and name.endswith('.test.ts'))
    return {'status': 'PASS' if not unknown else 'FAIL', 'import_edges': edges, 'non_import_runtime_resources': [{'from': a, 'to': b} for a, b in resources], 'test_discovery_files': test_names, 'unresolved': unknown, 'method': 'Full live directory enumeration + all local ESM/type edges + literal URL/config/child-process resources + original final-run closure certificate. Dynamic registered handlers are trusted runtime values, not missing plugins.'}


def parse_tap(path):
    raw = path.read_text('utf-8-sig')
    lines, cases, pending = raw.splitlines(), [], {}
    for index, line in enumerate(lines):
        sub = re.match(r'^( *)# Subtest: (.*)$', line)
        if sub:
            depth = len(sub.group(1))
            pending = {k: v for k, v in pending.items() if k < depth}
            pending[depth] = sub.group(2)
        match = re.match(r'^( *)(ok|not ok) (\d+) - (.*)$', line)
        if not match:
            continue
        depth, result, ordinal, tail = len(match.group(1)), match.group(2), int(match.group(3)), match.group(4)
        name, skip, reason = tail.partition(' # SKIP')
        duration = next((float(m.group(1)) for following in lines[index + 1:index + 5] if (m := re.match(r'^\s*duration_ms: ([0-9.]+)$', following))), None)
        parents = [pending[k] for k in sorted(pending) if k < depth]
        cases.append({'ordinal': len(cases) + 1, 'tap_local_ordinal': ordinal, 'tap_indent': depth, 'name': name, 'parents': parents, 'status': 'NOT_RUN' if skip else 'PASS' if result == 'ok' else 'FAIL', 'reason': reason.strip() or None, 'log_line': index + 1, 'duration_ms': duration})
    totals = {key: int(value) for key, value in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$', raw, re.M)}
    duration = re.search(r'^# duration_ms ([0-9.]+)', raw, re.M)
    return {'cases': cases, 'totals': totals, 'duration_ms': float(duration.group(1)) if duration else None, 'bytes': path.stat().st_size, 'sha256': sha(path)}


def test_definitions():
    result = {}
    for file in sorted((ROOT / 'tests/agentnexus').glob('*.test.ts')):
        text = file.read_text('utf-8')
        matches = list(re.finditer(r'(?:\btest|\bchecked)\(\s*([\'\"])((?:\\.|(?!\1).)*?)\1', text))
        for i, match in enumerate(matches):
            name = re.sub(r'\\([\'\"\\])', r'\1', match.group(2))
            result[name] = {'path': rel(file), 'line': text.count('\n', 0, match.start()) + 1, 'body': text[match.start():matches[i + 1].start() if i + 1 < len(matches) else len(text)]}
    # The two dynamic names are explicitly generated by this loop in the real test.
    text = (ROOT / 'tests/agentnexus/integrity.test.ts').read_text('utf-8')
    offset = text.index('test(`real OS ${type} link is rejected`')
    for name in ['real OS dir link is rejected', 'real OS junction link is rejected']:
        result[name] = {'path': 'tests/agentnexus/integrity.test.ts', 'line': text.count('\n', 0, offset) + 1, 'body': text[offset:]}
    return result


def reachable_sources(test_file, closure):
    graph = collections.defaultdict(set)
    for edge in closure['import_edges']:
        if edge['to']:
            graph[edge['from']].add(edge['to'])
    for edge in closure['non_import_runtime_resources']:
        graph[edge['from']].add(edge['to'])
    seen, todo = set(), [test_file]
    while todo:
        name = todo.pop()
        if name in seen:
            continue
        seen.add(name)
        todo.extend(graph[name] - seen)
    return sorted(x for x in seen if x.startswith('src/'))


def make_test_index(current, closure):
    definitions = test_definitions()
    primary_path = R1 + '/all-tests.tap'
    parsed = parse_tap(ROOT / primary_path)
    results = load(ROOT / R1 / 'test-results.json')
    verified = load(ROOT / R1 / 'final-verification.json')
    assert parsed['sha256'] == results['tap_sha256']
    assert parsed['totals'] == results['totals'] == verified['tests']
    assert len(parsed['cases']) == parsed['totals']['tests'] == len(results['cases'])
    primary = []
    for case, recorded in zip(parsed['cases'], results['cases']):
        assert all(case[k] == recorded[k] for k in ['ordinal', 'tap_local_ordinal', 'tap_indent', 'name', 'status', 'reason'])
        top = case['parents'][0] if case['parents'] else case['name']
        definition = definitions.get(top)
        assert definition, ('UNMAPPED_FINAL_TEST', top)
        test_file, body = definition['path'], definition['body']
        categories = []
        combined = (top + ' ' + case['name']).lower()
        for title, words in [('concurrency', ['concurrent', 'queue', 'lease', 'race', 'drain', 'backpressure']), ('fault_recovery', ['crash', 'recovery', 'reopen', 'corrupt', 'failure', 'fault', 'timeout', 'tail', 'tamper']), ('negative', ['reject', 'invalid', 'denied', 'fail', 'malformed', 'forged', 'replay', 'unlisted', 'overflow']), ('permissions', ['identity', 'approval', 'admin', 'symlink', 'hardlink', 'junction', 'sandbox', 'session'])]:
            if any(word in combined for word in words):
                categories.append(title)
        module = Path(test_file).name.removesuffix('.test.ts')
        categories.extend(['local_integration' if module in {'control', 'gateway', 'storage', 'diagnostics'} else 'unit_and_filesystem', module])
        doubles = module in {'control', 'gateway'} or '.mock.' in body
        primary.append({
            'test_id': 'M1-FINAL-' + str(case['ordinal']).zfill(4),
            'stable_case_id': 'CASE-' + hashlib.sha256((test_file + '\0' + '/'.join([*case['parents'], case['name']])).encode('utf-8')).hexdigest()[:20],
            **case, 'test_file': test_file, 'test_declaration_line': definition['line'],
            'source_files': reachable_sources(test_file, closure), 'test_categories': sorted(set(categories)),
            'execution_status': case['status'], 'actually_executed': case['status'] != 'NOT_RUN',
            'uses_simulated_or_synthetic_data': True,
            'uses_fake_backend': module in {'control', 'gateway'},
            'fake_backend_scope': 'Conservative label for synthetic registered tool/module/PDP callbacks in kernel tests; actual Node/SQLite/filesystem still execute.' if module in {'control', 'gateway'} else 'No model/provider backend; real local implementation and synthetic data.',
            'uses_test_doubles_or_spies': doubles,
            'test_double_details': ['Controlled clock override' if 'Date' in body and '.mock.' in body else 'Synthetic trusted handlers/modules or forwarding spawn spy; inspect linked source'] if doubles else [],
            'uses_fake_model_backend': False, 'real_model_validation': False,
            'original_log': {'path': primary_path, 'line': case['log_line'], 'sha256': parsed['sha256']},
            'source_snapshot_binding': 'Exact current candidate matches original final-verification.json and original source_snapshot_manifest.json',
            'started_utc': 'NOT_AVAILABLE', 'ended_utc': 'NOT_AVAILABLE',
            'timing_note': 'Original TAP records duration_ms, not per-test absolute timestamps. No times synthesized.',
        })
    runs = []
    for path in sorted((ROOT / R1).rglob('*.tap')):
        record = parse_tap(path)
        log = rel(path)
        run_id = 'RUN-' + hashlib.sha256(log.encode()).hexdigest()[:16]
        cases = []
        for case in record['cases']:
            top = case['parents'][0] if case['parents'] else case['name']
            definition = definitions.get(top)
            test_file = definition['path'] if definition else ('tests/agentnexus/integrity.test.ts' if '/integrity/' in log else 'NOT_AVAILABLE')
            cases.append({**case, 'execution_id': run_id + '-' + str(case['ordinal']).zfill(4), 'test_file': test_file,
                          'actually_executed': case['status'] != 'NOT_RUN' and 'ERR_INVALID_PACKAGE_CONFIG' not in path.read_text('utf-8'),
                          'uses_simulated_or_synthetic_data': True, 'uses_fake_model_backend': False,
                          'original_log': {'path': log, 'line': case['log_line']},
                          'source_version_note': 'Historical version is determined only by the accompanying original JSON hash record; current test mapping is navigational, not a claim of historical byte equality.'})
        metadata_names = []
        if path.parent == ROOT / R1 or path.parent == ROOT / R1 / 'final-run-1':
            metadata_names = [path.parent / 'test-results.json', path.parent / 'final-verification.json']
        elif path.parent.name == 'integrity':
            metadata_names = [path.with_suffix('.json')] if path.name.startswith('attempt-') else [path.parent / 'test-run.json']
        elif path.parent.name == 'diagnostics':
            metadata_names = [path.parent / ('verification.v2.json' if '.v2.' in path.name else 'verification.json')]
        elif path.parent.name == 'storage':
            metadata_names = [path.parent / ('verification.v3.json' if '.v3.' in path.name else 'verification.v2.json' if '.v2.' in path.name else 'verification.json')]
        metadata = []
        for meta in metadata_names:
            if not meta.is_file() or meta.stat().st_size == 0:
                metadata.append({'path': rel(meta), 'status': 'NOT_AVAILABLE' if not meta.exists() else 'NOT_RUN_EMPTY_RESERVED_FILE'})
                continue
            document = load(meta)
            timing = {k: document[k] for k in ['started_utc', 'ended_utc', 'observed_at', 'utc', 'test_run_utc', 'captured_utc'] if k in document}
            bindings = {k: document[k] for k in ['candidate_files', 'candidate', 'source_sha256', 'source_snapshot', 'source_files', 'runtime', 'versions', 'node_version', 'node', 'platform', 'command', 'command_argv'] if k in document}
            metadata.append({'path': rel(meta), 'sha256': sha(meta), 'recorded_timing_fields': timing, 'source_environment_and_command_binding_fields': bindings,
                             'exact_started_utc': document.get('started_utc', 'NOT_AVAILABLE'), 'exact_ended_utc': document.get('ended_utc', 'NOT_AVAILABLE')})
        runs.append({'run_id': run_id, 'log': log, 'sha256': record['sha256'], 'bytes': record['bytes'], 'totals': record['totals'],
                     'duration_ms': record['duration_ms'], 'cases': cases,
                     'original_metadata_records': metadata,
                     'record_status': 'NOT_RUN' if record['bytes'] == 0 else 'RAW_EVIDENCE_RETAINED',
                     'case_count_matches_log_total': len(cases) == record['totals'].get('tests') if record['totals'] else None})
    historical_unittest = []
    log = ROOT / R0 / 'workflow-unittest.log'
    for line_number, line in enumerate(log.read_text('utf-8').splitlines(), 1):
        match = re.match(r'^(test_\S+) \(([^)]+)\) \.\.\. (ok|skipped.*|FAIL|ERROR)$', line)
        if match:
            module = match.group(2).split('.')[0]
            file = f'ai-workflow-kit-v4/tests/{module}.py'
            historical_unittest.append({'test_id': f'M0-WORKFLOW-{len(historical_unittest)+1:04}', 'name': match.group(1), 'test_file': file if (ROOT / file).exists() else 'NOT_AVAILABLE', 'execution_status': 'PASS' if match.group(3) == 'ok' else 'NOT_RUN' if match.group(3).startswith('skipped') else 'FAIL', 'reason': match.group(3) if match.group(3) != 'ok' else None, 'actually_executed': match.group(3) == 'ok', 'original_log': {'path': rel(log), 'line': line_number}, 'scope': 'Historical isolated Workflow Kit tests; not M1 product/model verification.'})
    return {
        'schema': 'agentnexus/audit-test-evidence-index/1', 'generated_utc': stamp(),
        'provenance': 'New navigational index only. All underlying logs/JSON are original bytes. Audit-local IDs were assigned during packaging, not claimed to have existed in historical logs.',
        'primary_run': {'log': primary_path, 'results': R1 + '/test-results.json', 'verification': R1 + '/final-verification.json', 'totals': parsed['totals'], 'duration_ms': parsed['duration_ms'], 'recorded_run_timestamp_utc': verified['test_run_utc'], 'exact_test_start_utc': 'NOT_AVAILABLE', 'exact_test_end_utc': 'NOT_AVAILABLE', 'timestamp_semantics': 'Historical verifier batch/run marker; exact test process boundaries are not recorded for final integrated run.', 'environment': verified['versions'], 'tests_reexecuted_during_packaging': False},
        'primary_cases': primary, 'all_original_M1_tap_runs': runs,
        'historical_M0_workflow_cases': historical_unittest,
        'review_probes': [{'path': R1 + '/reviews/' + n, 'source': R1 + '/reviews/' + s if s else 'NOT_AVAILABLE', 'version_binding': 'Use each original source_sha256/source_snapshot; not necessarily current bytes.'} for n, s in [('control-probes-initial.json', 'control-probes.ts'), ('control-probes-before-close-race-fix.json', 'control-probes.ts'), ('control-probes-before-timeout-fix.json', 'control-probes.ts'), ('control-probes.json', 'control-probes.ts'), ('final-control-probes.json', 'final-control-probes.ts'), ('stop-recovery-probe.json', None), ('storage-integrity-review.json', None), ('storage-integrity-review.v3.json', None)]],
        'full_contract_NOT_RUN_reference': M01 + '/reports/M1_test_matrix.json',
        'models_and_OS_boundary': 'NOT_RUN; synthetic fixtures, test doubles and real local parsers are not real provider or OS sandbox validation.',
    }


def snapshot(current, included, closure, baseline):
    final = load(ROOT / R1 / 'final-verification.json')
    historical = load(ROOT / M01 / 'reports/source_snapshot_manifest.json')
    normalized = [{'path': r['path'], 'bytes': r['bytes'], 'sha256': r['sha256']} for r in current]
    assert normalized == final['candidate_files'] == historical['files'], 'LIVE_SOURCE_DIFFERS_FROM_LAST_VERIFIED_CANDIDATE'
    with zipfile.ZipFile(ROOT / historical['archive']['path']) as original_zip:
        assert sorted(original_zip.namelist()) == sorted(r['path'] for r in normalized)
        for row in normalized:
            data = original_zip.read(row['path'])
            assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256']
    git = subprocess.run(['git', '-C', str(ROOT), 'rev-parse', '--show-toplevel'], capture_output=True, text=True)
    commit = None
    if git.returncode == 0:
        commit_run = subprocess.run(['git', '-C', str(ROOT), 'rev-parse', 'HEAD'], capture_output=True, text=True)
        commit = commit_run.stdout.strip() if commit_run.returncode == 0 else None
    extra = [r for r in included if r['path'].startswith((R0 + '/', R01 + '/', R1 + '/')) and Path(r['path']).suffix in CODE_EXTENSIONS and '/upstream/' not in r['path'] and '/workflow-sandbox/' not in r['path']]
    snapshot_digest = hashlib.sha256(json.dumps(normalized, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    return {'schema': 'agentnexus/independent-audit-source-snapshot/1', 'source_snapshot_id': 'ANX-M1-SHA256-' + snapshot_digest,
            'packaged_utc': stamp(), 'current_source_version': load(ROOT / 'package.json')['version'],
            'version_note': 'Existing package version copied verbatim; this packaging task performs no M1.1 development.',
            'git': {'is_repository': git.returncode == 0, 'commit_sha': commit, 'status': 'AVAILABLE' if commit else 'NOT_AVAILABLE', 'reason': None if git.returncode == 0 else 'Current workspace is not a Git repository; no repository initialized.'},
            'current_source_code_file_total': sum(r['path'].startswith(('src/', 'tools/', 'app/', 'lib/', 'packages/', 'scripts/')) for r in current),
            'current_product_source_files': sum(r['path'].startswith('src/') for r in current),
            'current_test_file_total': sum(r['path'].startswith(('tests/', 'test/')) for r in current),
            'current_test_entry_file_total': sum(r['path'].endswith('.test.ts') for r in current),
            'current_configuration_file_total': sum(r['path'].startswith('config/') for r in current),
            'current_runtime_candidate_file_total': len(current), 'current_runtime_candidate_files': normalized,
            'additional_authored_engineering_source_total': len(extra), 'additional_authored_engineering_sources': [{k: r[k] for k in ['path', 'bytes', 'sha256']} for r in extra],
            'runtime_correspondence': {'status': 'PASS', 'meaning': 'All live current source/test/config/runner/package files equal the actual final tested candidate, original snapshot manifest and retained final source ZIP. No claim of a live long-running service or reexecuted product tests.', 'original_test_timestamp': final['test_run_utc'], 'final_verification': {'path': R1 + '/final-verification.json', 'sha256': sha(ROOT / R1 / 'final-verification.json')}, 'original_snapshot_manifest': {'path': M01 + '/reports/source_snapshot_manifest.json', 'sha256': sha(ROOT / M01 / 'reports/source_snapshot_manifest.json')}, 'original_source_zip': historical['archive']},
            'runtime_closure': closure, 'baseline_file_total': len(baseline['files'])}


def evidence_gaps(included, baseline):
    names = {r['path'] for r in included}
    items = []
    for name, explanation, blocking in [
        ('package-lock.json', 'Zero direct/dev npm dependencies and no npm install; no lockfile was created or used.', False),
        ('tsconfig.json', 'Node native erasable TypeScript execution is used; no standalone TypeScript build configuration or tsc validation exists.', False),
        ('standalone/database_migrations/', 'Database creation/schema is embedded in src/agentnexus/storage.ts and control/feature/policy/gateway SQL. No separate migration files exist.', False),
        ('standalone/configuration_schema/', 'Type definitions and validators are embedded in src/agentnexus/types.ts/features.ts/policy.ts/gateway.ts. No separate schema directory exists.', False),
        ('historical/final_integrated_test_exact_start_end_timestamps', 'Only historical verifier run marker and TAP durations exist; per-test and exact final test process absolute boundaries were not recorded.', False),
        ('historical/gateway_initial_integration_raw_transcript_88be73', 'Original run-history.json records 14 pass/1 fail. The raw tool transcript was not saved as a local file; not recreated.', False),
        ('historical/storage_integrity_review_inline_probe_source', 'Storage review JSON and resulting fixtures are retained, but the inline reviewer probe program was not saved as a standalone local file. Current storage regressions are included.', False),
        ('historical/stop_recovery_probe_inline_source', 'stop-recovery-probe.json exists; no separate program for that inline probe was retained.', False),
        ('deployment/runtime_binary_redistribution_license_closure', 'External Node/Python/PowerShell binaries were not bundled or fully audited for redistribution; original report status BLOCKED.', False),
        ('validation/real_provider_OS_sandbox_typecheck_powercut_soak', 'Original verification declares these NOT_RUN/BLOCKED; no records or implementations invented.', False),
    ]:
        if name in names:
            continue
        items.append({'path_or_record': name, 'status': 'NOT_AVAILABLE', 'reason': explanation, 'blocks_current_source_and_final_evidence_packaging': blocking})
    # Explicitly detect historical attempted source versions whose bytes are not retained.
    by_hash = collections.defaultdict(list)
    for row in included:
        by_hash[row['sha256']].append(row['path'])
    for archive_name in [R1 + '/m1-source-final.zip', R1 + '/final-run-1/m1-source-final.zip']:
        with zipfile.ZipFile(ROOT / archive_name) as archive:
            for info in archive.infolist():
                if not info.is_dir():
                    by_hash[hashlib.sha256(archive.read(info)).hexdigest()].append(archive_name + '!/' + info.filename)
    bindings = {}
    def normalize_source(value):
        if not isinstance(value, str):
            return None
        value = value.replace('\\', '/')
        root_prefix = ROOT.as_posix().rstrip('/') + '/'
        if value.lower().startswith(root_prefix.lower()):
            value = value[len(root_prefix):]
        return value if is_current(value) else None
    def collect_bindings(value, record, pointer=''):
        if isinstance(value, dict):
            path = normalize_source(value.get('path', value.get('file')))
            digest = value.get('sha256')
            if path and isinstance(digest, str) and re.fullmatch('[a-f0-9]{64}', digest):
                bindings.setdefault((path, digest), []).append({'path': record, 'json_pointer': pointer or '/'})
            for key, child in value.items():
                mapped = normalize_source(key)
                if mapped and isinstance(child, str) and re.fullmatch('[a-f0-9]{64}', child):
                    bindings.setdefault((mapped, child), []).append({'path': record, 'json_pointer': pointer + '/' + key.replace('~', '~0').replace('/', '~1')})
                collect_bindings(child, record, pointer + '/' + str(key).replace('~', '~0').replace('/', '~1'))
        elif isinstance(value, list):
            for i, child in enumerate(value):
                collect_bindings(child, record, pointer + '/' + str(i))
    # Only evidence metadata, not synthetic database/object/fixture contents.
    for parent in [ROOT / R1, ROOT / R1 / 'diagnostics', ROOT / R1 / 'integrity', ROOT / R1 / 'storage', ROOT / R1 / 'storage/v1', ROOT / R1 / 'reviews', ROOT / R1 / 'final-run-1']:
        for path in sorted(parent.glob('*.json')):
            if path.stat().st_size:
                collect_bindings(load(path), rel(path))
    historical_bindings = []
    for (path, digest), references in sorted(bindings.items()):
        candidates = by_hash.get(digest, [])
        historical_bindings.append({'original_records': references, 'source_path': path, 'sha256': digest, 'retained_matching_locations': candidates, 'status': 'AVAILABLE' if candidates else 'NOT_AVAILABLE'})
    unavailable = [r for r in historical_bindings if r['status'] == 'NOT_AVAILABLE']
    if unavailable:
        items.append({'path_or_record': 'historical/intermediate_attempt_source_versions', 'status': 'NOT_AVAILABLE', 'reason': 'Some early failed/intermediate attempts retained source hashes but not full historical source bytes. Current final test/source bytes are complete; original failure logs are present. Do not rerun these old attempts against current files as if versions matched.', 'versions': unavailable, 'blocks_current_source_and_final_evidence_packaging': False})
    required = [R1 + '/' + n for n in ['all-tests.tap', 'test-results.json', 'final-verification.json', 'reviews/control-review.json', 'reviews/storage-integrity-review.json', 'demo.json']]
    required += [M0 + '/reports/M0_report.md', M0 + '/reports/verification.md', M0 + '/reports/delivery_manifest.json', M01 + '/reports/M0.1_report.md', M01 + '/reports/verification.md', M01 + '/reports/delivery_manifest.json']
    missing_required = [name for name in required if name not in names]
    for name in missing_required:
        items.append({'path_or_record': name, 'status': 'NOT_AVAILABLE', 'reason': 'Required original file missing', 'blocks_current_source_and_final_evidence_packaging': True})
    return {'schema': 'agentnexus/audit-missing-materials/1', 'generated_utc': stamp(), 'status': 'PASS' if not missing_required else 'FAIL', 'required_current_source_missing': [], 'required_original_evidence_missing': missing_required, 'historical_evidence_limitations_present': True, 'items': items, 'historical_attempt_source_availability': historical_bindings, 'meaning': 'PASS covers complete current implementation/current tests and required original final evidence. It does not assert all intermediate historical source versions or unrecorded timestamps exist.'}


def dependency_inventory(current, closure):
    package = load(ROOT / 'package.json')
    assert package['dependencies'] == package['devDependencies'] == {}
    runtime = subprocess.run(['node', '-e', 'console.log(JSON.stringify({node:process.version,sqlite:process.versions.sqlite,zstd:process.versions.zstd,platform:process.platform,arch:process.arch}))'], capture_output=True, text=True, check=True)
    return {'schema': 'agentnexus/audit-dependencies/1', 'generated_utc': stamp(), 'package': {'path': 'package.json', 'sha256': sha(ROOT / 'package.json'), 'version': package['version'], 'private': package['private']},
            'direct_npm_dependencies': [], 'direct_npm_dev_dependencies': [], 'introduced_transitive_npm_dependencies': [],
            'lockfile': {'status': 'NOT_AVAILABLE', 'reason': 'No dependency installation and no npm packages in this actual implementation.'},
            'Node_builtins': sorted({e['specifier'] for e in closure['import_edges'] if e['kind'] == 'Node_builtin'}),
            'packaging_environment': {'python': platform.python_version(), 'platform': platform.platform(), 'node': json.loads(runtime.stdout)},
            'original_execution_environment': load(ROOT / R1 / 'final-verification.json')['versions'],
            'external_local_tools': [{'name': 'Node', 'version_in_original_run': '24.15.0', 'purpose': 'Native TypeScript stripping, SQLite and Zstd builtins, node:test', 'bundled': False}, {'name': 'Python', 'version_in_original_host_record': '3.12.10', 'purpose': 'stdlib-only AST checker; explicit trusted executable', 'bundled': False}, {'name': 'PowerShell', 'version_in_original_host_record': '7.6.9', 'purpose': 'System.Management.Automation.Language.Parser; explicit trusted executable', 'bundled': False}],
            'license_evidence': [R1 + '/license-closure.json', M0 + '/research/license_inventory.md', M01 + '/research/license_recheck.json', M01 + '/architecture/workflow_license_remediation.md'],
            'third_party_product_code_introduced': False, 'research_caches_are_runtime_dependencies': False,
            'project_public_license_selected': False, 'runtime_binary_distribution_closure': 'BLOCKED', 'workflow_kit_copy_and_distribution_grant': 'NOASSERTION/BLOCKED as recorded in original audit',
            'distribution_scope': 'Private technical review materials, not a licensed product/runtime binary distribution. Original third-party license/NOTICE files remain alongside research source where available. No new legal conclusion is asserted.',
            'build': 'No npm install or build step required for current Node 24.15.0 native TypeScript execution. tsc/static typecheck NOT_RUN. OS sandbox/admin identity and real provider integrations are not supplied.'}


README = r'''# AgentNexus M1 独立技术审查包

本包收集当前实际实现和原始证据，保留工作区相对目录。全部原始文件按字节复制，没有编辑源码、测试、配置、规则或历史交付，没有重跑产品测试，没有开展 M1.1 开发。`package.json` 既有版本 `0.4.0-m1.1` 原样保留。

## 内容和定位

- `src/`、`tests/`、`tools/`、`config/`、`package.json`：完整当前运行候选，含 TypeScript、Python/PowerShell 检查器、类型、内嵌 SQL Schema、管理接口、测试辅助进程和自动测试入口。基于全目录枚举收集，未按预先指定的 24 文件白名单裁剪。
- `.workflow-kit/tasks/AgentNexus-v0.4-M0/`：原始 M0 报告、verification、delivery_manifest、108/22 目录、内部协议、5 ADR、源码矩阵、许可证、安全分析和 Workflow Kit 映射。
- `.workflow-kit/tasks/AgentNexus-v0.4-M0.1/`：原始 M0.1/M1 报告、142/34 目录、ADR006–009、协议、计划、来源、验证、交付及源码快照清单。
- `.workflow-kit/runtime/AgentNexus-v0.4-M1/`：原始最终 TAP/JSON、demo、审查前后证据、失败/跳过日志、模块日志、先前完整运行、保留的源码版本、辅助审查源码及合成测试产生的数据库/对象/段。
- `.workflow-kit/runtime/AgentNexus-v0.4-M0/`、`...-M0.1/`：原始研究、许可证及来源指纹、保全基线、准入、设计冻结、探针及审计缓存。研究中的第三方源码和测试不是 AgentNexus 产品依赖，不要执行缓存中的项目或安装脚本。
- `ai-workflow-kit-v4/`、`inputs/`：原始套件及任务输入，仅用于核对历史研究及权利链，不代表已获得产品复制/分发授权。
- 根目录新增加的 JSON/本说明、`audit_tools/`：此次打包的索引、清单和独立验证工具；不替代任何原始证据。

`audit_package_manifest.json` 逐完整相对路径记录字节数、SHA256、类别和原始/当前/测试标记。`source_snapshot_manifest.json` 绑定全部当前候选与最终真实运行；附加工程脚本和历史源码另外列出。源码枚举后的实际当前候选恰为 24 文件，此外仍收集全部可用工程、测试及审查材料；这不是只交付 24 文件。

Schema/Migration 的实际位置：记录域表及索引位于 `src/agentnexus/storage.ts`，控制/Feature/Policy/Gateway 的 SQL 在对应模块；类型及验证在 `types.ts` 等模块中。不存在独立 Migration 目录或配置 Schema 文件，不虚构交付。

## 运行环境和复跑方法

原始环境为 Windows 11 / Node 24.15.0（SQLite 3.51.3、Zstd 1.5.7）、Python 3.12.10、PowerShell 7.6.9。无直接或传递 npm 包依赖，无 npm install 或构建步骤，无锁文件、tsconfig 或已通过的 tsc 检查。二进制及完整再分发许可证闭包未打包，详见 `dependency_inventory.json` 和原始许可证报告。

先验证交付 ZIP，再为复跑另建一个目录：只从已验证的树复制 `src/`、`tests/`、`tools/`、`config/`、`package.json`。必须在这个独立副本中运行，因为原测试会向固定相对 runtime 路径写入新结果；不要在保存原始历史证据的解压目录执行测试或 `final_verify.py`，不要覆盖原始证据。

在副本根目录执行（PowerShell 示例；路径仅为显式本地工具配置，不是凭据）：

```powershell
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
Remove-Item Env:NODE_PATH -ErrorAction SilentlyContinue
node tools/agentnexus/run-tests.mjs > audit-rerun.tap 2>&1
node src/agentnexus/cli.ts demo > audit-rerun-demo.json 2> audit-rerun-demo.stderr.txt
```

测试入口动态枚举 5 个 `.test.ts`，包括辅助 `owned-storage-child.mjs`。也可通过 `node --test --test-concurrency=1 --test-reporter=tap tests/agentnexus/<模块>.test.ts` 分别检查 `control`、`gateway`、`storage`、`diagnostics`、`integrity`。测试目录本身创建新的合成输入、SQLite/Artifact 和故障情景，不访问科研工作区或真实 Provider。不同 OS 权限/解释器可用性会改变跳过数量，不能预先承诺同样结果。

`control`、`gateway` 中有合成注册工具、模块/PDP 回调和受控时钟，索引以 `uses_fake_backend=true` 保守标记这些测试替身；实际 SQLite/文件/Node 代码仍执行。Python spawn spy 转发真实进程。没有真实或 Fake 模型 Provider 联调；合成数据与本地检查器 PASS 不等于模型或 OS 安全 PASS。

## 原始验证结果及限制

最终原始 `all-tests.tap` 与 `test-results.json`、`final-verification.json` 一致：135 项，131 PASS，0 FAIL，4 NOT_RUN/SKIP。4 项为真实文件 symlink、目录 symlink、junction、hardlink 情景，权限 EPERM，没有把模拟结果冒充 OS 测试。早期失败、CHANGES_REQUIRED 审查、复审、治理超时以及空的 storage v2 预留文件均保留，不将这些记录改写为最终 PASS。

`test_evidence_index.json` 给每次测试唯一的打包索引 ID，包含源码/测试/原始日志行引用、结果、跳过原因、合成输入和替身标记。ID 是此次索引赋予，不是伪称历史就有。最终日志没有逐测试绝对起止时间，也没有精确测试进程起止；相应字段为 NOT_AVAILABLE，仅保留已记录的运行标记和 duration。部分早期中间版本仅有 hash、没有保留源码字节，部分 inline 审查程序未存为独立文件，初次 Gateway 失败的原始工具 transcript 不在本机文件中；见 `missing_files.json`，不重建这些证据。

现有功能为可信本地内核：Feature ON/OFF/INHERIT、策略三模式和独立保护、Gateway、Context/Audit/Artifact、JSON/Python AST/PowerShell AST 诊断。完整安全部署 BLOCKED：可信 OS 管理身份/任意执行沙箱、五 Agent 和全部工作流、真实模型/Key 池/费用、全部审计生产者、加密 Vault、完整 LSP/多语言检查、硬断电和长期 soak 未完成或 NOT_RUN。目录 142 Feature/34 Policy 是设计规格，不是全部已实现模块。详见原始 M1_report.md 和 M1_test_matrix.json。

敏感信息检查只处理候选打包材料；排除所有 `.env*`、凭据形文件、密钥/证书容器及命中强凭据格式的研究文件，不读取本机密钥库、环境变量值或私人凭据。原始下载源码 ZIP 中存在未审计/不完整或重复的整包内容，未直接嵌套交付；保留它们的 SHA256、原始获取记录及经筛选的已缓存源码。排除清单逐完整路径记录，未删改原件。合成数据库/压缩流包含故障和截断样本，保留作为原始测试数据，不作为健康生产数据库打开。筛查方法和适用范围见 `sensitive_information_exclusion_report.json`。

## 指纹验证

在原始工作区之外，将 ZIP 及附带 SHA256、manifest、完整性验证报告放在同一目录。首先：

```powershell
Get-FileHash -Algorithm SHA256 .\AgentNexus_M1_Independent_Audit_Package.zip
Get-Content .\AgentNexus_M1_Independent_Audit_Package.zip.sha256
```

使用包内 `audit_tools/verify_audit_package.py`（Python 标准库，不导入产品）再作独立解压和双向校验，预期 ZIP SHA256 从外部 sidecar 读取后填入：

```powershell
python -I -B audit_tools/verify_audit_package.py --zip <ZIP绝对路径> --expected-zip-sha256 <SHA256> --manifest-file <外部audit_package_manifest.json> --extract-parent <新的临时目录> --report <新的验证报告.json>
```

验证器拒绝逃逸、重复、大小写/Unicode 冲突、文件与目录冲突、加密/链接条目；流式解压后再次逐文件计算 SHA256，双向比较文件集合，并检查当前源码和测试引用。也可完全独立编写标准 ZIP/SHA256 验证工具，清单不依赖 AgentNexus 的完整性模块。

只排除根目录精确路径 `audit_package_manifest.json` 的自哈希，避免自引用；其字节由 ZIP SHA256、外部同字节 manifest 的 SHA256 sidecar 和外部验证报告绑定。所有嵌套同名文件均为普通载荷，不能按 basename 排除。打包后的完整性验证报告放在 ZIP 外以避免自引用/先验证再改包；包内 `prepackage_integrity_report.json` 是打包前检查。所有外部报告和打包 manifest 均有 SHA256 sidecar。
'''


def prepare(resume=False):
    assert resume or not STAGE.exists(), 'Refusing to reuse or overwrite an existing stage without explicit resume'
    OUT.mkdir(parents=True, exist_ok=True)
    baseline_path = WORK / 'original_workspace_baseline.json'
    assert resume or not baseline_path.exists(), 'Original baseline already exists'
    if resume:
        baseline = load(baseline_path)
        assert preserve(baseline)['status'] == 'PASS', 'Original files changed before resume'
        initial = baseline['files']
    else:
        initial = []
        for i, path in enumerate(original_files(), 1):
            initial.append(fingerprint(path))
            if i % 2000 == 0:
                emit('original_inventory', files=i)
        baseline = {'schema': 'agentnexus/audit-original-workspace-baseline/1', 'captured_utc': stamp(), 'scope': 'Every preexisting workspace file, including excluded research inputs; no credential locations outside workspace searched', 'files': initial}
        write(baseline_path, baseline)
    emit('baseline_saved', files=len(initial), bytes=sum(x['bytes'] for x in initial))
    history = validate_history(baseline)
    assert history['status'] == 'PASS', history
    STAGE.mkdir(parents=True, exist_ok=resume)
    excluded, included, archives = [], [], []
    for i, row in enumerate(initial, 1):
        name, reason = row['path'], None
        if row['file_type'] != 'REGULAR':
            reason = 'NON_REGULAR_FILE_NOT_FOLLOWED'
        else:
            reason = sensitive_filename(name)
        if not reason and name.startswith(R0 + '/') and name.lower().endswith('.zip'):
            reason = 'RAW_THIRD_PARTY_DOWNLOAD_ARCHIVE_EXCLUDED: duplicate/partial or unscreened nested content; cached research files and original archive fingerprints retained'
        hits = []
        if not reason:
            with (ROOT / name).open('rb') as source:
                hits = strong_hits(source)
            if hits:
                reason = 'CREDENTIAL_PATTERN_EXCLUSION_CONSERVATIVE'
        if not reason and name.lower().endswith('.zip'):
            checked = nested_archive_check(ROOT / name)
            archives.append({'path': name, **checked})
            if checked['status'] != 'PASS':
                reason = 'NESTED_ARCHIVE_NOT_SAFE_FOR_UNCHANGED_DELIVERY'
        if reason:
            excluded.append({**row, 'reason': reason, 'pattern_ids': hits, 'original_unchanged': True, 'is_current_source': is_current(name)})
            assert not is_current(name), 'Required current source cannot be silently excluded: ' + name
            continue
        target = STAGE / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
        assert target.stat().st_size == row['bytes'] and sha(target) == row['sha256'], name
        included.append(row)
        if i % 2000 == 0:
            emit('scanned_and_copied', checked=i, included=len(included), excluded=len(excluded))
    # Audit scripts and original project rules are data; no archived instructions are executed.
    (STAGE / 'audit_tools').mkdir(exist_ok=resume)
    for filename in ['prepare_package.py', 'verify_audit_package.py']:
        shutil.copyfile(WORK / filename, STAGE / 'audit_tools' / filename)
    shutil.copyfile(baseline_path, STAGE / 'audit_tools/original_workspace_baseline.json')
    current = sorted((row for row in initial if is_current(row['path'])), key=lambda r: r['path'])
    assert current and all(r['path'] in {x['path'] for x in included} for r in current)
    closure = runtime_closure(current)
    assert closure['status'] == 'PASS', closure['unresolved']
    source_snapshot = snapshot(current, included, closure, baseline)
    tests = make_test_index(current, closure)
    gaps = evidence_gaps(included, baseline)
    assert gaps['status'] == 'PASS', gaps
    sensitive = {'schema': 'agentnexus/audit-sensitive-exclusions/1', 'status': 'PASS', 'generated_utc': stamp(),
                 'scan_scope': 'Only proposed package files within this workspace. No credential stores, live API keys, external research workspaces, environment values or home-directory credential searches.',
                 'original_file_count': len(initial), 'included_original_files': len(included), 'excluded_files': excluded,
                 'content_policy': {'pattern_ids': list(STRONG_PATTERNS), 'method': 'Streaming strong credential format detection; matching values never printed or saved. Conservatively exclude whole file without editing original.', 'filename_policy': 'Exclude all .env*, credential-like names, key/certificate containers; public examples/certificates also excluded conservatively.'},
                 'nested_archives': archives, 'no_detected_credentials_in_included_candidate': True,
                 'synthetic_binary_fixture_provenance': 'M0/M1 controlled SQLite, Zstd/random/partial/corrupt fixtures from the retained probes and tests, not provider/configuration stores. Strong patterns checked on candidate bytes; compressed data is not a universal secret-detection proof.',
                 'limitations': ['Detection is format/provenance based, not a mathematical proof against arbitrary encoded secrets.', 'Excluded .env/examples or strong-pattern matches are not assertions of a real credential leak.', 'No runtime binaries, dependencies, personal .env, credential directories or copied OS key stores are shipped.'],
                 'original_files_modified': False}
    preservation = preserve(baseline)
    assert preservation['status'] == 'PASS', preservation
    checks = {'schema': 'agentnexus/audit-prepackage-integrity/1', 'status': 'PASS', 'generated_utc': stamp(), 'current_source_and_tests': {'status': 'PASS', 'current_files': len(current), 'test_entry_files': source_snapshot['current_test_entry_file_total'], 'test_source_and_helpers': source_snapshot['current_test_file_total'], 'method': 'All live source/test/tool/config directories enumerated, not a hardcoded 24-file selection'}, 'runtime_module_closure': {'status': closure['status'], 'edges': len(closure['import_edges']), 'unresolved': closure['unresolved']}, 'original_test_count_crosscheck': {'status': 'PASS', 'totals': tests['primary_run']['totals'], 'primary_index_cases': len(tests['primary_cases']), 'raw_log_sha256': sha(ROOT / R1 / 'all-tests.tap')}, 'current_source_runtime_binding': source_snapshot['runtime_correspondence'], 'historical_manifests': history, 'original_workspace_unchanged': preservation, 'credential_check': {'status': sensitive['status'], 'excluded_files': len(excluded)}, 'required_evidence': {'status': gaps['status'], 'missing': gaps['required_original_evidence_missing']}, 'product_tests_executed_during_packaging': False, 'post_zip_verification': 'PENDING; detached integrity_verification_report.json is produced after real extraction and rehash'}
    write(STAGE / 'source_snapshot_manifest.json', source_snapshot)
    write(STAGE / 'test_evidence_index.json', tests)
    write(STAGE / 'missing_files.json', gaps)
    write(STAGE / 'sensitive_information_exclusion_report.json', sensitive)
    write(STAGE / 'dependency_inventory.json', dependency_inventory(current, closure))
    write(STAGE / 'prepackage_integrity_report.json', checks)
    write(STAGE / 'excluded_files.json', {'schema': 'agentnexus/audit-excluded-files/1', 'files': excluded, 'policy': sensitive['content_policy'], 'original_files_modified': False})
    (STAGE / 'README_AUDIT_PACKAGE.md').write_text(README, 'utf-8')
    write(WORK / 'preparation.json', {'status': 'PASS', 'utc': stamp(), 'original_files': len(initial), 'included_original_files': len(included), 'excluded_original_files': len(excluded), 'current_candidate_files': len(current), 'additional_authored_engineering_sources': source_snapshot['additional_authored_engineering_source_total'], 'stage': str(STAGE), 'tests': tests['primary_run']['totals']})
    emit('preparation_complete', original_files=len(initial), included_original_files=len(included), excluded_original_files=len(excluded), current_files=len(current), tests=tests['primary_run']['totals'])


def finalize():
    baseline = load(WORK / 'original_workspace_baseline.json')
    preserved = preserve(baseline)
    assert preserved['status'] == 'PASS', preserved
    governance = load(WORK / 'governance_check.json')
    assert governance['status'] == 'PASS', governance
    for filename in ['prepare_package.py', 'verify_audit_package.py']:
        shutil.copyfile(WORK / filename, STAGE / 'audit_tools' / filename)
    shutil.copyfile(WORK / 'governance_check.json', STAGE / 'audit_tools/governance_check.json')
    shutil.copyfile(WORK / 'governance_check.log', STAGE / 'audit_tools/governance_check.log')
    for filename in ['governance_check.staged_copy_failure.json', 'governance_check.staged_copy_failure.log', 'staging_location.json']:
        shutil.copyfile(WORK / filename, STAGE / 'audit_tools' / filename)
    validate_paths = runpy.run_path(str(WORK / 'verify_audit_package.py'))['validate_paths']
    paths = sorted(p for p in STAGE.rglob('*') if p.is_file())
    assert not (STAGE / MANIFEST).exists(), 'Refusing to replace an existing package manifest'
    validate_paths([p.relative_to(STAGE).as_posix() for p in paths])
    baseline_names = {r['path'] for r in baseline['files']}
    baseline_table = {r['path']: r for r in baseline['files']}
    excluded_names = {r['path'] for r in load(STAGE / 'excluded_files.json')['files']}
    generated_names = {
        'source_snapshot_manifest.json', 'test_evidence_index.json', 'missing_files.json',
        'sensitive_information_exclusion_report.json', 'dependency_inventory.json',
        'prepackage_integrity_report.json', 'excluded_files.json', 'README_AUDIT_PACKAGE.md',
        'audit_tools/prepare_package.py', 'audit_tools/verify_audit_package.py',
        'audit_tools/original_workspace_baseline.json', 'audit_tools/governance_check.json',
        'audit_tools/governance_check.log',
        'audit_tools/governance_check.staged_copy_failure.json',
        'audit_tools/governance_check.staged_copy_failure.log', 'audit_tools/staging_location.json',
    }
    expected_names = (baseline_names - excluded_names) | generated_names
    actual_names = {p.relative_to(STAGE).as_posix() for p in paths}
    assert actual_names == expected_names, {'unregistered': sorted(actual_names - expected_names), 'missing': sorted(expected_names - actual_names)}
    all_historical_deliveries = {name for name in baseline_names if name.startswith((M0 + '/', M01 + '/'))}
    assert all_historical_deliveries <= actual_names, 'A required original historical delivery was excluded'
    original_M01_manifest = load(ROOT / M01 / 'reports/delivery_manifest.json')
    assert {r['path'] for r in original_M01_manifest['files']} <= actual_names, 'An original delivery-manifest payload was excluded'
    entries = []
    for path in paths:
        name = path.relative_to(STAGE).as_posix()
        original = name in baseline_names
        size, digest = path.stat().st_size, sha(path)
        assert sensitive_filename(name) is None, 'Sensitive-shaped filename reached final stage'
        if original:
            assert size == baseline_table[name]['bytes'] and digest == baseline_table[name]['sha256'], 'Staged original bytes changed: ' + name
        else:
            with path.open('rb') as source:
                assert not strong_hits(source), 'New audit material has a credential-shaped literal: ' + name
        entries.append({'path': name, 'bytes': size, 'sha256': digest, 'category': category(name) if original else 'new_audit_packaging_material', 'is_original_historical_evidence': original and not is_current(name), 'is_current_source': original and is_current(name), 'is_test_file': is_test(name), 'original_workspace_path': name if original else None})
    manifest = {'schema': 'agentnexus/independent-audit-package/1', 'generated_utc': stamp(), 'relative_path_base': 'ZIP root equals original workspace root for original files', 'exact_self_exclusion': MANIFEST, 'self_hash_integrity': 'Detached audit_package_manifest.json.sha256 + detached same-byte manifest + ZIP SHA256 + post-extraction verification report; no basename exclusions.', 'payload_file_count': len(entries), 'zip_file_count_including_manifest': len(entries) + 1, 'files': entries}
    write(STAGE / MANIFEST, manifest)
    archive = OUT / ZIP_NAME
    assert not archive.exists(), 'Refusing to overwrite existing delivery ZIP'
    paths.append(STAGE / MANIFEST)
    emit('creating_zip', files=len(paths), uncompressed_bytes=sum(p.stat().st_size for p in paths))
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as target:
        for i, path in enumerate(sorted(paths), 1):
            target.write(path, path.relative_to(STAGE).as_posix())
            if i % 2000 == 0:
                emit('zip_progress', files=i)
    archive_hash = sha(archive)
    (OUT / (ZIP_NAME + '.sha256')).write_text(archive_hash + '  ' + ZIP_NAME + '\n', 'ascii')
    for name in [MANIFEST, 'source_snapshot_manifest.json', 'test_evidence_index.json', 'README_AUDIT_PACKAGE.md', 'prepackage_integrity_report.json', 'missing_files.json', 'sensitive_information_exclusion_report.json', 'excluded_files.json', 'dependency_inventory.json']:
        shutil.copyfile(STAGE / name, OUT / name)
    command = [sys.executable, '-I', '-B', str(WORK / 'verify_audit_package.py'), '--zip', str(archive), '--expected-zip-sha256', archive_hash, '--manifest-file', str(OUT / MANIFEST), '--extract-parent', str(EXTRACT_PARENT), '--report', str(OUT / 'integrity_verification_report.json')]
    emit('independent_extraction_started')
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', timeout=240)
    (WORK / 'independent_verifier.log').write_text(result.stdout + result.stderr, 'utf-8')
    assert result.returncode == 0, result.stdout + result.stderr
    report = load(OUT / 'integrity_verification_report.json')
    after = preserve(baseline)
    assert after['status'] == 'PASS', after
    report['original_workspace_preservation'] = after
    report['historical_manifest_checks'] = validate_history(baseline)
    report['governance'] = governance
    report['staging_and_extraction_location'] = {'outside_original_workspace': bool(LOCATION), **LOCATION, 'reason': 'Preserve archived AGENTS.md as review data without activating copies as new workspace rules. No governance policy changes.'}
    report['required_evidence_missing'] = load(OUT / 'missing_files.json')['required_original_evidence_missing']
    report['sensitive_information_check'] = {'status': 'PASS', 'report': 'sensitive_information_exclusion_report.json', 'excluded_count': len(load(OUT / 'excluded_files.json')['files']), 'scope': 'Packaged candidates only; no existing live key lookup'}
    report['complete_registration_and_original_byte_copy'] = {'status': 'PASS', 'expected_equals_actual_stage_file_set': True, 'unregistered_files': [], 'all_original_delivery_files_included': len(all_historical_deliveries), 'original_files_copied_byte_exact': len(baseline_names - excluded_names), 'new_packaging_material_files': len(generated_names)}
    report['completion_scope'] = 'All current implementation/current tests/required original final evidence included; unrecorded historical times and intermediate source gaps explicitly NOT_AVAILABLE. No source/test/config/rule/history modified; no product tests rerun.'
    write(OUT / 'integrity_verification_report.json', report)
    for path in sorted(OUT.iterdir()):
        if path.is_file() and not path.name.endswith('.sha256'):
            (OUT / (path.name + '.sha256')).write_text(sha(path) + '  ' + path.name + '\n', 'ascii')
    write(WORK / 'completion.json', {'status': 'PASS', 'utc': stamp(), 'zip': report['zip'], 'manifest_sha256': report['manifest_sha256'], 'archive_files': report['archive_files_including_manifest'], 'original_preservation': after, 'tests_reexecuted': False, 'output': str(OUT)})
    emit('complete', zip=report['zip'], archive_files=report['archive_files_including_manifest'], original_files_unchanged=after['checked_files'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['prepare', 'finalize'])
    parser.add_argument('--resume', action='store_true', help='Resume only the newly created stage against the immutable first original baseline')
    args = parser.parse_args()
    if args.phase == 'prepare':
        prepare(args.resume)
    else:
        finalize()
