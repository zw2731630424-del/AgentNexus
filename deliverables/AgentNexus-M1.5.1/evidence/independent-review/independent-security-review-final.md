# AgentNexus M1.5.1 独立代码审查

结论：**限定代码审查通过（PASS_LIMITED）；完整 Windows 生产执行与资源释放仍 BLOCKED。** 在下述范围未识别可实际触发的开放 P0/P1。已知累计 CPU 硬预算失败仍是能力阻断，不因证书、设置读回或偶然 PASS 解除。

## 最终字节绑定

最终源码 **100 文件**，集合 SHA256 `4825d2432a01a497a68971fab57909bc9613b38ff087346afbcceba56f7aa9fa`。作者清单、审查者独占副本、探针后当前源码及源码 ZIP 的全部成员逐路径、字节数、SHA256 一致。相对 M1.5 为 **5 改、9 新增、0 删除**。ZIP SHA256 `fe1ba2e62bd651a4ed6741b1540bd9e0e103484a398734b986d461688ca0b645`。独立核对详见 [final-byte-verification.json](final-byte-verification.json)、[逐文件与覆盖清单](final-source-manifest.json)和[完整差异](final-diff.patch)。

## 阅读与独立性

全文审查 M1.5 的 43 个产品 TS、12 个 TS 测试，以及指定继承 Python checker、mjs/Python 工具和非原生专用 fixture。两份大目录采用完整 JSON 结构解析及所有值遍历，未宣称逐字阅读目录说明：170 Feature、44 Policy，无重复键或 ID，保护功能默认 OFF、L0 不可降级。M1.2/1.3/1.4 历史验收与独立报告、M1.2 issue ledger、ADR001–029、M1.5 独立报告 MD/JSON 原件均已核读。全部读取路径和 SHA256 见 [reading-manifest.json](reading-manifest.json)。

最终全部新增文件已全文复核；NativeRuntime 的全部改动和相邻 launch/cleanup 上下文已复核。新增内容是时间戳、逐成员 CPU 统计和 CloseHandle 返回观察；预算、截止和 Job 策略未改弱。继承 native C#/PowerShell 和两个原生专用 TS 的全文复读由主代理负责，本独立报告不扩大声称。

审查者未修改产品、规则或历史原件，未递归派发，未修改账户、ACL、Profile、服务或防火墙，未连接 Provider 或读取 Key。仅写本目录及独占合成模型数据。

## 独立验证

独立编写的 [boundary-probe.mjs](boundary-probe.mjs) 在最终副本执行 **10/10 按预期，0 FAIL，exit 0**。原始 [stdout](boundary-probe.stdout.json)、[stderr](boundary-probe.stderr.txt) 和 [运行绑定](probe-run.json)完整保留。所有 OS 身份和观察均为 SIMULATED；测试中的 `REAL_WINDOWS` 是负例输入标签。真实部分仅临时签名、SQLite、Artifact 和字节校验。没有启动 native Worker 或 CPU 负载。

| 重点 | 独立结果及限定 |
|---|---|
| 能力门禁 | 有效签名、15 个完整 checks 的 REAL_WINDOWS certificate 仍报 `M151_CPU_HARD_LIMIT_NOT_QUALIFIED`；Broker 消费和 start 均为 0 |
| 原 Gateway | PROCESS/EXTERNAL_EFFECT 即使精确审批、requires_sandbox=false、PDP DISABLED，仍 BLOCKED，handler 调用为 0 |
| Audit 失败 | Bootstrap flush 注入后 native prepare 为 0；Broker durable barrier 注入后 start 为 0，原 Permit 重放拒绝并保持 UNKNOWN |
| ExitProof | network/filesystem/limits 任一个 false、模型来源、unknown member 或未闭合 output 均不能产生释放 authority |
| closure/IPC | unknown IPC 保留全部五 claim，payload/MAC 变更拒绝 |

QualificationGate 构造及本地 Host 模型夹具可初始化，仅证明这些代码路径不被新增门禁误伤；生产 Host 的真实 attestation/启动没有执行。新增固定门禁属于合同强化，本报告没有把原先受信任 TCB 签发资格的能力误报为不可信 Worker 绕过。

## 保留的阻断与验证限度

CPU 新工具的 58 个预定场景计划、80/300/3000ms 预算及原容差已静态复核；任何失败使总结果 FAIL，有限样本全成功仍 INCONCLUSIVE，production_qualified 始终 false。审查者未运行 CPU 全套或据作者旧断言的 PASS 宣称 CPU 资格通过。

真实跨账户、启动对象/私钥 ACL、组合文件/网络/管理库/跨项目隔离、完整成员与 producer 历史、真实 Host 重启、完整 ExitProof/owner release、硬磁盘限制、OS 重启/断电及 Ubuntu 仍需独立证据。WindowsSupervisor 的 network/filesystem/limits 仍 false；同账户原语不能补齐。未知资源和准备槽不得自动释放。

作者最终完整回归、严格 tsc、同账户 native 和 CPU 原始结果不计入本报告的独立执行数。本审查未独立重跑这些测试。结论仅绑定上述 100 文件；后续源码改变须重新核对。

机器报告：[independent-security-review-final.json](independent-security-review-final.json)。
