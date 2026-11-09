"""Read-only Phase 0 checks, then copy only frozen sources into a new candidate.
No key/store, SCM, ACL, elevation or provider operations.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parents[1]
Q3 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q3'
Q4 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4'

def sha(p):
    with p.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def write(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def main():
    errors, checks = [], []
    for base in [Q3, Q4]:
        rows = []
        for line in (base / 'SHA256SUMS').read_text('utf-8-sig').splitlines():
            expected, rel = line.split('  ', 1)
            actual = sha(base / rel)
            rows.append({'path': rel, 'expected': expected, 'actual': actual})
            if actual != expected:
                errors.append(str(base / rel))
        checks.append({'bundle': base.name, 'checksums': rows, 'sha256sums_sha256': sha(base / 'SHA256SUMS')})
    source = json.loads((Q3 / 'source-manifest.json').read_bytes())['files']
    with zipfile.ZipFile(Q3 / 'AgentNexus-M1.8.3-Q3-source.zip') as z:
        archived = {i.filename: hashlib.sha256(z.read(i)).hexdigest() for i in z.infolist() if not i.is_dir()}
    if archived != {r['path']: r['sha256'] for r in source}:
        errors.append('SOURCE_ZIP')
    for r in source:
        if sha(Q3 / 'source' / r['path']) != r['sha256']:
            errors.append('SOURCE:' + r['path'])
    manifest = json.loads((Q4 / 'approval/installation-manifest.json').read_bytes())
    actual_files = {p.relative_to(Q3 / 'payload').as_posix() for p in (Q3 / 'payload').rglob('*') if p.is_file()}
    if actual_files != {r['path'] for r in manifest['files']}:
        errors.append('PAYLOAD_FILE_SET')
    for r in manifest['files']:
        p = Q3 / 'payload' / r['path']
        if p.stat().st_size != r['bytes'] or sha(p) != r['sha256']:
            errors.append('PAYLOAD:' + r['path'])
    protected = ['AGENTS.md', '.workflow-kit/governance/policy.json', '.workflow-kit/governance/baseline.json',
                 'ai-workflow-kit-v4/tools/govern.py', 'deliverables/AgentNexus-M1.5/adr.md',
                 'deliverables/AgentNexus-M1.6/adr.md', 'deliverables/AgentNexus-M1.6.1/adr.md']
    record = {'schema': 'agentnexus.q41.baseline.v1', 'checked_at_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
              'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'tracked_worktree': subprocess.check_output(['git', 'status', '--short', '--untracked-files=no'], cwd=ROOT, text=True),
              'checks': checks, 'q3_source_files': len(source), 'payload_files': len(manifest['files']),
              'payload_bytes': sum(r['bytes'] for r in manifest['files']),
              'q4_manifest_is_final_signed': False,
              'protected': [{'path': r, 'sha256': sha(ROOT / r)} for r in protected],
              'q4_requested_path_resolution': {
                  'reports/deployment-approval.md': 'approval/deployment-request.md and Q3/reports/deployment-approval.md',
                  'reports/deployment-runbook.md': 'Q3/reports/deployment-approval.md and Q4/approval/deployment-request.json'},
              'status': 'FAIL' if errors else 'PASS', 'errors': errors, 'system_changes': False}
    write(OUT / 'evidence/baseline.json', record)
    if errors:
        raise SystemExit('BASELINE_MISMATCH')
    if (OUT / 'source/package.json').exists():
        raise SystemExit('REFUSE_EXISTING_SOURCE')
    for r in source:
        dest = OUT / 'source' / r['path']
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(Q3 / 'source' / r['path'], dest)
    for name in ['windows-attack-results.json', 'qualification-evidence-19.json']:
        dest = OUT / 'tests' / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(Q4 / 'tests' / name, dest)
    task = ROOT / '.workflow-kit/tasks/AgentNexus-M1.8.3-Q4.1'
    write(task / 'task.json', {'milestone': 'M1.8.3-Q4.1', 'classification': 'deliverable',
                             'certificate_or_system_changes_authorized': False, 'real_import': False, 'live_provider': False})
    shutil.copyfile(Path(r'C:\Users\28642\.codex\attachments\c2ef0be7-e32a-42b7-abfe-e6e6156b0dc6\已粘贴的文本.txt'), task / 'original-request.txt')
    print(json.dumps({k: record[k] for k in ['head', 'tracked_worktree', 'q3_source_files', 'payload_files', 'payload_bytes', 'status']}))

if __name__ == '__main__':
    main()
