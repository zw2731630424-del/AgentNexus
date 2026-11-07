"""Stdlib-only independent split ZIP verification, safe extraction and merge.

Never imports AgentNexus, runs tests, installs dependencies or executes archived code.
"""
import argparse
import collections
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import tempfile
import unicodedata
import zipfile

CHUNK = 131072
MANIFEST = 'PACKAGE_MANIFEST.json'
MAX_ZIP = 50_000_000
MAX_FILES = 30000
MAX_RAW_BYTES = 3 * 1024**3
R1 = '.workflow-kit/runtime/AgentNexus-v0.4-M1/'
M0 = '.workflow-kit/tasks/AgentNexus-v0.4-M0/'
M01 = '.workflow-kit/tasks/AgentNexus-v0.4-M0.1/'
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


def extended(path):
    value = str(Path(path).resolve())
    return Path('\\\\?\\' + value) if os.name == 'nt' and not value.startswith('\\\\?\\') else Path(value)


def sha(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as source:
        for block in iter(lambda: source.read(CHUNK), b''):
            result.update(block)
    return result.hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('DUPLICATE_JSON_KEY: ' + key)
        result[key] = value
    return result


def parse(raw):
    return json.loads(raw.decode('utf-8'), object_pairs_hook=unique_object)


def load(path):
    return parse(Path(path).read_bytes())


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', 'utf-8')


def safe_path(value):
    if not isinstance(value, str) or not value or '\\' in value or value.startswith('/'):
        raise ValueError('NON_PORTABLE_PATH')
    parts = value.split('/')
    if any(p in {'', '.', '..'} for p in parts) or PurePosixPath(value).as_posix() != value:
        raise ValueError('PATH_TRAVERSAL: ' + value)
    for part in parts:
        if part.endswith((' ', '.')) or ':' in part or any(ord(c) < 32 for c in part):
            raise ValueError('PATH_ALIAS: ' + value)
        stem = part.split('.')[0].upper()
        if stem in {'CON', 'PRN', 'AUX', 'NUL', 'CONIN$', 'CONOUT$'} or re.fullmatch('(COM|LPT)[1-9]', stem):
            raise ValueError('DEVICE_PATH: ' + value)
    return value


def validate_paths(paths):
    seen, folded, components = set(), {}, {}
    for path in paths:
        safe_path(path)
        if path in seen:
            raise ValueError('DUPLICATE_COMPLETE_PATH: ' + path)
        seen.add(path)
        key = unicodedata.normalize('NFC', path).casefold()
        if key in folded:
            raise ValueError('CASE_OR_UNICODE_CONFLICT: ' + path)
        folded[key] = path
        parts = path.split('/')
        for i in range(1, len(parts) + 1):
            value = '/'.join(parts[:i])
            key = unicodedata.normalize('NFC', value).casefold()
            previous = components.setdefault(key, value)
            if previous != value:
                raise ValueError('COMPONENT_CASE_CONFLICT: ' + path)
    for path in paths:
        parts = path.split('/')
        if any('/'.join(parts[:i]) in seen for i in range(1, len(parts))):
            raise ValueError('FILE_DIRECTORY_CONFLICT: ' + path)
    return seen


def set_digest(rows):
    value = hashlib.sha256()
    for row in sorted(rows, key=lambda x: x['path']):
        value.update((row['path'] + '\0' + str(row['bytes']) + '\0' + row['sha256'] + '\n').encode('utf-8'))
    return value.hexdigest()


def sensitive_name(name):
    parts = name.split('/')
    last = parts[-1].lower()
    if any(p.lower() in {'.aws', '.ssh', '.gnupg', '.azure', '.kube'} for p in parts):
        return 'credential_directory'
    if last.startswith('.env') or last in {'.npmrc', '.netrc', '.pypirc', 'credentials', 'credentials.json', 'secrets.json', 'id_rsa', 'id_ed25519'}:
        return 'credential_or_environment_file'
    if Path(last).suffix in {'.pem', '.key', '.pfx', '.p12', '.jks', '.keystore'}:
        return 'key_or_certificate_container'
    return None


def scan_stream(source):
    previous, hits = b'', set()
    for block in iter(lambda: source.read(CHUNK), b''):
        value = previous + block
        for key, pattern in PATTERNS.items():
            if pattern.search(value):
                hits.add(key)
        previous = value[-32768:]
    return sorted(hits)


def inspect_nested_zip(path):
    checked = 0
    def inspect(source, prefix='', depth=0):
        nonlocal checked
        if depth > 3:
            raise ValueError('NESTED_ZIP_DEPTH_BUDGET')
        with zipfile.ZipFile(source) as archive:
            infos = [i for i in archive.infolist() if not i.is_dir()]
            validate_paths([i.filename for i in infos])
            if sum(i.file_size for i in infos) > 128 * 1024**2:
                raise ValueError('NESTED_ZIP_BYTE_BUDGET')
            for info in infos:
                checked += 1
                if sensitive_name(info.filename) or info.flag_bits & 1:
                    raise ValueError('SENSITIVE_OR_ENCRYPTED_NESTED_ENTRY: ' + prefix + info.filename)
                if stat.S_ISLNK(info.external_attr >> 16):
                    raise ValueError('NESTED_LINK')
                if info.filename.lower().endswith('.zip'):
                    inspect(io.BytesIO(archive.read(info)), prefix + info.filename + '!/', depth + 1)
                else:
                    with archive.open(info) as stream:
                        if scan_stream(stream):
                            raise ValueError('NESTED_CREDENTIAL_FORMAT: ' + prefix + info.filename)
    inspect(path)
    return checked


def verify_checksums(directory, allow_missing):
    checksum_file = directory / 'SHA256SUMS.txt'
    if not checksum_file.is_file():
        if allow_missing:
            return {'status': 'NOT_RUN', 'reason': 'Builder stage: checksums are finalized only after independent reports exist.'}
        raise ValueError('SHA256SUMS_NOT_AVAILABLE')
    expected = {}
    for line in checksum_file.read_text('utf-8').splitlines():
        digest, name = line.split('  ', 1)
        safe_path(name)
        if name in expected or not re.fullmatch('[a-f0-9]{64}', digest):
            raise ValueError('CHECKSUM_LIST_SCHEMA')
        expected[name] = digest
    actual = {p.relative_to(directory).as_posix() for p in directory.rglob('*') if p.is_file() and p != checksum_file}
    if actual != set(expected):
        raise ValueError('CHECKSUM_BIDIRECTIONAL_FILE_SET_MISMATCH')
    for name, digest in expected.items():
        if sha(directory / name) != digest:
            raise ValueError('PUBLISHED_FILE_HASH_MISMATCH: ' + name)
    return {'status': 'PASS', 'files': len(expected)}


def parse_tap(path):
    raw = path.read_text('utf-8')
    totals = {k: int(v) for k, v in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$', raw, re.M)}
    cases = list(re.finditer(r'^( *)(ok|not ok) (\d+) - (.*)$', raw, re.M))
    calculated = {'tests': len(cases), 'pass': 0, 'fail': 0, 'skipped': 0}
    for case in cases:
        if ' # SKIP' in case.group(4):
            calculated['skipped'] += 1
        elif case.group(2) == 'ok':
            calculated['pass'] += 1
        else:
            calculated['fail'] += 1
    if totals and any(totals[k] != calculated[k] for k in calculated):
        raise ValueError('RAW_TAP_TOTAL_MISMATCH: ' + str(path))
    return {'totals': totals, 'counted_cases': len(cases), 'status': 'NOT_RUN_EMPTY_RESERVED_FILE' if path.stat().st_size == 0 else 'ORIGINAL_RECORD_CHECKED', 'sha256': sha(path)}


def verify(directory, parent, report_directory, allow_no_checksums):
    started = utc()
    directory = Path(directory).resolve()
    parent = Path(parent).resolve()
    if parent.is_relative_to(directory):
        raise ValueError('INDEPENDENT_EXTRACTION_MUST_BE_OUTSIDE_DELIVERY')
    checksum_check = verify_checksums(directory, allow_no_checksums)
    index_path = directory / 'AgentNexus_M1_Audit_Package_Index.json'
    index, inventory = load(index_path), load(directory / 'package_inventory.json')
    if index['schema'] != 'agentnexus/M1-audit-split-index/1' or inventory['schema'] != 'agentnexus/original-audit-package-inventory/1':
        raise ValueError('INDEX_OR_INVENTORY_SCHEMA')
    for row in index['files']:
        safe_path(row['path'])
        file = directory / row['path']
        if file.stat().st_size != row['bytes'] or sha(file) != row['sha256']:
            raise ValueError('INDEX_SUPPORTING_FILE_HASH_MISMATCH: ' + row['path'])
    all_inventory = inventory['files']
    validate_paths([r['path'] for r in all_inventory])
    expected = {r['path']: r for r in all_inventory if not r['excluded']}
    if len(expected) != index['selected_original_file_total'] or set_digest(expected.values()) != index['selected_original_file_set_sha256']:
        raise ValueError('SELECTED_REVIEW_FILE_SET_CERTIFICATE')
    if sum(r['excluded'] for r in all_inventory) + len(expected) != inventory['original_file_total']:
        raise ValueError('INVENTORY_EXCLUSION_ACCOUNTING')
    if any(r['excluded'] and not r['exclusion_reason'] for r in all_inventory):
        raise ValueError('UNEXPLAINED_ORIGINAL_FILE_EXCLUSION')
    parent.mkdir(parents=True, exist_ok=True)
    container = extended(Path(tempfile.mkdtemp(prefix='verify-split-', dir=parent)))
    per_package, merged = container / 'packages', container / 'merged'
    per_package.mkdir()
    merged.mkdir()
    reports = Path(report_directory).resolve() if report_directory else container / 'reports'
    reports.mkdir(parents=True, exist_ok=True)
    records, locations, cross = [], {}, collections.defaultdict(list)
    scanned, nested_scanned = 0, 0
    package_names = [p['name'] for p in index['packages']]
    validate_paths(package_names)
    if set(package_names) != {p.name for p in directory.glob('*.zip')}:
        raise ValueError('UNREGISTERED_OR_MISSING_ZIP')
    if len(package_names) != index['package_total']:
        raise ValueError('PACKAGE_TOTAL_MISMATCH')
    for package in index['packages']:
        path = directory / package['name']
        if path.stat().st_size != package['bytes'] or sha(path) != package['sha256'] or path.stat().st_size > MAX_ZIP:
            raise ValueError('ZIP_HASH_SIZE_OR_BUDGET: ' + path.name)
        target = per_package / package['package_id']
        target.mkdir()
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_FILES or sum(i.file_size for i in infos) > MAX_RAW_BYTES:
                raise ValueError('ZIP_RESOURCE_BUDGET')
            names = validate_paths([i.filename for i in infos])
            for info in infos:
                mode = info.external_attr >> 16
                if info.is_dir() or info.flag_bits & 1 or stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0, stat.S_IFREG):
                    raise ValueError('UNSUPPORTED_ZIP_FILE_TYPE: ' + info.filename)
            raw_manifest = archive.read(MANIFEST)
            if hashlib.sha256(raw_manifest).hexdigest() != package['manifest_sha256']:
                raise ValueError('MANIFEST_HASH_MISMATCH')
            if raw_manifest != (directory / package['external_manifest']).read_bytes():
                raise ValueError('EXTERNAL_MANIFEST_BYTES_MISMATCH')
            manifest = parse(raw_manifest)
            if manifest['schema'] != 'agentnexus/audit-split-package/1' or manifest['package_id'] != package['package_id'] or manifest['package_version'] != package['package_version']:
                raise ValueError('PACKAGE_MANIFEST_IDENTITY')
            if manifest['exact_self_exclusion'] != MANIFEST or manifest['original_archive_sha256'] != index['original_archive']['sha256']:
                raise ValueError('MANIFEST_ORIGIN_OR_SELF_EXCLUSION')
            entries = manifest['files']
            table = {row['path']: row for row in entries}
            declared = validate_paths([r['path'] for r in entries])
            if names != declared | {MANIFEST} or MANIFEST in declared or declared != set(package['covered_files']):
                raise ValueError('BIDIRECTIONAL_PACKAGE_FILE_SET')
            if len(entries) != manifest['file_total'] or len(infos) != package['archive_file_total_including_manifest'] or len(entries) != package['file_total']:
                raise ValueError('PACKAGE_FILE_COUNT_MISMATCH')
            if sum(r['bytes'] for r in entries) != manifest['total_bytes'] or set_digest(entries) != package['payload_file_set_sha256']:
                raise ValueError('PACKAGE_PAYLOAD_TOTAL_OR_HASH')
            for row in entries:
                if row['path'] not in expected or row['bytes'] != expected[row['path']]['bytes'] or row['sha256'] != expected[row['path']]['sha256']:
                    raise ValueError('PACKAGE_VS_ORIGINAL_INVENTORY_HASH_MISMATCH: ' + row['path'])
                if package['package_id'] not in expected[row['path']]['assigned_packages']:
                    raise ValueError('UNREGISTERED_PACKAGE_ASSIGNMENT')
                if row['original_source']['member_path'] != row['path'] or row['original_source']['archive_sha256'] != index['original_archive']['sha256']:
                    raise ValueError('ORIGINAL_RELATIVE_PATH_OR_PROVENANCE_MISMATCH')
            for info in infos:
                name = info.filename
                if sensitive_name(name):
                    raise ValueError('SENSITIVE_FILENAME: ' + name)
                destination = target.joinpath(*name.split('/'))
                if not destination.resolve().is_relative_to(target.resolve()):
                    raise ValueError('EXTRACTION_ESCAPE')
                destination.parent.mkdir(parents=True, exist_ok=True)
                digest, count, previous, hits = hashlib.sha256(), 0, b'', set()
                with archive.open(info) as source, destination.open('xb') as output:
                    for block in iter(lambda: source.read(CHUNK), b''):
                        count += len(block)
                        if count > info.file_size:
                            raise ValueError('ZIP_DECLARED_SIZE_OVERFLOW')
                        digest.update(block)
                        output.write(block)
                        value = previous + block
                        for key, pattern in PATTERNS.items():
                            if pattern.search(value):
                                hits.add(key)
                        previous = value[-32768:]
                if hits:
                    raise ValueError('CREDENTIAL_FORMAT_IN_PAYLOAD: ' + name + ' pattern_ids=' + ','.join(sorted(hits)))
                if count != info.file_size:
                    raise ValueError('ZIP_DECLARED_SIZE_MISMATCH')
                if name != MANIFEST:
                    row = table[name]
                    if count != row['bytes'] or digest.hexdigest() != row['sha256']:
                        raise ValueError('STREAMED_FILE_HASH_MISMATCH: ' + name)
                    cross[name].append(package['package_id'])
                    locations.setdefault(name, destination)
                    scanned += 1
                    if name.lower().endswith('.zip'):
                        nested_scanned += inspect_nested_zip(destination)
            actual_files = [p for p in target.rglob('*') if p.is_file()]
            if {p.relative_to(target).as_posix() for p in actual_files} != names:
                raise ValueError('EXTRACTED_PACKAGE_FILE_SET')
            for row in entries:
                file = target / row['path']
                if file.stat().st_size != row['bytes'] or sha(file) != row['sha256']:
                    raise ValueError('SECOND_INDEPENDENT_FILE_REHASH: ' + row['path'])
            if sha(target / MANIFEST) != package['manifest_sha256']:
                raise ValueError('SECOND_MANIFEST_REHASH')
        records.append({'package_id': package['package_id'], 'name': package['name'], 'status': 'PASS', 'bytes': package['bytes'], 'sha256': package['sha256'], 'payload_files': package['file_total'], 'checks': ['ZIP_OPEN_CRC_SHA256', 'SAFE_PATHS_NO_DUPLICATES_CASE_CONFLICTS_OR_LINKS', 'MANIFEST_AND_INDEX_BIDIRECTIONAL_SET', 'ORIGINAL_INVENTORY_SHA256', 'INDEPENDENT_EXTRACTED_REHASH', 'SENSITIVE_FILENAME_AND_FORMAT_SCAN']})
        emit('verified_package', name=package['name'], files=package['file_total'])
    if set(locations) != set(expected):
        raise ValueError('MERGED_COVERAGE_MISSING_OR_UNREGISTERED')
    for name, assigned in cross.items():
        if sorted(assigned) != sorted(expected[name]['assigned_packages']):
            raise ValueError('PACKAGE_MEMBERSHIP_MISMATCH: ' + name)
    actual_overlap = {p: sorted(v) for p, v in cross.items() if len(v) > 1}
    declared_overlap = {r['path']: sorted(r['packages']) for r in index['intentional_cross_package_duplicates']}
    if actual_overlap != declared_overlap:
        raise ValueError('CROSS_PACKAGE_DUPLICATE_REGISTRATION_MISMATCH')
    for name in sorted(locations):
        target = merged / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(locations[name], target)
    merged_paths = {p.relative_to(merged).as_posix(): p for p in merged.rglob('*') if p.is_file()}
    if set(merged_paths) != set(expected):
        raise ValueError('BIDIRECTIONAL_MERGED_FILE_SET')
    for name, path in merged_paths.items():
        row = expected[name]
        if path.stat().st_size != row['bytes'] or sha(path) != row['sha256']:
            raise ValueError('MERGED_INDEPENDENT_REHASH: ' + name)
    snapshot = load(merged / 'source_snapshot_manifest.json')
    final = load(merged / R1 / 'final-verification.json')
    current = snapshot['current_runtime_candidate_files']
    if current != final['candidate_files']:
        raise ValueError('ORIGINAL_SOURCE_VS_ACTUAL_FINAL_RUN')
    for row in current + snapshot['additional_authored_engineering_sources']:
        if row['path'] not in expected or expected[row['path']]['sha256'] != row['sha256'] or expected[row['path']]['bytes'] != row['bytes']:
            raise ValueError('REQUIRED_SOURCE_TEST_OR_HELPER_MISSING: ' + row['path'])
    for edge in snapshot['runtime_closure']['import_edges']:
        if edge.get('to') and edge['to'] not in expected:
            raise ValueError('IMPORTED_LOCAL_MODULE_MISSING: ' + edge['to'])
    for edge in snapshot['runtime_closure']['non_import_runtime_resources']:
        if edge['to'] not in expected:
            raise ValueError('RUNTIME_CHECKER_CONFIG_OR_CHILD_MISSING: ' + edge['to'])
    if any(r['excluded'] for r in all_inventory if r['path'].startswith((R1, M0, M01))):
        raise ValueError('M1_RUNTIME_OR_HISTORICAL_DELIVERY_WAS_EXCLUDED')
    taps = []
    for name in sorted(expected):
        if name.startswith(R1) and name.endswith('.tap'):
            taps.append({'path': name, **parse_tap(merged / name)})
    primary = parse_tap(merged / R1 / 'all-tests.tap')
    raw_results = load(merged / R1 / 'test-results.json')
    if primary['totals'] != raw_results['totals'] or primary['totals'] != final['tests'] or primary['sha256'] != raw_results['tap_sha256']:
        raise ValueError('FINAL_RAW_LOG_JSON_COUNTS_OR_HASH_MISMATCH')
    package_data = load(merged / 'package.json')
    if package_data['dependencies'] or package_data['devDependencies']:
        raise ValueError('ACTUAL_DEPENDENCY_NOTE_NO_LONGER_MATCHES')
    completeness = {'schema': 'agentnexus/split-file-completeness/1', 'status': 'PASS', 'utc': utc(), 'original_archive_files': inventory['original_file_total'], 'restored_review_file_total': len(expected), 'excluded_original_files': inventory['excluded_file_total'], 'selected_original_file_set_sha256': set_digest(expected.values()),
                    'merged_directory': str(merged), 'merged_file_set_equals_inventory_and_index': True, 'merged_file_hashes_match_original_inventory': True, 'missing_files': [], 'unexpected_files': [], 'unregistered_package_paths': [],
                    'all_current_candidate_files': len(current), 'all_additional_engineering_sources': len(snapshot['additional_authored_engineering_sources']), 'all_original_M1_runtime_files': sum(r['path'].startswith(R1) for r in all_inventory), 'historical_delivery_files': sum(r['path'].startswith((M0, M01)) for r in all_inventory),
                    'local_import_and_resource_closure': 'PASS', 'all_primary_test_source_and_helper_files': 'PASS', 'intentional_same_byte_overlap_paths': len(actual_overlap), 'different_byte_overlap_paths': [],
                    'original_M1_tap_records': taps, 'primary_original_test_totals': primary['totals'], 'product_tests_rerun': False,
                    'history_gaps': 'Original missing_files.json retained unchanged; absent intermediate source/timestamps/transcripts remain NOT_AVAILABLE.', 'scope': 'All required source and original evidence restored. Explicitly excluded M0 non-runtime caches/temp/probe binaries remain in original ZIP; no silent loss.'}
    sensitive = {'schema': 'agentnexus/split-sensitive-data-scan/1', 'status': 'PASS', 'utc': utc(), 'original_payload_occurrences_checked': scanned, 'unique_original_payload_files_checked': len(expected), 'nested_zip_entries_checked': nested_scanned, 'forbidden_names': ['.env*', 'credential containers/directories', 'private key/certificate containers'], 'strong_format_pattern_ids': list(PATTERNS), 'findings': [], 'credential_values_recorded': False,
                 'scope': 'Only selected original ZIP payloads, package manifests and retained nested archives. No live key, environment-value, private vault or external credential discovery.',
                 'binary_fixture_provenance': 'All M1 persisted SQLite/Zstd/partial/corrupt synthetic test data retained from original audit; no provider calls/credentials introduced. Compressed/damaged streams are fault samples, not installed runtime binaries.',
                 'limitations': ['Format/provenance based check, not a universal proof against arbitrary encoded secrets.', 'No excluded original files are reintroduced from live workspace.']}
    integrity = {'schema': 'agentnexus/split-package-integrity/1', 'status': 'PASS', 'started_utc': started, 'ended_utc': utc(), 'verifier': 'Python stdlib, no product code or test execution', 'master_index_sha256': sha(index_path), 'inventory_sha256': sha(directory/'package_inventory.json'), 'original_archive_sha256': index['original_archive']['sha256'],
                 'packages_checked': len(records), 'all_packages_open_and_independently_extracted': True, 'all_zip_bytes_at_most': MAX_ZIP, 'maximum_zip_bytes': max(p['bytes'] for p in index['packages']), 'packages': records,
                 'restored_review_files': len(expected), 'merged_directory': str(merged), 'independent_extraction_directory': str(container), 'manifest_self_rule': 'Exact root PACKAGE_MANIFEST.json only; hash anchored by master index and ZIP SHA256; kept separately, never merged over other package manifests.', 'published_file_checksums_at_start': checksum_check, 'errors': []}
    write(reports / 'package_integrity.json', integrity)
    write(reports / 'file_completeness.json', completeness)
    write(reports / 'sensitive_data_scan.json', sensitive)
    emit('independent_verification_complete', packages=len(records), merged_files=len(expected), reports=str(reports))
    return integrity


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', required=True)
    parser.add_argument('--output-parent', required=True)
    parser.add_argument('--report-directory')
    parser.add_argument('--allow-checksums-not-yet-written', action='store_true', help='Builder-only first pass; ordinary review must verify finalized SHA256SUMS')
    args = parser.parse_args()
    try:
        verify(args.directory, args.output_parent, args.report_directory, args.allow_checksums_not_yet_written)
    except Exception as error:
        emit('verification_failed', status='FAIL', error_type=type(error).__name__, error=str(error))
        if args.report_directory:
            write(Path(args.report_directory) / 'verification_failure.json', {'status': 'FAIL', 'utc': utc(), 'error_type': type(error).__name__, 'error': str(error)})
        raise SystemExit(1)


if __name__ == '__main__':
    main()
