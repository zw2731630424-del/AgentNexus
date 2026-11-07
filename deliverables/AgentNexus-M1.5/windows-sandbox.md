# Windows Sandbox

复用Restricted Token删除多余privileges/禁用groups/Low integrity、零capability AppContainer、挂起创建/Job assignment/readback、禁止breakaway、显式3句柄继承。生产Launcher必须是已批准独立Worker标准账户；不提供同SID Host、管理员、交互登录或primitive回退。

初始有限工具profile只含只读code_root与Node runtime目录，writable=[]、active processes=1、output有限；项目输入通过FileBroker注入，临时/输出不直接授Worker写。代码/凭据/管理/输入根两两隔离，文件owner/ACL语义及实际SDDL/pins核验。AppContainer Profile私有LocalState等默认可写路径必须在真实部署时单独检查/拒写，不能因writable=[]声明就视作OS已限制所有磁盘路径。

网络默认DENY，未授网络capabilities；这不是“任何网络路径都已阻断”的证据。loopback exemptions、IPC/COM/其他主机服务、DNS/IPv4/IPv6/代理/本地网络路径的真实对抗尚未运行，不改防火墙。

Job资源读回与实际CPU时间资格分开。当前CPU资格失败；文件Broker配额不冒充OS磁盘硬配额。WindowsSupervisor保持network_verified/filesystem_verified/limits_verified=false，资格证书不能替这些事实填true，所以即使仅批准基础账户，也不能自动生成生产EXIT_VERIFIED。

独立身份/ACL/Profile/Task尚未授权部署，组合沙箱BLOCKED。token/job/file/pipe单独原语、模拟网络拒绝、某次无法连外网都不能拼成组合PASS。
