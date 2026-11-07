"""Preserve completed test runs, verify archives, then remove only their copies.
Long-path-safe collection fixes governance traversal without touching old releases.
"""
import pathlib,os,hashlib,json,zipfile,shutil,datetime,sys
ROOT=pathlib.Path(__file__).resolve().parents[4]
BASE=ROOT/'deliverables/AgentNexus-M1.5.1/evidence/runs'
BASE.mkdir(parents=True,exist_ok=True)

def extended(p):
    value=str(p.absolute())
    return pathlib.Path('\\\\?\\'+value) if os.name=='nt' and not value.startswith('\\\\?\\') else p

def archive(directory,dest):
    rows=[]
    def walk(current):
        for entry in os.scandir(current):
            p=pathlib.Path(entry.path);s=entry.stat(follow_symlinks=False)
            rel=p.relative_to(extended(directory)).as_posix()
            if s.st_file_attributes&0x400:
                rows.append({'path':rel,'reparse_point':True,'target':os.readlink(p)})
            elif entry.is_dir(follow_symlinks=False):walk(p)
            elif entry.is_file(follow_symlinks=False):
                rows.append({'path':rel,'bytes':s.st_size,'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest()})
            else:raise RuntimeError('Nonregular evidence '+str(p))
    walk(extended(directory));rows.sort(key=lambda r:r['path'])
    with zipfile.ZipFile(dest,'x',compression=zipfile.ZIP_DEFLATED) as z:
        for r in rows:
            if r.get('reparse_point'):continue
            z.write(extended(directory)/r['path'],r['path'])
        z.writestr('__capture_metadata__.json',json.dumps({'files':rows},indent=2))
    with zipfile.ZipFile(dest) as z:
        for r in rows:
            if r.get('reparse_point'):continue
            with z.open(r['path']) as f:assert hashlib.file_digest(f,'sha256').hexdigest()==r['sha256']
    (dest.with_suffix(dest.suffix+'.manifest.json')).write_text(json.dumps({'files':rows,'zip_sha256':hashlib.file_digest(dest.open('rb'),'sha256').hexdigest(),'members_verified':True},indent=2)+'\n',encoding='utf-8')
    return rows

def collect(run,run_id):
    dest=BASE/run_id
    if dest.exists():return
    dest.mkdir()
    for p in run.iterdir():
        if p.is_file():shutil.copyfile(p,dest/p.name)
    for name in ['workspace','data']:
        directory=run/name
        if not directory.exists():continue
        archive(directory,dest/(name+'.zip'))
        # Fixed completed-run targets only; never an old release or computed parent.
        run_abs=os.path.normcase(os.path.abspath(run));target_abs=os.path.normcase(os.path.abspath(directory))
        assert os.path.commonpath([run_abs,target_abs])==run_abs and target_abs!=run_abs
        assert directory.name in ['workspace','data']
        assert not directory.is_symlink() and not directory.is_junction()
        shutil.rmtree(extended(directory))
    (dest/'capture.json').write_text(json.dumps({'run_id':run_id,'original_run':str(run),'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'raw_records_altered':False,'data_and_workspace_archives_verified':True},indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'captured':run_id}))

initial=ROOT/'.workflow-kit/runtime/AgentNexus-M1.5.1'
for category in ['baseline','baseline-corrected','baseline-host-account']:
    for run in (initial/category/'verification').glob('*'):
        if (run/'results.json').exists():collect(run,category+'-'+run.name)
for name in ['m151-focus01','m151-life01']:
    run=ROOT/'.workflow-kit/runtime'/name
    if (run/'tests.tap').exists():collect(run,name)
if '--final' in sys.argv:
    for run in (ROOT/'.workflow-kit/runtime/m151-final/verification').glob('*'):
        if (run/'results.json').exists():collect(run,'final-'+run.name)
