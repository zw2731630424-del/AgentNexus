# Named Pipe 安全报告

**实际对象 NOT_RUN；当前没有目标 pipe，不存在可供读取的实际 DACL/ML。** 本轮仅枚举 `\\.\pipe\`，未创建 listener、未连接 pipe，也未执行抢占/远程连接。以下为已完整读取的冻结代码合同，不能标为已部署结果。

固定本地名称 `\\.\pipe\AgentNexus.Credential.v1`。源代码 SDDL：

```text
D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;GA;;;S-1-5-80-8808145-1723257024-8982472-3705063417-1094825873)S:(ML;;NW;;;HI)
```

4 个初始实例，第一个使用 FILE_FLAG_FIRST_PIPE_INSTANCE；pipe mode 包含 PIPE_REJECT_REMOTE_CLIENTS。存活期间复用句柄，异常停止 broker。High label 的 NW 是 no-write-up，不是完整文件或内存保密承诺；实际 mandatory label 必须用真实对象安全查询取得。

每消息读取后进行 impersonation，核实际 TokenUser、elevated/high、非 AppContainer、真实进程 token/session、固定 pipe-client 镜像、创建时间和存活。客户端在发秘密前核 SCM 注册实例、server PID/session0、服务 TokenUser、镜像与创建时间。native 认证 envelope 只走私有匿名通道，不信任 JSON 的 PID/SID/role。禁止 read/export/decrypt、任意路径/URL/shell。

Microsoft 指出默认 pipe DACL 可能给予较宽读取权限，且 FILE_GENERIC_WRITE 隐含创建实例权限。这里保持原受保护 DACL；不能为 Medium UI 直接加普通用户泛写。实际令牌与对象访问试验仍是资格要求。[Named Pipe 权限](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)

原协议有 1 MiB 帧、4 连接/在途、绑定 channel/nonce/operation、30 秒录入票据、断线撤回、单次消费、流 ACK 与有限超时。Q_ONLY 只接受可识别合成值，并使用本地 fixture；不代表任何 OS 测试已 PASS。

当前普通 Medium UI 无法满足这条接口，不能把合法 UI 拒绝标为“攻击成功防御、用户体验也通过”。[UI 准入裁定](ui-ipc-decision.md)

获批后应取得：实际 pipe DACL 与 SACL/High label，ordinary same/different SID 的真实 Token 与连接结果，伪 PID/IPC/replay、运行中创建实例、停服期间占名导致真实服务拒启、客户端拒假 server、远程到达 pipe 后被拒，以及断线/进程复用。网络前置失败只计 INCONCLUSIVE；服务不存在只计 NOT_RUN。[测试合同](../tests/windows-attack-tests.json)
