# AgentNexus v0.4 — M1 受限内核检查点

本轮已完成M0.1补充设计，并在准入通过后实际开发M1六项基础设施。交付的是可运行、可测试的本地可信库切片；**完整M1安全部署仍BLOCKED**，没有开放任意Shell、外部Harness、真实模型或科研执行。最终逐项真实计数和候选指纹见[verification.md](verification.md)、[test-results.json](../../../runtime/AgentNexus-v0.4-M1/test-results.json)和[源码快照](source_snapshot_manifest.json)。

## 实际实现

| 模块 | 已实现并进行本地验证的范围 | 未完成范围 |
|---|---|---|
| Feature Registry / Module Manager | ON/OFF/INHERIT、祖先OFF、作用域、依赖/冲突、preview hash/revision、epoch、排空/失败/显式恢复；迟到stop未settled不能恢复 | 目录不是142个已实现模块；通用模块参数Schema编辑、OS进程树排空、所有可选业务模块NOT_RUN |
| Policy三模式 | ENFORCE阻断、选定AUDIT_ONLY保留would-deny、DISABLED真正不调用应用PDP；双确认/范围/期限/重放防护，重启或到期冻结，实际持久链预检恢复 | 可信控制句柄不能代替OS管理员身份；全部34条Policy owner的完整验收NOT_RUN/BLOCKED |
| Context Archive | 独立context域、Agent级原始参数/结果对象Ref、流式无损Zstd、SHA校验、分页、真实子进程强杀/坏尾/outbox恢复 | Provider原始流、诊断子进程原始协议stdout/stderr逐项归档、敏感原文加密、检索Agent/摘要/向量/备份与硬断电/soak NOT_RUN |
| Audit Trail / Artifact / Decision | 完整操作封套、独立域/hash链、同库outbox、target刷盘屏障、执行前durable intent、实际结果/输出Ref、只读Task重建、正式决定独立记录 | Agent生命周期仅本地会话绑定/撤销；全部读取访问、诊断子进程sub-operation、Git/模型费用/五Agent/实验等生产者未完整接入，不能称全产品已覆盖 |
| Tool Gateway | 注册版本/参数冻结、Feature与Policy、单次许可消费、起跑前时限/epoch重查、SQLite单写者claim、结果不明保留、超时仍等实际处理器结束 | 无已验证的任意执行Sandbox；文件/Git/外部后端执行不准入，OS能力不由Policy旁路产生 |
| Development Intelligence | Python AST、PowerShell AST、JSON实际检查；Git/Python受限argv Schema、五维状态、Preview、OFF/旧版本/取消/排空与来源绑定 | Bash/Zsh/Ruff/Roslyn/TS/ESLint/YAML/SQL/Dockerfile/LSP等实际整合NOT_RUN；静态类型检查NOT_RUN |
| 原生包完整性 | 全相对路径双向清单、规范JSON、重复/冲突/逃逸拒绝、嵌套同名负例、预算、从不执行候选内容 | 敌对可变树恒不授PASS；Windows全reparse/ADS/TOCTOU及发行OS信任根未封闭；4项真实链接负例因EPERM未运行 |

Artifact是UUID定位+hash完整性，尚无CAS/去重；没有把原Suite表达或上游Harness内核复制进产品。[ADR009](../architecture/adr/009-m1-local-kernel.md)登记实际布局与设计差异。M0的108/22及全部报告/验证/交付清单保持原字节；当前142/34目录是v0.2完整规格，完整业务合同仍NOT_RUN，局部内核证据单独列入矩阵。

## 可以实际检查的入口

从 `I:/AI_AgentNexus` 运行：

```powershell
node tools/agentnexus/run-tests.mjs
node src/agentnexus/cli.ts demo
```

无需npm install。演示只创建专用runtime数据，执行原生echo和真实JSON诊断，保存Audit/Context/Artifact并只读重建；输出明确 `real_model=false` 和部署BLOCKED。诊断器发现无效JSON时，外层ToolResult PASS表示可信检查器调用完成，内层ValidationResult FAIL表示源码有语法错误；不能将外层成功用于批准执行。

`openHost()`只交给可信bootstrap；`administration`、原始Store/SQLite和处理器注册绝不交Agent。Agent门面只有受限request、功能读取、自己会话的档案/审计分页和撤销。没有网络监听、OS账号/ACL更改、hooks、自动Git操作、软件安装、Key扫描或科研项目访问。

## 联合测试与复审修复

实际测试使用自造输入和专用数据目录，执行的是Node/SQLite/文件/Zstd/固定解析器及受控子进程，不是Fake模型联调。覆盖同一实际SQLite计数操作的三模式差异、16并发重复调用、单写者竞争、参数快照/审批重放、实际只读数据库故障发生在动作前后、未知结果不重跑、迟到处理器lease、到期发生在真实延迟刷盘中的起跑拒绝、会话撤销/替换/关闭竞争、原文字节一致与只读重建。

独立只读审查没有直接授予通过。发现及修前/修后探针分别保全：[控制面审查](../../../runtime/AgentNexus-v0.4-M1/reviews/control-review.json)、[存储/完整性审查](../../../runtime/AgentNexus-v0.4-M1/reviews/storage-integrity-review.json)。修复包括：INHERIT实际关闭的排空、失败DIE不重建、审批单调期限/重启失效、旧门面不可读/不可撤销新门面、默认会话隔离、关闭前先撤权、单调处理器超时、迟到stop不得抢先恢复；以及flush必须覆盖调用target、停滞输入源的可取消管线和并发close共同等待。主审另加起跑前Mode/Permit/Approval期限重查。最终通过必须绑定真实总测试和最终源hash，不以审查Agent完成代替验收。

首轮Gateway集成曾14通过/1失败（会话SQL过滤尚未接入，命令的排除pattern未屏蔽该用例），后已接入过滤并回归；模块作者曾遇根package.json创建中暂态，原日志与probe保留。Storage v1与v3结果分别保存，v2预留未记录运行，不计PASS。原M0的91/9属于历史验证，本轮没有重新当作新PASS计数。

## 实际资源合同与边界

Tool请求/结果JSON上限64KiB，记录封套小于64KiB；大型输出走对象流，64KiB块、每对象默认64MiB（Host最高512MiB）、最多2个对象写流。SQLite审计outbox上限4MiB，段默认16MiB；读取分页≤100。Gateway最多32个活动请求/模块lease，Host最多16个绑定，DIE另有有界并发、文档和队列。超限拒绝/背压，不删除原始历史；取消的partial保留明确不完整标记，未知producer退出不授确认。

原生完整性当前上限为256载荷文件、16MiB总量、8MiB单文件、128KiB清单及协作式10秒检查，不是已完成硬RSS/系统时限。Windows目录fsync的portable Node能力不足；当前证明文件sync与进程崩溃恢复，不证明硬断电。Artifact读取须完整消费才验证完整hash；提前停止不产生完整已验证声明。原始Store是可信Host内部接口，其跨租户防护、OS私有ACL和全部资源/长期磁盘策略仍需后续部署验证。

## 下一准入与恢复点

| 剩余项 | 状态 | 后续条件 |
|---|---|---|
| 无许可Kit代码/模板复制与发行 | BLOCKED | 明确权利链/授予覆盖实际文件；或继续独立实现 |
| Node/Python/PowerShell二进制再分发 | BLOCKED | 精确发行资产完整许可/NOTICE/native闭包；本轮未打包 |
| Windows/Ubuntu管理身份与任意执行 | BLOCKED，实际对抗NOT_RUN | 独立身份、ACL/句柄、进程树、FS/网络及27项平台/共通合同分别验证 |
| 真实Provider、费用、Key池 | NOT_RUN | 明确可用授权凭据和受控请求，禁止自行扫描 |
| 敏感原文加密/Vault、完整工作流/五Agent/UI | NOT_RUN | 各自开关、owner与安全回归后逐步接入 |
| tsc静态类型检查、硬断电、长时soak | NOT_RUN | 相应工具/专用环境准入，不能由短测试外推 |

恢复使用已确认日志/outbox与对象，异常操作保留INDETERMINATE/claim；不重放历史命令。源码快照和新的交付manifest提供不依赖Git的本地恢复点。没有自动commit/push；下一步优先关闭真实管理/执行域准入，再连接更高风险工具和模型，而非先扩建大量Agent功能。


<!-- final-results:start -->
最终本地验收：**131 PASS、4 NOT_RUN（OS链接权限）、0 FAIL**，共135 tests；12项证据/源码/目录/治理检查通过，候选24文件。真实测试时间UTC：2026-11-06T17:54:41.259308+00:00；治理超时后仅续跑收尾，原测试日志及第一次源码ZIP均保留。受限本地切片PASS，完整安全部署BLOCKED。
<!-- final-results:end -->
