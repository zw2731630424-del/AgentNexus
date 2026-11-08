"""Append-only M1.8.2 evidence and source packaging; no credential discovery."""
from __future__ import annotations
import datetime, hashlib, json, os, pathlib, runpy, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'deliverables/AgentNexus-M1.8.2'
RUN = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8.2'
BASE = ROOT / 'deliverables/AgentNexus-M1.8.1'
NAMES = ('src', 'tests', 'tools', 'config', 'package.json', 'package-lock.json', 'tsconfig.json')

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''): h.update(block)
    return h.hexdigest()

def inventory(root, names=None):
    rows = []
    for name in names or sorted(p.name for p in root.iterdir()):
        path = root / name
        if not path.exists(): continue
        candidates = [path] if path.is_file() else path.rglob('*')
        for file in candidates:
            if file.is_symlink() or file.is_junction(): raise ValueError('LINK_REFUSED:' + str(file))
            if file.is_file() and '__pycache__' not in file.parts:
                rows.append(dict(path=file.relative_to(root).as_posix(), bytes=file.stat().st_size, sha256=digest(file)))
    return sorted(rows, key=lambda row: row['path'])

def source_set(rows):
    return hashlib.sha256(''.join(r['path'] + '\0' + r['sha256'] + '\n' for r in rows).encode()).hexdigest()

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        json.dump(data, stream, ensure_ascii=False, indent=2); stream.write('\n')

def freeze():
    rows = inventory(BASE / 'source', NAMES)
    assert source_set(rows) == 'd2091ef71fbd7a62f17ff8a42a922357759817073d97f1343d27b6ff7c9c3bb1'
    names = ['deliverables/' + p.name for p in (ROOT / 'deliverables').iterdir() if p.name != OUT.name]
    history = inventory(ROOT, names + ['src', 'tests', 'config', 'README.md', 'package.json', 'AGENTS.md'])
    def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
    drift = []
    for line in (BASE / 'SHA256SUMS.txt').read_text(encoding='utf-8').splitlines():
        if line.strip():
            expected, rel = line.split('  ', 1)
            if not (BASE / rel).is_file() or digest(BASE / rel) != expected: drift.append(rel)
    record = dict(schema='agentnexus/m1.8.2/baseline/1', created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        branch=git('branch', '--show-current'), head=git('rev-parse', 'HEAD'), status=git('status', '--short'),
        source_set_sha256=source_set(rows), baseline_source=rows, history=history, prior_manifest_drift=drift,
        authorization=dict(provider='deepseek', total_input_output_tokens=100000000, data='reviewed public protocols and synthetic pilot only',
            final_request_confirmation_required=True, system_security_changes=False, commit_push=False))
    write(RUN / 'baseline.json', record)
    OUT.mkdir(parents=True, exist_ok=False)
    shutil.copytree(BASE / 'source', OUT / 'source')
    assert inventory(OUT / 'source', NAMES) == rows
    write(OUT / 'evidence/baseline.json', record)
    print(json.dumps(dict(status='PASS', source_files=len(rows), history_files=len(history), source_set_sha256=source_set(rows), prior_manifest_drift=drift)))

def preserve():
    record = json.loads((RUN / 'baseline.json').read_text(encoding='utf-8'))
    changed = [r['path'] for r in record['history'] if not (ROOT / r['path']).is_file() or digest(ROOT / r['path']) != r['sha256']]
    result = dict(status='FAIL' if changed else 'PASS', checked_files=len(record['history']), changed=changed)
    print(json.dumps(result)); return result

def prepare():
    source = OUT / 'source'
    text = (source / 'tools/agentnexus/verify-m181.mjs').read_text(encoding='utf-8')
    text = text.replace('m1.8.1', 'm1.8.2').replace("['all', 'm181', 'model']", "['all', 'm182', 'model']").replace('all|m181|model', 'all|m182|model')
    text = text.replace("suite === 'm181' ? name.startsWith('m181-') : /^m18(?:1)?-/", "suite === 'm182' ? name.startsWith('m182-') : /^m18(?:1|2)?-/")
    with (source / 'tools/agentnexus/verify-m182.mjs').open('x', encoding='utf-8', newline='\n') as stream: stream.write(text)
    for name in ['package.json', 'package-lock.json']:
        path = source / name; data = json.loads(path.read_text(encoding='utf-8')); data['version'] = '0.4.0-m1.8.2'
        if name == 'package.json': data['scripts']['verify:m182'] = 'node tools/agentnexus/verify-m182.mjs'
        else: data['packages']['']['version'] = '0.4.0-m1.8.2'
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps(dict(status='PASS', verifier=str(source / 'tools/agentnexus/verify-m182.mjs'))))

def package():
    gate_log = RUN / 'governance-root-extended-check.txt'
    assert 'Governance check: PASS' in gate_log.read_text(encoding='utf-8-sig'), 'FULL_ROOT_GOVERNANCE_NOT_PASSED'
    result = preserve(); assert result['status'] == 'PASS'
    write(OUT / 'evidence/history-preservation.json', result)
    rows = inventory(OUT / 'source', NAMES)
    assert source_set(rows) == json.loads((RUN / 'candidate-freeze.json').read_text(encoding='utf-8'))['set_sha256'], 'FINAL_SOURCE_DRIFT'
    write(OUT / 'source.manifest.json', dict(files=rows, set_sha256=source_set(rows), encoding='UTF8(path + NUL + sha256 + LF)'))
    old = {r['path']: r['sha256'] for r in json.loads((RUN / 'baseline.json').read_text(encoding='utf-8'))['baseline_source']}
    write(OUT / 'evidence/source-changes.json', dict(changed=[r for r in rows if old.get(r['path']) != r['sha256']], removed=sorted(set(old) - {r['path'] for r in rows})))
    (OUT / 'build-tools').mkdir(exist_ok=True)
    for name in ['m182-delivery.py','m182-report.py','m182-evidence.mjs','m182-probes.mjs','m182-vault-reader.mjs']:
        shutil.copy2(ROOT / 'tools/agentnexus' / name, OUT / 'build-tools' / name)
    # The full-root check uses the unmodified checker. Files added while it ran
    # are also checked with its original path/classification functions, including
    # the final evidence and hash manifest. No policy skip or override is added.
    sys.dont_write_bytecode = True
    govern = runpy.run_path(str(ROOT / 'ai-workflow-kit-v4/tools/govern.py'), run_name='m182_final_delta')
    policy = json.loads((ROOT / '.workflow-kit/governance/policy.json').read_text(encoding='utf-8'))
    state = json.loads((ROOT / '.workflow-kit/governance/baseline.json').read_text(encoding='utf-8'))
    assert digest(ROOT / '.workflow-kit/governance/policy.json') == state['policy_sha256']
    assert all(digest(ROOT / path) == expected for path, expected in state['protected_rules'].items())
    extended = pathlib.Path('\\\\?\\' + str(ROOT)) if os.name == 'nt' else ROOT
    pending = ['SHA256SUMS.txt', 'evidence/governance/final-delta.json']
    paths = ['deliverables/AgentNexus-M1.8.2/' + path for path in sorted({r['path'] for r in inventory(OUT)} | set(pending))]
    paths += [p.relative_to(ROOT).as_posix() for p in (ROOT / 'tools/agentnexus').glob('m182-*') if p.is_file()]
    paths += [p.relative_to(ROOT).as_posix() for p in (ROOT / '.workflow-kit/tasks/AgentNexus-M1.8.2').iterdir() if p.is_file()]
    checked = []
    for rel in sorted(paths):
        govern['path_at'](extended, rel); category = govern['classify'](rel, policy, state)
        assert category in {'deliverable', 'implementation', 'task'}, (rel, category)
        checked.append(dict(path=rel, category=category))
    write(OUT / 'evidence/governance/final-delta.json', dict(status='PASS', checker_sha256=digest(ROOT / 'ai-workflow-kit-v4/tools/govern.py'),
        full_root_log='root-extended-check.txt', checks_disabled=False, rules_changed=False, checked=checked))
    files = inventory(OUT)
    with (OUT / 'SHA256SUMS.txt').open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(''.join(r['sha256'] + '  ' + r['path'] + '\n' for r in files))
    print(json.dumps(dict(status='PASS', source_files=len(rows), set_sha256=source_set(rows), delivery_files=len(files))))

if __name__ == '__main__':
    {'freeze': freeze, 'preserve': preserve, 'prepare': prepare, 'package': package}[sys.argv[1]]()
