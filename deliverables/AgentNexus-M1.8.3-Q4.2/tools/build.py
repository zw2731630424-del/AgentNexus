"""Offline native compilation; no normal Helper/Launcher/Signer execution."""
import datetime as dt
import json
from pathlib import Path
import subprocess
import sys
import re
from baseline import ROOT, OUT, sha, write

SRC = OUT / 'source'
RUN = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8.3-Q4.2' / ('build-' + dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
RUN.mkdir(parents=True, exist_ok=False)
CSC = Path('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe')
common = SRC / 'native/credential-service/Common.cs'
contracts = SRC / 'native/qualification-signer/SigningContracts.cs'
opts = ['/nologo', '/target:exe', '/platform:x64', '/optimize+', '/warn:4', '/warnaserror+', '/langversion:5',
        '/r:System.Core.dll', '/r:System.ServiceProcess.dll', '/r:System.Security.dll', '/r:System.Web.Extensions.dll']
builds = [
    ('service', 'ServiceProgram', 'AgentNexusCredential.exe', ['credential-service/CredentialService.cs', 'credential-service/DailyRuntime.cs'], []),
    ('client', 'ClientProgram', 'pipe-client.exe', ['credential-service/PipeClient.cs'], []),
    ('helper', 'TrustedHelperProgram', 'trusted-credential-helper.exe', ['credential-helper/' + n for n in ['HelperIntent.cs', 'HelperProtocol.cs', 'HelperObjectSecurity.cs', 'TrustedCredentialHelper.cs', 'HelperTests.cs']], ['/target:winexe', '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll', '/win32manifest:' + str(SRC / 'native/credential-helper/helper.manifest')]),
    ('launcher', 'LauncherProgram', 'credential-launcher.exe', ['credential-launcher/CredentialLauncher.cs'], ['/win32manifest:' + str(SRC / 'native/credential-launcher/launcher.manifest')]),
    ('verifier', 'VerifierProgram', 'AgentNexus.Qualification.Verifier.exe', ['qualification-signer/Verifier.cs'], []),
    ('signer', 'SignerProgram', 'AgentNexus.Qualification.Signer.exe', ['qualification-signer/QualificationSigner.cs'], ['/target:winexe', '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll']),
]
stages = []
for name, entry, filename, sources, extra in builds:
    target = OUT / ('signer' if name in ['verifier', 'signer'] else 'payload') / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    cmd = [str(CSC), *opts, *extra, '/out:' + str(target), '/main:AgentNexus.CredentialBoundary.' + entry, str(common), str(contracts), *[str(SRC / 'native' / n) for n in sources]]
    child = subprocess.run(cmd, capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW, timeout=90)
    (RUN / (name + '.stdout.log')).write_bytes(child.stdout)
    (RUN / (name + '.stderr.log')).write_bytes(child.stderr)
    row = {'name': name, 'command': cmd, 'exit_code': child.returncode, 'stdout_sha256': sha(RUN / (name + '.stdout.log')), 'stderr_sha256': sha(RUN / (name + '.stderr.log'))}
    stages.append(row)
    write(RUN / 'stages.json', stages)
    print(json.dumps({'build': name, 'exit_code': child.returncode}), flush=True)
    if child.returncode:
        print(child.stdout.decode('gbk', 'replace'), child.stderr.decode('gbk', 'replace'))
        sys.exit(child.returncode)
    row['binary_sha256'] = sha(target)
    if name in ['service', 'client', 'helper', 'launcher']:
        test = subprocess.run([str(target), '--self-test'], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW, timeout=90)
        (RUN / (name + '.self-test.stdout.log')).write_bytes(test.stdout)
        (RUN / (name + '.self-test.stderr.log')).write_bytes(test.stderr)
        if test.returncode or test.stderr:
            print(test.stdout, test.stderr); sys.exit(1)
        row['pure_self_test'] = json.loads(test.stdout)
for rel, variable, binary in [('source/tools/agentnexus/install-q41-qualification.ps1', 'ExpectedVerifierSha256', 'signer/AgentNexus.Qualification.Verifier.exe'), ('source/native/qualification-signer/user-create-certificate.ps1', 'ExpectedSignerSha256', 'signer/AgentNexus.Qualification.Signer.exe')]:
    path = OUT / rel
    text, count = re.subn(r'\$' + variable + r" = '[^']+'", '$' + variable + " = '" + sha(OUT / binary) + "'", path.read_text('utf-8'))
    assert count == 1
    path.write_text(text, encoding='utf-8', newline='\n')
write(OUT / 'evidence/build.json', {'status': 'PASS', 'run': str(RUN), 'stages': stages, 'system_changes': False, 'os_qualification': 'NOT_RUN'})
print(str(RUN))
