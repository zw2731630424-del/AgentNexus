# AgentNexus M1.4 独立安全审查最终报告

结论：**限定源码审查通过；审查范围内已反馈问题均完成源码复核，无已确认开放问题。生产部署仍 BLOCKED。**

审查者 `/root/baseline_reader` 使用独立上下文，禁止递归，未修改产品。早期执行过限定模型探针；收到停止探针要求后只读复核修复，未独立复跑最终产品套件、Windows 原语或系统部署。主代理负责实现、回归和原始日志归档。

## 最终绑定

源码根：`I:\AI_AgentNexus\deliverables\AgentNexus-M1.4\source`。下列集合均来自本次冻结后的实际文件，先前中间指纹不作为最终绑定。算法：路径以 `/` 规范化，排序后连接 UTF-8 `path + NUL + lowercase SHA256 + LF` 再 SHA256。

- 全部源码 67 文件：`e2f95cb5c7557660dfbbf3cfcbb2a03a78460f9b408e66bd2fbb3f6ea96e3a88`
- 完整 production 目录 15 文件：`bcc6455f1d7efed4a1a1ab75a57def04d97b42bcfc5e9818249b338f58378e66`
- production + reconciliation 16 文件：`3e62e326b60648dc07a21135c2bc631852870c7057d1ef737dd222c8d1c813b5`
- 重点完整阅读文件 23 文件：`e4d18a4760449147725b0e7ca84894348fbac3b8c8867de29c2442d030be0d4b`
- 全部新增或改变文件 28 文件：`4daa64c03a5a8b51e3b5c095dfb77351c67a7c494ab9f8e6e97e6ca1e53dc075`

完整逐文件长度和 SHA256 见同目录 `final-review.json` 的 `source_binding.all_source_files`；本文附重点文件指纹。M1.3 根工作树45文件仍与冻结集 `6a2f9f9f60c86ec7d72c4f64357172d604786ad0defe03c220b67156fb410005` 相等。

## 阅读范围与方法

M1.3：全文读取16个非 runtime 源码（含两checker）、13个测试/fixture、7个工具，ADR001—013、M1.2 Operation Reconciliation、M1.3验收/独立审查MD与JSON/部署授权及相关设计。M1.3 runtime 的全文复读由主代理负责；本审查独立核查其哈希并按需读取合同，不扩大声称。

M1.4：全文读取 production 内13个TypeScript模块、NativeRuntime.cs和runtime.ps1，更新后的 reconciliation，五个新增测试/fixture，preflight-m14.ps1与verify-m14.mjs。两个catalog均完整程序解析比较：原154 Feature与41 Policy对象保持相等；新增11 Feature默认OFF，新增3独立L0 Policy不可降级；policy-contracts及security.test差异已复核。

## 发现闭合

| ID | 问题 | 最终修复复核 |
|---|---|---|
| M14-IR-01 | Audit logical role polluted exact AuditInput fields | Explicit four-field identity projection. |
| M14-IR-02 | Mutable CREATE content and invalid-input slot accounting | Validate bounded Uint8Array inside try, copy before awaiting, and compare actual result hash to signed content hash. |
| M14-IR-03 | File grant wall rollback and original Permit monotonic expiry | Latched rollback rejection, wall/monotonic fence, and original consumed Permit lease check. |
| M14-IR-04 | Unsettled file/identity observations and pending admission limits | Bounded deadlines/abort, retained unsettled quotas and admission limits. |
| M14-IR-05 | Disconnected cyclic exit parent graph accepted as complete | Each member parent chain must reach the unique pinned root and reject cycles. |
| M14-IR-06 | Asynchronous file commit and expired Envelope start fences | Recheck within the native work microtask; validate deadline before/after observations and synchronously before start. |
| M14-IR-07 | Unverified exit retired supervision and returned production PASS | Incomplete evidence terminates/quarantines and retains active work; REAL returns INCONCLUSIVE, nonzero exit FAIL. |
| M14-IR-08 | Stale boot/resource-version release authorization | Current boot, allowed Host state, five HELD resource versions and single consumption rechecked inside reconciliation transaction. |
| M14-IR-09 | Registry close left existing authorizations readable as ACTIVE | Closed inspect refuses immediately, fencing Gateway and endpoint callers. |
| M14-IR-10 | Remote recovery inferred local NOT_INVOKED and missed inflight operations | Remote recovery retains UNKNOWN; persistent inflight flag blocks adjudication until retired/recovered. |
| M14-IR-11 | Remote Artifact import was outside the Host deadline | Send and accept share timeout/cancellation; Artifact puts receive AbortSignal, raw hash/bytes verified before proof insertion. |
| M14-IR-12 | Service disconnect lacked operation ownership | Broker owns channel-to-operation mapping and terminates/quarantines without accepting caller-supplied operation ownership. |
| M14-IR-13 | Consumed failures lost operation ID and claimed NOT_RESERVED | Committed flag survives cleanup failures; Host preserves association and returns INCONCLUSIVE/UNKNOWN for consumed or storage-uncertain paths. |
| M14-IR-14 | Signed Broker proof envelope was not retained for offline verification | Immutable signed_packet remains separate from original proof body and Host imports; audit binds packet hash and owner release re-verifies with pinned Broker public key. |

所有闭合状态为 `RESOLVED_SOURCE_RECHECKED`，不等于审查者独立重跑通过。文件CREATE复制修复在早期模型探针中亦观察到实际仍写GOOD，但没有声称修前已实测该漏洞。

## 新增平台桥接与释放边界

WindowsSupervisor仅从固定可信工具映射调用 sandbox.prepare，先取得真实挂起进程的钉住身份，再bind/签发Grant/ready/resume。与native RPC参数及响应已对读。native始终保留 membership_complete=false、unknown_members=true；Node适配器的network/filesystem/limits验证为false，完整生产退出证明不能由这些候选观察产生。token.restrict读取原token的权限为0x8A，生产launch为0x8B；降低完整性只作用于受限克隆。

远程stdout/stderr通过Host ArtifactStore流式导入，核对原文hash和bytes；Host imports与Broker原始proof body分开。完整signed_packet独立不可变保存，审计绑定包hash，owner release再次使用固定Broker公钥重验。释放还要求最终非UNKNOWN裁定、当前boot/Host状态、五类HELD资源精确版本、单次凭据及事务审计。

## 探针与日志的精确边界

早期结果：`I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.4\independent-review\node-review-6hxiXS\probe-results.json`，SHA256 `1d1d10ae0a3da76115c4d5159d695f1c83146587df580cd88e05f243189daf4c`。其source_sha256记录当时9模块；该旧快照不等于本报告最终源码。探针的时钟、NativeFileOwner和退出观察均SIMULATED；真实部分仅合成SQLite、Artifact和文件字节。曾观察过期grant回拨复活、8个未完成文件owner占槽、循环父链误获verified；修复后仅源码复核。首个inline探针在Audit字段校验处失败，其堆栈留在工具记录。

测试源码中的独立Broker/Worker确实创建OS进程，但身份、peer、Job、资格和释放安全观察明确SIMULATED。native测试新增原始JSONL保存与orphan窗口断言已经阅读；不能把新增断言本身写成已观察到窗口。

以下作者结果JSON经完整程序解析并核查指纹；原始TAP未逐行重审，未独立重跑：

- `I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.4\verification\2026-11-07T08-18-19-092Z-37232\results.json`：247 PASS / 1 FAIL / 4 NOT_RUN；source集 `00c0400476a4520017a77810b00cdd5f62e4ac362706f6e5ff86a3278e35ce20`；与本报告最终source一致=False。
- `I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.4\verification\2026-11-07T08-24-21-740Z-3348\results.json`：250 PASS / 0 FAIL / 4 NOT_RUN；source集 `d2fb39ea08708360937d0d203f1fe4dffa2e627728d7ccc5e9bacfcee9def165`；与本报告最终source一致=False。
- `I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.4\verification\2026-11-07T08-30-22-409Z-37176\results.json`：251 PASS / 0 FAIL / 4 NOT_RUN；source集 `e2f95cb5c7557660dfbbf3cfcbb2a03a78460f9b408e66bd2fbb3f6ea96e3a88`；与本报告最终source一致=True。

若旧run源码指纹与当前冻结源码不等，本报告不以其通过数背书当前完整候选。最终套件绑定应由主代理归档的新run单独确认；保留中间失败。

## 剩余部署限制

- Default qualification certificates are empty. No production dispatch is admitted by default.
- WindowsSupervisor uses fixed trusted tool mapping and pinned suspended prepare/bind/grant/resume interface. Native observations retain membership_complete=false and unknown_members=true; network/filesystem/limits are not certified by the adapter, so no production release proof is emitted.
- Restricted-token source access masks are 0x8A for token.restrict and 0x8B for launch; only the restricted clone is adjusted. Their source was rechecked, not independently run.
- Real OS subprocess fixture has SIMULATED peer, identity, Job, qualification and release security. A real subprocess does not prove real OS security.
- Separate approved accounts, profiles, ACLs, protected IPC, complete process membership, hard file/disk limits, final platform qualification, OS reboot/hard-power-loss and Ubuntu remain separate blocked/not-run acceptance work.
- Native helper termination or Promise completion is not proof of full OS tree exit; unknown claims/outputs remain retained.
- Final current source fingerprints are independent of older author run fingerprints. Older PASS/FAIL records are retained; mismatched run snapshots are not presented as final-candidate test success.
- Node syntax checks and this source review do not establish static tsc correctness.

preflight-m14.ps1仅只读指定两个本地账户及精确部署目录的SID/SDDL和现有解释器hash，不创建或修改账户、ACL、profile、登录权或计划任务。本审查者未复跑该预检。

## 重点文件指纹

| 相对源码根路径 | 字节数 | SHA256 |
|---|---:|---|
| src/agentnexus/production/audit.ts | 1494 | `51ede7c82086d72707cc965891a673e2addf4cfd6efdf836b534988823c485f8` |
| src/agentnexus/production/authority.ts | 12255 | `077375d153e6ebf9bf7770ceb8a10bd08771d890eab1acbbb82042227f68403b` |
| src/agentnexus/production/broker.ts | 14633 | `5417e6aaac86a4761fb1fe04560efe738377d5f25ac6add6e427687cccb50265` |
| src/agentnexus/production/contracts.ts | 7066 | `5449450e3356bcab0b94892e70909aa6e4d62f8b6554b5d83a9edfb761d070e7` |
| src/agentnexus/production/exit.ts | 11265 | `5d0dec6661cd9a44aa602542c223d45a7ee13f5df149188255f6dcb61f23b512` |
| src/agentnexus/production/file-broker.ts | 10109 | `9cea18dcb22023fa440e5901ada7df85c96c5b01f9e7e53e5e5e13c99bd52c72` |
| src/agentnexus/production/host.ts | 5540 | `c849b9d28e583937449b63f863f147dcc51e683ee378edac44fc77245ab5c3ff` |
| src/agentnexus/production/identity.ts | 6805 | `157d276bd002b5b624d40675e41b67d1beab86a1db478ba50b8a64324e24bba1` |
| src/agentnexus/production/native-client.ts | 6524 | `997c8e4a523ad1aa67bbc7886d133ada88bfea7f3c9cdb26fe30705d606b036d` |
| src/agentnexus/production/qualification.ts | 2573 | `3c241da34dce87591abfc3ef2562c6005f62319fbf8152a44305b121d89f8b8c` |
| src/agentnexus/production/service.ts | 1626 | `4954b7cc8e005d961ee6408dd161046c8337c44dfe3b3439d1a2b289fdc2150d` |
| src/agentnexus/production/transport.ts | 5979 | `1f7fe06f7407a474411a16b762aee406df457f7a8895efdb366d35971bc777f6` |
| src/agentnexus/production/windows/NativeRuntime.cs | 63896 | `d21ead08ccffeb54d9dc05988608960e6ab842f4518bc80ecc8d9aa6e1328482` |
| src/agentnexus/production/windows/runtime.ps1 | 6439 | `c4033d404518dc24711af102f3ac87ddef70b2276bc2326c253af525f8cb2dbc` |
| src/agentnexus/production/windows-supervisor.ts | 8603 | `918f053e11f6f26e502bcc186515473c3ba704367ea4d27640bb3406618bb4d4` |
| src/agentnexus/reconciliation.ts | 14568 | `9f65ae9b5b0e4f049efabfadc1cb5ad263ce0b5ea7703a15bb8789f27d3f1906` |
| tests/agentnexus/m14-adapter.test.ts | 2160 | `e40821919ac3eb487768baf155284d4458834c3b95638f50f2ded8581163ee85` |
| tests/agentnexus/m14-broker-child.mjs | 4995 | `bc6800f9f0219114babbe61ffb022302c9892117228947f7eecd633fa77ec58c` |
| tests/agentnexus/m14-native-worker.mjs | 1382 | `501e013660d7f11119f79455cc17669aa47e0bbe7c2c4491071e058e7edd66a5` |
| tests/agentnexus/m14-native.test.ts | 20352 | `4a9994d283d2e5280ab5cefbab701edfb92f12de688ae8474c7280de102681af` |
| tests/agentnexus/m14-production.test.ts | 37811 | `c199b61c265f43642d58fd7bf657385029d3a69eee0e9d1375c50850b9643b52` |
| tools/agentnexus/preflight-m14.ps1 | 2139 | `19f7e4b735569a699013e7b11f3616b346ff6c3588d9983db2340d9f37353d80` |
| tools/agentnexus/verify-m14.mjs | 4722 | `a19fdee34e0f5b13f53d5471ff30a4d305d88e7f9ed2b36565c02ebee6d7b745` |

审查范围到此冻结；后续产品文件变化需要重新绑定，不能沿用旧集合声称审查过新字节。
