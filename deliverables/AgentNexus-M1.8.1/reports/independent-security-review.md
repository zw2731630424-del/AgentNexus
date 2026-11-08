# M1.8.1 独立安全审查与凭证资格复核

审查日期：2026-11-08。审查者为独立上下文的 Codex 工程审查代理；没有编写被审源码，修复由主代理完成。本报告不是真实 DeepSeek Reviewer 的运行证据。

**冻结候选的离线可信本地库范围审查完成：1 项 P2 发现已修复并独立复验，1 项回执完整性加固已复验，未发现此范围内剩余阻断。LIVE 凭证、Host/Worker OS 隔离与真实模型能力仍 BLOCKED。** 已核对主代理最终同源码全回归：681 项＝635 PASS / 32 SKIP / 14 FAIL，整体状态为 FAIL；M181 新增 41 项全部 PASS，syntax 与 strict TypeScript PASS。14 项既有平台/存储链相关失败保留为 FAIL，不能据新增项通过推导整体通过。

## 阅读范围与冻结证据

完整阅读 9 个候选运行时模块：gateway、protocol、ledger、transport、campaign、egress、response-evidence、adapters、deepseek；完整阅读 NativeState、SSE streaming 和两组 M181 新测试及相关 review-fixes。历史凭证设计、资格报告、验收、生产身份/隔离相关源码和测试按相关性阅读。逐文件 SHA256、FULL/PARTIAL/SEARCH_ONLY 范围及 7 项历史同字节校验详见 [机器审查记录](../evidence/reviews/security-review.json)。部分阅读没有冒称 FULL。

9 模块集合 SHA256：`8286082cf1fd98130bfc0eea60184025da7baf46358df821766a8ca17326c7a2`。算法为按仓库相对路径排序，对每个 `path + 空格 + sha256 + LF` 拼接后取 UTF-8 SHA256；这是审查子集标识，不是整个 source 目录的 hash。最终源文件冻结后已复算。

最终完整源码集 SHA256：`d2091ef71fbd7a62f17ff8a42a922357759817073d97f1343d27b6ff7c9c3bb1`。已逐项复算 [最终 source manifest](../evidence/verification/final-verification/r-47aaf595f735/source-manifest.json) 中 185 个文件的 bytes/SHA256，并按其 `UTF8(path + NUL + lowercase_sha256 + LF)` 编码复算集合 hash；当前源码全部一致，先前 59 个审查输入也无漂移。已核对 [最终 results](../evidence/verification/final-verification/r-47aaf595f735/results.json) 的执行前后源码 hash 相等及 source_snapshot_stable=true。

[同环境回归对照](../evidence/regression-comparison.json) 的基线为 640 项＝593 PASS / 32 SKIP / 15 FAIL，候选没有新增失败名称。原累计 CPU 测试本次由 FAIL 变为 PASS 是分次运行的观察差异；对照已注明 Windows 并发/时序结果可能变化，不构成 CPU 或 OS 生产资格。

## 发现、修复与独立复验

### SEC-M181-001：完成状态缺少运行时布尔校验（P2，FIXED_VERIFIED）

原 `CampaignTokenLedger.observe` 仅用 `!complete` 判断完成状态。对已 SENT、预留 60 Token 的请求传入非空字符串 `"false"` 和有效 30 Token Usage，会得到 `OPEN / used=30 / held=0 / unknown=0`，错误释放保留量。独立直接导入真实 Campaign 模块、使用内存 Map State 复现了该结果；没有把该实验冒称 SQLite 并发试验。正常 Gateway 原先只传布尔值，因此没有证明普通 Agent facade 可直接利用此缺口。

主代理在 `campaign.ts:61` 增加 `typeof complete==='boolean'`，并新增真实 SQLite 账本测试。独立复验六种无效值 `undefined/null/0/1/"false"/{}` 全部得到固定错误 `MODEL181_CAMPAIGN_COMPLETE`，每次 Campaign 快照完全不变；随后合法 `false` 仍保留 held=60 并进入 UNKNOWN。原复现及修复后结果保存在机器记录。

### SEC-M181-002：回执自身字段的一致性加固（非阻断加固，FIXED_VERIFIED）

原最终门读取 durable grant，并绑定实际请求的 body/context，但没有逐项核验 receipt 自带的 context/sources 等字段。未证明该差异能够外发未经批准的字节，故不将其升级为已验证的数据泄漏漏洞。

主代理在 `egress.ts:17、60` 加入六字段严格 schema 及逐项一致性核验，`protocol.ts:22` 同步补齐类型。独立复验合法回执先通过；对 grant_id、context_hash、body_hash、sources_hash、classification、authorization_ref 的六种替换和额外字段，共七种 patch，在 policy.fence 与 assertEgressAdmission 两个门均被拒绝。相关最终测试源码已完整复读。

## 核心边界结论

| 边界 | 可支持的离线结论 | 实际限制 |
|---|---|---|
| 总预算与并发 | Campaign 在 NativeState 同步事务内检查 used+held 并预留；REAL 固定 campaign ID/100,000,000 上限 | 必须固定同一 durable Host store；新建数据库不是新授权。不是外部全局配额服务 |
| 跨 Session、Key、Task | 同一 campaign 不按这些字段新建或重置；initialize 不允许更换授权引用或限额，恢复保留 UNKNOWN | 未验证恶意部署替换 store、系统账户或数据库 ACL |
| UNKNOWN 与失败 Usage | 已 SENT 不能 NOT_SENT 退款；缺 Usage、失败解析、overrun 保留全额并阻止后续 Campaign 发送；有效失败 Usage 只计一次 | 保守保留可能同时记录已观察消费和全部原 hold，需要 Owner 核对 |
| 外发准入与撤销 | durable Host-reviewed grant 绑定 project/provider/model/endpoint/context/body/sources；只允许 PUBLIC/SYNTHETIC；Gateway 与 HTTPS 最终 fence 重检撤销/expiry | verify 回调依赖可信外部审核；Agent 标签、布尔值或字符串不是审核与用户授权证据 |
| 响应与日志 | ProviderParseFault 只保留校验后的数字 Usage；已知 secret 门前不发布原始 partial；wire evidence 仅输出 hash/长度/状态 | eof=false 时 hash 仅代表已消费字节；已知 secret 扫描不能保证识别任意未知秘密或任意编码 |
| 费用 | cache/reasoning 数值受约束；reasoning 不重复计费，Gateway 以峰时全 cache-miss 费率保守估算 | 费率计算与文档登记不是实际 invoice，未执行真实 Provider 或账单核对 |

## 原凭证资格审查

M1.8.1 的 vault、dpapi、production/resources、production/qualification、bootstrap/config、NativeRuntime、harness/index 与历史 M1.8 逐字节相同。Vault 仍在 `vault.ts:255` 拒绝 LIVE，`:231` assurance 固定 SIMULATED，`:353-355` 只接受 synthetic-test- 值；Gateway 还要求 Vault 与 Transport assurance 相同。合成 DPAPI roundtrip 不足以改变这些状态。

DPAPI helper 使用固定公开 entropy 和 CurrentUser，spawn 未切换 OS 身份。WeakSet 管理 capability 与 facade 字段缺失只构成可信本地库边界；它们不能阻止同 SID 代码另开数据库或调用 CurrentUser 解密。Vault 在 Windows 没有验证 owner/DACL，PowerShell 参数只校验路径形态，helper/executable 未通过该 Vault 自身完成代码 hash/ACL 资格。Host 内仍有无法承诺擦除的字符串副本；只能陈述最小暴露与 best-effort 清零。

历史原始日志 `M1.8/evidence/verification/all-tests.tap:1184` 与测试 `m15-pipe.test.ts:286` 明确记录生产跨账户测试 NOT_RUN：批准的不同标准账户、部署 ACL/profile 和启动对象缺失。bootstrap/config 要求 Host/Worker/Operator 互异 SID 并从真实 native attestation 读取标准账户/进程身份；NativeRuntime 要求预置 Worker 身份与 AppContainer；production/resources 仍硬拒绝 REAL_WINDOWS。自报 QUALIFIED 回调不构成任何 OS 资格。

最小可信凭证入口需在批准且已验真的隔离部署中，由可信 Host 接受本地 masked 输入，以固定且受保护的 helper/服务处理有界匿名管道，原子保存密文；不得经聊天、argv、env 或临时明文文件传入。Worker 仅持有 scoped completion capability，固定 Host dispatch 内使用凭证，不提供 readSecret 或任意目的 endpoint。若未授权系统变更，只能只读验证已有部署；现有证据不足，不能靠新增入口代码闭合。本轮没有接收或发现真实 Key，也没有新启用 LIVE 入口。

## 独立执行与未执行项

- 冻结候选上独立执行 `node --test --test-reporter=tap tests/agentnexus/m181-adapter.test.ts`：21 PASS / 0 FAIL / 0 SKIP。原始 TAP 嵌入机器记录。
- 独立内存复现原 P2，修复后复验六种无效完成值与七种伪造回执 patch；只证明真实模块的入参和状态语义，不替代 SQLite 事务、跨进程或 OS 试验。
- 新增 m181-control 中的 SQLite 并发、跨 reopen、UNKNOWN、撤销、secret 和 Gateway 接缝测试已阅读；已核对主代理最终 results 中全部 41 项 M181 用例为 PASS，包含本次布尔修复与回执拒绝测试。整体 681 项仍有 14 FAIL、32 SKIP；这是主代理执行、审查代理核对的证据，与审查代理独立执行的 21 项 Adapter 测试分开记录。
- 未调用网络，未读取环境变量或真实凭证/凭证存储，未调整账户/ACL/profile，未改历史交付。真实 Provider、实际费用、自主 Reviewer、长期 Resident、任意 Worker 代码执行与 OS 攻击试验均不在本审查的已验证范围。

