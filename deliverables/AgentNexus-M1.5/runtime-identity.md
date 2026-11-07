# Runtime Identity

复用M1.4 registry/Grant，绑定logical agent/project/task/session/role、实际SID/PID/创建时间/OS session/parent、Host/Broker boot、worker_instance、generation、profile hash。ID由可信Supervisor/Host owner创建，Agent提供的SID/PID/role不能建立管理身份。运行时与实际pipe Launcher peer分别验证，不能混为同一进程。

prepare handle仅在所属native helper中有效，挂起进程被钉住后才绑定。起跑前重查真实进程与peer、当前feature/policy epoch、原审批/Permit及期限；任一变化拒绝。request结束显式revoke；Host重启旧ACTIVE身份转UNKNOWN，不恢复ACTIVE。FileBroker生产接线要求真实identity recheck，退出后的file permit不能只凭缓存ACTIVE继续用。

bootstrap预备槽与最终operation不同：PREPARING -> PREPARED -> TRANSFERRED；任何不确定创建/旧boot进入UNKNOWN_QUARANTINED。只有当前调用栈明确尚未调用native，才可NOT_INVOKED。TRANSFERRED与原Permit/五资源同事务，保留原operation/intent。真实账户/SID生命周期、PID重用和撤权的OS组合证据仍BLOCKED。
