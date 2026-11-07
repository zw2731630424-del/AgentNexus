"""Bind independent review conclusions to captured and currently frozen bytes."""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import hashlib
import json
import subprocess
import zipfile

ROOT = Path('I:/AI_AgentNexus')
DELIVERY = ROOT / 'deliverables/AgentNexus-M1.5.1'
OUT = DELIVERY / 'evidence/independent-review'
SOURCE = DELIVERY / 'source'
COPY = OUT / 'final-source'
EXPECTED = '4825d2432a01a497a68971fab57909bc9613b38ff087346afbcceba56f7aa9fa'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def inventory(base):
    rows = []
    for path in base.rglob('*'):
        if 'node_modules' in path.relative_to(base).parts:
            continue
        if path.is_file():
            data = path.read_bytes()
            rows.append({'path': path.relative_to(base).as_posix(), 'bytes': len(data), 'sha256': digest(data)})
    return sorted(rows, key=lambda x: x['path'])

def set_hash(rows):
    return digest(''.join(f"{r['path']}\0{r['sha256']}\n" for r in rows).encode('utf-8'))

capture = json.loads((OUT / 'final-source-manifest.json').read_text('utf-8'))
before = capture['files']
author = json.loads((DELIVERY / 'source-sha256.json').read_text('utf-8'))
current, copied = inventory(SOURCE), inventory(COPY)
assert current == copied == before == sorted(author['files'], key=lambda x: x['path'])
assert len(before) == 100 and set_hash(current) == EXPECTED
source_zip = DELIVERY / 'AgentNexus-M1.5.1-source.zip'
zip_rows = []
with zipfile.ZipFile(source_zip) as archive:
    names = archive.namelist()
    assert len(names) == len(set(names)) == 100
    for name in sorted(names):
        data = archive.read(name)
        zip_rows.append({'path': name, 'bytes': len(data), 'sha256': digest(data)})
assert zip_rows == before
diff = subprocess.run(['git', 'diff', '--no-index', '--', str(ROOT / 'deliverables/AgentNexus-M1.5/source'), str(COPY)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
assert diff.returncode in [0, 1]
(OUT / 'final-diff.patch').write_bytes(diff.stdout)
(OUT / 'final-diff.stderr.txt').write_bytes(diff.stderr)
probe = json.loads((OUT / 'boundary-probe.stdout.json').read_text('utf-8'))
run = json.loads((OUT / 'probe-run.json').read_text('utf-8'))
assert run['exit_code'] == 0 and probe['passed'] == 10 and probe['failed'] == 0
assert run['source_set_sha256'] == EXPECTED
read = json.loads((OUT / 'reading-manifest.json').read_text('utf-8'))
read_map = {r['path']: r['reading_method'] for r in read['files']}
changed = {r['path'] for r in capture['changed']}
added = {r['path'] for r in capture['added']}
coverage = []
for row in before:
    path = row['path']
    if path in added:
        method = 'FULL_FINAL_TEXT_STATIC_REVIEW'
    elif path == 'src/agentnexus/production/windows/NativeRuntime.cs':
        method = 'FULL_FINAL_CHANGED_DIFF_AND_LAUNCH_CLEANUP_CONTEXT; INHERITED_NATIVE_FULL_REVIEW_BY_PARENT'
    elif path in changed:
        method = 'FULL_FINAL_DIFF_ON_FULL_PREVIOUS_TEXT_REVIEW'
    else:
        method = read_map.get('deliverables/AgentNexus-M1.5/source/' + path, 'HASH_ONLY_PARENT_SEMANTIC_REVIEW_SCOPE')
    coverage.append({**row, 'reading_method': method, 'original_m15_identical': path not in changed and path not in added})
counts = Counter(r['reading_method'] for r in coverage)
verification = {
    'schema': 'agentnexus/m151/independent-byte-verification/1',
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'source_set_sha256': EXPECTED, 'files': 100,
    'author_manifest_matches': True, 'reviewer_copy_matches': True,
    'source_unchanged_after_probe': True, 'zip_members_match_exactly': True,
    'source_zip_sha256': digest(source_zip.read_bytes()),
    'author_manifest_sha256': digest((DELIVERY / 'source-sha256.json').read_bytes()),
    'added_count': len(added), 'changed_count': len(changed), 'removed_count': len(capture['removed']),
}
(OUT / 'final-byte-verification.json').write_text(json.dumps(verification, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
artifacts = []
for name in ['reading-manifest.json', 'catalog-analysis.json', 'final-source-manifest.json', 'final-byte-verification.json', 'final-diff.patch', 'final-diff.stderr.txt', 'boundary-probe.mjs', 'boundary-probe.stdout.json', 'boundary-probe.stderr.txt', 'probe-run.json', 'build-reading-manifest.py', 'capture-final-source.py', 'finalize-review.py']:
    path = OUT / name
    data = path.read_bytes()
    artifacts.append({'path': name, 'bytes': len(data), 'sha256': digest(data)})
review = {
    'schema': 'agentnexus/m1.5.1/independent-security-review/1',
    'reviewer': '/root/independent_review', 'generated_at': datetime.now(timezone.utc).isoformat(),
    'code_review_status': 'PASS_LIMITED', 'production_status': 'BLOCKED', 'production_qualified': False,
    'conclusion': 'No open reproducible P0/P1 was identified in the stated code-review scope. Known cumulative hard-CPU capability failure remains blocked; model checks confer no OS production qualification.',
    'findings': [], 'unresolved_p0_p1_code_findings': [],
    'contract_hardening': {'prior_untrusted_certificate_bypass_confirmed': False, 'description': 'The new fixed resource gate strengthens the current release contract. A trusted qualification key was already a TCB boundary; this review does not relabel intentional TCB signing authority as a Worker vulnerability.', 'resource_error': 'M151_CPU_HARD_LIMIT_NOT_QUALIFIED'},
    'independence': {'product_modified': False, 'historical_evidence_modified': False, 'recursive_delegation': False, 'system_account_acl_service_profile_firewall_changes': False, 'provider_or_keys_accessed': False, 'full_regression_executed': False, 'native_probes_executed': False, 'cpu_busy_loops_executed': False, 'writes': 'Only reviewer-owned M1.5.1/evidence/independent-review files and synthetic model data'},
    'source_binding': {**verification, 'files_with_coverage': coverage, 'coverage_counts': dict(counts)},
    'historical_reading': {'manifest': 'reading-manifest.json', 'full_baseline_product_ts': 43, 'full_baseline_test_ts': 12, 'native_only_test_ts_hash_checked': 2, 'adr_range': '001-029', 'm12_issue_ledger': 'FULL_TEXT_READ', 'm15_independent_original_md_json': 'FULL_TEXT_READ', 'catalogs': 'Complete JSON structure parse and traversal, not literal prose review'},
    'final_delta_review': {'added': capture['added'], 'changed': capture['changed'], 'removed': capture['removed'], 'new_native_lifecycle_fixture': 'Full C#/PowerShell/TS source static review; not executed by this reviewer', 'native_runtime': 'All changed lines and adjacent launch/cleanup context reviewed. Added timestamps, final member CPU accounting and CloseHandle results; no CPU budget, deadline, Job flag or policy relaxation in the diff.', 'cpu_qualification_runner': 'Full final text read; 58 predetermined cases, original budgets/tolerance, any failure fails the run, all successes remain INCONCLUSIVE, no automatic production qualification'},
    'independent_validation': {'method': 'Independently authored ten-case model executed against exact reviewer source copy; ephemeral crypto, SQLite and artifact bytes are real, all OS/security observations synthetic', 'run': run, 'cases': probe['cases'], 'native_processes_started': 0, 'cpu_workloads_started': 0, 'production_host_bootstrap': 'NOT_RUN; local Host fixture and QualificationGate constructor only'},
    'reviewed_invariants': [
        'Bootstrap config hash/enrollment key/source/peer bindings remain in the TCB; untrusted messages cannot supply a replacement qualification public key.',
        'New capability gate rejects REAL_WINDOWS in Host prepare before reservation/native creation, and in QualificationGate.admit before certificate selection. Broker repeats admit before consumption and before start.',
        'Legacy PROCESS and EXTERNAL_EFFECT reject even with requires_sandbox=false, exact approval and optional PDP DISABLED; independent probe observed zero handler calls.',
        'Durable audit failure before native prepare or Broker start leaves unknown state and produces zero prepare/start calls; consumed Permit cannot be replayed.',
        'WindowsSupervisor network/filesystem/limits observations remain false. Proof rebuild cannot upgrade them through a qualification hash or source label.',
        'Incomplete tree, unknown outputs/IPC or model evidence cannot release resources; independent closure model retained all five claims.',
        'Final candidate and reviewer copy remained unchanged through the independent model run, and every ZIP member matches the same 100-file set.',
    ],
    'remaining_production_blockers': [
        'Strict cumulative CPU budget is known unqualified. JOB_TIME/readback/rate cap and a later incidental PASS cannot authorize production; current code hard-blocks REAL_WINDOWS execution.',
        'Actual distinct Host/Launcher/Operator identities, protected startup/config/key ACLs, cross-account IPC, composed network/filesystem/project/database/credential boundaries remain unqualified.',
        'Native same-account file/tree/pipe/lifecycle primitives and renamed source labels do not constitute full production membership, producer, restart, ExitProof or owner-release evidence.',
        'OS reboot/hard power loss, hard disk limits and Ubuntu remain separate NOT_RUN/BLOCKED work. Unknown claims and prepared slots have no automatic release fallback.',
    ],
    'limitations': [
        'This is scoped code review and model validation, not proof of whole-product safety.',
        'Inherited native C#/PowerShell and two native-only TS suites were not freshly read in full by this reviewer; parent handled that semantic review. This reviewer audited the complete new native lifecycle fixture and all final NativeRuntime changed lines/context.',
        'Author full-regression, same-account native and CPU results are not counted as reviewer-executed tests and were not independently rerun here.',
        'Strict tsc was not rerun by this reviewer. Node --check of the custom probe establishes syntax only.',
        'No real production Host startup, Worker launch, live OS peer, account/ACL/profile isolation or genuine release occurred in the ten synthetic checks.',
        'A signed certificate from the protected TCB key is not an untrusted Worker bypass. The new resource guard is explicit contract hardening, while native capability failure remains a production blocker.',
    ],
    'governance_note': 'govern.py new was attempted before artifact creation and failed on an existing baseline-corrected runtime Windows long path (WinError 3). Artifacts were created directly in the already-approved deliverable class; no rule change or historical relocation was performed by reviewer. Overall governance is parent acceptance scope.',
    'artifacts': artifacts,
}
(OUT / 'independent-security-review-final.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
md = f'''# AgentNexus M1.5.1 独立代码审查

结论：**限定代码审查通过（PASS_LIMITED）；完整 Windows 生产执行与资源释放仍 BLOCKED。** 在下述范围未识别可实际触发的开放 P0/P1。已知累计 CPU 硬预算失败仍是能力阻断，不因证书、设置读回或偶然 PASS 解除。

## 最终字节绑定

最终源码 **100 文件**，集合 SHA256 `{EXPECTED}`。作者清单、审查者独占副本、探针后当前源码及源码 ZIP 的全部成员逐路径、字节数、SHA256 一致。相对 M1.5 为 **5 改、9 新增、0 删除**。ZIP SHA256 `{verification['source_zip_sha256']}`。独立核对详见 [final-byte-verification.json](final-byte-verification.json)、[逐文件与覆盖清单](final-source-manifest.json)和[完整差异](final-diff.patch)。

## 阅读与独立性

全文审查 M1.5 的 43 个产品 TS、12 个 TS 测试，以及指定继承 Python checker、mjs/Python 工具和非原生专用 fixture。两份大目录采用完整 JSON 结构解析及所有值遍历，未宣称逐字阅读目录说明：170 Feature、44 Policy，无重复键或 ID，保护功能默认 OFF、L0 不可降级。M1.2/1.3/1.4 历史验收与独立报告、M1.2 issue ledger、ADR001–029、M1.5 独立报告 MD/JSON 原件均已核读。全部读取路径和 SHA256 见 [reading-manifest.json](reading-manifest.json)。

最终全部新增文件已全文复核；NativeRuntime 的全部改动和相邻 launch/cleanup 上下文已复核。新增内容是时间戳、逐成员 CPU 统计和 CloseHandle 返回观察；预算、截止和 Job 策略未改弱。继承 native C#/PowerShell 和两个原生专用 TS 的全文复读由主代理负责，本独立报告不扩大声称。

审查者未修改产品、规则或历史原件，未递归派发，未修改账户、ACL、Profile、服务或防火墙，未连接 Provider 或读取 Key。仅写本目录及独占合成模型数据。

## 独立验证

独立编写的 [boundary-probe.mjs](boundary-probe.mjs) 在最终副本执行 **10/10 按预期，0 FAIL，exit 0**。原始 [stdout](boundary-probe.stdout.json)、[stderr](boundary-probe.stderr.txt) 和 [运行绑定](probe-run.json)完整保留。所有 OS 身份和观察均为 SIMULATED；测试中的 `REAL_WINDOWS` 是负例输入标签。真实部分仅临时签名、SQLite、Artifact 和字节校验。没有启动 native Worker 或 CPU 负载。

| 重点 | 独立结果及限定 |
|---|---|
| 能力门禁 | 有效签名、15 个完整 checks 的 REAL_WINDOWS certificate 仍报 `M151_CPU_HARD_LIMIT_NOT_QUALIFIED`；Broker 消费和 start 均为 0 |
| 原 Gateway | PROCESS/EXTERNAL_EFFECT 即使精确审批、requires_sandbox=false、PDP DISABLED，仍 BLOCKED，handler 调用为 0 |
| Audit 失败 | Bootstrap flush 注入后 native prepare 为 0；Broker durable barrier 注入后 start 为 0，原 Permit 重放拒绝并保持 UNKNOWN |
| ExitProof | network/filesystem/limits 任一个 false、模型来源、unknown member 或未闭合 output 均不能产生释放 authority |
| closure/IPC | unknown IPC 保留全部五 claim，payload/MAC 变更拒绝 |

QualificationGate 构造及本地 Host 模型夹具可初始化，仅证明这些代码路径不被新增门禁误伤；生产 Host 的真实 attestation/启动没有执行。新增固定门禁属于合同强化，本报告没有把原先受信任 TCB 签发资格的能力误报为不可信 Worker 绕过。

## 保留的阻断与验证限度

CPU 新工具的 58 个预定场景计划、80/300/3000ms 预算及原容差已静态复核；任何失败使总结果 FAIL，有限样本全成功仍 INCONCLUSIVE，production_qualified 始终 false。审查者未运行 CPU 全套或据作者旧断言的 PASS 宣称 CPU 资格通过。

真实跨账户、启动对象/私钥 ACL、组合文件/网络/管理库/跨项目隔离、完整成员与 producer 历史、真实 Host 重启、完整 ExitProof/owner release、硬磁盘限制、OS 重启/断电及 Ubuntu 仍需独立证据。WindowsSupervisor 的 network/filesystem/limits 仍 false；同账户原语不能补齐。未知资源和准备槽不得自动释放。

作者最终完整回归、严格 tsc、同账户 native 和 CPU 原始结果不计入本报告的独立执行数。本审查未独立重跑这些测试。结论仅绑定上述 100 文件；后续源码改变须重新核对。

机器报告：[independent-security-review-final.json](independent-security-review-final.json)。
'''
(OUT / 'independent-security-review-final.md').write_text(md, encoding='utf-8')
print(json.dumps({'status': review['code_review_status'], 'production': review['production_status'], 'source_set_sha256': EXPECTED, 'files': len(before), 'independent_cases_passed': probe['passed'], 'open_p0_p1': 0, 'coverage_counts': dict(counts)}, ensure_ascii=False))
