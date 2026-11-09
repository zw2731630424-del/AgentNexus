# Q4 独立预部署安全复核

**裁定：UNSIGNED / NO-GO；签发与真实 Windows OS 资格仍 BLOCKED。** 本轮用户已明确表示没有批准的外部签发者、证书或 DER SHA256 pin，并禁止代理生成可信自签证书、索取或处理私钥。当前仅完成只读预检、文件完整性与审批/回滚材料准备，不申请或执行系统部署。

本报告由独立复核代理编写。产品源码和系统证据只读；代理仅写本报告及 `evidence/independent-review.json`，没有派发下级代理、运行部署或采集脚本、连接目标管道、触发 UAC、创建/启动/停止服务或账户、修改 ACL、访问 Provider、处理真实 Key、commit 或 push。离线编译和回归由主代理执行，本代理读取其结果、日志并核对日志 Hash，不将其表述为本代理重新执行。

## 复核范围与证据

已阅读 Q3 的部署审批与独立报告、安装器、`Common.cs`、`CredentialService.cs`、`DailyRuntime.cs`、原生 README、Helper/Launcher 和原始 candidate；阅读 Q4 的 `tools/offline-checks.py`、`tools/collect-host.ps1`、完整性/签名预检以及实际宿主原始材料。

规范宿主记录为 `.workflow-kit/runtime/AgentNexus-M1.8.3-Q4/host-20261109T120425Z-9b23e1e5/`，观察时间 **2026-11-09 12:04:27 UTC**。交付副本为 `evidence/host-medium/`，本代理已确认五个文件与原始字节及其 Hash 清单完全一致。较早的 `evidence/host-preflight.json` 是 11:54:39 的初次摘要，没有原生 Token 观察；两者不得混称。

- 实际主机为 DESKTOP-OSWALD，Windows 11 Pro 25H2，build 26200 / UBR 9711。machine_id 与 Q3 candidate 相符。
- 当前采集 shell 的原生 Token 记录为原 operator SID、session 1、Medium 8192、`elevated=false`、`appcontainer=false`，observer exit 0。它只证明该采集进程当时的 Token，不能证明 Electron、Helper、虚拟服务或 Runtime 的 Token。
- 原始服务清单含 324 项，没有 AgentNexus 服务；`sc queryex` 返回 1060，固定安装/数据目录不存在，没有观察到目标进程或目标管道名。这是当时的只读观察，不是持续监控或部署后证据。
- `sc showsid` 给出预计算 SID `S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873`、Inactive；账户 Translate 失败。预计算值与 candidate 相符，但未验证账户激活、SCM 登录、真实 Token 或权限。
- 实际父目录 Owner/DACL 已取得；`C:\`、Program Files Owner 为 TrustedInstaller，ProgramData Owner 为 SYSTEM。记录明确未读取 audit SACL/mandatory label，因此不是 MIC、实际目标 ACL 或有效访问验证。
- 两个个人证书库共枚举 7 张公开证书的元数据；`HasPrivateKey` 标志不是私钥读取或使用证明。它们均没有成为用户批准的签发者。不得因为证书存在就选择其 pin 或签署材料。

主代理的 `baseline-integrity.json` 记录 Q3 SHA256SUMS 650 文件、Q2 503 文件、历史冻结 862 文件均无 mismatch；payload 为 194 文件 / 468,433,910 bytes，无多余/缺失/Hash 差异；源码与 ZIP 均为 258 文件且一致。本代理读取这些结果，并独立核对选定核心文件和原始证据 Hash，没有将读取结果描述为独立重跑全部清单。详细 Hash 见 [机读复核记录](../evidence/independent-review.json)。

签名预检覆盖 194 项：108 NotSigned、83 UnknownError、3 Valid；四个自有原生入口及 Electron 均 NotSigned。脚本/JSON 等格式的 UnknownError 不应被解释成已确认恶意或已通过 Authenticode。Node 和 d3dcompiler_47.dll 等已观察到有效签名的依赖，也不能替代本产品部署审批 CMS、qualification CMS 或独立 OS 证据。

## 尚未关闭的实现与合同缺口

### Q4-IR-01 / P2：安装前验证弱于真实运行合同

Q3 `source/tools/agentnexus/install-q3-qualification.ps1:97-100` 使用宽松 `DateTime.Parse` 验证期限，而 `source/native/credential-launcher/CredentialLauncher.cs:59` 要求 invariant 精确 round-trip `"o"`、UTC。已在本轮早先仅用纯内存表达式确认：有效期内的 `2026-11-10T12:00:00Z` 被安装器日期谓词接受、被 Launcher 日期谓词拒绝。安装可以发生，但 Launcher 随后失败关闭。

同一安装器 `:105` 用 PowerShell 大小写不敏感的 `-notin` 检查测试名；`source/native/credential-service/Common.cs:582-584` 使用 `StringComparer.Ordinal`。例如 `Daily_native_runtime_origin` 可通过前者的成员检查，真实服务则拒绝。此为静态/纯表达式合同差异，没有运行 Apply 或声称已在实际安装中复现。

关闭条件：后续如获准修改候选，应统一日期、精确大小写及类型合同，并在签发前对最终字节执行与运行链一致的纯验证；重新冻结全部受影响 Hash、清单、签署文档。当前按用户要求保持 Q3 冻结，不修补产品或伪造签名。

### Q4-IR-02 / P2：启动请求不能证明功能就绪，失败后停止也未被安装器保证

Q3 安装器 `:125` 仅检查 `sc.exe` 退出码，`:170-171` 据参数报告 `service_started=true`，没有有限时间的 SCM Running、engine readiness 或原 Medium snapshot 核验。`source/native/credential-service/CredentialService.cs:128-143` 创建子进程后排队读取线程；后续子进程初始化失败可经 `ReadEngine`/`FailBroker` 异步停服。因此当前输出只能证明脚本已请求启动，不能证明部署功能就绪。

Q3 `reports/deployment-approval.md:11,36` 的“失败保留停止的部分安装”对 `-StartService` 路径没有完整安装器保证。启动阶段失败或超时后，没有独立停止、有限等待及子进程退出核验。

关闭条件：将未来审批中的启动请求、实际 SCM 状态、原 Medium 就绪验证分别记录；将准确停止动作及有限等待/失败处置写进另一次明确批准。不得因回滚准备而在本轮执行 stop/delete、删除目录或重置账本。未有实际服务时无需回滚动作。

### 签发阻断：当前材料有意失败关闭

Q3 `approval/candidate/service-config.json:10-11` 未配置 pin/测试批准 ref；`qualification.json:3,9-11` 为 BLOCKED 且无有效期限；`qualification.p7s` 不存在；`payload/launcher-plan.json:8-9` 过期且未批准；`approval/deployment-approval.UNSIGNED.json:4-7` 为 false/空 ref/过期。用户确认没有批准的外部签发者后，这些字段必须继续保持未签、未批准，不能用本地已有证书或开发授权填充。

## Hash、身份与回滚的静态结论

未发现 Hash 自引用环。Q3 `source/tools/agentnexus/package-q3.py:35-57` 先生成仅覆盖 `app/` 子树的 application manifest，再生成位于 payload 外的 config/qualification 和由 installation manifest 覆盖的 launcher-plan；签署文档引用最终材料，不能反向嵌入被其 Hash 的文件。任何修改 launch plan、二进制或配置都应沿依赖方向重算，并最终重签，不能沿用当前 unsigned 模板的旧 Hash。

原生边界在源码中要求 TokenUser 为虚拟服务 SID、session 0；Daily 每条完整请求读取实际管道消息冒充 Token 的 SID/Medium/session/logon，再绑定内核连接 PID 连续性。Runtime 权威来自服务创建的固定入口、保留进程句柄与 Job，不来自 Medium 自报 PID/path/hash。Helper 在采集凭据和打开管理管道前配置服务 query-only readback。以上是源码约束，实际虚拟账户权限、对象 DACL 应用、MIC、线程 Token 交接和 Windows 兼容性仍未测量。

未来回滚应只在另行准确批准范围内停止唯一服务并核验 Node/Runtime 退出，保存程序、Vault、ledger、审计和签署材料；不删除账户/服务/目录、不改 ACL、不重建空 REAL 账本、不清零预算、不自动重发 SENT/UNKNOWN 请求。本轮仅准备该合同，没有实施回滚或系统清理。

## Q4 工具与离线结果的局限

`offline-checks.py` 将完整源码 ZIP 解压到 Q4 独立 runtime sandbox，在校验 258 个源码 Hash 后编译诊断入口、执行 `--self-test` 和合成回归，最后对原 Q3 bundle 运行 verify-only。它清除 `Q3_RUN_SYNTHETIC_HELPER_UI`，不调用普通 Helper/Launcher、Apply、SCM 写操作或真实 Provider。诊断二进制不是已冻结 payload，不得用其不同 Hash 替换签发对象。

规范离线运行是 `offline-20261109T120357Z-6c1e2f1e`：13 阶段退出码均为 0，严格类型检查、五个诊断编译通过；service/client 各 90 个既有纯断言、Helper 138、Launcher 36；回归 **226 PASS / 0 FAIL / 3 SKIP**。3 SKIP 是未请求的合成 WinForms save/cancel/review-cancel。相同 Common 断言不重复算作额外 OS 测试。verify-only 只报告 194 文件、`PAYLOAD_VERIFIED_ONLY`、`system_changes=false`、`approved=false`。本代理核对全部 26 份 stdout/stderr 文件 Hash 与阶段记录一致。第一次离线包装器找不到预设 pwsh 路径，不能计为通过；规范第二次使用实际 PATH 完成。

`collect-host.ps1` 查询 CIM、注册表、服务状态/SID、公开证书元数据、父目录 DACL，运行已编译的只读 observer，并仅枚举管道名；它未连接管道。observer 的实际 Hash 与规范诊断编译记录相符。脚本路径前缀/文件名检查本身不是任意二进制的安全证明，本次结论依赖已审源码及实际 observer Hash。离线和宿主材料由主代理执行/采集，本代理只读复核。

原始 **70 项 Windows 攻击测试仍 NOT_RUN**，19 类签署资格证据仍 BLOCKED；没有 SCM 虚拟身份运行、真实 UAC/Helper 输入/内存/clipboard/dump、跨 SID/会话、DPAPI、原生 pipe/MIC、Runtime 生命周期、实际加载闭包或崩溃账本测试通过结论。静态依赖候选、编译、当前 shell Token 和合成进程通信都不能替代这些项目。

## 最终只读材料补审

**2026-11-09 12:14:50 UTC：只读预检与 UNSIGNED 材料准备范围复核完成；真实部署仍 NO-GO。** 已补审当前 README、验收/部署报告、审批目录、专项报告、测试状态与交付证据，并将其中 30 个关键产物的实际 SHA256 固定在机读复核记录。本复核不包含稍后由主代理生成的最终治理结果和 SHA256SUMS，不将它们提前记为通过。

精确范围请求明确为 `PRECISE_SCOPE_REVIEW_DRAFT_NOT_FINAL_EXECUTABLE_APPROVAL`；Host/machine_id/原 operator/预期 service SID 与实际记录一致，epoch=3。`deployment_approved` 与 `start_service` 均 false，real/live 均 false，资格测试、真实导入和 live 批准 ref 仍为空，最终签署安装清单 Hash 为 null。资格草案虽填写 QUALIFICATION_ONLY 和有限 UTC 日期，仍为 unsigned/BLOCKED、无 pin/CMS，不能用于安装。当前基线安装清单的副本与 Q3 字节相同，且明确标为非最终签署清单；所有当前草案 Hash 绑定均匹配。

逐字段比较确认：70 项原始 ID、顺序、layer、area、attack、expected、required_observation 无改写，全部 NOT_RUN；19 个原始资格名称及顺序大小写精确一致，全部 NOT_RUN。Runtime 20 项、Helper 11 场景、崩溃恢复 15 项均 NOT_RUN。离线 226 PASS / 0 FAIL / 3 SKIP 独立列出，没有填入 OS PASS；交付的 result.json 已改为原始字节复制，与规范运行 Hash `4cce77d6bdbe564604c8344041dddc6ff9a4c693da0ecc0638f4191e9a5b6387` 相同，26 份交付日志 Hash 也均一致。

依赖预检仅静态读取 12 个 PE、86 条直接/延迟导入：**79 条有打包/系统路径候选，7 条 API-set 的运行时解析 NOT_RUN**；application manifest 186 项与 app 集合一致。实际模块加载、依赖替换攻击及 CLR/GAC 绑定仍 NOT_RUN，生产依赖资格 BLOCKED。验收材料已修正为该精确范围，不再将 86 条全部表述为已取得路径候选。

两项 P2 在审批阻断项和后续签发条件中仍明确保留，Q3 产品源码未被修改；回滚仅是待另批的保存数据/停止核验方案，本轮无回滚动作。未在这些未签准备材料中发现新增阻断性安全问题。**本次材料复核完成不授予签发、部署或 OS 资格：SIGNED / OS 仍 BLOCKED，整体保持 UNSIGNED / NO-GO。**
