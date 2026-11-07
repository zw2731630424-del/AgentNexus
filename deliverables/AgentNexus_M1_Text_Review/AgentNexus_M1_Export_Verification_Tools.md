# AgentNexus M1 Export Verification Tools

本轮新建的独立字节校验工具，不是M1源代码或历史测试。只解析导出包装并读原件比对，不加载产品。

## .workflow-kit/runtime/AgentNexus-M1-Text-Review/verify_text_export.py

类别：`new_export_verification_utility_not_M1`；原始字节数：5883。

源文件 SHA256：

```text
d761b181af2713fbdd283cf606a81552639ab652bad9b7951f6b58fe58dfaa88
```

<!-- agentnexus-export-entry: {"record_id":"TEXT-0092","path":".workflow-kit/runtime/AgentNexus-M1-Text-Review/verify_text_export.py","bytes":5883,"sha256":"d761b181af2713fbdd283cf606a81552639ab652bad9b7951f6b58fe58dfaa88","language":"python","fence":"```","wrapper_padding_newline":false,"category":"new_export_verification_utility_not_M1","kind":"new_export_tool","origin":{"kind":"workspace","path":".workflow-kit/runtime/AgentNexus-M1-Text-Review/verify_text_export.py"}} -->
```python
"""Independently parse Markdown wrappers and compare raw payloads to originals.

This is an export check, not an AgentNexus test or runtime loader.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

MARKER = re.compile(rb'^<!-- agentnexus-export-entry: (.+) -->\n', re.M)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_original(root, entry):
    origin = entry['origin']
    if origin['kind'] == 'workspace':
        return (root / origin['path']).read_bytes()
    if origin['kind'] == 'zip':
        with zipfile.ZipFile(root / origin['archive']) as archive:
            return archive.read(origin['member'])
    raise ValueError('UNKNOWN_ORIGIN')


def extract(document):
    cursor, records = 0, []
    while True:
        match = MARKER.search(document, cursor)
        if match is None:
            break
        meta = json.loads(match.group(1).decode('utf-8'))
        fence = meta['fence'].encode('ascii')
        opener = fence + meta['language'].encode('ascii') + b'\n'
        if document[match.end():match.end() + len(opener)] != opener:
            raise ValueError('OPENING_FENCE_MISMATCH: ' + meta['path'])
        start = match.end() + len(opener)
        end = start + meta['bytes']
        payload = document[start:end]
        padding = b'\n' if meta['wrapper_padding_newline'] else b''
        footer = padding + fence + b'\n<!-- agentnexus-export-end -->\n'
        if document[end:end + len(footer)] != footer:
            raise ValueError('TRUNCATION_OR_CLOSING_FENCE_MISMATCH: ' + meta['path'])
        if len(payload) != meta['bytes'] or sha(payload) != meta['sha256']:
            raise ValueError('PAYLOAD_SHA256_OR_LENGTH_MISMATCH: ' + meta['path'])
        # A payload cannot contain a fence long enough to close the wrapper.
        if any(len(run) >= len(fence) for run in re.findall(rb'`+', payload)):
            raise ValueError('UNSAFE_FENCE_SELECTION: ' + meta['path'])
        records.append({'metadata': meta, 'payload': payload, 'body_start': start, 'body_end': end,
                        'header_line': document.count(b'\n', 0, match.start()) + 1,
                        'body_line': document.count(b'\n', 0, start) + 1})
        cursor = end + len(footer)
    return records


def verify(root, output, plan):
    root, output = Path(root), Path(output)
    expected = {r['record_id']: r for r in plan['records']}
    if len(expected) != len(plan['records']):
        raise ValueError('DUPLICATE_PLANNED_RECORD_ID')
    actual, docs = {}, []
    for name in plan['payload_documents']:
        path = output / name
        raw = path.read_bytes()
        raw.decode('utf-8', errors='strict')
        records = extract(raw)
        for record in records:
            meta = record['metadata']
            record_id = meta['record_id']
            if record_id in actual or record_id not in expected:
                raise ValueError('UNREGISTERED_OR_DUPLICATE_RECORD')
            item = expected[record_id]
            for key in ['path', 'bytes', 'sha256', 'language', 'fence', 'wrapper_padding_newline']:
                if meta[key] != item[key]:
                    raise ValueError('PLAN_METADATA_MISMATCH: ' + record_id)
            if item['document'] != name:
                raise ValueError('RECORD_IN_WRONG_DOCUMENT')
            original = read_original(root, item)
            if original != record['payload']:
                raise ValueError('ORIGINAL_VS_EXTRACTED_BYTES_DIFFER: ' + meta['path'])
            if sha(original) != item['sha256'] or len(original) != item['bytes']:
                raise ValueError('ORIGINAL_CHANGED_DURING_EXPORT')
            actual[record_id] = {'record_id': record_id, 'path': meta['path'], 'document': name,
                                 'bytes': len(original), 'sha256': sha(original),
                                 'header_line': record['header_line'], 'body_line': record['body_line'],
                                 'body_start': record['body_start'], 'body_end': record['body_end'],
                                 'status': 'PASS'}
        docs.append({'path': name, 'bytes': len(raw), 'sha256': sha(raw), 'records': len(records)})
    if set(expected) != set(actual):
        raise ValueError('BIDIRECTIONAL_RECORD_SET_MISMATCH')
    all_declared = {r['path'] for r in plan['records'] if r['kind'] != 'new_export_tool'}
    if all_declared != set(plan['required_original_paths']):
        raise ValueError('SOURCE_OR_EVIDENCE_FILE_OMITTED')
    return {'schema': 'agentnexus/text-export-byte-verification/1', 'status': 'PASS',
            'records': [actual[k] for k in sorted(actual)], 'documents': docs,
            'record_total': len(actual), 'unique_original_paths': len(all_declared),
            'original_byte_equality': True, 'truncation': False, 'unexplained_omissions': [],
            'method': 'A separate byte parser extracts the N original bytes inside each independently located fence; validates footer, hash, UTF8, exact original bytes and bidirectional planned record/file sets. No newline normalization or AST reserialization.',
            'product_tests_executed': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', required=True)
    parser.add_argument('--directory', required=True)
    parser.add_argument('--plan', required=True)
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    result = verify(args.workspace, args.directory, json.loads(Path(args.plan).read_text('utf-8')))
    Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({'status': result['status'], 'records': result['record_total'],
                      'unique_original_paths': result['unique_original_paths']}, ensure_ascii=False))
```
<!-- agentnexus-export-end -->

