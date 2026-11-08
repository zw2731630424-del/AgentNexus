# M1.8.1 原14项FAIL逐项裁定

原14项没有已证M1.8.1新增回归。13项裁为ENVIRONMENT_LIMITATION，1项为TEST_FIXTURE_ERROR；历史关系、每项原断言、原错误、五组结果、安全/Provider影响、整改与原验收标准均在[机器矩阵](../evidence/failure-matrix.json)。未改变任何原FAIL为PASS。

## M182-HIST-01 — M151 REAL_WINDOWS_PRIMITIVE: concurrent directory replacement never returns junction target bytes

文件`tests/agentnexus/m151-boundaries.test.ts:34`；断言摘要：`assert.ok(swaps>0,'fixture must actually install junction replacements')`。

裁定 **ENVIRONMENT_LIMITATION**。原fixture swaps=0；当前真实junction创建EPERM，rename对照成功。缺少攻击切换前提，未执行有效junction竞争，不能推出TOCTOU资格。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；PROCESS组合资格保持BLOCKED。

整改：在经批准且允许junction夹具的隔离部署复跑原合同；不更改swaps>0断言。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-02 — M151 REAL_WINDOWS_PRIMITIVE: CREATE_BREAKAWAY_FROM_JOB is denied by the private Job

文件`tests/agentnexus/m151-lifecycle.test.ts:42`；断言摘要：`rpc.good primitive.prepare / primitive.resume requires ok=true; packet.created=false and win32_error=5`。

裁定 **TEST_FIXTURE_ERROR**。选入WindowsApps的pwsh.exe无法通过native目录句柄锚定，primitive.prepare先报NtCreateFile WIN32_5，尚未运行breakaway断言。相同broker读Node路径到达FILE_LIMIT，读该pwsh路径复现WIN32_5。历史M1.8交付也失败。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；PROCESS组合资格保持BLOCKED。

整改：选择已授权、可由固定broker锚定的PowerShell部署，核对可执行文件/依赖哈希与权限，再原样验证breakaway。当前不安装或改系统。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-03 — M161 GATE actual file candidate is bound from trusted PASS to the approved Storage input

文件`tests/agentnexus/m161-harness.test.ts:47`；断言摘要：`execute(h).state === 'SUCCEEDED'; published bytes === approved A`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-04 — M161 STORAGE real atomic CREATE binds exact approval, content, Artifact/Audit and persistent budget ownership

文件`tests/agentnexus/m161-storage.test.ts:18`；断言摘要：`result.state === 'SUCCEEDED'; exact hash / Audit ACK / persistent budget ownership`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-05 — M161 STORAGE REPLACE requires the exact owned version; original Artifact remains reconstructible

文件`tests/agentnexus/m161-storage.test.ts:45`；断言摘要：`first and replacement execute(h).state === 'SUCCEEDED'; retained original artifact / exact version`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-06 — M161 STORAGE bounded streaming verifies 3 MiB without materializing the input in the request

文件`tests/agentnexus/m161-storage.test.ts:55`；断言摘要：`execute(h).state === 'SUCCEEDED'; streamed 3MiB file size/hash`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-07 — M161 STORAGE publish-link gap is reconciled by identity/hash without republishing

文件`tests/agentnexus/m161-storage.test.ts:68`；断言摘要：`after injected UNLINK_TEMP interruption: target nlink=2; explicit reconciliation nlink=1`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-08 — M161 STORAGE concurrent same-resource writers conflict before the second file effect

文件`tests/agentnexus/m161-storage.test.ts:76`；断言摘要：`first writer state === 'SUCCEEDED'; second state FAILED / WORKSPACE_BUSY`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-09 — M161 STORAGE changed bytes between publication and ACK stay UNKNOWN and cannot be reconciled by pathname

文件`tests/agentnexus/m161-storage.test.ts:85`；断言摘要：`w.reason === 'STORAGE_PUBLICATION_CHANGED_BEFORE_ACK'`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-10 — M161 STORAGE persistent resource quota rejects a second allocation before a temporary object

文件`tests/agentnexus/m161-storage.test.ts:92`；断言摘要：`first write SUCCEEDED; second exceeds persistent quota before temporary object`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-11 — M161 STORAGE REAL_PROCESS_CRASH at UNLINK_TEMP preserves evidence and never automatically retries

文件`tests/agentnexus/m161-storage.test.ts:101`；断言摘要：`child must reach and send operation_id at UNLINK_TEMP; recovery RECONCILED without republishing`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-12 — M161 STORAGE REAL_PROCESS_CRASH at PUBLISHED preserves evidence and never automatically retries

文件`tests/agentnexus/m161-storage.test.ts:101`；断言摘要：`child must reach and send operation_id at PUBLISHED; recovery RECONCILED without republishing`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-13 — M161 STORAGE REAL_PROCESS_CRASH at AUDIT_ACKNOWLEDGED preserves evidence and never automatically retries

文件`tests/agentnexus/m161-storage.test.ts:101`；断言摘要：`child must reach and send operation_id at AUDIT_ACKNOWLEDGED; original ACK remains`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## M182-HIST-14 — M17 Native Pilot actually publishes, reviews, repairs, restores and gates a complete CLI through a SIMULATED provider

文件`tests/agentnexus/m17-pilot.test.ts:10`；断言摘要：`runPilot report.status === 'PASS'; managed publication/review/repair/restore/gates`。

裁定 **ENVIRONMENT_LIMITATION**。StorageOwner CREATE在PUBLISH调用fs.link时EPERM；任务保持UNKNOWN_QUARANTINED，未形成persistent owner。该用例要求的发布/替换/恢复/配额/Gate/Pilot后续步骤因此不可达。实际独立managed-write探针到达CREATE_TEMP/WRITE_CHUNK/PUBLISH并记录EPERM，目标未发布，预算保留。 M1.8同环境FAIL，M1.8.1原始/复跑FAIL，M1.8.2最终FAIL。测试字节与M1.8一致，无本轮产品修复可关闭其部署前提。

安全正向/竞争/恢复证据缺失；失败保持拒绝/隔离，不能标安全资格PASS。 不直接改变Host HTTP协议；直接阻断Native Pilot受管源码发布与恢复。

整改：在具备no-clobber硬链接语义的获准Host环境复跑原合同及相关恢复链；保留UNKNOWN和占用，不以rename/覆盖回退制造通过。 验收：在真实获准部署满足原夹具前提后，原断言全部PASS并保留原始日志；不得将缺前提的跳过当PASS。

## 原始合同字节片段

以下片段按原M1.8.1测试文件行界提取，保留原换行字节和断言；机器矩阵还保留原始错误全文及五组结果。

- [M182-HIST-01](../evidence/test-contracts/M182-HIST-01.txt) — `tests/agentnexus/m151-boundaries.test.ts:34`
- [M182-HIST-02](../evidence/test-contracts/M182-HIST-02.txt) — `tests/agentnexus/m151-lifecycle.test.ts:42`
- [M182-HIST-03](../evidence/test-contracts/M182-HIST-03.txt) — `tests/agentnexus/m161-harness.test.ts:47`
- [M182-HIST-04](../evidence/test-contracts/M182-HIST-04.txt) — `tests/agentnexus/m161-storage.test.ts:18`
- [M182-HIST-05](../evidence/test-contracts/M182-HIST-05.txt) — `tests/agentnexus/m161-storage.test.ts:45`
- [M182-HIST-06](../evidence/test-contracts/M182-HIST-06.txt) — `tests/agentnexus/m161-storage.test.ts:55`
- [M182-HIST-07](../evidence/test-contracts/M182-HIST-07.txt) — `tests/agentnexus/m161-storage.test.ts:68`
- [M182-HIST-08](../evidence/test-contracts/M182-HIST-08.txt) — `tests/agentnexus/m161-storage.test.ts:76`
- [M182-HIST-09](../evidence/test-contracts/M182-HIST-09.txt) — `tests/agentnexus/m161-storage.test.ts:85`
- [M182-HIST-10](../evidence/test-contracts/M182-HIST-10.txt) — `tests/agentnexus/m161-storage.test.ts:92`
- [M182-HIST-11](../evidence/test-contracts/M182-HIST-11.txt) — `tests/agentnexus/m161-storage.test.ts:101`
- [M182-HIST-12](../evidence/test-contracts/M182-HIST-12.txt) — `tests/agentnexus/m161-storage.test.ts:101`
- [M182-HIST-13](../evidence/test-contracts/M182-HIST-13.txt) — `tests/agentnexus/m161-storage.test.ts:101`
- [M182-HIST-14](../evidence/test-contracts/M182-HIST-14.txt) — `tests/agentnexus/m17-pilot.test.ts:10`
