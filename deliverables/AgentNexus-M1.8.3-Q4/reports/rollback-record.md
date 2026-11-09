# 回滚方案与本轮记录

**本轮无系统变更，无回滚动作。** 未执行停止服务、注销、账户删除、安装删除或ACL回退；当前服务和两个目标目录原本不存在。

未来必须在精确部署批准中先批准失败处理范围。若已批准的服务启动/就绪失败，停止唯一 `AgentNexusCredential`；核对实际SCM状态、engine/native Runtime/Helper进程退出和两条Named Pipe关闭，再记录实际Token/对象/时间。不能只依据sc请求退出码推断已停止。

保留程序、签名配置和全部合成/正式Vault、原唯一Token Ledger（包括一致WAL/SHM）与Audit。不递归删除数据，不创建空账本，不清零或释放UNKNOWN预算，不自动重发，不回退同SID解密模式。新epoch/重启撤销旧Ticket/Grant/credential handle，保留已发送UNKNOWN。

服务注销、程序移除、账户处理及ACL清理不包含在当前授权中；未来也须逐项精确批准。安装部分失败时保留原物，重新采集状态后另批恢复；不覆盖既有目标，不自动删除再重装。
