"""Assemble the independent report from preserved evidence and explicitly reviewed source."""
from pathlib import Path
import datetime,hashlib,json,re,subprocess

HERE=Path(__file__).resolve().parent
SOURCE=HERE.parent.parent/'source'
WORKSPACE=HERE.parent.parent.parent.parent
def read(name):return json.loads((HERE/name).read_text(encoding='utf-8'))
def save(name,value):(HERE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
manifest=read('source-manifest-final.json');reuse=read('v2-reuse-and-stability.json');probes=read('v1/probe-verification-final.json')
catalog=read('catalog-verification-final.json');env=read('environment-final.json');root_checks=read('output-root-final.json')
main_run=read('main-v2-results.json')
expected='242bf84892d7db9539baa5fca36119af97aa658cf0757ba97c58a17190542f80'
assert manifest['set_sha256']==expected and reuse['v2_set_sha256']==expected and probes['pass']==15 and probes['fail']==0
files={f['path']:f for f in manifest['files']}
assert len(files)==123 and reuse['only_changed_file']=='tests/agentnexus/security.test.ts' and reuse['unchanged_files']==122
assert main_run['source_set_sha256']==expected and main_run['exit_code']==1
assert all(main_run['summary']['counts'][k]==v for k,v in {'tests':380,'passed':351,'failed':2,'skipped':27}.items())
assert all(hashlib.sha256((SOURCE/p).read_bytes()).hexdigest()==f['sha256'] for p,f in files.items())
assert all(c['status']=='PASS' for c in root_checks['checks']) and manifest['history_preservation']['status']=='PASS'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=WORKSPACE,text=True).strip()=='112d915c97ee6e6214f7ce05eab8bd492bbb9bc6'
def tap(name):
    text=(HERE/name).read_text(encoding='utf-8')
    return {k:int(re.findall(r'^# '+k+r' (\d+)$',text,re.M)[-1]) for k in ['tests','pass','fail','skipped']}
native=tap('v1/m16-tests-final.tap');security=tap('security-v2-tests.tap')
assert native=={'tests':75,'pass':75,'fail':0,'skipped':0} and security=={'tests':22,'pass':22,'fail':0,'skipped':0}
assert 'strict noEmit NodeNext' in (HERE/'typecheck-v2.log').read_text(encoding='utf-8')

def loc(path,fragment):
    lines=(SOURCE/path).read_text(encoding='utf-8').splitlines()
    line=next(i+1 for i,s in enumerate(lines) if fragment in s)
    return {'file':str(SOURCE/path).replace('\\','/'),'relative_path':path,'line':line,'sha256':files[path]['sha256']}

# Locations below refer to the final frozen implementation, not guessed line numbers from an overwritten intermediate file.
entries=[
 ('IR-01','P1','取消已确认后仍执行已批准工具',
  '在TASK_DISPATCHED持久ACK返回前阻塞；cancelTask返回STOPPING后放行，真实写工具仍调用一次，最终Task为CANCELLED。',
  'probe-results.json',['src/agentnexus/harness/scheduler.ts',"if(task.pending_tool && task.state==='RUNNING')"],
  '恢复工具前检查停止状态；可信AbortSignal经HostFacade进入原Gateway，并在调用前无await的最终屏障检查。最终取消零写入。'),
 ('IR-02','P1','角色OFF未阻止已有Agent调度',
  'Development Agent和Task预先创建；project scope的runtime.role.lead OFF成功后仍SUCCEEDED并产生一项模型请求。',
  'probe-results.json',['src/agentnexus/harness/agents.ts','this.#state.require(AGENT_TYPES[record.subject.agent_type].feature'],
  'current/dispatch/生命周期发布复查实际角色Feature；Role模块stop按scope和type排空。最终OFF零模型调用。'),
 ('IR-03','P1','项目暂停排空快照后可接纳新Task',
  'A在途时启动项目暂停，B在原项目仍ACTIVE期间进入；PAUSED已ACK时B仍RUNNING，后续创建模型请求。',
  'probe-results-extended-initial.json',['src/agentnexus/harness/index.ts',"'PROJECT_ADMISSION_CLOSED'"],
  '先持久发布PAUSING/CLOSING，后排空，最后PAUSED/CLOSED；模型和工具入口复查项目状态。最终B保持QUEUED且零模型。'),
 ('IR-04','P2','重启保留旧审批但无法重新批准',
  'WAITING工具已批准后close/reopen；旧approval仍在，重新批准报TASK_NO_PENDING_APPROVAL，恢复执行被POLICY_DENIED。',
  'probe-results-extended-initial.json',['src/agentnexus/harness/scheduler.ts','if(pending)delete pending.approval_id'],
  '恢复保留call/参数但清除旧session审批，重新等待显式批准；无自动写，重新批准后仅执行一次并保留持久资源。'),
 ('IR-05','P2','Agent Type Registry项目开关无效',
  'native.agent-type-registry在project scope OFF后仍可创建Agent并完成Task。',
  'admission-results-initial.json',['src/agentnexus/harness/agents.ts',"this.#state.require('native.agent-type-registry',actor);"],
  '按完整Actor作用域检查注册与运行，发布时复查；模块关闭联动排空。最终创建被拒，零模型请求。'),
 ('IR-06','P1','真实持久写入完成即释放磁盘容量',
  '通过原Gateway写入真实100B文件，Task声明disk_bytes=100；文件仍在时platform disk held/spent均为0。',
  'admission-results-initial.json',['src/agentnexus/harness/scheduler.ts',"invariant(!this.#persistent(actor,task),'PERSISTENT_DISK_OWNER_UNVERIFIED')"],
  '已调用LOCAL_WRITE且无存储owner/销毁证明时Task及预留进入UNKNOWN；禁止自动结算。最终文件100B、held100且worker仍保留。'),
 ('IR-07','P2','已知未发送模型请求在取消后仍派发',
  'MODEL_BUDGET_RESERVED ACK处停止；cancel ACK时sequence=0，放行后sequence=1、模拟tokens spent=111，Task最后CANCELLED。',
  'admission-results-extended.json',['src/agentnexus/harness/models.ts',"invariant(!trustedSignal?.aborted,'MODEL_CANCELLED_NOT_SENT');"],
  '模型入口传入可信Signal并在各ACK后及发送前检查；未发送取消结算零用量，SENT未知仍保留。最终seq0/tokens0/CANCELLED。'),
 ('IR-08','P2','子代理复用父Task而获得隐式历史读取权',
  'SUBAGENT使用父task_id可创建，read_tasks=[]仍可读取父ContextSource的174B内容。',
  'admission-results-extended.json',['src/agentnexus/harness/agents.ts',"'AGENT_TASK_MUST_BE_INDEPENDENT'"],
  '同项目Agent任务必须独立，父历史读取另需显式授权。最终同Task创建被拒。'),
 ('IR-09','P2','sendText重启后业务去重冲突',
  '首次消息成功，真实close/reopen后相同sender/task/text/dedup_key触发MESSAGE_DEDUP_CONFLICT并创建第二份草稿。',
  'admission-results-messaging.json',['src/agentnexus/harness/index.ts','const draftId=sha256(canonical'],
  '草稿与MessageBus都使用逻辑Agent/Project/Task业务键，不含session；复用原始immutable source。最终同ID、1消息、1草稿。'),
 ('IR-10','P2','Gate OFF发生于证据验证期间却仍写有效状态',
  '真实Artifact流验证await时关闭wf.gate.g2；OFF ACK后Gate仍记SIMULATED且feature_enabled=true。',
  'workflow-results-initial.json',['src/agentnexus/harness/workflow.ts','const effective=enabled&&'],
  '提交事务内复查Runtime/Gate/Evidence Feature；中途OFF写BYPASSED。checkpoint/decision/checklist也在发布时复查。'),
 ('IR-11','P2','关闭资源功能后不能重新启动控制面',
  '合法关闭project worker budget与scheduler后安全close；再次openHarness被resource.worker.budget OFF阻断。',
  'admission-results-recovery-only.json',['src/agentnexus/harness/agents.ts','// Recovery restores the control plane'],
  '恢复只重建控制投影；新Worker预算和缺失Platform预算延迟到显式、已通过Feature检查的dispatch。最终控制面可重新打开。'),
 ('IR-12','P1','大工具结果归档失败绕过持久磁盘保留',
  '真实写100B且原Gateway SUCCEEDED/SETTLED；合法data长度64791使原output_ref=65508B，而重复封装结果超过65536B，ARTIFACT_LIMIT后Task FAILED并释放disk/workers。',
  'disk-capture-results-pinned-pre-freeze.json',['src/agentnexus/harness/scheduler.ts',"if(persistent)await this.#update(id,'TASK_PERSISTENT_WRITE_OBSERVED'"],
  '实际调用后先持久标记；catch和release按原request_key/executor独立回查；成功结果直接引用原Gateway Archive，避免重复包装。最终大结果保持UNKNOWN/held100/worker1。'),
 ('IR-13','P2','Windows大小写别名绕过CLI输出路径保护',
  '归档旧CLI比较器对source.toLowerCase()返回不拒绝，而实际realpath确认是同一既有Windows目录；未尝试向源码写文件。',
  'output-root-initial-static.json',['tools/agentnexus/output-root.ts',"const key=(value:string)"],
  '统一helper解析既有祖先realpath并做Windows casefold，再按路径边界拒绝源码内输出；最终实际helper两次拒绝、一次接受合法审查目录。'),
]
findings=[]
for ident,priority,title,trigger,evidence,location,fix in entries:
    findings.append({'id':ident,'priority':priority,'title':title,'status':'RESOLVED_IN_V2_IDENTICAL_PRODUCT_AS_V1',
        'trigger_and_initial_evidence':trigger,'initial_evidence':evidence,'location':loc(*location),'fix_review':fix,
        'initial_assurance':'STATIC_READ_ONLY_COMPARATOR' if ident=='IR-13' else 'ACTUAL_PRODUCT_MODULES; MOCK_PROVIDER; REVIEW_OWNED_FILES_ONLY'})

limitations=[
 {'id':'L-CPU','status':'BLOCKED','detail':'严格Windows累计CPU合同未修复；M1.5.1最终58项56 FAIL/2 PASS永久保留。主线v2继承CPU用例同样FAIL：Job累计29062500 ticks，需Helper DEADLINE。未重跑58矩阵，CPU_RATE/采样/模拟账本不升级为严格硬限制。'},
 {'id':'L-TOCTOU','status':'FAIL','detail':'主线v2继承TOCTOU fixture在swaps>0断言失败，替换计数为0；此轮动态替换攻击覆盖INCONCLUSIVE，不能据此宣称逃逸已发生或资格通过。原断言与历史成功/失败均保留，不降低阈值。'},
 {'id':'L-OS','status':'BLOCKED','detail':'LOCAL_TRUSTED_LIBRARY不是恶意同进程代码或真实Worker的OS安全边界。Windows生产账户、ACL/AppContainer、完整生产退出证明未独立验收；Ubuntu NOT_RUN。'},
 {'id':'L-DISK','status':'BLOCKED','detail':'实际LOCAL_WRITE可在精确审批后执行，但无持久存储所有权转移/销毁适配器，Task与全部相关claims保持UNKNOWN，不支持自动成功结算或自动回收。'},
 {'id':'L-MODEL','status':'SIMULATED','detail':'仅静态Mock Provider、模拟token/费用及mock Vault handle；未读取真实Key、连接真实Provider或产生费用。'},
 {'id':'L-WORKFLOW','status':'PARTIAL','detail':'G0-G6为版本/证据/状态ledger，PASS是可信owner声明，不能视为自动质量认证；规则捕获/必需上下文已实现，wf.context仍INTERFACE_ONLY/NOT_RUN。'},
 {'id':'L-AUTOMATION','status':'NOT_RUN','detail':'未独立验证自动Git commit/push watcher、长期Resident/Coordinator服务、真实Host/OS重启或硬断电；安全SQLite reopen不是生产重启。'},
 {'id':'L-RECOVERY','status':'BLOCKED','detail':'在途模型/工具/资源不确定时仍需owner reconciliation；不提供未知副作用自动重试或UNKNOWN自动释放。'},
]
new_paths=manifest['diff']['new'];changed_paths=manifest['diff']['changed']
reading=[]
for path in new_paths+changed_paths:
    kind='FULL_NEW_IMPLEMENTATION_OR_TEST_READ' if path in new_paths else 'FULL_INHERITED_DIFF_REVIEW'
    if path.startswith('config/'):kind='PARSED_FULL_CATALOG_AND_M16_MAPPING_REVIEW'
    reading.append({**files[path],'review':kind})
save('reading-manifest-final.json',{'schema':'agentnexus/independent-review/reading/1.6','source_set_sha256':expected,
 'reviewed_new_and_changed':reading,'unchanged_baseline':'All 100 baseline hashes verified; unchanged native C#/PowerShell and all historical source were not freshly line-reviewed.',
 'supporting_code_selected_sections':['storage.ts','artifacts.ts','features.ts','policy.ts','types.ts','records.ts','M1.5.1 acceptance/CPU/deployment/independent reports'],
 'recursive_delegation':False,'product_source_modified_by_reviewer':False})
report={'schema':'agentnexus/independent-review/final/1.6','issued_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'verdict':'LOCAL_SCOPE_PASS_WITH_LIMITATIONS','production_qualified':False,'new_open_findings':[],
 'binding':{'branch':'main','head':manifest['git']['head'],'candidate_commit_exists':False,'source_files':123,'source_set_sha256':expected,
 'source_manifest':'source-manifest-final.json','source_snapshot':manifest['snapshot_zip'],'diff_from_m151':'source-diff-final.patch'},
 'independence':{'reviewer':'Independent Codex review sub-agent','writes_confined_to':str(HERE),'product_edits':False,'recursive_delegation':False,
 'governance_note':'govern.py new refreshes shared governance files; reviewer used its explicitly assigned evidence directory and left shared refresh/check to the main owner.'},
 'validation':{'environment':env,'native_m16':{**native,'run_source_set_sha256':reuse['v1_set_sha256'],'evidence':'v1/m16-tests-final.tap','reused_for_v2':'All product/config/M16 test inputs identical; only security.test.ts differs.'},
 'actual_probes':{'total':15,'pass':15,'fail':0,'run_source_set_sha256':reuse['v1_set_sha256'],'evidence':'v1/probe-verification-final.json','assurance':'Real product SQLite/Gateway/Artifact/Feature modules; Mock model and injected Audit failure; actual file writes only under review evidence.'},
 'v2_security':{**security,'evidence':'security-v2-tests.tap'},'strict_typecheck':{'status':'PASS','evidence':'typecheck-v2.log'},
 'output_root_helper':{'status':'PASS','checks':3,'evidence':'output-root-final.json'},'v2_reuse_and_post_validation_hash':'v2-reuse-and-stability.json',
 'full_all_regression':{'status':'FAIL','assurance':'MAIN_EXECUTION_INDEPENDENT_RAW_LOG_REVIEW; not independently rerun',
  'total':380,'pass':351,'not_run':27,'fail':2,'exit_code':1,'source_set_sha256':expected,'raw_results':'main-v2-results.json','raw_tap':'main-v2-all-tests.tap',
  'failed_cases':[e for e in main_run['cases'] if e['type']=='test:fail'],'native_cpu_qualification_rerun':False}},
 'preservation':{'baseline':manifest['baseline'],'history':manifest['history_preservation']},
 'findings':findings,'catalog_verification':'catalog-verification-final.json','remaining_limits':limitations,
 'initial_evidence_limit':'Initial live-integration findings retain raw observations and selected module hashes, not complete initial source-tree captures. The critical large-result failure and CLI comparator are fully bound to the preserved d1bab54a pre-freeze snapshot. Final v1/v2 whole trees are independently archived and hashed.',
 'initial_module_hash_readback':'initial-module-readback-hashes.json',
 'v2_test_only_change':'Only security.test.ts changed 44 to the exact approved 52 policies and asserted the eight new L0 nondegradable IDs; unknown ID/level/owner/duplicate and bypass negatives remain intact. Historical source and CPU/TOCTOU assertions were not changed.'}
save('final-review.json',report)

md=['# AgentNexus M1.6 独立审查（最终 v2）','',
 '本地新增范围通过，保留明确限制。完整回归仍为 **FAIL（2项继承失败）**；严格CPU和完整生产执行资格仍为 **BLOCKED**。最终没有仍开放的本轮新代码发现。',
 '',f"绑定分支 `main`、HEAD `{manifest['git']['head']}`，以及 **未提交**的123文件源码集合 `{expected}`。没有新Commit，也没有自动Commit/Push。逐文件清单、完整快照ZIP和相对M1.5.1的diff分别见 [manifest](source-manifest-final.json)、[ZIP](source-snapshot-final.zip)、[diff](source-diff-final.patch)。",'',
 '## 独立验证与复用范围','',
 '| 验证 | 实际结果 | 原始证据 |','|---|---|---|',
 '| 全部M1.6测试 | 75 PASS / 0 FAIL / 0 skip | [TAP](v1/m16-tests-final.tap) |',
 '| 独立实际负例与故障注入 | 15 PASS / 0 FAIL | [逐项观察](v1/probe-verification-final.json) |',
 '| v2安全回归 | 22 PASS / 0 FAIL | [TAP](security-v2-tests.tap) |',
 '| v2全源码严格类型检查 | PASS；Node24.15 / TS5.9.3 / @types/node24.10.1 | [日志](typecheck-v2.log) |',
 '| 输出目录实际helper | 2项源码路径拒绝、1项合法目录接受 | [结果](output-root-final.json) |',
 '| 主线完整all回归（独立读取原件） | 380项：351 PASS / 27 NOT_RUN / 2 FAIL，exit 1 | [原始TAP](main-v2-all-tests.tap)、[原始JSON](main-v2-results.json) |',
 '',
 f"75项M1.6测试及15项探针实际运行于冻结v1 `{reuse['v1_set_sha256']}`。v2只有 `tests/agentnexus/security.test.ts` 一处测试维护，另122文件（全部产品模块、配置、M1.6测试及工具）逐字节相同。该单一diff已独立复核，v2安全测试与strict检查重新执行；没有将未执行的全量v2运行冒充新跑。详见 [复用及后验哈希证明](v2-reuse-and-stability.json) 和 [v1/v2 diff](v1-v2-security.patch)。",'',
 '独立测试使用真正的KernelStore/SQLite、Artifact/Zstd、FeatureRegistry、原Policy/Permit/ToolGateway路径。文件写入确实发生在独立审查目录；模型、计费与审计故障注入明确属于模拟。独立审查者未执行真实Provider、OS部署、CPU58资格矩阵或全native生产测试；主执行者的all结果已按同一v2源码哈希独立读取，不能据新增75项通过消除其2项FAIL。','',
 '## 继承失败的当前裁定','',
 '- CPU原语：`M1.4 REAL_WINDOWS_PRIMITIVE: cumulative Job CPU time kills a busy fixture before wall deadline` 当前FAIL。原始消息明确记录Job累计 `29062500 ticks` 且必须使用Helper `DEADLINE` 终止；配置JOB_TIME不构成硬限制证据。原M1.5.1严格58场景的56 FAIL/2 PASS仍保留，任何旧弱断言的偶然PASS也不升级资格。',
 '- TOCTOU原语：`M151 REAL_WINDOWS_PRIMITIVE: concurrent directory replacement never returns junction target bytes` 当前FAIL，失败于原 `swaps>0` 断言（swaps=0）。这次没有形成要求的实际junction替换，动态攻击覆盖INCONCLUSIVE；不能把未观察到外部字节提升成资格PASS，也没有证据据此断言实际逃逸发生。原预算、原断言和历史原件未修改。','',
 '## 修前发现及最终复核','',
 '以下行号指向最终冻结源码中的修复位置；初始现象与原始失败文件均保留。', '']
for f in findings:
    l=f['location'];md += [f"### {f['id']} {f['priority']} — {f['title']}",'',
      f"位置：[{l['relative_path']}:{l['line']}]({l['file']}:{l['line']})；该文件SHA256 `{l['sha256']}`。",'',
      f"触发/证据：{f['trigger_and_initial_evidence']} [原始观察]({f['initial_evidence']})。",'',
      f"修复复核：{f['fix_review']} 状态：**RESOLVED**。",'']
md += ['## 关键P1归档故障证据','',
 '大结果反例是在逐成员hash核验后的旧源码副本上实际复现，完整绑定 `d1bab54ac66a135e1d3e627786c344c802633b2c48dfd8a6c57b2894df80a0c8`。旧版Gateway已经成功写100B且输出65508B，但包装层超限后释放了磁盘和Worker；新版相同64791B data保持 `UNKNOWN_QUARANTINED`、disk held=100、worker held=1，并直接引用原Archive。见 [修前固定快照复现](disk-capture-results-pinned-pre-freeze.json) 和 [修后同探针](v1/disk-capture-results-final.json)。','',
 '初期若干即时发现只留有原始观察及部分模块测后hash，未捕获完整初始树；不会将其冒称完整历史commit。最终v1/v2及关键大结果修前版本都有完整快照。','',
 '## 仍须保留的能力边界','']
for limit in limitations:md.append(f"- **{limit['status']} / {limit['id']}**：{limit['detail']}")
md += ['',
 '已独立逐SHA256核对100个M1.5.1基线文件及3341个历史文件（1,173,867,087B），无差异；原CPU FAIL、旧预算/容差、原TOCTOU及其他历史证据均保留。v2安全测试只维护新Catalog的精确数量和已批准ID，没有放宽安全负例、CPU阈值或旧原语断言。','',
 '190 Feature / 52 Policy中，本轮注册43项模块，8条新增Policy均为固定L0、不可降级，并已映射到实际通过的case；`wf.context`保留INTERFACE_ONLY/NOT_RUN，Gate仅声明ledger范围。见 [目录核对](catalog-verification-final.json)。','',
 '覆盖全部新增运行/资源实现、全部新增交付工具以及所有继承文件改动；阅读范围和文件hash见 [reading manifest](reading-manifest-final.json)。未重新逐行审查未改动的全部历史C#/PowerShell源码，也未独立运行完整生产链、长期服务和硬断电测试。','',
 '审查者仅写独立审查证据目录，未改产品、历史、项目规则或系统配置，未派发子代理。后续应先完成真实存储owner/回收证明、独立执行后端资格及必要的单独授权，再考虑生产放行。','']
(HERE/'final-review.md').write_text('\n'.join(md),encoding='utf-8')
print(json.dumps({'verdict':report['verdict'],'source_files':123,'source_sha256':expected,'resolved_findings':len(findings),'open_new_findings':0,
                  'm16_pass_reused_identical_inputs':75,'actual_probes_pass_reused_identical_products':15,'v2_security_pass':22,'strict':'PASS'}))
