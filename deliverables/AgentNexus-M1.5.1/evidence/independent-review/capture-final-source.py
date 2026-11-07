"""Reviewer-owned immutable source capture. Invoke only after author freeze."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import shutil
import sys

ROOT = Path('I:/AI_AgentNexus')
SOURCE = ROOT / 'deliverables/AgentNexus-M1.5.1/source'
OUT = ROOT / 'deliverables/AgentNexus-M1.5.1/evidence/independent-review'
SNAPSHOT = OUT / 'final-source'

def inventory(root):
    rows = []
    for path in root.rglob('*'):
        if 'node_modules' in path.relative_to(root).parts:
            continue
        if path.is_symlink() or getattr(path.lstat(), 'st_file_attributes', 0) & 0x400:
            raise ValueError('Source link/reparse entry: ' + str(path))
        if path.is_file():
            data = path.read_bytes()
            rows.append({'path': path.relative_to(root).as_posix(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    rows.sort(key=lambda r: r['path'])
    return rows

def set_hash(rows):
    return hashlib.sha256(''.join(f"{r['path']}\0{r['sha256']}\n" for r in rows).encode('utf-8')).hexdigest()

expected = sys.argv[1]
assert len(expected) == 64 and all(c in '0123456789abcdef' for c in expected)
before = inventory(SOURCE)
assert set_hash(before) == expected, ('Author freeze mismatch', expected, set_hash(before))
SNAPSHOT.mkdir(parents=True, exist_ok=False)
for row in before:
    destination = SNAPSHOT / row['path']
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE / row['path'], destination)
copied = inventory(SNAPSHOT)
after = inventory(SOURCE)
assert before == copied == after, 'Source changed while capturing reviewer copy'
original = json.loads((OUT / 'reading-manifest.json').read_text('utf-8'))['original_m15_source']['files']
old = {r['path']: r for r in original}
new = {r['path']: r for r in before}
changed = [r for r in before if r['path'] in old and r != old[r['path']]]
added = [r for r in before if r['path'] not in old]
removed = [r for r in original if r['path'] not in new]
report = {
    'schema': 'agentnexus/m1.5.1/independent-final-source/1',
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'source': str(SOURCE), 'reviewer_copy': str(SNAPSHOT),
    'author_expected_set_sha256': expected, 'independent_set_sha256': set_hash(before),
    'original_set_sha256': set_hash(original), 'count': len(before),
    'all_copied_bytes_equal': True, 'unchanged_during_capture': True,
    'files': before, 'added': added, 'changed': changed, 'removed': removed,
    'unchanged': [r for r in before if r['path'] in old and r == old[r['path']]],
    'set_definition': 'SHA256 of sorted slash path + NUL + lowercase SHA256 + LF',
}
(OUT / 'final-source-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'files': len(before), 'set_sha256': set_hash(before), 'changed': [r['path'] for r in changed], 'added': [r['path'] for r in added], 'removed': [r['path'] for r in removed]}))
