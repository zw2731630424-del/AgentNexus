# Q4.1 独立安全审查

**裁定：本地资格签发机制与未签部署准备范围的独立审查完成；预冻结发现的 1 项 P2 已关闭。当前仍 UNSIGNED / NO-GO。实际用户签发、系统部署、用户密钥隔离和 Windows OS / 生产资格未授予。**

本报告由独立审查代理编写。产品代码只读，写入范围仅本报告和 evidence/independent-review/。没有派发子代理，没有访问真实私钥、执行实际签名或用户证书创建脚本，没有修改证书存储、运行 Apply、触发 UAC、创建/启动/停止服务或账户、修改 ACL，未使用真实 Key 或 Provider。结论不把离线模拟或只读检查计作原 70 项 OS 安全测试。

## 审查对象与冻结边界

已读取根 AGENTS.md、治理 policy、project-workflows 路由、Q4 独立报告、Q3 精确部署合同及本轮原始用户请求。逐段审查独立 Signer、共享 SigningContracts、Verifier、Common.cs 本地/生产集成、新安装器和公开证书准备/用户创建脚本；对照两种合同、私钥边界、测试说明、精确申请、验收和回滚材料。

本次最终补审绑定：

- 安装清单 SHA256：31d1ea7fd3487a9843b753c1000418c693b32627d615070bd2038fcf5677931f。
- 194 个安装文件，共 468,553,232 字节；Signer / Verifier 在载荷之外，由计划另外绑定 Hash。
- 最终模拟测试运行：signing-tests-20261109T151908617334Z；最终六项构建运行：build-20261109T151903316177Z。
- 全部 264 个源码文件与 source-manifest、源码 ZIP 一致。相对 Q3 的载荷 Hash 改动仅四个原生入口和 launcher-plan，其余 189 项保持原 Hash。
- 最终源码、合同、批准草案与关键产物 Hash 及详细复核结果见 [机读证据](../evidence/independent-review/evidence-audit.json)。

此审查不预先授予稍后生成的最终 SHA256SUMS 通过结论。当前两个实际 CMS 和完成标记不存在，实际用户 DER pin 为 null，部署批准与用户确认均 false；带 APPROVED 前缀的草案引用本身不构成批准。选择真实公开证书后必须产生新候选并重新签署、复核，不能复用本报告的 unsigned Hash 作为未来安装批准。

## 发现与关闭证据

### Q41-IR-01 / P2 — 时间检查可能被人工或 Provider 等待跨过：已关闭

首轮实现只在安装人工确认之前检查证书当前有效期，等待后仅复查计划到期时间；运行期也只保留计划期限。计划可晚于证书 NotAfter 到期。Signer 首次时间检查同样在最终对话之前，存在等待后输出过期计划的路径。此为静态可执行顺序缺口，没有执行 Apply 或实际服务复现。

最终实现已经：

- 共享 CertificateWindow 要求证书有效区间覆盖整份计划；Candidate 和 Common.cs 的本地 VerifyDetached 都显式调用。Common.cs:600-601 不再依赖安装器曾检查该约束。
- Verifier.RecheckTime 在安装最后一次用户等待后重新验证计划期限和两份 CMS 的证书。
- Signer 在最终 Yes 之后、ComputeSignature 返回之后分别复验；Export 在发布 JSON / CMS 前和最后完成标记前再次检查期限，覆盖 Provider 对话和复制耗时。
- 模拟用例 certificate-shorter-than-plan 拒绝过短证书；直接反射实际 Common.VerifyDetached 的 runtime-detached-valid / runtime-certificate-window-denied 正反例均符合预期。

关闭结论基于最终代码审阅和 SIMULATED 证据。实际 CNG 提示、手工长等待和真实服务生命周期仍 NOT_RUN。

## 最终证据核对

| 证据 | 本次独立核对 | 保证边界 |
|---|---|---|
| 签名/合同测试 | 60 PASS / 0 FAIL；180 份 case input/stdout/stderr 的记录、原件和交付副本 Hash 一致 | 全部 SIMULATED；不是用户实际签名 |
| 原始模拟材料 | 998 项 runtime manifest 长度/Hash 一致；完整 SIMULATED 归档的 998 个文件与 runtime 原字节一致 | 含实际签署原文、fixture、导出结果及诊断程序；无用户信任资格 |
| 最终源码和载荷 | 264 项源码/ZIP、194 项载荷、完整文件集合、逐项目标/长度/Hash、计划/批准/精确申请绑定一致 | 不证明 PE 已获 Authenticode 或实际加载闭包 |
| 构建与回归 | 读取并核对构建和回归原始日志；六项构建通过；Service/Client 各 90、Helper 138、Launcher 36 纯断言；strict TypeScript 通过；224 PASS / 0 FAIL / 5 SKIP | 本代理未重新执行全部构建/60 项/回归；相同断言不重复计作 OS 测试 |
| 最终实际只读入口 | 本代理独立运行最终默认安装器：UNSIGNED_CANDIDATE_INSPECTED_NO_GO、194 文件、approved=false、system_changes=false；严格验证返回 21 / USER_CONFIRMATION_REQUIRED | 未运行 Apply |
| 最终 PE 签名检查 | 本代理只读检查当前 14 个 payload / signer PE：12 NotSigned、2 Valid；记录的文件 Hash 与最终字节相同 | 2 个有效依赖签名不替代产品审批 CMS；CMS 不授予 Authenticode |

[独立最终只读结果](../evidence/independent-review/readonly-final.json) 关闭了最终重新构建后的检查新鲜度边界。主代理较早只读结果中的 AST / 自动批准 CLI 拒绝及其日志已核对，没有将较早 PE Hash 充作最终二进制检查。

5 个回归 SKIP 明确保留：2 个宿主拒绝 hardlink / junction-symlink 夹具，3 个未启用的合成 Helper UI 场景。没有通过提升或改 ACL 消除它们。

异常退出 #24 是诊断 harness 写 partial JSON 后 Exit(73)，#24b 拒绝缺少安装材料的半成品；它没有强杀实际 Signer，没有覆盖 CNG Provider 崩溃或所有导出中断点。另一个完整签署 fixture 缺完成标记时被拒绝。上述均保持 SIMULATED。

本代理另做了纯文件系统控制检查：FileShare.Read 持有子文件时祖先 rename 被拒绝，关闭流后成功；以及只用既有公开模拟 CMS 的 Framework 原始 SignedCms 控制探针，没有观察到 attached 内容替换外部文档而验证通过。它们都不是跨 SID、MIC、实际安装 ACL 或原 70 项测试。原始脚本/日志保留在 independent-review 目录。

## 安全边界的静态结论

本地链强制 LOCAL_QUALIFICATION / QUALIFICATION_ONLY、epoch 4、严格 UTC 与有限期限；六个真实/生产开关必须为严格 boolean false，真实批准引用为空。资格名称与大小写复用 Common 的同一验证。未知模式、扩大范围、错误主机/SID/epoch/Hash/总量/权限和缺独立确认均拒绝。

本地证书除独立用户提供的完整 DER SHA256 pin 外，还要求精确身份、唯一 documentSigning EKU 1.3.6.1.5.5.7.3.36、DigitalSignature KU、非 CA、RSA 至少 3072 位和完整计划时间窗。公开输入要求原字节等于 cert.RawData，拒绝 PFX 和非精确 DER；报告的指纹也取实际 DER。生产分支即使删除配置中的 mode 仍拒绝该本地 EKU，并保留 QUALIFIED / 19 类生产证据和真实权限门禁；本轮没有验证任何生产发布候选。

两份 CMS 的 schema、确认类型和批准引用分离；部署批准绑定最终计划和计划 CMS 原字节。原始 DER 结构检查明确拒绝 attached 内容，多签名/计数签名和弱摘要被拒绝。两阶段导出后重新验证通过；末尾提交标记单独绑定内容、CMS 和 pin，缺失则候选拒绝。

文件和路径检查覆盖完整 payload / app 集合、每项长度/Hash、固定目标、Windows 别名、重解析点和重复目标。签名与安装使用持有的只读流，原候选不覆盖。新数据根创建时附带受保护 DACL，消费收据先于 SCM，既有根/服务/收据拒绝。程序与签署元数据保持管理员可写，只有指定状态子树授予服务写入。以上为源码与离线证据；实际对象权限仍需 OS 测量。

新入口明确只安装停止状态，StartService / start_service=true 拒绝。它通过停止安装范围避开 Q4 已记录的“启动请求不等于就绪”问题；以后启动仍需独立批准、有限等待和失败停止/固定子进程退出证据。Q3 历史源码与其原有报告未被本轮改写。

## 保留的限制与最终裁定

实际宿主证据记录的是 Low 4096 / AppContainer / 非提升 / Session 1 的采集进程，不能称为 Q4 历史 Medium 观察。SC 1060、Service SID inactive、目标根不存在和管道名枚举只反映采集时点；父目录 DACL 不包含 SACL/MIC 测量。公开证书 2 张是受限视图，不证明历史证书库发生变更。TPM 只读结果 INCONCLUSIVE。

原 70 项 Windows 测试与 19 类资格文件均与 Q4 原字节一致，保持 70 NOT_RUN、19 NOT_RUN、0 OS PASS。未测量实际 SCM 虚拟身份、UAC、Helper 输入/内存/clipboard/dump、跨 SID/会话、DPAPI、原生 pipe/MIC、实际加载/依赖劫持、Runtime 生命周期及真实崩溃账本恢复。

NonExportable、TPM、普通 GUI 与 silent=false 不证明同 SID 恶意进程无法调用私钥，也不构成可信用户在场。用户独立离线设备/代理不可访问会话是尚待实际建立的信任前提；不能以当前受限代理 Token 或复选框代替此证明。公开证书 pin 尚未由用户选定，用户创建脚本和真实签名路径均未执行。

epoch 4 + 受保护收据不是 TPM 单调计数器；管理员删除状态、回退磁盘/时钟或控制签名环境不在承诺内。回滚材料只准备保留数据和另批停止核验，未实施卸载、删除、ACL 变化、账本重置或自动重放。

治理结果记录未改原治理器的 metadata-cache 全 check 返回 PASS；本代理核对了原始/交付日志 Hash，并阅读包装器。其假设是冻结拓扑，末尾仅复核对象类型、设备、身份和 Windows 属性，不提供通用并发 resolve 等价或 OS 边界证明。本代理没有重跑全仓治理。Q3/Q4 SHA256SUMS 文件以及基线登记的规则/ADR Hash 均保持一致；这不被描述为本代理重跑全部历史 Hash。

**本次代码与离线证据范围内未发现尚未关闭的阻断性实现缺陷，可以交付给用户审阅本地签发方式。实际签发、部署、证书信任导入、服务启动、真实 Key、Provider 与费用仍未获授权；SIGNED / OS / PRODUCTION 继续 BLOCKED，整体 UNSIGNED / NO-GO。**
