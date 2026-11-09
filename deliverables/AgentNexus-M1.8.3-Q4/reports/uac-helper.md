# Trusted Helper / UAC

**全部真实部署场景 NOT_RUN。** 本轮未启动 UAC、普通 Launcher 提升路径或生产输入窗口，未录入真实或部署后合成 Key。固定 Launcher/Helper 源码与二进制存在且 Hash 匹配，但未签名，编译纯测不能验证 UAC、对象权限、WinForms/CLR兼容或旧句柄竞态。标准用户借其他管理员凭证仍须拒绝，不绕过原 Operator。

- 管理员同SID UAC同意：NOT_RUN。
- 标准用户未经批准提升拒绝：NOT_RUN。
- 其他管理员凭证身份绑定/拒绝：NOT_RUN。
- 用户取消UAC：NOT_RUN。
- Helper启动失败：NOT_RUN。
- 服务不存在：NOT_RUN。
- 服务拒绝：NOT_RUN。
- Ticket过期：NOT_RUN。
- 重放：NOT_RUN。
- 保存ACK丢失：NOT_RUN。
- Helper异常退出：NOT_RUN。

[逐项结果](../tests/uac-helper-results.json)。
