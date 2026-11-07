# M1.5 Feature / Policy

继承165 Feature/44 Policy语义对象保留，新增5项（合计170）：

| Feature ID | 默认/范围 | 依赖 |
|---|---|---|
| runtime.bootstrap.host | OFF / G | runtime.host.production |
| runtime.bootstrap.worker | OFF / G | runtime.worker.production, runtime.bootstrap.host |
| runtime.ipc.persistent | OFF / G | runtime.ipc.windows.production |
| runtime.exit_closure | OFF / G | runtime.exit_proof.production |
| runtime.ubuntu.adapter | OFF / G | core.identity, core.audit.trail |

每项定义risk、conflicts、off_behavior、degradation、recovery、tests；见source/config/agentnexus/features.json。前4项加入REQUIRED_FEATURES，Ubuntu仅技术准备。关闭即拒绝、撤销并请求终止，未知资源保留；不开放direct spawn/host DB、不降低OS身份/ACL/沙箱、不静默跳过审计。恢复须新attested boot/peer和精确Permit，旧operation不重放。

44 Policy含30项不可降级L0。P.RUNTIME_IDENTITY/P.IPC_PEER/P.REMOTE_PERMIT/P.SANDBOX_PROFILE/P.FILE_BROKER/P.PROCESS_OWNER/P.EXIT_PROOF/P.RESOURCE_RELEASE/P.AUDIT_REQUIRED/P.PRODUCTION_QUALIFICATION由各可信owner直接执行，不把L0交给可选PDP evaluate；固定工具仅选择可降级P.COMMAND_RISK，精确副作用审批/Permit与独立owner约束始终执行。

默认资格证书为空、功能OFF。只有真实目标OS/SID/profile/helper/tool绑定的有效资格才可准入；证书不能填补实际native observation中的false/unknown。未实现策略/平台默认DENY/BLOCKED。模型catalog测试不代表170项都实现。
