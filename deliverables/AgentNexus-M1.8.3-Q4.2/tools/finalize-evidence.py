"""Archive existing public logs and freeze Q4.2 source/staging. Never freeze a user candidate."""
import datetime as dt
import difflib
import json
from pathlib import Path
import shutil
import zipfile
from baseline import ROOT,OUT,Q41,sha,write

runtime=ROOT/'.workflow-kit/runtime/AgentNexus-M1.8.3-Q4.2'
index=[]
for run in sorted(runtime.iterdir()):
    if not run.is_dir(): continue
    files=[p for p in run.iterdir() if p.is_file() and p.suffix.lower()!='.exe']
    rows=[]
    for path in files:
        destination=OUT/'evidence/run-history'/run.name/path.name
        destination.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(path,destination)
        rows.append({'path':path.name,'bytes':path.stat().st_size,'sha256':sha(path)})
    index.append({'run':str(run),'public_top_level_files':rows,'note':'Nested synthetic data remains in runtime and/or the per-run archived public fixtures; this index is not an OS qualification.'})
write(OUT/'evidence/run-history.json',{'runs':index,'private_keys_or_user_credentials_archived':False})
source=[{'path':p.relative_to(OUT/'source').as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted((OUT/'source').rglob('*')) if p.is_file()]
write(OUT/'source-manifest.json',{'schema':'agentnexus.q42.source-manifest.v1','files':source})
with zipfile.ZipFile(OUT/'AgentNexus-M1.8.3-Q4.2-source.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for row in source: archive.write(OUT/'source'/row['path'],row['path'])
old={p.relative_to(Q41/'source').as_posix():p for p in (Q41/'source').rglob('*') if p.is_file()}
changes=[];patch=[]
for row in source:
    previous=old.pop(row['path'],None)
    if previous is None or sha(previous)!=row['sha256']:
        changes.append({'path':row['path'],'before_sha256':sha(previous) if previous else None,'after_sha256':row['sha256']})
        before=previous.read_text('utf-8').splitlines(keepends=True) if previous else []
        after=(OUT/'source'/row['path']).read_text('utf-8').splitlines(keepends=True)
        patch.extend(difflib.unified_diff(before,after,fromfile='Q4.1/'+row['path'],tofile='Q4.2/'+row['path']))
assert not old
write(OUT/'source-changes.json',{'baseline':'AgentNexus-M1.8.3-Q4.1','source_files':len(source),'changed_files':changes})
(OUT/'source-changes.patch').write_text(''.join(patch),encoding='utf-8')
payload=[{'path':p.relative_to(OUT/'payload').as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted((OUT/'payload').rglob('*')) if p.is_file()]
assert len(payload)==194
write(OUT/'payload-staging-manifest.json',{'status':'STAGING_ONLY_NOT_A_SIGNABLE_INSTALLATION_MANIFEST','files':payload,'payload_files':194,'payload_bytes':sum(r['bytes'] for r in payload),'user_certificate_selected':False,'final_candidate_frozen':False,'note':'launcher-plan retains historical unsigned values here; prepare replaces it only after independent public certificate/pin and target identity are provided.'})
write(OUT/'evidence/observed-tool-failures.json',{'source':'Tool-returned diagnostic text; original build/test raw logs are separately archived','items':[
    {'action':'govern.py new with ordinary Windows path','exit_code':1,'failure':'WinError 3 in an existing long historical runtime path; no rule or baseline change','resolution':'Use previously reviewed unchanged full-check wrapper with extended-length root and stat memoization; independently verify final history and all hashes.'},
    {'action':'initial signer build','failure':'CS0117: .NET Framework CmsSigner has no PrivateKey setter','resolution':'Use Framework certificate association, hold inspected CNG handle, revalidate policy/public key and resulting CMS; no claim of same-handle signing.'},
    {'action':'directory attributes-only sharing test','failure':'102-case run: 101 PASS / 1 FAIL; write handle was still allowed with attributes-only directory access','resolution':'FILE_LIST_DIRECTORY|READ_ATTRIBUTES (0x81), share READ only; actual controlled writer denied error 32.'},
    {'action':'read-only public writer reflection','failure':'Constructor on AtomicOutput not found through Activator overload','resolution':'Explicit GetConstructor(Type[string])/Invoke; tested with public-only output in PowerShell 5 and pwsh.'},
    {'action':'read-only invalid-argument exit collection','failure':'READ_ONLY_ENTRY_CONTRACT_FAILED: GUI launch did not update LASTEXITCODE synchronously','resolution':'Use ProcessStartInfo/WaitForExit and process ExitCode; auto-signing arguments actually reject 21.'},
    {'action':'early source-binding shell command','exit_code':1,'failure':'Empty tool output from a quoted Python command; no successful mutation recorded','resolution':'Use literal PowerShell here-string for Python; source hashes subsequently verified.'}
]})
print(json.dumps({'source_files':len(source),'source_changes':len(changes),'staging_files':194,'staging_bytes':sum(r['bytes'] for r in payload),'run_directories':len(index),'candidate_created':False}))
