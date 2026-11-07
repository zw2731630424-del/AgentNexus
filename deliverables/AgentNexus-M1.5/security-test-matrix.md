# M1.5 安全测试矩阵

最终运行的逐case状态以test-results.json为准。这里区分模型拒绝、同账户原语与真实独立账户生产测试；SIMULATED里的REAL_WINDOWS字符串只是测试输入，不是实际OS资格。

| 攻击/故障 | 已执行证据 | 真实生产组合 |
|---|---|---|
| Host身份伪造 | 配置SID/hash/owner与bootstrap模型拒绝；实际parent/token原语部分 | BLOCKED |
| Worker身份/新授权身份伪造 | signed Grant PID/tool/args/instance、Launcher enrollment proof模型 | BLOCKED |
| IPC Peer伪造 | MAC/sequence/replay/correlation模型；原生伪造部分被当前pipe权限阻断而NOT_RUN | BLOCKED |
| Permit重放/过期/epoch | M14精确消费账本、期限/回拨/epoch模型，SQLite/crypto真实 | BLOCKED |
| 资源越权/跨项目/Host DB | FileGrant作用域/hash/路径模型拒绝，storage ACL代码核验 | BLOCKED，未读真实管理库/其他项目 |
| 路径逃逸 | 相对路径格式+原生句柄读/拒绝部分 | 组合BLOCKED |
| symlink/junction/hardlink/TOCTOU | 模型与源审；当前多个真实link创建/验证NOT_RUN，逐case列出 | BLOCKED |
| 子进程逃逸/父退子留 | 继承Job/orphan原语部分与父链完整性模型 | 全历史/组合INCONCLUSIVE |
| 网络访问 | 仅零capability/默认DENY合同，无实际全路径拒绝证据 | NOT_RUN/BLOCKED |
| CPU超限/子进程/并发 | 最终冻结源码10个真实同账户资格case全部FAIL，旧suite CPU亦FAIL | FAIL，目标Worker资格BLOCKED |
| Worker强杀/producer残留 | 模型终止/背压/未结算proof拒绝、native owner死亡原语 | 组合BLOCKED |
| Host重启/PID复用 | 真实当前账户Store锁恢复序列；boot/runtime/准备槽UNKNOWN模型 | 真实独立Host重启NOT_RUN |
| ExitProof伪造/环形父链 | 固定签名、原件/hash、父链、Artifact导入及closure模型 | production proof BLOCKED |
| 不确定资源释放 | 五投影版本、独立裁定、owner receipt、幂等ACK/回滚模型 | production release BLOCKED |
| Audit失败 | 创建前barrier模型nativeCalls=0；Broker/File/输出故障模型 | 长期OS组合INCONCLUSIVE |
| IPC断开 | 无自动重发模型、序列/连接撤销、native父死亡原语 | 跨账户持续连接NOT_RUN |
| 并发Worker竞争 | 原审批/claim/配额与准备槽、native端点上限模型/部分原语 | 初始生产配置串行1实例，实际多Worker组合NOT_RUN |

原生正向持续管道、正向protected-pin attestation及有效client-instance拒绝在当前宿主权限下没有证据，必须保持NOT_RUN。单个连接失败不证明网络拒绝；发送kill、句柄丢失或父退出不证明全环境退出。
