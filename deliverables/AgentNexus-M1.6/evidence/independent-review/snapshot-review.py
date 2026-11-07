"""Read-only product capture. All outputs stay inside the independent review directory."""
from pathlib import Path
import argparse, datetime, difflib, hashlib, json, subprocess, zipfile

HERE=Path(__file__).resolve().parent
RELEASE=HERE.parent.parent
WORKSPACE=RELEASE.parent.parent
SOURCE=RELEASE/'source'
BASELINE=WORKSPACE/'deliverables/AgentNexus-M1.5.1/source'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def file_sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream,'sha256').hexdigest()

def aggregate(files):
    return digest(''.join(f['path']+'\0'+f['sha256']+'\n' for f in files).encode())

def save(name,value):
    (HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def git(*args):
    return subprocess.check_output(['git',*args],cwd=WORKSPACE,text=True,encoding='utf-8').strip()

parser=argparse.ArgumentParser()
parser.add_argument('--label',default='final')
parser.add_argument('--verify-history',action='store_true')
args=parser.parse_args()
assert args.label.replace('-','').replace('_','').isalnum()
source_paths=[p for p in sorted(SOURCE.rglob('*')) if p.is_file() and 'node_modules' not in p.parts]
assert all(not p.is_symlink() and p.resolve().is_relative_to(SOURCE.resolve()) for p in source_paths)
assert sum(p.stat().st_size for p in source_paths)<=16*1024*1024
source_bytes={p.relative_to(SOURCE).as_posix():p.read_bytes() for p in source_paths}
files=[{'path':path,'bytes':len(data),'sha256':digest(data)} for path,data in sorted(source_bytes.items())]
baseline_manifest=json.loads((BASELINE.parent/'source-sha256.json').read_text(encoding='utf-8'))
baseline_errors=[]
for f in baseline_manifest['files']:
    path=BASELINE/f['path']
    assert path.resolve().is_relative_to(BASELINE.resolve())
    if not path.is_file() or path.stat().st_size!=f['bytes'] or file_sha(path)!=f['sha256']:
        baseline_errors.append(f['path'])
baseline_files={f['path']:f for f in baseline_manifest['files']}
current_files={f['path']:f for f in files}
new=[p for p in current_files if p not in baseline_files]
changed=[p for p in current_files if p in baseline_files and current_files[p]['sha256']!=baseline_files[p]['sha256']]
removed=[p for p in baseline_files if p not in current_files]
diff=[]
summaries=[]
for path in new+changed:
    before=(BASELINE/path).read_text(encoding='utf-8').splitlines(keepends=True) if path in baseline_files else []
    after=source_bytes[path].decode('utf-8').splitlines(keepends=True)
    lines=list(difflib.unified_diff(before,after,fromfile='M1.5.1/'+path,tofile='M1.6/'+path,n=3))
    diff.extend(lines)
    summaries.append({'path':path,'status':'NEW' if path in new else 'CHANGED','added_lines':sum(x.startswith('+') and not x.startswith('+++') for x in lines),
                      'removed_lines':sum(x.startswith('-') and not x.startswith('---') for x in lines),
                      'before_sha256':baseline_files.get(path,{}).get('sha256'),'after_sha256':current_files[path]['sha256']})
diff_name='source-diff-'+args.label+'.patch'
(HERE/diff_name).write_text(''.join(diff),encoding='utf-8',newline='')
archive=HERE/('source-snapshot-'+args.label+'.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for path,data in sorted(source_bytes.items()):
        z.writestr(path,data)
with zipfile.ZipFile(archive) as z:
    assert set(z.namelist())==set(source_bytes)
    for path,data in source_bytes.items():
        assert digest(z.read(path))==digest(data)
source_changed_during_capture=[p for p,data in source_bytes.items() if (SOURCE/p).read_bytes()!=data]
history={'status':'NOT_REHASHED_BY_INDEPENDENT_REVIEW','basis':'Parent Phase 0 manifest retained'}
if args.verify_history:
    frozen=json.loads((RELEASE/'evidence/phase0/historical-manifest.json').read_text(encoding='utf-8'))
    mismatches=[]
    for f in frozen['files']:
        path=WORKSPACE/f['path']
        assert path.resolve().is_relative_to(WORKSPACE.resolve())
        if not path.is_file() or path.stat().st_size!=f['bytes'] or file_sha(path)!=f['sha256']:
            mismatches.append(f['path'])
    history={'status':'PASS' if not mismatches else 'FAIL','files':len(frozen['files']),'bytes':sum(f['bytes'] for f in frozen['files']),
             'mismatches':mismatches,'phase0_set_sha256':frozen['set_sha256']}
manifest={'schema':'agentnexus/independent-review/source/1.6','captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'git':{'branch':git('branch','--show-current'),'head':git('rev-parse','HEAD'),'status':git('status','--short'),
                 'candidate_commit_exists':False,'candidate_binding':'Uncommitted source snapshot; no automatic commit or push'},
          'source_root':str(SOURCE),'files':files,'set_sha256':aggregate(files),'aggregate_algorithm':'SHA256 of sorted UTF-8 path + NUL + lowercase file SHA256 + LF',
          'baseline':{'files':len(baseline_manifest['files']),'set_sha256':baseline_manifest['set_sha256'],'mismatches':baseline_errors},
          'history_preservation':history,'diff':{'new':new,'changed':changed,'removed':removed,'files':summaries,'patch':diff_name},
          'snapshot_zip':{'path':archive.name,'bytes':archive.stat().st_size,'sha256':file_sha(archive),'members_verified':True},
          'source_changed_during_capture':source_changed_during_capture}
save('source-manifest-'+args.label+'.json',manifest)
print(json.dumps({'source_files':len(files),'set_sha256':manifest['set_sha256'],'new':len(new),'changed':len(changed),'removed':len(removed),
                  'baseline_mismatches':len(baseline_errors),'history':history['status'],'source_changed_during_capture':source_changed_during_capture}))
assert not baseline_errors and not source_changed_during_capture and history['status']!='FAIL'
