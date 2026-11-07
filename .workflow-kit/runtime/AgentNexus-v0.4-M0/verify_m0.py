"""Verify M0 evidence/document integrity only; never executes downloaded Harness code."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
from urllib.parse import unquote
import zipfile

ROOT=Path(__file__).resolve().parents[3]
R=ROOT/'.workflow-kit/runtime/AgentNexus-v0.4-M0'
TASK=ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0'
issues=[]; checks=[]; sources=[]; lookup={}; hashes=0
def sha(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def record(id,ok,**details):
    checks.append({'id':id,'status':'PASS' if ok else 'FAIL','details':details})
    if not ok:issues.append({'id':id,**details})
def read(path):return json.loads(path.read_text(encoding='utf8'))
def check_file(path,expected):
    global hashes
    if not path.is_file():issues.append({'missing_source':str(path)});return
    got=sha(path);hashes+=1
    if got!=expected:issues.append({'source_hash_mismatch':str(path),'expected':expected,'actual':got})

# User originals and governing rules.
im=read(R/'input-manifest.json')
handoff=ROOT/'inputs/AgentNexus-v0.4/AgentNexus_v0.4_Codex_Handoff.zip'
record('INPUT-HANDOFF',sha(handoff)==im['handoff_sha256'] and sha(Path(im['original_download']))==im['handoff_sha256'])
for f in im['files']:record('INPUT-'+Path(f['path']).name,sha(ROOT/f['path'])==f['sha256'])
with zipfile.ZipFile(ROOT/'ai-workflow-kit-v4.0.0.zip') as z:
    original_names=[x for x in z.namelist() if not x.endswith('/')]
    same=all(sha(ROOT/x)==hashlib.sha256(z.read(x)).hexdigest() for x in original_names)
record('WORKFLOW-ORIGINAL-UNCHANGED',len(original_names)==105 and same,files=len(original_names))
baseline=read(ROOT/'.workflow-kit/governance/baseline.json')
record('RULES-UNCHANGED',sha(ROOT/'AGENTS.md')=='a868b01052ea5613300e6973fd1c65917ba2f10b01eea025214b513432cd4694' and sha(ROOT/'.workflow-kit/governance/policy.json')=='ea91359de90e74cbb554f93ac2dae82509f93f5bcc05c65bf22384aba4dd4d83' and baseline['profile']=='lite' and not baseline['registered_rules'])

# Collect immutable source cache locations and verify each preserved file.
for name in ['deepseek','ohsdk','openhands','agensh']:
    folder=R/'upstream'/name;m=read(folder/'acquisition.json');meta=read(folder/'repository.json')
    valid_source_count=0
    for item in m['files']:
        path=folder/item['path'];check_file(path,item['sha256'])
        if item['path'].startswith('files/'):
            rel=item['path'][6:];lookup[(m['canonical_repo'].lower(),m['commit'],rel)]=path;valid_source_count+=1
    sources.append({'id':name,'repo':m['canonical_repo'],'commit':m['commit'],'license_spdx':(meta.get('license') or {}).get('spdx_id'),'source_files_preserved':valid_source_count,'manifest':str((folder/'acquisition.json').relative_to(ROOT)),'scope':'selected source files; not full line-by-line repository audit','tree_complete':False if name=='deepseek' else not read(folder/'tree.json').get('truncated')})

sr=read(R/'harness-secondary-repos.json')
byproject={x['id']:x for x in sr}
for item in read(R/'harness-secondary-source-inventory.json'):
    meta=byproject[item['project']];path=ROOT/Path(meta['cache'])/item['path']
    check_file(path,item['sha256'])
    if item['status']=='MATCH_COMMIT_BLOB':lookup[(item['repo'].lower(),item['sha'],item['path'].replace('\\','/'))]=path
for meta in sr:
    sources.append({'id':meta['id'],'repo':meta['canonical_repo'],'commit':meta['sha'],'source_files_preserved':sum(x['project']==meta['id'] for x in read(R/'harness-secondary-source-inventory.json')),'manifest':'.workflow-kit/runtime/AgentNexus-v0.4-M0/harness-secondary-source-inventory.json','scope':'preserved source subset/full text cache; not all files manually audited','tree_complete':not meta['tree_truncated']})
for item in read(R/'harness-secondary-evidence.json'):
    path=ROOT/Path(item['local']);check_file(path,item['file_sha256'])
    lookup[(item['repo'].lower(),item['sha'],item['path'])]=path

for name in ['iface-codex','iface-zcode','iface-claude']:
    folder=R/'upstream'/name;m=read(folder/'audit-manifest.json');cache=R/'upstream/.pytest_cache'/name
    for item in m['files']:
        path=cache/item['path'];check_file(path,item['sha256'])
        lookup[(m['repo'].lower(),m['commit'],item.get('upstream_path',item['path']))]=path
    sources.append({'id':name,'repo':m['repo'],'commit':m['commit'],'source_files_preserved':len(m['files']),'manifest':str((folder/'audit-manifest.json').relative_to(ROOT)),'extraction_complete':m.get('extraction_complete'),'scope':'fixed source cache; CLI/Harness tests and inference NOT_RUN'})

for folder in ['ohsdk','openhands','agensh','deepseek']:
    m=read(R/'upstream'/folder/'acquisition.json')
    path=R/'upstream'/folder/'tree.json'
    if not path.exists():continue
    try:tree=read(path)
    except json.JSONDecodeError:
        t=path.read_text();cut=t.rfind('},')
        tree=json.loads(t[:cut+1]+']}')
    bypath={x['path']:x['sha'] for x in tree['tree'] if x['type']=='blob'}
    for (repo,commit,rel),path in list(lookup.items()):
        if repo!=m['canonical_repo'].lower() or commit!=m['commit'] or rel not in bypath:continue
        content=path.read_bytes();blob=hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()
        if blob!=bypath[rel]:issues.append({'git_blob_mismatch':str(path)})
record('SOURCE-HASHES',not any('source_hash_mismatch' in x or 'missing_source' in x or 'git_blob_mismatch' in x for x in issues),checked_hash_records=hashes,snapshots=len(sources))
(TASK/'research/source_snapshots.json').write_text(json.dumps({'status':'static research evidence; upstream execution NOT_RUN','snapshots':sources},ensure_ascii=False,indent=2)+'\n',encoding='utf8')

# Catalog shape/graph checks, not behavior/conformance tests.
fc=read(TASK/'architecture/feature_catalog.json');pc=read(TASK/'architecture/policy_catalog.json')
features=fc['features'];ids={x['id'] for x in features}
f_errors=[]
if len(ids)!=len(features):f_errors.append('duplicate ids')
required={'id','name','version','description','default','scopes','depends_on','conflicts','config_schema','pre_enable','pre_disable','off_behavior','risk','admin_confirmation','recovery','health','observability','tests'}
for f in features:
    if not required<=f.keys():f_errors.append([f['id'],'missing metadata'])
    if f['agent_writable'] or f['implementation_status']!='DESIGN_ONLY':f_errors.append([f['id'],'incorrect authority/status'])
    for dep in f['depends_on']+f['conflicts']:
        if dep not in ids:f_errors.append([f['id'],'unknown reference',dep])
seen=set();visiting=set()
byid={x['id']:x for x in features}
def visit(id):
    if id in visiting:f_errors.append(['dependency cycle',id]);return
    if id in seen:return
    visiting.add(id)
    for dep in byid[id]['depends_on']:
        if dep in byid:visit(dep)
    visiting.remove(id);seen.add(id)
for id in ids:visit(id)
for i in range(7):
    if f'wf.gate.g{i}' not in ids:f_errors.append('missing gate')
record('FEATURE-CATALOG-STRUCTURE',not f_errors,count=len(features),errors=f_errors,behavior='NOT_RUN')
p_errors=[]
for p in pc['policies']:
    if set(p['modes'])!={'ENFORCE','AUDIT_ONLY','DISABLED'}:p_errors.append([p['id'],'mode gap'])
    if p['level'] in ['L0','L1']:
        for suffix in ['POS','NEG','BYPASS','RACE','RECOVERY','UPGRADE']:
            if not any(t.endswith('-'+suffix) for t in p['test_ids']):p_errors.append([p['id'],'missing',suffix])
    if p['implementation_status']!='NOT_RUN':p_errors.append([p['id'],'false test status'])
record('POLICY-CATALOG-STRUCTURE',not p_errors,count=len(pc['policies']),errors=p_errors,behavior='NOT_RUN')

# Check every explicit immutable GitHub citation against local file and line bounds.
citations=[];link_errors=[];citation_errors=[]
pattern=re.compile(r'https://github\.com/([^/\s]+)/([^/\s]+)/blob/([0-9a-f]{40})/([^\s)#]+)(?:#L(\d+)(?:-L(\d+))?)?')
for md in TASK.rglob('*.md'):
    text=md.read_text(encoding='utf8')
    for match in pattern.finditer(text):
        user,repo,commit,rel,start,end=match.groups();rel=unquote(rel)
        key=((user+'/'+repo).lower(),commit,rel);path=lookup.get(key)
        if path is None:
            citation_errors.append({'document':str(md.relative_to(TASK)),'source_not_cached':match.group(0)});continue
        count=len(path.read_text(encoding='utf8',errors='replace').splitlines());a=int(start or 1);z=int(end or start or count)
        if not 1<=a<=z<=count:citation_errors.append({'document':str(md.relative_to(TASK)),'line_bounds':match.group(0),'file_lines':count})
        citations.append({'document':str(md.relative_to(TASK)),'url':match.group(0),'local':str(path.relative_to(ROOT)),'line_start':a,'line_end':z})
    for target in re.findall(r'(?<!!)\[[^\]]+\]\(([^)\n]+)\)',text):
        target=target.strip().split(' "')[0].strip('<>')
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*://',target) or target.startswith('#'):continue
        filepart=unquote(target.split('#',1)[0])
        loc=re.match(r'^(.*):(\d+)$',filepart)
        line=int(loc.group(2)) if loc else None
        if loc:filepart=loc.group(1)
        if not filepart:continue
        p=Path(filepart)
        if not p.is_absolute():p=md.parent/p
        if not p.exists():link_errors.append({'document':str(md.relative_to(TASK)),'missing_link':target})
        elif line and p.is_file() and not 1<=line<=len(p.read_text(encoding='utf8',errors='replace').splitlines()):link_errors.append({'document':str(md.relative_to(TASK)),'bad_line':target})
record('IMMUTABLE-SOURCE-CITATIONS',not citation_errors,citations=len(citations),errors=citation_errors)
record('LOCAL-DELIVERY-LINKS',not link_errors,errors=link_errors)
(R/'citation-verification.json').write_text(json.dumps(citations,ensure_ascii=False,indent=2)+'\n',encoding='utf8')

wf=read(R/'workflow-audit-results.json')
record('WORKFLOW-ISOLATED-RESULTS',wf['discovered']==100 and wf['passed']==91 and wf['skipped']==9 and not wf['failures'] and not wf['errors'],passed=wf['passed'],skipped=wf['skipped'])
probes=[]
for name in ['storage-probe-results.json','zstd-probe-results.json','node-sqlite-probe-results.json']:
    j=read(R/name);probes.extend(j['results'])
record('STORAGE-FEASIBILITY-RESULTS',len(probes)==11 and all(x['status']=='PASS' for x in probes),assertions=len(probes),scope='synthetic real SQLite/filesystem/Zstd only; product/model NOT_RUN')

mandatory=['README.md','research/harvest_matrix.md','research/license_inventory.md','research/security_review.md','research/primary_harness_audit.md','research/harness_secondary.md','research/public_interfaces.md','research/workflow_kit_audit.md','architecture/feature_catalog.md','architecture/feature_catalog.json','architecture/policy_catalog.md','architecture/policy_catalog.json','architecture/workflow_kit_mapping.md','architecture/internal_protocols.md','architecture/implementation_plan.md','reports/M0_report.md']
record('DELIVERABLES',all((TASK/f).stat().st_size>100 for f in mandatory) and len(list((TASK/'architecture/adr').glob('*.md')))==5,required=len(mandatory),adrs=5)
g=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'ai-workflow-kit-v4/tools/govern.py'),'check','--target',str(ROOT)],capture_output=True,text=True,encoding='utf8')
(R/'govern-final.log').write_text(g.stdout+g.stderr,encoding='utf8')
record('GOVERNANCE',g.returncode==0,exit_code=g.returncode,log='.workflow-kit/runtime/AgentNexus-v0.4-M0/govern-final.log')

report={'time_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'scope':'M0 evidence and document verification; not product test','checks':checks,'issues':issues,'snapshots':len(sources),'hash_records':hashes,'immutable_citations':len(citations),'workflow':{'discovered':100,'passed':91,'skipped':9},'storage_assertions':11,'real_models':'NOT_RUN','upstream_harness_tests':'NOT_RUN','os_security_product_conformance':'NOT_RUN'}
(R/'m0-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
lines=['# M0 本轮验证记录','',f"取证完成UTC时间：{report['time_utc']}。这些检查验证研究证据和规格结构，**不验证尚未实现的产品行为**。",'', '## 真实执行结果','', '| 项目 | 本轮结果 | 证据和边界 |','|---|---|---|', '| Workflow Kit unittest | 91 PASS、9 SKIP、0 failure/error；发现100 | [机器结果](../../../runtime/AgentNexus-v0.4-M0/workflow-audit-results.json)、[日志](../../../runtime/AgentNexus-v0.4-M0/workflow-unittest.log)；5项授权边界、4项OS链接权限跳过 |', '| 包/示例/AST/负例 | 实际运行；包完整性漏检已复现 | [检查与复现日志](../../../runtime/AgentNexus-v0.4-M0/workflow-checks.log)；原套件未改 |', '| Python SQLite/文件小探针 | 5 PASS | [结果](../../../runtime/AgentNexus-v0.4-M0/storage-probe-results.json)；SQLite3.49.1不作生产准入 |', '| Node SQLite绑定 | 3 PASS | [结果](../../../runtime/AgentNexus-v0.4-M0/node-sqlite-probe-results.json)；SQLite3.51.3、16worker |', '| Zstd流式/损坏/背压 | 3 PASS | [结果](../../../runtime/AgentNexus-v0.4-M0/zstd-probe-results.json)；32MiB合成数据、64KiB块、1793drain |','', '初次Zstd输入高度可压缩，背压未触发为INCONCLUSIVE，[初次结果](../../../runtime/AgentNexus-v0.4-M0/zstd-probe-initial-results.json)保留；随后只针对该未决项改用确定性伪随机数据。Node探针初版Worker接收URL字符串产生ERR_WORKER_PATH，修正为URL对象后用新fixture运行，未称初版通过。SQL/压缩是真实本地操作，输入是合成数据，无LLM/Fake模型联调，不代表完整产品实现。','', '## 证据与规格检查','', '| 检查 | 结果 | 范围 |','|---|---|---|']
for c in checks:lines.append(f"| {c['id']} | {c['status']} | {json.dumps(c['details'],ensure_ascii=False).replace('|','/')} |")
lines+=['', '## 明确未运行','', '所有候选Harness/SDK产品测试、真实Provider、OS隔离/越权对抗、Feature真实启停、Policy三模式、断电、long soak与科研实验均NOT_RUN。Feature/Policy目录仅做Schema字段、ID、依赖DAG与测试映射检查。上游validation旧报告为继承资料，不改成本轮PASS。','', '产品测试ID尚未变为实现；本轮未运行任何正式科研实验、自动commit/push、hooks或候选安装脚本。原输入/套件/项目规则指纹核对见上表。','', '完整机器记录：[m0-verification.json](../../../runtime/AgentNexus-v0.4-M0/m0-verification.json)；源码引用映射：[citation-verification.json](../../../runtime/AgentNexus-v0.4-M0/citation-verification.json)；交付指纹：[delivery_manifest.json](delivery_manifest.json)。']
if issues:lines+=['','## 尚待修复的交付问题','', '```json',json.dumps(issues,ensure_ascii=False,indent=2),'```']
(TASK/'reports/verification.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
delivery=[]
for p in sorted(TASK.rglob('*')):
    if p.is_file() and p.name!='delivery_manifest.json':delivery.append({'path':str(p.relative_to(TASK)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':sha(p)})
(TASK/'reports/delivery_manifest.json').write_text(json.dumps({'time_utc':report['time_utc'],'excludes':'this manifest itself','files':delivery},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'checks':len(checks),'issues':issues,'source_snapshots':len(sources),'hash_records':hashes,'immutable_citations':len(citations),'delivery_files':len(delivery)},ensure_ascii=False,indent=2))
sys.exit(0 if not issues else 1)
