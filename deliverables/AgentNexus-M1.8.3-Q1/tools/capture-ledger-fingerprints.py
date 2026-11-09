"""Hash only known historical database files; never connect to SQLite or decrypt."""
import datetime as dt
import hashlib
import json
from pathlib import Path

root=Path(r'\\?\I:\AI_AgentNexus')
q=root/'deliverables/AgentNexus-M1.8.3-Q1'
known=root/'.workflow-kit/runtime/AgentNexus-Model-Provider-UI/desktop-data'
rows=[]
for relative in ['host/kernel.sqlite','host/kernel.sqlite-wal','host/kernel.sqlite-shm','synthetic-vault/vault.sqlite','synthetic-vault/vault.sqlite-wal','synthetic-vault/vault.sqlite-shm']:
    p=known/relative
    r={'path':str(p).removeprefix('\\\\?\\'),'exists':p.exists()}
    try:
        if p.exists():
            before=p.stat()
            with p.open('rb') as f: sha=hashlib.file_digest(f,'sha256').hexdigest()
            after=p.stat()
            r.update({'sha256':sha,'bytes':before.st_size,'mtime_ns':before.st_mtime_ns,'stable_during_read':(before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns)})
        r['status']='READ_ONLY_FINGERPRINT_NOT_CONSISTENT_SQLITE_SNAPSHOT'
    except OSError as e:r.update({'status':'INCONCLUSIVE','error':str(e)})
    rows.append(r)
report={'schema':'agentnexus.q1.historical-runtime-file-observation.v1','checked_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'root_basis':'Default path from historical Provider UI main.mjs; actual process environment/root not read or assumed','sqlite_connection_opened':False,'db_checkpoint_backup_or_write':False,'vault_decrypted':False,'current_budget_contents_read':False,'files':rows,'limitations':['Already-running historical UI may legitimately modify these live files.','Separate file hashes are not a consistent snapshot and cannot prove global budget uniqueness.','Published immutable baseline preservation is recorded separately.']}
dest=q/'evidence/original-ledger-files.json'
if dest.exists():raise RuntimeError('NO_EVIDENCE_OVERWRITE')
dest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(rows),'sqlite_connections':0,'writes_to_historical_paths':0}))
