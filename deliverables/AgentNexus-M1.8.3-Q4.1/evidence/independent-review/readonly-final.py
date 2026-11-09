"""Independent read-only checks of the final build; no Apply or signing path."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

DEST = Path(__file__).resolve().parent
BASE = DEST.parents[1]
pwsh = shutil.which('pwsh')

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

rows = []
commands = [
    ('default-installer-final', [pwsh, '-NoProfile', '-File', str(BASE / 'source/tools/agentnexus/install-q41-qualification.ps1'), '-BundleRoot', str(BASE)], 0),
    ('unsigned-verifier-final', [str(BASE / 'signer/AgentNexus.Qualification.Verifier.exe'), '--verify', str(BASE), '0' * 64], 21),
]
for name, command, expected in commands:
    process = subprocess.run(command, capture_output=True, timeout=90, creationflags=subprocess.CREATE_NO_WINDOW)
    (DEST / (name + '.stdout.log')).write_bytes(process.stdout)
    (DEST / (name + '.stderr.log')).write_bytes(process.stderr)
    rows.append({'name': name, 'command': command, 'exit_code': process.returncode, 'expected_exit': expected, 'status': 'PASS' if process.returncode == expected else 'FAIL', 'stdout_sha256': sha(DEST / (name + '.stdout.log')), 'stderr_sha256': sha(DEST / (name + '.stderr.log'))})
installer = json.loads((DEST / 'default-installer-final.stdout.log').read_bytes())
assert installer['status'] == 'UNSIGNED_CANDIDATE_INSPECTED_NO_GO' and installer['system_changes'] is False and installer['approved'] is False

paths = sorted(p for root in ['payload', 'signer'] for p in (BASE / root).rglob('*') if p.is_file() and p.suffix.lower() in ['.exe', '.dll'])
quoted = ','.join("'" + str(p).replace("'", "''") + "'" for p in paths)
command = "$ErrorActionPreference='Stop'; @(" + quoted + ") | ForEach-Object { $s=Get-AuthenticodeSignature -LiteralPath $_; [ordered]@{path=$_;sha256=(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant();status=$s.Status.ToString();cms_grants_authenticode=$false} } | ConvertTo-Json -Depth 6"
process = subprocess.run([pwsh, '-NoProfile', '-Command', command], capture_output=True, timeout=90, creationflags=subprocess.CREATE_NO_WINDOW)
(DEST / 'authenticode-final.stdout.log').write_bytes(process.stdout)
(DEST / 'authenticode-final.stderr.log').write_bytes(process.stderr)
signatures = json.loads(process.stdout)
assert all(sha(Path(row['path'])) == row['sha256'] for row in signatures)
assert process.returncode == 0 and not process.stderr
rows.append({'name': 'authenticode-final-public-file-inspection', 'exit_code': process.returncode, 'status': 'PASS', 'file_count': len(signatures), 'stdout_sha256': sha(DEST / 'authenticode-final.stdout.log'), 'stderr_sha256': sha(DEST / 'authenticode-final.stderr.log')})
record = {'schema': 'agentnexus.q41.independent-readonly-final.v1', 'observed_at_utc': dt.datetime.now(dt.timezone.utc).isoformat(), 'status': 'PASS' if all(row['status'] == 'PASS' for row in rows) else 'FAIL', 'checks': rows, 'inspected_signature_status_counts': {status: sum(row['status'] == status for row in signatures) for status in sorted({row['status'] for row in signatures})}, 'actual_apply': 'NOT_RUN', 'actual_user_signing': 'NOT_RUN', 'os_qualification': 'NOT_RUN', 'system_changes': False, 'current_manifest_sha256': sha(BASE / 'approval/installation-manifest.json')}
(DEST / 'readonly-final.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print(json.dumps({key: record[key] for key in ['status', 'current_manifest_sha256', 'inspected_signature_status_counts']}))
