from pathlib import Path
import datetime, hashlib, json, os, shutil, stat, sys, zipfile

R=Path('I:/AI_AgentNexus'); O=R/'deliverables/AgentNexus-M1.5'; T=R/'.workflow-kit/runtime/AgentNexus-M1.5'
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
def write(p,s):
    p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('x',encoding='utf-8',newline='\n') as f:f.write(s)
def obj(p,v):write(p,json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def copy(p,q):
    assert p.is_file() and not q.exists(),str(q)
    q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q)
def tree(base):
    result=[]
    def walk(p):
        for child in sorted(p.iterdir(),key=lambda q:q.name):
            attrs=getattr(child.lstat(),'st_file_attributes',0)
            assert not child.is_symlink() and not (attrs & getattr(stat,'FILE_ATTRIBUTE_REPARSE_POINT',0)),str(child)
            if child.is_dir():walk(child)
            else:assert child.is_file();result.append(child)
    walk(base);return result
def zip_files(base,paths,dest):
    manifest=[];dest.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(dest,'x',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(paths,key=lambda p:p.relative_to(base).as_posix()):
            rel=p.relative_to(base).as_posix();i=zipfile.ZipInfo(rel,(1980,1,1,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;i.external_attr=0o100644<<16
            with p.open('rb') as f,z.open(i,'w') as output:shutil.copyfileobj(f,output,1024*1024)
            manifest.append({'path':rel,'bytes':p.stat().st_size,'sha256':digest(p)})
    with zipfile.ZipFile(dest) as z:
        assert z.testzip() is None
        for f in manifest:
            h=hashlib.sha256();n=0
            with z.open(f['path']) as inp:
                for b in iter(lambda:inp.read(1024*1024),b''):h.update(b);n+=len(b)
            assert h.hexdigest()==f['sha256'] and n==f['bytes']
    obj(dest.with_suffix(dest.suffix+'.manifest.json'),{'files':manifest,'archive_sha256':digest(dest)})
    return len(manifest)
def verify_delivery(base):
    m=json.loads((base/'delivery-manifest.json').read_text('utf-8'))
    for f in m['files']:
        p=base/f['path'];assert p.stat().st_size==f['bytes'] and digest(p)==f['sha256'],str(p)
    assert digest(base/'delivery-manifest.json')==(base/'delivery-manifest.json.sha256').read_text().split()[0]
    for line in (base/'SHA256SUMS.txt').read_text().splitlines():
        h,rel=line.split('  ',1);assert digest(base/rel)==h,rel
    return {'status':'PASS','files_verified':len(m['files']),'delivery_manifest_sha256':digest(base/'delivery-manifest.json'),'source_set_sha256':m['source_set_sha256']}
if '--verify' in sys.argv:
    print(json.dumps(verify_delivery(O)));raise SystemExit(0)

freeze=json.loads((T/'source-freeze-final.json').read_text('utf-8')); expected=freeze['set_sha256']
for f in freeze['files']:
    p=O/'source'/f['path'];assert p.stat().st_size==f['bytes'] and digest(p)==f['sha256']
assert len(tree(O/'source'))==len(freeze['files'])==91
runs=sorted((R/'.workflow-kit/runtime/M15-v/verification').iterdir())
finals=[p for p in runs if json.loads((p/'results.json').read_text())['source_set_sha256']==expected];assert len(finals)==1
final=finals[0];result=json.loads((final/'results.json').read_text());counts=result['summary']['counts']
assert counts=={'tests':289,'failed':1,'passed':265,'cancelled':0,'skipped':23,'todo':0,'topLevel':241,'suites':0}
failed=[c for c in result['cases'] if c['status']=='FAIL'];assert len(failed)==1 and 'cumulative Job CPU' in failed[0]['name']
qdirs=sorted((R/'.workflow-kit/runtime/M15-q/cpu-qualification').iterdir());q=qdirs[-1];cpu=json.loads((q/'report.json').read_text());assert cpu['source_set_sha256']==expected and len(cpu['cases'])==10 and all(c['status']=='FAIL' for c in cpu['cases'])
baseline=json.loads((O/'evidence/phase0/freeze.json').read_text())
for f in baseline['tracked']+baseline['historical']:
    p=R/f['path'];assert p.stat().st_size==f['bytes'] and digest(p)==f['sha256'],str(p)

copy(T/'preflight-current.json',O/'evidence/phase0/preflight.json')
copy(T/'source-freeze-final.json',O/'source-sha256.json');copy(T/'source-freeze.json',O/'evidence/source-freeze-intermediate.json')
copy(Path('C:/Users/28642/.codex/attachments/f7bbbbbc-c986-4b8f-8f16-da02fe247331/已粘贴的文本.txt'),O/'evidence/phase0/user-request.txt')
copy(T/'typecheck/final-typecheck.md',O/'typescript-report.md');copy(T/'typecheck/final-typecheck.json',O/'typescript-report.json')
for p in tree(T/'typecheck'):copy(p,O/'evidence/typecheck'/p.relative_to(T/'typecheck'))
for name in ['provenance.json','package.json','package-lock.json']:
    copy(T/'type-tools'/name,O/'evidence/toolchain'/name)
for p in tree(T/'independent-review'):copy(p,O/'evidence/independent-review'/p.relative_to(T/'independent-review'))
copy(T/'independent-review/independent-security-review-final.json',O/'independent-security-review.json')
write(O/'independent-security-review.md','''# M1.5 独立安全审查

结论为PASS_LIMITED；完整Windows生产执行链仍BLOCKED。最终91文件与冻结集合一致，37项模型检查及1个本账户存储原语序列按预期，当前审查范围无未关闭P0/P1；不构成真实独立账户/组合资格。

[逐字独立报告](evidence/independent-review/independent-security-review-final.md) · [原始机器报告](evidence/independent-review/independent-security-review-final.json) · [独立逐文件比较](evidence/independent-review/freeze-verification-approved-final.json)。报告、脚本、首次harness限制、所有中间记录及原始探针日志均保留在同目录。作者最终回归和CPU结果由本交付另行归档，不冒充审查者独立执行。
''')
run_index=[]
for p in runs:
    rd=json.loads((p/'results.json').read_text());dest=O/'evidence/runs'/p.name
    for file in p.iterdir():
        if file.is_file():copy(file,dest/file.name)
    zip_files(p/'workspace',tree(p/'workspace'),dest/'tested-source.zip')
    zip_files(p/'data',tree(p/'data'),dest/'test-data.zip')
    run_index.append({'run':p.name,'source_set_sha256':rd['source_set_sha256'],'counts':rd['summary']['counts'],'exit_code':rd['exit_code'],'tsc':rd['tsc'],'final_candidate':p==final})
copy(final/'results.json',O/'test-results.json')
for qp,label in [(q,'final')]+[(p,'development-'+p.name) for p in sorted((T/'cpu-qualification').iterdir()) if p.is_dir()]:
    dest=O/'evidence/cpu'/label
    for file in qp.iterdir():
        if file.is_file():copy(file,dest/file.name)
    if (qp/'workspace').exists():zip_files(qp/'workspace',tree(qp/'workspace'),dest/'tested-source.zip')
copy(q/'report.json',O/'cpu-qualification.json')
for p in T.iterdir():
    if p.is_file() and p.suffix in ['.log','.tap','.json'] and p.name not in ['source-freeze-final.json','source-freeze.json','preflight-current.json']:
        copy(p,O/'evidence/development'/p.name)
zip_files(T/'native-development',tree(T/'native-development'),O/'evidence/development/native-development.zip')
for p in T.iterdir():
    if p.is_file() and p.suffix=='.py':copy(p,O/'evidence/build-tools'/p.name)

old=json.loads((O/'evidence/phase0/m14-source-sha256.json').read_text());before={f['path']:f for f in old['files']};now={f['path']:f for f in freeze['files']}
changes={'added':[p for p in now if p not in before],'changed':[p for p in now if p in before and now[p]['sha256']!=before[p]['sha256']],'removed':[p for p in before if p not in now]}
assert not changes['removed'];obj(O/'change-record.json',{'baseline_head':baseline['head'],'baseline_source_set_sha256':old['set_sha256'],'source_set_sha256':expected,'changes':changes,'root_tracked_files_preserved':len(baseline['tracked']),'historical_delivery_files_preserved':len(baseline['historical']),'runs':run_index})
write(O/'SOURCE_SHA256SUMS.txt',''.join(f['sha256']+'  source/'+f['path']+'\n' for f in sorted(freeze['files'],key=lambda f:f['path'])))
zip_files(O/'source',tree(O/'source'),O/'AgentNexus-M1.5-source.zip');write(O/'AgentNexus-M1.5-source.zip.sha256',digest(O/'AgentNexus-M1.5-source.zip')+'  AgentNexus-M1.5-source.zip\n')

rows='\n'.join('| '+c['id']+' | '+str(c['budget_ms'])+' | '+str(c['tolerance_ms'])+' | '+str(c['job_user_cpu_ms'])+' | '+str(round(c['wall_ms'],3))+' | '+str(c['historical_processes'])+' | '+str(c['wall_termination'])+' | FAIL |' for c in cpu['cases'])
write(O/'cpu-qualification-report.md',f'''# M1.5 CPU Hard Limit 资格报告

**FAIL：10/10最终场景未通过，production_qualified=false。** 最终冻结源码集合 `{expected}`，全部91文件复制至隔离workspace并生成逐文件manifest后运行。报告/原始JSONL/进程stderr/源码ZIP见 evidence/cpu/final；开发阶段另外10次失败及M1.4原始历史均保留。

被测对象为本账户原生私有Job；根挂起加入后恢复、无breakaway，子成员计入Job accounting。cpu_ms配置PerJobUserTimeLimit，单位100ns，比较累计**用户态**CPU；kernel CPU另记录且不声称受该预算约束；cpu_rate=10000只是带宽设置，与累计CPU/墙钟不同。并行成员CPU总和可以大于墙钟。历史进程数量使用实际Job计数，不假定只有预期脚本个数。

本次有限判据为实际user CPU>0且<=budget+max(50ms,5%)、root/tree退出、无helper墙钟终止，以及USER_MODE/TERMINATE配置。它不是生产终止因果证明；overall即使数字通过也不发生产资格，仍需真实目标Worker/组合/负载/长时资格。本次实际全部失败，没有该歧义。

| 场景 | CPU预算ms | 容差ms | Job user CPU ms | 墙钟ms | 实际历史进程 | helper终止原因 | 结果 |
|---|---:|---:|---:|---:|---:|---|---|
{rows}

80ms三次实耗4953.125、4953.125和156.25ms；第三次未由helper DEADLINE终止也超130ms上界，说明旧“非DEADLINE即PASS”不能资格化。多进程300ms出现14421.875ms累计实耗；3s较长场景6375ms。设置/readback、偶然OS quota退出或终止信号均不等于稳定预算保证。

覆盖重复单进程、多进程、父/子、较长运行、并发Job；当前宿主/嵌套环境与目标实际Worker不同，真实独立身份、目标OS负载矩阵、长期soak未运行。没有改CPU策略、系统配置或为通过放宽容差。最终主套件另有1个旧CPU真实FAIL，仍保留。先查明目标OS行为与可接受granularity，未获稳定证据前继续阻断CPU Hard Limit生产保证。
''')
acceptance={'schema':'agentnexus/m1.5/acceptance/1','overall':'BLOCKED','windows_production_chain':'BLOCKED','source_set_sha256':expected,'source_files':91,'final_run':final.name,'regression':counts,'tsc':'PASS','independent_review':'PASS_LIMITED','independent_simulated_checks':37,'independent_current_account_storage_sequences':1,'cpu_qualification':'FAIL','cpu_cases':10,'cpu_failed':10,'system_deployment_authorized':False,'system_changes':False,'accounts_created':False,'acl_modified':False,'profile_registered':False,'tasks_registered':False,'services_installed':False,'firewall_modified':False,'ubuntu_modified':False,'provider_connected':False,'api_key_read':False,'formal_research_run':False,'committed_or_pushed':False,
 'limits':['real independent accounts absent','persistent production IPC and effective client ACL not OS-qualified','network/filesystem/limits native facts remain false','CPU stable budget failed','full production ExitProof/release and real Host restart not qualified','unknown provisional slots remain held with no automatic release','Ubuntu OS adapter NOT_RUN']}
obj(O/'acceptance.json',acceptance)
skips='\n'.join('- '+c['name'] for c in result['cases'] if c['status']=='NOT_RUN')
run_table='\n'.join('| '+r['run']+' | '+str(r['counts']['passed'])+' | '+str(r['counts']['failed'])+' | '+str(r['counts']['skipped'])+' | '+('最终' if r['final_candidate'] else '中间，非当前字节')+' |' for r in run_index)
write(O/'acceptance-report.md',f'''# M1.5 最终验收报告

**完整Windows生产执行链：BLOCKED；M1.5不是生产闭环完成声明。** 已在授权范围内完成代码候选、严格类型检查、原语/模型/故障验证与独立复核；账户、ACL、Profile、登录权与Task等系统部署未获批准。CPU严格资格实际失败，真实隔离事实仍缺，基础系统批准也不会自动使生产链通过。

最终源码91文件，集合SHA256 `{expected}`；版本0.4.0-m1.5。最终隔离运行 `{final.name}`：**289项，265 PASS、23 NOT_RUN、1 FAIL、0 cancelled**，退出1，未超时。唯一FAIL为继承的 `M1.4 REAL_WINDOWS_PRIMITIVE: cumulative Job CPU time kills a busy fixture before wall deadline`；未改弱旧断言、未跳过失败或重跑挑绿。语法与真正严格tsc通过，不能把两者混为一谈。

| 范围 | 裁定 | 证据与边界 |
|---|---|---|
| Phase0规则/冻结/保全 | PASS | 1986 tracked +1670历史交付逐hash保全 |
| Bootstrap/准备槽/精确Grant/故障拒绝 | PASS_LIMITED | 代码、SQLite/crypto模型；真实独立身份BLOCKED |
| 持久IPC/签名Launcher证明 | PASS_LIMITED | 内存模型和部分真实原语；正向持续/跨账户NOT_RUN |
| File Broker/4KiB双签名文件摘要 | PASS_LIMITED | 模型与继承句柄文件原语；真实跨账户边界BLOCKED |
| Windows组合Sandbox/网络/管理库隔离 | BLOCKED | 标准账户/Profile/ACL/完整攻击未部署；三个native隔离事实false |
| 完整树/producer/退出环境证明 | INCONCLUSIVE/BLOCKED | 最终计数/parent改进不能替代全部真实组合证据 |
| ExitProof/closure/五资源与Broker释放 | PASS_LIMITED / production BLOCKED | 拒绝/签名/版本/回滚/幂等模型；无真实完整生产proof |
| Audit Producer九组件 | INCONCLUSIVE | 源码已接线、有界流及失败关闭模型；长期真实组合未执行 |
| CPU累计Hard Limit | FAIL | 冻结91文件下10/10真实同账户场景失败，历史FAIL保留 |
| TypeScript | PASS | Node24.15/TS5.9.3/@types-node24.10.1，58TS入程序，配置/语义诊断0 |
| 独立安全审查 | PASS_LIMITED | 37模型+1当前账户storage序列按预期；非生产资格 |
| Ubuntu | 准备PASS_LIMITED / OS NOT_RUN | 严格计划和SO_PEERCRED源码；未改服务器 |

Host/Worker脚本、配置和入口、角色/指纹/ACL全pin、存储子对象只读核验、锁恢复、enrollment挑战、MAC、prepare->bind->原始Permit原子transfer、固定Worker/精确FileBroker输入、监督、closure和双账本release回执均已实现候选。Host/Broker同可信Host控制进程；标准Worker Launcher及私钥存储属于TCB，不声称防御任意同标准账户恶意进程。有限工具只做受控摘要，不开放通用宿主命令。

## 所有完整回归均保留

| Run | PASS | FAIL | NOT_RUN | 绑定 |
|---|---:|---:|---:|---|
{run_table}

前两run与最终字节不同，不能用其通过数背书最终源。每次有完整manifest、实际测试源码ZIP、TAP/events/results、stdout/stderr和合成数据ZIP+逐成员hash。最终CPU实验也有独立完整源码快照。M1.4原始失败和原始交付未改。开发中harness EPERM、首轮12个tsc错误、类型报告数量脚本误判、长路径治理失败均单列保留；修正后不覆盖原件。

## 最终NOT_RUN

{skips}

这些用例不是PASS，某些真实链接/管道原语受当前宿主权限限制；额外本账户focused原语也不补齐最终跨账户组合。默认网络能力空不等于所有网络路径已拒绝。当前数据不证明OS重启/断电或生产完整树退出。

## 部署与剩余工作

只读预检确认两个候选账户及新/旧部署根仍不存在；Task读取INCONCLUSIVE，Worker hive/Profile/LSA NOT_RUN。新的deployment-approval.md只提交禁用标准账户与精确空目录基础项，其他配置/ACL/Profile/Task/启用另列，不擅自执行。未读API Key、未连接Provider、未正式科研、未改Ubuntu、未Commit/Push。

实际OS identity/peer/启动撤销、网络/文件/磁盘/CPU、全树/producer、真实Host重启、完整ExitProof/owner release须独立证据。WindowsSupervisor的network/filesystem/limits仍false；未知准备槽无自动释放兜底。M1.6建议明确列出这些未关闭工作，不能把“等待授权”当作唯一剩余条件。
''')
write(O/'README.md',f'''# AgentNexus M1.5 — 候选交付

**完整Windows生产执行链仍BLOCKED。** 最终回归289项：265 PASS / 23 NOT_RUN / 1历史CPU FAIL。严格tsc通过；独立审查限定通过。最终CPU资格10/10 FAIL，未改系统配置，未把模拟/原语升级为生产通过。

- [最终验收](acceptance-report.md) · [机器裁定](acceptance.json) · [原始逐case](test-results.json)
- [Phase0冻结](phase0-report.md) · [总体架构](design.md) · [ADR](adr.md)
- [Host](host-bootstrap.md) · [Worker](worker-bootstrap.md) · [身份](runtime-identity.md) · [Broker](production-broker.md) · [Trusted IPC](trusted-ipc.md)
- [Sandbox](windows-sandbox.md) · [File Broker](file-broker.md) · [Supervisor](process-supervisor.md) · [ExitProof](exit-proof.md) · [资源释放](resource-release.md)
- [Audit覆盖](audit-producer-matrix.md) · [Feature/Policy](feature-policy-catalog.md) · [安全矩阵](security-test-matrix.md)
- [CPU资格FAIL](cpu-qualification-report.md) · [严格TypeScript PASS](typescript-report.md) · [独立安全审查](independent-security-review.md)
- [系统授权清单](deployment-approval.md) · [Ubuntu准备](ubuntu-adapter-spec.md) · [M1.6剩余工作](m16-recommendations.md)
- [完整源码/测试/工具](source/) · [源码ZIP](AgentNexus-M1.5-source.zip) · [源码SHA](source-sha256.json) · [原始证据](evidence/)

91文件集合SHA256 `{expected}`。根M1.3、M1.2/M1.3/M1.4原件和1986 tracked文件均保全；本轮只在独立交付及.workflow-kit任务/临时路径操作，未自动Commit/Push。

复验需原始Node24.15.0、可信Python/PowerShell绝对路径。源码运行时仍无npm产品依赖；真正类型检查使用锁定TS5.9.3/@types-node24.10.1/undici-types7.16.0，可在隔离目录 `npm ci --ignore-scripts` 并设置 AGENTNEXUS_TYPE_TOOLS。从source运行 `node tools/agentnexus/verify-m15.mjs --output-root <源码外临时根>`，设置 AGENTNEXUS_TEST_PYTHON_PATH 与 AGENTNEXUS_TEST_POWERSHELL_PATH；会保留全新原始记录。当前CPU会导致完整suite FAIL，不能把exit1改为通过。

实际生产入口为 `src/agentnexus/bootstrap/entry.ts host|launcher --config <外置绝对路径> --sha256 <外置受保护hash>`；Operator另走受保护端点。当前没有可用真实部署配置/密钥/Profile/Task，直接调用应BLOCKED，不能用当前操作者替代独立角色。不要为演示跳过attestation/资格或修改false事实。
''')
obj(O/'verification.json',{'status':'PASS_LIMITED_ARTIFACT_INTEGRITY','source_set_sha256':expected,'source_files_verified':91,'tracked_files_preserved':len(baseline['tracked']),'historical_files_preserved':len(baseline['historical']),'source_zip_roundtrip':'PASS','all_run_source_and_data_archives_roundtrip':'PASS','final_run_manifest_matches_source':True,'cpu_manifest_matches_source':True,'production_qualified':False,'note':'Integrity PASS does not change regression CPU FAIL or production BLOCKED.'})
files=[{'path':p.relative_to(O).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in tree(O) if p.name not in ['delivery-manifest.json','delivery-manifest.json.sha256','SHA256SUMS.txt']]
files.sort(key=lambda f:f['path']);obj(O/'delivery-manifest.json',{'schema':'agentnexus/m1.5/delivery/1','source_set_sha256':expected,'files':files,'excludes':['delivery-manifest.json','delivery-manifest.json.sha256','SHA256SUMS.txt']})
write(O/'delivery-manifest.json.sha256',digest(O/'delivery-manifest.json')+'  delivery-manifest.json\n')
checks=files+[{'path':'delivery-manifest.json','sha256':digest(O/'delivery-manifest.json')},{'path':'delivery-manifest.json.sha256','sha256':digest(O/'delivery-manifest.json.sha256')}]
write(O/'SHA256SUMS.txt',''.join(f['sha256']+'  '+f['path']+'\n' for f in sorted(checks,key=lambda f:f['path'])))
print(json.dumps(verify_delivery(O)))
