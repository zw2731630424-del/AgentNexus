"""Describe evidence already obtained. No certificate, candidate, signature or deployment operation."""
import datetime as dt
import json
from baseline import OUT,sha,write

def read(rel):return json.loads((OUT/rel).read_bytes())
sign=read('evidence/signing-tests.json');prep=read('evidence/preparation-tests.json');reg=read('evidence/regression.json')
a=read('evidence/independent-signer-audit.json');b=read('evidence/cms-cng-independent-review.json')
assert not a['open_implementation_findings'] and not b['open_blocking_findings']
assert sign['status']==prep['status']==reg['status']=='PASS'
ui=read('evidence/ui-preview.json');stage=read('payload-staging-manifest.json')
fields={
 'A_Signer':{'SOURCE_AUDITED':'PASS_SCOPED','BINARY_BUILT':'PASS','INDEPENDENT_REVIEWED':'PASS_SCOPED_NO_OPEN_IMPLEMENTATION_FINDINGS','UI_VERIFIED':'PASS_PREVIEW_ONLY','ACTUAL_USER_GUI':'NOT_RUN','PRIVATE_KEY_BOUNDARY_VERIFIED':'INCONCLUSIVE','source_files':264,'signer_sha256':sha(OUT/'signer/AgentNexus.Qualification.Signer.exe'),'verifier_sha256':sha(OUT/'signer/AgentNexus.Qualification.Verifier.exe')},
 'B_Certificate':{key:'NOT_RUN' for key in ['CERTIFICATE_SELECTED','DER_PIN_VERIFIED','CNG_KEY_CREATED','PRIVATE_KEY_NON_EXPORTABLE','USER_INTERACTION_REQUIRED','ACTUAL_SIGNATURE_VERIFIED']},
 'C_Qualification_Plan':{key:'NOT_RUN' for key in ['PLAN_FROZEN','PLAN_REVIEWED','PLAN_SIGNED','CMS_VERIFIED']},
 'D_Deployment_Approval':{key:'NOT_RUN' for key in ['APPROVAL_FROZEN','APPROVAL_REVIEWED','APPROVAL_SIGNED','CMS_VERIFIED']},
 'E_Deployment':{'INSTALLATION_APPROVED':False,'SERVICE_STARTED':False,'REAL_KEY_IMPORTED':False,'LIVE_PROVIDER':False,'PRODUCTION_RELEASE':False,'REAL_LEDGER_MIGRATION':False}
}
fields['B_Certificate'].update(actual_der_sha256_pin=None,actual_provider=None,actual_container=None,trusted_user_presence='INCONCLUSIVE',same_sid_resistance='NOT_PROVEN')
record={'schema':'agentnexus.q42.acceptance.v1','status':'TOOLING_AUDITED_BUILT_AND_OFFLINE_TESTED_ACTUAL_SIGNING_NOT_RUN_NO_GO','decision':'UNSIGNED / NO-GO','checked_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'sections':fields,'tests':{'signing_simulated':{'tests':sign['tests'],'pass':sign['passed'],'fail':sign['failed']},'public_preparation_simulated':{'tests':prep['tests'],'pass':prep['tests'],'fail':0,'files':prep['payload_files'],'bytes':prep['payload_bytes']},'regression':reg['counts'],'independent_signer_commands':a['commands'],'independent_delta_checks':a['final_delta_checks'],'os_tests':{'pass':0,'not_run':70},'production_evidence':{'pass':0,'not_run':19}},'actual_candidate_created':False,'staging':{'files':194,'bytes':stage['payload_bytes'],'installation_manifest_frozen':False},'review_target_manifest_sha256':sha(OUT/'evidence/review-targets.json'),'governance_result':'evidence/governance-result.json','real_api_keys':0,'real_provider_requests':0,'real_cost':0,'existing_token_authorization':100000000,'certificate_or_trust_store_changed':False,'private_user_key_opened_by_agent':False,'system_changes':False,'commit_push':False}
write(OUT/'acceptance.json',record)
text=f'''# Q4.2 最终阶段验收

**独立审查、修复、最终构建和离线准备完成；实际用户签发 NOT_RUN，部署继续 UNSIGNED / NO-GO。** [逐项机读裁定](acceptance.json)

| 验收域 | 裁定 |
|---|---|
| A SOURCE_AUDITED / BINARY_BUILT / INDEPENDENT_REVIEWED | PASS：源码、发布 PE、公开材料、模拟与文件系统限定范围；已发现问题关闭 |
| A UI_VERIFIED | PASS_PREVIEW_ONLY：最终 PE 两阶段模拟布局及证书字段可见，属性/签名按钮关闭 |
| A PRIVATE_KEY_BOUNDARY_VERIFIED | INCONCLUSIVE：实际用户环境、同 SID 隔离和可信用户在场未证明 |
| B 证书选择 / DER Pin / CNG创建 / 不可导出 / 每次交互 / 实际签名 | 全部 NOT_RUN；实际 Pin=null |
| C 真实最终计划冻结 / 复核 / 签名 / CMS | 全部 NOT_RUN；历史合同与模拟路径已审，不是用户最终计划 |
| D 真实最终批准冻结 / 复核 / 签名 / CMS | 全部 NOT_RUN；最终精确 Hash 等待真实候选与两次签署 |
| E 安装批准 / 服务启动 / 真实 Key / Live Provider | 全部 false |

签名/合同/异常测试 **{sign['passed']}/{sign['tests']} PASS**（SIMULATED），公开准备 **{prep['tests']}/{prep['tests']} PASS**（194 文件 / {prep['payload_bytes']:,} 字节，仅模拟公开 DER）；严格类型检查与最终限定回归 **{reg['counts']['pass']} PASS / {reg['counts']['fail']} FAIL / {reg['counts']['skipped']} SKIP**。独立 Signer 审查 **{a['commands']} 命令**与 **{a['final_delta_checks']} 项补审**均符合预期，两份独立报告没有未关闭阻断性实现问题。重叠结果不累计。

六项警告即错误构建通过，264 项完整源码、7 项源文件修改、源码 ZIP、staging 清单与原始失败证据已归档。原 Q3/Q4/Q4.1 与规则 Hash 保持；最终检查由 [验证工具](tools/verify-delivery.py)、[治理结果](evidence/governance-result.json) 和 [SHA256SUMS](SHA256SUMS) 共同核对。治理及最终完整性以实际证据文件和最后只读运行结果为准。

修复包括内存快照、最终 Yes 后复核、目录 0x81 共享锁、叶 nofollow、本地路径门禁、原子新输出/整包读回、精确 DER 前置类型检查、完整公开/CNG 字段显示、属性与签名独立授权、算法白名单、生产链用途约束、公开准备快照与完成标记。见 [总体报告](reports/design.md)、[TOCTOU](reports/toctou.md) 和 [独立复核](reports/independent-signer-audit.md)。

没有选择或创建实际用户证书，没有使用用户私钥、签署用户计划/批准、改 My/Root/Trusted Publishers、安装、UAC、服务、账户或 ACL。原 70 项 OS 测试和 19 类生产证据保持 NOT_RUN；生产 Credential Vault BLOCKED；真实 Key/Provider/费用均 0，原一亿 Token 授权不重置，无 commit/push。

用户下一步先在独立安全主体/设备自行选择证书并独立核对完整 DER Pin，然后按 [操作说明](signer/README.md) 生成新的实际候选、两次分别签署并只读验证。两次签名之后，实际安装仍需另行精确批准。当前 [部署申请](approval-request/deployment-request.md) 的最终证书、签名时间、ID/窗口和 Hash 都为 null / NOT_RUN，没有可执行 Apply 命令。
'''
(OUT/'acceptance-report.md').write_text(text,encoding='utf-8')
(OUT/'README.md').write_text('''# AgentNexus M1.8.3-Q4.2

**签发工具已独立审查、修复、构建并通过离线测试。真实用户证书/Pin/签名尚未运行，实际部署保持 UNSIGNED / NO-GO。**

- [最终验收](acceptance-report.md) · [逐项状态](acceptance.json) · [总体报告](reports/design.md)
- [用户操作说明](signer/README.md) · [CNG/TPM 方案](reports/cng-tpm-plan.md) · [私钥边界](reports/private-key-boundary.md)
- [Signer 独立安全审查](reports/independent-signer-audit.md) · [CMS/CNG 独立复核](reports/cms-cng-independent-review.md)
- [CMS / DER Pin](reports/cms-and-der-pin.md) · [TOCTOU](reports/toctou.md) · [两阶段与回归](reports/testing.md) · [Verifier](reports/verifier-testing.md) · [异常与恢复](reports/exception-tests.md)
- [新候选准备](reports/new-candidate-preparation.md) · [部署审批材料（NO-GO）](approval-request/deployment-request.md) · [回滚](approval-request/rollback-plan.json)
- [最终 Signer](signer/AgentNexus.Qualification.Signer.exe) · [只读 Verifier](signer/AgentNexus.Qualification.Verifier.exe) · [源码修改](source-changes.patch) · [完整源码 ZIP](AgentNexus-M1.8.3-Q4.2-source.zip)
- [107 项模拟测试](evidence/signing-tests.json) · [14 项公开准备测试](evidence/preparation-tests.json) · [30 项要求映射](tests/signing-requirement-matrix.json) · [最终回归](evidence/regression.json)
- [阶段一预览](evidence/signer-preview.png) · [公开证书字段预览](evidence/signer-preview-certificate.png) · [阶段二预览](evidence/signer-preview-stage2.png)（均模拟、无用户钥）
- [源码清单](source-manifest.json) · [194 项 staging 清单](payload-staging-manifest.json) · [原始运行/失败索引](evidence/run-history.json) · [治理](reports/governance.md) · [SHA256SUMS](SHA256SUMS)

根 payload 仅 staging；reference/q41-approval 仅历史参考，禁止直接签署。实际最终候选须等用户公开 DER、独立 Pin 和目标身份，运行公开准备工具后产生新的 deployment ID、epoch 5、UTC 期限和全部 Hash。Signer/Verifier 在194项安装载荷之外另行绑定。当前没有真实最终 approval、CMS 或安装批准。

107/107 模拟、14/14公开准备、224 PASS /0 FAIL /5 SKIP 限定回归通过；98个独立只读命令和21项补审符合预期。真实CNG/TPM/用户在场与同SID隔离未证明，70项OS及19类生产资格仍NOT_RUN。真实Key/Provider/费用为0；没有证书/信任/系统变更、commit或push。
''',encoding='utf-8')
request={'schema':'agentnexus.q42.deployment-request-preparation.v1','status':'PRECISE_SCOPE_PREPARATION_NO_GO_MISSING_USER_CERTIFICATE_AND_TWO_SIGNATURES','signing_mode':'LOCAL_QUALIFICATION','issuer':None,'certificate_der_sha256_pin':None,'certificate_purpose':'1.3.6.1.5.5.7.3.36','qualification_signature_time':None,'deployment_signature_time':None,'final_installation_manifest_sha256':None,'final_qualification_plan_sha256':None,'final_deployment_approval_sha256':None,'deployment_id':None,'policy_epoch_proposed':5,'issued_at_utc':None,'expires_at_utc':None,'proposed_target_host':'DESKTOP-OSWALD','proposed_machine_id':'a013cd5e924eb5db1ba67eb28c65379f81b2d73f2cbd42fdb6645eb202681fe4','proposed_operator_sid':'S-1-5-21-2532670394-1554971530-4095700938-1001','service_sid_precomputed':'S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873','payload_files_required':194,'final_payload_bytes':None,'installation_approved':False,'start_service':False,'real_import':False,'live_provider':False,'production_release':False,'real_ledger_migration':False,'exact_changes_document':'deployment-request.md','rollback_document':'rollback-plan.json','apply_command_provided':False}
write(OUT/'approval-request/deployment-request.json',request)
print(json.dumps({'status':record['status'],'signing':sign['tests'],'preparation':prep['tests'],'regression':reg['counts'],'actual_signing':'NOT_RUN'}))
