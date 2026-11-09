"""Final delta audit: public snapshots, existing unsigned preparation, and new pure-FS probes only."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys

BASE=Path(__file__).resolve().parents[2]
AUDIT=Path(__file__).resolve().parent
RUN=AUDIT/('delta-'+dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
RUN.mkdir(exist_ok=False)
sys.path.insert(0,str(BASE/'tools'))
from local_files import PublicFiles,local,K,c
from freeze import inspect_public

def sha(path):
    with Path(path).open('rb') as stream: return hashlib.file_digest(stream,'sha256').hexdigest()
def save(path,data): Path(path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
checks=[]
def check(name,condition,details):
    checks.append({'id':name,'status':'PASS' if condition else 'FAIL','details':details})
    save(RUN/'checks-in-progress.json',checks)
    if not condition: raise AssertionError(name)

targets_path=BASE/'evidence/review-targets.json'
targets_hash=sha(targets_path)
targets=json.loads(targets_path.read_bytes())
before=[{**item,'actual_sha256':sha(BASE/item['path']),'match':sha(BASE/item['path'])==item['sha256']} for item in targets['files']]
check('final-19-targets-before',len(before)==19 and all(x['match'] for x in before),before)
summary=json.loads((BASE/'evidence/signing-tests.json').read_bytes())
fixtures=Path(summary['run'])
der=fixtures/'SIMULATED-local-public.cer'
metadata=json.loads((fixtures/'SIMULATED-public-metadata.json').read_bytes())
pin=metadata['local']['pin']
for value in [r'\\invalid.example\share\x',r'\\?\C:\x','C:relative',r'C:\x:stream']:
    try: local(value)
    except ValueError as error: check('preparation-path-rejected-'+str(len(checks)),str(error)=='LOCAL_ABSOLUTE_PATH_REQUIRED',str(error))
    else: check('preparation-path-unexpectedly-accepted',False,value)

with PublicFiles() as files:
    root=RUN/'public-files-output'; files.create_root(root)
    handle=K.CreateFileW(str(root),2,7,None,3,0x02200000,None)
    error=c.get_last_error()
    if handle!=c.c_void_p(-1).value: K.CloseHandle(handle)
    check('final-python-empty-directory-writer-denied',handle==c.c_void_p(-1).value and error==32,{'win32_error':error})
    files.write(root/'nested/public.json',b'{"public":true}')
    denied=False
    try: (root/'nested/public.json').write_bytes(b'attacker')
    except OSError: denied=True
    check('final-python-output-overwrite-denied',denied,'Held CREATE_NEW read/write file handle shares Read only')
    denied=False
    try: root.rename(RUN/'renamed-output')
    except OSError: denied=True
    check('final-python-output-rename-denied',denied,'Pinned output directory and ancestors')
    files.check()
    check('final-python-output-readback',True,{'sha256':files.digest(root/'nested/public.json')})

with PublicFiles() as files:
    root=RUN/'extra-directory-output';files.create_root(root);files.write(root/'public.json',b'{}')
    (root/'extra').mkdir()
    denied=False
    try: files.check()
    except ValueError as error: denied=str(error)=='OUTPUT_EXTRA_DIRECTORY'
    check('final-python-extra-directory-denied',denied,'OUTPUT_EXTRA_DIRECTORY')

with PublicFiles() as files:
    verifier_bytes=files.read(BASE/'signer/AgentNexus.Qualification.Verifier.exe')
    der_bytes=files.read(der,131072)
    public=inspect_public(verifier_bytes,der_bytes,pin)
    check('final-preparation-shared-public-certificate',public['metadata']['der_sha256']==pin and public['description']['signature_policy']['policy_epoch']==5,{'metadata':public['metadata'],'verifier_sha256':hashlib.sha256(verifier_bytes).hexdigest()})
    denied=False
    try: inspect_public(verifier_bytes,files.read(fixtures/'SIMULATED-keyless-pkcs12.bin'),pin)
    except ValueError as error: denied='PUBLIC_DER_ONLY_NO_PFX' in str(error)
    check('final-preparation-keyless-pkcs12-rejected-before-construction',denied,'Existing keyless PKCS12 fixture only; no private keys or certificate-store writes')

prep_path=BASE/'evidence/preparation-tests.json'
prep=json.loads(prep_path.read_bytes())
prep_run=Path(prep['run'])
archive=BASE/'evidence/preparation-tests'/prep_run.name
prepared_manifest=json.loads((archive/'prepared-public-file-manifest.json').read_bytes())
prepared=Path(prepared_manifest['source_run'])
rows=[]
for item in prepared_manifest['files']:
    path=prepared/item['path']
    rows.append({'path':item['path'],'match':path.stat().st_size==item['bytes'] and sha(path)==item['sha256']})
check('existing-prepared-public-file-manifest',all(x['match'] for x in rows),{'files':len(rows),'source':str(prepared)})
save(RUN/'prepared-file-integrity.json',rows)
raw_rows=[]
for path in archive.iterdir():
    if path.is_file() and path.name!='prepared-public-file-manifest.json':
        original=prep_run/path.name
        raw_rows.append({'path':path.name,'match':original.is_file() and sha(path)==sha(original)})
check('preparation-raw-copy-integrity',all(x['match'] for x in raw_rows),raw_rows)
check('preparation-14-summary',prep['tests']==14 and len(prep['cases'])==14 and all(x['status']=='PASS' for x in prep['cases']) and prep==json.loads((prep_run/'result.json').read_bytes()),{'tests':prep['tests'],'summary_sha256':sha(prep_path)})
payload=json.loads((prepared/'approval/installation-manifest.json').read_bytes())
check('prepared-194-file-byte-totals',len(payload['files'])==194 and sum(x['bytes'] for x in payload['files'])==468592646,{'files':len(payload['files']),'bytes':sum(x['bytes'] for x in payload['files'])})
checksum_rows=[]
for line in (prepared/'SHA256SUMS').read_text('utf-8').splitlines():
    digest,relative=line.split('  ',1)
    checksum_rows.append({'path':relative,'match':sha(prepared/relative)==digest})
actual={p.relative_to(prepared).as_posix() for p in prepared.rglob('*') if p.is_file() and p.name!='SHA256SUMS'}
check('prepared-complete-checksum-file-set',all(x['match'] for x in checksum_rows) and actual=={x['path'] for x in checksum_rows} and not (prepared/'preparation-INCOMPLETE.json').exists(),{'files':len(checksum_rows),'complete_marker':(prepared/'preparation-complete.json').is_file()})
save(RUN/'prepared-checksum-integrity.json',checksum_rows)

verifier=BASE/'signer/AgentNexus.Qualification.Verifier.exe'
for name,args,expected in [('inspect-prepared',['--inspect',str(prepared)],0),('verify-prepared-unsigned',['--verify',str(prepared),pin],21)]:
    child=subprocess.run([str(verifier),*args],capture_output=True,timeout=50,creationflags=subprocess.CREATE_NO_WINDOW)
    (RUN/(name+'.stdout.log')).write_bytes(child.stdout);(RUN/(name+'.stderr.log')).write_bytes(child.stderr)
    good=child.returncode==expected
    if expected==0: good=good and json.loads(child.stdout)['status']=='UNSIGNED_CANDIDATE_INSPECTED_NO_GO' and not child.stderr
    else: good=good and b'USER_CONFIRMATION_REQUIRED' in child.stderr
    check(name,good,{'exit':child.returncode,'expected':expected,'stdout_sha256':hashlib.sha256(child.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(child.stderr).hexdigest()})

# Execute only extracted public bootstrap/provider-selection expressions; never execute the certificate script.
child=subprocess.run(['C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe','-NoProfile','-File',str(AUDIT/'verify-public-script-boundaries.ps1'),'-BundleRoot',str(BASE),'-LogRoot',str(RUN)],capture_output=True,timeout=50,creationflags=subprocess.CREATE_NO_WINDOW)
(RUN/'public-script-boundaries.stdout.log').write_bytes(child.stdout);(RUN/'public-script-boundaries.stderr.log').write_bytes(child.stderr)
check('public-script-boundaries',child.returncode==0 and not child.stderr,{'exit':child.returncode,'stdout_sha256':hashlib.sha256(child.stdout).hexdigest(),'stderr_sha256':hashlib.sha256(child.stderr).hexdigest()})
after=[{'path':item['path'],'expected_sha256':item['sha256'],'actual_sha256':sha(BASE/item['path']),'match':sha(BASE/item['path'])==item['sha256']} for item in targets['files']]
check('final-19-targets-after',all(x['match'] for x in after) and sha(targets_path)==targets_hash,after)
result={'status':'PASS','run':str(RUN),'review_targets_sha256':targets_hash,'checks':checks,'prepared_public_files_checked':len(rows),'prepared_checksum_files_checked':len(checksum_rows),'new_signatures_created':False,'user_key_access':False,'certificate_store_access':False,'creation_script_executed':False,'real_cng_gui_os_deployment':'NOT_RUN'}
save(RUN/'result.json',result)
print(json.dumps({'status':'PASS','run':str(RUN),'checks':len(checks),'prepared_files':len(rows)}))
