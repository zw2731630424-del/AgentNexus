# M1.5 总体架构

完整Windows生产执行链仍BLOCKED。代码候选已建立可信启动、独立Launcher控制、精确授权/文件输入、监管与保守退出/资源闭合；真实独立OS部署尚未授权，CPU硬预算资格失败。

```text
外置受保护配置/固定入口 -> OS/SID/token/OS build/完整源码和ACL pins
 -> Host Control Plane + Policy/Approval + 独立Broker账本
 -> 已认证pipe + Launcher enrollment签名挑战 + 私有MAC会话
 -> PREPARING槽/REQUESTED审计flush -> 挂起Restricted/AppContainer/Job Worker
 -> 绑定真实PID/instance/project/task/session/profile -> 原子审批/Permit/五资源transfer
 -> Broker durable START_INTENT/最终fence -> Launcher AUTHORIZE/START
 -> 精确File Broker双签名输入或有界inline输入 -> Worker有限摘要
 -> 流式Artifact/完整树与producer观察 -> 签名Proof + closure
 -> 独立最终裁定/owner授权 -> 原资源释放 -> 签名Broker ACK -> Audit
```

Host与Broker同属可信Host标准账户，Broker独立Store；可信Worker Launcher标准账户是TCB，有限任务在更低的Restricted/AppContainer token。pipe peer与子Runtime分别验证。完整目录/子文件ACL、真实key保密和Task安全上下文仍须OS部署证明，不能由声明代替。

Host/Launcher配置都在code_root之外，共用精确只读代码清单；每个代码文件都有独立ACL/哈希/保留句柄，最多4批native pins。存储子树只读权限检查、owner死亡锁恢复先于管理对象。新boot恢复身份、operation及准备槽UNKNOWN，不重放。默认Feature OFF、资格空、Native隔离事实false保证未完成工作不误开放。

具体组件与范围见host-bootstrap.md、worker-bootstrap.md、trusted-ipc.md、windows-sandbox.md、exit-proof.md、resource-release.md。设计变更决策见adr.md，验收以acceptance-report.md及机器结果为准。
