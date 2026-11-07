from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import hashlib
import json

ROOT = Path('I:/AI_AgentNexus')
OUT = ROOT / 'deliverables/AgentNexus-M1.5.1/evidence/independent-review'
BASE = ROOT / 'deliverables/AgentNexus-M1.5/source'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def item(path, coverage):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data), 'sha256': digest(data), 'reading_method': coverage}

def reject_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key: ' + key)
        result[key] = value
    return result

catalogs = []
for filename, key in [('features.json', 'features'), ('policies.json', 'policies')]:
    path = BASE / 'config/agentnexus' / filename
    body = json.loads(path.read_text('utf-8'), object_pairs_hook=reject_duplicates)
    counts = Counter()
    def visit(value, depth=0):
        counts[type(value).__name__] += 1
        counts['max_depth'] = max(counts['max_depth'], depth)
        if isinstance(value, dict):
            for child in value.values():
                visit(child, depth + 1)
        elif isinstance(value, list):
            for child in value:
                visit(child, depth + 1)
    visit(body)
    values = body[key]
    ids = [x['id'] for x in values]
    assert len(ids) == len(set(ids))
    row = {'path': path.relative_to(ROOT).as_posix(), 'sha256': digest(path.read_bytes()), 'json_walk_counts': dict(counts), 'entries': len(values), 'duplicate_ids': False, 'duplicate_keys': False}
    if key == 'features':
        row['runtime_and_audit_defaults'] = [{'id': x['id'], 'kind': x['kind'], 'default': x['default']} for x in values if x['id'].startswith('runtime.') or x['id'].startswith('security.') or x['id'].startswith('audit.producer.')]
        protected = ['runtime.bootstrap.host', 'runtime.bootstrap.worker', 'runtime.ipc.persistent', 'runtime.exit_closure', 'runtime.ubuntu.adapter', 'runtime.host.production', 'runtime.worker.production', 'runtime.broker.production', 'runtime.sandbox.windows.production']
        row['protected_features_default_off'] = all(next(x for x in values if x['id'] == name)['default'] == 'OFF' for name in protected)
        assert row['protected_features_default_off']
    else:
        row['policy_contracts'] = [{'id': x['id'], 'level': x['level'], 'degradable': x['degradable'], 'enforcement_owner': x['enforcement_owner']} for x in values]
        row['l0_non_degradable'] = all(x['degradable'] is False for x in values if x['level'] == 'L0')
        assert row['l0_non_degradable']
    current = ROOT / 'deliverables/AgentNexus-M1.5.1/source/config/agentnexus' / filename
    row['m151_same_bytes_at_reading'] = current.read_bytes() == path.read_bytes()
    catalogs.append(row)

files = []
for path in sorted((BASE / 'src').rglob('*.ts')):
    files.append(item(path, 'FULL_TEXT_SEMANTIC_REVIEW'))
for path in sorted((BASE / 'tests').rglob('*.ts')):
    coverage = 'HASH_ONLY_NATIVE_REVIEW_DELEGATED_TO_PARENT' if path.name in ['m14-native.test.ts', 'windows-native.test.ts'] else 'FULL_TEXT_SEMANTIC_REVIEW'
    files.append(item(path, coverage))
extra_full = [
    'src/agentnexus/checkers/python_ast.py', 'src/agentnexus/bootstrap/ubuntu/peer_probe.c',
    'tools/agentnexus/verify-m12.mjs', 'tools/agentnexus/verify-m13.mjs',
    'tools/agentnexus/verify-m14.mjs', 'tools/agentnexus/verify-m15.mjs',
    'tools/agentnexus/typecheck-m15.mjs', 'tools/agentnexus/run-tests.mjs',
    'tools/agentnexus/json-reporter.mjs', 'tools/agentnexus/freeze-m13.py',
    'tools/agentnexus/package-m12.py', 'tools/agentnexus/cpu-qualify-m15.d.mts',
    'tests/agentnexus/runtime-worker.mjs', 'tests/agentnexus/runtime-crash-child.mjs',
    'tests/agentnexus/reconciliation-child.mjs', 'tests/agentnexus/owned-storage-child.mjs',
    'tests/agentnexus/m14-broker-child.mjs', 'package-lock.json',
]
for name in extra_full:
    files.append(item(BASE / name, 'FULL_TEXT_SEMANTIC_REVIEW'))
for name in ['config/agentnexus/features.json', 'config/agentnexus/policies.json']:
    files.append(item(BASE / name, 'COMPLETE_JSON_STRUCTURE_PARSE; NOT_LITERAL_PROSE_LINE_REVIEW'))
history = [
    'AGENTS.md', 'ai-workflow-kit-v4/project-workflows/README.md', '.workflow-kit/governance/policy.json',
    'deliverables/AgentNexus-M1.2/acceptance-report.md', 'deliverables/AgentNexus-M1.2/independent-recheck.md',
    'deliverables/AgentNexus-M1.2/issue-ledger.json', 'deliverables/AgentNexus-M1.2/independent-code-review.json',
    'deliverables/AgentNexus-M1.3/acceptance-report.md', 'deliverables/AgentNexus-M1.3/adr.md',
    'deliverables/AgentNexus-M1.3/independent-security-review.md', 'deliverables/AgentNexus-M1.3/independent-security-review.json',
    'deliverables/AgentNexus-M1.4/acceptance-report.md', 'deliverables/AgentNexus-M1.4/adr.md',
    'deliverables/AgentNexus-M1.4/independent-security-review.md',
    'deliverables/AgentNexus-M1.5/acceptance-report.md', 'deliverables/AgentNexus-M1.5/adr.md',
    'deliverables/AgentNexus-M1.5/design.md', 'deliverables/AgentNexus-M1.5/independent-security-review.md',
    'deliverables/AgentNexus-M1.5/evidence/independent-review/independent-security-review-final.md',
    'deliverables/AgentNexus-M1.5/evidence/independent-review/independent-security-review-final.json',
    'deliverables/AgentNexus-M1.5/source/package.json', 'deliverables/AgentNexus-M1.5/source/tsconfig.json',
]
for name in history:
    files.append(item(ROOT / name, 'FULL_TEXT_READ'))
for parent in ['AgentNexus-v0.4-M0', 'AgentNexus-v0.4-M0.1']:
    for path in sorted((ROOT / '.workflow-kit/tasks' / parent / 'architecture/adr').glob('*.md')):
        files.append(item(path, 'FULL_TEXT_READ'))
files.append(item(ROOT / 'deliverables/AgentNexus-M1.4/independent-security-review.json', 'FULL_JSON_PARSE_AND_NARRATIVE_EVIDENCE_SECTIONS_READ; NOT_REAUDIT_OF_EACH_HISTORICAL_NATIVE_FRAME'))
files.append(item(ROOT / 'ai-workflow-kit-v4/tools/govern.py', 'TARGETED_NEW_COMMAND_IMPLEMENTATION_AND_CLI_HELP_READ'))
outer = ROOT / 'deliverables/AgentNexus-M1.5/independent-security-review.json'
original_report = ROOT / 'deliverables/AgentNexus-M1.5/evidence/independent-review/independent-security-review-final.json'
assert outer.read_bytes() == original_report.read_bytes()
files.append(item(outer, 'FULL_TEXT_READ_VIA_BYTE_IDENTICAL_ORIGINAL_REPORT'))
source = []
for path in sorted(BASE.rglob('*')):
    if path.is_file() and 'node_modules' not in path.parts:
        data = path.read_bytes()
        source.append({'path': path.relative_to(BASE).as_posix(), 'bytes': len(data), 'sha256': digest(data)})
source.sort(key=lambda f: f['path'])
set_hash = digest(''.join(f"{f['path']}\0{f['sha256']}\n" for f in source).encode('utf-8'))
report = {
    'schema': 'agentnexus/m1.5.1/independent-reading/1',
    'reviewer': '/root/independent_review',
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'phase': 'BASELINE_READ_COMPLETE_FINAL_CANDIDATE_PENDING',
    'product_typescript_full_read': sum(f['path'].startswith('deliverables/AgentNexus-M1.5/source/src/') and f['path'].endswith('.ts') and f['reading_method'] == 'FULL_TEXT_SEMANTIC_REVIEW' for f in files),
    'test_typescript_full_read': sum(f['path'].startswith('deliverables/AgentNexus-M1.5/source/tests/') and f['path'].endswith('.ts') and f['reading_method'] == 'FULL_TEXT_SEMANTIC_REVIEW' for f in files),
    'native_tests_hash_only': 2,
    'rules': {'parent_agents_present': False, 'project_rules_index_present': False, 'matching_workflow': None},
    'files': sorted(files, key=lambda x: x['path']),
    'original_m15_source': {'files': source, 'count': len(source), 'set_sha256': set_hash, 'set_definition': 'SHA256 of sorted slash path + NUL + lowercase SHA256 + LF'},
    'independence': {'product_modified': False, 'historical_evidence_modified': False, 'recursive_delegation': False, 'system_changes': False, 'cpu_busy_loops_run': False, 'full_suite_run': False},
    'notes': ['Current reading covers the original M1.5 bytes. Unchanged final M1.5.1 files inherit review only after independent byte comparison; changed/new files require explicit final reread.', 'Native C#/PowerShell, CPU runner, m15-cpu-worker.mjs, m14-native-worker.mjs and m15-pipe-owner-child.mjs remain parent semantic-review scope. Their hashes are in the complete source inventory.', 'Catalogs are fully programmatically parsed, with every JSON value traversed and security defaults inspected; this is not a claim of literal prose review of the large catalog files.', 'Governance new was attempted but failed before creation on an existing baseline-corrected runtime Windows long path; this approved deliverable path was then created directly.'],
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'reading-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(OUT / 'catalog-analysis.json').write_text(json.dumps({'schema': 'agentnexus/m1.5.1/independent-catalog-parse/1', 'method': 'Complete JSON parse with duplicate-key rejection and recursive visit of every value; selected security contract projection', 'catalogs': catalogs}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'read_files': len(files), 'product_ts': report['product_typescript_full_read'], 'test_ts': report['test_typescript_full_read'], 'source_count': len(source), 'source_set_sha256': set_hash}))
