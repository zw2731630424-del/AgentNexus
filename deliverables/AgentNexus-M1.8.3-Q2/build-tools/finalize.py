"""Package a verified, still BLOCKED Q2 candidate. No installation or live access."""
from pathlib import Path
import datetime
import hashlib
import json
import shutil
import sys
import zipfile

DELIVERY = Path(__file__).resolve().parents[1]
ROOT = DELIVERY.parent.parent
RUNTIME = ROOT / '.workflow-kit/runtime/AgentNexus-M1.8.3-Q2'
SKIP = {'node_modules', '.git', 'raw', '__pycache__'}


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write(name, data):
    p = DELIVERY / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def files(tree):
    return sorted(p for p in tree.rglob('*') if p.is_file() and not p.is_relative_to(DELIVERY / 'source/dist') and not any(s in SKIP for s in p.relative_to(tree).parts))


def copy(origin, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(origin, destination)


def finalize():
    candidates = sorted((RUNTIME / 'verification').glob('*/result.json'))
    assert candidates, 'Run verify-q2 first'
    result_path = candidates[-1]
    result = json.loads(result_path.read_text(encoding='utf-8'))
    assert result['status'] == 'PASS' and result['source_unchanged'], 'Latest candidate is not frozen/verified'
    current = {p.relative_to(DELIVERY / 'source').as_posix(): sha(p) for p in files(DELIVERY / 'source')}
    assert current == {e['path']: e['sha256'] for e in result['final_source']}, 'Source changed after verification'
    source_entries = [{'path': p.relative_to(DELIVERY / 'source').as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in files(DELIVERY / 'source')]
    aggregate = hashlib.sha256(''.join(e['path'] + '\0' + e['sha256'] + '\n' for e in sorted(source_entries, key=lambda e: e['path'])).encode('utf-8')).hexdigest()
    write('source.manifest.json', {'algorithm': 'SHA256(sorted UTF8(path + NUL + lowercase_sha256 + LF))', 'aggregate_sha256': aggregate, 'files': source_entries})
    with zipfile.ZipFile(DELIVERY / 'AgentNexus-M1.8.3-Q2-source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for entry in source_entries:
            archive.write(DELIVERY / 'source' / entry['path'], 'AgentNexus-M1.8.3-Q2/source/' + entry['path'])
    for report in candidates:
        for item in report.parent.iterdir():
            if item.is_file():
                copy(item, DELIVERY / 'evidence/regression' / report.parent.name / item.name)
    copy(result_path, DELIVERY / 'evidence/final-verification.json')
    for native_dir, names in [('native', ['AgentNexusCredential.exe', 'pipe-client.exe', 'trusted-credential-helper.exe']), ('native-launcher', ['credential-launcher.exe'])]:
        for name in names:
            copy(RUNTIME / native_dir / name, DELIVERY / 'bin' / name)
        for report in (RUNTIME / native_dir).glob('*report.json'):
            copy(report, DELIVERY / 'evidence/native' / native_dir / report.name)
    payload = DELIVERY / 'payload'
    for p in (DELIVERY / 'source/dist').rglob('*'):
        if p.is_file():
            copy(p, payload / 'app/dist' / p.relative_to(DELIVERY / 'source/dist'))
    for p in (DELIVERY / 'source/desktop').rglob('*'):
        if p.is_file():
            copy(p, payload / 'app/desktop' / p.relative_to(DELIVERY / 'source/desktop'))
    (payload / 'app/package.json').write_text(json.dumps({'name': 'agentnexus', 'version': '0.4.0-m1.8.3-q2', 'type': 'module', 'main': 'desktop/main.mjs'}, indent=2) + '\n', encoding='utf-8')
    application_files = [{'path': p.relative_to(payload).as_posix(), 'sha256': sha(p)} for p in sorted((payload / 'app').rglob('*')) if p.is_file()]
    write('approval/app-manifest.json', {'schema': 'agentnexus.application-manifest.v1', 'files': application_files})
    install = []
    for p in sorted((payload / 'app').rglob('*')):
        if p.is_file():
            install.append({'source': p.relative_to(DELIVERY).as_posix(), 'target': 'C:\\Program Files\\AgentNexus\\' + p.relative_to(payload).as_posix().replace('/', '\\'), 'sha256': sha(p)})
    for p in sorted((DELIVERY / 'bin').glob('*.exe')):
        install.append({'source': p.relative_to(DELIVERY).as_posix(), 'target': 'C:\\Program Files\\AgentNexus\\' + p.name, 'sha256': sha(p)})
    install.append({'source': 'approval/app-manifest.json', 'target': 'C:\\Program Files\\AgentNexus\\app-manifest.json', 'sha256': sha(DELIVERY / 'approval/app-manifest.json')})
    write('approval/installation-manifest.json', {'schema': 'agentnexus.q2.installation-candidate.v1', 'can_execute': False, 'status': 'NO_GO', 'files': install,
          'missing_payload_or_authority': ['Complete approved Node/Electron runtime and module closure', 'External signer pin/CMS plan', 'Helper memory/launch boundary implementation and OS evidence', 'Production Daily runtime/transport implementation and OS evidence'], 'no_installer_included': True})
    write('deployment-plan.json', {'schema': 'agentnexus.q2.deployment-plan.v1', 'status': 'NO_GO', 'can_execute': False, 'system_changes_executed': False,
          'only_existing_service_scope_proposed': 'AgentNexusCredential / NT SERVICE\\AgentNexusCredential', 'new_services_proposed': [],
          'proposed_policy_epoch': 2, 'daily_listener': 'NOT_IMPLEMENTED_DO_NOT_CREATE', 'daily_runtime_authenticator': 'NOT_IMPLEMENTED',
          'real_import_enabled': False, 'live_enabled': False, 'global_token_authorization': 100000000, 'new_token_authorization_requested': False,
          'approval_reference': None, 'installation_manifest': 'approval/installation-manifest.json', 'approval': 'reports/deployment-approval.md', 'rollback': 'reports/rollback.md'})
    tests = next(s for s in result['stages'] if s['name'] == 'affected-tests')
    titles = ['正常启动无需管理员', 'Add Key 才触发一次 UAC', '独立可信窗口接收 Key', '明文不经 Renderer', '明文不进入普通 Host', '服务保存凭证', '完成后 Helper 退出', '无已保存 Key 读回接口',
              '普通权限发起日常请求', '日常成功调用不触发 UAC', 'Subagent 精确授权', 'Reviewer 精确授权', 'Agent 无 Key', '同 SID 无法伪造可信请求', '不可重放', '无任意 HTTP 代理', '最终 Data Egress', '唯一可信 Token Owner',
              '真实处理同 SID 解密反例', '真实 OS 身份验证', '崩溃无未授权降级', '恢复不重置预算', '管理和请求可追溯']
    criteria = [{'id': i, 'criterion': title, 'qualification': 'BLOCKED',
                 'code_or_simulation': 'NOT_IMPLEMENTED' if i in (9, 10, 14, 20) else 'IMPLEMENTED_OR_SIMULATED_ONLY',
                 'reason': 'PRODUCTION_DAILY_NATIVE_ORIGIN_CHAIN_MISSING' if i in range(9, 19) else 'NO_APPROVED_DEPLOYED_SERVICE_OR_REAL_OS_EVIDENCE'} for i, title in enumerate(titles, 1)]
    acceptance = {'schema': 'agentnexus.q2.acceptance.v1', 'q2_complete': False, 'qualification': 'BLOCKED', 'deployment': 'NO_GO',
                  'source_files': len(source_entries), 'source_set_sha256': aggregate, 'verification': {'status': 'PASS', 'summary': tests['summary'], 'source_unchanged': True},
                  'channel_a': {'implementation': 'COMPILED_OFFLINE_TESTED', 'os_qualification': 'BLOCKED', 'blockers': ['No real UAC/Service test', 'Helper process/thread/token/loader memory boundary incomplete']},
                  'channel_b': {'implementation': 'EXACT_GRANT_PROTOCOL_SIMULATED', 'production': 'BLOCKED', 'native_runtime_authenticator': 'NOT_IMPLEMENTED', 'medium_listener': 'NOT_IMPLEMENTED'},
                  'historical_same_sid_decryption': 'ISOLATION_FAIL_RETAINED', 'os_attack_pass_count': 0, 'os_attack_not_run_count': 70,
                  'real_keys': 0, 'real_provider_requests': 0, 'real_tokens': 0, 'real_cost_usd': 0, 'system_changes_executed': False, 'criteria': criteria}
    write('acceptance.json', acceptance)
    freeze = json.loads((DELIVERY / 'evidence/baseline-freeze.json').read_text(encoding='utf-8'))
    mismatches = [entry['path'] for entry in freeze['historical_files'] if sha(ROOT / entry['path']) != entry['sha256']]
    assert not mismatches, mismatches
    write('evidence/historical-preservation.after.json', {'status': 'PASS', 'files': len(freeze['historical_files']), 'changed': mismatches, 'source_set_before': freeze['source_set_sha256'], 'historical_same_sid': 'ISOLATION_FAIL'})
    write('usage-token-cost.json', {'real_keys_imported': 0, 'real_provider_requests': 0, 'real_input_output_tokens': 0, 'real_cost_usd': 0, 'authorized_global_total': 100000000, 'budget_reset': False, 'new_authorization_requested': False})
    print(json.dumps({'source_files': len(source_entries), 'source_set_sha256': aggregate, 'test_summary': tests['summary'], 'installation_candidate_files': len(install), 'q2_complete': False}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    if '--checksums' in sys.argv:
        entries = [sha(p) + '  ' + p.relative_to(DELIVERY).as_posix() for p in files(DELIVERY) if p.name != 'SHA256SUMS.txt']
        (DELIVERY / 'SHA256SUMS.txt').write_text('\n'.join(entries) + '\n', encoding='utf-8')
        print(json.dumps({'checksummed_files': len(entries)}))
    else:
        finalize()
