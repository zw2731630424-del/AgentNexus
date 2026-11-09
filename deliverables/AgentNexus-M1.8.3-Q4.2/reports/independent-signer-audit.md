# Q4.2 独立 Signer 安全审查

**最终裁定：本次源码、发布 PE、公开模拟材料与纯文件系统检查范围内，已发现的 Signer / Verifier / 公开准备工具问题均有关闭证据，未发现尚未关闭的阻断性实现缺陷。可以交付用户审阅签发方式；真实签发、GUI/CNG 用户在场、部署、OS 与生产资格仍未授予。**

本报告由独立审查代理编写。写入仅限本报告、`evidence/independent-signer-audit.json` 和 `evidence/independent-signer-audit/`。没有执行创建证书脚本、生成或调用任何签名、访问用户私钥、枚举用户 My 签名证书库、修改证书存储或运行 Apply、UAC、SCM、服务、账户或 ACL 操作。独立测试只读取既有 PUBLIC SIMULATED 证书和 CMS，并在新的审查专用目录进行纯文件系统控制检查。生产证书负例调用的 Windows 链引擎可能只读公开信任存储；这不是用户签名库或私钥访问测试。

## 复核对象及证据

已读取项目 AGENTS.md、治理 policy、工作流路由、Q4.1 合同和独立报告；逐段复核 Q4.2 `QualificationSigner.cs`、`SigningContracts.cs`、`Verifier.cs`、`ContractHarness.cs`、创建证书脚本、`freeze.py` 及本地/生产集成相关 Common.cs。

最终绑定 `evidence/review-targets.json` SHA256 `a24e37cc0350c320364088e649f12f7ff7708d520e054428a8248ad07e5222f6`，19 项源码、PE、测试和证据索引的开始/结束 Hash 全部匹配。该绑定不能预先授予稍后生成的最终 SHA256SUMS、真实公开证书、新候选或未来实际签名通过结论。

最终独立执行记录为 `evidence/independent-signer-audit/run-20261109T172540188484Z/result.json`：98 个命令全部符合预期，其中 91 项是使用最终源码重新编译的诊断 harness 对已有公开模拟输入进行只读复核；另有最终发布 Verifier 的 describe、identity、公开 DER、模拟整包和 toolkit 拒绝检查，以及实际发布 Signer PE 的纯文件系统探针。没有重新执行产生模拟签名的历史脚本。前一阶段的 96 命令通过记录保留，不重复累计为独立安全测试数量。

独立核对主测试最后 107 PASS / 0 FAIL 对应的 321 份 input/stdout/stderr 原件、交付副本与记录 Hash，以及 1,441 项 runtime 文件和 1,441 项归档成员的长度/Hash。上述是证据一致性核对，不能改写为本代理重新执行 107 项签名测试。末尾 `added-after-review` 故意污染了原 valid 夹具；重跑首个正例时正确拒绝 `PAYLOAD_FILE_SET`，独立正控制使用未污染的 exported-approval，未修改历史夹具。

准备工具最后补审为 `evidence/independent-signer-audit/delta-20261109T172734283369Z/result.json`：21 项独立检查通过；14 项主准备测试的原始/交付证据一致。独立核对现有已准备目录全部 475 个公开文件和 474 项 SHA256SUMS 的完整集合及 Hash，payload 为 194 文件 / 468,592,646 字节。实际最终 Verifier 对该目录只读 inspect 返回 UNSIGNED_CANDIDATE_INSPECTED_NO_GO；verify 返回 21 / USER_CONFIRMATION_REQUIRED。未新生成候选、复制 500MB 载荷、选择真实用户证书/Pin 或生成签名。

首次独立运行 `run-20261109T170916049433Z` 保留 3 项未符合原预期的记录：两项来自上述夹具后续污染；另一项是本代理 PowerShell 反射构造器选择错误。修正探针后发现既有写映射在读取获取阶段即被宿主以 error 32 拒绝；没有把该未到达的“映射后修改再复核”分支写为通过。独立探针的早期失败记录同样保留。

## 已关闭的 Signer / Verifier 实现问题

1. **授权与私钥边界。** 公开加载与存储关联查询不打开用户私钥；独立 CNG 属性按钮在单独 Yes 之后取得密钥关联句柄，明确披露其能力及 Silent 的边界。实际签名阶段的 `GetRSAPrivateKey` 与 `ComputeSignature` 位于另一最终 Yes 的委托中；No 不执行该委托。最终人工等待后再次复核源快照、时间及证书。此为实际源码调用顺序结论；诊断 `UserConsent` 计数器不等于实际 GUI / CNG 测试。
2. **输入稳定性。** 完整输入保留只读流和内部 byte[] 快照，返回数据为克隆；验证与导出使用同一快照。`RecheckSources` 对比底层流与快照、重新检查 payload 集合和准备中断标记。实际发布 PE 的调用者克隆修改未改变内部快照。既有可写映射在本宿主的读取获取阶段被拒绝；其他系统的映射时序仍应保持其实际边界说明。
3. **输出事务。** 逐级持有所有目录，CreateDirectoryW 独占新目录，CreateNew 文件保持 ReadWrite / FileShare.Read 句柄；写后回读 Hash，检查完整输出文件/目录集合，再在完成标记前后读取整包并验证 Hash、CMS 和语义绑定。缺完成标记的模拟中断材料拒绝，标记后完整材料允许独立验证；不声称标记后退出必然无有效输出。
4. **目录写入与重解析点。** 最终 `LocalDirectory.Open` 使用 FILE_LIST_DIRECTORY | READ_ATTRIBUTES（0x81）、只共享 Read，OPEN_REPARSE_POINT 后检查实际句柄属性。独立发布 PE 控制显示：空目录写句柄 error 32，释放锁后同路径成功；输出文件覆写和 root rename 均拒绝。此前 attributes-only 0x80 的失败证据 `EMPTY_DIRECTORY_WRITE_HANDLE_NOT_DENIED` 保留。这些检查没有执行真实 reparse FSCTL，不把它们计作跨 SID 或 OS 权限资格。
5. **本地入口和执行字节。** Bundle、公开 DER 读取和预览输出均逐级固定本地目录并拒绝重解析点；叶输入使用 nofollow 句柄。实际签名前的输出存在探测先固定父目录链。创建脚本 bootstrap 从同一个公开 byte[] 进行固定 Hash 验证和 Assembly.Load，避免 Hash 后重新按路径执行不同 PE。脚本主路径未执行。
6. **证书和 CMS。** 本地证书 pin、身份、用途、RSA 长度、证书签名算法、完整计划时间窗、单一 detached CMS、SHA256 摘要和限定 RSA 签名算法继续严格检查。资格计划与部署批准的 schema、确认类型和引用分离，部署绑定计划和计划 CMS 原字节；真实/生产开关全 false。生产分支不能把本地文档用途证书提升为发布资格。
7. **发布面。** 实际发布 Signer PE 反射检查没有 PublicationProbe 回调字段和 ContractHarness 类型；诊断探针仅存在于单独编译的 SIGNING_DIAGNOSTIC harness。无自动签名、私钥/PFX/密码输入、安装、自动提升或服务启动入口。

## 最后补审与关闭证据

- **预览输入 / P2：已关闭。** `SigningContracts.cs:174-179` 的共用 PublicCertificate 在构造 X509Certificate2 前检查内容类型为 Cert，构造后要求原字节等于 RawData 且 HasPrivateKey=false。实际预览、Verifier 和 prepare 均复用该入口。独立重新执行“精确 DER 接受”和“既有 keyless PKCS12 在构造前拒绝”，并复核 prepare 经反射使用同一入口。未创建或解析含私钥的 PFX。
- **创建方法 / P2：已关闭。** `user-create-certificate.ps1:14` 改用 `-eq`。独立仅提取原始 ParamBlock 和 provider 赋值表达式，测试 TPM_CNG、tpm_cng、TpM_CnG、SOFTWARE_CNG、software_cng，均选择正确 KSP。该测试没有运行主脚本任何证书创建/密钥操作。独立提取的公共 bootstrap 对固定 Signer Hash 成功、错 Hash 和 UNC 拒绝；Hash 和 Assembly.Load 消费同一 byte[]。
- **准备工具路径/事务 / P2：已关闭。** `tools/local_files.py:41-60` 逐级固定目录并对叶输入使用 nofollow 句柄，源在内存固定后核对 Hash；`freeze.py:54-72` 对完整 toolkit 集合建立经 Hash 校验的公开快照，`freeze.py:24-52` 从同一经核验 Verifier byte[] 加载共享公开证书/策略合同。`local_files.py:85-116` 独占新目录/CreateNew 文件、全程持有输出写句柄并读回复验；`freeze.py:154-163` 在完成标记前后检查输出，不复用半成品。独立 Python 纯文件系统控制验证空目录写句柄、输出覆写/rename、额外目录均拒绝，公开 DER 接受而 keyless PKCS12 拒绝；实际已准备整包的完整文件集合/Hash 和原生只读合同检查均符合预期。

关闭结论依赖最终源码、实际发布 PE 的只读路径、已有公开模拟材料及本宿主纯文件系统控制。没有把这些结果升级为真实 CNG、跨 SID、硬件用户在场或 OS 资格。

## 保留的边界

UI 图像为 SIMULATED / UNSIGNED，显示 9 文件 / 1,253 字节的演示夹具，按钮关闭；它只证明预览布局与警示可见，不能证明真实证书选择、CNG 策略、Provider 提示、Cancel/No、实际签名或两个完整用户阶段已运行。

Framework 4.8 的 ComputeSignature 按证书关联重新解析钥；检查句柄在期间保持存活，实际 CMS 按精确 DER、公钥和原文核验。这证明签名对应指定公钥，不能证明使用同一 CNG 句柄或同一策略实例。NonExportable、ProtectHigh、TPM、普通 WinForms、Silent=false 和复选框均不证明同 SID 抵抗或可信用户在场。单独属性访问已取得具潜在签名能力的句柄，不能把它称为公钥查询；最终 No 只表示实际签名阶段未获执行。

用户独立设备/安全主体、可信输入来源和完整 Pin 的独立核对仍是待建立的前提；同 SID 另一会话不足以隔离。真实软件 CNG / TPM / 硬件证明 / PIN 与每次提示 / 密钥隔离均 NOT_RUN 或 INCONCLUSIVE。无签发、证书信任导入、系统部署或生产权限授予；原 70 项 OS 测试和 19 类生产资格不能因这些离线结果变为 PASS。
