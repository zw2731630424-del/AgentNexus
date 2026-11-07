import json,hashlib,datetime,sys
from pathlib import Path
root=Path(__file__).resolve().parents[3]
log=Path(__file__).with_name('engineering-events.jsonl')
prev='0'*64
if log.exists():
 with log.open('r',encoding='utf-8') as s:
  for line in s:prev=json.loads(line)['sha256']
paths=[]
for arg in sys.argv[2:]:
 p=root/arg
 items=sorted(p.rglob('*')) if p.is_dir() else [p]
 for f in items:
  if not f.is_file():continue
  h=hashlib.sha256()
  with f.open('rb') as src:
   for b in iter(lambda:src.read(65536),b''):h.update(b)
  paths.append({'path':f.relative_to(root).as_posix(),'bytes':f.stat().st_size,'sha256':h.hexdigest()})
e={'schema':'agentnexus/engineering-change/1','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'phase':sys.argv[1],'previous_sha256':prev,'files':paths,'scope':'engineering provenance; not a claim of running AgentNexus product audit'}
e['sha256']=hashlib.sha256(json.dumps(e,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
with log.open('a',encoding='utf-8',newline='\n') as s:
 s.write(json.dumps(e,ensure_ascii=False,separators=(',',':'))+'\n');s.flush()
 import os;os.fsync(s.fileno())
print(json.dumps({'phase':e['phase'],'files':len(paths),'sha256':e['sha256']}))
