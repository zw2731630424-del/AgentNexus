from pathlib import Path
import sys
sys.dont_write_bytecode=True
import importlib.util
import json
import subprocess

spec=importlib.util.spec_from_file_location('collect_m16',Path(__file__).with_name('collect-delivery.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
OUT=c.OUT;ROOT=c.ROOT
history=c.load(OUT/'run-history.json')['runs'];final=next(r for r in history if r['group']=='final-v2')
results=c.load(OUT/final['path']/'results.json');freeze=c.load(OUT/'evidence/final-source-freeze-v2.json')
review=c.load(OUT/'evidence/independent-review/final-review.json')
assert results['source_set_sha256']==freeze['set_sha256']==review['binding']['source_set_sha256']
assert results['summary']['counts']=={'tests':380,'failed':2,'passed':351,'cancelled':0,'skipped':27,'todo':0,'topLevel':328,'suites':0}
native=[case for case in results['cases'] if 'm16-' in case.get('file','')]
assert len(native)==75 and all(case['status']=='PASS' for case in native)
assert not review['new_open_findings']
c.copy(OUT/final['path']/'results.json',OUT/'test-results.json')
c.save(OUT/'native-test-results.json',{'schema':'agentnexus/m16/native-results/1','status':'PASS','source_set_sha256':freeze['set_sha256'],
 'count':75,'pass':75,'fail':0,'not_run':0,'assurance':{'local_store':'REAL_SQLITE_ZSTD','model':'SIMULATED','production_os':'BLOCKED'},'cases':native,'raw_all_run':final['path']})

demo=c.load(OUT/'evidence/integration/demo-final.txt')
assert demo['task_state']=='SUCCEEDED' and demo['review_state']=='SUCCEEDED' and demo['model_requests']==7 and demo['messages']==2 and demo['active_reservations']==demo['unknown_reservations']==0
demo_base=Path('\\\\?\\'+demo['root'])
c.copy(demo_base/'demo-result.json',OUT/'evidence/demo/demo-result.json')
c.archive(demo_base,OUT/'evidence/demo/data.zip')
c.save(OUT/'evidence/demo/source-binding.json',{'source_set_sha256':freeze['set_sha256'],'source_files':123,'source_freeze':'../final-source-freeze-v2.json','provider':'SIMULATED','local_storage':'REAL_SQLITE_ZSTD'})

# Retain original CPU request/result/stdout/stderr and its source snapshot as a standalone historical copy.
old_cpu=ROOT/'deliverables/AgentNexus-M1.5.1/evidence/cpu-qualification/2026-11-07T19-49-58-861Z-25456'
c.archive(old_cpu,OUT/'evidence/historical-cpu/m151-final-58-original.zip')
for name in ['cpu-qualification-report.md','cpu-root-cause-report.md','cpu-failure-classification.json']:
 c.copy(ROOT/'deliverables/AgentNexus-M1.5.1'/name,OUT/'evidence/historical-cpu'/name)
c.save(OUT/'evidence/historical-cpu/preservation.json',{'status':'PASS','historical_qualification':'FAIL','total':58,'pass':2,'fail':56,'m16_rerun':'NOT_RUN','copy_only':True,'budgets_ms':[{'budget':80,'tolerance':50},{'budget':300,'tolerance':50},{'budget':3000,'tolerance':150}]})

old=c.load(ROOT/'deliverables/AgentNexus-M1.5.1/source-sha256.json')['files'];new=freeze['files'];a={f['path']:f['sha256'] for f in old};b={f['path']:f['sha256'] for f in new}
changed=[p for p in sorted(a) if a[p]!=b.get(p)];added=[p for p in sorted(b) if p not in a]
c.save(OUT/'change-record.json',{'baseline':'M1.5.1','version':'0.4.0-m1.6','git_head':review['binding']['head'],'new_commit':False,
 'source_set_sha256':freeze['set_sha256'],'source_files':len(new),'changed_in_release_copy':changed,'added_in_release_copy':added,
 'historical_files_modified':False,'root_m13_modified':False,'cpu_or_toctou_assertions_changed':False,
 'policy_fixture_change':'Exact 52 policies and the eight known L0 nondegradable IDs, preserving all malformed/bypass cases'})

limits=review['remaining_limits']
c.save(OUT/'issue-ledger.json',{'schema':'agentnexus/m16/issues/1','independent_findings':review['findings'],'new_open_findings':[],
 'inherited_ledger':'../AgentNexus-M1.5.1/issue-ledger.json','remaining_limits':limits,'regression_status':'FAIL','failures_preserved':True})
resource=c.load(OUT/'resource-qualification.json');c.copy(OUT/'resource-qualification.json',OUT/'evidence/resource-line/qualification-before-integration.json')
resource['final_integrated_validation']={'resource_cases':15,'pass':15,'fail':0,'source_set_sha256':freeze['set_sha256'],'raw_run':final['path'],'strict_typecheck':'PASS','all_new_cases':75,'independent_actual_probes':15,
 'real_local_write':'UNKNOWN until persistent storage owner/closure adapter exists; large Gateway result cannot clear claims','full_regression':'FAIL: 351 PASS /27 NOT_RUN /2 FAIL'}
(OUT/'resource-qualification.json').write_text(json.dumps(resource,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

acceptance={'schema':'agentnexus/m16/acceptance/1','scope':'LOCAL_TRUSTED_LIBRARY_AND_MOCK_NATIVE_CORE','local_core':'PASS','regression':'FAIL','production':'BLOCKED',
 'source_set_sha256':freeze['set_sha256'],'source_files':123,'git_head':review['binding']['head'],'commit_push_performed':False,
 'all_tests':{'total':380,'PASS':351,'FAIL':2,'NOT_RUN':27,'exit_code':1},'new_native_tests':{'total':75,'PASS':75,'FAIL':0,'NOT_RUN':0},
 'static':{'strict_typescript':'PASS','node_syntax':'PASS'},'independent_review':{'status':review['verdict'],'closed_findings':len(review['findings']),'actual_probes':15,'new_open_findings':[],
 'reuse':'Independent 75 tests/15 probes from v1; all product+M16 tests byte-identical in v2; v2 security22/strict rerun; main all380 actually ran on v2'},
 'cpu':{'strict':'BLOCKED','historical_M151':'FAIL:56/58','current_legacy_case':'FAIL','new_58_matrix':'NOT_RUN','budget_tolerance_unchanged':True},
 'toctou':{'current_test':'FAIL','attack_swaps':0,'dynamic_attack_coverage':'INCONCLUSIVE','threshold_unchanged':True},
 'demo':{'types':5,'model_requests':7,'messages':2,'provider':'SIMULATED','task':'SUCCEEDED','review_task':'SUCCEEDED','active_reservations':0,'unknown_reservations':0},
 'historical_preservation':{'files':3341,'status':'PASS','baseline_source_files':100,'baseline_source':'PASS'},
 'governance':'PASS; final delivery recheck recorded separately','remaining_limits':limits,'raw_run':final['path']}
c.save(OUT/'acceptance.json',acceptance)

(OUT/'independent-code-review.md').write_text('''# M1.6 独立终审入口

权威原件为 [独立逐字报告](evidence/independent-review/final-review.md) 和 [机器报告](evidence/independent-review/final-review.json)。审查者使用独立上下文、只写专属证据目录、未改产品、未递归委派。

最终123文件集合242bf84892d7db9539baa5fca36119af97aa658cf0757ba97c58a17190542f80；13项发现闭合、15项实际产品负例通过。独立75项M1.6测试/15探针实际运行于v1；v2仅security测试维护，全部产品与m16测试字节相同，独立复核单一diff后重跑22项security和strict，复用范围明确。主线全380项实际运行于v2且新增75项全通过。

审查通过范围为LOCAL_TRUSTED_LIBRARY+SIMULATED Provider，未发现仍开放的本轮代码问题；完整回归依然2 FAIL，CPU和生产资格BLOCKED。修前真实写入/取消/暂停/模型/消息/大返回故障、源码快照、日志与逐hash证明均保留，不能用最终通过覆盖失败。
''',encoding='utf-8')

(OUT/'acceptance-report.md').write_text('''# M1.6 最终验收

已交付可运行的可信本地Native Harness与三级资源治理基础，完成授权的源码、测试、独立审查和证据封装。**新增本地范围通过；完整回归FAIL，严格CPU及完整生产链BLOCKED。** Provider全部SIMULATED，未进行真实模型联调或系统部署。

最终版本0.4.0-m1.6，123文件，规范源码集合 `242bf84892d7db9539baa5fca36119af97aa658cf0757ba97c58a17190542f80`；HEAD仍main上的112d915c97ee6e6214f7ce05eab8bd492bbb9bc6，没有新Commit。M1.5.1原100文件与3341历史文件逐SHA相同，根M1.3不修改。

| 验证 | 最终结果 | 范围 |
|---|---|---|
| 完整回归 | 380：351 PASS /27 NOT_RUN /2 FAIL，exit1 | 实际v2完整源码副本，全部原始结果保留 |
| 本轮新增 | 75/75 PASS，0未运行 | 真实SQLite/Zstd/本地解析/Gateway；Provider与OS观察SIMULATED |
| 严格TypeScript / Node语法 | PASS / PASS | 全src/tests/tools，未关闭strict或添加skip豁免 |
| 独立审查 | 13发现闭合、15实际探针通过 | v1/v2复用边界逐hash说明，v2 security22及strict重新运行 |
| 五类型演示 | lead/sub/reviewer任务完成，7模型请求、2完成消息 | 模型SIMULATED；原JSON诊断器和Gateway实际运行 |
| CPU严格资格 | BLOCKED，原M1.5.1 56 FAIL/2 PASS保留 | 未重跑58矩阵、不改预算/容差 |
| 项目治理 | PASS | lite规则/分类检查；未修改规则或启用增强门禁 |

两项当前FAIL：继承CPU用例Job累计29062500 ticks且须Helper DEADLINE；继承TOCTOU用例没有完成实际junction替换（swaps=0），原swaps>0断言保留，动态攻击覆盖INCONCLUSIVE。没有证据据此宣称逃逸发生，也不能据“未返回外部字节”签资格。v1还记录了旧Policy计数44与新52不一致；只在M1.6测试副本维护为精确52+8个L0 ID，全部安全负例保留。v1弱CPU断言偶然PASS也不消除原严格FAIL。

27个NOT_RUN包含当前受管Host的token/pipe/link权限、未部署独立账户/Profile/有效跨账户ACL、无受保护Node pin及未捕获孤儿窗口等，逐条原文在test-results.json。没有为运行它们改ACL、账户、系统策略或权限。

A线：CPU bandwidth/consumption/wall/accounting独立合同、官方后端比较、Resource Registry与三级原子预留/累计核算/等待取消/UNKNOWN已经实现。预算、Feature或证书不能把OS未资格能力放开。实际LOCAL_WRITE经精确审批最多调用一次；缺存储owner时固定UNKNOWN并保留claims，包括大输出后的记录失败窗口。

B线：独立Agent身份/上下文/预算与可信生命周期、原生Loop、来源可追踪的Context、持久双向消息、单次调度/依赖/等待/取消/恢复/显式交接、五类系统Agent、Mock模型/key-handle池、工作流合同/角色/证据/Gate ledger/检查点已经贯通。所有工具经原统一Gateway/Policy/Permit/Audit；原始Archive不被摘要覆盖。

当前为基础实现：没有恶意Worker OS隔离、真实Provider/Vault、生产ExitProof/资源释放、持久disk owner、完整规则编译/自动质量Gate、自动Git watcher或长期自主Resident/Coordinator。模型HANDOFF只等待，显式可信handoffTask才转交。安全close/reopen测试不冒充真实Host/OS重启或断电资格。

源码、测试、原始TAP/JSON/stdout/stderr、各次源码/数据ZIP及逐成员SHA、原CPU58矩阵完整历史副本、独立修前/修后复现和交付清单均附后。所有FAIL保留；没有自动重试未知副作用，没有按超时或Agent自报释放资源。

未创建Windows账户、改ACL/AppContainer/系统任务/防火墙/服务/驱动；未修改Ubuntu/其他科研项目、读取真实Key、连接真实Provider、产生模型费用、运行正式科研实验或Commit/Push。后续边界见m17-recommendations.md。
''',encoding='utf-8')
c.copy(Path(__file__),OUT/'evidence/build-tools/finish-reports.py')
print(json.dumps({'source_files':123,'source_sha256':freeze['set_sha256'],'new_pass':75,'full_pass':351,'full_not_run':27,'full_fail':2,'review_findings_closed':len(review['findings']),'changed_in_release_copy':len(changed),'added':len(added)}))
