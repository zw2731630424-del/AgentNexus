# M1.4 ADR014—020

- **ADR014：独立候选。** 根产品源码与M1.2/M1.3证据冻结；M1.4 source可独立运行，不用未提交HEAD冒充新源码指纹。
- **ADR015：签名远程Permit与双账本。** Host保留原审批/Policy owner；Broker只有公钥和自身账本。跨进程不能共用事务，采用消费前/后持久意图与保守UNKNOWN；不提供自动重试的两阶段提交幻觉。
- **ADR016：双用户态启动器。** 选择标准Host/Worker账户与批登录方案，避免Host保存Worker密码或获得跨账户创建进程特权。实际Task entrypoint/Worker受保护IPC bootstrap仍是部署门禁，不授交互权/管理员服务作为兜底。
- **ADR017：真实prepare先于Grant。** 创建挂起、配置/读回token+Job、持有句柄后绑定身份；签名授权不能提前绑定一个尚不存在的PID，恢复前重新核验且一次消费。
- **ADR018：OS证据不能由模拟资格升级。** 资格证书默认空。REAL与SIMULATED严格分开，证书不能填补实际membership、网络、磁盘或输出未知。Job通知不是完整历史记录。
- **ADR019：原生文件owner。** 目录句柄、相对NtCreateFile和拒绝链接处理边界；字符串路径仅早期格式拒绝。当前24KiB RPC和Broker写入配额不冒充OS磁盘硬配额；每次读也有版本审计。
- **ADR020：Owner释放桥接。** 原最终裁定与退出证明分别必要；释放绑定当前boot/资源版本，统一短事务消费，UNKNOWN保持claim。关闭安全模块、Policy DISABLED和服务断连都不打开替代执行入口。
