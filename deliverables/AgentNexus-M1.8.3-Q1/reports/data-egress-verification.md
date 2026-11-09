# Data Egress 验证

**静态读取完成；Q1 真实服务进程验证 NOT_RUN。** 没有发送模型请求、没有产生真实 Token/费用，也没有把当前项目、规则、历史或科研正文放进任何 Provider 请求。

冻结 Broker 的顺序为：规范化 exact request/context/subject → 找服务内 grant 并核完整审阅 → 原子预算预留 → 取固定 handle lease → 重建 adapter body 并比较确切字节 → 解密后再次 `#grant` fence → 持久 send intent → FixtureTransport/固定 HTTPS 分支。Header 不来自外部任意 auth 值；Q_ONLY 必走本地 FixtureTransport。

`inspectFinalRequest` 核来源覆盖、context 内容与 hash、固定 system 协议、user message、tools schema、模型/endpoint/header/body 和 JSON.stringify 字节一致性。未知分类和 INTERNAL/CONFIDENTIAL/SECRET 拒绝；Agent 自报 PUBLIC 或 approved=true 不生成 REAL 许可。生产许可只从固定 native helper 核验过的外部 CMS exact-request consent 导入。

Q_ONLY 的 `synthetic.review` 是经过原高权限 IPC 的明确 fixture authority。普通 Agent 的没有这项能力必须在真实 Token/进程/IPC 上验证；不能把有意开放的合成 authority 或发送到 fixture 的允许结果当成生产 consent。已知秘密 Guard 和敏感模式是有限检查，不是通用 DLP。

获批后的测试须记录最终 fixture send 边界的实际计数与调用顺序，分别覆盖缺 grant、未知分类、自报 PUBLIC、body/context/source/tool hash 变更、重放/撤回/到期、Key 撤销以及 UNKNOWN 后续阻断。不能用同进程单测替代真实服务 IPC，也不能为取得证据开放真实 API。[Q1-OS-30](../tests/windows-attack-tests.json)
