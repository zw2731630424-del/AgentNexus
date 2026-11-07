# Runtime Identity、Trusted IPC、ExitProof 与恢复合同

身份：Logical Identity = agent/project/task/session/role；Runtime Identity = runtime_id、host_boot_id、OS/SID(or UID)、PID、不可复用创建时间、worker_instance_id、runtime_session_id、process_generation、IPC connection_id、profile_id/version/hash、Capability 集。Supervisor 是创建身份的可信 owner；Agent 参数不能赋值 OS 字段。相同 worker 名称和 PID 不能继承旧绑定。

CREATED → AUTHENTICATED → ACTIVE → REVOKING → REVOKED；异常观察进入 ABNORMAL_EXIT，缺证据进入 UNKNOWN_QUARANTINED。退出、撤权、会话或任务撤销立即使在线连接与 Capability 无效。REVOKED 表示不能授权，不表示进程树退出。重启后旧 boot 的身份不恢复 ACTIVE。

IPC v1 严格封套：schema、request_id、agent_id、project_id、task_id、session_id、runtime_id、runtime_session_id、worker_instance_id、operation_id、capability_id、resource_id、policy_epoch、feature_epoch、payload_hash、nonce、deadline、connection_id、profile_hash、payload。所有字段必填；未知字段拒绝。payload 用现有 canonical JSON / SHA256，原帧必须规范 UTF-8/JSON，拒绝重复键和非规范表示。请求 MAC 覆盖整个封套；每连接短期随机密钥只经可信私有启动通道交付，不在日志/argv/环境中记录。MAC 不代替 OS peer authentication。

验证顺序：有界帧/格式 → MAC → 固定连接的内核 peer(PID+创建时间+SID) → 当前 host boot/runtime ACTIVE → logical/worker/profile/connection 逐项相等 → Capability 精确 operation/resource/intent/epoch/期限/类别 → 当前 Feature/Policy/撤销版本 → 原子 nonce、request_id、operation_id 单次消费及 REQUESTED/AUTHORIZED 审计事务 → flush → 起跑前再次检查。nonce 不做淘汰复用；满额拒绝，换会话后旧会话失效。墙钟与单调时钟同时约束，回拨拒绝。

管理和 Worker 端点隔离。Worker 只发结构化请求，不获 Admin Capability、Store、SQL 或通用 fs/spawn。断开不自动重发已消费请求，原 operation 保留，INDETERMINATE + 资源隔离，RESULT 和 ACK 分别追加。连接超时不能证明失败或退出。

Windows 管道使用 FIRST_PIPE_INSTANCE、拒绝 remote、最小 DACL、GetNamedPipeClientProcessId/SessionId + 固定进程句柄/GetProcessTimes/token SID。同 SID 的攻击必须匹配 Supervisor 持有的精确进程身份；PID 查询失败拒绝。新建私有内核对象的安全描述符不修改已有系统 ACL。正式部署仍需独立用户。

ExitProof v1：绑定 proof_id、operation_id、worker/runtime/boot/session、OS process identity、start identity、generation、profile hash、parent identity、Job/cgroup identity、所有已观察树成员及创建身份/退出码、termination_requested_at、root_exit_observed、tree_empty_observed、unknown_members、handles_closed、output_producers_closed、observed_at、source、evidence_hash。哈希只证明完整性；只信持有原生句柄的受认证 Supervisor，Worker JSON 自报不接纳。

TERMINATION_REQUESTED、PROCESS_EXITED、PROCESS_TREE_EXITED、EXIT_UNVERIFIED、EXIT_FAILED 分开。需要 Job active=0/所有成员退出及完整生命周期追踪；只采样 PID 列表不足，漏掉短命子进程不能声称成员完整。Job close kill 也须等待观察；结果入库不能替代退出证明。

资源恢复：Writer/Workspace Lock/Worker Quota/Process Slot/Sandbox Reservation 均绑定 operation、runtime、profile 和版本。释放需要非 UNKNOWN 的原 M1.2 最终裁定 + 对应真实 ExitProof + 无活动输出 producer + 资源 owner 授权。退出证明不裁定副作用结果，人工裁定不证明进程退出。事务原子记释放与审计；回包丢失不产生第二次释放。

Host 重启分页扫描未完成 operation、runtime、资源；核实进程创建身份/Job或cgroup/Workspace所有权。当前无可重新打开并证实完整的隔离容器时保持 UNKNOWN_QUARANTINED。PID 重用、父退出子残留、IPC失联、结果未写、释放中崩溃均不自动解锁或重试。硬断电和真实重启另外验收。
