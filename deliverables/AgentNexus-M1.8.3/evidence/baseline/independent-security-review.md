# M1.8.2 独立安全审查

审查日期：2026-11-08。审查者为独立上下文的 Codex 工程审查代理，未编写候选实现；修复由主代理完成。本审查不是 DeepSeek Native Harness Reviewer、真实 Pilot 或长期 Resident 的运行证据。

**所列可信 Host 本地库范围审查完成：1 项 P2 请求覆盖缺口已修复并独立复验，未见此范围内剩余阻断。完整回归仍为 FAIL，生产 Vault、OS 隔离与真实 Provider 联调的总体目标继续 BLOCKED。**

## 冻结版本与阅读范围

最终候选 189 个文件的源码集 SHA256 为 `95cd2da54b0e854a469eb5e0df8f4b52ce89fe67e452ab57b758aeb8e8335b50`。独立测试前后均逐文件读取并复算 bytes/SHA，与 candidate-freeze 及主代理最终 source-manifest 的 189 条记录一致；集合算法为按 Unicode codepoint 路径排序，拼接 UTF8(path + NUL + lowercase_sha256 + LF) 后取 SHA256。

历史 M1.8.1 源码 185 个文件已独立整文件读取复算，仍为 `d2091ef71fbd7a62f17ff8a42a922357759817073d97f1343d27b6ff7c9c3bb1`，与冻结基线一致。最终候选相对历史保留 180 个文件原字节，修改 package 两文件、egress、transport 与一份继承测试 fixture，新增 request-review、request-binding、M182 测试与验证 runner。

语义 FULL 覆盖 19 个重点源码/测试文件：request-review、request-binding、egress、transport、gateway、protocol、campaign、vault、adapters、deepseek、dpapi、harness/context、state、contracts、production/qualification、m182-egress、m18-review-fixes、m18-fixture、verify-m182。harness/index、production/resources、bootstrap/config 为 PARTIAL；NativeRuntime.cs 为 SEARCH_ONLY。其余 166 个候选文件仅作机器整文件读取/hash，不声称逐行语义审查。三个根工程脚本 probes、vault-reader、evidence，以及历史安全审查、Vault、Egress 与验收报告已按相关范围阅读；各文件 SHA 与覆盖说明见[机器记录](../evidence/reviews/security-review.json)。

## SEC-M182-001：重复 JSON 字段绕过组件覆盖（P2，FIXED_VERIFIED）

原审阅器对实际 request.body 执行 JSON.parse，再验证解析后消息与来源。独立使用真实模块及合成 SQLite fixture，在合法正文前加入另一组 messages，或使用转义键 mess\u0061ges，原审阅器均接受。原始字节包含额外未分类的合成 developer note，报告却仍只有两个合法消息组件与一个来源。

这是可信 Host 审阅 API 的完整性缺口。普通 Agent 路径使用 DeepSeekAdapter 的 JSON.stringify，未证明普通 Agent 能注入原始 wire JSON；没有因此构造真实请求，也不将可信 Host 编写恶意回调视为普通 Agent 漏洞。两份原始正文 SHA、完整复现命令与接受结果已保留在[独立原始证据](../evidence/reviews/independent-raw-20261108-duplicate-json.json)。

主代理在受限首轮 profile 强制 request.body === JSON.stringify(parsedBody)，直接拒绝有损解析，不静默改写外发字节。独立重跑原复现，两个变体均被 MODEL182_REVIEW_WIRE_SERIALIZATION 拒绝。最终测试还覆盖重复 model/tools、嵌套字段、转义重复键及额外空白；合法 Adapter 正文继续通过。

## 关联修复与证据保留

同一正文的不同 correlation ID 原先共用 grant_id 作为 review 主键，导致第二次完整审阅发生冲突。这是拒绝发送的可用性缺陷，未造成未经审阅数据外发。最终 review 主键由 grant_id + request_hash 派生；独立测试确认新 ID 在单独审阅前拒绝，审阅后两个请求分别有效，撤销仍以共同 grant 为准。

完整模型测试曾保留 162 项＝159 PASS / 2 SKIP / 1 FAIL：继承的 16 槽测试使用 {} 正文及旧 hash-only grant，新门正确拒绝后产生 0 !== 16。候选仅把 fixture 改为实际 Context Assembly、Adapter 正文与合成来源审阅，原 16 接受、1 拒绝断言保留。[原 fixture](../evidence/test-fixture-repair/m18-review-fixes.before.test.ts) 与历史文件逐字节一致，SHA 为 `04611df2b1aa0c2b51573331ab34c27aa5a14e807984589cb546c65d36caa59c`；原 FAIL 未覆盖。

辅助 vault-reader 原先仅用词法路径与解密后前缀约束，已加祖先 realpath/非链接、单链接文件及 application_id/user_version/SYNTHETIC/backend 元数据先验。独立对三个新建且没有 credentials 表的合成库执行拒绝探针：LIVE 元数据、异 backend、错误 application 均在密文 SELECT/解密前拒绝，stdout 为零；没有运行 DPAPI。该脚本仍是可信本地工程探针，不构成对恶意 OS 进程的生产隔离证明。

## 安全边界结论

| 边界 | 本轮可支持的结论 | 限制 |
|---|---|---|
| 实际最终请求 | Gateway 校验并重建已确认 Context；首轮仅固定 system、精确 user context 与可选的精确合成 tool schema。额外 developer/history/file 字段与有损 JSON 拒绝 | inspector 本身不是 Archive 身份验证器，也不是用户确认渠道 |
| 来源与同意 | 逐项来源/range hash、来源清单、正文、完整 credential-free envelope、provider/model/endpoint/project 绑定；REAL 需要持久完整 review | approveReviewed 必须由可信 Host admin 调用，外部 verifier 须真实核对来源与用户确认并严格返回布尔 true；测试回调不构成真实授权 |
| 撤销与到期 | Policy 与 Transport 最终 fence 重检 durable grant、receipt、review、expiry 和 revocation；普通 Feature 不能去掉 REAL 强制门 | 独立到期复验仅在同步合成检查中替换 Date.now，不是 OS 时钟试验 |
| 元数据与秘密 | headers、provenance、原始/解码正文均经过已知秘密扫描；常见路径、IPv4、科研项目名称与凭证形状被额外拒绝 | 启发式扫描不能识别任意未知秘密、hostname、相对路径或编码，不能代替可信逐源分类 |
| 预算 | Campaign 固定 durable Host store 与 1 亿输入加输出上限；UNKNOWN 保留不释放 | 必须在部署中固定账本；本轮没有真实 Usage 或 invoice |
| REAL/SIMULATED | Vault assurance 固定 SIMULATED，LIVE 在访问前拒绝；REAL Gateway 要求 Vault/Transport assurance 一致 | 可信 Host 自报 QUALIFIED 的回调不是 OS 资格 |

Request Hash 是不含 authorization 的 canonical HttpEnvelope 哈希；Body Hash 是实际原始正文哈希。Transport 的授权 header 只在可信凭证回调内加入，不进入审阅预览。没有把凭证加入报告或请求草稿。

三份草稿的正文已完整阅读，独立复算 body/context/request/review/sources 哈希均一致。内容仅为固定协议及三个编造任务，第三份附合成 add schema；没有实际规则、科研资料、源码、真实历史、路径、服务器或凭证。索引中 active grant/review 均为 0，状态 DRAFT_BLOCKED_NOT_SENT。14,554 Token 与 4,885 微美元仅为后续审批时的草稿预留/费率估计，不是真实消费或账单；部署资格闭合后必须重建并重新审阅，不能复用为 live 同意。

## 真实 OS 证据与生产状态

主代理的原始及强化辅助读取器后的 fresh 合成 Vault 负证据均已核对：真实新建同 SID 子进程可以读取该新建合成数据库并调用 CurrentUser DPAPI 解密，expected/observed SHA 一致，子进程退出码 0，状态 ISOLATION_FAIL。这没有使用真实 Key，也不是已部署受限 Worker 的跨账户试验。不能把它改写为 Vault 隔离 PASS。

只读 ACL 观察没有证明 Host-only 保护。当前 hardlink/junction 操作 EPERM、发布阶段保留 UNKNOWN/容量，不能被解释为 Storage 原子发布成功；WindowsApps PowerShell 路径 native traversal 的 WIN32_5 也不能证明 Job breakaway 防护成功。严格累计 CPU、PROCESS、EXTERNAL_EFFECT 的生产门继续 BLOCKED。跨独立标准账户的 Agent/Subagent/Reviewer/Worker 拒绝、实际 API/Streaming/Usage/费用、真实自主 Pilot、Native Reviewer 与 24 小时 Resident 均未在本审查中执行或验收。

## 验证与总体裁定

独立在冻结源码上执行 M182 14 项与继承安全测试 7 项，**21 PASS / 0 FAIL / 0 SKIP**；另有三项辅助读取器拒绝探针全部通过。原始 11 项、修复中间 14 项、原漏洞接受结果、最终拒绝结果与最终 TAP 均保留，未回填历史证据。

主代理最终完整回归经独立核对：**695 项＝648 PASS / 32 SKIP / 15 FAIL，整体 FAIL；14 项 M182 全部 PASS，syntax 与 strict TypeScript PASS。** 失败名称集合与本轮未修改 M1.8.1 回归 681 项＝634 PASS / 32 SKIP / 15 FAIL 完全一致，没有新增失败名。源码 manifest 的 189 项 bytes/SHA、执行前后源码集及当前候选均匹配。完整回归由主代理执行，本审查没有把它冒称独立重跑。

本审查未调用真实 Provider、未查找或读取真实凭证、未改变账户/ACL/AppContainer/profile、未修改实现或历史交付。最终根治理由主代理单独附证，本报告不预先声明其结果。生产资格未通过，不生成真实执行申请，不索取 Key，不把离线 PASS 当作完整 M1.8.2 验收 PASS。
