# M1.5 后续建议与未完成工作

当前不是完整生产安全部署。继续次序应由证据依赖决定，不把Feature开启或资格证书当实现。

1. 完成可独立启动的Host/Broker/Worker Launcher entrypoint、受保护长期Named Pipe会话、双向私有启动密钥交付、真实撤销传播与系统Task启动接线。现有服务循环/Host门面/WindowsSupervisor/native prepare-resume为实现候选；独立Broker fixture只有security SIMULATED，不是该生产部署的替代。
2. 获得部署清单中精确基础对象批准，使用两个真正标准账户运行真实组合；不能让Host获得Worker密码/管理特权。未准备好的Task对象另行批准。
3. 诊断CPU累计用户时间硬限制在重复真实运行中的不一致。保留全部FAIL和PASS，不由一次通过晋升资格。对实际最终启动环境验证总CPU/速率、内存、进程数、wall time、总输出；kernel CPU和整工作区硬磁盘配额另立合同。
4. 解决完整生命周期历史、短命进程/父链与外部输出producer证据。当前Windows采样membership_complete=false，无生产ExitProof源；可研究严格单进程profile或更强原生监管，但必须有独立实测和ADR，不能改true让锁释放。
5. 将原生安全事实经真实跨账户IPC接入同一审计链，验证审计不可写、断连、崩溃、超额和撤销。File Owner扩展持久句柄流式读写与更大文件，保持版本审计及TOCTOU边界，现24KiB限制应保留到新协议通过。
6. 完成Host进程强杀后的M1.4生产树/Job/producer重新核实，随后独立OS重启、长期运行和故障注入。没有可重开Job时维持UNKNOWN；当前SQLite重开和既有M1.3强杀回归不等于完整OS恢复。
7. Ubuntu仅按本轮规格在另获批准的目标主机实施；不照搬Windows结果。Provider、Vault、费用、外部副作用owner与科研授权均未开放。
