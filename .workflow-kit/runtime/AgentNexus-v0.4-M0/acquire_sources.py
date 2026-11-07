"""Read-only public source acquisition. Never executes downloaded code."""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import urllib.request
import zipfile
import stat
import shutil
from concurrent.futures import ThreadPoolExecutor

BASE = pathlib.Path(__file__).resolve().parent / 'upstream'
ALLOWED = {'api.github.com', 'raw.githubusercontent.com', 'codeload.github.com'}

def get(url, dest):
    from urllib.parse import urlparse
    if urlparse(url).hostname not in ALLOWED:
        raise ValueError('unapproved source host')
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'AgentNexus-M0-source-audit', 'Accept': 'application/vnd.github+json'})
    h = hashlib.sha256()
    size = 0
    partial = dest.with_name(dest.name + '.partial')
    with urllib.request.urlopen(req, timeout=45) as response, partial.open('wb') as out:
        if urlparse(response.url).hostname not in ALLOWED:
            raise ValueError('unapproved redirect')
        while block := response.read(256 * 1024):
            size += len(block)
            if size > 200 * 1024 * 1024:
                raise ValueError('source exceeds 200 MiB acquisition cap')
            out.write(block)
            h.update(block)
    partial.replace(dest)
    return {'url': url, 'sha256': h.hexdigest(), 'bytes': size, 'retrieved_at': dt.datetime.now(dt.timezone.utc).isoformat()}

def main():
    p = argparse.ArgumentParser()
    p.add_argument('action', choices=['discover', 'pin', 'fetch', 'archive', 'tree'])
    p.add_argument('id')
    p.add_argument('repo')
    p.add_argument('paths', nargs='*')
    args = p.parse_args()
    if args.id in {'codex', 'zcode', 'claude-sdk'}:
        print('Delegated interface audit; skipping duplicate acquisition', args.id, flush=True)
        return
    if not args.id.replace('-', '').isalnum(): raise ValueError('unsafe source id')
    folder = BASE / args.id
    folder.mkdir(parents=True, exist_ok=True)
    manifest_path = folder / 'acquisition.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf8')) if manifest_path.exists() else {'id': args.id, 'repo': args.repo, 'files': []}
    if args.action in {'pin', 'discover'}:
        for kind, route in [('repository', ''), ('head-list', '/commits?per_page=1')]:
            dest = folder / (kind + '.json')
            if not dest.exists():
                manifest['files'].append({'path': dest.name, **get('https://api.github.com/repos/' + args.repo + route, dest)})
        repo = json.loads((folder/'repository.json').read_text(encoding='utf8'))
        commit = json.loads((folder/'head-list.json').read_text(encoding='utf8'))[0]
        manifest.update(commit=commit['sha'], canonical_repo=repo['full_name'])
        print(json.dumps({'id': args.id, 'commit': manifest['commit'], 'license': repo.get('license'), 'pushed_at': repo.get('pushed_at')}, ensure_ascii=False), flush=True)
    elif args.action == 'tree':
        dest = folder/'tree.json'
        record = get('https://api.github.com/repos/' + manifest['canonical_repo'] + '/git/trees/' + manifest['commit'] + '?recursive=1', dest)
        manifest['files'].append({'path':'tree.json', **record})
        tree = json.loads(dest.read_text(encoding='utf8'))
        manifest['tree_truncated'] = tree.get('truncated')
        print('TREE',args.id,len(tree['tree']),tree.get('truncated'),flush=True)
    elif args.action == 'archive':
        archive = folder/'source.zip'
        record = get('https://codeload.github.com/' + manifest['canonical_repo'] + '/zip/' + manifest['commit'], archive)
        manifest['files'].append({'path':'source.zip', **record})
        extracted = []
        total = 0
        text_ext = {'.py','.ts','.tsx','.rs','.toml','.json','.yaml','.yml','.md','.txt','.lock','.sh','.sql','.js','.mjs','.cjs','.go','.proto','.ps1','.ini','.cfg'}
        with zipfile.ZipFile(archive) as z:
            for info in z.infolist():
                rel = pathlib.PurePosixPath(info.filename)
                if rel.is_absolute() or '..' in rel.parts or ':' in info.filename or '\\' in info.filename or stat.S_ISLNK(info.external_attr >> 16):
                    raise ValueError('unsafe archive member')
                if info.is_dir(): continue
                pp = pathlib.PurePosixPath(*rel.parts[1:])
                if len(rel.parts) < 2: continue
                if pp.name in {'AGENTS.md', 'AGENTS.override.md'}: continue
                if pp.suffix not in text_ext and not any(x in pp.name.upper() for x in ['LICENSE','NOTICE','COPYING','DOCKERFILE','MAKEFILE']): continue
                total += info.file_size
                if info.file_size > 32*1024*1024 or total > 1024*1024*1024: raise ValueError('extraction cap')
                dest = folder/'files'/pp
                if not dest.resolve().is_relative_to((folder/'files').resolve()): raise ValueError('unsafe extraction')
                dest.parent.mkdir(parents=True, exist_ok=True)
                with z.open(info) as src, dest.open('wb') as out: shutil.copyfileobj(src,out,256*1024)
                with dest.open('rb') as saved: sha=hashlib.file_digest(saved,'sha256').hexdigest()
                extracted.append({'path':str(pp),'sha256':sha,'bytes':info.file_size})
        manifest['extracted_text_files'] = extracted
        print('ARCHIVED',args.id,len(extracted),total,flush=True)
    elif args.action == 'discover':
        for kind, route in [('repository', ''), ('commit', '/commits/HEAD'), ('tree', None)]:
            if kind == 'tree':
                commit = json.loads((folder/'commit.json').read_text(encoding='utf8'))
                route = '/git/trees/' + commit['commit']['tree']['sha'] + '?recursive=1'
                manifest['commit'] = commit['sha']
            dest = folder / (kind + '.json')
            manifest['files'].append({'path': dest.name, **get('https://api.github.com/repos/' + args.repo + route, dest)})
        repo = json.loads((folder/'repository.json').read_text(encoding='utf8'))
        manifest['canonical_repo'] = repo['full_name']
        tree = json.loads((folder/'tree.json').read_text(encoding='utf8'))
        manifest['tree_truncated'] = tree.get('truncated')
        print(json.dumps({k: manifest[k] for k in ['id','canonical_repo','commit','tree_truncated']}))
        print(json.dumps({k: repo.get(k) for k in ['default_branch','pushed_at','archived','license']}, ensure_ascii=False))
    else:
        def fetch_one(rel):
            pp = pathlib.PurePosixPath(rel)
            if pp.is_absolute() or '..' in pp.parts or ':' in rel or '\\' in rel: raise ValueError('unsafe source path')
            dest = folder / 'files' / pp
            if not dest.resolve().is_relative_to(folder.resolve()): raise ValueError('source escapes workspace')
            try:
                record = get('https://raw.githubusercontent.com/' + manifest.get('canonical_repo', args.repo) + '/' + manifest['commit'] + '/' + rel, dest)
                print('FETCHED', args.id, rel, record['bytes'],flush=True)
                return {'path': 'files/' + rel, **record}
            except Exception as exc:
                print('FETCH_FAILED', args.id, rel, repr(exc))
                return {'failed_path':rel, 'error':str(exc)}
        with ThreadPoolExecutor(max_workers=4) as pool:
            for record in pool.map(fetch_one, args.paths):
                if 'failed_path' in record: manifest.setdefault('errors', []).append(record)
                else: manifest['files'].append(record)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

if __name__ == '__main__': main()
