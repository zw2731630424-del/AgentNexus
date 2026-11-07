# M1.4 最终限定验收报告

**完整Windows生产执行链：BLOCKED。** Phase 0完成；已实现并验证候选协议/控制/原生模块，不能宣称完整安全部署。

最终隔离源码运行 `2026-11-07T08-30-22-409Z-37176`：**255项，251 PASS / 4 NOT_RUN / 0 FAIL**，exit 0，未超时。来源按每个用例明确REAL_WINDOWS、REAL_OS_PROCESS/SIMULATED_SECURITY或SIMULATED。

源码67文件集合SHA256：`e2f95cb5c7557660dfbbf3cfcbb2a03a78460f9b408e66bd2fbb3f6ea96e3a88`。Node语法检查通过（不是tsc）；C#经现有PowerShell Add-Type编译和真实测试。历史1829 tracked文件全部原字节保全，原M1.3的206个测试名全部保留，M1.2/M1.3原件不修改。

| 能力 | 裁定 | 限定 |
|---|---|---|
| phase0 | PASS | Rules, full baseline read/freeze and hash verification |
| host_runtime_identity | BLOCKED | SIMULATED contracts pass; distinct Windows accounts absent |
| remote_permit | PASS | Limited protocol/SQLite/crypto evidence including independent OS Broker fixture; security observation SIMULATED |
| production_broker_deployment | BLOCKED | Production startup/long-lived protected IPC bootstrap not fully deployed |
| windows_native_token_job_file_pipe | PASS | Limited identity, restricted clone, pipe, handle-file and suspended Job tests; CPU qualification is separate |
| cpu_time_hard_limit | INCONCLUSIVE | Historical real FAIL and later PASS; not a stable qualified production guarantee |
| windows_combined_sandbox | BLOCKED | Approved distinct identities/profile and composition evidence absent |
| process_tree_exit | INCONCLUSIVE | Real root/Job/output observations; native historical membership incomplete |
| file_broker | PASS | Limited signed model + real root-relative file owner/adapter; 24KiB native RPC |
| cross_project_host_db_network | NOT_RUN | Actual cross-account composed adversarial tests require deployment |
| production_exit_proof | BLOCKED | Native membership_complete=false and missing isolation facts |
| production_resource_release | BLOCKED | No complete trusted production proof; five claims remain held when uncertain |
| sqlite_reopen_recovery | PASS | Model/real local persistence reopen; no automatic replay or unknown release |
| os_reboot_recovery | NOT_RUN | No machine reboot/hard power-loss test |
| audit_producers | INCONCLUSIVE | Model services integrated; raw native events retained; sustained cross-account production wiring incomplete |
| ubuntu | NOT_RUN | Specification only; no server modifications |

## 最终未运行用例

- real OS file symlink is rejected without following its target
- real OS dir link is rejected
- M1.4 production combination and independent pre-pinned bootstrap/Grant bridge
- job-orphan

## 已实现及修复

候选源码包含原审批/Permit的精确桥接、独立消费账本/服务循环/Host门面、Runtime Registry、MAC端点、有界观察/撤销/期限、组合启动候选、真实prepare-resume、目录句柄File Owner、流式Artifact输出、ExitProof签名原件与资源owner桥接。独立Broker进程实际运行固定OS Worker，但peer/Job/qualification仍SIMULATED，不能拼接成真实组合通过。

独立审查发现的审计字段、输入跨await变更、时钟回拨、未settled配额、循环父链、期限/关闭fence、旧boot/资源版本释放、未验证active遗失、断连operation归属、Artifact导入截止、错误原operation关联及签名原件保全已修复并复核。审查者早期执行限定模型探针；修后主要是只读源码复核，作者执行回归。

## 仍阻断的边界

两标准账户与Profile未部署；生产entrypoint/持久IPC私有bootstrap、完整历史成员/父链、网络/其他项目/管理库拒绝、文件/磁盘硬限制、稳定CPU硬预算及真实OS重启缺完整证据。Native始终membership_complete=false，WindowsSupervisor把未实测隔离事实保留false，不能发生产release。系统审批并非这些代码/证据缺口的自动豁免。

CPU原始记录有真实FAIL和PASS，最终运行中的通过不能覆盖历史不稳定。Token权限缺陷曾真实失败，修复clone句柄权限后隔离内外复测通过；原始失败保留。初次开发依赖/fixture失败与后续回归分别保存，未选择性抹掉失败。

本轮没有创建账户、修改已有ACL/Profile/防火墙/服务或Ubuntu，没有Provider/API Key/科研执行，没有commit/push。系统修改只按[精确审批清单](deployment-approval.md)另批；Task/生产启用仍标NOT_READY。

证据：test-results.json、evidence/runs/*（全部原始TAP/JSON/source快照）、evidence/development/*（早期失败与原生CPU/token诊断）、evidence/final-test-data.zip（含实际原生JSONL与合成状态数据）、independent-security-review.md/JSON、verification.json及SHA清单。
