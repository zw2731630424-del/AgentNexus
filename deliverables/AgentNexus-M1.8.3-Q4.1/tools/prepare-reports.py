"""Reviewable unsigned documents. Never creates trust, signs, approves or deploys."""
import json
from pathlib import Path
import shutil
import zipfile
from baseline import ROOT, OUT, Q3, Q4, sha, write

def md(rel,text):
    p=OUT/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text.strip()+'\n',encoding='utf-8')
def read(rel):return json.loads((OUT/rel).read_bytes())
plan=read('approval/qualification-plan.json'); manifest=read('approval/installation-manifest.json')
tests=read('evidence/signing-tests.json'); regression=read('evidence/regression.json'); host=read('evidence/host-preflight.json')
baseline=read('evidence/baseline.json'); native=read('evidence/build.json')
rows=[{'path':p.relative_to(OUT/'source').as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted((OUT/'source').rglob('*')) if p.is_file() and '__pycache__' not in p.parts]
write(OUT/'source-manifest.json',{'schema':'agentnexus.q41.source-manifest.v1','files':rows})
old={r['path']:r['sha256'] for r in json.loads((Q3/'source-manifest.json').read_bytes())['files']}
write(OUT/'source-changes.json',{'baseline_source_manifest_sha256':sha(Q3/'source-manifest.json'),'files':[dict(r,change='ADDED' if r['path'] not in old else 'MODIFIED') for r in rows if old.get(r['path'])!=r['sha256']]})
with zipfile.ZipFile(OUT/'AgentNexus-M1.8.3-Q4.1-source.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for r in rows:z.write(OUT/'source'/r['path'],r['path'])
run=Path(native['run']); dest=OUT/'evidence/build'/run.name; dest.mkdir(parents=True,exist_ok=True)
for p in run.iterdir():
    if p.is_file():shutil.copyfile(p,dest/p.name)
write(dest/'log-manifest.json',{'files':[{'path':p.name,'sha256':sha(p)} for p in sorted(dest.iterdir()) if p.is_file() and p.name!='log-manifest.json']})
local={k:plan[k] for k in ['signing_mode','scope','status','policy_epoch','machine_id','operator_sid','service_sid','target_host','installation_manifest_sha256','service_config_sha256','signature_policy_sha256','system_changes_sha256','installer_sha256','verifier_sha256','signer_tool_sha256','payload_files','payload_bytes','issued_at_utc','expires_at_utc','deployment_id','real_import','live_provider','production_release','real_ledger_migration']}
local.update(schema='agentnexus.q41.local-contract.v1',certificate_eku='1.3.6.1.5.5.7.3.36',trust='INDEPENDENT_USER_DER_SHA256_PIN',cms='TWO_SEPARATE_DETACHED_CMS_SHA256',actual_certificate_pin=None,actual_deployment_approved=False,start_service=False)
write(OUT/'contracts/local-qualification.json',local)
write(OUT/'contracts/production-release.json',{'schema':'agentnexus.q41.production-contract.v1','signing_mode':'PRODUCTION_RELEASE','status':'BLOCKED','legacy_qualification_schema':'agentnexus.windows-qualification.v1','legacy_approval_schema':'agentnexus.q3.deployment-approval.v1','baseline_installer_sha256':sha(Q3/'source/tools/agentnexus/install-q3-qualification.ps1'),'qualified_requires':'Original 19 PASS evidence hashes, host/service/epoch/expiry, REAL ledger and separate real-import/live/exact-consent approvals','issuer':'Independent production authority with exact DER SHA256 pin','local_eku_rejected':'1.3.6.1.5.5.7.3.36','required_eku':'1.3.6.1.5.5.7.3.3','chain':'Windows X509Chain NoFlag plus offline revocation evidence; unknown proof rejects','authenticode':'Separate code-signing policy, final-byte freeze and full production verification','production_certificate_or_candidate_issued_here':False})
write(OUT/'approval/deployment-request.json',dict(local,schema='agentnexus.q41.precise-deployment-request.v1',document_role='UNSIGNED_EXACT_CANDIDATE_SCOPE_REVIEW_NOT_EXECUTABLE_APPROVAL',decision='NO-GO',deployment_approved=False,actual_certificate_der_sha256=None,qualification_signature='ABSENT',deployment_signature='ABSENT',system_changes=read('approval/system-changes.json')['changes'],service_name='AgentNexusCredential',service_account='NT SERVICE\\AgentNexusCredential',program_root=r'C:\Program Files\AgentNexus',data_root=r'C:\ProgramData\AgentNexusCredential',initial_service_state='STOPPED',existing_token_authorization=100000000,real_tokens=0,real_cost_usd=0,commit_or_push=False))
md('README.md',f'''# AgentNexus M1.8.3-Q4.1

**签发机制和离线准备已完成；当前 UNSIGNED / NO-GO。实际用户签发、部署和 Windows OS 资格未执行。**

- [总体设计](reports/design.md) · [阶段验收](acceptance-report.md) · [机读裁定](acceptance.json)
- [LOCAL 合同](contracts/local-qualification.md) · [PRODUCTION 合同](contracts/production-release.md)
- [证书方案](reports/certificate-design.md) · [私钥边界](reports/private-key-protection.md)
- [独立 Signer 操作范围](signer/README.md) · [Signer 源码](source/native/qualification-signer/QualificationSigner.cs) · [UI预览](evidence/signer-preview.png)
- [共享CMS/Pin实现](source/native/qualification-signer/SigningContracts.cs) · [安装器](source/tools/agentnexus/install-q41-qualification.ps1)
- [签名测试](evidence/signing-tests.json) · [回归](evidence/regression.json) · [独立审查](reports/independent-security-review.md)
- [精确部署申请](approval/deployment-request.md) · [194项安装清单](approval/installation-manifest.json) · [清单状态](approval/installation-manifest-status.json) · [回滚](approval/rollback-plan.json)
- [完整源码ZIP](AgentNexus-M1.8.3-Q4.1-source.zip) · [源码清单](source-manifest.json) · [改动](source-changes.json) · [SHA256SUMS](SHA256SUMS)

新候选194文件 / {plan['payload_bytes']:,}字节；Signer/Verifier在安装载荷之外，由签署计划另外绑定。未来初次安装保持stopped；服务启动和OS试验另批。实际证书Pin为null，没有签名或真实部署批准。

签名安全测试{tests['passed']}/{tests['tests']} PASS（SIMULATED）；回归{regression['counts']['pass']} PASS /{regression['counts']['fail']} FAIL /{regression['counts']['skipped']} SKIP。原70项OS测试与19类生产证据仍NOT_RUN。实际CNG/TPM强交互与同SID隔离未证明。真实Key/Provider/费用均0，原1亿Token授权不重置，无commit/push。
''')
md('contracts/local-qualification.md','''# LOCAL_QUALIFICATION 合同

[机读精确值](local-qualification.json)。固定 WINDOWS_BOUNDARY_ONLY / QUALIFICATION_ONLY，decision只能NOT_RUN/BLOCKED；epoch=4，单机/实际Operator SID/固定Service SID/随机部署ID/精确UTC round-trip期限最多7天。status=QUALIFIED、PASS资格或扩大范围一律拒绝。

用户通过独立渠道核对的公开证书DER SHA256（64小写hex）是信任锚；不是Windows SHA1 Thumbprint、本机生成、Subject文字或仓库certificate-pin.json。非CA，RSA>=3072，DigitalSignature，唯一RFC9336 documentSigning EKU，证书有效时间覆盖整份计划。数学CMS验证之外逐项检查Pin、用途、身份、算法与时间。

资格计划与部署批准是两份不同schema/确认类型/引用的detached CMS SHA256，单一签名者、无附带内容/计数签名；部署还绑定计划和计划CMS的原始字节Hash。缺任一签名或最后提交标记拒绝。签计划不批准部署；部署不批准真实Key；真实Key不批准Provider。

精确绑定主机MachineGuid小写UTF8 SHA256、主机名、Operator/Service SID、epoch、期限、安装清单/config/策略/系统变更/安装器/Verifier/Signer的Hash以及文件数/总字节。安装前重新读取实际机器与当前SID。离线工具无法实时观察另一目标机，用户必须独立核对目标身份。

real_import/live_provider/production_release/real_ledger_migration及旧real_import_enabled/live_enabled均为严格bool false；真实批准ref为空。19类精确名称/大小写复用运行期同一校验，只能NOT_RUN/BLOCKED。普通配置不可将本地证书升级到生产。

完整payload与app-manifest闭包逐项Hash，拒绝额外文件、重解析点、重复路径和Windows别名；持有只读流，从held stream导出/安装，复制后及运行期继续核验。运行期另验本地模式/两份CMS/完整清单/策略/权限/证书时间窗/受保护receipt。

安装器默认只读。实际Apply只允许用户自有Windows PowerShell5管理员会话，独立Pin、两份CMS、具体变更再次显示/短语确认；等待后复验时间和CMS，不自动提升。受保护DataRoot创建时附带DACL，先消费receipt再注册服务。已有目标/服务/receipt拒绝，失败保留。当前只安装stopped，start_service=true拒绝。

epoch4+receipt不是TPM单调计数器。管理员删除受保护状态、回退磁盘/时钟或替换验证器不在防重放承诺内；本包不支持无状态反复安装或自动恢复。更新/恢复另行设计与批准。
''')
md('contracts/production-release.md','''# PRODUCTION_RELEASE 合同

[机读合同](production-release.json)。Q3正式签发者/Pin、分离资格/部署CMS、主机/SID/epoch/期限、19类PASS证据Hash、REAL Ledger与真实导入/live/exact-consent各自批准全部保留。

Common原QUALIFIED和生产证据/真实权限门禁保留，额外检查证书用途和系统链。即使legacy配置删除signing_mode，本地documentSigning EKU仍拒绝；本地模式永远只能QUALIFICATION_ONLY。正式证书需codeSigning EKU、Windows信任链与离线吊销证据；未知继续拒绝，不为本地资格降级生产要求。

CMS Qualification Plan、CMS Deployment Approval、Authenticode Executable、Certificate DER SHA256 Pin四者分开。CMS审批不赋予PE/脚本Authenticode信任。正式发布仍需正式代码签名政策、最终字节重冻结与完整生产验证；本轮生产证书/资格/候选均BLOCKED。

Q3安装器仅保留作历史合同源码；Q4.1本地入口不接受生产模式。未来生产候选须单独完整复核，不得将本包LOCAL签名改名交给生产。
''')
md('reports/certificate-design.md','''# 本地证书与独立签发

无需购买商业证书即可准备本地CMS审批。用户先选择代理不可访问的独立离线Windows设备/会话，再自行决定是否运行[创建脚本](../source/native/qualification-signer/user-create-certificate.ps1)。SOFTWARE_CNG或TPM_CNG必须手工选择；脚本再次展示范围并要求精确短语后，才创建CurrentUser My非CA/RSA3072/SHA256/DigitalSignature/单用途documentSigning证书，期限90天。请求NonExportable+ProtectHigh，不支持则失败，无静默降级。只导出公开DER，不导入Root/TrustedPublisher，不自动信任或选Pin。

Windows Certificate Store保存公开证书及关联，CNG KSP管理私钥。Microsoft Platform Crypto Provider使用TPM；软件/硬件KSP边界不同。NonExportable、保护请求、硬件存在、实际提示和可信用户在场必须分别测量。[微软New-SelfSignedCertificate](https://learn.microsoft.com/en-us/powershell/module/pki/new-selfsignedcertificate?view=windowsserver2025-ps)、[CNG UI policy](https://learn.microsoft.com/en-us/windows/win32/api/ncrypt/ns-ncrypt-ncrypt_ui_policy)。

唯一EKU为标准[RFC9336 documentSigning](https://www.rfc-editor.org/rfc/rfc9336.html) `1.3.6.1.5.5.7.3.36`，用于供用户审阅的批准内容，不能作代码签名。还必须有独立核对的准确Pin/身份/LOCAL schema，不接受任意文档证书。初次模拟中的UUID大数字OID被Framework4解码为空，正例失败；公开DER探针确认后改用标准用途。旧失败证据保留，未把它伪装为成功。

Signer仅从用户CurrentUser My精确Pin选择一张证书，检查非导出用户CNG策略，用provider句柄计算CMS；没有PFX/私钥文件/密码/环境变量密钥/CLI自动确认接口。输入内容完整展示，两项独立环境/目标身份复选框、摘要短语与最终MessageBox确认缺一不可。资格与部署分别操作。

`ComputeSignature(signer,false)`允许provider交互；Framework不使用silent参数来保证提示，实际提示依provider而定。普通窗口/false参数不是可信用户在场证明。[微软ComputeSignature](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.pkcs.signedcms.computesignature?view=netframework-4.8.1)。`CheckSignature(true)`只做数学签名，本地另验Pin/用途/身份/期限，生产另验链。[微软CheckSignature](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.pkcs.signedcms.checksignature?view=netframework-4.8.1)。

本轮未运行创建脚本、未生成用户资格证书、未选择已有证书、未改证书库或使用用户私钥。当前受限上下文TPM只读查询INCONCLUSIVE；实际TPM key/强交互/硬件证明NOT_RUN。模拟测试仅RSA.Create+CertificateRequest内存证书，不入库、不导出私钥，不作为真实信任锚。
''')
md('reports/private-key-protection.md','''# 私钥保护与剩余风险

首选边界：私钥只在用户独立离线签名设备或代理不可访问的会话中；开发代理只得到公开DER、签署文件和CMS。工具没有导出RSA私有参数/PFX/环境变量私钥/日志私钥接口；私钥不进入Git、普通配置/Vault、聊天、部署载荷或ZIP。

NonExportable防导出，不等于同SID恶意进程无法请求签名；TPM也不自动提供应用级签名授权。普通UI可被同桌面进程注入输入或替换，不能称Secure Desktop/HSM可信显示。provider/PIN/保护策略须实际验证。本轮Low/AppContainer代理Token也不能证明将来的Medium同SID签名进程安全。

因此不宣称本机高保证可信确认或“Codex无法访问同SID任何密钥”已获OS证明。用户应在独立环境自行生成/使用私钥，Codex不进入该会话、不取得其密钥句柄。若做不到独立环境，应保持签发BLOCKED；复选框与精确短语是操作纪律，不能抵抗已控制签名桌面的攻击者。

离线Signer核验文件与目标绑定，不实时观察另一目标机；主机身份、SID、Pin必须通过独立可信渠道核对。安装器再读取实际MachineGuid哈希/当前SID并计算固定Service SID。任何目标/epoch/期限/内容变更都需新候选与两次签名。

管理员/SYSTEM、签名设备失陷、时钟/磁盘回退、替换校验器或删除受保护receipt超出当前承诺；没有TPM单调防回滚或完整硬件用户在场资格。实际边界仍NOT_RUN/INCONCLUSIVE，模拟证书结果不能替代。
''')
md('signer/README.md','''# AgentNexus Qualification Signer — 用户操作范围

**请先审阅说明、合同、源码、UI与私钥边界，再自行确认签发方式。本轮没有请求你立即创建证书或部署。** [UI预览](../evidence/signer-preview.png)为未签候选，签名按钮关闭。

独立WinForms工具使用Framework4.8，不联网、不调用SCM/ACL/UAC/服务/Provider。输入为冻结目录、用户独立核对的DER SHA256 Pin和新的绝对输出目录；不接收PFX/私钥/密码或自动批准参数。

1. 用户选择独立离线Windows签名设备/会话，保持代理不能访问其私钥和桌面。软件CNG/TPM CNG创建脚本须另外明确确认；会修改该签名设备CurrentUser My，没有信任导入。
2. 只用公开DER与独立确认Pin制作**新候选**：在工作区本bundle根调用 `python -B tools/freeze.py --public-certificate <public.cer> --independent-pin <64hex> --new-output <new-absolute-directory>`。准备步骤仅公钥，不签名、不信任，输出仍unsigned。
3. 把完整新候选和工具转交独立环境，独立核对来源/SHA256/目标Host/Machine ID/Operator SID/Service SID/Epoch/期限/具体变更。工具显示不能替代独立身份/Pin确认。
4. 阶段1选择“仅签署资格计划”，完整加载/锁定文件，审阅将签的最终JSON与权限。指定新目录，勾选独立环境/身份确认，键入含该内容Hash后12位的短语，再单独最终确认。输出新bundle的qualification-plan.json/p7s/signing-result.json。**不批准部署。**
5. 阶段2以signed-plan bundle重新输入，选择“单独签署部署批准”，再用新目录。复验全部Hash/计划CMS后展示部署批准最终字节、单独引用、计划及CMS摘要，再次独立确认才签。start_service始终false。
6. 完整输出用Verifier `--verify <bundle> <independent-pin>`只读校验；SIGNED_LOCAL_VERIFIED_ONLY不会安装、信任PE、导入Key或调用Provider。
7. 最终有效Pin/两份签名/最终文件和复核结果具备后，重新提交实际精确部署申请。用户在自有管理员会话再次批准系统变更才可安装。当前不提供可执行Apply命令。

仅从held streams复制到新目录/CreateNew；原候选不覆盖。完成标记最后写，缺任一签名/标记/字段/Hash拒绝。异常半成品保留供审查，不自动复用/删除/重试。签名不改变PE字节；另做Authenticode须重冻结全部相关依赖/清单/计划/批准。

构建用本bundle `tools/build.py`。历史verify-q3/package-q3留作来源，非Q4.1工作流入口。实际用户CNG密钥/提示/手工签名本轮NOT_RUN。
''')
table='\n'.join('| '+label+' | `'+str(value)+'` |' for label,value in [
    ('Host',plan['target_host']),('Machine ID SHA256',plan['machine_id']),('Operator SID',plan['operator_sid']),('Service SID（仅预计算）',plan['service_sid']),
    ('Mode','LOCAL_QUALIFICATION / QUALIFICATION_ONLY'),('Epoch / deployment ID','4 / '+plan['deployment_id']),('UTC 时间窗',plan['issued_at_utc']+' -> '+plan['expires_at_utc']),
    ('文件数 / 总字节',str(plan['payload_files'])+' / '+str(plan['payload_bytes'])),('安装清单 SHA256',plan['installation_manifest_sha256']),
    ('资格草案 SHA256',sha(OUT/'approval/qualification-plan.json')),('部署批准草案 SHA256',sha(OUT/'approval/deployment-approval.json')),('安装器 SHA256',plan['installer_sha256']),
    ('Verifier SHA256',plan['verifier_sha256']),('Signer SHA256',plan['signer_tool_sha256']),('实际证书DER Pin','null / BLOCKED'),('deployment_approved / start_service','false / false'),('真实/生产四项权限','全部 false')])
md('approval/deployment-request.md',f'''# Q4.1 精确部署申请 — 尚不可执行

**当前请求先审阅范围、由用户自行确认本地签发方式。实际部署NO-GO。** 两份CMS、用户批准的公开证书/Pin不存在；此申请不构成证书创建/信任/签名/安装授权。

| 项目 | 精确候选值 |
|---|---|
{table}

唯一 `AgentNexusCredential` own-process / demand服务，`NT SERVICE\\AgentNexusCredential`虚拟身份，Session0，固定EXE无参数；程序根 `C:\\Program Files\\AgentNexus`、数据根 `C:\\ProgramData\\AgentNexusCredential`。ACL、固定High/Medium pipe、Helper/Launcher/Runtime和合成范围逐项见[系统变更](system-changes.json)，逐文件目标见[安装清单](installation-manifest.json)。DataRoot内部admin-write消费receipt先于SCM创建；不创建第三个ProgramData根，已有根/服务/receipt不接管、不覆盖。

**本候选只安装后保持停止。** 不批准启动服务、UAC Helper、pipe运行或70项OS攻击执行。未来启动另批，并要求有限等待SCM/engine/Daily就绪及失败停止/子进程退出证据。本包拒绝start_service=true，不能把安装完成写成已就绪。

不导入真实Key，不连接DeepSeek/OpenAI/GLM，不迁移/重置REAL Ledger，不改防火墙/驱动/Ubuntu/AppContainer，不开放shell，不commit/push。原100,000,000 Token授权保持；真实请求/费用均0。

用户独立选择证书与Pin后须制作**新候选**，日期/部署ID/config/launcher plan/清单/计划与最终两份CMS均重新冻结。本表是当前unsigned候选的精确值，不是将来signed bundle最终批准Hash。有效签署材料与复核完成后再次提交实际部署精确申请。**目前不提供可直接执行的Apply命令。**
''')
md('reports/deployment-runbook.md','''# 部署前顺序

冻结候选 → 生成计划与具体申请 → 用户独立环境签资格计划 → 用户另签部署批准 → 只读验两份CMS/所有Hash → 独立复核最终signed bundle → 用户另行批准实际stopped安装。

当前停在unsigned准备。开发或Token授权不构成签发/部署批准；代理不替用户签名、不导入信任、不运行Apply。[精确范围](../approval/deployment-request.md)。

未来Apply只允许用户自有Windows PowerShell5管理员会话：独立Pin与两份CMS/held bytes/实际主机SID/Epoch/期限/受保护父目录核验，完整显示范围、精确短语再确认，等待后复验时间/CMS。创建时附DACL的新DataRoot先消费receipt，再注册stopped服务/固定身份/SCM DACL，创建受保护程序根，逐文件复制和有限ACL配置，复制签署元数据、核验最终文件集合及Hash。失败保留，不启动、不自动删除。

服务启动/真实UAC/OS试验另批，必须有限等待SCM Running、engine readiness、实际Medium snapshot，失败仅在新批准内stop唯一服务并核验固定子进程和pipe退出；保留全部数据。sc请求退出0不是功能就绪证明。
''')
md('reports/testing.md',f'''# 测试与实际保证边界

签名/合同：**{tests['passed']} PASS /{tests['failed']} FAIL，全部SIMULATED**。[逐项结果](../evidence/signing-tests.json)含运行路径/原始Hash。覆盖原24类及attached CMS、多签名/弱摘要、用途分离、strict JSON/UTC/类型/总数、权限扩大、receipt谓词、完成标记、held stream实际写拒绝、两阶段导出后再校验，以及直接调用Common运行期签名验证的证书时间窗正反例。

临时证书通过RSA.Create/CertificateRequest在内存生成，不入Windows Store、不导出私钥；非用户信任锚。最新测试run目录的原始fixture和exported内容另归档为SIMULATED-fixtures-and-exports.zip，供脱离工作区复核。旧失败迭代完整保留。

异常退出用**诊断harness**写partial JSON后Exit(73)，验证缺payload/签名及提交标记的半成品拒绝；不是实际用户Signer强杀、CNG provider崩溃或服务恢复资格。人工双确认/CNG使用/非导出实际策略/prompt/TPM-backed key/可信用户在场均NOT_RUN。

原C#纯断言Service/Client各90、Helper138、Launcher36；共享断言不重复计作OS测试。[最终构建](../evidence/build.json)。新sandbox回归 **{regression['counts']['pass']} PASS /{regression['counts']['fail']} FAIL /{regression['counts']['skipped']} SKIP**，strict TypeScript通过，执行副本源码前后一致。[完整TAP](../evidence/regression.json)。5SKIP为宿主拒绝hardlink与junction/symlink夹具2项、未启用合成HelperUI3项；没有为消除SKIP改ACL或提升。

Signer未签UI预览已显示并视觉核验，按钮关闭、未选证书/打开密钥。安装器默认只读/严格验证拒绝与AST检查，Apply/SCM/ACL/UAC实际变更NOT_RUN。70项原Windows攻击与19类生产证据保留原字节，0 PASS /70 NOT_RUN、0 PASS /19 NOT_RUN。生产、真实Key与Provider仍BLOCKED；TPM只读查询INCONCLUSIVE。
''')
md('reports/rollback-record.md','''# 回滚记录

本轮无系统变更、无回滚动作。[机读计划](../approval/rollback-plan.json)。未来stopped安装失败保留已消费receipt、部分安装、Vault/Ledger及一致WAL/SHM、审计/签署材料；重新观察后另批恢复。不自动重试Apply、删除DataRoot/receipt、清空REAL账本、释放UNKNOWN或重发SENT/UNKNOWN，不退回同SID解密。

服务stop/卸载、删除/账户或ACL清理不在当前请求内。本包不启动服务；未来若批准启动，另批唯一服务stop、有限等待与固定Runtime/engine/Helper退出、pipe关闭证明，不用sc请求退出码冒充退出。
''')
md('deployment-report.md',f'''# 当前部署报告

**UNSIGNED / NO-GO，未部署。** 基线HEAD `{baseline['head']}`，初始已跟踪工作树清洁。Q3/Q4清单/源码/ZIP/UNSIGNED原记录和规则保留。[基线证据](evidence/baseline.json)。Q4原请求所列reports/deployment-approval.md、deployment-runbook.md不存在，已读取实际approval/deployment-request及Q3部署合同，路径差异已登记。

实际宿主 `{host['host']}`，Windows {host['os']['display_version']} / {host['os']['build']}.{host['os']['ubr']}。本轮观察是同一Operator SID的Low4096/AppContainer/非提升/Session1，不能称为Q4历史Medium采集。当前可见公开证书元数据{host['public_certificates_count']}张是受限视图，不能推断与历史7张之差为证书被修改。SC退出1060、Service SID inactive，两个目标根不存在、未连接pipe，TPM INCONCLUSIVE。[只读原始证据](evidence/host-preflight.json)。

194项新载荷合计{plan['payload_bytes']:,}字节；四个native二进制包含共享校验，其余应用/依赖保持Q3字节；launcher plan刷新绑定epoch4。独立Signer/Verifier不进入194项安装载荷，由计划另外Hash绑定。没有实际证书Pin/CMS/完成标记/部署批准。[精确申请](approval/deployment-request.md)。

无Service/账户/ACL/证书库/防火墙/驱动/Ubuntu/AppContainer配置变更，无UAC，无真实Key/Provider/Token/费用，无commit/push。
''')
criteria=[
 {'id':1,'requirement':'本地资格与生产发布分离','status':'PASS','assurance':'CODE_AND_SIMULATED'},
 {'id':2,'requirement':'无需商业证书即可准备本地签名','status':'PASS','assurance':'PREPARATION_PATH_ONLY'},
 {'id':3,'requirement':'用户控制实际签名私钥','status':'NOT_RUN','reason':'用户须先选择独立签名环境并自行创建证书'},
 {'id':4,'requirement':'Codex无法读取用户私钥的实际OS隔离证明','status':'INCONCLUSIVE','reason':'未访问用户密钥；同SID任意恶意进程的密钥使用隔离/可信在场未建立'},
 {'id':5,'requirement':'独立用户确认与实际部署再次批准','status':'PASS','assurance':'IMPLEMENTED_NOT_ACTUAL_SIGNING_OR_APPLY'},
 {'id':6,'requirement':'Host/Operator/Service/Epoch/清单绑定','status':'PASS','assurance':'SIMULATED'},
 {'id':7,'requirement':'本地签名不得用于生产','status':'PASS','assurance':'SIMULATED'},
 {'id':8,'requirement':'真实系统变更独立批准','status':'PASS','assurance':'PREPARED_NO_SYSTEM_CHANGES'},
 {'id':9,'requirement':'安装器默认拒绝未批准部署','status':'PASS','assurance':'READ_ONLY_AND_SIMULATED_VERIFIER'},
 {'id':10,'requirement':'Q4门禁/历史保留','status':'PASS','assurance':'OS_70_AND_EVIDENCE_19_NOT_RUN'},
 {'id':11,'requirement':'真实API Key导入','status':'BLOCKED'},
 {'id':12,'requirement':'真实DeepSeek请求','status':'BLOCKED'}]
write(OUT/'acceptance.json',{'schema':'agentnexus.q41.acceptance.v1','implementation':'PASS','signing_tests':{'status':tests['status'],'assurance':'SIMULATED','tests':tests['tests'],'passed':tests['passed'],'failed':tests['failed']},'regression':regression['counts'],'status':'UNSIGNED','deployment_decision':'NO-GO','actual_user_signing':'NOT_RUN','trusted_same_sid_key_isolation':'INCONCLUSIVE','os_qualification':'BLOCKED','windows_os_tests':{'PASS':0,'NOT_RUN':70},'qualification_categories':{'PASS':0,'NOT_RUN':19},'actual_certificate_pin':None,'criteria':criteria,'real_api_keys':0,'real_provider_requests':0,'real_cost_usd':0,'system_changes':False,'commit_or_push':False})
md('acceptance-report.md',f'''# Q4.1 部署前阶段验收

**代码、独立Signer UI、共享CMS/DER Pin、合同、安装器/运行期集成与离线测试已完成；实际签发/部署/生产资格保持UNSIGNED / NO-GO。**

LOCAL_QUALIFICATION只能进入QUALIFICATION_ONLY；原PRODUCTION_RELEASE/QUALIFIED门禁保留，拒绝本地证书。计划和部署两次独立完整审阅/短语/最终确认与分离CMS；实际安装还有单独用户确认。四项真实/生产权限固定false，新安装stopped，无自动UAC/服务启动。

{tests['passed']}/{tests['tests']}签名安全测试PASS（SIMULATED），受影响回归{regression['counts']['pass']} PASS /0 FAIL /{regression['counts']['skipped']} SKIP，strict TypeScript及六项警告即错误构建通过。Signer未签预览视觉检查完成。[详细边界](reports/testing.md)、[独立审查](reports/independent-security-review.md)。

实际用户CNG/TPM签发、强交互保护和同SID私钥使用隔离NOT_RUN/INCONCLUSIVE。没有用户私钥供Codex读取/签署，也没有用复选框证明同SID任意进程不能调用密钥。用户须选择代理不可访问的独立签名环境；内存模拟证书不是实际信任锚。[逐项验收](acceptance.json)。

原70项OS攻击、19类生产证据均NOT_RUN；服务不存在，ACL/账户/证书库/UAC未改变。当前194项清单与SHA供审阅，实际Pin=null、签名缺失、deployment_approved=false。先审阅[工具范围](signer/README.md)并由用户自行确认签发方式，真实部署另需最终signed bundle和精确批准。[精确申请](approval/deployment-request.md)。真实Key/Provider/费用0，无commit/push。
''')
md('reports/governance.md','''# 治理与历史保护

未改AGENTS.md、治理policy/baseline、规则索引或原治理器。新文件分类为deliverables下交付、规范task/runtime。优先调用原govern.py new时，全仓前置扫描持续运行，已中断且未进入new/refresh；未为此降低规则或搬动历史数据。

最后检查调用此前Q3/Q4已审阅的只读metadata缓存包装器，执行未修改治理器的完整check/main，分类/策略/Hash/path guard不删减；结束重新读取对象类型/设备/文件身份/Windows属性。实际状态和原始日志Hash见[治理结果](../evidence/governance-result.json)，以该结果为准，不提前计PASS。

该加速仅适用于冻结拓扑；不对瞬时并发替换或所有resolve重新解析提供通用等价证明，不是OS隔离资格。完成后另验证Q3/Q4历史、规则Hash、264项源码/ZIP、新payload与完整SHA256SUMS。真实系统变更/Key/Provider/commit/push均0。
''')
print(json.dumps({'reports_prepared':True,'source_files':len(rows),'source_zip_sha256':sha(OUT/'AgentNexus-M1.8.3-Q4.1-source.zip'),'deployment':'NO-GO'}))
md('reports/signatures-and-certificates.md','''# 四种签名与当前状态

资格计划CMS、部署批准CMS、PE/脚本Authenticode、证书DER SHA256 Pin相互独立。当前真实用户证书/Pin=null，两份用户CMS与提交标记均不存在，UNSIGNED / NO-GO。模拟测试DER/CMS不得用作真实本地信任锚。

本地策略明确authenticode_required=false，依靠用户独立批准的CMS精确绑定最终载荷Hash；不将PE宣称为Authenticode可信，也不授予生产发布。正式生产仍要求其正式代码签名政策/链/吊销证据和最终字节重新冻结。本轮12个payload PE的只读查询为10 NotSigned、2 Valid（Node和d3dcompiler依赖）；依赖已有签名不替代项目两份审批CMS。具体原始文件Hash和状态见[只读检查](../evidence/readonly-checks.json)。

公开DER输入必须是原始DER，拒绝PFX/PEM/额外编码；报告值为证书RawData SHA256。Windows SHA1 Thumbprint不是该Pin。创建/信任/用户私钥使用均未执行。
''')
requested=['01-correct-simulated-local-certificate','02-wrong-certificate','03-wrong-der-pin','04-certificate-replaced','05-expired-certificate','06-signature-tamper','07-manifest-changed','08-plan-changed','09-operator-sid','10-host-machine','11-service-sid','12-old-epoch','13-validity-mismatch','14-scope-expanded','15-real-import','16-live-provider','17-production-release','18-real-ledger','19-old-signature-replay','20-payload-changed','21-dependency-replaced','22-unsigned-deploy','23-missing-confirmation','24-signer-abnormal-process-exit']
by_id={r['id']:r for r in tests['cases']}
write(OUT/'tests/signing-security-matrix.json',{'schema':'agentnexus.q41.requested-24.v1','assurance':'SIMULATED','actual_user_certificate_signing':'NOT_RUN','cases':[{'requested_number':i+1,'test_id':name,'result':by_id[name]['status'],'assurance':'SIMULATED','actual_user_cng_ui_or_service_qualification':'NOT_RUN'} for i,name in enumerate(requested)]})
