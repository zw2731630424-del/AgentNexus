# M1.6 后续工作

1. 先审阅M1.5基础对象授权，实际创建SID后展开精确ACL/源码/Runtime/配置/Key/Task XML；基础批准不等于Task、Profile、登录权或生产启用批准。
2. 在真实两个标准账户及既有标准Operator的非AppContainer上下文完成attestation/签名挑战/持续IPC/撤销/固定Worker全链，给每个实际组件归档原始帧与源指纹。当前长期入口静态/模型结果不作为OS部署通过。
3. 单独调查CPU历史波动、目标OS嵌套Job/累计user time与子成员计量，明确可接受granularity/overshoot后跑重复/长时/并发/负载资格。现有实际FAIL不得降格成PASS或由墙钟kill代替。
4. 补真实默认拒绝网络全部路径、AppContainer默认可写私有目录、跨项目/管理库拒绝、文件链接/TOCTOU与子进程逃逸对抗，建立实际filesystem/network/limits事实；当前WindowsSupervisor三个字段继续false。
5. 完成真实完整树/producer/IPC/沙箱关闭proof与五owner释放，包括Host强杀/重启、PID复用、receipt提交中断。对Permit前UNKNOWN准备槽提供独立验证后的owner恢复合同；保持现有拒绝，不能清数据库或TTL解锁。
6. 做持续运行/背压/磁盘满/audit断电故障资格和完整生产audit覆盖；保持raw失败/中间source快照。
7. Ubuntu先在独立授权环境编译native peer/pidfd/openat2/namespace/seccomp/cgroup/AppArmor适配器，独立验收。Provider、API Key、正式科研与外部副作用仍未开放。
