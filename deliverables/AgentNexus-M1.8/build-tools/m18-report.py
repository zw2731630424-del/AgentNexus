"""Assemble M1.8 evidence after the immutable final verification. No history mutation."""
from __future__ import annotations
import argparse, datetime, hashlib, json, os, pathlib, shutil, sqlite3, subprocess, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/AgentNexus-M1.8'
RUN=ROOT/'.workflow-kit/runtime/AgentNexus-M1.8'

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()
def jread(path):return json.loads(path.read_text(encoding='utf-8'))
def jwrite(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def md(path,text):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text.strip()+'\n',encoding='utf-8',newline='\n')
def files(root):
    for base,dirs,names in os.walk(root,followlinks=False):
        dirs[:]=sorted(d for d in dirs if not pathlib.Path(base,d).is_symlink() and not pathlib.Path(base,d).is_junction() and d!='__pycache__')
        for name in sorted(names):
            p=pathlib.Path(base,name)
            if not p.is_symlink() and p.is_file():yield p
def inventory(root):return sorted([dict(path=p.relative_to(root).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in files(root)],key=lambda x:x['path'])
def sethash(rows):return hashlib.sha256(''.join(r['path']+'\0'+r['sha256']+'\n' for r in rows).encode()).hexdigest()
def pack(root,target):
    with zipfile.ZipFile(target,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        for p in files(root):archive.write(p,p.relative_to(root).as_posix())
def copy(path,dest):dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest)

def finalize(verification):
    result=jread(verification/'results.json');source=OUT/'source';manifest=inventory(source);source_hash=sethash(manifest)
    assert result['source_set_sha256']==source_hash and result['source_snapshot_stable'] and result['syntax_pass'] and result['tsc']=='PASS','SOURCE_OR_BUILD_MISMATCH'
    cases=result['cases'];new=[c for c in cases if pathlib.PureWindowsPath(c.get('file','')).name.startswith('m18-')]
    new_fail=[c for c in new if c['type']=='test:fail'];assert new and not new_fail,'NEW_TEST_FAILURE'
    counts={'tests':len(new),'passed':sum(c['type']=='test:pass' and not c.get('skip') for c in new),'failed':len(new_fail),'skipped':sum(bool(c.get('skip')) for c in new)}
    baseline=jread(RUN/'baseline.json');changed=[f['path'] for f in baseline['history'] if not (ROOT/f['path']).is_file() or sha(ROOT/f['path'])!=f['sha256']];assert not changed,'HISTORY_CHANGED'
    for name in ['security-review.json','runtime-review.json']:assert (RUN/'reviews'/name).is_file(),'MISSING_INDEPENDENT_REVIEW'
    evidence=OUT/'evidence';evidence.mkdir(exist_ok=True)
    for name in ['results.json','source-manifest.json','syntax.json','typecheck.json','all-tests.tap','runner.stderr.txt','events.jsonl','tsc.stdout.txt','tsc.stderr.txt','run.json']:
        copy(verification/name,evidence/'verification'/name)
    copy(RUN/'baseline.json',evidence/'baseline.json')
    for name in ['security-review.json','runtime-review.json']:copy(RUN/'reviews'/name,evidence/'reviews'/name)
    copy(ROOT/'tools/agentnexus/m18-delivery.py',OUT/'build-tools/m18-delivery.py');copy(pathlib.Path(__file__),OUT/'build-tools/m18-report.py');copy(ROOT/'tools/agentnexus/m18-evidence.mjs',OUT/'build-tools/m18-evidence.mjs')
    copy(ROOT/'AGENTS.md',evidence/'applicable-rules/AGENTS.snapshot.txt');copy(ROOT/'.workflow-kit/governance/policy.json',evidence/'applicable-rules/policy.json');copy(ROOT/'ai-workflow-kit-v4/project-workflows/README.md',evidence/'applicable-rules/workflow-routing.md')
    jwrite(OUT/'source.manifest.json',{'files':manifest,'set_sha256':source_hash,'ordering':'UNICODE_CODEPOINT_PATH','encoding':'UTF8(path + NUL + sha256 + LF)'})
    initial={f['path']:f for f in baseline['baseline_source']};current={f['path']:f for f in manifest}
    delta={'added':[p for p in current if p not in initial],'modified':[p for p in current if p in initial and current[p]['sha256']!=initial[p]['sha256']],'deleted':[p for p in initial if p not in current]}
    assert not delta['deleted'];assert not [p for p in delta['modified'] if p.startswith('tests/') or p.startswith('config/')],'INHERITED_TEST_OR_CATALOG_CHANGED'
    jwrite(evidence/'source-changes.json',delta);jwrite(evidence/'history-preservation.json',{'status':'PASS','files_checked':len(baseline['history']),'changed':changed})
    child_env={k:os.environ[k] for k in ['SystemRoot','WINDIR'] if k in os.environ};child_env.update(NODE_OPTIONS='',NODE_PATH='')
    subprocess.run([shutil.which('node'),str(ROOT/'tools/agentnexus/m18-evidence.mjs'),result['data'],str(evidence/'models')],cwd=ROOT,env=child_env,check=True)
    model_index=jread(evidence/'models/request-index.json')
    full_fail=[{'name':c['name'],'error':c.get('details',{}).get('error',{}).get('message')} for c in cases if c['type']=='test:fail']
    attempts=[]
    for p in sorted(RUN.glob('[bhvw]/r-*/results.json')):
        d=jread(p);attempts.append({'path':p.relative_to(ROOT).as_posix(),'source_set_sha256':d['source_set_sha256'],'status':d['status'],'summary':d.get('summary'),'errors':d.get('errors')})
    jwrite(evidence/'verification-attempts.json',attempts)
    soak_reports=[jread(p) for p in sorted((RUN/'soak').glob('*/report.json'))]
    cost={'status':'NOT_RUN','real_provider_requests':0,'real_credential_imports':0,'actual_cost_micros':0,'currency':'USD','source':'All executed Gateway traces are FixtureTransport SIMULATED; no live Vault backend or real Provider grant used. Pure ledger arithmetic fixtures are excluded.','synthetic_gateway_requests':len(model_index['requests']),'synthetic_traces':model_index['traces']}
    jwrite(OUT/'actual-cost.json',cost)
    status={'status':'BLOCKED','offline_scope':'PASS','full_regression':result['status'],'real_provider':'NOT_RUN','production_credential_isolation':'BLOCKED','real_model_rnd':'NOT_RUN','comparative_superiority':'INCONCLUSIVE','resident_24_hours':'NOT_RUN'}
    acceptance={'schema':'agentnexus/m1.8/acceptance/1','generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),**status,'source_set_sha256':source_hash,'source_files':len(manifest),'head_at_start':baseline['head'],'baseline_set_sha256':baseline['source_set_sha256'],'new_tests':counts,'regression':result['summary']['counts'],'regression_failures':full_fail,'syntax':'PASS','strict_types':'PASS','historical_files_preserved':len(baseline['history']),'model_evidence':cost,'ordinary_worker_process':'BLOCKED','ordinary_worker_external_effect':'BLOCKED','strict_cumulative_cpu':'BLOCKED','os_security_changes':0,'automatic_commits':0,'automatic_pushes':0,'git_hooks_installed':0,'resident_short_runs':[{'status':s['status'],'short_run_status':s['short_run_status'],'observed_ms':s['duration_observed_ms'],'events':s['events']} for s in soak_reports],'verification_directory':str(verification),'limitations':['LIVE CredentialVault always refuses import; synthetic DPAPI does not qualify same-account Worker isolation.','All model intelligence remains SIMULATED. Three adapters are not three real integrations.','Unknown requests/closures retain holds and capacity; automatic retry/release prohibited.','Price/capability configuration requires exact model evidence; no live pricing was selected. Cache-specific actual billing is NOT_RUN.','Wall clock is a trusted Host assumption; rollback-resistant credential/approval expiry is not qualified.','Git COMMIT/PUSH event source is a trusted local Host input. No deployed continuous watcher or real push event was exercised.','24 hours was not run; short wall-clock observation is reported separately.','No sample supports Multi-Agent superiority.']}
    jwrite(OUT/'acceptance.json',acceptance)
    summary=f"新增测试 {counts['tests']}：{counts['passed']} PASS / {counts['skipped']} NOT_RUN / 0 FAIL；完整回归 {result['summary']['counts']['tests']}：{result['summary']['counts']['passed']} PASS / {result['summary']['counts']['skipped']} NOT_RUN / {result['summary']['counts']['failed']} FAIL。语法、严格 TypeScript PASS。"
    md(OUT/'README.md',f'''# AgentNexus M1.8

已实现并验证本轮授权的离线工程范围；完整真实模型验收仍 **BLOCKED**。Vault/三个 Provider 协议/路由/原子预算/原生多 Agent 与 Git Reviewer 接缝已实现，真实 Key、真实 API、实际费用均为 0。

{summary}

入口：[最终验收](acceptance-report.md) · [机器验收](acceptance.json) · [架构](architecture.md) · [Vault 设计](credential-vault-design.md) · [源码](source/) · [源码 ZIP](AgentNexus-M1.8-source.zip) · [SHA256](SHA256SUMS.txt) · [复现](reproduce.md) · [Phase 0](reports/phase0.md) · [独立审查](reports/independent-security-review.md)。

源码集 `{source_hash}`，{len(manifest)} 文件。M0–M1.7 历史 {len(baseline['history'])} 文件原字节保留，继承测试与 Feature/Policy Catalog 未修改。根产品未替换，未 Commit/Push、未安装 Hook 或修改账户/ACL/AppContainer。

真实联调 NOT_RUN，生产 Vault 隔离 BLOCKED；模型规划/编码/审查均 SIMULATED。24 小时 NOT_RUN，对照优越性 INCONCLUSIVE。所有失败、未知状态和资格限制均保留，不以短测或合成 Usage 代替真实证据。
''')
    failures='\n'.join('- '+f['name']+': '+str(f['error']) for f in full_fail) or '无失败。'
    md(OUT/'acceptance-report.md',f'''# M1.8 最终验收

**授权离线范围 PASS；完整 M1.8 真实模型目标 BLOCKED。** {summary}

| 验收问题 | 结论 |
|---|---|
| 多 Provider 凭证存储/轮换/并发 | 合成凭证与真实 CurrentUser DPAPI 本地测试 PASS；生产 Worker 隔离 BLOCKED |
| Agent 能否读取完整 Key | 受限 facade 与泄漏门测试 PASS；同账户 OS 隔离未资格 |
| Provider/Gateway/Streaming | 三个协议 adapter 的 fixture PASS；三家真实连接均 NOT_RUN |
| 按 Agent 路由/升级/费用 | 能力登记、最多两次升级、四级原子 Owner 和合成计量 PASS；真实账单 NOT_RUN |
| 自主规划/Subagent/Reviewer/Debug | 真实 Harness 执行与合成 wire 路径 PASS；模型智能 SIMULATED，未知问题发现 NOT_RUN |
| Resident | 短实测 PASS，24 小时 NOT_RUN；没有模拟时间换算 |
| Multi vs Single | 三组真实实验 NOT_RUN，优越性 INCONCLUSIVE |
| Context/Gates/权限 | 原始输入可重建；G0–G6 继承 Pilot 与 Git G4 接缝有程序证据；生产 OS/CPU/PROCESS/EXTERNAL_EFFECT BLOCKED |

完整回归失败（保留原文；不回填历史）：

{failures}

原版同字节宿主基线为 514/16/2，沙箱基线为 488/30/14。各次原始日志、source hash、skip 原因见 evidence/verification-attempts.json、evidence/verification 和 raw/runtime.zip。最终新增项无 FAIL 不意味着历史 OS 资格已关闭。

{len(model_index['requests'])} 个新 Gateway 工程请求、{model_index['traces']} 条模型请求/响应转录均 SIMULATED，原始 Archive/SQLite/Artifact 保留于 raw/runtime.zip；没有真实 Provider 计量。账本 REAL 分支的纯算法测试不纳入实际费用。

源码集 `{source_hash}`；source.manifest.json、source-changes.json 和 SHA256SUMS.txt 可逐字核验。独立审查限定可信本地工程边界，完整生产隔离尚未通过。
''')
    reports={
      'credential-vault.md':'''# Vault 实现与资格\n\n合成多 Provider pool、host 对象身份 capability、密文 SQLite、Windows DPAPI CurrentUser、安全匿名管道、状态/健康计数/并发/rate/费用与请求记录已实现。UNKNOWN 保留，轮换绑定旧 handle 世代，未使用 lease 才能 NOT_SENT 释放；普通 settle 不能释放 UNKNOWN。\n\n跨连接 import 的持久 generation 使旧 guard 失败关闭，refreshGuard 校验完整世代再增补已知秘密；关闭 guard 永久失败关闭。keys128/imports1024/request记录4096/security ring256 有界。DPAPI helper 并发2，退出未确认永久 poison。相关测试使用合成值，实际 DPAPI smoke 有真实本地执行证据。\n\nLIVE 导入始终 BLOCKED。Ubuntu Secret Service 仅统一接口/技术设计，未实现实测后端。普通 Worker facade不含Vault，但同账户OS隔离不成立；没有更改账户或ACL。''',
      'model-gateway.md':'''# Model Gateway\n\n原 ModelGateway 保留 MOCK 入口，可信Host通过modelRuntimeFactory注入统一port；Agent Loop核心不依赖供应商SDK。真实/模拟来源持久绑定请求，重启不按新transport重标。输入自有快照、Context reconstruct与manifest先验；SecretGuard覆盖所有持久入口。\n\nProvider返回模型与请求ID绑定，三个Adapter有独立字段策略。只有完整SSE终止、完整tool arguments和已报告usage才可返回可用reply；无Usage/取消/断连/未知结果保留Key、四级账本和持久并发slot，不自动重发。当前默认一次尝试；401/429更新Key健康供下一独立请求使用，不在同一未知请求上无限切换。真实重试/故障切换联调NOT_RUN。''',
      'model-router.md':'''# 路由与能力\n\nCapabilityRegistry要求显式能力、来源、校验日期、价格有效期；未登记模型不可用。按model_binding及AgentType路由，工具、JSON、Streaming、上下文预算均校验，不凭名字猜测。Host可接受有理由的升级提案，每Task最多2次，并检查价差及实际Agent/Task/Project/Platform预算；升级不修改身份或工具权限。Task复合key使用canonical结构hash，冒号ID无别名。\n\n无真实默认Model ID或价格。源目录中的synthetic模型只属于测试，不是官方模型能力或真实价格记录。''',
      'streaming.md':'''# Streaming\n\nPull式SSE增量UTF-8解码、CRLF/多行/注释处理；chunk/event各64KiB，总wire1MiB，事件4096，最终输出32KiB。有背压、取消、deadline、断连/partial/length/未完成Tool Call拒绝。reasoning只做有界跨事件泄漏检查，不归档推理正文；reported reasoning tokens包含在output内不重复收费。\n\n使用完整有界响应预检后再发布；从不把未完成Tool Call传给工具执行器。无自动连接恢复重发；UNKNOWN保持owner资源。''',
      'key-pool.md':'''# Key Pool\n\nProvider/model/健康失败数/费用占用/选择顺序/并发/分钟速率共同决定Key，不做随机选取。ACTIVE/DISABLED/INVALID/RATE_LIMITED/EXPIRED/ROTATING/QUARANTINED独立状态；SQLite事务保证同Key不会并发重复消费额度。rotation新Key接新请求，旧inflight可完成，删除要求无未决lease，request tombstone阻止复用。\n\n失败计数及lease使用记录存储于Vault私库，受限列表不含secret/ciphertext；Usage Ledger提供按请求的脱敏计量。此证据是合成管理逻辑及DPAPI本地存储，真实Key池轮换NOT_RUN。''',
      'usage-ledger.md':'''# Usage / Cost\n\n四级Token/请求/费用在一个NativeState事务内原子预留；Agent、canonical Task、Project、Platform缺任一级即拒绝。REAL/SIMULATED分账，ESTIMATED不转实际Token/费用；超预留保留原始reported usage、overdrawn及hold。已知meter在后续Archive失败时保留，不重复计费/重发。\n\n单次已SENT requests必须>=1且等retries+1；reasoning_tokens是output细分。价格用整数微美元与每百万Token费率向上取整，拒绝溢出。真实价格、缓存折扣、invoice对账均NOT_RUN，actual-cost.json实际支出0。''',
      'real-multi-agent-pilot.md':'''# 多 Agent Pilot\n\n真实模型Pilot NOT_RUN。M1.7既有独立Pilot在M1.8完整回归中仍执行原ToolGateway/StorageOwner/MessageBus/Gate链；模型策略明确SIMULATED。新增wire测试实际运行主Agent、两个独立Subagent、只读Reviewer，两个子请求并发峰值2，三个Provider协议/model路由及结构化消息交付有断言，但全部由FixtureTransport提供合成答案。\n\n不把工程子代理或固定响应当成AgentNexus真实模型研发，不宣称Reviewer发现未知问题。正式研究项目未修改，未知模型生成代码不获得PROCESS资格。''',
      'resident-longrun.md':'''# Resident 长期运行\n\n24小时 NOT_RUN；短墙钟实测及源快照见raw/runtime.zip的soak目录。soak-m18.ts接受最多86400000ms，最多约101个事件/新Agent，空闲无模型轮询，定期同store重开，有原始样本/CPU/RAM/SQLite/Artifact/队列观测。长等待按最多60秒分段。\n\nPASS门槛只使用实际单调墙钟>=24小时；本轮约4.2秒事件观测只标short_run_status PASS，长期status NOT_RUN。模型为继承MOCK，无真实费用，不代表新wire Gateway长时资格；无OS reboot/断电/跨账户恢复实测。''',
      'background-reviewer.md':'''# Git Reviewer\n\n固定只读Git reader明确禁shell、协议传输、credential helper、external diff/textconv/hooks/fsmonitor，固定全仓diff与submodule指针策略，有界输出与deadline。Watcher持久事件容量128，重复不造Reviewer；创建中崩溃UNKNOWN不自动重试，新head使旧结果STALE。\n\nBridge已实际经原Harness创建独立只读Agent/Task、MessageBus REVIEW_REQUEST、事件唤醒并绑定commit/diff/candidate/source/rules。G4 helper要求原回合、采纳消息、精确artifact与可信verify；模型PASS缺verify仍NOT_RUN。真实Git reader此轮仅固定argv/spawn mock与本地只读资格，持续Commit/Push事件服务和真实push事件NOT_RUN；Host必须供最新事件，未装Hook、未Commit/Push。''',
      'context-provenance.md':'''# Context Provenance\n\n沿用原始Archive、独立input_ref/manifest_ref/源record hash、规则/Feature/Policy绑定。Gateway每次重建exact Context并验证来源后才预算准入；回复和脱敏请求另归档。新增NativeState/Store/Artifact已知secret预写门，跨chunk预扫描与排队buffer自有副本，错误sidecar仅静态分类。\n\n原始历史不由摘要覆盖；热窗口仍有界。未完成的producer清理使Store失败关闭，不假称void return为退出证明。真实模型长期上下文一致性NOT_RUN，已知secret识别不承诺任意未知变换通用识别。''',
      'resource-governance.md':'''# Resource Governance\n\nModelUsageLedger是模型Token/费用的独立可信Owner，与原Task/Worker/Project/Platform逻辑运行预算并存；不冒用SIMULATED当OS硬计量。Key租约与四级模型预算两道发送前准入，第二道失败只释放确认未发送项。UNKNOWN账单、Key与transport slot保留；已观察超额同时扩展Key reserve。\n\n严格累计CPU、普通Agent PROCESS/EXTERNAL_EFFECT和OS生产组合继续BLOCKED。DPAPI helper未确认关闭保留poison槽，Vault/事件/账本容量有界且满则拒绝，不通过丢历史释放额度。''',
      'workflow-gates.md':'''# Workflow / Gates\n\nG0–G6原NativeGateEngine不变，原Pilot回归验证；新协议只提交提案，工具仍经原Policy/ToolGateway、审批、StorageOwner与资源Owner。DevelopmentAdmission可接受持久绑定的REAL或SIMULATED结果，仍校验原需求在exact Context中、DAG/产出/预算合同，不接受模型自签权限。\n\nGit G4只把精确审查当evidence，最终Gate由可信程序checker计算。真实Provider授权与凭证隔离是额外准入，不被G0–G6模型建议替代；科研实验、自动提交/推送仍无授权。''',
      'independent-security-review.md':'''# 独立安全审查\n\n两名独立上下文工程代理交叉检查其他作者模块，非AgentNexus模型Reviewer的真实智能试验。机器报告在evidence/reviews，含完整文件hash、FULL/DIFF阅读范围及具体修复证据；Git作者不把自己的Git审查冒称独立，Ledger/Bridge作者同理。\n\n关闭的主要边界包括：授权撤回/expiry发送窗口、异步slot穿透、Key撤销跨await、Vault关闭/跨连接guard失效、轮换ABA、请求来源重标、已结算Usage丢失、超额Key reserve、secret跨event与failure sidecar、未确认helper/producer/transport容量释放、Task key别名、UNKNOWN普通结清。探索失败与修复前证据保留。\n\n最终结论限可信本地库与合成凭证；生产同账户隔离、真实网络费用与自主研发、24小时运行均未资格。时钟回退、真实价格/cache/invoice、真实本地push事件等后续资格不能由本次审查推定PASS。'''}
    for name,text in reports.items():md(OUT/'reports'/name,text)
    md(OUT/'reproduce.md',r'''# 复现

Node24.15.0 / TypeScript5.9.3 / @types/node24.10.1，使用继承lockfile。无需新增npm依赖。可信工程Runner不向Agent开放任意Shell。

```powershell
$env:AGENTNEXUS_TYPE_TOOLS = 'I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\type-tools'
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
$env:AGENTNEXUS_TEST_GIT_PATH = (Get-Command git).Source
node deliverables/AgentNexus-M1.8/source/tools/agentnexus/verify-m18.mjs --output-root .workflow-kit/runtime/AgentNexus-M1.8/reproduce --suite all
node deliverables/AgentNexus-M1.8/source/tools/agentnexus/soak-m18.ts --output-root .workflow-kit/runtime/AgentNexus-M1.8/soak-reproduce --duration-ms 86400000
```

后者需要真实24小时，当前交付未执行该长测。短测不能冒充24小时。Runner复制不可变源码，有界输出、每次独立目录、语法/strict TypeScript/原始TAP/JSON与源码hash。宿主Windows原语资格问题可能使继承测试FAIL；不得改权限或断言来隐藏。

原始数据包跳过文件系统链接/重解析点本体，文字元数据与原运行目录保留。ZIP为包装副本，不把其中inode当原StorageOwner文件身份。源ZIP与所有交付文件用SHA256SUMS核验；清单不包含自身。真实Key不要通过环境变量、命令行、聊天、源码或此工程Runner提供。
''')
    pack(source,OUT/'AgentNexus-M1.8-source.zip')
    raw=OUT/'raw';raw.mkdir(exist_ok=True);pack(RUN,raw/'runtime.zip')
    sums();print(json.dumps({'status':'PASS','source_set_sha256':source_hash,'source_files':len(manifest),'new_tests':counts,'regression':result['summary']['counts'],'runtime_zip_bytes':(raw/'runtime.zip').stat().st_size},ensure_ascii=False))

def sums():
    rows=inventory(OUT);md(OUT/'SHA256SUMS.txt','\n'.join(r['sha256']+'  '+r['path'] for r in rows if r['path']!='SHA256SUMS.txt'))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['finalize','sums']);parser.add_argument('--verification');args=parser.parse_args()
    finalize(pathlib.Path(args.verification)) if args.action=='finalize' else sums()
