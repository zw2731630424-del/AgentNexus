"""Public-data preparation simulation. Uses an existing disposed-key SIMULATED DER only.
No certificate/key creation, store access, signature generation, installation or real authorization.
"""
import ctypes
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import uuid
from baseline import ROOT,OUT,sha,write
from freeze import prepare,inspect_public
from local_files import PublicFiles,local,K,c

run=ROOT/'.workflow-kit/runtime/AgentNexus-M1.8.3-Q4.2'/('preparation-tests-'+dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
run.mkdir(parents=True)
previous=json.loads((OUT/'evidence/signing-tests.json').read_bytes())
fixtures=Path(previous['run'])
metadata=json.loads((fixtures/'SIMULATED-public-metadata.json').read_bytes())
der=fixtures/'SIMULATED-local-public.cer'
pin=metadata['local']['pin']
identity=json.loads(subprocess.check_output([str(OUT/'signer/AgentNexus.Qualification.Verifier.exe'),'--identity'],creationflags=subprocess.CREATE_NO_WINDOW))
write(run/'target-identity.json',identity)
cases=[]
def passed(name,detail): cases.append({'id':name,'status':'PASS','assurance':'SIMULATED_PUBLIC_DATA_OR_FILESYSTEM','detail':detail})
for value in [r'\\invalid.example\share\x',r'\\?\C:\x','C:relative',r'C:\x:stream']:
    try: local(value)
    except ValueError as error: passed('path-'+str(len(cases)),str(error))
    else: raise AssertionError('NONLOCAL_PATH_ACCEPTED')
with PublicFiles() as files:
    root=run/'public-output';files.create_root(root)
    handle=K.CreateFileW(str(root),2,7,None,3,0x02200000,None)
    assert handle==c.c_void_p(-1).value and c.get_last_error()==32
    passed('empty-directory-write-denied','Win32 sharing violation 32 while pinned')
    files.write(root/'nested/data.json',b'{"public":true}');files.check()
    try: (root/'nested/data.json').write_bytes(b'attacker')
    except OSError: passed('output-overwrite-denied','held CreateNew read/write handle shares read only')
    else: raise AssertionError('WRITE_NOT_DENIED')
    try: root.rename(run/'renamed')
    except OSError: passed('output-rename-denied','pinned directory identity')
    else: raise AssertionError('RENAME_NOT_DENIED')
with PublicFiles() as files:
    root=run/'extra-output';files.create_root(root);files.write(root/'public.json',b'{}')
    (root/'extra').mkdir()
    try: files.check()
    except ValueError as error: assert str(error)=='OUTPUT_EXTRA_DIRECTORY';passed('extra-directory-denied',str(error))
    else: raise AssertionError('EXTRA_DIRECTORY_ACCEPTED')
verifier=(OUT/'signer/AgentNexus.Qualification.Verifier.exe').read_bytes()
public=inspect_public(verifier,der.read_bytes(),pin)
assert public['metadata']['der_sha256']==pin and public['description']['signature_policy']['policy_epoch']==5
passed('shared-contract-public-snapshot','exact byte[] verifier and DER; no path execution or store')
try: inspect_public(verifier,(fixtures/'SIMULATED-keyless-pkcs12.bin').read_bytes(),pin)
except ValueError as error: assert 'PUBLIC_DER_ONLY_NO_PFX' in str(error);passed('prepare-public-pkcs12-denied','shared PublicCertificate gate')
else: raise AssertionError('PKCS12_ACCEPTED')
try: prepare(str(der),'0'*63,str(run/'target-identity.json'),str(run/'invalid-pin-output'))
except ValueError as error: assert str(error)=='INDEPENDENT_DER_SHA256_PIN_REQUIRED';passed('invalid-pin-before-output','no directory created')
else: raise AssertionError('BAD_PIN_ACCEPTED')
assert not (run/'invalid-pin-output').exists()
destination=run/'SIMULATED-194-files-NOT-USER-AUTHORITY'
result=prepare(str(der),pin,str(run/'target-identity.json'),str(destination))
write(run/'simulation-context.json',{'assurance':'SIMULATED','actual_user_certificate_selected':False,'actual_user_pin_verified':False,'private_key_available':False,'production_or_installation_authority':False})
assert result['files']==194 and result['epoch']==5 and not result['installation_approved']
manifest=json.loads((destination/'approval/installation-manifest.json').read_bytes())
for row in manifest['files']:
    assert sha(destination/'payload'/row['path'])==row['sha256'] and (destination/'payload'/row['path']).stat().st_size==row['bytes']
for line in (destination/'SHA256SUMS').read_text('utf-8').splitlines():
    digest,relative=line.split('  ',1);assert sha(destination/relative)==digest
assert not (destination/'preparation-INCOMPLETE.json').exists()
assert (destination/'preparation-complete.json').is_file()
passed('prepare-194-new-unsigned','all payload bytes and complete new SHA256SUMS match; no signatures')
child=subprocess.run([str(OUT/'signer/AgentNexus.Qualification.Verifier.exe'),'--inspect',str(destination)],capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=90)
(run/'inspect.stdout.log').write_bytes(child.stdout);(run/'inspect.stderr.log').write_bytes(child.stderr)
assert child.returncode==0 and json.loads(child.stdout)['status']=='UNSIGNED_CANDIDATE_INSPECTED_NO_GO'
passed('native-candidate-contract','actual prepared 194-file snapshot accepted only as UNSIGNED / NO-GO')
child=subprocess.run([str(OUT/'signer/AgentNexus.Qualification.Verifier.exe'),'--verify',str(destination),pin],capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=90)
(run/'verify-unsigned.stdout.log').write_bytes(child.stdout);(run/'verify-unsigned.stderr.log').write_bytes(child.stderr)
assert child.returncode==21
passed('unsigned-cannot-be-signed-verified','missing plan confirmation/CMS refuses actual signed verification')
summary={'status':'PASS','run':str(run),'assurance':'SIMULATED_PUBLIC_PREPARATION_ONLY','cases':cases,'tests':len(cases),'payload_files':194,'payload_bytes':sum(r['bytes'] for r in manifest['files']),'actual_user_certificate_selected':False,'actual_user_pin_verified':False,'actual_cng_signature':'NOT_RUN','certificate_store_modified':False,'private_key_opened':False,'installation_approved':False,'system_changes':False}
write(run/'result.json',summary);write(OUT/'evidence/preparation-tests.json',summary)
archive=OUT/'evidence/preparation-tests'/run.name;archive.mkdir(parents=True)
for path in run.iterdir():
    if path.is_file(): (archive/path.name).write_bytes(path.read_bytes())
write(archive/'prepared-public-file-manifest.json',{'assurance':'SIMULATED','source_run':str(destination),'files':[{'path':p.relative_to(destination).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(destination.rglob('*')) if p.is_file()]})
print(json.dumps({'status':'PASS','tests':len(cases),'payload_files':194,'run':str(run)}),flush=True)
