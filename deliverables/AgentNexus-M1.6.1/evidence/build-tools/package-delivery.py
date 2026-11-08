"""Append-only M1.6.1 evidence packaging; never edits earlier deliveries or test oracles."""
from pathlib import Path
from collections import Counter
import datetime, hashlib, importlib.util, json, os, shutil, subprocess, sys, zipfile
ROOT=Path('I:/AI_AgentNexus')
OUT=ROOT/'deliverables/AgentNexus-M1.6.1'
RUNTIME=ROOT/'.workflow-kit/runtime/AgentNexus-M1.6.1'
SOURCE=OUT/'source'
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1048576),b''):h.update(b)
    return h.hexdigest()
def regulars(base):
    for directory,dirs,names in os.walk(base,followlinks=False):
        dirs[:]=sorted(n for n in dirs if n not in {'node_modules','__pycache__'} and not (Path(directory)/n).is_symlink())
        for name in sorted(names):
            p=Path(directory)/name
            if p.is_file() and not p.is_symlink():yield p
def inventory(base):
    return sorted([dict(path=p.relative_to(base).as_posix(),bytes=p.stat().st_size,sha256=digest(p)) for p in regulars(base)],key=lambda x:x['path'])
def aggregate(files):return hashlib.sha256(''.join(f['path']+'\0'+f['sha256']+'\n' for f in files).encode()).hexdigest()
def save(path,value,exclusive=False):
    assert path.resolve().is_relative_to(OUT.resolve()) or path.resolve().is_relative_to((ROOT/'.workflow-kit/tasks/AgentNexus-M1.6.1').resolve())
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('x' if exclusive else 'w',encoding='utf-8',newline='\n') as f:json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')
def text(path,value):
    assert path.resolve().is_relative_to(OUT.resolve()) or path.resolve().is_relative_to((ROOT/'.workflow-kit/tasks/AgentNexus-M1.6.1').resolve())
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(value,encoding='utf-8')
def copy_once(source,dest):
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():assert digest(dest)==digest(source),str(dest)
    else:shutil.copyfile(source,dest)
def archive(base,dest):
    manifest=inventory(base)
    if not dest.exists():
        dest.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(dest,'x',zipfile.ZIP_DEFLATED,compresslevel=3,allowZip64=True) as z:
            for entry in manifest:z.write(base/entry['path'],entry['path'])
        save(dest.with_suffix(dest.suffix+'.manifest.json'),dict(files=manifest,set_sha256=aggregate(manifest),symlink_directories_not_followed=True),exclusive=True)
    with zipfile.ZipFile(dest) as z:
        assert len(z.infolist())==len(manifest)
        for entry in manifest:
            h=hashlib.sha256()
            with z.open(entry['path']) as f:
                for b in iter(lambda:f.read(1048576),b''):h.update(b)
            assert h.hexdigest()==entry['sha256']
    return dict(path=dest.relative_to(OUT).as_posix(),sha256=digest(dest),members=len(manifest),verified=True)
def capture_runs():
    runs=[]
    for group in ['baseline','storage-01','stabilization-01','final-v1','final-v2','final-v3','final-v4']:
        for run in sorted((RUNTIME/group/'verification').glob('*')):
            if not (run/'results.json').exists():continue
            dest=OUT/'evidence/runs'/(group+'-'+run.name);dest.mkdir(parents=True,exist_ok=True)
            for p in run.iterdir():
                if p.is_file():copy_once(p,dest/p.name)
            snapshots={}
            for folder in ['workspace','data']:
                if (run/folder).exists():snapshots[folder]=archive(run/folder,dest/(folder+'.zip'))
            result=json.loads((run/'results.json').read_text('utf-8'))
            runs.append(dict(group=group,run=run.name,path=dest.relative_to(OUT).as_posix(),source_set_sha256=result['source_set_sha256'],counts=result['summary']['counts'],exit_code=result['exit_code'],tsc=result['tsc'],syntax_pass=result['syntax_pass'],snapshots=snapshots))
    for group in ['historical-failures','storage-review','drafts-01','integration-02','integration-03','integration-04','breakaway-copy-01']:
        if (RUNTIME/group).exists():archive(RUNTIME/group,OUT/'evidence/runtime-archives'/(group+'.zip'))
    proof=RUNTIME/'toolchain/powershell-copy-evidence.json'
    if proof.exists():copy_once(proof,OUT/'evidence/environment/powershell-copy-evidence.json')
    if (RUNTIME/'toolchain/powershell-copy-manifest.json').exists():copy_once(RUNTIME/'toolchain/powershell-copy-manifest.json',OUT/'evidence/environment/powershell-copy-manifest.json')
    copy_once(RUNTIME/'governance-01.txt',OUT/'evidence/governance-check.txt')
    save(OUT/'run-history.json',dict(schema='agentnexus/m161/run-history/1',runs=runs,all_prior_failures_retained=True))
    return runs
def preservation():
    frozen=json.loads((OUT/'evidence/baseline/freeze.json').read_text('utf-8'));changed=[]
    for f in frozen['protected_files']:
        p=ROOT/f['path']
        if not p.is_file() or digest(p)!=f['sha256']:changed.append(f['path'])
    oldtests=[f for f in frozen['source_files'] if f['path'].startswith('tests/')]
    changed_tests=[f['path'] for f in oldtests if digest(SOURCE/f['path'])!=f['sha256']]
    proof=dict(status='PASS' if not changed and not changed_tests else 'FAIL',protected_files=len(frozen['protected_files']),changed=changed,original_test_and_fixture_files=len(oldtests),changed_original_tests=changed_tests)
    save(OUT/'preservation-verification.json',proof);assert proof['status']=='PASS';return proof
def summarize():
    runs=capture_runs();run=next(r for r in runs if r['group']=='final-v4');result=json.loads((OUT/run['path']/'results.json').read_text('utf-8'))
    manifest=inventory(SOURCE);source_hash=aggregate(manifest);assert source_hash==result['source_set_sha256']
    save(OUT/'source-sha256.json',dict(files=manifest,set_sha256=source_hash))
    new=[c for c in result['cases'] if '/m161-' in c.get('file','').replace('\\','/')]
    counts=Counter(c['status'] for c in new);fails=[c for c in result['cases'] if c['type']=='test:fail'];cpu=next(c for c in result['cases'] if 'cumulative Job CPU time kills' in c['name']);breakaway=next(c for c in result['cases'] if 'CREATE_BREAKAWAY_FROM_JOB' in c['name'])
    proof=preservation();git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
    acceptance=dict(schema='agentnexus/m161/acceptance/1',observed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),scope='LOCAL_TRUSTED_LIBRARY_NATIVE_STABILIZATION',source_files=len(manifest),source_set_sha256=source_hash,git_branch=git('branch','--show-current'),git_head=git('rev-parse','HEAD'),commit_push_performed=False,
      local_stabilization='PASS' if counts.get('FAIL',0)==0 and counts.get('PASS',0)==len(new) else 'FAIL',production='BLOCKED',provider='SIMULATED',strict_cpu='BLOCKED',
      all_tests=result['summary']['counts'],new_tests=dict(total=len(new),**counts),regression='FAIL' if fails else 'PASS_WITH_NOT_RUN' if result['summary']['counts']['skipped'] else 'PASS',strict_typescript=result['tsc'],node_syntax='PASS' if result['syntax_pass'] else 'FAIL',
      legacy_cpu_case=cpu['status'],legacy_cpu_pass_is_not_qualification=True,cpu_historical_m151='56 FAIL / 2 PASS, unchanged; matrix not rerun',breakaway_case=breakaway['status'],failures=fails,raw_run=run['path'],preservation=proof,
      governance='PASS',independent_review=json.loads((OUT/'evidence/independent-review/review.json').read_text('utf-8'))['status'],remaining_limits=[
        dict(id='L-LEGACY-TOCTOU',status='FAIL',detail='Untouched legacy TOCTOU oracle rejects WIN32_1921 during concurrent replacement; new observed real-attack fixture PASS is reported separately, not substituted.'),
        dict(id='L-CPU',status='BLOCKED',detail='Strict cumulative CPU contract unqualified; original budgets/tolerances/history unchanged, CPU_RATE/deadline cannot replace it.'),
        dict(id='L-OS',status='BLOCKED',detail='Trusted local library is not a hostile-process sandbox or qualified production deployment.'),
        dict(id='L-POWER',status='NOT_RUN',detail='Real Node process termination/reopen tested; Windows reboot, power loss and directory durability not qualified.'),
        dict(id='L-PROVIDER',status='SIMULATED',detail='No real Provider/credential/key/cost; all mock usage explicitly simulated.'),
        dict(id='L-UNKNOWN',status='BLOCKED',detail='Explicit file reconciliation does not itself release old Gateway/Worker/unknown resources; no automatic replay.'),
        dict(id='L-GC',status='NOT_RUN',detail='No automatic version/Artifact GC, deletion proof, or disk ownership destruction; capacity retained conservatively.'),
        dict(id='L-LONG-RUN',status='NOT_RUN',detail='No long-term resident service, autonomous priority coordinator, Git watcher or full M1.7 autonomy qualification.'),
        dict(id='L-MULTI-FILE',status='NOT_RUN',detail='Gate-to-write bridge binds one file Artifact hash; no distributed or multi-file transaction claim.')])
    save(OUT/'acceptance.json',acceptance);save(OUT/'test-results.json',result);save(OUT/'native-test-results.json',dict(schema='agentnexus/m161/new-tests/1',source_set_sha256=source_hash,counts=acceptance['new_tests'],cases=new))
    save(OUT/'issue-ledger.json',dict(schema='agentnexus/m161/issues/1',historical_ledger='evidence/baseline/m16-issue-ledger.json',inherited_failures_preserved=True,remaining_limits=acceptance['remaining_limits'],independent_findings='evidence/independent-review/review.json'))
    save(OUT/'resource-qualification.json',dict(scope='LOCAL_TRUSTED_LIBRARY',strict_cpu='BLOCKED',windows_production='BLOCKED',provider='SIMULATED',actual_local_file_publication='PASS' if acceptance['local_stabilization']=='PASS' else 'SEE_TEST_RESULTS',persistent_capacity_owner='PROJECT_PLATFORM_STORAGE_CLAIMS',unknown_auto_release=False,hardware_power_loss='NOT_RUN',os_reboot='NOT_RUN'))
    original={f['path']:f for f in json.loads((OUT/'evidence/baseline/freeze.json').read_text('utf-8'))['source_files']};current={f['path']:f for f in manifest}
    save(OUT/'change-record.json',dict(baseline_source_set_sha256='242bf84892d7db9539baa5fca36119af97aa658cf0757ba97c58a17190542f80',final_source_set_sha256=source_hash,added=[p for p in current if p not in original],changed=[p for p in current if p in original and current[p]['sha256']!=original[p]['sha256']],deleted=[p for p in original if p not in current],original_tests_changed=proof['changed_original_tests']))
    c=acceptance['all_tests'];n=acceptance['new_tests'];assert acceptance['local_stabilization']=='PASS'
    text(OUT/'acceptance-report.md',f'''# M1.6.1 最终验收

本地 Native Harness 稳定性范围 **{acceptance['local_stabilization']}**。完整回归 **{acceptance['regression']}**；严格累计 CPU 与完整生产执行 **BLOCKED**；Provider 全部 **SIMULATED**。

- 完整原始测试：{c['tests']} 项，{c['passed']} PASS、{c['skipped']} NOT_RUN、{c['failed']} FAIL。
- 本轮新增：{n['total']} 项，{n.get('PASS',0)} PASS、{n.get('FAIL',0)} FAIL。
- strict TypeScript / Node syntax：{result['tsc']} / {'PASS' if result['syntax_pass'] else 'FAIL'}。
- 140 文件候选集合：`{source_hash}`；原始运行 [TAP]({run['path']}/all-tests.tap)、[JSON]({run['path']}/results.json)。
- {proof['protected_files']} 个历史文件及 {proof['original_test_and_fixture_files']} 个继承测试/fixture 逐 SHA 相同；原 FAIL 和所有迭代失败均保留。治理实际 PASS，独立审查另附。

当次继承 CPU 弱断言为 **{cpu['status']}**，严格资格不因此升级；M1.5.1 56 FAIL/2 PASS及M1.6原29062500 ticks/DEADLINE永久保留。保留的旧TOCTOU测试本次因未列入旧allowlist的WIN32_1921仍为FAIL；新增真实Junction攻击安装、原生拒绝、并发与恢复单独PASS，不替代原FAIL。

原 CREATE_BREAKAWAY 夹具曾在捆绑 PowerShell WindowsApps 路径以 WIN32_5 失败；相同 executable SHA256 的隔离工作区副本按原断言复验，最终 **{breakaway['status']}**。这是工具路径环境差异，不是删除/修改旧测试；底层具体ACL机制仍未断言。

已交付持久写入 intent/temp/publish/ACK/显式核对、真实文件与Artifact/Audit关联、持久磁盘owner转交、精确输入/provenance重建、Task与消息事务交接、可恢复消息草稿、固定规则版本、真实检查器Gate及实际写入候选绑定、五角色并发与跨项目授权通知。

真实进程终止与本地文件/SQLite/Zstd为实际验证；ENOSPC/EACCES/EIO、调度barrier与Mock模型是明确注入/模拟。没有OS重启、断电、跨账户生产部署、真实Provider或科研实验。旧Gateway/Worker仍未知时不会因为文件确认而自动释放/重试；历史存储GC、长期自治、全平台隔离和多文件事务仍未资格。

未改OS账户/ACL/系统策略、根实现或其他科研项目；未读API Key、连接真实Provider、安装hooks或Commit/Push。
''')
    text(OUT/'README.md',f'''# AgentNexus M1.6.1 — Native Harness Stabilization

可信本地稳定性范围已实现并验证；严格CPU及完整生产链BLOCKED，Provider均SIMULATED。[最终验收](acceptance-report.md)列出实际结果和全部限制。

| 交付 | 入口 |
|---|---|
| 总体与冻结 | [总体报告](overall-report.md)、[Phase 0](phase0-report.md)、[ADR](adr.md) |
| 历史失败与真实边界 | [历史FAIL](historical-failures-report.md)、[TOCTOU](toctou-report.md) |
| Storage | [Owner](storage-owner.md)、[Recovery](storage-recovery-report.md) |
| Context / Message / Scheduler | [来源](context-provenance.md)、[消息](message-reliability-report.md)、[恢复](task-scheduler-recovery-report.md) |
| Rules / Gates | [Compiler](rules-compiler.md)、[Gate Engine](gate-runtime.md) |
| 五角色与目录 | [角色验证](five-agent-verification.md)、[Feature](feature-catalog.md)、[Policy](policy-catalog.md) |
| 独立审查与后续 | [独立审查](independent-code-review.md)、[M1.7](m17-recommendations.md) |
| 源码/测试/证据 | [source](source/)、[源码ZIP](AgentNexus-M1.6.1-source.zip)、[源码SHA](source-sha256.json)、[运行历史](run-history.json) |

最终 {c['tests']} 项：{c['passed']} PASS / {c['skipped']} NOT_RUN / {c['failed']} FAIL；新增 {n['total']}/{n['total']} PASS。strict TypeScript与语法PASS。全部继承测试原字节保留，CPU偶然通过旧弱断言不升级严格资格。

复验使用Node24.15.0、TS5.9.3/@types-node24.10.1已有隔离工具，无新增运行依赖或网络安装。设置AGENTNEXUS_TYPE_TOOLS、AGENTNEXUS_TEST_PYTHON_PATH、AGENTNEXUS_TEST_POWERSHELL_PATH为既有明确解释器；WindowsApps工具路径限制见environment证据。输出必须位于source之外：

```powershell
node source/tools/agentnexus/verify-m161.mjs --output-root I:\\AI_AgentNexus\\.workflow-kit\\runtime\\AgentNexus-M1.6.1\\recheck --suite all
```

亦支持stabilization/storage/native子集。每次创建独立source/data/TAP/JSON/strict/SHA快照。生产资格与Provider状态不随测试偶然全绿改变。
''')
    text(OUT/'phase0-report.md',f'''# Phase 0 基线冻结

当前分支main，HEAD `{acceptance['git_head']}`；最初工作树干净，无Commit/Push。根AGENTS已读；无project-rules索引；项目workflow路由无额外匹配流程；policy.json已读，未改规则或启用增强模块。

M1.6的123文件与原集合 `242bf84892d7db9539baa5fca36119af97aa658cf0757ba97c58a17190542f80`完全一致后复制到独立source。冻结{proof['protected_files']}历史文件；原完整验收、Issue Ledger、资格、原始380测试结果复制为baseline原件。完整M1.6复验380=350PASS/27NOT_RUN/3FAIL，strict与syntax PASS；两个原FAIL和新增工具路径失败均保留。

阅读覆盖M1.6 README/验收/逐字独立审查、设计/Workflow/Feature/Policy/ADR/issues、M1.5.1 CPU根因与资格、M0/M0.1相关合同、实际实现和测试。团队实际阅读/片段审阅范围按组件read-manifest逐路径SHA登记；语义审查是定向模块审查，不冒充所有历史C#/OS部署代码逐行独立审阅。全123文件的源扫描、严格类型/语法和完整原回归单独提供全量证据。

开放边界：严格CPU、完整生产OS隔离、未知Worker释放、真实Provider/费用、硬断电/OS重启、长期自治与GC。最终保持状态见acceptance.json。历史和原始测试逐SHA复验PASS。
''')
    text(OUT/'overall-report.md',f'''# M1.6.1 总体报告

独立140文件交付，集合 `{source_hash}`。总体限定为可信本地Native Harness；新增{n['total']}项全通过，完整回归结果以最终验收为准。没有重新开发M1.6或替换其历史证据。

Storage建立真实持久写入状态机、原子建名/替换、文件身份/hash核验、Artifact/Audit一致性、显式恢复与持久容量转交。Context保留精确输入和manifest；消息接纳/ACK/处理/完成分开，草稿可从已知内部未发送状态恢复；Task拥有稳定完整合同、持久handoff计划和冻结规则。

规则只对显式有限DSL编译机械条件；普通文本保留阅读/模型/人工类别。Native Gate从真实Artifact、可信checker与人工授权记录计算状态，并由Scheduler约束实际候选文件。关闭门是BYPASSED，不能取得受保护许可。

五角色和两个并行子Agent、Reviewer只读、Resident通知、Coordinator受限跨项目状态/通知、跨项目预算竞争均有实际本地协议验证；模型仍是Mock。共享Artifact的2活动/16等待队列解决真实并发背压；读写资源循环依赖的独立发现以提前释放读槽修正。旧API拒第三流合同保留。

全部新发现、修前复现、各轮FAIL、修后证据和最终源码绑定在独立审查与运行历史中。未将文件确认当作生产退出证明，未放开CPU严格资格，未读取密钥或启动科研/真实Provider。
''')
    text(OUT/'five-agent-verification.md','''# 五角色稳定性验证

`m161-harness.test.ts`真实创建五类逻辑Agent并发执行，保持独立task/context/budget；原m16-harness全部27测试保留。Mock响应、用量和费用明确SIMULATED，本地SQLite/Zstd/消息/资源程序实际运行。

- Resident：模型调用前0请求，授权消息/事件驱动，等待恢复不自动调用模型。
- Development：消息整合、依赖、显式子任务handoff与Task验收，原始来源与版本固定。
- Subagent：两个独立上下文/任务/预算并行，双向和授权同级消息；无多次Task执行。
- Reviewer：只读工具/工作角色程序拒绝写权限，diff/commit/candidate/作者绑定；Gate G4核真实独立Reviewer身份和可信checker。
- Coordinator：仅可信read_projects授予的跨项目状态摘要和固定INTERNAL通知；不读外项目原文，不取得管理/正式决策/写入能力。

多项目竞争同一Platform worker槽会持久WAITING_RESOURCES；释放有证据的已知任务后，原reservation只派发一次。五角色并发过程中消息ACK与Task完成分开，所有receipt最终COMPLETED且无未知资源遗失。

实际Host子进程kill覆盖消息lease、交接ACK和未完成草稿，Storage另有11个实际进程中断窗口。OS重启、硬断电、长期resident/自动优先级Coordinator、Git watcher和生产Worker隔离NOT_RUN/BLOCKED，不以这些有限测试冒充。
''')
    text(OUT/'feature-catalog.md','''# Feature Catalog M1.6.1

完整机器目录为source/config/agentnexus/features.json，共193项；目录存在不等于全部实现。新增三个模块均只由可信bootstrap注册，关闭不放开安全能力。

| Feature | 实际owner / 范围 |
|---|---|
| native.storage-owner | 真实本地持久文件事务、身份/hash、ACK、显式恢复；OFF拒新写并保留UNKNOWN |
| native.rules-compiler | 有限DSL、原文来源、固定registry/version/hash/epochs/workflow；OFF拒新编译 |
| native.gate-engine | 真实证据/可信checker计算；OFF=BYPASSED/禁止protected许可 |

现有Context/Message/Model/Workflow/Scheduler/Resource/五角色沿用原Feature ID，新实现与最终证据单独绑定。没有凭Feature ON提高严格CPU或生产OS资格。全目录原M1.6测试映射未被用作本轮新功能的实际证据。
''')
    text(OUT/'policy-catalog.md','''# Policy Catalog M1.6.1

保留原52个policy身份及原security断言。没有通过修改数量断言或引入可降级owner放宽安全合同。完整机器目录及m161_enforcement_bindings在source/config/agentnexus/policies.json。

- P.WORKFLOW_BINDING：Rule Registry/Task版本与Native Gate实际许可绑定；独立owner，不受应用DISABLED模式撤销。
- P.TOOL_CONTRACT / P.ARTIFACT_INTEGRITY：Storage精确operation、consumed approval/permit、冻结source和实际hash；所有工具仍过原Gateway。
- P.RESOURCE_ADMISSION / P.RESOURCE_RELEASE：三级原子预留与持久容量owner转交；UNKNOWN不自动释放。
- P.CONTEXT_PROVENANCE：原文、精确模型输入、manifest与来源hash；摘要不替代原始记录。
- P.MESSAGE_DELIVERY：可信身份、显式授权、接纳/ACK事务与Task派生完成；Coordinator仅固定授权通知。
- P.AUDIT_REQUIRED / P.EVIDENCE_DOMAINS：文件intent、publish、ACK、原文、产物与正式决定分域关联。

原P.FILE_BROKER生产句柄边界仍按原资格；新的本地Storage路径检查不冒充恶意同账户OS隔离。三模式、模型切换、Gate关闭或模拟计费均不能扩大权限。
''')
    text(ROOT/'.workflow-kit/tasks/AgentNexus-M1.6.1/README.md',f'''# AgentNexus M1.6.1

交付入口：[README](../../../deliverables/AgentNexus-M1.6.1/README.md)。最终source集合 `{source_hash}`；完整原始证据、历史保全、独立审查和限制均随交付。无Commit/Push或规则修改。
''')
    print(json.dumps(dict(source_set_sha256=source_hash,all_tests=c,new_tests=n,regression=acceptance['regression'],preservation=proof)))
def package():
    proof=preservation();manifest=inventory(SOURCE);expected=json.loads((OUT/'source-sha256.json').read_text('utf-8'));assert manifest==expected['files']
    zipproof=archive(SOURCE,OUT/'AgentNexus-M1.6.1-source.zip');text(OUT/'AgentNexus-M1.6.1-source.zip.sha256',zipproof['sha256']+'  AgentNexus-M1.6.1-source.zip\n')
    # Same rule engine classification for every final added delivery/task path; full root check retained separately.
    spec=importlib.util.spec_from_file_location('project_govern',ROOT/'ai-workflow-kit-v4/tools/govern.py');govern=importlib.util.module_from_spec(spec);spec.loader.exec_module(govern)
    state=govern.active_state(ROOT);policy=govern.load(ROOT,govern.POLICY);checks=[]
    for p in list(regulars(OUT))+list(regulars(ROOT/'.workflow-kit/tasks/AgentNexus-M1.6.1')):
        rel=p.relative_to(ROOT).as_posix();govern.path_at(ROOT,rel);category=govern.classify(rel,policy,state);assert category is not None,rel;checks.append(dict(path=rel,category=category))
    assert digest(ROOT/'AGENTS.md')==state['protected_rules']['AGENTS.md']
    save(OUT/'evidence/governance-final-added-paths.json',dict(status='PASS',scope='FINAL_ADDED_PATH_CLASSIFICATION_AND_PROTECTED_RULE_HASH',full_root_check='governance-check.txt',checks=checks))
    review=json.loads((OUT/'evidence/independent-review/review.json').read_text('utf-8'));assert review['source_set_sha256']==expected['set_sha256']
    acceptance=json.loads((OUT/'acceptance.json').read_text('utf-8'));assert acceptance['source_set_sha256']==expected['set_sha256']
    save(OUT/'verification.json',dict(status='PASS',scope='SOURCE_ARCHIVE_HASH_AND_DELIVERY_EVIDENCE_VERIFICATION',source_files=len(manifest),source_set_sha256=expected['set_sha256'],source_zip=zipproof,
      preservation=proof,governance='PASS',independent_review=review['status'],full_regression=acceptance['regression'],new_tests=acceptance['new_tests'],strict_typescript=acceptance['strict_typescript'],node_syntax=acceptance['node_syntax'],cpu='BLOCKED',production='BLOCKED'))
    excluded={'delivery-manifest.json','SHA256SUMS.txt'};files=[f for f in inventory(OUT) if f['path'] not in excluded]
    save(OUT/'delivery-manifest.json',dict(files=files,set_sha256=aggregate(files),self_excluded=sorted(excluded)))
    text(OUT/'SHA256SUMS.txt',''.join(f['sha256']+'  '+f['path']+'\n' for f in files))
    assert all(digest(OUT/f['path'])==f['sha256'] for f in files)
    print(json.dumps(dict(source_files=len(manifest),source_set_sha256=expected['set_sha256'],zip=zipproof,delivery_files=len(files),preservation=proof,final_hashes_verified=True)))
if __name__=='__main__':{'summarize':summarize,'package':package,'preserve':lambda:print(json.dumps(preservation()))}[sys.argv[1]]()
