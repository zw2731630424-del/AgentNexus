# M1.4 建议

先批准并完成 Windows 专用身份/AppContainer/精确目录授权组合，部署经过签名/固定 hash 的最小 native Supervisor，验证进程创建时 token/Job/句柄白名单及默认拒绝网络。用 completion port + pinned process handles 收集完整生命周期，解决短命成员和父退出子残留夹具，然后实现可信 OS ExitProof 与原 M1.2 两步裁定的释放桥接。

再部署独立 Broker 服务和受保护 IPC，双向 peer认证、私有启动密钥、持续撤销、流式输入输出背压、配额以及 crash/重启恢复。每种 PROCESS/EXTERNAL_EFFECT profile 单独实测准入；先固定合成工具，不接真实 Provider。

Ubuntu 在获准主机独立实现 namespace/cgroup/seccomp/LSM 适配及对抗验收。文件 Broker、费用、凭据 Vault、科研授权 owner 和长时/硬断电测试另立准入，原科研协议与永久 Claim 不由工具许可替代。先消除执行边界缺口，再扩五 Agent 和真实研究任务。
