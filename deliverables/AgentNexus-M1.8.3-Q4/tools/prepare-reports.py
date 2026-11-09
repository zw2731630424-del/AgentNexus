"""Assemble the unsigned Q4 preflight record. This tool cannot deploy or sign."""
import copy
import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[3]
Q3 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q3'
Q4 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4'
RUNTIME = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8.3-Q4'
HOST_DIR = RUNTIME / 'host-20261109T120425Z-9b23e1e5'
spec = importlib.util.spec_from_file_location('original_q4_file_governor', ROOT / 'ai-workflow-kit-v4/tools/govern.py')
governor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(governor)
policy = governor.load(ROOT, '.workflow-kit/governance/policy.json')


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def put(name, value):
    rel = 'deliverables/AgentNexus-M1.8.3-Q4/' + name
    if governor.classify(rel, policy, {}) != 'deliverable':
        raise RuntimeError('UNAPPROVED_FILE_CLASS')
    path = governor.path_at(ROOT, rel)
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    path.write_bytes(value if isinstance(value, bytes) else value.encode('utf-8'))


now = dt.datetime.now(dt.timezone.utc)
stamp = lambda t: t.strftime('%Y-%m-%dT%H:%M:%S.0000000Z')
host = json.loads((HOST_DIR / 'host-preflight.json').read_bytes())
integrity = json.loads((Q4 / 'evidence/baseline-integrity.json').read_bytes())
signatures = json.loads((Q4 / 'evidence/payload-signatures.json').read_bytes())
for path in HOST_DIR.iterdir():
    if path.is_file():
        put('evidence/host-medium/' + path.name, path.read_bytes())
host_refs = [{'path': 'evidence/host-medium/' + p.name, 'sha256': sha(p)} for p in sorted(HOST_DIR.iterdir()) if p.is_file()]
put('evidence/host-evidence-manifest.json', {'schema': 'agentnexus.q4.host-evidence.v1', 'normative_capture': 'evidence/host-medium/host-preflight.json', 'files': host_refs, 'early_capture': 'evidence/host-preflight.json', 'early_capture_is_native_token_evidence': False})
baseline_manifest = Q3 / 'approval/installation-manifest.json'
put('approval/installation-manifest.json', baseline_manifest.read_bytes())
put('approval/installation-manifest-status.json', {
    'status': 'UNSIGNED', 'decision': 'BLOCKED', 'deployment_decision': 'NO-GO',
    'current_manifest_sha256': sha(baseline_manifest), 'files': 194, 'bytes': 468433910,
    'payload_location': str(Q3 / 'payload'), 'payload_copied_or_replaced': False,
    'current_manifest_is_final_signed_installation_manifest': False,
    'reason': 'External signer/pin/CMS absent; expired launcher plan must change; re-freeze all affected hashes before final approval.',
})
original_plan = json.loads((Q3 / 'approval/candidate/qualification.json').read_bytes())
plan = copy.deepcopy(original_plan)
plan.update(status='QUALIFICATION_ONLY', decision='BLOCKED', issued_at_utc=stamp(now),
            expires_at_utc=stamp(now + dt.timedelta(days=7)))
for test in plan['tests']:
    test['observed_result'] = 'NOT_RUN'
    test['evidence_sha256'] = 'BLOCKED'
put('approval/qualification.UNSIGNED.json', plan)
configuration = json.loads((Q3 / 'approval/candidate/service-config.json').read_bytes())
put('approval/service-config.UNSIGNED.json', configuration)
approval = json.loads((Q3 / 'approval/deployment-approval.UNSIGNED.json').read_bytes())
approval.update(service_config_sha256=sha(Q4 / 'approval/service-config.UNSIGNED.json'),
                qualification_sha256=sha(Q4 / 'approval/qualification.UNSIGNED.json'))
put('approval/deployment-approval.UNSIGNED.json', approval)
blockers = [
    {'id': 'Q4-B01', 'status': 'BLOCKED', 'reason': 'USER_CONFIRMED_NO_APPROVED_EXTERNAL_SIGNER_CERTIFICATE_OR_DER_SHA256_PIN'},
    {'id': 'Q4-B02', 'status': 'BLOCKED', 'reason': 'QUALIFICATION_AND_DEPLOYMENT_DETACHED_CMS_SIGNATURES_ABSENT'},
    {'id': 'Q4-B03', 'status': 'BLOCKED', 'reason': 'UNSIGNED_EXECUTABLES_AND_INSTALLER;_AUTHENTICODE_POLICY_AND_REFREEZE_PENDING'},
    {'id': 'Q4-B04', 'status': 'BLOCKED', 'reason': 'Q3_LAUNCH_PLAN_EXPIRED;_FINAL_PAYLOAD_AND_MANIFEST_HASHES_NOT_YET_FREEZABLE'},
    {'id': 'Q4-B05', 'status': 'BLOCKED', 'reason': 'STRICT_LAUNCHER_DATE_AND_CASE_SENSITIVE_TEST_NAME_CONTRACT_MUST_BE_VALIDATED_BEFORE_SIGNING'},
    {'id': 'Q4-B06', 'status': 'BLOCKED', 'reason': 'START_REQUEST_IS_NOT_READINESS;_BOUNDED_SCM_AND_DAILY_READINESS_AND_FAILURE_STOP_APPROVAL_REQUIRED'},
    {'id': 'Q4-B07', 'status': 'BLOCKED', 'reason': 'USER_EXPLICIT_NO_GO;_FINAL_EXACT_DEPLOYMENT_APPROVAL_NOT_GRANTED'},
]
put('approval/blockers.json', blockers)
request = {
    'schema': 'agentnexus.q4.precise-deployment-request.v1', 'prepared_at_utc': stamp(now),
    'status': 'UNSIGNED', 'decision': 'NO-GO', 'readiness': 'BLOCKED',
    'document_role': 'PRECISE_SCOPE_REVIEW_DRAFT_NOT_FINAL_EXECUTABLE_APPROVAL',
    'host': host['host'], 'machine_id': host['machine_id'], 'operator_sid': host['operator']['sid'],
    'service_sid': original_plan['service_sid'], 'service_sid_activated': False, 'policy_epoch': 3,
    'scope': 'QUALIFICATION_ONLY', 'deployment_approved': False, 'start_service': False,
    'approval_ref': '', 'qualification_test_approval_ref': '', 'external_issuer': None,
    'authority_certificate_der_sha256': None, 'issued_at_utc': stamp(now),
    'expires_at_utc': stamp(now + dt.timedelta(days=7)),
    'current_installation_manifest_sha256': sha(baseline_manifest),
    'final_installation_manifest_sha256': None,
    'qualification_draft_sha256': sha(Q4 / 'approval/qualification.UNSIGNED.json'),
    'service_config_draft_sha256': sha(Q4 / 'approval/service-config.UNSIGNED.json'),
    'deployment_approval_unsigned_sha256': sha(Q4 / 'approval/deployment-approval.UNSIGNED.json'),
    'source_zip_sha256': integrity['source']['zip_sha256'], 'installer_sha256': sha(Q3 / 'source/tools/agentnexus/install-q3-qualification.ps1'),
    'payload_files': 194, 'payload_bytes': 468433910,
    'target_paths': {'program': 'C:\\Program Files\\AgentNexus', 'data': 'C:\\ProgramData\\AgentNexusCredential'},
    'requested_future_scope': {
        'scm': {'name': 'AgentNexusCredential', 'type': 'own-process', 'start': 'demand', 'session': 0,
                'account': 'NT SERVICE\\AgentNexusCredential', 'sid_type': 'unrestricted',
                'image': '"C:\\Program Files\\AgentNexus\\AgentNexusCredential.exe"', 'arguments': [],
                'descriptor': 'D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;CCLC;;;AU)'},
        'program_acl': 'SYSTEM/Administrators maintenance; service/Users RX; protected owner/DACL; exact manifest only',
        'data_acl': 'SYSTEM/Administrators maintain config; service RX; service write only engine/qualification/temp; no ordinary-user access',
        'runtime': 'fixed same service EXE --daily-runtime; retained child handle; explicit inherited stdio; protected process/thread; kill-on-close Job',
        'desktop': 'fixed app/runtime/electron.exe C:\\Program Files\\AgentNexus\\app; Medium; Add Key only uses fixed Launcher then UAC',
        'daily_client': 'fixed pipe-client.exe --daily --stdio; no UAC',
        'high_pipe': r'\\.\pipe\AgentNexus.Credential.v1', 'daily_pipe': r'\\.\pipe\AgentNexus.Daily.v1',
        'readiness': 'separately approved start; bounded actual SCM Running, engine readiness and Medium snapshot; actual Token/child/pipe evidence',
        'failure_action_request': 'stop only the approved AgentNexusCredential service on readiness failure; verify fixed children and pipes closed; retain all data; approval pending',
        'forbidden': ['existing-target takeover', 'custom account creation', 'SeDebugPrivilege grant', 'interactive/RDP logon grant',
                      'unrelated ACL/firewall/UAC policy changes', 'real ledger migration/reset', 'real Key', 'live Provider', 'automatic data deletion'],
    },
    'real_import_enabled': False, 'real_import_approval_ref': '', 'live_enabled': False, 'live_approval_ref': '',
    'existing_token_authorization': 100000000, 'token_authorization_reset': False,
    'blockers': blockers,
}
put('approval/deployment-request.json', request)
put('approval/deployment-request.md', f'''# Q4 精确部署范围申请草案

**UNSIGNED / NO-GO / BLOCKED。当前不可批准执行。** 用户已明确没有获准外部签发者、证书及 DER SHA256 Pin，要求仅完成只读预检与材料。此文档固定未来请求的范围，不能替代最终签署字节和用户明确部署批准。

|绑定|当前值|
|---|---|
|Host|`{host['host']}`|
|MachineGuid 的 SHA256|`{host['machine_id']}`|
|原 Operator SID|`{host['operator']['sid']}`|
|预期 Service SID|`{original_plan['service_sid']}`；真实激活 NOT_RUN|
|Epoch|3；Q3 native 合同固定 epoch=3，Q4 不擅自升级|
|草案期限 UTC|`{request['issued_at_utc']}` 至 `{request['expires_at_utc']}`；不构成批准有效期|
|当前安装清单 SHA256|`{request['current_installation_manifest_sha256']}`|
|完整源码 ZIP SHA256|`{request['source_zip_sha256']}`|
|安装器 SHA256|`{request['installer_sha256']}`|
|资格草案 SHA256|`{request['qualification_draft_sha256']}`|
|部署批准未签名文档 SHA256|`{request['deployment_approval_unsigned_sha256']}`|
|最终签署安装清单、批准 Hash|尚不存在；不能把以上基线 Hash 冒充最终签署值|

未来范围仅涉及 `AgentNexusCredential` own-process/demand 服务、`NT SERVICE\\AgentNexusCredential` 虚拟身份、Session 0、`C:\\Program Files\\AgentNexus` 与 `C:\\ProgramData\\AgentNexusCredential`。服务无参数；唯一 native Runtime 是同 EXE `--daily-runtime`。普通 UI 用固定 Electron 和 app 参数；Daily client 固定 `--daily --stdio`。逐文件目标见 [当前基线安装清单](installation-manifest.json)，逐项系统影响见 [机读申请](deployment-request.json)。不创建自定义账户，不授予 SeDebugPrivilege，不授予交互/RDP登录权限，不修改父目录或其他项目。

先确定正式签发方案和公开证书 Pin；是否为各 PE/安装脚本添加 Authenticode 必须明确，不能因为存在签署清单而忽略本轮“缺签名即停止”的要求。若二进制签名改变内容，重新构建/测试/独立审阅，按最终字节重新生成 app-manifest、config、Helper/Launcher计划、资格计划和安装清单。`launcher-plan.json` 当前过期，修改它本身也会改变安装清单 Hash。两份分离 CMS、资格专用批准引用、同 Host/Operator/Service SID/Epoch/有限期限必须重新绑定。

签署前须验证 Launcher 的 UTC 精确 round-trip `o` 日期和19类测试名精确大小写，关闭安装前与运行时的合同差异。安装器的 `service_started=true` 不能替代就绪证明；未来精确批准须涵盖有限等待、实际 SCM/engine/Daily 验证，以及失败时停止唯一服务、确认子进程/pipe退出的范围。原 Q3 安装器未修改。

**目前不提供可直接执行的 Apply 命令。** 待最终签署材料冻结并复核后，再提交含最终 Hash、证书 Pin、批准引用和完整参数的精确申请；用户明确批准后才进入变更阶段。当前没有任何安装/启动/账户/ACL/提升权限部署许可。
''')

matrix = json.loads((Q3 / 'tests/windows-attack-tests.json').read_bytes())
cases = []
for original in matrix['cases']:
    row = copy.deepcopy(original)
    row.update(status='NOT_RUN', reason='Q4_UNSIGNED_NO_GO; USER_CONFIRMED_NO_SIGNER_AND_NO_SYSTEM_DEPLOYMENT', evidence=[],
               observed_process_identity=None, sid=None, token=None, integrity=None, actual_result=None,
               raw_log=None, evidence_sha256=None, independent_review_result='NOT_RUN')
    cases.append(row)
put('tests/windows-attack-results.json', {'schema': 'agentnexus.q4.windows-attack-results.v1',
    'original_contract': '../AgentNexus-M1.8.3-Q3/tests/windows-attack-tests.json',
    'original_contract_sha256': sha(Q3 / 'tests/windows-attack-tests.json'),
    'case_count': len(cases), 'counts': {'PASS': 0, 'FAIL': 0, 'NOT_RUN': len(cases), 'BLOCKED': 0, 'INCONCLUSIVE': 0, 'SIMULATED': 0},
    'synthetic_results_are_os_evidence': False, 'cases': cases})
categories = []
for original in original_plan['tests']:
    categories.append({'name': original['name'], 'status': 'NOT_RUN', 'original_contract': original,
                       'actual_evidence': None, 'evidence_sha256': None, 'independent_review': 'NOT_RUN',
                       'reason': 'NO_DEPLOYED_TARGET; UNSIGNED_NO_GO',
                       'matrix_case_ids': original.get('matrix_case_ids', []),
                       'matrix_mapping_source': 'ORIGINAL_Q3_CONTRACT' if 'matrix_case_ids' in original else 'ORIGINAL_CATEGORY_HAS_NO_EXPLICIT_CASE_MAPPING'})
put('tests/qualification-evidence-19.json', {'schema': 'agentnexus.q4.qualification-evidence.v1',
    'category_count': len(categories), 'PASS': 0, 'NOT_RUN': len(categories), 'categories': categories,
    'original_plan_sha256': sha(Q3 / 'approval/candidate/qualification.json'),
    'production_vault_qualified': False, 'signed_evidence_produced': False})
table = '\n'.join('|`' + x['id'] + '`|' + x['area'] + '|' + x['attack'].replace('|', '\\|') + '|NOT_RUN|' for x in cases)
put('reports/windows-os-tests.md', '# 原始70项 OS 测试本轮结果\n\n**0 PASS / 0 FAIL / 70 NOT_RUN。** 所有原始 Test ID、攻击描述、预期结果和必要观察字段保留。未部署目标，不编造攻击进程、Token、原始日志或证据 Hash。只读预检不计入这70项。\n\n|Test ID|区域|原始攻击|Q4状态|\n|---|---|---|---|\n' + table + '\n\n逐项机读记录见 [windows-attack-results.json](../tests/windows-attack-results.json)。\n')
put('reports/qualification-evidence.md', '# 19类资格证据\n\n**0 PASS / 19 NOT_RUN；生产 Vault BLOCKED。** 原 Q3 类别名称和顺序全部保留，原合同只为后四类提供显式70项映射，未替前15类伪造原始映射。资格计划草案仅允许合成 Vault/ledger 与 FixtureTransport，签名/批准缺失。\n\n|原始类别|Q4实际证据|\n|---|---|\n' + '\n'.join('|`' + x['name'] + '`|NOT_RUN|' for x in categories) + '\n\n机读合同见 [qualification-evidence-19.json](../tests/qualification-evidence-19.json)。\n')

service_evidence = {'schema': 'agentnexus.q4.service-evidence.v1', 'status': 'NOT_RUN',
    'preflight_query': host['service_sid_query'], 'actual_service_token': None,
    'actual_service_privileges': None, 'actual_service_integrity': None, 'actual_service_session': None,
    'source': 'host-medium/host-preflight.json', 'service_installed': False, 'service_started': False}
put('evidence/service-sid-and-token.json', service_evidence)
put('reports/credential-service.md', f'''# Credential Service 部署验收

**NOT_RUN / BLOCKED。未安装、未启动。** 真实 SCM 查询退出1060，目标服务不存在。`sc showsid` 计算出的 `{original_plan['service_sid']}` 状态 Inactive；NTAccount 翻译未解析。它不是服务身份激活、实际 Token 或登录会话证据。

本轮只有操作员 PowerShell 真实 Token（Medium8192、未提升、非AppContainer、Session1及Logon ID），不能替代 Service Token。服务 Token、Privileges、IL、Session0、父子关系、停止/重启、无SeDebug及无交互/RDP登录权限全部 NOT_RUN。完整原始服务清单与操作员 Token 见 [真实宿主采集](../evidence/host-medium/host-preflight.json)，服务字段见 [service-sid-and-token.json](../evidence/service-sid-and-token.json)。
''')
put('reports/acl-sddl.md', '''# 实际 ACL / SDDL

已只读取得 `C:\\`、`C:\\Program Files`、`C:\\ProgramData` 的真实 owner/DACL SDDL，见 [实际父目录证据](../evidence/host-medium/actual-parent-acl-sddl.json)。本轮未启用特权读取 SACL/mandatory label，不据此判定 MIC 通过。

两个目标目录均不存在；安装文件/配置/合成 Vault/ledger/audit 的实际 ACL 和普通用户访问拒绝全部 NOT_RUN。未应用预期 ACL，未做替换、Reparse Point 或父目录攻击。未来需验证每个实际对象及实际拒绝，不能用安装器 SDDL 字符串替代。
''')
helper_cases = ['管理员同SID UAC同意', '标准用户未经批准提升拒绝', '其他管理员凭证身份绑定/拒绝', '用户取消UAC', 'Helper启动失败', '服务不存在', '服务拒绝', 'Ticket过期', '重放', '保存ACK丢失', 'Helper异常退出']
put('tests/uac-helper-results.json', {'schema': 'agentnexus.q4.helper-results.v1', 'status': 'NOT_RUN',
    'cases': [{'case': name, 'status': 'NOT_RUN', 'actual_identity': None, 'evidence': []} for name in helper_cases],
    'uac_launched': False, 'synthetic_key_entered_in_deployed_helper': False,
    'standard_user_other_admin_policy': 'REJECT_ORIGINAL_OPERATOR_MISMATCH; NOT_BYPASSED'})
put('reports/uac-helper.md', '# Trusted Helper / UAC\n\n**全部真实部署场景 NOT_RUN。** 本轮未启动 UAC、普通 Launcher 提升路径或生产输入窗口，未录入真实或部署后合成 Key。固定 Launcher/Helper 源码与二进制存在且 Hash 匹配，但未签名，编译纯测不能验证 UAC、对象权限、WinForms/CLR兼容或旧句柄竞态。标准用户借其他管理员凭证仍须拒绝，不绕过原 Operator。\n\n' + '\n'.join('- ' + c + '：NOT_RUN。' for c in helper_cases) + '\n\n[逐项结果](../tests/uac-helper-results.json)。\n')
for title, filename, path, expected in [
    ('High 管理 Pipe', 'high-pipe.md', r'\\.\pipe\AgentNexus.Credential.v1', '源码预期High MIC，SYSTEM/Administrators/Service SID管理权限和白名单'),
    ('Daily Medium Pipe', 'daily-pipe.md', r'\\.\pipe\AgentNexus.Daily.v1', '源码预期Medium MIC、operator 0x00120183且不含CREATE_INSTANCE、拒绝远程；每消息验证实际冒充Token的SID/IL/Session/Logon ID')]:
    put('reports/' + filename, f'''# {title}\n\n**NOT_RUN。** 只读枚举未发现 `{path}`，未连接或创建管道。实际创建者、DACL、Mandatory Label、身份、跨SID/会话、远程拒绝、抢占、重放、消息篡改、权限拒绝均无目标证据。\n\n{expected}；此为源码合同，不是本机对象观察。Runtime 来源、Grant/Nonce/Epoch/Request Hash/Context Hash 的生产关联仍待实际独立进程验证。原合成协议测试不能填充 OS PASS。\n''')
runtime_items = ['服务创建Runtime', '实际父子进程关系', 'Runtime Token', 'Process Security Descriptor', 'Thread Security Descriptor', '私有继承句柄', 'Job Object', '生命周期监管', '服务停止时Runtime退出', 'Runtime崩溃授权撤销', 'Host崩溃授权撤销', '重启后旧Grant失效', '句柄访问', '进程打开', '线程打开', '内存读取', '进程注入', '句柄复制', '依赖替换', '实际DLL/Module加载路径']
put('tests/runtime-isolation-results.json', {'status': 'NOT_RUN', 'items': [{'name': name, 'status': 'NOT_RUN', 'actor_token': None, 'target': None, 'evidence': []} for name in runtime_items]})
put('reports/runtime-isolation.md', '# Native Runtime 实际隔离\n\n**NOT_RUN / BLOCKED。** 无服务创建的 native Runtime 目标。以下20项逐项保持未执行：\n\n' + '\n'.join('- ' + name + '：NOT_RUN。' for name in runtime_items) + '\n\n静态 PE 导入候选和源码Hash不证明实际加载路径/对象权限。管理员、SYSTEM及内核级攻击不属于可由本轮普通用户边界作绝对保证的范围。\n')
history = ROOT / 'deliverables/AgentNexus-M1.8.2/evidence/probes/vault-final.json'
historical_status = json.loads(history.read_bytes())['status']
put('evidence/historical-same-sid-reference.json', {'path': str(history), 'sha256': sha(history), 'original_status': historical_status, 'preserved_unchanged': True, 'q4_attack_execution': 'NOT_RUN'})
put('reports/same-sid-attacks.md', f'''# 同 SID 攻击\n\n**Q4 部署后攻击 NOT_RUN。** 未对真实服务/Runtime/Helper进行进程打开、线程打开、VM读取、注入、句柄复制、dump、依赖替换或Daily伪造。无实际独立攻击进程记录，不声称抵御成功。\n\n历史DPAPI CurrentUser同SID解密反例继续为 **{historical_status}**；原始文件Hash见 [历史引用](../evidence/historical-same-sid-reference.json)。新服务方案尚无实际跨身份隔离证据，不能关闭旧反例。Q4离线同SID合成协议测试另列，不计生产攻击资格。\n''')
put('reports/different-sid-attacks.md', '# 不同 SID 攻击\n\n**NOT_RUN。** 本轮未创建账户或服务，没有第二身份攻击进程、实际Token、目标对象或访问拒绝证据。当前操作员SID和计算出的Inactive Service SID不是跨身份测试。不同用户、Low/Medium、远程及跨Session/Logon边界仍按原70项合同待批后执行。\n')
put('reports/synthetic-e2e.md', '# 部署后完整合成端到端\n\n**NOT_RUN。** 本轮没有获准部署，未执行普通Electron→真实UAC→生产Helper→Credential Service→受保护native Runtime→Daily IPC→Egress→Ledger→FixtureTransport→Streaming→UI的目标闭环。\n\nQ3历史合成E2E为PASS，保持原记录；本轮离线回归也仅为合成诊断。两者都不能代替真实部署后完整闭环、UI Medium保持、一次UAC、日常无UAC或OS攻击资格。\n')
recovery = ['Credential Service崩溃', 'Native Runtime崩溃', 'Electron Host崩溃', 'Helper崩溃', 'Named Pipe断连', 'Streaming中断', 'ACK丢失', 'Host重启', 'Service重启', 'Windows重启', 'UNKNOWN恢复', 'Token Ledger恢复', 'Credential Handle撤销', 'Ticket失效', 'Grant失效']
put('tests/crash-recovery-results.json', {'status': 'NOT_RUN', 'cases': [{'case': c, 'status': 'NOT_RUN', 'evidence': []} for c in recovery]})
put('reports/crash-recovery.md', '# 真实崩溃恢复与数据完整性\n\n**15项全部 NOT_RUN。** 未启动目标服务或要求Windows重启。\n\n' + '\n'.join('- ' + c + '：NOT_RUN。' for c in recovery) + '\n\n未来仅使用独立合成Vault/ledger。UNKNOWN不自动重发、不重复核销或释放、不重置全局额度；原Vault、Ledger、Audit原样保留。真实账本保护式迁移未执行。\n')
put('reports/token-ledger.md', '# Token Ledger\n\n**部署资格 BLOCKED / NOT_RUN。** 本轮未创建或迁移正式账本，未读取原生产Vault/ledger。离线测试使用新合成数据，不能作为服务身份持久化和Windows重启恢复证据。既有100,000,000 Token授权原样保留，未重置、未再次申请；它不授权本轮真实请求。真实Key、live模型Token和费用为0。\n')
put('reports/data-egress.md', '# Data Egress\n\n**部署资格 BLOCKED / NOT_RUN。** Q3源码中的exact request/context/source/nonce/epoch和最终发送fence维持原样；本轮未在真实部署服务中执行Egress。离线FixtureTransport协议断言单列，不证明跨SID服务的生产授权。真实Provider请求0，没有通过产品向Provider发送源码、科研材料或真实Key。\n')
put('reports/rollback-record.md', '''# 回滚方案与本轮记录

**本轮无系统变更，无回滚动作。** 未执行停止服务、注销、账户删除、安装删除或ACL回退；当前服务和两个目标目录原本不存在。

未来必须在精确部署批准中先批准失败处理范围。若已批准的服务启动/就绪失败，停止唯一 `AgentNexusCredential`；核对实际SCM状态、engine/native Runtime/Helper进程退出和两条Named Pipe关闭，再记录实际Token/对象/时间。不能只依据sc请求退出码推断已停止。

保留程序、签名配置和全部合成/正式Vault、原唯一Token Ledger（包括一致WAL/SHM）与Audit。不递归删除数据，不创建空账本，不清零或释放UNKNOWN预算，不自动重发，不回退同SID解密模式。新epoch/重启撤销旧Ticket/Grant/credential handle，保留已发送UNKNOWN。

服务注销、程序移除、账户处理及ACL清理不包含在当前授权中；未来也须逐项精确批准。安装部分失败时保留原物，重新采集状态后另批恢复；不覆盖既有目标，不自动删除再重装。
''')
put('reports/deepseek-live-entry.md', '# DeepSeek Live 后续准入条件\n\n当前 **REAL_KEY_IMPORTED=false / LIVE_PROVIDER_REQUESTED=false**。后续依次需要正式签发方案、最终Hash与独立签名/部署批准、真实Windows部署、全部70项OS测试和19类签署证据、独立安全审查，以及Credential Service/Helper/Runtime/E2E/Vault/Ledger/Egress分别通过资格。\n\n即使OS全部通过，也须另行批准真实Key导入、原唯一REAL账本保护式迁移及具体exact请求/完整外发内容/模型/Token上限/费用范围，才能调用Provider。既有100m授权继续保留，不重置；不把资格签名或一般开发授权当成真实请求许可。\n')
put('reports/signatures-and-certificates.md', '''# 签名与证书验证

**UNSIGNED / NO-GO。** 用户确认没有已批准的外部签发者、数字签名证书和DER SHA256 Pin。未选择本机证书，未创建自签证书，未索取/处理/导出私钥，未签署任何文件。

194个载荷逐项进行Authenticode查询：108 NotSigned、83 UnknownError、3 Valid。83个UnknownError主要是非Authenticode格式的数据/脚本文件，不能当作签名有效或哈希失败。3个Valid分别是Node、d3dcompiler_47.dll和由本机系统Catalog识别的vk_swiftshader_icd.json；Catalog结果不构成项目外部签发批准。12个PE中只有Node和d3dcompiler_47.dll为Valid，其他10个均NotSigned，其中包括Service、Client、Helper、Launcher和Electron；安装脚本也是NotSigned。见 [逐文件原始状态](../evidence/payload-signatures.json)。

本机两个My存储中的7个公开证书元数据已记录，没有任何一个被批准用于项目；HasPrivateKey只是存储元数据，不表示访问私钥。资格和部署两份分离CMS均不存在，authority pin仍是BLOCKED占位符，launch plan已经过期。

签发者身份、公开证书及DER SHA256 Pin、签名方式/范围、同Host/Operator/Service SID/Epoch/期限/资格专用批准引用均待确定。Authenticode改变字节后必须完整重冻结Hash、重新检查依赖、严格构建、受影响测试及独立审查。当前清单是已核验基线，绝非最终签署安装清单。
''')

offline_paths = sorted(RUNTIME.glob('offline-*/result.json'))
offline = json.loads(offline_paths[-1].read_bytes()) if offline_paths else None
if offline:
    put('evidence/offline-verification/result.json', offline_paths[-1].read_bytes())
    for stage in offline['stages']:
        for field in ['stdout_file', 'stderr_file']:
            p = Path(stage[field])
            put('evidence/offline-verification/' + p.name, p.read_bytes())
    tap = Path(next(x['stdout_file'] for x in offline['stages'] if x['name'] == 'affected-regression')).read_text('utf-8')
    counts = {name: int(re.search(r'^# ' + name + r' (\d+)$', tap, re.M).group(1)) for name in ['tests', 'pass', 'fail', 'skipped']}
else:
    counts = None
put('evidence/offline-verification/summary.json', {'status': offline['status'] if offline else 'NOT_RUN',
    'counts': counts, 'scope': 'OFFLINE_SYNTHETIC_ONLY', 'os_attack_passes': 0,
    'synthetic_helper_ui_three_tests': 'NOT_REQUESTED_SKIP; NOT_UAC',
    'first_attempt': {'run': str(RUNTIME / 'offline-20261109T120010Z-e7a07c2e'),
        'orchestration_status': 'FAIL', 'reason': 'FIXED_POWERSHELL_PATH_NOT_PRESENT; corrected to PATH lookup',
        'affected_tests': {'tests': 229, 'pass': 226, 'fail': 0, 'skipped': 3},
        'historical_runtime_new_synthetic_dirs': 'Original tests used fixed Q3 runtime paths on first attempt; fresh unique synthetic run directories were added, no historical evidence overwritten. Second attempt fully isolated Q4 sandbox.'}})
put('reports/offline-verification.md', '# 离线构建与诊断\n\n' + (f"最终独立Q4沙箱严格检查状态 **{offline['status']}**；Node/TS严格noEmit、5个native程序warnings-as-errors编译、既有Service/Client各90（共同断言不重复累加）、Helper138、Launcher36纯断言，以及安装器默认verify-only均独立留原始日志。原限定回归本轮 **{counts['pass']} PASS / {counts['fail']} FAIL / {counts['skipped']} SKIP，共{counts['tests']}测试**。3个SKIP是未启用的合成WinForms UI场景，不是被执行的UAC。\n\n" if offline else '离线诊断尚未汇总，不计入资格。\n\n') + '首轮编译/226项断言已通过，汇总包装器因本机PowerShell位于Codex runtime而非固定Program Files路径失败，原失败运行与日志保留。改为PATH定位，并从已验证完整ZIP抽取源代码到Q4隔离sandbox后重新运行。全部生成物均为诊断候选，未替换任何冻结部署载荷。\n\n[最终原始结果](../evidence/offline-verification/result.json) · [独立汇总](../evidence/offline-verification/summary.json)。这些测试不产生任何70项OS PASS，也不替代真实部署后E2E。\n')

acceptance = {
    'schema': 'agentnexus.q4.acceptance.v1', 'as_of_utc': stamp(now), 'status': 'BLOCKED',
    'deployment_decision': 'NO-GO', 'signing_status': 'UNSIGNED', 'qualification_mode': 'QUALIFICATION_ONLY',
    'phase': 'READ_ONLY_PREFLIGHT_AND_APPROVAL_MATERIALS_ONLY',
    'A_Credential_Service': {k: 'NOT_RUN' for k in ['SERVICE_INSTALLED','SERVICE_STARTED','SERVICE_TOKEN_VERIFIED','SERVICE_SID_VERIFIED','VAULT_ISOLATION_VERIFIED']},
    'B_Trusted_Helper': {k: 'NOT_RUN' for k in ['LAUNCHER_VERIFIED','UAC_VERIFIED','HELPER_IDENTITY_VERIFIED','CREDENTIAL_INPUT_VERIFIED','CREDENTIAL_STORED_VERIFIED']},
    'C_Daily_Runtime': {k: 'NOT_RUN' for k in ['RUNTIME_CREATED_BY_SERVICE','RUNTIME_TOKEN_VERIFIED','RUNTIME_PROCESS_PROTECTION_VERIFIED','DAILY_PIPE_VERIFIED','SAME_SID_ATTACK_RESISTANCE_VERIFIED']},
    'D_End_to_End': {k: 'NOT_RUN' for k in ['SYNTHETIC_E2E_PASS','REAL_WINDOWS_OS_QUALIFIED','TOKEN_LEDGER_QUALIFIED','DATA_EGRESS_QUALIFIED','PRODUCTION_VAULT_QUALIFIED']},
    'E_Live_Provider': {'REAL_KEY_IMPORTED': False, 'LIVE_PROVIDER_REQUESTED': False},
    'os_cases': {'PASS': 0, 'FAIL': 0, 'NOT_RUN': 70}, 'qualification_categories': {'PASS': 0, 'NOT_RUN': 19},
    'payload_integrity': 'PASS', 'source_zip_integrity': 'PASS', 'historical_preservation': 'PASS',
    'offline_diagnostics': {'status': offline['status'] if offline else 'NOT_RUN', 'counts': counts, 'is_os_qualification': False},
    'production_vault_qualified': False, 'independent_review': 'reports/independent-security-review.md',
    'actual_provider_calls': 0, 'actual_live_model_tokens': 0, 'actual_model_cost': 0,
    'existing_token_authorization': 100000000, 'token_authorization_reset': False,
    'system_changes': False, 'real_ledger_migrated': False, 'certificate_generated': False,
    'private_keys_requested_read_or_exported': False, 'commit_or_push': False, 'blockers': blockers,
}
put('acceptance.json', acceptance)
put('acceptance-report.md', f'''# Q4 当前阶段验收

**UNSIGNED / NO-GO；真实Windows资格 BLOCKED。** 按用户后续明确指令，本轮完成只读预检、部署文件核验、审批范围草案和回滚材料；不推进系统部署。

已取得真实宿主、当前Medium操作员原生Token、UAC配置、324项服务清单、父目录owner/DACL、管道名称及公开证书元数据。SCM退出1060，目标服务、程序/数据目录、两个pipe均不存在；Service SID仅被计算为Inactive，未激活、未取得服务Token。

Q3全包650项、Q2清单503项、历史冻结862项与原Hash一致。258源码与ZIP逐项一致；194载荷合计468,433,910字节，无缺失、多余或Hash不匹配。12个PE共86条直接/延迟导入中79条有路径候选，7条API-set运行时解析NOT_RUN；app-manifest186项与app集合一致，真实模块加载/CLR绑定NOT_RUN。签名缺失立即保持NO-GO，不替换文件，不忽略签名。

本轮离线诊断：{counts if counts else 'NOT_RUN'}，严格构建与安装器verify-only见 [原始验证](reports/offline-verification.md)。该计数独立于Q3历史229 PASS，也不计入OS资格。

|验收域|本轮裁定|
|---|---|
|A Credential Service五项|全部NOT_RUN|
|B Trusted Helper五项|全部NOT_RUN|
|C Daily Runtime五项|全部NOT_RUN|
|D E2E / OS / Ledger / Egress / Vault五项|全部NOT_RUN；总资格BLOCKED|
|70原始OS测试|0 PASS / 0 FAIL / 70 NOT_RUN|
|19类签署证据|0 PASS / 19 NOT_RUN|
|E Live Provider|REAL_KEY_IMPORTED=false；LIVE_PROVIDER_REQUESTED=false|

独立复核发现的安装前校验/运行链日期与大小写差异，以及服务启动/就绪/失败停止记录缺口均作为签发前条件保留，未修改Q3源码。没有签发者、Pin、CMS或最终部署批准；当前申请仅为精确范围草案，最终签署清单Hash尚不能冻结。

没有安装、创建/启动服务或账户、修改系统ACL、启动提升权限部署程序、录入真实Key或发出真实Provider请求；未处理私钥，未Commit/Push。原100m授权和历史同SID ISOLATION_FAIL保持。后续先确定正式签发方案，再重新冻结、独立签名/审查和提交最终精确部署审批。
''')
put('deployment-report.md', f'''# Q4 Windows资格部署报告

**只读预检完成；部署未执行，UNSIGNED / NO-GO。** 用户明确确认暂无正式签发条件，后续签发和部署审批另行开展。

当前HEAD `{integrity['head']}`；初始工作树清洁。项目入口及治理policy已读取，`project-rules/README.md`不存在、注册规则为空；工作流路由无匹配专项流程。原规则、Q2/Q3源码、历史测试与交付不改写。

真实Windows 11 Pro 25H2，Build {host['os']['build']}.{host['os']['ubr']}；Operator SID `{host['operator']['sid']}`，原生观察Medium8192、elevated=false、非AppContainer、Session1。UAC EnableLUA=1、PromptOnSecureDesktop=1；这只是配置证据，真实UAC交互NOT_RUN。[原始采集与Hash绑定](evidence/host-evidence-manifest.json)

[基线完整性](evidence/baseline-integrity.json)覆盖Q3 README/验收/部署批准合同、安装清单、完整ZIP和SHA、独立审查、Credential Service/Helper/Launcher/Runtime/双通道协议、OS合同、回滚及历史失败证据。[依赖静态预检](evidence/dependency-preflight.json)不代替实际加载或注入攻击。

服务、Helper、High Pipe、Daily Pipe、Runtime、同SID/不同SID、部署后E2E、崩溃恢复、Ledger和Egress的实际OS验证全部未执行，逐项状态见各报告与tests目录。当前尚无最终安装清单和签署证书链，不虚构签名或生产PASS。[最终阶段裁定](acceptance.json)

未来所涉唯一服务/路径/权限/启动参数/证据要求已精确列入 [申请草案](approval/deployment-request.md)。真实部署失败处理、停止确认和保留Vault/Ledger/Audit见 [回滚方案](reports/rollback-record.md)。原安装器默认只读验证已作为离线检查运行；从未执行Apply。
''')
put('README.md', '''# AgentNexus M1.8.3-Q4

**UNSIGNED / NO-GO。已完成只读预检和审批材料；真实部署、UAC和OS资格未执行。** 用户确认暂无批准签发者/证书/Pin，要求等待正式签发方案。

- [阶段验收](acceptance-report.md) · [机读裁定](acceptance.json) · [完整部署报告](deployment-report.md)
- [精确部署范围草案](approval/deployment-request.md) · [当前194项基线安装清单](approval/installation-manifest.json) · [清单非最终状态](approval/installation-manifest-status.json)
- [签名与证书](reports/signatures-and-certificates.md) · [真实宿主/Token/ACL原始证据](evidence/host-evidence-manifest.json) · [依赖预检](evidence/dependency-preflight.json)
- [Service](reports/credential-service.md) · [ACL](reports/acl-sddl.md) · [Helper/UAC](reports/uac-helper.md) · [High Pipe](reports/high-pipe.md) · [Daily Pipe](reports/daily-pipe.md)
- [Runtime隔离](reports/runtime-isolation.md) · [同SID](reports/same-sid-attacks.md) · [不同SID](reports/different-sid-attacks.md)
- [原70项OS状态](reports/windows-os-tests.md) · [19类资格证据](reports/qualification-evidence.md) · [部署后E2E](reports/synthetic-e2e.md)
- [崩溃恢复](reports/crash-recovery.md) · [Ledger](reports/token-ledger.md) · [Egress](reports/data-egress.md) · [离线验证](reports/offline-verification.md)
- [独立复核](reports/independent-security-review.md) · [回滚](reports/rollback-record.md) · [DeepSeek后续准入](reports/deepseek-live-entry.md) · [治理](reports/governance.md) · [SHA256SUMS](SHA256SUMS)

Q3原始载荷和源码ZIP保持原位，以Hash引用；本目录不复制468MB载荷，也不把基线清单称为最终签署清单。真实Key/Provider/模型Token/费用为0；100m授权不重置；未Commit/Push。
''')
print(json.dumps({'status': 'UNSIGNED_NO_GO', 'cases': len(cases), 'categories': len(categories), 'offline': counts}, ensure_ascii=False))
