# Host Bootstrap

入口 source/src/agentnexus/bootstrap/entry.ts 的 host 子命令调用 attestBootstrap，依次校验外置配置SHA/版本、Node24.15.0路径/指纹、启动cwd、实际SID/标准token、内核OS版本、Node/PowerShell父目录及完整源码文件owner/精确SDDL/指纹。代码树必须精确匹配 source_files，所有文件必须具备原生保留句柄；最多120 pins分至最多4批，每批含真实父Node image且不超过64 pins/60KiB。任一pin丢失或过期使native helper不可继续生产准入。

配置本身唯一null文件hash由受保护启动参数的SHA填入，防止自引用。Host/Launcher配置必须在code_root之外，共用同一不可变源码清单。五类根目录两两不重叠。SDDL仅接受已审查普通ALLOW/DENY ACE，拒绝不可信写/删除/WRITE_DAC/WRITE_OWNER；Host/Broker/输入私有目录禁止Worker/Everyone/Package读取。实际DACL由native逐项读回，配置哈希不代替ACL安全语义。

通过OS attestation后只读检查两个存储树的全部已有对象owner/DACL/file ID（最多4096，拒绝链接）；只在旧owner PID被OS确认不存在时归档遗留writer.lock。PID复用、权限不明或recovery guard不确定仍STORE_LOCKED。然后打开Host管理库、单独Broker账本、Policy/Feature/审批及私有签名材料，恢复旧boot身份/operation/准备槽为UNKNOWN，再接线Broker与Supervisor。

准备Worker也先在SQLite持久化PREPARING槽和REQUESTED审计、flush、复测实时Feature/存储状态，之后才允许创建挂起进程。绑定真实PID后PREPARED；精确Permit消费事务中原子转移至原operation五资源。崩溃/失联不能漏掉Permit之前的OS资源。未知准备槽无自动解除接口，继续阻断新准备。

标准Worker Launcher需证明固定enrollment key、实际双方pipe tuple、父Node身份、配置/源码/helper指纹及新挑战，Host才发送会话MAC密钥。长期管理端点只允许明确现有标准Operator SID；该SID与Host/Worker不同。当前账户/目录未部署，真实Host启动、Task PASSWORD/Batch与崩溃恢复仍BLOCKED；当前账户Store owner-death探针不替代它。
