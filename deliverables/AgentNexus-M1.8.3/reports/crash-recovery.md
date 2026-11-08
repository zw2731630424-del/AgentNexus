# 崩溃与恢复

服务 send intent 先持久化，随后才发送 Provider；无法排除请求已离机时不释放 Token、Key lease 或自动重发。缺 Usage/部分 SSE/取消/Provider 超时都保持 UNKNOWN。Host 只记录远端结果投影，重启恢复不创建真实 campaign。

本轮包括真实独立同 SID Node 服务进程被 kill 后重开：SENT 保留 hold、UNKNOWN=1、请求次数不增加。正常服务关闭重开保持原用量与 Handle；原14项桌面回归保留 Host 重启逻辑。它们是合成进程证据，不是实际 Windows Service/Job/DPAPI profile 重启资格；SCM stop、系统重启、实际 Host 崩溃和独立服务账户恢复仍 NOT_RUN/BLOCKED。

不确定 Usage 没有自动 reconciliation API。后续只能由可信 Owner 结合 Provider 对账/原 Operation/Usage/审计作显式裁定；重装、换 Key、重新打开界面和删除密文均不重置预算。
