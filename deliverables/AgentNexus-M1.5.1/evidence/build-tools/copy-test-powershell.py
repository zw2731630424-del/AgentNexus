"""Copy an existing runtime to task storage; no installation/ACL mutation."""
import pathlib,shutil,sys,hashlib,json
src=pathlib.Path(sys.argv[1]).resolve().parent
dest=pathlib.Path('.workflow-kit/runtime/m151-ps').resolve()
if dest.exists():raise RuntimeError('Refuse existing destination')
shutil.copytree(src,dest)
rows=[]
for p in sorted(src.rglob('*')):
 if p.is_file():
  q=dest/p.relative_to(src)
  original=hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
  copied=hashlib.file_digest(q.open('rb'),'sha256').hexdigest()
  assert original==copied
  rows.append({'path':p.relative_to(src).as_posix(),'bytes':p.stat().st_size,'sha256':original})
out=pathlib.Path('deliverables/AgentNexus-M1.5.1/evidence/toolchain')
out.mkdir(parents=True,exist_ok=True)
(out/'powershell-copy-provenance.json').write_text(json.dumps({'source':str(src),'destination':str(dest),'files':rows,'system_installation':False,'acl_changes':False},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'files':len(rows),'destination':str(dest/'pwsh.exe')}))
