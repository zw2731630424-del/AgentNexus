# M1.6 系统与部署边界

本轮没有执行任何生产部署；当前交付无需用户批准系统修改。用户授权的本地源码、测试、合成数据、只读调查和证据已完成，未发起新的系统权限申请。

没有创建Windows用户、修改ACL/登录权、注册AppContainer、创建Windows Task Scheduler任务、修改防火墙、安装服务/驱动或修改Ubuntu。Native Harness中的TaskScheduler是应用内软件模块，不是Windows系统任务。

没有读取真实API Key、连接真实Provider或产生真实模型费用；没有修改其他科研项目、运行正式科研实验、Commit或Push。已有M1.5.1部署审批清单不是授权，本轮没有沿用它部署。

严格累计CPU资格继续保留M1.5/M1.5.1 FAIL。系统对象批准、Feature ON、Policy DISABLED、证书、Supervisor deadline或原语组合均不能消除此FAIL。任何后续部署必须另行列出精确对象/前状态/变更/回滚并获批准，且资源后端须独立资格化。

当前入口只适用于可信本地库和模拟模型；恶意同进程代码、独立账户有效隔离、生产文件/网络权限、完整真实ExitProof/closure、持久存储owner和真实Provider/Vault均未取得生产资格。
