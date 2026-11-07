import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const decode=bytes=>bytes.toString('utf8').replace(/^\uFEFF/,'');
const readJson=async name=>JSON.parse(decode(await readFile(join(root,name))));
const verification=await readJson('freeze-verification-approved-final.json');
if(!verification.matched||verification.expected_set_sha256!=='a55823fae02fd565249cf0d2af1f3257d2e107b798b05b078b74ba15eb0e109e')throw Error('Final freeze is not independently matched');
const source=await readJson('source-snapshot-approved-after.json');const sourceMap=new Map(source.files.map(f=>[f.path,f]));
const runs=await readJson('approved-final-probe-run-summary.json');if(runs.some(r=>r.exit_code!==0))throw Error('A final probe process failed');
const sourceBindings={
  'permission-probe':'src/agentnexus/bootstrap/permissions.ts',
  'proof-probe':'src/agentnexus/bootstrap/launcher-proof.ts',
  'release-probe':'src/agentnexus/production/broker.ts',
  'config-pin-probe':'src/agentnexus/bootstrap/config.ts',
};
const evidence=[];let modelChecks=0;
for(const run of runs){
  const bytes=await readFile(run.log),raw=decode(bytes);
  if(run.name==='selected-reservation-tests'){
    const matched=raw.match(/\bpass\s+(\d+)/),failed=raw.match(/\bfail\s+(\d+)/);
    if(Number(matched?.[1])!==3||Number(failed?.[1])!==0)throw Error('Selected reservation tests did not pass 3/3');
    evidence.push({name:run.name,assurance:'SIMULATED',cases:3,passed:3,log:run.log,sha256:hash(bytes),basis:'Three author-written model tests independently rerun using a reviewer-owned data root; no native process is prepared.'});modelChecks+=3;continue;
  }
  const result=JSON.parse(raw);
  if(result.stable_during_probe===false)throw Error('Probe source changed while running: '+run.name);
  if(typeof result.source_sha256==='string'){
    if(sourceMap.get(sourceBindings[run.name])?.sha256!==result.source_sha256)throw Error('Probe source does not match final freeze: '+run.name);
  }else for(const [path,sha] of Object.entries(result.source_sha256))if(sourceMap.get(path)?.sha256!==sha)throw Error('Probe dependency does not match final freeze: '+path);
  if(run.name==='restart-probe'){
    if(result.childExit!==0||result.reopenFailure?.code!=='STORE_LOCKED'||result.explicit_recovery?.recovered!==true||result.reopen_after_explicit_recovery!==true)throw Error('Storage recovery primitive did not meet its limited assertions');
    evidence.push({name:run.name,assurance:result.assurance,cases:1,passed:1,log:run.log,sha256:hash(bytes),scope:result.scope});continue;
  }
  let cases=result.results;
  if(run.name==='probe-first')cases=cases.map(r=>({...r,passed:r.id==='RECHECK_OUTPUT_INTERLEAVE'?r.serial_rpc_fix_observed===true&&r.defect_reproduced===false:r.completed_retire_fix_observed===true&&r.completed===5&&r.failure===null}));
  if(cases.some(r=>r.passed!==true))throw Error('A model assertion failed in '+run.name);
  modelChecks+=cases.length;evidence.push({name:run.name,assurance:'SIMULATED',cases:cases.length,passed:cases.length,log:run.log,sha256:hash(bytes),scope:result.scope??'Bounded RPC concurrency and terminal-only in-memory retirement models',results:cases});
}
if(modelChecks!==37)throw Error('Unexpected model-case count: '+modelChecks);
const bootstrap=['config.ts','entry.ts','exit-closure.ts','launcher-proof.ts','permissions.ts','reservations.ts','runtime.ts','session.ts','supervisor.ts','ubuntu.ts','worker.ts'].map(p=>'src/agentnexus/bootstrap/'+p);
const production=['authority.ts','audit.ts','broker.ts','contracts.ts','exit.ts','file-broker.ts','host.ts','identity.ts','native-client.ts','qualification.ts','service.ts','transport.ts','windows-supervisor.ts'].map(p=>'src/agentnexus/production/'+p);
const native=['src/agentnexus/production/windows/BootstrapNative.cs','src/agentnexus/production/windows/NativeRuntime.cs','src/agentnexus/production/windows/runtime.ps1'];
const primary=[...bootstrap,...production,...native,'tools/agentnexus/cpu-qualify-m15.mjs'];
for(const path of primary)if(!sourceMap.has(path))throw Error('Reviewed file missing from final source: '+path);
const findings=[
  {id:'IR15-01',priority:'P2',title:'Peer monitoring and output competed for a single native RPC',status:'CODE_CLOSED_LIMITED',files:['src/agentnexus/bootstrap/session.ts','src/agentnexus/bootstrap/supervisor.ts'],resolution:'A bounded shared RPC serial gate now covers read/write/peer. Interleaved monitoring and output complete without M14_NATIVE_BACKPRESSURE.',verification:'Independent SIMULATED interleave probe.'},
  {id:'IR15-02',priority:'P2',title:'Completed prepared-process maps were never retired',status:'CODE_CLOSED_LIMITED',files:['src/agentnexus/bootstrap/supervisor.ts','src/agentnexus/production/windows-supervisor.ts'],resolution:'Terminal root/Job/output observations retire native helpers and in-memory maps; uncertain or unstarted entries remain held. Five consecutive settled model runs complete. Durable resource claims are not released by retirement.',verification:'Independent SIMULATED lifecycle probe; no real Worker lifecycle claim.'},
  {id:'IR15-03',priority:'P2',title:'Config pin case handling and role config placement could prevent startup',status:'CODE_CLOSED_LIMITED',files:['src/agentnexus/bootstrap/config.ts','src/agentnexus/bootstrap/entry.ts'],resolution:'All helpers share normalized external-config hash substitution. Config must be outside code_root, avoiding cross-role self-referential source manifests. Operator SID is distinct from Host/Worker.',verification:'Independent config pin models plus static entry-point review.'},
  {id:'IR15-04',priority:'P1',title:'A generic PowerShell fingerprint did not identify the enrolled Launcher instance',status:'CODE_CLOSED_OS_QUALIFICATION_PENDING',files:['src/agentnexus/bootstrap/launcher-proof.ts','src/agentnexus/bootstrap/runtime.ts'],resolution:'A private enrolled Launcher key signs a fresh challenge bound to both actual pipe process tuples, configuration/source/helper hashes and expiry before the session key is sent.',verification:'Five independent signature/challenge models; actual key ACL and cross-account identity qualification remain BLOCKED.'},
  {id:'IR15-05',priority:'P1',title:'Source, ACL and private-storage object coverage was incomplete',status:'CODE_CLOSED_OS_QUALIFICATION_PENDING',files:['src/agentnexus/bootstrap/config.ts','src/agentnexus/bootstrap/permissions.ts','src/agentnexus/production/windows/BootstrapNative.cs'],resolution:'Root domains are disjoint; the complete source inventory requires individual immutable file pins and semantic ACL checks including DELETE_CHILD. Node/PowerShell parent directories are pinned. Up to four bounded pin batches are used and all leases are rechecked; losing one revokes production. Private storage uses a bounded root-relative owner/DACL/reparse/hardlink inspection.',verification:'Four permission and six config/batch models plus native static review. Storage inspection is explicitly a security snapshot under trusted mutators, not an atomic content snapshot. Positive deployed ACL enforcement is NOT_RUN.'},
  {id:'IR15-06',priority:'P2',title:'Crash-left writer locks prevented reaching ledger recovery',status:'CODE_CLOSED_LIMITED',files:['src/agentnexus/bootstrap/runtime.ts','src/agentnexus/storage.ts'],resolution:'After successful OS/storage attestation, Bootstrap invokes the existing explicit owner-death lock recovery before opening stores, preserving the abandoned lock evidence; uncertain or reused/live PIDs still deny.',verification:'One REAL_OS_CURRENT_ACCOUNT_STORAGE_PRIMITIVE sequence reproduced STORE_LOCKED after a child exits without close, then recovered and reopened its isolated store. No production Host restart is claimed.'},
  {id:'IR15-07',priority:'P1',title:'Runtime capabilities could remain ACTIVE after the one-operation lifetime',status:'CODE_CLOSED_LIMITED',files:['src/agentnexus/bootstrap/runtime.ts','src/agentnexus/production/file-broker.ts'],resolution:'The request finalizer revokes endpoint/runtime capabilities and drops bound channels. Production FileBroker is wired to live OS identity rechecks before and after the audit barrier. Revocation after the barrier prevents the native read and keeps the nonce UNKNOWN_QUARANTINED.',verification:'Independent injected liveness-failure model and static production wiring review.'},
  {id:'IR15-08',priority:'P2',title:'Broker quota had no trusted owner-release acknowledgement path',status:'CODE_CLOSED_OS_QUALIFICATION_PENDING',files:['src/agentnexus/production/broker.ts','src/agentnexus/bootstrap/runtime.ts','src/agentnexus/production/authority.ts'],resolution:'A signed owner receipt follows consumed Host release authorization, closure and independent adjudication. Broker checks its own complete proof, original intent/boot and five resources before durably marking RELEASED. Reuse updates only RELEASED projections with revision+1 in the original atomic claim transaction.',verification:'Six independent release models reject incomplete proofs/wrong keys/intents/resources and accept one idempotent receipt. No genuine production release is qualified.'},
  {id:'IR15-09',priority:'P1',title:'Suspended Worker creation needed a durable pre-prepare gate',status:'CODE_CLOSED_LIMITED',reported_by:'Author final self-review; independently re-reviewed',files:['src/agentnexus/bootstrap/reservations.ts','src/agentnexus/bootstrap/runtime.ts','src/agentnexus/bootstrap/supervisor.ts','src/agentnexus/production/authority.ts'],resolution:'PREPARING and REQUESTED audit commit/flush precede supervisor.prepare, with live Feature/store fences. Prepared ownership transfers in the original Permit/Approval/resource transaction. Untransferred or cross-boot uncertainty stays quarantined. Disabled Launcher rejects PREPARE/AUTHORIZE/START before native preparation.',verification:'Three selected SIMULATED tests independently rerun, covering zero native preparations on disable/audit failure, transaction rollback and restart quarantine. Real pre-Permit OS owner recovery remains BLOCKED.'},
];
const report={
  schema:'agentnexus/independent-security-review/1',generated_at:new Date().toISOString(),reviewer:'/root/security_review',code_review_status:'PASS_LIMITED',production_status:'BLOCKED',production_qualified:false,
  conclusion:'All reported code dispositions were independently re-reviewed. No open P0/P1 code finding was identified within the stated scope. Static/model review and a current-account storage primitive do not certify the Windows production chain.',
  independence:{product_files_modified:false,historical_deliverables_modified:false,workspace_writes:'Only reviewer-owned .workflow-kit/runtime/AgentNexus-M1.5/independent-review artifacts and fixtures',recursive_delegation:false,full_regression_run_by_reviewer:false,accounts_acl_profiles_services_firewall_changed:false,provider_or_api_keys_accessed:false},
  source_tree:{root:source.root,files:source.files,set_sha256:verification.expected_set_sha256,set_definition:verification.set_definition,freeze_verification:'freeze-verification-approved-final.json',before_manifest:verification.before_manifest,after_manifest:verification.after_manifest,unchanged_during_final_probes:true,parent_manifest_file:verification.parent_manifest_file},
  coverage:{full_primary_files:primary.map(path=>sourceMap.get(path)),supporting_sections:['src/agentnexus/storage.ts: writer locks, open and recovery','src/agentnexus/reconciliation.ts: owner authorization/versioned release gates','src/agentnexus/runtime/contracts.ts: identity/profile/snapshot boundaries','src/agentnexus/runtime/ipc.ts: frame MAC/length/canonical encoding','src/agentnexus/types.ts: identity/canonical invariants','tests/agentnexus/m15-bootstrap.test.ts: new model tests and selected execution'],hashed_files_are_not_a_claim_of_full_semantic_review_of_all_91_files:true},
  findings,unresolved_p0_p1_code_findings:[],
  final_new_scope_reviews:[
    'Finite file digest input is bounded to 4KiB and requires both the original signed execution Grant and an exact signed FileGrant, plus approved content hash. Independent file-input models reject cross-operation/resource/path/epoch, stale permits and byte/argument mutations.',
    'Native-reported OS version must equal profile.os_version. Profile accessible/read_only paths are exactly code_root and the Node runtime directory. Positive native attestation remains separate OS evidence.',
    'CPU qualification launches runtime and fixtures from an isolated complete source copy and records the actual copied source manifest. Cumulative user CPU and wall termination are distinguished; production_qualified stays false. Reviewer did not run CPU busy loops.',
  ],
  evidence_summary:{simulated_cases:37,simulated_passed:37,current_account_storage_sequences:1,current_account_storage_passed:1,evidence},
  tcb_boundary:['Host, Operator, the standard-account Launcher and approved storage mutators are trusted; enrolled private keys and protected startup objects belong to that TCB.','The hostile Worker is the restricted AppContainer child. Its inability to read the Launcher key, management database and other projects requires actual combined OS tests.'],
  remaining_production_blockers:[
    'Explicit system authorization and real distinct standard Host/Worker identities, a distinct trusted Operator, exact startup objects, protected deployment ACLs and AppContainer profile are required.',
    'Cross-account IPC and enrolled Launcher proof, actual prepared AppContainer Runtime binding, key/database denial and revocation must pass real OS lifecycle and attack tests.',
    'WindowsSupervisor still reports network_verified=false, filesystem_verified=false and limits_verified=false; no certificate or same-account primitive can manufacture these missing observations.',
    'CPU hard-budget stability and combined filesystem/disk/resource limits remain unqualified. Historical failures and misleading non-DEADLINE PASS records must remain preserved; later incidental PASS cannot confer production qualification.',
    'Real production Host crash/restart, pre-Permit abandoned slots, complete Job history, output producers, IPC unknown state and genuine owner-authorized release require target-OS evidence. Unknown slots/claims have no automatic release fallback.',
    'Ubuntu is technical preparation only. No real UID/GID, SO_PEERCRED, namespace, seccomp, cgroup or AppArmor deployment is qualified.',
  ],
  author_validation:{final_full_regression:'PENDING_AUTHOR_ARCHIVE',final_cpu_qualification:'PENDING_AUTHOR_ARCHIVE; existing failures retained; production guarantee remains false',strict_tsc:'Author reported PASS; not rerun by independent reviewer'},
  preserved_intermediate_evidence:{source_set_sha256:'44b2be4ce76faf55fe0f8a42666180b14d2239cfbcce8958e5e2f78354a295a9',verification:'freeze-verification-intermediate-before-audit-gate.json',final_named_logs_are_intermediate_unless_prefixed_approved_final:true},
  excluded_non_product_failures:[
    {files:['probe-first-original.mjs','probe-first-original.log'],reason:'The first reviewer harness waited for a write rejection after the product had already gained a serial gate; its unsettled top-level await is a harness limitation, not a product failure. Original bytes/log retained.'},
    {files:['probe-second.mjs','probe-second.log'],reason:'The early lifecycle fixture omitted terminal root/Job/output fields, so retaining its prepared slots was expected conservative behavior; it is not counted as a post-fix product failure.'},
  ],
};
const md=[
  '# AgentNexus M1.5 独立安全审查',
  '',
  '结论：**限定代码审查完成（PASS_LIMITED）；完整 Windows 生产执行链仍 BLOCKED。** 已回报问题的代码处置均已复核，当前范围未发现尚未关闭的 P0/P1 代码问题。本结论不授予生产运行、系统变更或资源释放资格。',
  '',
  '## 字节绑定与独立性',
  '',
  `最终集合：91 文件，SHA256 \`${verification.expected_set_sha256}\`。全部文件逐项与主代理最终清单相同；独立探针前后集合均相同。详见 [逐文件清单](source-snapshot-approved-after.json) 和 [独立比较结果](freeze-verification-approved-final.json)。`,
  '',
  '本代理只写自身 runtime 审查目录，未改产品源码或历史交付，未递归委派，未运行完整回归，未改账户/ACL/Profile/服务/防火墙，未读取 API Key 或连接 Provider。',
  '',
  `全文审查主要覆盖 ${primary.length} 个产品文件：全部 11 个 bootstrap TS、13 个 production TS、两份原生 C#、runtime.ps1、CPU 资格工具；另核查存储锁、IPC、对账释放与新增模型测试。91 文件的散列覆盖不表示每个旧测试/目录均作完整语义审查。`,
  '',
  '## 发现与闭合',
  '',
  '| 编号 | 问题 | 已复核的代码处置 | 证据范围 |',
  '|---|---|---|---|',
  '| IR15-01 | peer 复查与输出争用单飞 RPC | 有界共享串行门 | 独立 SIMULATED 交错探针 |',
  '| IR15-02 | 已结算 prepare/helper 映射不退还 | 仅 root/Job/output 结算后退还内存与 helper；未知仍持有 | 独立 SIMULATED 连续 5 次结算 |',
  '| IR15-03 | 配置路径大小写与两角色清单循环 | 统一外置配置 hash pin、路径规范化与 distinct Operator | 独立配置模型/静态接线 |',
  '| IR15-04 | 通用解释器指纹不足以确认 Launcher | enrolled key 签署双方 pipe tuple、随机挑战、配置/源码/helper hash | 5 项独立签名模型；真实密钥 ACL/跨账户仍待验证 |',
  '| IR15-05 | 源码/权限/数据库对象覆盖不足 | 完整逐文件 pin、ACL 语义、根互斥、4 batch/all-lease、私有存储只读 ACL 扫描 | 4 项权限模型、6 项配置模型与原生静态审查；真实部署 NOT_RUN |',
  '| IR15-06 | crash 遗留锁阻断 ledger recovery | attestation 后先作已有 owner-death 恢复并保留锁证据 | 当前账户 storage 原语；真实 Host 重启未验证 |',
  '| IR15-07 | 单次任务结束后身份能力仍可 ACTIVE | revoke runtime/endpoint；FileBroker 在审计前后复查 live identity | 独立撤销注入模型，nativeReads=0 |',
  '| IR15-08 | Broker 账本无 owner release 确认通道 | 完整本地 proof + Host 独立释放回执；RELEASED 投影 revision+1 原子复用 | 6 项独立回执模型；真实释放未获资格 |',
  '| IR15-09 | 挂起创建前缺审计/实时门禁 | REQUESTED/PREPARING 先 flush；原 Permit 事务 transfer；未知准备槽持久隔离 | 主代理自检发现；独立复核并重跑 3 项模型 |',
  '',
  '另复核了新增 4KiB 文件摘要：原执行 Grant 与精确 FileGrant 双签名、operation/runtime/worker/resource/path/hash/epoch 绑定、不可变输入与 Launcher/Worker 两端验证，11 项独立模型按预期。原生 OS 版本与 profile 等值、只读路径范围、Node/PowerShell 父目录 pin，以及 CPU 测试隔离源码副本清单也已复核。',
  '',
  '## 独立复核结果',
  '',
  '| 范围 | 结果 | 限定 |',
  '|---|---|---|',
  '| RPC/回收、权限、Launcher proof、释放回执、文件输入、配置/batch 模型 | 34/34 按预期 | SIMULATED；真实临时签名/SQLite 不证明 OS 隔离 |',
  '| 新准备槽/禁用 Launcher 模型测试 | 3/3 按预期 | 重跑作者的 3 项选定测试；审计失败/关闭状态下创建计数为 0 |',
  '| 存储 crash/lock recovery | 1 个序列按预期 | REAL_OS_CURRENT_ACCOUNT_STORAGE_PRIMITIVE；不是生产 Host 重启 |',
  '| 跨账户生产链/组合 Sandbox/真实 ExitProof 释放 | BLOCKED / NOT_RUN | 无本轮系统授权与组合 OS 证据 |',
  '',
  '日志均以 `approved-final-` 开头，SHA256 与源码绑定记录在 [机器报告](independent-security-review-final.json)。所有失败、初始 harness 限制、早期不完整模型与 44b2be4… 中间冻结记录均保留，没有改写为最终通过。主代理最终完整回归与 CPU 运行结果由作者后续归档，本报告未代为认定。',
  '',
  '## 生产阻断条件',
  '',
  'Host、Operator、Launcher 标准账户、受保护启动对象、enrollment 私钥与批准的存储 mutator 属于可信计算基；受限 AppContainer Worker 是待验证的攻击边界。真实部署必须证明 Worker 读不到私钥/管理数据库/其他项目，且真实 peer、挂起进程、绑定、撤销与退出生命周期闭合。',
  '',
  'WindowsSupervisor 的 network/filesystem/limits 观察仍为 false，CPU/磁盘硬限制与组合攻击资格未完成；局部原语、证书、设置读回或偶然 CPU PASS 均不能补齐。历史 CPU 失败原件必须保留。真实 Host 重启、未接管准备槽、完整 Job 历史、输出 producer、IPC 未知状态和独立 owner 释放仍须取得目标 OS 证据；未知状态没有自动释放兜底。',
  '',
  'Ubuntu 仅有技术准备，实际部署和组合测试仍需单独授权。本审查的任何限定通过均不转移为 Windows 或 Ubuntu 生产通过。',
  '',
].join('\n');
const jsonPath=join(root,'independent-security-review-final.json'),mdPath=join(root,'independent-security-review-final.md');
const jsonBytes=Buffer.from(JSON.stringify(report,null,2)+'\n'),mdBytes=Buffer.from(md);
await writeFile(jsonPath,jsonBytes,{flag:'wx'});await writeFile(mdPath,mdBytes,{flag:'wx'});
console.log(JSON.stringify({md:mdPath,md_sha256:hash(mdBytes),json:jsonPath,json_sha256:hash(jsonBytes),source_files:source.files.length,source_set_sha256:verification.expected_set_sha256,primary_reviewed_files:primary.length,simulated_cases:modelChecks,storage_primitive_sequences:1,open_p0_p1:0,production_status:'BLOCKED'},null,2));
