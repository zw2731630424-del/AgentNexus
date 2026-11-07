"""Collect additive M1.6 evidence. Only this release's derived reports are written."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import shutil
import stat
import subprocess
import sys
import zipfile

ROOT=Path('\\\\?\\I:\\AI_AgentNexus') # Evidence fixture paths can exceed legacy MAX_PATH.
OUT=ROOT/'deliverables/AgentNexus-M1.6'
RUNTIME=ROOT/'.workflow-kit/runtime/AgentNexus-M1.6'

def digest(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))

def save(p,data):
    p.parent.mkdir(parents=True,exist_ok=True)
    text=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
    if p.exists():
        if p.read_text(encoding='utf-8')!=text:raise RuntimeError('Evidence exists with different bytes: '+str(p))
    else:p.write_text(text,encoding='utf-8')

def copy(source,destination):
    destination.parent.mkdir(parents=True,exist_ok=True)
    if destination.exists():
        if digest(source)!=digest(destination):raise RuntimeError('Refusing evidence overwrite: '+str(destination))
    else:shutil.copyfile(source,destination)

def files(base):
    """Never traverse a reparse point while collecting synthetic evidence."""
    regular=[];special=[]
    def visit(folder):
        for e in sorted(os.scandir(folder),key=lambda x:x.name):
            p=Path(e.path);s=e.stat(follow_symlinks=False)
            if stat.S_ISLNK(s.st_mode) or getattr(s,'st_file_attributes',0)&getattr(stat,'FILE_ATTRIBUTE_REPARSE_POINT',0):
                special.append({'path':p.relative_to(base).as_posix(),'status':'REPARSE_NOT_FOLLOWED'});continue
            if stat.S_ISDIR(s.st_mode):visit(p)
            elif stat.S_ISREG(s.st_mode):regular.append(p)
            else:special.append({'path':p.relative_to(base).as_posix(),'status':'NONREGULAR_NOT_READ'})
    if base.exists():visit(base)
    return regular,special

def archive(base,target,selected=None):
    regular,special=files(base)
    if selected is not None:regular=[base/f['path'] for f in selected]
    manifest=[{'path':p.relative_to(base).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in regular]
    manifest.sort(key=lambda x:x['path'])
    if target.exists():return load(target.with_suffix('.manifest.json'))
    target.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(target,'x',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for item in manifest:z.write(base/item['path'],item['path'])
    with zipfile.ZipFile(target) as z:
        assert sorted(z.namelist())==[f['path'] for f in manifest]
        for item in manifest:
            with z.open(item['path']) as stream:
                assert hashlib.file_digest(stream,'sha256').hexdigest()==item['sha256']
    result={'files':manifest,'nonregular':special,'archive_sha256':digest(target),'verified_member_hashes':True}
    save(target.with_suffix('.manifest.json'),result)
    return result

def collect_runs():
    runs=[]
    for group in sorted(RUNTIME.iterdir()):
        if not group.is_dir() or not (group/'verification').is_dir():continue
        for run in sorted((group/'verification').iterdir()):
            if not (run/'results.json').is_file():continue
            r=load(run/'results.json');destination=OUT/'evidence/runs'/(group.name+'-'+run.name)
            for name in ['results.json','source-manifest.json','all-tests.tap','events.jsonl','syntax.json','typecheck.json','tsc.stdout.txt','tsc.stderr.txt','runner.stdout.txt','runner.stderr.txt']:
                if (run/name).is_file():copy(run/name,destination/name)
            archive(run/'workspace',destination/'source-snapshot.zip',load(run/'source-manifest.json')['files'])
            if (run/'data').is_dir():archive(run/'data',destination/'test-data.zip')
            runs.append({'group':group.name,'run':run.name,'path':destination.relative_to(OUT).as_posix(),'source_sha256':r['source_set_sha256'],'counts':r['summary']['counts'],'exit_code':r['exit_code'],'suite':r.get('suite','BASELINE')})
    save(OUT/'run-history.json',{'schema':'agentnexus/m16/run-history/1','runs':runs})
    return runs

def reading_report():
    source=ROOT/'deliverables/AgentNexus-M1.5.1/source'
    prefix='deliverables/AgentNexus-M1.5.1/source/'
    readers={}
    a=load(OUT/'evidence/resource-line/phase0-reading-manifest.json')['files']
    b=load(OUT/'evidence/components/read-manifest.json')['full_read_files']
    for who,entries in [('resource_line',a),('harness_components',b)]:
        for f in entries:
            path=f['path'].replace('\\','/').removeprefix('I:/AI_AgentNexus/')
            if path.startswith(prefix):readers.setdefault(path[len(prefix):],[]).append(who)
    primary=['config/agentnexus/features.json','config/agentnexus/policies.json','package-lock.json','package.json','src/agentnexus/cli.ts',
      'tests/agentnexus/owned-storage-child.mjs','tests/agentnexus/reconciliation-child.mjs','tests/agentnexus/runtime-crash-child.mjs','tests/agentnexus/runtime-worker.mjs',
      'tools/agentnexus/freeze-m13.py','tools/agentnexus/json-reporter.mjs','tools/agentnexus/package-m12.py','tools/agentnexus/preflight-m14.ps1','tools/agentnexus/preflight-m15.ps1',
      'tools/agentnexus/run-tests.mjs','tools/agentnexus/typecheck-m15.mjs','tools/agentnexus/verify-m12.mjs','tools/agentnexus/verify-m13.mjs','tools/agentnexus/verify-m14.mjs','tools/agentnexus/verify-m15.mjs','tools/agentnexus/windows-probes.ps1','tsconfig.json',
      'src/agentnexus/types.ts','src/agentnexus/gateway.ts','src/agentnexus/features.ts','src/agentnexus/control.ts','src/agentnexus/host.ts','src/agentnexus/records.ts','src/agentnexus/policy-contracts.ts','src/agentnexus/runtime/contracts.ts']
    for path in primary:readers.setdefault(path,[]).append('primary')
    baseline=load(ROOT/'deliverables/AgentNexus-M1.5.1/source-sha256.json')
    rows=[{**f,'readers':readers.get(f['path'],[]),'read_mode':'FULL_STRUCTURED_JSON_PARSE_AND_CONTRACT_INDEX' if f['path'].startswith('config/') else 'FULL_SOURCE'} for f in baseline['files']]
    missing=[r['path'] for r in rows if not r['readers']]
    mismatches=[r['path'] for r in rows if digest(source/r['path'])!=r['sha256']]
    assert not missing and not mismatches,(missing,mismatches)
    save(OUT/'evidence/phase0/reading-coverage.json',{'schema':'agentnexus/m16/baseline-reading/1','source_files':rows,'missing':missing,'baseline_mismatches':mismatches,
      'interpretation':'Collective independent-context semantic source/test reads; entire JSON catalogs parsed, structural IDs/defaults/dependencies/owners indexed. Raw CPU58 frames are preserved rather than claiming a new execution.',
      'historical_reports_and_architecture_read_manifests':['../resource-line/phase0-reading-manifest.json','../components/read-manifest.json'],
      'no_project_rules_index':True,'workflow_type_route':'No matching project-type workflow; no enhancement modules enabled'})

def catalogs():
    source=OUT/'source';f=load(source/'config/agentnexus/features.json');p=load(source/'config/agentnexus/policies.json')
    old=load(ROOT/'deliverables/AgentNexus-M1.5.1/source/config/agentnexus/features.json');oldp=load(ROOT/'deliverables/AgentNexus-M1.5.1/source/config/agentnexus/policies.json')
    assert len({x['id'] for x in f['features']})==190 and len({x['id'] for x in p['policies']})==52
    assert {x['id'] for x in old['features']} <= {x['id'] for x in f['features']}
    assert {x['id'] for x in oldp['policies']} <= {x['id'] for x in p['policies']}
    lines=['# M1.6 Feature Catalog','',
      '完整机器定义含190项：继承170个ID并新增20项，无删除/重复。M1.6注册43个本地模块；存在于设计目录或默认ON不等于可用。默认状态、scope、dependency/conflict、off/recovery和测试映射见source/config/agentnexus/features.json。',
      '', '本轮PASS只指qualification_scope注明的本地合同；Provider为SIMULATED，OS硬限制/生产资格不随Feature提升。Gate是版本/证据/状态ledger；规则是版本化捕获和必要装配，完整编译器NOT_RUN。wf.context明确INTERFACE_ONLY。',
      '', '关闭的实际合同：执行/类型/资源模块阻止新准入并排空或隔离在途工作；Gate关闭后提交BYPASSED，正在进行的只读验证可结束；核算/退出/UNKNOWN清理事实可继续。通用off_behavior文字是共同治理目标，不能据它宣称每个可选只读服务已有独立抢占式强停。',
      '', '| Feature | 默认 | 当前范围 | 资格 | 依赖 |', '|---|---|---|---|---|']
    ids=set(f['m16_implemented_features']+f['m16_blocked_features']+['wf.context'])
    for item in f['features']:
        if item['id'] in ids:lines.append('| '+item['id']+' | '+item['default']+' | '+item['implementation_status']+' | '+item['qualification_status']+' | '+', '.join(item['depends_on'])+' |')
    lines+=['','所有测试ID已映射到实际m16测试文件，最终执行以test-results.json及其源集合为准。CPU accounting的整数ledger通过不解决M1.5.1真实Job/进程计量差异；该OS方面仍INCONCLUSIVE。未注册OS模块无ON旁路；严格CPU固定代码拒绝。','']
    (OUT/'feature-catalog.md').write_text('\n'.join(lines),encoding='utf-8')
    lines=['# M1.6 Policy Catalog','',
      '完整机器定义52项，保留原44个已知ID/level/degradable/owner，并新增以下8个L0独立owner。Catalog文本不授予权限；PolicyEngine固定白名单/owner/schema仍校验，L0不进入可降级应用PDP，DISABLED申请拒绝。',
      '', '| Policy | Owner | ENFORCE / AUDIT_ONLY / DISABLED | 实际正/负/绕过测试 |', '|---|---|---|---|']
    oldids={x['id'] for x in oldp['policies']}
    for item in p['policies']:
        if item['id'] not in oldids:lines.append('| '+item['id']+' | '+item['enforcement_owner']+' | 独立owner强制；应用模式不能关闭 | '+', '.join(item['test_ids'])+' |')
    lines+=['','NativeState审计记录固定ownerPolicyIDs、Feature/Policy epoch、runtime/model/budget/scope和CONTROL_STATE_CHANGE_ONLY裁定；这不是工具Permit或人工批准。工具的具体PDP/精确审批/Permit审计仍由原Gateway产生。原Archive、Artifact、Decision与审计域不合并。',
      '', 'M16 security回归把旧44项计数更新为精确52并逐项核8个新L0/nondegradable ID；全部未知/错level/owner/mode/权限字段负例保留。没有放宽CPU或TOCTOU断言。测试PASS的范围是本地owner与模拟Provider合同，不能当OS或真实Key安全资格。','']
    (OUT/'policy-catalog.md').write_text('\n'.join(lines),encoding='utf-8')

if __name__=='__main__':
    reading_report();catalogs();runs=collect_runs()
    copy(ROOT/'.workflow-kit/tasks/AgentNexus-M1.6/original-request.txt',OUT/'original-request.txt')
    copy(ROOT/'tools/agentnexus/m16-delivery.py',OUT/'evidence/build-tools/m16-delivery.py')
    copy(Path(__file__),OUT/'evidence/build-tools/collect-delivery.py')
    print(json.dumps({'runs':len(runs),'reading_coverage':100,'features':190,'policies':52}))
