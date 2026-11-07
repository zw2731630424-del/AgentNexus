# M1.6 实施建议

1. 先对 CPU 合同做方向决策：现有严格累计上界继续阻断。选择能给出且实际通过 OS 上界证据的后端，或明确评审不同名称、不同保证的降级资源合同；不把 Windows periodic JOB_TIME 包装成硬预算。保留 M1.4/M1.5/M1.5.1 全部失败。
2. 修复并独立评审 TOCTOU fixture 对 OS 拒绝码的覆盖或改用可检查的严格后置条件；不变更“不得返回外部字节/错误不得含内容”的验收标准。原 FAIL 保留。先处理 symlink fixture 所需的精确权限审批，不擅自启用 Developer Mode。
3. 用户逐项批准新基础对象后，只做新 SID/空目录；再生成精确 ACL/config/key/Profile/LSA/Task XML 清单。未能给出真实 Operator SID/Task 前状态时不进行模糊整体批准。CPU 失败门禁继续固定。
4. 在真实不同 Host/Worker 下验证 effective pipe permissions、entrypoint/private key、零网络、管理库/跨项目/Artifact Store 直接访问以及所有默认可写路径。部分原语证据不能拼接成完整组合 PASS。
5. 完善历史 process/job/producer ownership 观察，处理短命成员、owner/Host 崩溃与真实重启，保证完整 ExitProof 后才能 owner release。轮询/通知/Job 空不能自动补齐未观测成员。
6. 实现分 Worker/project/platform resource ledger 与能力后端；OS硬限制、应用流量控制、观察告警严格区分。RAM/Disk/I/O/Network/Model 尚未实现的能力逐项资格化。
7. 部署后用合成 Operation 对九类 audit producer 从准备到释放逐事件对账，注入 audit/IPC/存储/退出故障与重启，核全无缺，再申请生产功能启用。Ubuntu 独立准备、独立批准和 OS 测试，不从 Windows 借用资格。
