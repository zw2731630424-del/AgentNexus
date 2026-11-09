# Q2 独立安全复审

日期：2026-11-09。审查对象：Q2 最终候选源码；冻结 M1.8.3/Q1 只读。

## 结论

**已审源码和纯/合成协议子范围通过；Q2 生产验收未完成。生产 Daily：BLOCKED；Helper 可信内存隔离：BLOCKED；真实目标 Windows 攻击：70 项 NOT_RUN、0 PASS；真实 Key/API：NOT_RUN。**

源码明确缺少服务创建并保护 Runtime 的 native 来源认证链；没有生产 Daily listener 或 Runtime 注册接口，`connectCredentialService()` 直接返回阻断端口。普通 Electron 无法通过开关、PID/path/hash/SID 或 `native_verified` 字段获得 Daily authority。这个失败关闭行为已验证，不能称为 Daily 已实现并通过生产资格。

针对自有良性目标的真实攻击验证已获授权。本轮不能执行目标边界测试的实际原因是：目标服务/Helper 未部署、系统部署未获批准、Daily native 链未实现。本轮实际运行过同账户的独立合成服务子进程、流式 IPC 和 crash/restart；这些是协议证据，不能代替已部署目标的 Windows 注入/句柄/ACL/内存隔离证据。

## 审查范围与哈希

33 个已审文件的完整 SHA-256、字节数和审查深度记录在 [reviewed-file-hashes.json](../evidence/independent-review/reviewed-file-hashes.json)。范围包含 Daily grant/gateway/store/broker/engine/client、native 服务身份与方法路由、Helper parser/protocol/form、固定 launcher、Desktop main/preload/管理端口/renderer 的 Q2 变更和对应测试。

旧模块采用明确的复用范围：既有 Gateway、Adapters、Transport、Runtime broker 与 Windows NativeProbe 和冻结 M1.8.3 源码逐字节相同，见 [reused-runtime-comparison.json](../evidence/independent-review/reused-runtime-comparison.json)。这说明 Q2 没有重写它们，不代表本次重新完整审计了旧模块。

native `CreateListener` 完整函数与冻结源文本相同：规范化换行后的 SHA-256 均为 `a9fb033bea28b6aa917b41bcf38a377835113e3ab5243d6371ca511b6ddcc3e9`，见 [high-pipe-creation-comparison.json](../evidence/independent-review/high-pipe-creation-comparison.json)。High DACL/mandatory label、首实例和远程拒绝创建参数未放宽；Q2 额外限制了真实消息 token/固定 Helper 映像及管理方法白名单。这是源码比较，未运行真实 pipe 资格测试。

本独立审查的交付写入范围为报告、测试计划和 `evidence/independent-review/`；临时状态写入下述 Q2 runtime，没有修改产品实现。最终哈希在增量测试后再次核对；早期未稳定源码的前/后哈希和原始日志保留，没有冒充最终版本证据。

收尾时将测试 fixture 的 SQLite 临时状态统一改到工作区 `.workflow-kit/runtime/AgentNexus-M1.8.3-Q2/independent-review-state/`。原交付目录中的 48 个合成数据库已安全移动到该 runtime 的独立迁移子目录，无覆盖或删除，逐文件迁移前后 SHA-256 一致，见 [迁移清单](../evidence/independent-review/state-runtime-migration.json)。只修改独立 fixture 的 `stateBase`，没有修改产品源码；路径修正后再次运行 14/14 PASS，交付目录不再含该 fixture 的数据库。新 fixture 哈希和运行回执见 [runtime 回执](../evidence/independent-review/fixture-runtime-receipt.json)。

## 实际执行

Node 为 `24.15.0`。Node 测试工作目录为 Q2 `source/`。完整命令、退出码、历史阶段、来源哈希和日志位置见 [test-run-index.json](../evidence/independent-review/test-run-index.json)。下列数字为各套件的实际检查数；历史重复运行不重复累加。

| 套件 | 结果 | 证据及范围 |
|---|---:|---|
| 独立编写的协议攻击 | 14/14 PASS | [adversarial-protocol.test.mjs](../evidence/independent-review/adversarial-protocol.test.mjs)、[runtime 路径修正后的 TAP](../evidence/independent-review/runtime-state-attacks.tap.log)；仅合成 broker/fixture，旧 core TAP 保留 |
| Q2 Daily | 22/22 PASS | [最终增量 TAP](../evidence/independent-review/final-incremental-tests.tap.log)；包含真实子进程中的合成 IPC、stream 与 crash，不构成 OS 隔离 |
| Q2 Desktop 管理契约 | 10/10 PASS | [最终 Desktop TAP](../evidence/independent-review/final-desktop-tests.tap.log)；spawn/文件存在性由 fixture 替代，未运行 launcher 正常入口 |
| 既有 Desktop service 回归 | 14/14 PASS | 最终增量 TAP；明确 synthetic credential fixture |
| Helper 独立重编与纯自测 | 117/117 PASS | [最终 Helper 结果](../evidence/independent-review/native-helper-final-review-results.json)；没有 UI/token/pipe/UAC/网络 |
| Launcher 独立重编与纯自测 | 21/21 PASS | [native 结果](../evidence/independent-review/native-pure-review-results.json)；只执行 `--self-test`，不调用 `runas` |
| Native service 独立重编与纯自测 | 40/40 PASS | 同上；fake token/MemoryStream/资格状态谓词，不安装或启动服务 |
| 实际合成 snapshot 的跨语言契约探针 | 4/4 PASS | [探针源码](../evidence/independent-review/SnapshotContractProbe.cs)、[最新结果](../evidence/independent-review/runtime-state-snapshot-contract-result.json)；真实 broker JSON 被 C# Helper 解析，包含旧名称/空 scope 与严格 schema 拒绝 |

独立 native 编译使用系统 C# 5 编译器、固定源码和 `asInvoker` manifest。审查目录中的 `*-pure-review.exe` 是用于显式自测分支的本地证据构建，采用 console target 便于捕获输出；不是签名/安装的生产 Helper，也不是部署资格。未运行其正常入口。

关键命令：

```text
node --test --test-concurrency=1 --test-reporter=tap <Q2>/evidence/independent-review/adversarial-protocol.test.mjs tests/agentnexus/q2-daily.test.ts
node --test --test-concurrency=1 --test-reporter=tap tests/agentnexus/q2-daily.test.ts tests/desktop/service.test.ts tests/desktop/q2-trusted-entry.test.ts
node --test --test-concurrency=1 --test-reporter=tap tests/desktop/q2-trusted-entry.test.ts
<Q2>/evidence/independent-review/run-native-pure-review.ps1
<Q2>/evidence/independent-review/run-native-pure-review.ps1 -HelperOnly
```

## 已验证的协议性质

- 服务端持久保存 exact grant；绑定 service instance、Runtime/channel、subject、完整 input hash、body/context hash、Key handle、provider/model、policy epoch、operation/nonce、deadline 与 token 预留。客户端拼凑相同公开字段不能注册生产 Runtime。
- Daily grant 消费、prepared/operation/nonce claim 和四级 token hold 位于同一 SQLite `BEGIN IMMEDIATE` 事务；不足预算整体回滚。旧 broker 不能拿已发 Daily grant 的 binding 绕过消费，两个并发副本最多一次 fixture send。
- 跨连接、替换 Runtime、disconnect、重启、过期、撤销、输入/授权字段变化均拒绝；待发 grant 可由所属通道取消且不会发送。
- Daily 与旧 broker 使用同一服务账本。缺 usage、发送后超时/取消、stream 断开或合成服务 crash 保留 UNKNOWN/冻结，重启不恢复旧授权，不自动重试。
- 普通 Host 的 `credential.save` 在读取旧 payload 前拒绝；真实端口不能启用 synthetic compatibility 模块。renderer/preload 不再提供 Key 输入或 secret relay，固定 launcher 只接受非秘密枚举意图、最小环境与固定路径。
- Helper 在自有窗口确认后才申请短 ticket；同通道绑定 operation、metadata hash 和 secret hash。票据过期、取消、断线和提交 fence 失败不回退。mutation 尝试后的未知结果不伪装成功；`CREDENTIAL_SAVED` 不等于 `PROVIDER_CONNECTED`，不可用 usage 不伪造为已知零。

上述结论来自列出的源码和 fixture 观察。TypeScript `private`、WeakSet、工厂函数和内存里的 JSON 对象本身不构成 OS 安全边界。

## 审查发现与处置

| 编号 | 发现 | 最终处置 |
|---|---|---|
| R1 | 初始 Daily cancel 只能取消 active 请求，不能撤销已签发但尚未发送的 grant | 已修复服务端按所属 channel/runtime 撤销 ISSUED grant；独立攻击与 Daily 回归确认 REVOKED、0 send |
| R2 | Helper 原来只允许五字段 snapshot，服务已增加 `daily_gateway`，两个自建 fixture 未发现跨语言不兼容 | 已统一六字段 snapshot 和 Daily 五字段状态；实际合成 broker JSON 的 C# 探针 4/4 PASS |
| R3 | 新名称白名单/非空模型要求套在历史 Key 管理路径，旧标签或空 scope 可能无法禁用/删除；各层 CLI 接受范围曾不一致 | 已使用固定非秘密管理名、从服务 snapshot 安全显示并比较旧目标；DISABLE/DELETE/MODELS 的空 scope 一致，UI 共用 `ConfirmedScope`；拒全零 UUID，TS/native 名称长度/BMP 范围一致；纯测及 Desktop 回归通过 |
| B1 | 没有 native 可信 Runtime 来源、创建保护和生命周期注册链 | **生产阻断仍存在**；不提供 medium listener/生产注册 factory，Daily 不可开启 |
| B2 | Helper 未实现并证明严格的 process/thread/token 对象保护，未验证同 SID 内存/句柄/dump 与真实输入桌面 | **真实 Key 与可信内存资格阻断仍存在**；High IL/固定路径/hash 不作为 VM_READ 或完全清零证明 |
| B3 | 没有已部署目标与真实 Windows 70 项攻击证据 | **目标 OS 资格仍未通过**；纯测试、合成 child process 和缺部署负测不填入 OS PASS |

## 生产前仍缺的证据

首先必须实现和部署真实可信来源链，再验证同 SID 对手无法写/读可信进程内存、改线程/token/owner/DACL、复制或继承授权句柄、替换依赖闭包、通过 CLR/loader/debug/cwd/env 改变启动，以及跨 session/重启伪造来源。固定 Desktop launcher 环境已在源码与 fixture 中收紧；`runas` 实际环境传播和目标进程对象保护仍未实测。

MIC 默认的写完整性控制不自动提供应用身份或完整内存保密；`PROCESS_DUP_HANDLE` 等权限还可能放大访问能力。应以实际对象权限和原始拒绝记录验证，不能只看 PID/path/hash/SID。[Mandatory Integrity Control](https://learn.microsoft.com/en-us/windows/win32/secauthz/mandatory-integrity-control)、[Process Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights)

Helper 掩码、清空控件和可变 byte buffer 覆盖不能保证 CLR/JS immutable string、剪贴板历史、运行库副本或 dump 无明文。当前没有验证真实 Key 输入、UAC 全链路、可信输入桌面、clipboard/dump、AppContainer 或真实 API。

方案比较见 [daily-trust-options.md](daily-trust-options.md)；70 项目标 Windows 测试计划见 [windows-attack-tests.json](../tests/windows-attack-tests.json)，资格见 [windows-qualification.json](../tests/windows-qualification.json)。**这些阻断未解除前，不批准 Q2 生产 Daily 或真实 Key 安全验收。**
