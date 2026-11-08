"""Build the M1.8.2 report from retained runs. Never changes earlier deliveries."""
from __future__ import annotations
import datetime, difflib, hashlib, json, pathlib, re, runpy, shutil, sys
sys.dont_write_bytecode = True
M = runpy.run_path(str(pathlib.Path(__file__).with_name('m182-delivery.py')))
ROOT, OUT, RUN, BASE = (M[key] for key in ('ROOT', 'OUT', 'RUN', 'BASE'))
digest, write = M['digest'], M['write']

def load(path): return json.loads(path.read_text(encoding='utf-8-sig'))
def md(name, text):
    path = OUT / name; path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as stream: stream.write(text.strip() + '\n')
def copy(source, target):
    path = OUT / target; path.parent.mkdir(parents=True, exist_ok=True)
    with source.open('rb') as source_stream, path.open('xb') as dest: shutil.copyfileobj(source_stream, dest)
def case_map(result): return {row['name']: row for row in result['cases']}
def short_case(row):
    return None if row is None else dict(status=row.get('status', 'SKIP' if row.get('skip') else 'PASS' if row['type']=='test:pass' else 'FAIL'),
        error=row.get('details', {}).get('error'), file=row.get('file'), line=row.get('line'))
def latest(directory):
    paths = sorted(directory.glob('r-*/results.json')); assert len(paths)==1, paths
    return paths[0].parent

def capture_run(label, path):
    names = ['run.json','results.json','source-manifest.json','syntax.json','typecheck.json','tsc.stdout.txt','tsc.stderr.txt',
        'all-tests.tap','events.jsonl','runner.stderr.txt']
    for name in names:
        if (path/name).is_file(): copy(path/name, 'evidence/verification/'+label+'/'+name)
    result=load(path/'results.json')
    return dict(label=label, retained='evidence/verification/'+label, original=str(path), source_set_sha256=result['source_set_sha256'],
        status=result['status'], syntax_pass=result['syntax_pass'], tsc=result['tsc'], tests=result['tests'], counts=result['summary']['counts'])

def literal_contracts():
    """Add literal historical test bodies; derived summaries are not raw results."""
    path=OUT/'evidence/failure-matrix.json'; document=load(path)
    for row in document['rows']:
        raw=(BASE/'source'/row['test_file']).read_bytes(); lines=raw.splitlines(keepends=True)
        start=row['line']-1; end=len(lines)
        for index in range(start+1,len(lines)):
            if re.match(rb'^(?:test\(|for\()',lines[index]): end=index; break
        excerpt=b''.join(lines[start:end]); relative='evidence/test-contracts/'+row['test_id']+'.txt'
        target=OUT/relative; target.parent.mkdir(parents=True,exist_ok=True)
        with target.open('xb') as stream: stream.write(excerpt)
        row['original_assertion_summary']=row['original_assertion']
        row['original_assertion']=''.join(line.decode('utf-8') for line in lines[start:end] if b'assert.' in line)
        row['original_test_contract']=dict(artifact=relative,sha256=hashlib.sha256(excerpt).hexdigest(),
            source=row['test_file'],start_line=start+1,end_line=end,bytes=len(excerpt),unchanged_bytes=True)
    path.write_text(json.dumps(document,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    ledger_path=OUT/'historical-issue-ledger.json'; ledger=load(ledger_path); ledger['original_14']=document['rows']
    ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    report=OUT/'reports/failure-adjudication.md'
    text=report.read_text(encoding='utf-8').replace('原断言：','断言摘要：')
    text+='\n## 原始合同字节片段\n\n以下片段按原M1.8.1测试文件行界提取，保留原换行字节和断言；机器矩阵还保留原始错误全文及五组结果。\n\n'
    text+='\n'.join('- ['+row['test_id']+'](../'+row['original_test_contract']['artifact']+') — `'+row['test_file']+':'+str(row['line'])+'`' for row in document['rows'])+'\n'
    report.write_text(text,encoding='utf-8',newline='\n')
    print(json.dumps(dict(literal_historical_contracts=len(document['rows']),status='PASS')))

def build():
    final_path=latest(RUN/'final-verification'); final=load(final_path/'results.json')
    frozen=load(RUN/'candidate-freeze.json')
    assert final['source_set_sha256']==frozen['set_sha256']==final['source_snapshot_after_sha256']
    assert final['source_snapshot_stable'] and final['syntax_pass'] and final['tsc']=='PASS'
    fresh=[row for row in final['cases'] if row['name'].startswith('M182 ')]; assert len(fresh)==14 and all(row['type']=='test:pass' for row in fresh)
    m18pub=ROOT/'deliverables/AgentNexus-M1.8/evidence/verification'
    m181old=BASE/'evidence/verification/final-verification/r-47aaf595f735'
    rerun=latest(RUN/'baseline-verification'); control=latest(RUN/'m18-control'); pre=latest(RUN/'model-verification')
    original=load(m181old/'results.json'); old18=load(m18pub/'results.json'); repeated=load(rerun/'results.json'); controlled=load(control/'results.json')
    runs=[capture_run(label,path) for label,path in [('m18-published',m18pub),('m181-original',m181old),('m181-rerun',rerun),('m18-control',control),('m182-before-fixture-repair',pre),('m182-final',final_path)]]
    write(OUT/'evidence/verification-attempts.json', runs)
    copy(RUN/'candidate-freeze.json','evidence/candidate-freeze.json')
    observations={
        'filesystem':RUN/'probes-rUf9hH/filesystem.json','storage':RUN/'probes-rUf9hH/storage.json',
        'native-paths':RUN/'probes-RYg2rE/native-paths.json','vault-initial':RUN/'probes-VXz7mJ/vault-isolation.json',
        'vault-final':RUN/'probes-sm8PXV/vault-isolation.json','reader-denial':RUN/'probes-hnGhOi/reader-denial.json','host-acl':RUN/'host-acl.json',
    }
    for label,path in observations.items(): copy(path,'evidence/probes/'+label+'.json')
    probe_index=[]
    for directory in sorted(RUN.glob('probes-*')):
        for path in sorted(directory.rglob('*')):
            if path.is_file() and path.suffix in {'.json','.jsonl'}:
                probe_index.append(dict(path=str(path),bytes=path.stat().st_size,sha256=digest(path)))
    write(OUT/'evidence/probes/raw-index.json',probe_index)
    drafts=RUN/'request-drafts-6uuNUy'; request_index=load(drafts/'request-index.json')
    copy(drafts/'request-index.json','evidence/requests/request-index.json'); copy(drafts/'audit.jsonl','evidence/requests/audit.jsonl')
    for request in request_index['requests']:
        for name in ['body.json','context.txt','review.json','decisions.json']: copy(drafts/request['request_id']/name,'evidence/requests/'+request['request_id']+'/'+name)
        assert digest(drafts/request['body_file'])==request['body_hash']
        assert digest(drafts/request['context_file'])==request['context_hash']
    maps={key:case_map(value) for key,value in [('m18_published',old18),('m181_original',original),('m181_rerun',repeated),('m18_same_environment',controlled),('m182_final',final)]}
    failures=[row for row in original['cases'] if row['type']=='test:fail']; assert len(failures)==14
    assertions=["assert.ok(swaps>0,'fixture must actually install junction replacements')",
        'rpc.good primitive.prepare / primitive.resume requires ok=true; packet.created=false and win32_error=5',
        "execute(h).state === 'SUCCEEDED'; published bytes === approved A",
        "result.state === 'SUCCEEDED'; exact hash / Audit ACK / persistent budget ownership",
        "first and replacement execute(h).state === 'SUCCEEDED'; retained original artifact / exact version",
        "execute(h).state === 'SUCCEEDED'; streamed 3MiB file size/hash",
        "after injected UNLINK_TEMP interruption: target nlink=2; explicit reconciliation nlink=1",
        "first writer state === 'SUCCEEDED'; second state FAILED / WORKSPACE_BUSY",
        "w.reason === 'STORAGE_PUBLICATION_CHANGED_BEFORE_ACK'",
        "first write SUCCEEDED; second exceeds persistent quota before temporary object",
        'child must reach and send operation_id at UNLINK_TEMP; recovery RECONCILED without republishing',
        'child must reach and send operation_id at PUBLISHED; recovery RECONCILED without republishing',
        'child must reach and send operation_id at AUDIT_ACKNOWLEDGED; original ACK remains',
        "runPilot report.status === 'PASS'; managed publication/review/repair/restore/gates",
    ]
    matrix=[]
    for index,row in enumerate(failures):
        leaf=pathlib.PureWindowsPath(row['file']).name; rel='tests/agentnexus/'+leaf
        before=BASE/'source'/rel; same=(ROOT/'deliverables/AgentNexus-M1.8/source'/rel).read_bytes()==before.read_bytes()
        assert same and maps['m18_same_environment'][row['name']]['type']=='test:fail'
        if index==0:
            category='ENVIRONMENT_LIMITATION'; reason='原fixture swaps=0；当前真实junction创建EPERM，rename对照成功。缺少攻击切换前提，未执行有效junction竞争，不能推出TOCTOU资格。'
            plan='在经批准且允许junction夹具的隔离部署复跑原合同；不更改swaps>0断言。'
            evidence=['evidence/probes/filesystem.json','evidence/verification/m18-control/all-tests.tap']
        elif index==1:
            category='TEST_FIXTURE_ERROR'; reason='选入WindowsApps的pwsh.exe无法通过native目录句柄锚定，primitive.prepare先报NtCreateFile WIN32_5，尚未运行breakaway断言。相同broker读Node路径到达FILE_LIMIT，读该pwsh路径复现WIN32_5。历史M1.8交付也失败。'
            plan='选择已授权、可由固定broker锚定的PowerShell部署，核对可执行文件/依赖哈希与权限，再原样验证breakaway。当前不安装或改系统。'
            evidence=['evidence/probes/native-paths.json','evidence/verification/m18-published/all-tests.tap']
        else:
            category='ENVIRONMENT_LIMITATION'; reason='StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。'
            plan='在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。'
            evidence=['evidence/probes/storage.json','evidence/probes/filesystem.json','evidence/verification/m18-control/all-tests.tap']
        matrix.append(dict(test_id=f'M182-HIST-{index+1:02}',test_name=row['name'],test_file=rel,line=row['line'],original_assertion=assertions[index],
            original_error=row['details']['error'],classification=category,historical_relation='HISTORICAL_FAILURE_IN_SAME_ENVIRONMENT',
            results={key:short_case(value.get(row['name'])) for key,value in maps.items()},test_source_identical_m18_m181=same,
            test_source_sha256=digest(before),root_cause=reason,is_new_m181_regression=False,product_fix_required=False,
            deployment_or_fixture_remediation_required=True,security_impact='安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。',
            real_provider_impact='不直接改变Host HTTP协议；' + ('PROCESS组合资格保持BLOCKED。' if index<2 else '直接阻断Native Pilot受管源码发布与恢复。'),
            disposition='KEEP_ORIGINAL_FAIL',fix_plan=plan,acceptance_criteria='在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。',evidence=evidence))
    write(OUT/'evidence/failure-matrix.json',dict(schema='agentnexus/m1.8.2/failure-matrix/1',original_failures=14,
        new_m181_regressions_proven=0,rows=matrix,classification_catalog=['REGRESSION_BUG','HISTORICAL_FAILURE','ENVIRONMENT_LIMITATION','TEST_FIXTURE_ERROR','TEST_CONTRACT_ERROR','OS_BEHAVIOR_LIMITATION','INCONCLUSIVE']))
    extra=[row for row in repeated['cases'] if row['type']=='test:fail' and row['name'] not in {r['name'] for r in failures}]
    write(OUT/'evidence/additional-historical-observations.json',dict(rows=[dict(test=row['name'],classification='OS_BEHAVIOR_LIMITATION',
        original_error=row['details']['error'],results={key:short_case(value.get(row['name'])) for key,value in maps.items()},
        qualification='BLOCKED',reason='已知Job累计用户态CPU限制未构成严格累计CPU保证；本次忙循环到deadline仍由helper终止，观察28281250 ticks；分次PASS不关闭该资格。') for row in extra]))
    source_equal=[]
    for name in ['harness/storage-owner.ts','resources/budget-manager.ts','harness/scheduler.ts','harness/pilot-run.ts','harness/context.ts','production/windows/NativeRuntime.cs','bootstrap/config.ts','model-runtime/vault.ts']:
        left=ROOT/'deliverables/AgentNexus-M1.8/source/src/agentnexus'/name; right=BASE/'source/src/agentnexus'/name
        source_equal.append(dict(path='src/agentnexus/'+name,m18_sha256=digest(left),m181_sha256=digest(right),identical=left.read_bytes()==right.read_bytes()))
    assert all(row['identical'] for row in source_equal); write(OUT/'evidence/failure-chain-source-equality.json',source_equal)
    old_fixture=(BASE/'source/tests/agentnexus/m18-review-fixes.test.ts').read_text(encoding='utf-8')
    new_fixture=(OUT/'source/tests/agentnexus/m18-review-fixes.test.ts').read_text(encoding='utf-8')
    suffix=lambda text:text.split('  const requests=Array.from({length:17}',1)[1].split('\n});',1)[0]
    assert suffix(old_fixture)==suffix(new_fixture)
    write(OUT/'evidence/test-fixture-repair/repair.json',dict(status='FIXED_VERIFIED',classification='TEST_FIXTURE_ERROR_AFTER_REQUIRED_GATE_UPGRADE',
        original= 'm18-review-fixes.before.test.ts',before_sha256=digest(BASE/'source/tests/agentnexus/m18-review-fixes.test.ts'),
        after_sha256=digest(OUT/'source/tests/agentnexus/m18-review-fixes.test.ts'),assertion_suffix_identical=True,
        retained_failure='evidence/verification/m182-before-fixture-repair/results.json',
        change='替换{}和仅哈希许可夹具，使用真实合成Context+生产adapter正文+每请求完整审阅；16成功/1拒绝/abandon后再入槽断言原字节保持。'))
    copy_text=''.join(difflib.unified_diff(old_fixture.splitlines(True),new_fixture.splitlines(True),fromfile='original',tofile='candidate'))
    md('evidence/test-fixture-repair/fixture.diff',copy_text)
    coverage=[]
    full_semantic={'adapters.ts','campaign.ts','deepseek.ts','egress.ts','gateway.ts','ledger.ts','protocol.ts','response-evidence.ts','streaming.ts','transport.ts','dpapi.ps1','m181-adapter.test.ts','m181-control.test.ts'}
    for row in load(RUN/'baseline.json')['baseline_source']:
        path=BASE/'source'/row['path']; text=path.read_text(encoding='utf-8'); assert hashlib.sha256(text.encode('utf-8')).hexdigest()==row['sha256'] or digest(path)==row['sha256']
        coverage.append(dict(**row,lines=len(text.splitlines()),read_mode='MACHINE_FULL_CONTENT_SCAN',
            semantic_review='FULL_TARGETED' if path.name in full_semantic else 'PARTIAL_OR_DEPENDENCY_SCAN',
            imports=re.findall(r"(?:from\s+|import\s*)['\"]([^'\"]+)['\"]",text),
            test_names=re.findall(r"test\(\s*['\"]([^'\"]+)['\"]",text)))
    write(OUT/'evidence/read-coverage.json',dict(files=coverage,scope='All 185 baseline source/config/test/tool files read as complete text; focused semantic review explicitly distinguished from full byte scan. Independent review coverage is separate.'))
    catalogs=[]
    catalog_paths=[ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0/architecture'/name for name in ['feature_catalog.json','policy_catalog.json']]
    catalog_paths += [ROOT/'.workflow-kit/tasks/AgentNexus-v0.4-M0.1/architecture'/name for name in ['feature_catalog.json','policy_catalog.json']]
    for version in ['M1.2','M1.3','M1.4','M1.5','M1.5.1','M1.6','M1.6.1','M1.7','M1.8','M1.8.1']:
        catalog_paths += [ROOT/f'deliverables/AgentNexus-{version}/source/config/agentnexus'/name for name in ['features.json','policies.json']]
    for path in catalog_paths:
        if not path.is_file(): continue
        value=load(path); rows=value.get('features',value.get('policies',[]))
        selected=[row for row in rows if any(term in row.get('id','').lower() for term in ['vault','credential','model','identity','audit','resource','native.storage','network'])]
        catalogs.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=digest(path),entries=len(rows),related_entries=selected))
    write(OUT/'evidence/catalog-reconciliation.json',catalogs)
    md('reports/phase0.md',f'''# Phase 0 基线冻结与读取

分支main，HEAD `{load(RUN/'baseline.json')['head']}`。起始工作树干净；本轮仅新增M1.8.2及根构建工具。M1.8.1 185文件集合SHA256 `d2091ef71fbd7a62f17ff8a42a922357759817073d97f1343d27b6ff7c9c3bb1`，其SHA256SUMS逐项无漂移；冻结16,040项历史文件。原始M1.8.1报告与全部FAIL均保留。

AGENTS、治理policy与工作流路由已读；project-rules/README不存在，registered_rules为空，没有额外always规则。M1.8/M1.8.1 README、完整验收、Vault资格、安全审查、官方核验、Data Egress和Token账本已读；M1.7 Native合同、M0/M0.1九项ADR和相关版本Feature/Policy登记纳入核查。完整文本机器扫描185文件的路径/哈希/导入/测试名见read-coverage.json；对模型链和失败链做语义复核，FULL_TARGETED与PARTIAL明确分开，完整机器读取不冒称每个继承文件已逐行语义审查。

未修改M1.8.1重跑681项：634 PASS /32 SKIP /15 FAIL；原版M1.8同环境640项：594 PASS /32 SKIP /14 FAIL。原14项在两个版本同环境均FAIL，相关六个测试文件与失败链八个运行时文件同字节。额外累计CPU测试在分次运行间变化，另册记录，不回填历史635/32/14。

当前候选189文件SHA `{frozen['set_sha256']}`。所有原始TAP、JSON、source manifests、syntax/typecheck及每次失败在evidence/verification独立目录。Windows、SQLite/Node、DPAPI均为真实本地探针；模型请求0。''')
    md('reports/failure-adjudication.md', '# M1.8.1 原14项FAIL逐项裁定\n\n原14项没有已证M1.8.1新增回归。13项裁为ENVIRONMENT_LIMITATION，1项为TEST_FIXTURE_ERROR；历史关系、每项原断言、原错误、五组结果、安全/Provider影响、整改与原验收标准均在[机器矩阵](../evidence/failure-matrix.json)。未改变任何原FAIL为PASS。\n\n' + '\n\n'.join(
        f"## {row['test_id']} — {row['test_name']}\n\n文件`{row['test_file']}:{row['line']}`；原断言：`{row['original_assertion']}`。\n\n裁定 **{row['classification']}**。{row['root_cause']} M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终{row['results']['m182_final']['status']}。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。\n\n{row['security_impact']} {row['real_provider_impact']}\n\n整改：{row['fix_plan']} 验收：{row['acceptance_criteria']}" for row in matrix))
    write(OUT/'historical-issue-ledger.json',dict(original_14=matrix,additional=load(OUT/'evidence/additional-historical-observations.json'),
        new_work=[dict(id='SEC-M182-001',status='FIXED_VERIFIED',issue='重复JSON键在审阅解析中丢失前值',evidence='evidence/reviews/'),
            dict(id='M182-REVIEW-KEY',status='FIXED_VERIFIED',issue='同正文不同request hash独立review原先冲突；改复合键'),
            dict(id='M182-EGRESS-HARDENING',status='FIXED_VERIFIED',issue='REAL不能用upload flag/旧hash-only grant绕过final review；verifier只接受true'),
            dict(id='M182-FIXTURE-01',status='FIXED_VERIFIED',issue='旧16-slot夹具升级；原断言不变',evidence='evidence/test-fixture-repair/repair.json')]))
    vault=load(observations['vault-final']); assert vault['same_sid'] and vault['ordinary_process_dpapi_decrypt'] and vault['exit']['code']==0
    md('reports/credential-vault-qualification.md','''# Credential Vault 生产资格

**BLOCKED；当前身份的真实OS隔离反例为FAIL。** 新建的合成DPAPI Vault关闭后，独立真实子进程直接打开其SQLite并用CurrentUser解密，SHA与父进程预期相等；native identity确认同SID，子进程close/exit=0。原始与强化探针后两次结果均保留。它不是部署过的Worker/Reviewer跨账户测试，也没有读取任何真实Key。

观察到当前进程为宿主AppContainer下同一用户SID，合成Vault目录/SQLite与源码ACL继承，未保护DACL，不能视作Host-only部署。未取得互异标准Host/Worker/Operator身份、固定代码/服务/helper ACL与启动证明，也未取得被拒绝的生产Worker访问证据。没有索取Key、启用masked录入、修改账户/ACL/AppContainer或触碰既有凭证库。

| 用户资格条件 | 本轮证据与状态 |
|---|---|
| Host可信入口取得凭证 | BLOCKED；LIVE入口在文件/解密前拒绝，可信交互尚未部署 |
| 普通Agent不能读Key | 受限facade接口测试PASS；同SID真实进程可解密合成凭证，OS隔离FAIL |
| Subagent不能读父凭证 | 合成scope/facade PASS；生产独立身份访问NOT_RUN |
| Reviewer不能访问Vault | 只读角色合同保留；实际独立Reviewer OS拒绝NOT_RUN |
| Worker不能读Vault文件 | 同SID反例失败；生产受限Worker拒绝NOT_RUN |
| Key不进Prompt/Archive/Audit/error | 已知合成secret门/编码/跨块测试PASS；真实Key从未输入，生产资格未获证 |
| Key不经argv/env/临时明文 | 探针只向helper匿名pipe传合成值；真实入口NOT_RUN，未通过这些通道传Key |
| 错误/过期/撤销handle | 继承synthetic租约/状态/主体测试PASS；生产NOT_RUN |
| 并发与轮换 | SQLite/异步撤销与轮换合成测试PASS；生产NOT_RUN |
| Host重启/异常退出恢复 | 合成reopen/UNKNOWN保持测试PASS；生产Host身份重启NOT_RUN |

Windows DPAPI按用户凭据绑定；Credential Manager的CredRead读取用户credential set，迁移到它不能独自解决同SID隔离。[DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata)、[CredRead](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credreada)。选择方向仍为独立Host-only服务+CurrentUser保护密文+受保护ACL+OS认证IPC，Agent仅获scoped completion，helper固定哈希且无任意endpoint/readSecret；这是一份部署方案，未实施。Ubuntu沿用跨平台CredentialProviderInterface，Secret Service规范本身不强制访问控制，必须另做平台资格。[规范边界](https://specifications.freedesktop.org/secret-service/latest/ch10.html)。

安全录入必须在已验真隔离Host中完成：本地masked界面直入可信服务，有界匿名pipe、内存最短持有、密文原子保存；只审计handle。当前缺该启动链，不能把一个输入框代码叫作安全入口。后续需要独立授权系统部署并以合成凭证先做所有角色的实际拒绝、撤销/轮换/重启组合试验，全部通过后再收真实Key。

[最终OS负证据](../evidence/probes/vault-final.json) · [ACL观察](../evidence/probes/host-acl.json) · [reader事前metadata拒绝](../evidence/probes/reader-denial.json)。''')
    md('reports/data-egress-qualification.md','''# Data Egress 最终资格

**离线程序语义PASS；生产组合资格BLOCKED。** 所有REAL准入现在必须有完整正文审阅记录：旧的仅Context/body/source哈希grant不足放行，uploads_project_source=true也不能跳过独立owner检查。Gateway仍在Assembly/重建与adapter构造后调用egress，Vault/网络前拒绝；HTTPS最终同步fence重新核对持久grant、expiry/revoke和完整request hash。

新approveReviewed仅Host admin可调用，还必须得到外部可信用户确认verifier的布尔true。完整review检查实际system/user消息、全部ContextEntry来源/范围/分类、完整tool schema、wire设置和headers；每个request hash单独登记。PUBLIC/SYNTHETIC才接受，INTERNAL/CONFIDENTIAL/SECRET及未明来源拒绝。当前首轮受限profile拒绝额外developer/history/file等未覆盖字段；这些能力未完成独立review合同前保持拒绝，没有把上下文拼接冒充原生多轮协议。

独立审查复现重复JSON keys可使JSON.parse遗漏实际外发前值，现要求body与adapter的JSON.stringify序列化逐字一致。重复/转义重复messages/model/tools、nested重复content/schema字段均拒绝。已知secret扫描涵盖body、headers、provenance及解码后的JSON；路径/地址/项目名正则仅为启发式，不能识别任意未知secret/hostname/编码；安全分类仍需可信Host逐字来源审查与用户exact-byte consent。普通Agent的PUBLIC标签不签发权限。

14项新增用例全部PASS，独立21项相关复验PASS；原16-slot测试仅修复前提夹具，原并发/abandon断言不变。默认Feature/Policy开关不参与这项独立owner门禁。生产Host verifier、唯一受保护store/账本和OS凭证隔离未部署，不能标LIVE资格。三个草案的active grants/reviews=0，没有预批发送。''')
    md('reports/deepseek-official-check.md','''# DeepSeek 官方接口增量复核

核对日期2026-11-08，均为公开文档，未带Key请求/models或/chat/completions。POST目标https://api.deepseek.com/chat/completions；请求ID为deepseek-flash，当前文档服务标签DeepSeek-V4.1-Flash-1017。旧deepseek-v4-flash等兼容名由官方转发，本轮不用；标签不等于可固定快照。真实response model与fingerprint仍null。[价格/模型](https://api-docs.deepseek.com/quick_start/pricing/)、[模型元数据](https://api-docs.deepseek.com/api/list-models/)。

stream=true的SSE以[DONE]终结；Usage跟随最后一个含finish_reason的内容choice，非独立usage-only块。prompt=cache_hit+cache_miss，total=prompt+completion；reasoning是completion细分，单列不再相加。Json Output需json提示与合理max_tokens，空白/截断不计成功；Tool Calling先产生意图，结果回放需独立原生多轮实现。[Chat协议](https://api-docs.deepseek.com/api/create-chat-completion/)、[JSON](https://api-docs.deepseek.com/guides/json_mode/)、[工具](https://api-docs.deepseek.com/guides/tool_calls/)、[Thinking](https://api-docs.deepseek.com/guides/thinking_mode/)。

每百万token美元价格：Flash峰时hit0.006/miss0.30/output1.20，非峰减半。草案按全miss峰价保守预留，实际invoice仍未知。Flash账户并发2500，跨Key合计；本地更低。服务可发keepalive，未开始推理等待10分钟后可关闭；本地30秒deadline独立，取消不等于未计费。[价格](https://api-docs.deepseek.com/quick_start/pricing/)、[限流/超时](https://api-docs.deepseek.com/quick_start/rate_limit/)。

400/422参数、401认证、402余额、429限流及5xx服务错误分类保留。所读官方页没有提供所有失败/中断情形一律免费或一律收费的充分合同；不得推断0费。有合法失败Usage则计入，无Usage保留UNKNOWN并停后续请求，不自动重发。[错误码](https://api-docs.deepseek.com/quick_start/error_codes/)。''')
    usage=dict(schema='agentnexus/m1.8.2/usage/1',authorization_total_tokens=100000000,global_campaign_id='m181-deepseek',
        continuity='Continue M1.8.1 authorization and ledger identity; never initialize extra quota per Key/Agent/Session/Host restart',
        real_provider_requests=0,input_tokens=0,output_tokens=0,cache_hit_tokens=0,cache_miss_tokens=0,reasoning_tokens=0,failed_request_tokens=0,
        actual_cost_micros=0,currency='USD',provider_usage_receipts=0,usage_source='NO_LIVE_REQUESTS',remaining_authorized_tokens=100000000,
        unknown_live_usage=0,active_live_reservations=0,synthetic_accounting_tests_excluded=True,production_singleton_store='BLOCKED',
        draft_token_reservation_upper_bound=request_index['total_reserved_token_upper_bound_if_later_approved'],
        draft_cost_upper_bound_micros=request_index['total_cost_upper_bound_micros_usd'],drafts_are_not_reservations=True)
    write(OUT/'usage-token-cost.json',usage)
    md('reports/usage-token-cost.md','''# Usage / Token / Cost

真实请求0、输入/输出/缓存/推理/失败token均0、实际费用$0，剩余100,000,000。继承campaign ID m181-deepseek，没有换版本重置；后续切Key/Agent/Task/Session同账本。Campaign负责全局原子reserve，ModelUsageLedger负责请求/Agent/Task/Project/Platform，Vault租约另保留费用与并发。并发、耗尽、失败usage、reopen、不可重置与UNKNOWN保持均有合成SQLite回归。

总消费只计input+output，cache拆分不再相加、reasoning不再加到completion。used为已观察实际usage；UNKNOWN时另存保守held以阻止新请求，不把held当作真实已消费/真实费用。已报告失败Usage只入账一次；未知usage以估计上界保留并阻断全campaign。

三个草案合计token预留上界14,554，峰时全miss费率估计$0.004885；这不是已扣费或新增总限额，未创建live reservation。费用模型的RATE_ESTIMATE与invoice分开，真实账单未验证。固定唯一Host store、受保护账本和启动链仍BLOCKED，不能用新DB获得新1亿额度。''')
    table='\n'.join(f"| {r['request_id']} | `{r['request_hash']}` | {r['input_token_reservation_upper_bound']+r['output_token_limit']} | ${r['cost_upper_bound_micros_usd']/1000000:.6f} |" for r in request_index['requests'])
    md('reports/request-review.md',f'''# 首三个请求正文与Hash草案

状态DRAFT_BLOCKED_NOT_SENT。model deepseek-flash，endpoint https://api.deepseek.com/chat/completions。公开固定结构化协议+新生成合成任务，未加入项目规则、历史、科研、源码、路径、服务器或凭证。实际Context Assembly已capture/assemble/reconstruct；同一生产DeepSeekAdapter生成完整wire；没有调用Gateway.complete或任何Transport。首轮目标为结构化文本、中文JSON、tool intent，不能替代普通非JSON、多轮及tool-result完整联调。

| 请求 | Request SHA256 | 预留Token上界 | 费用上界 |
|---|---|---:|---:|
{table}

完整body原字节、context、source决定、component/source manifest及Context/body/source/review hashes见[evidence/requests](../evidence/requests/request-index.json)。Request hash算法SHA256(canonical(full non-credential HttpEnvelope))，body hash为原始body.json文件字节SHA256；Context hash为context.txt字节SHA256。请求尚无authorization header；真实header只允许合格Vault在Host内注入。

当前Vault OS隔离FAIL，生产egress与唯一账本BLOCKED，active grants/reviews=0。最终执行申请WITHHELD，不请求用户批准这些未达资格的草案，也不索取Key。未来获准部署后必须重新生成并展示最终全文/hash/model/来源/token/价格，经用户确认才通过可信入口使用凭证；当前草案不携带可重用consent。''')
    blocked_reports={
        'provider-live-integration.md':('DeepSeek真实联调','BLOCKED','Vault与Data Egress生产资格未通过，真实API请求0。普通文本、多轮、JSON、中文、长输入、取消、超时、错误与真实Usage全NOT_RUN；离线parser/Gateway fixture不可替代。'),
        'streaming.md':('Streaming','NOT_RUN','真实SSE/断连/取消/长流0次。继承有界UTF-8/SSE/usage/失败hash测试通过只证明离线解析；没有把本地保留partial hash当供应商完整响应或0费证明。'),
        'tool-calling.md':('Tool Calling','NOT_RUN','仅有离线解析/受限意图资格和一个未发送草案；未执行真实工具，原生assistant/tool_call_id多轮与tool失败/权限不足的真实模型行为未验证。PROCESS与EXTERNAL_EFFECT保持BLOCKED。'),
        'context.md':('Context','BLOCKED','三份合成Context的真实Archive/Assembly/重建与来源hash已完成；真实多轮/长上下文/模型任务恢复与版本绑定未运行。首轮profile拒绝未覆盖history/file/developer字段，不把flatten user串称原生消息回放。'),
        'real-agent-pilot.md':('真实Agent Pilot','NOT_RUN','沿用M1.7 CLI Pilot为下一阶段候选，未改它或科研项目。真实Development、两个Subagent、Reviewer、Debug/Test链未启动；没有由Codex绕过Harness编写产物后冒称模型研发。当前12项Storage发布链失败还直接阻断Native Pilot。'),
        'single-multi-comparison.md':('Single / Multi-Agent对照','INCONCLUSIVE','真实样本A=0、B=0。没有完成率、bug、成本、人工介入或墙钟优势结论。未来同一M1.7初始代码/需求/测试/模型能力/总预算/期限，保留各自模型自主分解，不能预写全部分解。'),
        'resident-24h.md':('Resident 24小时','NOT_RUN','本轮真实Resident累计运行0小时，未启动24小时服务；历史2小时/短测及模拟计时不折算。事件、唤醒、恢复、持久化和Host重启的真实长跑需Vault/Pilot门禁先闭合。'),
        'reviewer.md':('Reviewer','NOT_RUN','真实DeepSeek Reviewer与未知Bug发现、数学/数值审查NOT_RUN；Git Diff/commit绑定与只读合同继承，不自动commit/push。独立Codex安全审查另列，不能冒称Native Reviewer。'),
        'm19-recommendations.md':('M1.9后续建议','BLOCKED','先单独授权并部署Windows互异标准身份、Host-only目录/代码/helper ACL、可信启动与认证IPC、唯一账本，再以合成凭证做实际角色deny/轮换/撤销/重启组合资格。通过后重新审阅三请求并申请确认；随后补自然文本/原生多轮工具历史、真实Smoke/Pilot/对照与24小时。CPU/任意PROCESS/EXTERNAL_EFFECT不随模型接入自动开放。'),
    }
    for name,(title,status,body) in blocked_reports.items(): md('reports/'+name,f'# {title}\n\n**{status}**。{body}')
    write(OUT/'resident-24h.json',dict(status='NOT_RUN',real_elapsed_hours=0,started_at=None,ended_at=None,reason='LIVE_VAULT_AND_EGRESS_NOT_QUALIFIED'))
    write(OUT/'pilot-comparison.json',dict(status='INCONCLUSIVE',single_samples=0,multi_samples=0,real_model_pilot='NOT_RUN',source='M1.7 existing independent CLI pilot',research_projects_changed=False))
    write(OUT/'evidence/live-requests.json',dict(status='BLOCKED',provider='deepseek',requests=[],responses=[],count=0,credentials_received=0,execution_application='WITHHELD'))
    md('reports/raw-evidence.md','''# 原始证据与审计

evidence/verification保存六组独立运行的TAP、结果、events、source manifests、syntax和strict tsc；所有原FAIL保留。evidence/probes保存实际OS能力、managed write失败阶段、同SID DPAPI负证据和只读ACL；raw-index绑定runtime原日志路径/字节/hash。evidence/requests保存三个合成未发送body/context/完整review及Audit，evidence/live-requests.json为空；没有虚构脱敏供应商响应。

本交付本地OS/SID/路径证据属于内部审计材料，未进入Provider草案正文。独立审查原始复现及修复复验另在evidence/reviews。实际数据库/Artifact原件留在runtime，报告索引不会把导出复制文件身份当原Storage Owner身份。''')
    write(OUT/'acceptance.json',dict(schema='agentnexus/m1.8.2/acceptance/1',status='BLOCKED',offline_engineering='PASS',full_regression=final['status'],
        counts=final['summary']['counts'],new_tests=dict(total=14,passed=14,failed=0,skipped=0),syntax='PASS',strict_typescript='PASS',
        original_14=dict(adjudicated=14,new_m181_regressions_proven=0,fixed_original_failures=0,kept_original_failures=14),
        vault='BLOCKED',current_same_sid_isolation_probe='FAIL',egress_offline='PASS',egress_production='BLOCKED',
        provider_live='BLOCKED',real_requests=0,usage=usage,streaming='NOT_RUN',tool_calling='NOT_RUN',real_agent_pilot='NOT_RUN',
        single_multi='INCONCLUSIVE',resident_24h='NOT_RUN',native_reviewer='NOT_RUN',independent_codex_security_review='SEPARATE_REPORT',
        source_set_sha256=frozen['set_sha256'],source_files=189,commit_push=False,system_security_changes=False))
    counts=final['summary']['counts']
    md('acceptance-report.md',f'''# M1.8.2 最终验收

**完整目标BLOCKED；离线整改与14项新增安全测试PASS，完整回归仍FAIL。** 最终695项：{counts['passed']} PASS / {counts['skipped']} SKIP / {counts['failed']} FAIL；syntax与strict TypeScript PASS。源快照执行前后同SHA `{frozen['set_sha256']}`。

原14项逐项保留裁定：同环境M1.8与M1.8.1均失败，13项环境前提限制、1项PowerShell路径夹具不满足native锚定。没有已证M1.8.1新增回归，原14项未改为PASS。累计CPU分次观察差异另列，严格累计CPU仍BLOCKED。一次新门禁升级导致旧16-slot夹具FAIL，原失败保留，修复完整review前提后原断言PASS。

当前同SID真实子进程成功解密新建合成Vault，说明生产隔离缺失。跨身份Host/Worker/Reviewer deny、可信录入、ACL/启动链与唯一账本没有资格；Vault和生产egress均BLOCKED。没有索取/读取真实Key，真实请求0、Token0、费用$0；1亿总额未重置。

Data Egress新增完整来源/消息/schema/headers的review记录、严格true确认、REAL不可绕过和重复JSON键防护；独立安全审查复现的新缺口已修复复验。扫描启发式不等同通用DLP。三个未发送草案已留完整正文与hash，最终执行申请未提交，后续部署后须重建并经用户确认。

真实Streaming、Tool Calling、原生多轮、Agent Pilot、未知Bug Reviewer与24小时Resident均NOT_RUN；Single/Multi样本0，INCONCLUSIVE。未Commit/Push、未安装Hook、未改规则/系统账户/ACL/AppContainer/Ubuntu/正式科研项目。独立Codex审查与真实DeepSeek Reviewer分开。

入口：[14项裁定](reports/failure-adjudication.md)、[Vault资格](reports/credential-vault-qualification.md)、[Egress资格](reports/data-egress-qualification.md)、[请求草案](reports/request-review.md)、[独立安全审查](reports/independent-security-review.md)、[Token/Cost](usage-token-cost.json)、[原始证据](reports/raw-evidence.md)、[后续](reports/m19-recommendations.md)。''')
    md('README.md',f'''# AgentNexus M1.8.2

**LIVE BLOCKED。** 本轮完成原14项FAIL逐项调查、实际OS隔离反例、完整请求外发加固及独立安全复验。真实API/Key/Token/费用均0。

14项新增测试全PASS；最终完整回归{counts['passed']} PASS /{counts['skipped']} SKIP /{counts['failed']} FAIL，syntax/strict TS PASS。原14项失败与额外CPU观察、一次Fixture修复前失败全部保留。当前同SID进程能解密合成Vault，生产资格未关闭，未索取凭证或提交执行申请。

[总体/最终验收](acceptance-report.md) · [机器验收](acceptance.json) · [14项裁定](reports/failure-adjudication.md) · [历史账本](historical-issue-ledger.json) · [Vault](reports/credential-vault-qualification.md) · [Data Egress](reports/data-egress-qualification.md) · [官方模型核验](reports/deepseek-official-check.md) · [三个请求正文/Hash草案](reports/request-review.md) · [独立审查](reports/independent-security-review.md) · [Token/Cost](usage-token-cost.json) · [源码](source/) · [重现](reproduce.md) · [SHA256](SHA256SUMS.txt) · [治理](reports/governance.md) · [M1.9建议](reports/m19-recommendations.md)。

189源码文件集合SHA `{frozen['set_sha256']}`。所有M0–M1.8.1历史与根产品保持；不宣称真实自主研发、多Agent收益或24小时运行通过。''')
    md('reproduce.md',r'''# 重现

Node24.15.0、TypeScript5.9.3、@types/node24.10.1，沿用现有受信工具目录，无新依赖。候选source为独立交付，根产品未替换。只运行合成工程测试，绝不填Key环境变量。

```powershell
$env:AGENTNEXUS_TYPE_TOOLS='I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\type-tools'
$env:AGENTNEXUS_TEST_PYTHON_PATH=(Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH=(Get-Command pwsh).Source
$env:AGENTNEXUS_TEST_GIT_PATH=(Get-Command git).Source
node deliverables/AgentNexus-M1.8.2/source/tools/agentnexus/verify-m182.mjs --output-root .workflow-kit/runtime/AgentNexus-M1.8.2/reproduce --suite all
```

suite m182只跑14项新增，model跑模型相关。Runner每次独立目录、wx写原始证据、固定工具版本、最小环境与有界stdout/time；所有FAIL和SKIP保留。根tools/agentnexus/m182-probes.mjs可执行filesystem/native-paths/vault/reader-denial：只使用新建合成材料，vault是预期ISOLATION_FAIL反例，不是接入入口。根m182-evidence.mjs只生成无许可草案。build-tools为根工具归档副本，按原仓库路径运行。

治理普通路径可能因历史>260字符路径失败，必须用同一个未修改工具与Windows extended-length根，不忽略历史目录：

```powershell
python ai-workflow-kit-v4/tools/govern.py check --target '\\?\I:\AI_AgentNexus'
```

真实入口仍未启用。不得把审查callback、synthetic fixture、simulated资格或一个新DB当LIVE授权。''')
    for name in ['m182-delivery.py','m182-report.py','m182-evidence.mjs','m182-probes.mjs','m182-vault-reader.mjs']:
        if not (OUT/'build-tools'/name).exists(): copy(ROOT/'tools/agentnexus'/name,'build-tools/'+name)
    literal_contracts()
    print(json.dumps(dict(status='PASS',counts=counts,source_set_sha256=frozen['set_sha256'],original_failures_adjudicated=len(matrix),new_tests=len(fresh))))

if __name__=='__main__': literal_contracts() if sys.argv[1:]==['contracts'] else build()
