from pathlib import Path
import hashlib, json, shutil, subprocess, datetime, os

ROOT = Path('I:/AI_AgentNexus')
OUT = ROOT / '.workflow-kit/runtime/AgentNexus-M1.7'
OLD = ROOT / 'deliverables/AgentNexus-M1.6.1'
NEW = ROOT / 'deliverables/AgentNexus-M1.7'

def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')

if __name__ == '__main__':
    manifest = json.loads((OLD / 'source-sha256.json').read_text('utf-8'))
    failures = []
    for item in manifest['files']:
        path = OLD / 'source' / item['path']
        if not path.is_file() or path.stat().st_size != item['bytes'] or digest(path) != item['sha256']:
            failures.append(item['path'])
    if failures:
        raise RuntimeError(f'Baseline SHA256 mismatch: {failures}')
    if (NEW / 'source').exists():
        raise RuntimeError('Independent M1.7 source already exists')
    original = []
    for rel in ['src', 'tests', 'tools', 'config', 'inputs', 'deliverables', '.workflow-kit/tasks']:
        base = ROOT / rel
        for folder, dirs, files in os.walk(base):
            dirs[:] = sorted(d for d in dirs if d not in {'node_modules', '__pycache__', '.git'}
                             and Path(folder, d) != NEW
                             and Path(folder, d) != ROOT / '.workflow-kit/tasks/AgentNexus-M1.7')
            for name in sorted(files):
                path = Path(folder, name)
                if path.is_symlink():
                    raise RuntimeError(f'Unqualified historical link: {path}')
                original.append({'path': path.relative_to(ROOT).as_posix(),
                                 'bytes': path.stat().st_size, 'sha256': digest(path)})
    for name in ['AGENTS.md', 'README.md', 'package.json', '.gitattributes', '.gitignore',
                 '.workflow-kit/governance/policy.json', '.workflow-kit/governance/baseline.json']:
        path = ROOT / name
        original.append({'path': name, 'bytes': path.stat().st_size, 'sha256': digest(path)})
    original.sort(key=lambda item: item['path'])
    write(OUT / 'historical-freeze.json', {'schema': 'agentnexus/m17/history-freeze/1', 'files': original})
    NEW.mkdir(parents=True, exist_ok=True)
    shutil.copytree(OLD / 'source', NEW / 'source')
    for item in manifest['files']:
        assert digest(NEW / 'source' / item['path']) == item['sha256']
    baseline = NEW / 'evidence/baseline'
    baseline.mkdir(parents=True)
    for name in ['source-sha256.json', 'acceptance-report.md', 'acceptance.json', 'test-results.json',
                 'native-test-results.json', 'issue-ledger.json', 'resource-qualification.json',
                 'independent-code-review.md']:
        shutil.copyfile(OLD / name, baseline / ('m161-' + name))
    shutil.copyfile(ROOT / 'C:/impossible', OUT / 'unused') if False else None
    request = Path('C:/Users/28642/.codex/attachments/e921c21a-0838-45fc-871d-1483dea766e3/已粘贴的文本.txt')
    shutil.copyfile(request, NEW / 'original-request.txt')
    git = lambda *args: subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
    summary = {'schema': 'agentnexus/m17/phase0/1', 'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'branch': git('branch', '--show-current'), 'head': git('rev-parse', 'HEAD'),
               'initial_worktree': 'CLEAN observed before task files', 'baseline_files': len(manifest['files']),
               'baseline_manifest': manifest, 'historical_files': len(original), 'source_copy_sha256': 'ALL_MATCH',
               'rules_index_exists': (ROOT / 'project-rules/README.md').exists(),
               'qualification': json.loads((OLD / 'resource-qualification.json').read_text('utf-8')),
               'real_provider_authorized': False, 'credentials_read': False, 'commit_push_authorized': False}
    write(baseline / 'phase0.json', summary)
    print(json.dumps({k: v for k, v in summary.items() if k not in {'baseline_manifest', 'qualification'}}, ensure_ascii=False))
