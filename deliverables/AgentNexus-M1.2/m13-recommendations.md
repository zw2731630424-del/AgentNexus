# M1.3 后续实施建议

1. 先在专用、获准的 Windows/Linux 环境实现独立身份与受控 Broker，逐平台关闭 IPC/文件/网络/进程树的真实绕过路径。没有 OS 证据继续拒绝 PROCESS/EXTERNAL_EFFECT，不把 capability 分类升级为沙箱证明。
2. 定义经过认证的执行实例与 ExitProof 接口，支持重启后核对原 Job/cgroup/进程创建身份。只有真实全树退出可解除当前因缺退出观察而保留的 Writer；不添加管理员 exit=true 旁路。
3. 为 Reconciliation 提供管理员只读时间线/证据视图，突出原 START_INTENT/STARTED/RESULT/ACK、原 intent、未知 producer 和所有追加裁定。任何修改都继续要求 expected_revision 与一次性 challenge。
4. 在合成服务中实现独立科研授权服务：协议 SHA、稳定 seed slot、原子批量 Claim、多臂共享 checkpoint、永久领取和未知核实。真实研究项目、Provider/费用及例外重跑各自另行授权。
5. 按真实需要逐一接入尚未实现的 Review/Workflow/Scientific L2 owner；在 owner 未实现前保持 DENY，不用通用 validation=true 或允许型回调代替证据。
6. 补充专用环境的硬断电、长时 soak、硬 CPU/RSS/PID 限额、Vault/凭据隔离和发布依赖许可闭包。静态类型检查需明确工具链；当前 Node 擦除类型运行与语法检查不等于 tsc 通过。

M1.3 不以增加 Agent 数量作为优先目标。先验收上述边界，再开放更高风险执行与真实科研入口。
