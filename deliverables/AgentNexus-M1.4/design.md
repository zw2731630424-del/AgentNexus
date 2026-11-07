# M1.4 总体设计与 Phase 0 决策

状态：实现候选；生产准入 BLOCKED。设计不授予系统变更权限。

## 冻结与修改边界

基线 main / 9cec1fdc6574c41d7a19b23fe5e491b2c9084d06，开始时工作树干净。M1.3 的 45 文件集合 SHA256 为 `6a2f9f9f60c86ec7d72c4f64357172d604786ad0defe03c220b67156fb410005`，根源码、交付 source、最终测试 manifest 一致；887 个交付项哈希一致。1829 个 tracked 文件的逐文件指纹保存在 evidence/phase0/freeze.json。M1.2/M1.3 不覆盖；所有产品候选改动仅在本目录 source，工作材料在 .workflow-kit/tasks/AgentNexus-M1.4，临时进程与日志在 .workflow-kit/runtime/AgentNexus-M1.4。

## 信任与执行边界

可信 Host 持有原 KernelStore、FeatureRegistry、PolicyEngine、审批和签名私钥。新的 ProductionGateway 使用既有精确 intentHash 与控制表，在事务中消费原 approval/permit 并预留五种资源，审计 flush 后才交付远程授权。旧 ToolGateway 的 PROCESS/EXTERNAL_EFFECT 拒绝保持。新的 Gateway 不接受 execute 回调、shell、用户指定可执行路径；固定工具由可信目录映射。

独立 Broker 持有单独消费账本和 Host 公钥，不读取 Host 管理库；验证完整签名授权、规范 IPC、实际 OS peer、钉住的 runtime/worker/generation/boot/profile、当前 epoch 和撤销状态。消费账本先持久化，再写审计/START_INTENT 屏障，最后启动。消费后断连/超时/崩溃均不可重放；未知结果继续隔离。Host/Broker 的账本通过有签名的消息桥接，不共享管理对象。

身份字段必须来自 Supervisor 钉住的 OS 句柄。Agent 门面只绑定 logical identity；payload 中的 SID/PID 不参与创建真实身份。IPC 使用最小 DACL、FIRST_PIPE_INSTANCE、REJECT_REMOTE_CLIENTS、双向内核 peer 检查；MAC 覆盖 M1.3 规范编码，单帧/连接/观察/请求均有上限和 deadline。新原生生产 helper 与 M1.3 NativeProbe 分离。

## 启动方式（待逐项批准）

选择用户态双启动器，避免让标准 Host 持有 Worker 密码或跨用户创建进程特权。已有 Windows Task Scheduler 以 PASSWORD/Batch 为两个标准账户各启动一个固定、只读、hash 固定的入口；不安装服务，不授予交互登录权。Host/Broker 在 AgentNexusHostM14；可信 Worker Launcher 在 AgentNexusWorkerM14。Worker Launcher 使用自身 primary token 的受限副本和 AppContainer 创建低权限子进程，挂起、Job 配置/验证、token 读回后才恢复。若当前 API/登录权不能满足，部署停止并另提精确授权，不静默转为交互登录或管理员服务。

## 组合沙箱

Profile `AgentNexus.M14.Worker` v1，零网络 capabilities，Restricted Token 删除不必要 privileges、禁用不必要 groups、加入 restricting SID 并验证实际属性；Low integrity/AppContainer SID 读回验证。Job 禁止 breakaway、限制进程数/内存/CPU，创建时只继承明确的 stdin/stdout/stderr 句柄，不继承管理文件/Job/进程句柄。运行时和代码只读，输入通过 File Broker，工作/临时/输出目录独立。单文件和工作区配额只能在 Broker 文件写入路径约束；若 Worker 有直接写入权限，该约束不是 OS 硬限制，生产资格必须拒绝该组合。不得把监测轮询描述为硬磁盘配额。

## 文件与输出

File Broker 要求绑定 logical/runtime/project/task/resource；使用原生目录句柄固定边界、拒绝所有 reparse point/alternate stream/device/UNC/相对逃逸、逐组件不跟随链接并验证 final handle/file ID/link count。只允许新建输出，不隐式覆盖/删除；并发写入以资源 claim 及 OS exclusive create 约束。每次读写先审计授权，再提交版本 hash、file ID、字节数和 ArtifactRef；读也记录实际版本。stdout/stderr 流式写 ArtifactStore，有总量上限、背压和 producer EOF；未知 producer 不被退出根进程替代。

## ExitProof 与恢复

Supervisor 分别记录 TERMINATION_REQUESTED、PROCESS_EXITED、PROCESS_TREE_EXITED、OUTPUT_PRODUCERS_SETTLED，再由 Host verifier 判断 EXIT_VERIFIED/EXIT_UNVERIFIED。Proof 包含所有绑定、Job identity/membership、父子身份、句柄状态、token/profile、退出观察、producer 状态和 evidence hash。Job 通知只是提示，不构成完整历史成员证明；缺失任一成员/输出/沙箱证据必须 EXIT_UNVERIFIED。生产资源释放同时要求 owner 的最终非 UNKNOWN 裁定、完整可信证明、资源版本和审计屏障；模拟证明永远没有生产释放权。Host/Broker 重启逐页扫描未完成操作并撤销旧 boot，不能可靠重新打开 Job、进程或 producer 时继续 UNKNOWN_QUARANTINED，无自动重跑。

## 实施与验收边界

先做无系统配置变更的协议/账本/文件/故障模型测试和独立进程合成夹具，全部标注 SIMULATED 或限定 REAL_WINDOWS。生产资格必须有针对实际账户/SID/OS/helper/tool/profile hash 的独立组合证据。创建用户、已有 ACL、AppContainer profile、计划任务与登录权等待 deployment-approval.md 的逐项批准；未批准用例 NOT_RUN，整体生产 BLOCKED。Ubuntu 只完善独立实施规格，不接触服务器。

依据：[Job completion port 的通知限制](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_associate_completion_port)、[Restricted Token](https://learn.microsoft.com/en-us/windows/win32/secauthz/restricted-tokens)、[CreateProcessAsUser](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessasuserw)。API 文档不替代组合实测。
