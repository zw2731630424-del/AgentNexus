"""Create Q1 review artifacts only. Never install, start, sign, decrypt or send."""
from __future__ import annotations
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True

ROOT = Path(r'\\?\I:\AI_AgentNexus')
Q = ROOT / 'deliverables/AgentNexus-M1.8.3-Q1'
BASE = ROOT / 'deliverables/AgentNexus-M1.8.3'
SOURCE = BASE / 'source'
IGNORE = {'node_modules', 'dist', 'raw', '.git', '__pycache__'}
SID = 'S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873'
OPERATOR = 'S-1-5-21-2532670394-1554971530-4095700938-1001'
TI = 'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464'

def normal(path):
    return str(path).removeprefix('\\\\?\\')

def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def write(rel, data):
    dest = Q / rel
    if not dest.is_relative_to(Q):
        raise ValueError('Q1_ONLY')
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not isinstance(data, str):
        data = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    dest.write_text(data, encoding='utf-8', newline='\n')

def walk(root, ignore=IGNORE):
    for directory, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in ignore)
        for name in sorted(files):
            p = Path(directory) / name
            if p.is_symlink() or getattr(p.lstat(), 'st_file_attributes', 0) & 0x400:
                raise ValueError('REPARSE_INPUT: ' + normal(p))
            yield p

def record(p, base=ROOT):
    return {'path': p.relative_to(base).as_posix(), 'bytes': p.stat().st_size, 'sha256': digest(p)}

def git(*args):
    p = subprocess.run(['git', '--no-optional-locks', '-c', 'core.fsmonitor=false', *args], cwd=ROOT, capture_output=True)
    return {'args': list(args), 'exit_code': p.returncode, 'stdout': p.stdout.decode('utf-8', errors='replace'), 'stderr': p.stderr.decode('utf-8', errors='replace')}

def inventory():
    before = Q / 'evidence/historical-preservation.before.json'
    if before.exists():
        raise ValueError('INITIAL_EVIDENCE_ALREADY_EXISTS')
    snapshots = []
    for version in ['AgentNexus-M1.8.2', 'AgentNexus-M1.8.3', 'AgentNexus-Model-Provider-UI']:
        snapshots.extend(record(p) for p in walk(ROOT / 'deliverables' / version))
    write('evidence/historical-preservation.before.json', {'checked_at_utc': dt.datetime.now(dt.timezone.utc).isoformat(), 'scope': 'All versioned delivery files, including source and evidence; dependency/generated directories explicitly excluded', 'excluded_directory_names': sorted(IGNORE), 'entries': snapshots})
    published = load(BASE / 'source.manifest.json')
    actual = [record(p, SOURCE) for p in walk(SOURCE)]
    actual.sort(key=lambda x: x['path'])
    aggregate = hashlib.sha256(''.join(e['path']+'\0'+e['sha256']+'\n' for e in actual).encode()).hexdigest()
    expected = {e['path']: e for e in published['files']}
    mismatches = [e['path'] for e in actual if expected.get(e['path']) != e]
    missing = sorted(set(expected) - {e['path'] for e in actual})
    write('evidence/source-verification.json', {'status': 'PASS' if not mismatches and not missing and aggregate == published['aggregate_sha256'] else 'FAIL', 'file_count': len(actual), 'aggregate_sha256': aggregate, 'expected_aggregate_sha256': published['aggregate_sha256'], 'mismatches': mismatches, 'missing': missing, 'files': actual})
    sums=[]
    for line in (BASE/'SHA256SUMS.txt').read_text(encoding='utf-8-sig').splitlines():
        if not line.strip(): continue
        sha, rel = line.split('  ', 1)
        p=BASE/rel
        sums.append({'path': rel, 'expected_sha256': sha, 'actual_sha256': digest(p), 'match': digest(p) == sha})
    write('evidence/m183-published-checksums.json', {'status':'PASS' if all(x['match'] for x in sums) else 'FAIL', 'files':sums})
    write('evidence/git-baseline.json', {'head':git('rev-parse','HEAD'), 'initial_worktree_observation':'First task query before Q1 creation returned an empty git status --short; HEAD 69ad728ed74e5bd7979dcebecdb07d94260b9089', 'worktree_at_inventory':git('status','--porcelain=v1','--untracked-files=all'), 'tracked_diff':git('diff','--name-status'), 'staged_diff':git('diff','--cached','--name-status'), 'rule_files':[record(ROOT/'AGENTS.md'),record(ROOT/'.workflow-kit/governance/policy.json'),record(ROOT/'.workflow-kit/governance/baseline.json')], 'project_rules_index_exists':(ROOT/'project-rules/README.md').exists()})
    write('evidence/historical-same-sid-fail.json', {'record_preserved':record(ROOT/'deliverables/AgentNexus-M1.8.2/evidence/probes/vault-final.json'), 'historical_result':load(ROOT/'deliverables/AgentNexus-M1.8.2/evidence/probes/vault-final.json'), 'q1_reexecution':'NOT_RUN', 'status':'HISTORICAL_FAIL_RETAINED'})
    if aggregate != published['aggregate_sha256'] or mismatches or missing or not all(x['match'] for x in sums):
        raise ValueError('BASELINE_INTEGRITY_FAILED')
    # Compare generated JS in memory. This does not modify M1.8.3/dist or execute service/UI code.
    build = subprocess.run([r'D:\Nodejs\node.exe', normal(Q/'tools/verify-build.mjs')], cwd=ROOT, capture_output=True)
    write('evidence/build-comparison.stdout.json', build.stdout.decode('utf-8',errors='replace'))
    write('evidence/build-comparison.stderr.txt', build.stderr.decode('utf-8',errors='replace'))
    if build.returncode != 0: raise ValueError('GENERATED_CANDIDATE_MISMATCH')
    # Candidate file mappings, not installed files. Include all current app files in chosen subtree.
    app=[]
    for folder in ['dist','desktop']:
        for p in walk(SOURCE/folder, {'node_modules','raw','.git','__pycache__'}):
            app.append({'path':'app/'+p.relative_to(SOURCE).as_posix(),'sha256':digest(p)})
    app.append({'path':'app/package.json','sha256':digest(SOURCE/'package.json')})
    app.sort(key=lambda x:x['path'])
    write('approval/app-manifest.json', {'schema':'agentnexus.application-manifest.v1','files':app})
    files=[]
    for x in app:
        p=SOURCE/x['path'].removeprefix('app/')
        files.append({'source':normal(p), 'destination':'C:\\Program Files\\AgentNexus\\'+x['path'].replace('/','\\'), 'sha256':x['sha256'], 'bytes':p.stat().st_size})
    for p,dest in [(BASE/'bin/AgentNexusCredential.exe','AgentNexusCredential.exe'),(BASE/'bin/pipe-client.exe','pipe-client.exe'),(Path(r'D:\Nodejs\node.exe'),'node.exe'),(Q/'approval/app-manifest.json','app-manifest.json')]:
        files.append({'source':normal(p),'destination':'C:\\Program Files\\AgentNexus\\'+dest,'sha256':digest(p),'bytes':p.stat().st_size})
    write('approval/installation-manifest.json', {'schema':'agentnexus.q1.candidate-installation-manifest.v1','status':'CANDIDATE_FILES_ONLY_NOT_INSTALLED','baseline_source_sha256':aggregate,'files':files,'actual_loaded_file_manifest_status':'NOT_RUN_SERVICE_ABSENT','not_included_and_blocking':['Trusted short-lived UI helper and protected launcher: not implemented in M1.8.3.','Complete pinned Electron runtime and its dependency closure: not selected for installation.','Approved external CMS signer public DER/pin and signed exact qualification plan: absent.'],'platform_runtime_paths_not_copied':[r'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe','Windows .NET Framework/GAC and OS-loaded modules: actual enumeration pending approved run']})
    cfg={'schema_version':1,'operator_sid':OPERATOR,'policy_epoch':1, 'service_sha256':digest(BASE/'bin/AgentNexusCredential.exe'),'client_sha256':digest(BASE/'bin/pipe-client.exe'),'node_sha256':digest(Path(r'D:\Nodejs\node.exe')),'engine_sha256':digest(SOURCE/'dist/src/agentnexus/credential-service/engine.js'),'application_manifest_sha256':digest(Q/'approval/app-manifest.json'),'authority_certificate_sha256':None,'qualification_test_approval_ref':'','real_import_enabled':False,'real_import_approval_ref':'','live_enabled':False,'live_approval_ref':''}
    write('approval/service-config.candidate.json',cfg)
    host=load(Q/'evidence/preflight-host-medium/preflight.json')
    plan=load(BASE/'source/native/credential-service/qualification.template.json')
    plan.update({'status':'BLOCKED','decision':'NOT_RUN','machine_id':host['machine_id_sha256'].get('value'),'service_sid':SID,'policy_epoch':1,'qualification_test_approval_ref':'','issued_at_utc':None,'expires_at_utc':None})
    for key in ['service_sha256','client_sha256','node_sha256','engine_sha256','application_manifest_sha256']: plan[key]=cfg[key]
    for test in plan['tests']: test['observed_result']='NOT_RUN';test['evidence_sha256']=None
    write('approval/qualification.candidate.UNSIGNED.json',plan)
    write('evidence/read-coverage.json', {'mode':'Baseline documents and relevant security implementation read in bounded full-text chunks; no claim of a new full independent source security audit', 'required_reports':[record(BASE/p) for p in ['README.md','acceptance-report.md','deployment-plan.json']]+[record(BASE/'reports'/p) for p in ['credential-vault-qualification.md','same-sid-root-cause.md','threat-model.md','credential-service-design.md','ipc-protocol.md','deployment-approval.md','deployment-runbook.md','independent-security-review.md','windows-attack-tests.md','same-sid-tests.md','different-sid-tests.md','crash-recovery.md','windows-service-design.md','ui-integration.md','token-ledger-owner.md','data-egress-qualification.md']], 'credential_service_files':[record(p) for f in ['native/credential-service','src/agentnexus/credential-service'] for p in walk(SOURCE/f)], 'related_implementations':[record(SOURCE/p) for p in ['desktop/main.mjs','desktop/preload.cjs','desktop/sender.mjs','desktop/renderer/app.js','src/agentnexus/desktop/service.ts','src/agentnexus/model-runtime/vault.ts','src/agentnexus/model-runtime/dpapi.ps1','src/agentnexus/model-runtime/ledger.ts','src/agentnexus/model-runtime/campaign.ts','src/agentnexus/model-runtime/egress.ts','src/agentnexus/model-runtime/request-review.ts','src/agentnexus/model-runtime/gateway.ts']]})
    print(json.dumps({'source_files':len(actual),'source_sha256':aggregate,'published_files_verified':len(sums),'protected_historical_files':len(snapshots),'candidate_install_files':len(files)},ensure_ascii=False))

def verify():
    initial=load(Q/'evidence/historical-preservation.before.json')
    changed=[]
    for x in initial['entries']:
        p=ROOT/x['path']
        if not p.exists() or digest(p)!=x['sha256']:changed.append(x['path'])
    now=git('rev-parse','HEAD')
    expected=load(Q/'evidence/git-baseline.json')['head']['stdout']
    write('evidence/historical-preservation.after.json',{'status':'PASS' if not changed and now['stdout']==expected else 'FAIL','checked_files':len(initial['entries']),'changed':changed,'head_unchanged':now['stdout']==expected,'head':now,'tracked_diff':git('diff','--name-status'),'staged_diff':git('diff','--cached','--name-status'),'initial_snapshot_sha256':digest(Q/'evidence/historical-preservation.before.json')})
    spec=importlib.util.spec_from_file_location('q1_govern',ROOT/'ai-workflow-kit-v4/tools/govern.py')
    gov=importlib.util.module_from_spec(spec);spec.loader.exec_module(gov)
    policy=load(ROOT/'.workflow-kit/governance/policy.json');baseline=load(ROOT/'.workflow-kit/governance/baseline.json')
    classifications=[]
    for p in walk(Q,{'__pycache__'}):
        rel=p.relative_to(ROOT).as_posix();gov.path_at(ROOT,rel);category=gov.classify(rel,policy,baseline)
        if category!='deliverable':raise ValueError('UNCLASSIFIED_Q1_FILE: '+rel)
        classifications.append({'path':rel,'category':category})
    task_rel='.workflow-kit/tasks/AgentNexus-M1.8.3-Q1/README.md'
    gov.path_at(ROOT,task_rel)
    if gov.classify(task_rel,policy,baseline)!='task':raise ValueError('UNCLASSIFIED_TASK_POINTER')
    classifications.append({'path':task_rel,'category':'task'})
    write('evidence/governance-delta.json',{'status':'PASS','method':'Unchanged govern.path_at + govern.classify for every Q1 artifact; full-root check recorded separately','files':classifications,'rules_unchanged':all(digest(ROOT/x['path'])==x['sha256'] for x in load(Q/'evidence/git-baseline.json')['rule_files'])})
    # No self-reference: checksum file is excluded explicitly.
    entries=[record(p,Q) for p in walk(Q,{'__pycache__'}) if p.name!='SHA256SUMS.txt']
    write('SHA256SUMS.txt',''.join(x['sha256']+'  '+x['path']+'\n' for x in sorted(entries,key=lambda x:x['path'])))
    print(json.dumps({'historical_preservation':'PASS' if not changed else 'FAIL','changed':changed,'head_unchanged':now['stdout']==expected,'q1_checksums':len(entries),'classification':'PASS'}))
    if changed or now['stdout']!=expected:raise ValueError('HISTORICAL_MUTATION')

if __name__=='__main__':
    {'inventory':inventory,'verify':verify}[sys.argv[1]]()
