# M1.5 ADR021—029

- ADR021：在独立M1.5目录开发，以冻结M1.4完整源码为输入，根M1.3及历史证据不变。
- ADR022：Host/Broker为同一可信标准账户的控制平面，Broker独立账本；可信Worker Launcher标准账户与不可信AppContainer子进程分层，不谎称同UID任意恶意进程可隔离。
- ADR023：解释器hash/实际SID不单独证明精确Launcher入口，增加固定enrollment签名挑战，MAC key在证明后交付；真实密钥/ACL信任须部署对抗。
- ADR024：Host/Launcher配置外置，解决自身hash和双角色清单循环；完整代码清单、全部叶文件ACL/指纹/保留句柄与至多4批pins共同约束TOCTOU，任一批失效锁定。
- ADR025：存储子对象单独只读owner/DACL遍历，不以根DACL推导DB子文件安全；只在OS明确旧owner PID不存在时归档锁，未知继续拒绝。
- ADR026：Grant以前已创建的挂起进程也占持久PREPARING槽；审计flush在native调用前；transfer进入原Permit事务；旧boot/不确定不自动清槽。
- ADR027：Job最终TotalProcesses与所有钉住身份核对历史，kernel parent与创建时间核父链；遗漏短命成员保留unknown。通知/父退出/Job空均不能单独证明退出。
- ADR028：Proof v2加独立closure与Host owner release receipt。五资源精确版本、最终裁定与签名原件均必须，双账本单次释放，已释放投影revision递增复用。
- ADR029：CPU旧PASS只是非DEADLINE且实耗超预算；新工具直接核用户态累计预算/容差及终止边界，并在冻结隔离源码运行。真实FAIL保留，资格不因重跑变绿；Ubuntu Windows证据不互认。
