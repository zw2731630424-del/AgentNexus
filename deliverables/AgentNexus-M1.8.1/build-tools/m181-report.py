"""Create evidence-backed M1.8.1 reports; live blockers remain blockers."""
from __future__ import annotations
import datetime, hashlib, json, pathlib, shutil, subprocess
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'deliverables/AgentNexus-M1.8.1'
RUN=ROOT/'.workflow-kit/runtime/AgentNexus-M1.8.1'

def write(rel,value):
    p=OUT/rel;p.parent.mkdir(parents=True,exist_ok=True)
    with p.open('x',encoding='utf-8',newline='\n') as f:
        if isinstance(value,str):f.write(value.rstrip()+'\n')
        else:json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def brief(r):return {k:r.get(k) for k in ['status','source_set_sha256','syntax_pass','tsc','tests','summary','errors']}

def main():
    final_dirs=sorted((RUN/'final-verification').glob('*/results.json'),key=lambda p:p.stat().st_mtime)
    assert final_dirs,'No completed verification';final_path=final_dirs[-1];final=load(final_path)
    from importlib.util import spec_from_file_location,module_from_spec
    spec=spec_from_file_location('delivery',ROOT/'tools/agentnexus/m181-delivery.py');delivery=module_from_spec(spec);spec.loader.exec_module(delivery)
    current_set=delivery.source_set(delivery.inventory(OUT/'source',delivery.NAMES))
    assert final['source_set_sha256']==current_set,'FINAL_SOURCE_NOT_VERIFIED'
    cases=[c for c in final['cases'] if str(c.get('name','')).startswith('M181 ')]
    new=dict(tests=len(cases),passed=sum(c['type']=='test:pass' and not c.get('skip') for c in cases),failed=sum(c['type']=='test:fail' for c in cases),skipped=sum(bool(c.get('skip')) for c in cases))
    assert new['tests']>0 and new['failed']==0 and new['skipped']==0,new
    baseline_path=next((RUN/'baseline-verification').glob('*/results.json'));baseline=load(baseline_path)
    attempts=[]
    for group in ['baseline-verification','model-verification','final-verification']:
        for result_file in sorted((RUN/group).glob('*/results.json')):
            r=load(result_file);name=group+'/'+result_file.parent.name
            dest=OUT/'evidence/verification'/name;dest.mkdir(parents=True,exist_ok=False)
            for filename in ['results.json','run.json','source-manifest.json','syntax.json','typecheck.json','tsc.stdout.txt','tsc.stderr.txt','all-tests.tap','runner.stderr.txt','events.jsonl']:
                p=result_file.parent/filename
                if p.is_file():shutil.copy2(p,dest/filename)
            attempts.append(dict(path='evidence/verification/'+name,**brief(r)))
    write('evidence/verification-attempts.json',attempts)
    subprocess.run(['node',str(ROOT/'tools/agentnexus/m181-evidence.mjs'),str(pathlib.Path(final['data'])),str(OUT/'evidence/fixtures')],cwd=ROOT,check=True)
    traces=load(OUT/'evidence/fixtures/request-index.json')
    original=pathlib.Path('C:/Users/28642/.codex/attachments/0ebb6492-131b-4e1a-9665-c8c628638542/已粘贴的文本.txt')
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    baseline_record=load(RUN/'baseline.json')
    authorization=dict(schema='agentnexus/m1.8.1/authorization/1',source='EXPLICIT_USER_REQUEST_IN_CURRENT_CHAT',request_sha256=sha(original),
        provider_allowlist=['deepseek'],endpoint_allowlist=['https://api.deepseek.com/chat/completions'],total_input_output_tokens=100000000,
        cache_tokens_included_in_input=True,reasoning_tokens_included_in_output=True,budget_is_ceiling_not_target=True,
        prior_usd_001_cap_superseded=True,live_credentials_read=False,first_round_source_upload=False,os_accounts_or_acl_changes=False,
        process_or_external_effect_grant=False,git_push=False,credential_entry='LOCAL_TRUSTED_ENTRY_REQUIRED; NO CHAT/ARGV/ENV/PLAINTEXT',
        active_live_grants=0,activation='BLOCKED_BY_PRODUCTION_VAULT_AND_OS_QUALIFICATION')
    write('authorization.json',authorization)
    write('provider-capability-registry.json',dict(schema='agentnexus/m1.8.1/capabilities/1',checked_at=now,evidence_type='OFFICIAL_DOCUMENTATION_NOT_LIVE_DISCOVERY',
        provider='deepseek',endpoint='https://api.deepseek.com/chat/completions',request_model_id='deepseek-flash',documented_served_label='DeepSeek-V4.1-Flash-1017',
        response_model_documented_example='deepseek-flash',response_model_observed=None,system_fingerprint_observed=None,exact_snapshot_pin='UNQUALIFIED_ALIAS_CAN_CHANGE',
        other_documented_id='deepseek-v4-pro',other_model_selected=False,
        official_limits=dict(context_tokens=1048576,output_tokens=393216,account_concurrency=2500),
        local_limits=dict(context_bytes=262144,registered_output_tokens=65536,gateway_output_tokens=4096,response_bytes=1048576,normalized_output_bytes=32768,requests_per_minute=60,max_gateway_concurrency=4),
        protocol_offline_tests='PASS',live='NOT_RUN',text=True,json_output=True,streaming=True,tool_intents=True,
        vision_in_current_contract=False,native_tool_history_replay='NOT_IMPLEMENTED',gateway_reasoning_selection='DISABLED_CURRENT_GATEWAY',
        sources=['https://api-docs.deepseek.com/quick_start/pricing/','https://api-docs.deepseek.com/api/list-models/','https://api-docs.deepseek.com/api/create-chat-completion/']))
    write('usage-token-cost.json',dict(schema='agentnexus/m1.8.1/usage/1',authorization_total_tokens=100000000,real_provider_requests=0,
        input_tokens=0,output_tokens=0,cache_hit_tokens=0,reasoning_tokens=0,failed_request_tokens=0,remaining_authorized_tokens=100000000,
        actual_cost_micros=0,estimated_live_cost_micros=0,currency='USD',usage_source='NO_LIVE_REQUESTS',provider_usage_receipts=0,
        accounting_tests_excluded=True,fixture_requests=len(traces['requests']),fixture_traces=traces['traces'],fixture_audit_records=traces['audits'],
        campaign_implementation='source/src/agentnexus/model-runtime/campaign.ts',
        durable_host_singleton_deployment='BLOCKED; production bootstrap must pin one Host store for this authorization; a new DB is not extra quota',
        missing_usage='full reservation retained, ESTIMATED upper bound, all further campaign sends blocked',
        cost_semantics='rate estimate / peak upper bound; actual invoice fields remain null until billing proof'))
    failures=[dict(name=c['name'],error=c.get('details',{}).get('error',{}).get('message')) for c in final['cases'] if c['type']=='test:fail']
    old_failures={c['name'] for c in baseline['cases'] if c['type']=='test:fail'}
    write('evidence/regression-comparison.json',dict(baseline=brief(baseline),candidate=brief(final),
        added_failure_names=[x['name'] for x in failures if x['name'] not in old_failures],resolved_failure_names=sorted(old_failures-{x['name'] for x in failures}),
        caveat='Same sandbox, separate retained runs. Windows concurrency/timing failures may vary; no OS qualification is inferred.'))
    write('evidence/live-requests.json',dict(status='NOT_RUN',requests=[],provider_responses=[],provider_receipts=[],reason='LIVE Vault refuses import before credential access or network dispatch',all_live_audit_events=[]))
    metrics=['task_completion_rate','test_pass_rate','defect_count','reviewer_detection_rate','repair_success_rate','rework_count','wall_time_ms',
        'input_tokens','output_tokens','actual_cost_micros','model_switching_count','human_intervention_count','context_retrieval_accuracy','goal_deviation']
    write('quality-metrics.json',dict(status='NOT_RUN',live_task_samples=0,single_agent_samples=0,multi_agent_samples=0,comparative_result='INCONCLUSIVE',
        metrics={k:dict(value=None,measurement_source='NOT_RUN') for k in metrics},
        required_sources=['MODEL_SELF_REPORT','AUTOMATED_TEST','INDEPENDENT_REVIEWER','HUMAN_SAMPLE'],offline_engineering_tests_separate=True))
    write('resident-24h.json',dict(status='NOT_RUN',required_wall_ms=86400000,observed_live_wall_ms=0,live_events=0,live_model_calls=0,
        reason='LIVE qualification failed; no 24-hour live process started; no simulated time conversion',cpu=None,ram=None,queue=None,context_growth=None))
    write('pilot/requirements.md','''# M1.8.1 独立 Pilot：Synthetic Event Summary

状态：HOST_AUTHORED_PREPARATION / LIVE NOT_RUN。这是新的独立工作区合同，不是模型交付。不得修改 AI_Consciousness、AI_NeuroWeave、AI_Highlycomplex 或 AgentNexus 自身源码。

实现无依赖 ESM 模块 summarize(events)，输入为 {id,value} 数组。id 为1–64位ASCII字母、数字、下划线、短横线；value 为无前导零的规范十进制整数字符串，可为负数，禁止 -0。重复相同id与相同value只计一次；相同id冲突抛出 E_CONFLICT。非法字段/输入抛出 E_INPUT。返回 {count,total}，count 为去重后数量，total 为任意精度整数十进制字符串；不得用浮点累加导致精度损失。输入不得被修改。模块不得自行进行网络、文件或进程操作。

客观验收：独立冻结的验收测试、输入不变性、边界值、重复与冲突；G0–G6只有已资格Owner可出具。Research/Coding/Test/Debug必须由真实模型生成任务和实现，经 Message Bus、Tool Gateway、Storage Owner交付。Reviewer只读，未知缺陷评估答案不放入其上下文。

Single与Multi从同一initial目录的同一哈希开始，模型别名与system_fingerprint需留证；各臂最高50万总Token、30分钟，均包含在本轮1亿总额度内。模型规划不能预写；当前没有模型代码、没有运行样本、没有执行任意生成代码。PROCESS资格仍BLOCKED。首次live基础验证不发送此目录源码；后续使用此合成Pilot必须先逐字审查并登记外发合同。
''')
    write('pilot/initial/summary.mjs',"// HOST_AUTHORED_INITIAL_STUB. No model implementation has run.\nexport function summarize(_events) { throw new Error('NOT_IMPLEMENTED'); }")
    write('pilot/initial/README.md','''# Synthetic Event Summary 初始工作区

HOST_AUTHORED_PREPARATION。实现范围仅 summary.mjs；无依赖，不得外联或执行命令，不得读取工作区外文件。代码与验收测试通过 AgentNexus Owner 写入和验收；Reviewer只读。规则版本 m181-pilot-1。当前stub故意未实现，不是模型输出。
''')
    write('pilot/acceptance.test.mjs','''// HOST_AUTHORED_ACCEPTANCE. NOT_RUN: generated-code PROCESS qualification absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './initial/summary.mjs';
test('empty',()=>assert.deepEqual(summarize([]),{count:0,total:'0'}));
test('exact integers',()=>assert.deepEqual(summarize([{id:'a',value:'9007199254740993'},{id:'b',value:'7'}]),{count:2,total:'9007199254741000'}));
test('signed cancellation',()=>assert.deepEqual(summarize([{id:'a',value:'1000000000000000000000'},{id:'b',value:'-1000000000000000000000'}]),{count:2,total:'0'}));
test('idempotency',()=>assert.deepEqual(summarize([{id:'a',value:'2'},{id:'a',value:'2'}]),{count:1,total:'2'}));
test('conflict',()=>assert.throws(()=>summarize([{id:'a',value:'2'},{id:'a',value:'3'}]),/E_CONFLICT/));
test('invalid',()=>{for(const value of ['01','-0','1.0','+1','1e3',''])assert.throws(()=>summarize([{id:'a',value}]),/E_INPUT/);});
test('immutable',()=>{const input=[Object.freeze({id:'a',value:'1'})];Object.freeze(input);assert.deepEqual(summarize(input),{count:1,total:'1'});});
''')
    initial=[dict(path=p.relative_to(OUT/'pilot').as_posix(),sha256=sha(p)) for p in sorted((OUT/'pilot/initial').rglob('*')) if p.is_file()]
    write('pilot/comparison-contract.json',dict(status='PREPARATION_ONLY',single_initial=initial,multi_initial=initial,
        max_total_tokens_per_arm=500000,max_wall_ms_per_arm=1800000,part_of_global_100m=True,actual_arms_executed=0,live_generated_artifacts=[],outcome='INCONCLUSIVE'))
    report('phase0','Phase 0：基线与官方技术核验',f'''根AGENTS、治理策略和工作流路由已读；project-rules/README.md不存在，未修改规则、启用模块或安装Hook。M1.8完整验收、Vault设计/联调草案/安全审查、Gateway/Adapter/Router/Key Pool/Usage/资源与Context边界已读。此前没有独立Data Egress Owner，本版新增精确字节准入。

main / {baseline_record['head']}。178文件源码集 {baseline_record['source_set_sha256']} 与M1.8匹配；251项交付SHA全部匹配。基线前git status观测为空；冻结记录中的唯一untracked是本轮刚创建的m181-delivery.py。{len(baseline_record['history'])}项历史与根产品在交付结束再次逐字核验，不覆盖历史结果。

官方API核验来自公开文档浏览，未带Authorization，也未调用模型服务。request ID deepseek-flash对应当前文档服务标签DeepSeek-V4.1-Flash-1017；文档示例response.model仍为别名。实际模型响应、版本固定和/models在线发现均NOT_RUN。见deepseek-official-check.md与机器registry。''')
    report('deepseek-official-check','DeepSeek 官方接口核验','''核验日期2026-11-08。POST https://api.deepseek.com/chat/completions；请求名deepseek-flash，当前服务标签DeepSeek-V4.1-Flash-1017。另有deepseek-v4-pro，本轮未选。别名不等于可固定的快照。响应示例的model是deepseek-flash，实测标识仍未知。[调用文档](https://api-docs.deepseek.com/quick_start/pricing/)、[模型元数据](https://api-docs.deepseek.com/api/list-models/)。

流式SSE以[DONE]终止。当前DeepSeek的Usage位于携带finish_reason的末内容块；原OpenAI式usage-only合成fixture保留兼容。输入缓存拆分须守恒，reasoning已包含在completion中。每个真实chunk必须绑定model；model变化或畸形Usage关闭失败。JSON空白、length、aborted、insufficient_system_resource不计成功。[Chat API](https://api-docs.deepseek.com/api/create-chat-completion/)、[JSON](https://api-docs.deepseek.com/guides/json_mode/)。

Flash每百万Token美元费率：峰时hit0.006/miss0.30/output1.20；非峰hit0.003/miss0.15/output0.60。本地预留用峰时全miss上界，不沿用旧0.01美元限制。公开费率估算与真实账单分开，不能以UTC时钟猜测跨时段请求账单。[官方价格](https://api-docs.deepseek.com/quick_start/pricing/)。

账户Flash并发上限2500，跨Key合计；本地策略更低。SSE可有keep-alive注释，等待推理10分钟后服务端可关闭连接；这不意味着取消后免费或结果确定。本地30秒deadline/Abort始终保留未知Usage且不自动重发。[限流与超时](https://api-docs.deepseek.com/quick_start/rate_limit/)。

400/422映射能力/参数拒绝，401/403认证，402请求/余额拒绝，429限流，5xx Provider失败；不回显供应商error正文。[错误码](https://api-docs.deepseek.com/quick_start/error_codes/)。Tool Calling只产生受限意图，真正执行仍由Tool Gateway决定。[工具格式](https://api-docs.deepseek.com/guides/tool_calls/)。

重要未实现项：原生多轮assistant/tool消息与tool_call_id回放、reasoning+tool历史保持、非流式自然文本资格。当前Gateway使用结构化ModelReply与Context拼接，强制reasoning disabled；不能冒称这些真实模型能力已通过。[Thinking约束](https://api-docs.deepseek.com/guides/thinking_mode/)。''')
    report('credential-vault-qualification','Credential Vault 生产资格','''结论：BLOCKED。vault.ts明确只接收SYNTHETIC，assurance固定SIMULATED，LIVE在碰文件或解密前拒绝。生产Host/Worker身份、受保护部署ACL、启动对象与组合deny证明缺失；同SID CurrentUser DPAPI不能证明隔离。Windows API与Ubuntu未来适配接口保持独立。

本轮没有读真实Key、聊天Key、既有凭证库或环境秘密，没有更改账户/ACL。没有新增可以用布尔开关启用LIVE的后门。Host对象capability/Worker facade测试只能证明可信库接口，不证明同账户无法读Vault文件或进程内存。

可信输入入口仍依赖部署资格：批准的独立标准Host/Worker/Operator身份，固定代码/helper/executable哈希与ACL、Host-only密文目录、实际Worker拒绝测试、认证IPC、重启/撤销/轮换证明。之后才可在本地masked输入接收专用DeepSeek凭证，禁止聊天/argv/env/明文文件。没有资格前不要求提供Key。独立审查见independent-security-review.md。''')
    report('vault-security-tests','Vault 安全测试范围','''候选复跑继承的合成Vault加密、Key Handle绑定、轮换ABA、并发、撤销跨await、跨连接guard、错误/跨chunk泄漏防护，以及新增“合成Vault不能晋升为REAL Gateway”测试。每项真实PASS/SKIP见最终results.json；DPAPI受环境限制项保持SKIP，不补写历史。

Key不写普通业务表/Archive/Audit/Prompt的已知secret门覆盖合成值；它不能保证任意未知编码/同账户内存隔离。真实Key导入、跨身份Vault拒绝、Ubuntu后端与OS审计仍NOT_RUN/BLOCKED。''')
    report('model-gateway-integration','Model Gateway 联调',f'''真实DeepSeek请求0，结果NOT_RUN；离线路径PASS（受最终测试逐项证据约束）。新增链路：Context重建→精确外发许可→统一campaign原子预留→四级Usage预算→Transport授权→Vault lease→最后同步撤销检查→Provider parser→Usage/Archive/Audit。

失败解析也保留有效Provider Usage，response_complete=false使原预留保留；UNKNOWN不触发重发，付费请求幂等返回已有结果。模型response_model/fingerprint以及请求正文/响应wire哈希可追溯。工程fixture {len(traces['requests'])}个Gateway记录，{traces['traces']}条转录，全部SIMULATED。

没有真实Gateway完整性、网络重连或账单证明。不能将本版Adapter、文档核验或自报QUALIFIED回调视为LIVE准入。''')
    report('key-pool','Key Pool 验证','''Pool继承Host-only synthetic Vault，跨Key健康、并发、费用、请求ID、世代和轮换测试继续保留。新增campaign在Key选择之前统一计量，不能每个Key/Session领取额外1亿额度；NOT_SENT只释放从未发送的预留，sent/unknown不可释放。真实Key Pool、限流Retry-After、账户余额和实际Key轮换均NOT_RUN。''')
    report('streaming','Streaming 与长上下文','''新增官方末块Usage/cache格式、UTF-8与中文分块、截断JSON/tool、取消、连接中断和异常finish验证。SSE拉取模式保持背压，chunk64KiB/event64KiB/总wire1MiB/规范输出32KiB有界；Context最大256KiB，Gateway输出4096Token。本版没有宣称实测官方1M上下文或384K输出。

response-evidence.ts逐块计算精确wire哈希与bytes/chunks，失败保留不完整状态；请求正文SHA和Context/source manifest独立绑定。为避免跨块secret与reasoning泄漏，普通Archive只写guard通过的规范回复，未完整验证的原始partial不落普通档案。**安全隔离的原始partial分块持久化尚未实现**，不能据此验收用户要求的完整长流恢复能力。

真实Streaming/背压/网络断连/超长输出/任务恢复均NOT_RUN；既有合成测试和短流不等于真实稳定性。''')
    report('usage-token-cost','全局 Token 与费用账本','''授权总上限1亿输入+输出Token，DeepSeek唯一真实Provider。cache包含在input、reasoning包含在output，不重复叠加。campaign固定ID、事务used+held准入，跨Key/Task/Session共用同一持久Host store；生产部署还必须固定唯一Host数据库，禁止换库获得新额度。当前OS部署未资格，所以真实全局Owner未激活。

Provider Usage优先；失败有Usage则记录实际Token，缺Usage保留完整预留并记ESTIMATED上界；任一未知请求阻断后续campaign发送。超额观察永久阻断等待Owner核对，没有reset或自动退款接口。90%附近inspect返回near_limit，操作方应提醒；尚无生产通知订阅资格。

DeepSeek费率helper支持cache/峰谷估算与BigInt向上取整；Gateway默认峰时全miss上界。估算费用与实际发票分离。真实请求0、Token0、费用$0；纯REAL账本算法fixture不计Provider消费。见usage-token-cost.json。''')
    report('data-egress-policy','Data Egress Policy','''PUBLIC/SYNTHETIC必须由可信Host verifier逐字审阅来源，并绑定project/provider/model/endpoint/Context SHA/body SHA/sources SHA/授权ref/expiry；模型自行分类没有权限。INTERNAL本轮默认拒绝，CONFIDENTIAL/SECRET拒绝。本轮未授权源码、历史/科研材料或凭证外发。

每次在Vault/网络前审计ALLOW/DENY及来源哈希，发送前同步复核grant撤销/到期/全部receipt字段并做秘密扫描。Transport复核持久grant，伪造一个标成PUBLIC的对象不足以发送。无源码公开合同不再要求伪造uploads_project_source=true。首轮无真实数据发出，active live grants=0。

独立审查要求补强receipt字段一致性，已修复并加测试。完整生产外发资格依赖可信Host verifier、固定singleton store与OS边界，仍BLOCKED；程序离线拒绝/许可语义PASS。''')
    report('real-agent-rnd','真实 Agent 研发','''NOT_RUN。真实Development规划、子任务生成、Research/Coding/Test/Debug选择与独立上下文未进入Provider。保留继承的原生Agent/Message Bus/Task/Tool Gateway/Storage Owner接口和合成回归；没有由Codex在Harness外写出Pilot实现后伪装成Agent产物。pilot目录只有Host准备的合同、初始stub与验收测试，产物来源明确。''')
    report('multi-agent','Multi-Agent 协作','''真实DeepSeek多Agent闭环NOT_RUN。需要LIVE资格后由模型自主拆分任务，给Research/Coding/Test/Debug独立Task/Context，经Message Bus通信；模型代码只能进入Tool Gateway/Storage Owner并由已资格执行器测试。目前普通Worker PROCESS/EXTERNAL_EFFECT与严格CPU资格继续BLOCKED，不能通过直接Shell执行生成代码绕过。Codex工程子代理只用于本版适配器实现和独立安全复核，不纳入真实Agent评估样本。''')
    report('reviewer','Background Reviewer','''真实模型未知缺陷检测NOT_RUN，Detection Rate不可计算。本轮独立工程安全审查发现一个Host账本complete参数运行时类型缺口，已修复；这不是DeepSeek Reviewer发现问题的证据。未来Reviewer默认只读，不获得Vault、源码写权限或全部隐藏缺陷答案；模型报告不取代G0–G6程序门禁。''')
    report('debug','Debug','''真实Debug Agent修复NOT_RUN；Repair Success Rate不可计算。当前complete类型修复与receipt一致性加固是Codex工程整改，由SQLite测试和独立复核验证。没有以模型自我评价、手工修补或合成wire输出冒充真实修复成功。''')
    report('single-multi-comparison','Single / Multi 对照','''INCONCLUSIVE，真实样本0。pilot/comparison-contract.json冻结同一initial哈希、每臂50万Token/30分钟的子预算（都计入全局1亿），相同要求/测试与模型身份记录。没有执行两臂、没有优越性结论；不能用21个Adapter测试或工程并行开发速度替代研发对照。quality-metrics.json保留14项指标和四类评价来源，未运行值为null。''')
    report('resident-24h','Resident 24小时','''NOT_RUN，真实墙钟观测0ms、真实事件0、真实模型请求0。LIVE先决条件未通过，没有启动24小时过程或未来automation。既有事件等待/队列恢复短测继续按原合成性质报告，不换算为24小时；CPU/RAM/积压/SQLite/Artifact/Context增长等长期指标无样本。''')
    report('raw-evidence','原始请求、响应与 Audit',f'''真实请求/响应/Usage证据为空，见evidence/live-requests.json。所有有内容的转录都是明确标记的SIMULATED fixture；模型请求/规范脱敏回复原Artifact hash已经逐字重建校验，见evidence/fixtures/model-traces.jsonl与request-index.json。

evidence/fixtures/audit.jsonl保留{traces['audits']}条本轮wire/campaign工程fixture Audit（含纯账本REAL assurance算法测试，但没有网络）。测试原始TAP/事件/错误、语法和strict TS结果全保留于evidence/verification；完整原始SQLite/Zstd对象留在对应.workspace运行目录，没有把离线工程Audit当作真实Provider Audit。''')
    report('m19-recommendations','M1.9 建议','''先把生产部署资格作为独立、可审阅工作包：批准Host/Worker/Operator身份及精确ACL/profile/启动对象，固定helper/代码/唯一授权账本，实测Worker对Vault/Host DB/跨项目/网络的deny与重启撤销。当前没有系统变更授权，不在本轮擅自执行。

资格完成后再接本地masked凭证入口，重新核验价格/别名、精确PUBLIC/SYNTHETIC正文与来源哈希，用小阶段预算启动DeepSeek真实链路，不需要恢复旧0.01美元限制。先取得真实Usage、cache、invoice和取消证据，再扩大。

补原生assistant/tool历史、reasoning+tools传递、加密隔离的partial分块持久化、长期恢复与生产Token提醒；之后执行独立Pilot、真实Reviewer/Debug、受控Single/Multi和24小时Resident。未实现项必须继续显示BLOCKED/NOT_RUN，不能靠增大Token额度跳过。''')
    # Acceptance is scoped to evidence, not the user's full live objective.
    acceptance=dict(schema='agentnexus/m1.8.1/acceptance/1',generated_at=now,status='BLOCKED',offline_new_scope='PASS',production_vault='BLOCKED',
        real_provider='NOT_RUN',real_model_rnd='NOT_RUN',real_multi_agent='NOT_RUN',resident_24h='NOT_RUN',single_multi='INCONCLUSIVE',
        real_provider_requests=0,actual_tokens=0,actual_cost_micros=0,new_tests=new,regression=final['summary']['counts'],regression_status=final['tests'],
        syntax='PASS' if final['syntax_pass'] else 'FAIL',strict_types=final['tsc'],source_set_sha256=current_set,regression_failures=failures,
        model_fixtures=dict(requests=len(traces['requests']),traces=traces['traces'],assurance='SIMULATED'),
        os_security_changes=0,real_key_reads=0,git_commits=0,git_pushes=0,history_preservation='evidence/history-preservation.json',
        unimplemented=['native multi-turn tool message replay','Gateway reasoning selection','isolated raw partial chunk persistence','production singleton ledger deployment','real billing reconciliation'])
    write('acceptance.json',acceptance)
    counts=final['summary']['counts']
    write('acceptance-report.md',f'''# M1.8.1 最终验收

**完整目标BLOCKED；新增离线工程范围PASS。真实DeepSeek请求0，Token0，费用$0。**

新增{new['tests']}项：{new['passed']} PASS / {new['skipped']} SKIP / {new['failed']} FAIL。完整回归{counts['tests']}项：{counts['passed']} PASS / {counts['skipped']} SKIP / {counts['failed']} FAIL；语法PASS，严格TypeScript {final['tsc']}。当前沙箱原版M1.8基线见evidence/regression-comparison.json，所有失败未覆盖。

| 验收问题 | 结论 |
|---|---|
| 真实Key安全管理、Agent无法读取完整Key | 合成接口与泄漏门通过；生产OS隔离BLOCKED |
| Gateway真实请求 | NOT_RUN；LIVE拒绝在凭证读取和网络前生效 |
| Streaming可靠、Usage费用准确 | 离线协议/失败Usage/有界解析通过；真实长流和账单NOT_RUN |
| 程序控制数据外发 | 精确Host许可与撤销/秘密扫描离线通过；生产资格BLOCKED |
| Development自主规划、Subagent研发 | NOT_RUN；已有工程fixture为SIMULATED |
| Reviewer未知问题发现、Debug真实修复 | NOT_RUN；独立Codex安全审查单列 |
| Multi-Agent完整研发闭环 | NOT_RUN；生成代码PROCESS资格未关闭 |
| Resident长期运行 | 24小时NOT_RUN |
| 全部真实调用可追溯 | 真实调用0；离线请求/来源/Usage/Audit/哈希可重建 |
| Single/Multi质量与成本 | 样本0，INCONCLUSIVE |

未完成项包括原生tool消息历史、Gateway reasoning选项、隔离原始partial分块持久化、生产singleton账本和真实账单核对，均未宣称实现或验收。必须先补批准的OS身份/部署/可信凭证入口，当前不能安全推进真实API。授权的1亿Token是总上限，没有被消耗目标。

源码集 `{current_set}`。最终SHA清单与历史保护结果另附，M0–M1.8原字节保留。未修改根产品、规则、系统账户/ACL；未Commit/Push。
''')
    write('README.md',f'''# AgentNexus M1.8.1

**LIVE BLOCKED；新增离线整改通过。** 已完成基线冻结、DeepSeek官方接口核验、精确Data Egress、统一1亿Token预算、缓存/失败Usage和响应哈希留证；真实请求0、Token0、费用$0。

新增{new['tests']}项测试全PASS；完整回归{counts['passed']} PASS / {counts['skipped']} SKIP / {counts['failed']} FAIL，语法与strict TS通过。全回归失败及原版同环境对照原样保留，不推断OS安全资格。

[最终验收](acceptance-report.md) · [机器验收](acceptance.json) · [Vault资格](reports/credential-vault-qualification.md) · [官方核验](reports/deepseek-official-check.md) · [独立安全审查](reports/independent-security-review.md) · [授权](authorization.json) · [Token/Cost](usage-token-cost.json) · [源码](source/) · [测试证据](evidence/verification-attempts.json) · [SHA256](SHA256SUMS.txt) · [后续建议](reports/m19-recommendations.md)。

真实Agent/Pilot/Reviewer/Debug/24小时均NOT_RUN；Single/Multi INCONCLUSIVE。独立OS身份、ACL/profile、启动证明、Host专属可信输入与唯一账本部署仍缺失。本轮未授权系统变更，因此没有索取或读取Key，也没有用Token授权绕过门禁。

M0–M1.8共{len(baseline_record['history'])}项历史文件原字节保留；根产品不替换，未Commit/Push。当前source集 `{current_set}`。
''')
    write('reproduce.md',r'''# 复现

Node24.15.0、TypeScript5.9.3、@types/node24.10.1；继承锁文件，没有新增依赖。只能由可信工程Runner运行，不给模型任意Shell。

```powershell
$env:AGENTNEXUS_TYPE_TOOLS = 'I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.5\type-tools'
$env:AGENTNEXUS_TEST_PYTHON_PATH = (Get-Command python).Source
$env:AGENTNEXUS_TEST_POWERSHELL_PATH = (Get-Command pwsh).Source
$env:AGENTNEXUS_TEST_GIT_PATH = (Get-Command git).Source
node deliverables/AgentNexus-M1.8.1/source/tools/agentnexus/verify-m181.mjs --output-root .workflow-kit/runtime/AgentNexus-M1.8.1/reproduce --suite model
```

suite m181只跑新增项，all跑全部继承回归。每次独立目录、源码快照、TAP/JSON和SHA；不覆盖历史。当前沙箱部分Windows原语和存储链接测试会FAIL/SKIP，不能改断言隐去。工具路径环境变量只提供可执行文件路径，禁止以此传Key。这里不提供任何LIVE绕过或自动API入口。
''')
    write('delivery-index.json',dict(schema='agentnexus/m1.8.1/delivery/1',status='BLOCKED',required_items={
        'overall_report':'README.md','vault_qualification':'reports/credential-vault-qualification.md','vault_security_tests':'reports/vault-security-tests.md',
        'deepseek_adapter':'source/src/agentnexus/model-runtime/adapters.ts','gateway_report':'reports/model-gateway-integration.md',
        'capability_registry':'provider-capability-registry.json','key_pool':'reports/key-pool.md','streaming':'reports/streaming.md','usage_cost':'usage-token-cost.json',
        'egress':'reports/data-egress-policy.md','real_agent':'reports/real-agent-rnd.md','multi_agent':'reports/multi-agent.md','reviewer':'reports/reviewer.md','debug':'reports/debug.md',
        'comparison':'reports/single-multi-comparison.md','resident':'resident-24h.json','raw_evidence':'evidence/fixtures/model-traces.jsonl',
        'audit':'evidence/fixtures/audit.jsonl','sha256':'SHA256SUMS.txt','independent_review':'reports/independent-security-review.md','acceptance':'acceptance-report.md','m19':'reports/m19-recommendations.md'}))
    for name in ['m181-delivery.py','m181-report.py','m181-evidence.mjs']:
        dest=OUT/'build-tools'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/'tools/agentnexus'/name,dest)
    print(json.dumps(dict(status='PASS',live_status='BLOCKED',new_tests=new,full_regression=counts,source_set_sha256=current_set)))

def report(name,title,body):write('reports/'+name+'.md','# '+title+'\n\n'+body)
if __name__=='__main__':main()
