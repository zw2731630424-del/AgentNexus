import urllib.request,pathlib,json,hashlib,zipfile,stat,datetime,concurrent.futures
BASE=pathlib.Path(__file__).parent/'upstream'
def acquire(item):
 ident,repo=item;root=BASE/ident;root.mkdir(parents=True,exist_ok=True)
 if (root/'commit.json').exists():commit=json.loads((root/'commit.json').read_text(encoding='utf8'))
 else:
  with urllib.request.urlopen(urllib.request.Request(f'https://api.github.com/repos/{repo}/commits/HEAD',headers={'User-Agent':'AgentNexus-source-audit'}),timeout=60) as r: commit=json.load(r)
 sha=commit['sha'];(root/'commit.json').write_text(json.dumps(commit,indent=2),encoding='utf8');url=f'https://codeload.github.com/{repo}/zip/{sha}';archive=root/'source.zip';h=hashlib.sha256();size=0
 if not zipfile.is_zipfile(archive):
  with urllib.request.urlopen(url,timeout=90) as r,archive.open('wb') as out:
   while b:=r.read(262144):
    size+=len(b)
    if size>200*1024*1024:raise ValueError('cap')
    out.write(b)
 with archive.open('rb') as archived:
  while b:=archived.read(262144):h.update(b)
 size=archive.stat().st_size
 skipped=[];count=0;total=0
 with zipfile.ZipFile(archive) as z:
  for info in z.infolist():
   p=pathlib.PurePosixPath(info.filename)
   if p.is_absolute() or '..' in p.parts or ':' in info.filename or '\\' in info.filename:raise ValueError('unsafe path')
   if stat.S_ISLNK(info.external_attr>>16):skipped.append([info.filename,'symlink']);continue
   if info.is_dir():continue
   if info.file_size>8*1024*1024:skipped.append([info.filename,'size']);continue
   data=z.read(info)
   if b'\x00' in data:skipped.append([info.filename,'binary']);continue
   try:data.decode('utf8')
   except UnicodeDecodeError:skipped.append([info.filename,'non-utf8']);continue
   parts=list(p.parts[1:])
   if parts[-1] in ('AGENTS.md','AGENTS.override.md'):
    skipped.append([info.filename,'renamed instruction filename to .source.txt']);parts[-1]+='.source.txt'
   dest=BASE/'.pytest_cache'/ident/pathlib.Path(*parts)
   if not dest.resolve().is_relative_to(BASE.resolve()):raise ValueError('escape')
   total+=len(data)
   if total>600*1024*1024:raise ValueError('unpack cap')
   dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);count+=1
 m={'repo':repo,'commit':sha,'url':url,'archive_sha256':h.hexdigest(),'archive_bytes':size,'text_files':count,'unpacked_bytes':total,'skipped':skipped,'retrieved_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'execution':'NOT_RUN'};(root/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf8');print(json.dumps({k:v for k,v in m.items() if k!='skipped'}),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as p:list(p.map(acquire,[('iface-codex','openai/codex'),('iface-zcode','zai-org/ZCode'),('iface-claude','anthropics/claude-agent-sdk-python')]))
