# 同 SID 解密根因

M1.8.2 原始证据 `../AgentNexus-M1.8.2/evidence/probes/vault-final.json` 记录：父 PID 22864、子 PID 9884，用户 SID 均为 `S-1-5-21-2532670394-1554971530-4095700938-1001`；子进程读取合成 Vault=true、DPAPI 解密=true，预期与观察 SHA256 均为 `d3143427f738dfc54fd42f9d1be6b97e1808e63e9b047feb49f60c0c47279716`。这是真实进程反例，状态保持 ISOLATION_FAIL。原始文件未覆盖，副本与起始哈希见 evidence/baseline。

原 Vault 在 Desktop Host 的同一用户身份下运行，使用公开熵 `AgentNexus/Vault/M1.8/CurrentUser` 和 DPAPI CurrentUser。其管理员 WeakSet、租约和 scoped facade 约束可信进程内调用，不能改变其他同 SID 进程的解密能力。Windows 分支的路径/nlink/realpath 检查也没有创造独立身份。Electron sender 检查约束主帧 IPC，不能证明 Windows pipe 或进程保密。

新代码把存储、解密、Key Pool、最终 HTTPS、最终 egress 和 Token Owner 放到服务身份中。REAL Vault 只允许固定原生 attester 建立的许可及固定受保护路径；普通 LIVE open 仍返回原 VAULT_LIVE_IMPORT_BLOCKED。绝无导出/解密/已存 Key 读取 RPC。新输入在输入 Renderer、Preload、Main 中短暂经过，这个事实没有被隐藏或写成“Renderer 看不到正在键入的值”。

新 same-SID Node 子进程测试只证明协议/持久化。它仍共享测试用户 SID，不能关闭旧反例。必须部署独立服务 SID 后，让同用户及不同用户的真实普通进程在获得合成密文时尝试独立解密，并核对实际 OS token、退出码及摘要，再判生产资格。

依据：[Microsoft DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata)、[Service Accounts](https://learn.microsoft.com/windows/security/identity-protection/access-control/service-accounts)。
