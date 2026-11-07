"""M0 bounded synthetic SQLite/filesystem feasibility probes, not AgentNexus runtime."""
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import threading

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'storage-probe'
OUT.mkdir(exist_ok=True)
DB = OUT / 'feasibility.sqlite'
if DB.exists():
    raise SystemExit('Probe requires fresh output; existing evidence is preserved')

def db():
    c = sqlite3.connect(DB, timeout=15)
    c.execute('PRAGMA busy_timeout=15000')
    c.execute('PRAGMA synchronous=FULL')
    return c

with db() as c:
    mode = c.execute('PRAGMA journal_mode=WAL').fetchone()[0]
    c.executescript('''
      CREATE TABLE claims(resource TEXT PRIMARY KEY, owner TEXT NOT NULL);
      CREATE TABLE budget(id INTEGER PRIMARY KEY, remaining INTEGER NOT NULL CHECK(remaining>=0));
      INSERT INTO budget VALUES(1,10000);
      CREATE TABLE outbox(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE consumed(id TEXT PRIMARY KEY);
    ''')

records = []
def result(id, ok, **details):
    records.append({'id':id,'status':'PASS' if ok else 'FAIL','details':details})

barrier = threading.Barrier(16)
def claim(i):
    barrier.wait()
    try:
        with db() as c: c.execute('INSERT INTO claims VALUES(?,?)',('synthetic-once',str(i)))
        return True
    except sqlite3.IntegrityError:
        return False
with cf.ThreadPoolExecutor(max_workers=16) as pool:
    successes = sum(pool.map(claim, range(16)))
result('SQL-CLAIM-RACE', successes==1, workers=16, winners=successes, external_actions=0)

reopen = subprocess.run([sys.executable,'-X','utf8','-c',
    "import sqlite3,sys; c=sqlite3.connect(sys.argv[1]);\ntry: c.execute(\"INSERT INTO claims VALUES('synthetic-once','restart')\"); c.commit(); sys.exit(3)\nexcept sqlite3.IntegrityError: print('duplicate rejected after process restart')",str(DB)],capture_output=True,text=True,encoding='utf8')
result('SQL-CLAIM-REOPEN', reopen.returncode==0, stdout=reopen.stdout.strip(), stderr=reopen.stderr.strip())

barrier2 = threading.Barrier(16)
def reserve(i):
    barrier2.wait()
    with db() as c:
        return c.execute('UPDATE budget SET remaining=remaining-1000 WHERE id=1 AND remaining>=1000').rowcount
with cf.ThreadPoolExecutor(max_workers=16) as pool:
    grants = sum(pool.map(reserve, range(16)))
with db() as c: remaining=c.execute('SELECT remaining FROM budget').fetchone()[0]
result('SQL-BUDGET-RACE', grants==10 and remaining==0,workers=16,granted=grants,remaining=remaining,unit='synthetic integer units')

c = db()
c.execute('BEGIN IMMEDIATE')
c.execute("INSERT INTO claims VALUES('rollback','owner')")
c.execute("INSERT INTO outbox VALUES('rolled-back','{}')")
c.rollback(); c.close()
with db() as c:
    n=c.execute("SELECT (SELECT count(*) FROM claims WHERE resource='rollback')+(SELECT count(*) FROM outbox WHERE id='rolled-back')").fetchone()[0]
    c.execute("INSERT INTO claims VALUES('commit','owner')")
    c.execute("INSERT INTO outbox VALUES('committed','{}')")
with db() as c:
    committed=c.execute("SELECT count(*) FROM outbox WHERE id='committed'").fetchone()[0]
    first=c.execute("INSERT OR IGNORE INTO consumed VALUES('committed')").rowcount
    second=c.execute("INSERT OR IGNORE INTO consumed VALUES('committed')").rowcount
result('SQL-OUTBOX-ROLLBACK-DEDUPE',n==0 and committed==1 and first==1 and second==0,rolled_back_rows=n,committed=committed,first=first,duplicate=second)

# Deliberately tear only an unacknowledged final record in our own synthetic fixture.
log=OUT/'torn-tail.jsonl'
prefix_hash=hashlib.sha256()
with log.open('xb') as f:
    for i in range(4096):
        line=(json.dumps({'seq':i,'text':'合成归档 ☑ '+str(i)},ensure_ascii=False,separators=(',',':'))+'\n').encode('utf8')
        f.write(line); prefix_hash.update(line)
    f.flush(); os.fsync(f.fileno()); ack_bytes=f.tell()
    f.write(b'{"seq":4096,"text":"unacknowledged')
    f.flush(); os.fsync(f.fileno())
valid_hash=hashlib.sha256(); count=0; torn=False; offset=0
with log.open('rb') as f:
    for line in f:
        if not line.endswith(b'\n'):
            torn=True;break
        record=json.loads(line)
        if record['seq']!=count:raise AssertionError('sequence gap')
        valid_hash.update(line); count+=1; offset+=len(line)
result('FS-TORN-TAIL-PREFIX',count==4096 and torn and offset==ack_bytes and valid_hash.hexdigest()==prefix_hash.hexdigest(),acknowledged_records=4096,recovered_complete_records=count,quarantined_bytes=log.stat().st_size-offset,sha256=valid_hash.hexdigest(),power_loss_test='NOT_RUN')

data={'kind':'M0 feasibility; synthetic input; no model/backend invoked','time_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'sqlite_version':sqlite3.sqlite_version,'journal_mode':mode,'results':records,'not_proven':['OS sandbox','real provider billing','end-to-end exactly once','hardware power-loss durability','production archive implementation']}
(ROOT/'storage-probe-results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(data,ensure_ascii=False,indent=2))
sys.exit(0 if all(x['status']=='PASS' for x in records) else 1)
