"""Build review materials only. Never installs, imports credentials, or sends HTTP."""
from pathlib import Path
import hashlib, json, shutil, re

D = Path(__file__).resolve().parents[1]
R = D.parents[1]
RT = R / '.workflow-kit/runtime/AgentNexus-M1.8.3'
def write(path, text):
    dest = D / path; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_text(text.strip() + '\n', encoding='utf-8')
def js(path, value): write(path, json.dumps(value, ensure_ascii=False, indent=2))
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

write('architecture.md', '''
# M1.8.3 总体架构

本轮交付为可编译的独立服务实现和离线联调。生产 Vault / LIVE **BLOCKED**：尚未批准部署，尚无独立服务身份的真实拒绝证据。

```mermaid
flowchart TB
  UI[原有 Electron 密码输入界面] --> PL[原有受限 Preload]
  PL --> MAIN[Desktop Main / 原生 Harness]
  MAIN --> CL[固定 pipe-client.exe]
  CL --> NS[独立 Windows Service / Virtual Service Account]
  NS --> ENGINE[同服务 SID 的固定 Node Engine]
  ENGINE --> VAULT[独占 Vault / CurrentUser DPAPI]
  ENGINE --> OWNER[唯一 Token Ledger / 原子四级预算]
  ENGINE --> EGRESS[精确请求审阅 / 最终 Data Egress Fence]
  EGRESS --> HTTPS[固定 DeepSeek HTTPS Endpoint]
```

Gateway 继续负责原有 Agent 授权、Context 重建、Router、Adapter 和 Harness 审计；新增 broker 分支委托凭证使用及预算核销，返回脱敏 ProviderResponse。没有重新实现 Model Gateway、Provider Adapter 或桌面页面。旧本地合成分支只在显式提供合成 protector/transport 时用于历史回归；普通 main 不会回退该分支。

Windows 服务为 `NT SERVICE\\AgentNexusCredential`，无需为每类 Agent 建账户。代码、配置、资格与状态均固定到受保护目录。调用者检查真实 token、完整性、SID、进程句柄/创建时间与被保护镜像；不采信 JSON 的 peer/role/PID 声明。高完整性检查只是防御措施，不能独自替代服务 SID、DACL 或实际内存访问拒绝测试。

启动分两阶段：经独立批准并签名的 QUALIFICATION_ONLY 计划可在独立身份下测试**合成**凭证和 Fixture，无 HTTPS、qualified=false；生产 QUALIFIED 还须 11 项真实 Windows 证据全 PASS 与外部 CMS 签名。当前两阶段均未部署或激活。

入口：[服务设计](reports/credential-service-design.md)、[Windows 原生实现](reports/windows-service-design.md)、[IPC](reports/ipc-protocol.md)、[UI](reports/ui-integration.md)、[预算](reports/token-ledger-owner.md)、[资格](vault-qualification.json)、[部署审批](reports/deployment-approval.md)。
''')
write('reports/same-sid-root-cause.md', '''
# 同 SID 解密根因

M1.8.2 原始证据 `../AgentNexus-M1.8.2/evidence/probes/vault-final.json` 记录：父 PID 22864、子 PID 9884，用户 SID 均为 `S-1-5-21-2532670394-1554971530-4095700938-1001`；子进程读取合成 Vault=true、DPAPI 解密=true，预期与观察 SHA256 均为 `d3143427f738dfc54fd42f9d1be6b97e1808e63e9b047feb49f60c0c47279716`。这是真实进程反例，状态保持 ISOLATION_FAIL。原始文件未覆盖，副本与起始哈希见 evidence/baseline。

原 Vault 在 Desktop Host 的同一用户身份下运行，使用公开熵 `AgentNexus/Vault/M1.8/CurrentUser` 和 DPAPI CurrentUser。其管理员 WeakSet、租约和 scoped facade 约束可信进程内调用，不能改变其他同 SID 进程的解密能力。Windows 分支的路径/nlink/realpath 检查也没有创造独立身份。Electron sender 检查约束主帧 IPC，不能证明 Windows pipe 或进程保密。

新代码把存储、解密、Key Pool、最终 HTTPS、最终 egress 和 Token Owner 放到服务身份中。REAL Vault 只允许固定原生 attester 建立的许可及固定受保护路径；普通 LIVE open 仍返回原 VAULT_LIVE_IMPORT_BLOCKED。绝无导出/解密/已存 Key 读取 RPC。新输入在输入 Renderer、Preload、Main 中短暂经过，这个事实没有被隐藏或写成“Renderer 看不到正在键入的值”。

新 same-SID Node 子进程测试只证明协议/持久化。它仍共享测试用户 SID，不能关闭旧反例。必须部署独立服务 SID 后，让同用户及不同用户的真实普通进程在获得合成密文时尝试独立解密，并核对实际 OS token、退出码及摘要，再判生产资格。

依据：[Microsoft DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata)、[Service Accounts](https://learn.microsoft.com/windows/security/identity-protection/access-control/service-accounts)。
''')
write('reports/threat-model.md', '''
# Credential Service 威胁模型

可信根为 Windows 内核、管理员批准的部署/签发者、受保护服务二进制及服务身份。管理员/内核完全攻陷不在普通用户进程模型内；没有将 UAC 或 high IL 声称为普遍安全边界。

| 主体/事件 | 读密文 | 独立解密 | 调用服务 | 完整 Key | 代表 Agent 发请求 |
|---|---|---|---|---|---|
| 独立服务身份 | 必需 | 内部必需 | 内部 | 仅受保护内存使用 | 须精确审阅/预算/Handle/epoch |
| 用户可信输入界面 | 不需要 | 不允许 | 受认证录入/管理 | 仅正在输入的新值；无读回 | 不能把保存当连接成功 |
| 普通同 SID / 不同 SID 进程 | OS 测试须拒绝；攻击仍假设可获副本 | 必须拒绝 | 普通 token 必须拒绝 | 必须拒绝 | 不得伪造可信身份 |
| Agent/Subagent/Reviewer/Worker | 无 Vault API | 无 decrypt API | 仅 Harness scoped completion | 禁止 | 限冻结 Subject、Task、Project、Context |
| Prompt 诱导 Worker | 不因文本扩权 | 同上 | 不接受自报 PUBLIC/approval | 禁止 | 最终服务重验全请求 |
| 伪造 IPC / 旧消息 | 身份声明无效 | 无接口 | native token + 保护镜像 + channel | 无返回路径 | nonce/operation/request 单次消费 |
| 普通配置/缓存读取者 | 配置不含 Key | 无主密钥 | 公开 SID/PID/hash 不能授权 | 应拒绝缓存/转储读取 | 不授予出站能力 |
| Host/服务崩溃重启 | 密文保留 | 服务身份重开 | 旧在途转 UNKNOWN | 不输出异常正文 | 保留预算、不自动重发 |

同 SID 威胁包括普通用户权限本地恶意程序；实际 VM_READ/WRITE、DUP_HANDLE、dump、profile/Cache/Crashpad/WER 拒绝均尚未完成，生产继续 BLOCKED。输入 Renderer 能接触新输入，JS/Chromium 的字符串内存也无法证明全部即时清零；默认隐藏、清空和无持久化不能替代这些 OS 条件。

Provider 请求权不同于完整 Key 读取权。即使可信请求入口获准，也只可发送服务持有的 exact reviewed PUBLIC/SYNTHETIC grant；无任意 URL、方法、模型或认证头代理。授权和预算持久化不依赖模型声明。
''')
write('reports/credential-service-design.md', '''
# 独立 Credential Service

实现由 `source/native/credential-service/` 和 `source/src/agentnexus/credential-service/` 组成。SCM supervisor 固定启动 Node，先验证受保护安装树/代码清单、配置、CMS 签名、主机、真实服务 token、SID/会话及资格模式。挂起子进程先加入 kill-on-close Job，再恢复；只继承明确列出的匿名 pipe，最小环境不含 Key、PATH 或 NODE_OPTIONS。固定 attester 重验 Node→SCM 父链和有效期。

QUALIFICATION_ONLY 必须由外部签发者签署已获批准的测试计划。它不声明任何 OS PASS；只能固定 qualification 数据根、synthetic-test-* 和本地 Fixture。没有命令行/环境变量开关能将其变成 REAL。QUALIFIED 才能使用固定 engine 生产根；缺唯一账本拒绝启动，缺真实导入批准拒收 Key，缺精确请求用户审阅拒绝 HTTPS。计划到期关闭 pipe/Job，Node 也按到期时间拒绝后续请求。

Vault 复用 M1.8 的加密/租约/Key Pool/Guard，加了服务许可、固定 REAL 路径和句柄筛选。CurrentUser 指服务账户，绝非交互用户。真实 profile/DPAPI master key 重启恢复必须在部署阶段实测。明文只在受保护服务执行认证时使用；无 RPC 能选择 unprotect、回调或导出。Native helper 的明文 DPAPI 输出只经服务内部匿名 pipe，仍须真实 handle/DACL 验证。

Provider Broker 只使用 `https://api.deepseek.com/chat/completions`、POST、固定 JSON/SSE、首轮 `deepseek-flash`，禁 redirects、proxy 环境、任意 headers、任意 URL 和自动重试；请求体≤256 KiB、输出≤4096 Token、并发≤4、期限≤120秒，默认30秒。Flash 事实到期后拒绝生产，须重新核官方资料。Pro 仍可管理元数据，未获本轮执行资格。

独立账本与 Vault 是两个持久存储，不宣称跨库原子性。顺序为原子四级 Token hold→租约/最终 fence→持久 send intent→Provider；窗口不确定时只保守保留，不返还预算或重发。提交成功而 UI ACK 丢失时可能出现未标注的已保存 Key，列表和审计可核对，不能以失败重试自动重新发模型请求。

安装/ACL/账户/防火墙/AppContainer/Ubuntu 全未变更。部署和实际 Windows 资格见独立审批清单与机器资格报告。
''')
write('reports/ipc-protocol.md', '''
# IPC 协议与授权

外部：固定 `\\\\.\\pipe\\AgentNexus.Credential.v1`；显式 DACL、拒远端、first-instance 防抢占；每连接读取消息后 impersonate 真正 token，核 operator SID/elevated/high/non-AppContainer，再核固定 pipe-client 进程句柄、创建时间与保护镜像。客户端独立核 SCM 服务 PID、服务 SID/session0、镜像和创建时间。SID/PID/路径不是单独授权因素。身份来自 native wrapper，不接受 payload.peer/role。

请求 `{id,method,params}`；native 内部 `{channel,peer,request}`；响应 `{id,ok,value}` 或固定错误码与有限 http_status/sent/timed_out/partial；流式事件 `{id,event:"delta",seq,text}`，客户端逐次 `stream.ack`。每帧≤1 MiB；服务最多4连接/4在途，单条增量≤32 KiB，等待 ACK≤10秒，禁止后台无界 pump。已知 Key 的最长编码变体保留在服务 lookbehind 中，跨语义 delta 扫描，且不拆 UTF-16 surrogate。断连取消上游，部分结果与 Usage 不确定保留占用。

允许管理：snapshot、credential.prepare/save/state/delete/models、budget.configure。Provider：broker.prepare、broker.execute、request.cancel、stream.ack。普通 Preload 仍只暴露原页面有限方法；Agent 只有原 Gateway scoped complete，没有通用 invoke。无 read/export/decrypt、任意文件、Node、URL 或 auth-header 方法。只有明确合成进程/签名资格测试模式可用 synthetic.* Fixture 方法；REAL 没有此审批入口。

Save Credential 的原有点击在内部先取得30秒单次导入ticket，绑定真实native channel、operation、metadata hash、secret SHA和epoch；输入界面无需新增认证步骤。提交消费ticket，异步DPAPI加密完成后在Vault写事务前再次fence；断线撤销未完成票据，重启旧票据不存在。真实IPC不能走无ticket的直接合成单测入口。管理RPC id另有持久唯一claim；所有凭证拒绝审计只保留安全字段/固定错误。已知和本次新Key的原文/编码变体均在审计intent前扫描，调用者operation原文不落审计。

最终执行绑定全部字段：request_id、operation_id、agent_id、runtime_identity、task_id、project_id、provider_id、model_id、credential_handle_id、request_body_hash、context_hash、data_egress_decision、data_classification、token_reservation_id、deadline、nonce、policy_epoch。prepare 在服务持久化整份 binding hash；reserve 同事务比对并消费 nonce，不能用 null/替换 Handle 绕过已冻结选择。请求/operation/nonce 有唯一约束；未知结果禁止重试。

REAL review 由固定 native `--attest-consents` 核 CMS 文件导入，绑定主机/服务/epoch/有效期和独立用户引用；服务重新检查完整 body/context/source/schema。客户端不能创建批准。当前没有签名计划、资格或请求 consent。
''')
write('reports/key-pool-lifecycle.md', '''
# Key Pool 与生命周期

复用 Vault 原 Key Pool 和租约。服务列表只有 Handle、Provider、模型范围、显示名、状态、创建时间、请求/Token/失败统计；无已存完整 Key。多 Key 使用同一个全局账本，不由 Key ID、轮换或 Session 建立新额度。

禁用保留 Key，可显式启用未撤销且未过期的对象。删除先禁用并保存撤销 tombstone，随后新请求立即拒绝旧 Handle；存在在途/UNKNOWN 时保留原密文/租约，不取消或自动重发既有请求。无在途时可移除密文记录。轮换创建新 Handle、旧 Key 转 ROTATING、旧 Handle 不可用于新请求；已经发送的原请求仍按原状态完成。元数据变更及意图/结果均写服务审计。

服务测试包含过期、撤销后提交已准备请求、轮换期间并发、在途撤销仍完成原请求、双 Key 共用预算及重启。桌面真实同 SID 子进程合同测试覆盖保存、启停、轮换、删除、模型范围增删；只是 SIMULATED，不替代服务 SID 的真实生命周期验收。
''')
write('reports/token-ledger-owner.md', '''
# 唯一 Token Ledger Owner

真正 REAL Owner 固定为 Credential Service，文件 `C:\\ProgramData\\AgentNexusCredential\\engine\\ledger.sqlite`，不可由 UI/Host/RPC 选择根或 campaign。沿用输入+输出共100,000,000 Token 授权；当前真实消耗/预留均0，不再申请这项额度。生产账本缺失或 owner/assurance/全局额度不符时拒绝启动，不自动创建新的真实额度。

一次性初始化/迁移必须在获准部署中核对原账本和旧0用量证据；`evidence/deployment/ledger-genesis.sql` 仅供审阅，未向生产执行，非空库不得覆盖。之后更换 Key、Session 或 Host 重启都只使用原库。QUALIFICATION_ONLY 使用固定 qualification 子目录的 SIMULATED 计数，不能计入或授权真实额度。

SQLite BEGIN IMMEDIATE 在单事务内检查 GLOBAL、PROJECT、AGENT、TASK，预留四级 hold，写请求与审计并消费 prepared nonce。GLOBAL必须恰有一行且主键为m181-deepseek，计数合法；错误ID/重复行拒启，reserve绝不补建GLOBAL。UI 的 Agent/Task Limit 通过受认证 budget.configure 交给服务；只能更新限制且不能低于已提交用量，used/held 不被重置，GLOBAL 无修改 API。Host 原有账本只用于显式旧合成回归；远端路径没有 REAL campaign、REAL ModelUsageLedger 或二次额度，Host MODEL183_REMOTE_REQUEST 只是 authoritative=false 的审计投影。

完整 Provider Usage 且不超预留才核销；缺失/部分/超额/崩溃保留整个 hold，已观察用量仍只入账一次，并阻断新外发直至显式 reconciliation。重启将 RESERVED/SENT 转 UNKNOWN，不自动返还或重发。成本按服务内核验 Flash 费率计算保守估算，不能把估算称 Actual Cost；实际发票费用保留 null。

应用 Token Ledger 不宣称 OS CPU/RAM/Disk 等硬预算。原 Resource Governance 的严格 CPU、Worker 和生产文件门禁保持原裁定，不因模型接入放宽；后续真实 Agent 工具运行仍须走 Harness/Message Bus/Scheduler/Gates。
''')
write('reports/data-egress-qualification.md', '''
# Data Egress 资格

离线逻辑范围在本轮测试；生产 **BLOCKED**。复用 M1.8.2 inspectFinalRequest，对实际 request.headers/body、固定 system 协议、完整 Context 各来源、角色/历史/工具 schema 逐项检查；任何追加 developer/system/history/files 字段、重复 JSON 键、未知模型/Endpoint、来源 hash 不匹配或已知秘密均拒绝。

只允许经独立审阅的 PUBLIC / SYNTHETIC。INTERNAL、CONFIDENTIAL、SECRET 和未知分类拒绝；Agent 自报 PUBLIC、旧 hash-only 决定或 JSON approved=true 不生成许可。实际源码、AGENTS/内部规则正文、历史档案与科研材料没有进入任何真实请求。服务在最终认证发送前再次复验 exact grant、Subject/body/context/source hash、epoch、期限、Handle 与预算。

本轮合成 review 是明确的测试 authority，只在 Fixture/签名资格测试模式存在；它没有通用 DLP 资格，也不能被算作用户真实 consent。生产 consent 只从受保护、外部签名的具体请求审阅文件导入，普通 RPC 无 approve。扫描启发式与已知秘密 Guard 都不被称为完整 DLP。

新增5份正文草案未发送/未预留/未绑定真实 Handle，详见请求审阅材料。只有生产凭证/外发资格通过并由用户确认当时确切正文和绑定后才能执行。
''')
write('reports/crash-recovery.md', '''
# 崩溃与恢复

服务 send intent 先持久化，随后才发送 Provider；无法排除请求已离机时不释放 Token、Key lease 或自动重发。缺 Usage/部分 SSE/取消/Provider 超时都保持 UNKNOWN。Host 只记录远端结果投影，重启恢复不创建真实 campaign。

本轮包括真实独立同 SID Node 服务进程被 kill 后重开：SENT 保留 hold、UNKNOWN=1、请求次数不增加。正常服务关闭重开保持原用量与 Handle；原14项桌面回归保留 Host 重启逻辑。它们是合成进程证据，不是实际 Windows Service/Job/DPAPI profile 重启资格；SCM stop、系统重启、实际 Host 崩溃和独立服务账户恢复仍 NOT_RUN/BLOCKED。

不确定 Usage 没有自动 reconciliation API。后续只能由可信 Owner 结合 Provider 对账/原 Operation/Usage/审计作显式裁定；重装、换 Key、重新打开界面和删除密文均不重置预算。
''')
write('reports/catalog-reconciliation.md', '''
# Catalog 与历史约束

本轮读取既有 Feature/Policy Catalog 和相关 ADR/历史问题账本，保留机器目录与 ID 原字节；没有把设计登记、SIMULATED、Gate BYPASSED 或 Feature ON 当 OS 资格。`model.gateway`、Context Provenance、Audit、Resource Governance 的原 Harness 门仍执行，新增服务所有权是独立强制边界，不提供关闭安全后读取 Key/任意出站的旁路。

M0—M1.8.2、原 Provider UI 和根产品均保留；M1.8.2 全回归648/32/15、Provider UI历史647/33/15及同 SID失败不改写。本轮只对受影响模型/凭证/egress/UI链回归，不把其他 CPU/Storage/OS 历史 FAIL 关闭。
''')

# Preserve raw text evidence; never include live/synthetic databases or private ciphertext here.
for old in [R/'deliverables/AgentNexus-M1.8.2/evidence/probes/vault-final.json', R/'deliverables/AgentNexus-M1.8.2/reports/independent-security-review.md']:
    target=D/'evidence/baseline'/old.name
    if not target.exists(): shutil.copy2(old,target)
native=RT/'native'
for name in ['build-report.json','entry-negative-report.json','preflight-report.json']:
    if (native/name).exists():
        target=D/'evidence/native'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(native/name,target)
for exe in ['AgentNexusCredential.exe','pipe-client.exe']:
    if (native/exe).exists():
        target=D/'bin'/exe;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(native/exe,target)
for folder in (RT/'verification').glob('*'):
    if not folder.is_dir():continue
    for file in folder.iterdir():
        if file.is_file():
            target=D/'evidence/verification'/folder.name/file.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target)
for file in (RT/'native-desktop').glob('*/result.json'):
    target=D/'evidence/native-desktop'/file.parent.name/'result.json';target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target)

index=json.loads((D/'evidence/requests/index.json').read_text(encoding='utf-8'))
request_md=['# DeepSeek 首轮具体请求审阅草案','', '**全部未发送，当前不提交执行申请。** 生产凭证隔离/egress尚未通过，未读取真实 Key、未预留预算、无签名consent。既有1亿Token授权保留；部署与具体正文审阅独立。','', '官方资料在2026-11-08 UTC核验：[Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)、[Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)、[Models](https://api-docs.deepseek.com/api/list-models/)。首轮只用 `deepseek-flash`，文档别名为 DeepSeek-V4.1-Flash-1017；POST `https://api.deepseek.com/chat/completions`。服务只启用文本/JSON/工具意图/SSE，未开放图像或 Search/Fetch。费率按Flash峰值保守估算，执行时须重新核验有效资料。','', '所有请求复用原适配器固定 system 和结构化 ModelReply；“普通文本”是 text 字段协议测试。多轮草案把三个已审阅合成历史来源交给现有Context，不宣称已验证供应商原生多轮会话。工具只解析意图，不执行。','']
for row in index['items']:
    body=json.loads((D/'evidence/requests'/row['body_file']).read_text(encoding='utf-8'))
    request_md += [f"## {row['id']} — {row['name']}", '', f"[精确完整正文](../evidence/requests/{row['body_file']}) · [完整 review](../evidence/requests/{row['id']}/review.json)", '', '```json', json.dumps(body,ensure_ascii=False,indent=2), '```','', f"Body SHA256 `{row['body_hash']}`；Context `{row['context_hash']}`；Request `{row['request_hash']}`。输入保守预留上界 {row['input_token_upper_bound']}，输出最多256 Token。",'']
request_md += ['正式执行前必须在已获资格的当时 Host/Service 上重新冻结 Runtime/Task/Project、Context Provenance、Handle、Operation、nonce/epoch/deadline和 Token Reservation，展示当时全部正文/hash，等待用户确认后签入受保护 consent。当前草案没有真实 Handle/Operation/Reservation，不能直接拿去发送。']
write('reports/deepseek-request-review.md','\n'.join(request_md))

# One-time SQL review artifact. Missing REAL state must never auto-reinitialize.
store=(D/'source/src/agentnexus/credential-service/store.ts').read_text(encoding='utf-8')
schema=re.search(r'this\.#db\.exec\(`(CREATE TABLE.*?)`\);',store,re.S).group(1)
write('evidence/deployment/ledger-genesis.sql', "-- REVIEW ONLY. Never run over an existing ledger. Requires approved one-time migration and inherited 0-use evidence.\nBEGIN IMMEDIATE;\n"+schema+"\nINSERT INTO meta(k,v) VALUES ('owner','m181-deepseek-100m');\nINSERT INTO meta(k,v) VALUES ('assurance','REAL');\nINSERT INTO budgets(scope,id,lim) VALUES ('GLOBAL','m181-deepseek',100000000);\nCOMMIT;")

verification=[]
for p in sorted((D/'evidence/verification').glob('*/result.json')):
    result=json.loads(p.read_text(encoding='utf-8'));verification.append({'path':p.relative_to(D).as_posix(),**{k:result[k] for k in ['status','source_unchanged','stages']}})
js('evidence/verification/index.json',{'attempts':verification,'original_failures_preserved':True})
print(json.dumps({'reports_prepared':True,'verification_attempts':len(verification),'real_requests':0}))
