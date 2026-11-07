# 下一阶段 Windows 系统部署授权清单（未执行）

本文件是可审阅的系统变更边界，不是已部署脚本。用户原任务第十六节明确禁止未经批准创建用户、修改 ACL/防火墙或系统沙箱，因此以下项目必须单独批准。批准不会使未实现/未测试的组合自动 PASS。

| 操作及精确候选 | 风险 / 前置条件 | 回滚 |
|---|---|---|
| 新建本机标准账户 `AgentNexusHostM13`、`AgentNexusWorkerM13`，不加入 Administrators；密码由操作者安全交互提供，禁止记录 | 增加持久登录身份；需管理员执行，先确认同名账户不存在。服务/交互登录权具体选择需按最终部署方式登记 | 先撤销新会话、观察对应所有进程退出，再禁用/删除仅本轮新建账户；不能删除已存在同名账户 |
| 在 `I:\AI_AgentNexus\.workflow-kit\runtime\AgentNexus-M1.3\deployment\host` 与 `...\deployment\worker` 建专用目录，只修改这两个新目录的 DACL；先保存各自原 SDDL | 配错可能泄露合成管理库或阻断自己；禁止递归作用仓库、盘根或其他研究目录。Host 目录只予 Host/操作者，Worker 目录只予必要 Worker/Host；实际权限须对抗测试 | 停止且核实执行树后恢复这两个目录原 SDDL；保留审计，删除测试目录须再次核对绝对路径和唯一归属 |
| 注册唯一 AppContainer profile `AgentNexus.M13.Worker`，不赋 Internet/PrivateNetwork capabilities；仅给上述 Worker 目录及固定只读 Node/工具文件所需访问 | 持久系统 profile/新对象授权；加载器可用性和网络拒绝仍需逐项测试，不改全局防火墙，不放宽其他项目目录 | 先撤销实例并观察退出，再删除仅本轮新建 AppContainer profile；回收本轮新增的精确 ACE，不覆盖历史 ACL |
| 使用该 profile/受限 token，先挂起创建并入 Job 后恢复固定合成 Worker；将控制库留 Host 用户目录 | 真实执行隔离需要代码继续实现；继承句柄/COM/WMI/网络/资源限额均需攻击验收。只运行合成项目 | 停止 Job、等待全树与输出退出，保留 UNKNOWN；没有完整证明不删除锁或原始证据 |

不含防火墙修改、驱动、系统服务安装、Ubuntu 配置、Provider、API Key、正式科研或其他项目。当前账户已创建的临时 Job/管道与 Restricted Token 探针不等于此部署。需要授权范围：仅上述新账户、新目录 DACL 和 AppContainer profile；其余变更需另列清单。所有变更前先保存可回滚的精确对象状态；不能扫描现有凭据。
