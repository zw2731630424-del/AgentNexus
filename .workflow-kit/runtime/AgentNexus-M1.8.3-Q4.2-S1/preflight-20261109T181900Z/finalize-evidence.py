"""Run the existing full governance check and seal only new S1 evidence."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path('I:/AI_AgentNexus')
RUN = Path(__file__).resolve().parent
BASE = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4.2'
OUT = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4.2-S1'
TASK = ROOT / '.workflow-kit/tasks/AgentNexus-M1.8.3-Q4.2-S1'
WRAPPER = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/govern-cached.py'

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def put(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

def new(path):
    if path.exists():
        # Resume only this run's empty, unpublished placeholders. Raw logs are preserved separately.
        assert path.read_bytes().strip() in (b'', b'{}')
        return
    with path.open('x', encoding='utf-8') as stream:
        stream.write('{}\n' if path.suffix == '.json' else '')

govern_result = OUT / 'governance-result.json'
final_result = TASK / 'task.json'
runtime_sums = RUN / 'SHA256SUMS'
task_sums = TASK / 'checksums.txt'
output_sums = OUT / 'SHA256SUMS'
for path in [govern_result, final_result, runtime_sums, task_sums, output_sums]:
    new(path)
expected_wrapper = json.loads((BASE / 'evidence/governance-result.json').read_bytes())['wrapper_sha256']
assert sha(WRAPPER) == expected_wrapper
protected = {str(ROOT / r['path']): sha(ROOT / r['path']) for r in json.loads((BASE / 'evidence/baseline.json').read_bytes())['protected']}
protected[str(ROOT / '.workflow-kit/governance/baseline.json')] = sha(ROOT / '.workflow-kit/governance/baseline.json')

# Rehash historical/frozen closures at the end without editing their manifests.
closure_results = []
for name in ['AgentNexus-M1.8.3-Q3','AgentNexus-M1.8.3-Q4','AgentNexus-M1.8.3-Q4.1','AgentNexus-M1.8.3-Q4.2']:
    record = json.loads((RUN / (name + '.closure.json')).read_bytes())
    base = Path(record['base'])
    assert sha(base / 'SHA256SUMS') == record['sha256sums_sha256']
    current = {p.relative_to(base).as_posix() for p in base.rglob('*') if p.is_file() and p != base / 'SHA256SUMS'}
    assert current == {r['path'] for r in record['files']}
    assert all(sha(base / r['path']) == r['actual_sha256'] for r in record['files'])
    closure_results.append(dict(bundle=name, listed_files=record['listed_files'], status='UNCHANGED_PASS'))
put(RUN / 'preservation-after.json', dict(status='PASS', bundles=closure_results))

# Original governor, original reviewed metadata-cache wrapper, no policy/baseline changes.
with (RUN / 'govern.stdout.log').open('xb') as stdout, (RUN / 'govern.stderr.log').open('xb') as stderr:
    child = subprocess.run([sys.executable, '-B', str(WRAPPER)], cwd=ROOT, stdout=stdout, stderr=stderr,
                           creationflags=subprocess.CREATE_NO_WINDOW, timeout=1200)
lines = (RUN / 'govern.stdout.log').read_text('utf-8', errors='replace').splitlines()
try:
    metrics = json.loads(lines[-1])
except (ValueError, IndexError):
    metrics = None
govern_ok = child.returncode == 0 and metrics is not None and metrics['unchanged_governor_exit'] == 0 and metrics['fresh_revalidation_changes'] == []
rules_unchanged = all(sha(Path(name)) == digest for name, digest in protected.items())
governance = dict(status='PASS' if govern_ok and rules_unchanged else 'FAIL', exit_code=child.returncode,
                  wrapper=str(WRAPPER), wrapper_sha256=sha(WRAPPER), governor_sha256=sha(ROOT / 'ai-workflow-kit-v4/tools/govern.py'),
                  raw_stdout=str(RUN / 'govern.stdout.log'), raw_stderr=str(RUN / 'govern.stderr.log'),
                  stdout_sha256=sha(RUN / 'govern.stdout.log'), stderr_sha256=sha(RUN / 'govern.stderr.log'),
                  metrics=metrics, rules_policy_baseline_unchanged=rules_unchanged,
                  limitation='Existing frozen-topology metadata memoization with fresh type/device/inode/attributes checks; not general concurrency equivalence or OS isolation proof.')
put(govern_result, governance)

with (RUN / 'git-status-after.stdout.log').open('xb') as stdout, (RUN / 'git-status-after.stderr.log').open('xb') as stderr:
    status = subprocess.run(['git','--no-optional-locks','status','--porcelain=v1','--untracked-files=normal'], cwd=ROOT,
                            stdout=stdout, stderr=stderr, creationflags=subprocess.CREATE_NO_WINDOW, timeout=180)
head = subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()
before = json.loads((RUN / 'preflight-result.json').read_bytes())
assert head == before['head'] and rules_unchanged
tracked = subprocess.run(['git','diff','--quiet'], cwd=ROOT, creationflags=subprocess.CREATE_NO_WINDOW)
staged = subprocess.run(['git','diff','--cached','--quiet'], cwd=ROOT, creationflags=subprocess.CREATE_NO_WINDOW)
assert tracked.returncode == 0 and staged.returncode == 0
for target in re.findall(r'\]\(([^)]+)\)', (TASK / 'README.md').read_text('utf-8')):
    if '://' not in target:
        assert (TASK / target).exists(), target
handoff = json.loads((OUT / 'offline-handoff.json').read_bytes())
assert sha(Path(handoff['archive'])) == handoff['archive_sha256']
put(final_result, dict(schema='agentnexus.q42-s1.task.v1', status='WAITING_USER_INDEPENDENT_TPM_CNG_PUBLIC_INPUTS',
                      readonly_preflight='PASS_WITH_HISTORICAL_HEAD_GUARD_MISMATCH', historical_checker_exit=1,
                      historical_checker_errors=['head-changed'], governance=governance['status'],
                      head=head, existing_tracked_files_unchanged=True, git_status_exit=status.returncode,
                      existing_rules_and_frozen_deliveries_unchanged=True,
                      handoff=handoff, selected_environment='USER_CONTROLLED_SEPARATE_WINDOWS_DEVICE_AGENT_INACCESSIBLE',
                      selected_method='TPM_CNG', software_fallback_allowed=False,
                      actual_certificate='NOT_RUN', actual_pin=None, actual_candidate='NOT_RUN',
                      qualification_plan_signing='NOT_RUN', deployment_approval_signing='NOT_RUN',
                      target_signed_verification='NOT_RUN', final_precise_deployment_application='NOT_RUN',
                      installation_approved=False, service_installed=False, service_started=False,
                      os_qualification={'PASS':0,'NOT_RUN':70}, production_vault='BLOCKED',
                      real_api_keys_imported=0, real_provider_requests=0, private_key_accessed=False,
                      system_changes=False, commit_or_push=False, existing_combined_token_limit=100000000,
                      next_action='User verifies toolkit on independent device, separately authorizes/runs existing TPM_CNG script, and returns only public DER/metadata, independently confirmed complete pin, environment observations and target confirmation.',
                      completed_at_utc=dt.datetime.now(dt.timezone.utc).isoformat()))
for base, sums in [(RUN,runtime_sums),(TASK,task_sums),(OUT,output_sums)]:
    paths = sorted(p for p in base.rglob('*') if p.is_file() and p != sums)
    sums.write_text(''.join(sha(p)+'  '+p.relative_to(base).as_posix()+'\n' for p in paths), encoding='utf-8', newline='\n')
    for line in sums.read_text('utf-8').splitlines():
        digest, rel = line.split('  ',1)
        assert sha(base / rel) == digest
print(json.dumps(dict(status='READY_FOR_USER_CERTIFICATE_OPERATION' if govern_ok else 'GOVERNANCE_FAILED',
                      governance=governance, preserved=closure_results, head=head,
                      handoff_sha256=handoff['archive_sha256'], task_record=str(final_result), system_changes=False)), flush=True)
raise SystemExit(0 if govern_ok and rules_unchanged else 1)
