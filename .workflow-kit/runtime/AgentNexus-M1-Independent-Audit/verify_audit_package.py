"""Independent, stdlib-only ZIP/manifest verifier. Never imports product code."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import tempfile
import unicodedata
import zipfile

MANIFEST = 'audit_package_manifest.json'
CHUNK = 131072
MAX_FILES = 30000
MAX_BYTES = 3 * 1024**3


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as source:
        for block in iter(lambda: source.read(CHUNK), b''):
            digest.update(block)
    return digest.hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('DUPLICATE_JSON_KEY: ' + key)
        result[key] = value
    return result


def load_json(raw):
    return json.loads(raw.decode('utf-8'), object_pairs_hook=unique_object)


def safe_path(value):
    if not isinstance(value, str) or not value or '\\' in value:
        raise ValueError('NON_PORTABLE_PATH')
    parts = value.split('/')
    if value.startswith('/') or any(part in ('', '.', '..') for part in parts):
        raise ValueError('PATH_TRAVERSAL: ' + value)
    if PurePosixPath(value).as_posix() != value:
        raise ValueError('NON_CANONICAL_PATH: ' + value)
    for part in parts:
        if part.endswith((' ', '.')) or any(ord(c) < 32 for c in part) or ':' in part:
            raise ValueError('WINDOWS_PATH_ALIAS: ' + value)
        stem = part.split('.')[0].upper()
        if stem in {'CON', 'PRN', 'AUX', 'NUL', 'CONIN$', 'CONOUT$'} or re.fullmatch(r'(COM|LPT)[1-9]', stem):
            raise ValueError('WINDOWS_DEVICE_PATH: ' + value)
    return value


def validate_paths(paths):
    seen, normalized, components = set(), {}, {}
    for value in paths:
        safe_path(value)
        if value in seen:
            raise ValueError('DUPLICATE_PATH: ' + value)
        seen.add(value)
        key = unicodedata.normalize('NFC', value).casefold()
        if key in normalized:
            raise ValueError('CASE_OR_UNICODE_CONFLICT: ' + value)
        normalized[key] = value
        parts = value.split('/')
        for i in range(1, len(parts) + 1):
            component = '/'.join(parts[:i])
            component_key = unicodedata.normalize('NFC', component).casefold()
            previous = components.setdefault(component_key, component)
            if previous != component:
                raise ValueError('COMPONENT_CASE_CONFLICT: ' + component)
    for value in paths:
        parts = value.split('/')
        for i in range(1, len(parts)):
            if '/'.join(parts[:i]) in seen:
                raise ValueError('FILE_DIRECTORY_CONFLICT: ' + value)
    return seen


def verify(archive, expected_sha, detached_manifest, extract_parent):
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    archive = Path(archive).resolve()
    archive_hash = sha(archive)
    if expected_sha and archive_hash != expected_sha.lower():
        raise ValueError('DETACHED_ZIP_HASH_MISMATCH')
    checks = []
    checks.append({'id': 'ZIP_SHA256', 'status': 'PASS', 'expected_supplied': bool(expected_sha)})
    with zipfile.ZipFile(archive) as source:
        infos = source.infolist()
        if not 0 < len(infos) <= MAX_FILES:
            raise ValueError('FILE_COUNT_BUDGET')
        names = [x.filename for x in infos]
        actual_set = validate_paths(names)
        if sum(x.file_size for x in infos) > MAX_BYTES:
            raise ValueError('EXTRACTION_BYTE_BUDGET')
        for info in infos:
            mode = info.external_attr >> 16
            if info.is_dir() or info.flag_bits & 1 or stat.S_ISLNK(mode):
                raise ValueError('UNSUPPORTED_ZIP_ENTRY: ' + info.filename)
            if stat.S_IFMT(mode) not in (0, stat.S_IFREG):
                raise ValueError('NON_REGULAR_ZIP_ENTRY: ' + info.filename)
        checks.append({'id': 'PATH_TRAVERSAL_DUPLICATES_CASE_AND_TYPES', 'status': 'PASS', 'entries': len(infos)})
        info = source.getinfo(MANIFEST)
        if info.file_size > 32 * 1024**2:
            raise ValueError('MANIFEST_BYTE_BUDGET')
        manifest_bytes = source.read(info)
        if detached_manifest and Path(detached_manifest).read_bytes() != manifest_bytes:
            raise ValueError('DETACHED_MANIFEST_BYTES_MISMATCH')
        manifest = load_json(manifest_bytes)
        if manifest.get('schema') != 'agentnexus/independent-audit-package/1':
            raise ValueError('MANIFEST_SCHEMA')
        if manifest.get('exact_self_exclusion') != MANIFEST:
            raise ValueError('MANIFEST_SELF_EXCLUSION')
        entries = manifest['files']
        expected_set = validate_paths([x['path'] for x in entries])
        if MANIFEST in expected_set or actual_set != expected_set | {MANIFEST}:
            raise ValueError('BIDIRECTIONAL_ZIP_FILE_SET_MISMATCH')
        table = {entry['path']: entry for entry in entries}
        for row in entries:
            if type(row['bytes']) is not int or row['bytes'] < 0 or not re.fullmatch('[a-f0-9]{64}', row['sha256']):
                raise ValueError('FILE_FINGERPRINT_SCHEMA: ' + row['path'])
            if not isinstance(row.get('category'), str):
                raise ValueError('FILE_CATEGORY_SCHEMA')
            for key in ('is_original_historical_evidence', 'is_current_source', 'is_test_file'):
                if type(row.get(key)) is not bool:
                    raise ValueError('FILE_FLAG_SCHEMA: ' + row['path'])
        checks.append({'id': 'BIDIRECTIONAL_ARCHIVE_AND_MANIFEST_SET', 'status': 'PASS', 'payload_files': len(entries)})
        parent = Path(extract_parent).resolve()
        parent.mkdir(parents=True, exist_ok=True)
        created = Path(tempfile.mkdtemp(prefix='independent-extract-', dir=parent)).resolve()
        extracted = Path('\\\\?\\' + str(created)) if os.name == 'nt' else created
        expected_manifest_hash = hashlib.sha256(manifest_bytes).hexdigest()
        for info in infos:
            path = extracted.joinpath(*info.filename.split('/'))
            if not path.resolve().is_relative_to(extracted):
                raise ValueError('EXTRACTION_ESCAPE')
            path.parent.mkdir(parents=True, exist_ok=True)
            digest, size = hashlib.sha256(), 0
            with source.open(info) as handle, path.open('xb') as dest:
                for block in iter(lambda: handle.read(CHUNK), b''):
                    size += len(block)
                    if size > info.file_size:
                        raise ValueError('ZIP_DECLARED_SIZE_OVERFLOW')
                    digest.update(block)
                    dest.write(block)
            if size != info.file_size:
                raise ValueError('ZIP_DECLARED_SIZE_MISMATCH')
            if info.filename == MANIFEST:
                if digest.hexdigest() != expected_manifest_hash:
                    raise ValueError('MANIFEST_STREAM_HASH_MISMATCH')
            else:
                row = table[info.filename]
                if size != row['bytes'] or digest.hexdigest() != row['sha256']:
                    raise ValueError('STREAM_FILE_HASH_MISMATCH: ' + info.filename)
        checks.append({'id': 'ZIP_CRC_AND_STREAM_HASHES', 'status': 'PASS', 'files': len(infos)})
    extracted_files = [p for p in extracted.rglob('*') if p.is_file()]
    extracted_names = [p.relative_to(extracted).as_posix() for p in extracted_files]
    if validate_paths(extracted_names) != actual_set:
        raise ValueError('BIDIRECTIONAL_EXTRACTED_FILE_SET_MISMATCH')
    for row in entries:
        path = extracted / row['path']
        if path.stat().st_size != row['bytes'] or sha(path) != row['sha256']:
            raise ValueError('INDEPENDENT_REHASH_MISMATCH: ' + row['path'])
    if sha(extracted / MANIFEST) != expected_manifest_hash:
        raise ValueError('INDEPENDENT_MANIFEST_HASH_MISMATCH')
    checks.append({'id': 'EXTRACTED_TREE_INDEPENDENT_REHASH_AND_BIDIRECTIONAL_SET', 'status': 'PASS', 'files': len(extracted_files)})
    snapshot = load_json((extracted / 'source_snapshot_manifest.json').read_bytes())
    required = snapshot['current_runtime_candidate_files']
    for row in required:
        actual = table.get(row['path'])
        if actual is None or actual['sha256'] != row['sha256'] or actual['bytes'] != row['bytes']:
            raise ValueError('REQUIRED_CURRENT_SOURCE_MISSING: ' + row['path'])
    if snapshot['runtime_correspondence']['status'] != 'PASS':
        raise ValueError('SOURCE_RUNTIME_BINDING_NOT_PASS')
    checks.append({'id': 'ALL_CURRENT_RUNTIME_AND_TEST_FILES_INCLUDED', 'status': 'PASS', 'files': len(required)})
    index = load_json((extracted / 'test_evidence_index.json').read_bytes())
    cases = index['primary_cases']
    if len({x['test_id'] for x in cases}) != len(cases):
        raise ValueError('TEST_ID_DUPLICATE')
    for case in cases:
        for name in [case['test_file'], *case['source_files'], case['original_log']['path']]:
            if name not in actual_set:
                raise ValueError('TEST_REFERENCE_MISSING: ' + name)
    checks.append({'id': 'PRIMARY_TEST_SOURCE_AND_LOG_REFERENCES', 'status': 'PASS', 'cases': len(cases)})
    return {
        'schema': 'agentnexus/independent-package-verification/1', 'status': 'PASS',
        'started_utc': started, 'ended_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
        'verifier': 'Python stdlib, no AgentNexus runtime/product imports or product test execution',
        'zip': {'name': archive.name, 'bytes': archive.stat().st_size, 'sha256': archive_hash},
        'manifest_sha256': expected_manifest_hash, 'payload_files': len(entries),
        'archive_files_including_manifest': len(actual_set),
        'extracted_directory': str(extracted), 'checks': checks, 'errors': [],
        'self_hash_rule': 'Only exact root audit_package_manifest.json is self-excluded; its digest is checked by detached manifest/ZIP hash and reported here. Nested same-name files are ordinary payload.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--zip', required=True)
    parser.add_argument('--expected-zip-sha256')
    parser.add_argument('--manifest-file')
    parser.add_argument('--extract-parent', required=True)
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    try:
        result = verify(args.zip, args.expected_zip_sha256, args.manifest_file, args.extract_parent)
    except Exception as error:
        result = {'schema': 'agentnexus/independent-package-verification/1', 'status': 'FAIL', 'error': str(error), 'ended_utc': dt.datetime.now(dt.timezone.utc).isoformat()}
    report = Path(args.report)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({k: result.get(k) for k in ('status', 'payload_files', 'archive_files_including_manifest', 'zip', 'error')}, ensure_ascii=False), flush=True)
    raise SystemExit(0 if result['status'] == 'PASS' else 1)


if __name__ == '__main__':
    main()
