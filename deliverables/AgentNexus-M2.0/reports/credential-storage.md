# Credential Storage 适配与故障恢复

WindowsCredentialManagerStorage 对 CredWriteW / CredReadW / CredDeleteW 的调用使用当前用户 token。随机目标前缀由数据根 namespace 派生，引用只能用于同一 namespace。Key blob 最大2560字节；不写普通配置、不放 argv、不放环境变量。没有密码读取 IPC；Agent只拿 scoped complete。

提交的新 Key 在任何 credential intent 审计之前，先用已有 assertPendingSecretMetadataSafe 检查 Provider、模型范围、标签、旧KeyID等元数据，阻止新 Key 自身混入审计。Key验证失败只返回静态错误。

最多2个原生 helper 同时运行，最多16个有界等待者。超时请求终止；未确认退出时 poison，等待者重新检查 poison，要求重启，不继续制造更多 helper。此为应用容量与恢复机制，不是 OS 进程隔离资格。

删除先将 Key 原子标为 DELETING，确保没有 INFLIGHT/UNKNOWN 租约，再删除 OS 引用。删除确认丢失后，DELETING 元数据保留，启动不尝试解密它，可显式重试幂等删除。expiry、quarantine、普通启用都不能使其复活。状态不确定不伪报删除成功。

实际原生凭证往返、并发使用、重启和UI验收使用 synthetic-test 合成值。受限沙箱下 CredMan 返回 ACCESS_DENIED 的失败证据也保留；普通用户进程下的实测另行记录。真实 API Key 导入为0。

参考：[Microsoft CredWriteW](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credwritew)、[CREDENTIALW](https://learn.microsoft.com/en-us/windows/win32/api/wincred/ns-wincred-credentialw)、[CredReadW](https://learn.microsoft.com/windows/win32/api/wincred/nf-wincred-credreadw)、[Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)。
