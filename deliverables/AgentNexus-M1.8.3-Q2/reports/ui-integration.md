# Q2 原 Electron UI 最小可信录入集成

结论：桌面代码与纯合成集成验证通过；生产安装、原生窗口、UAC、服务边界及真实 Key/网络验证未运行。生产日常请求因可信 Runtime 来源边界未完成，继续显示 `IPC_BLOCKED` / `LIVE BLOCKED`。

## 已实现

- 保留原 Model Providers、模型目录、Key Pool、Agent 绑定及 Usage & Billing 结构。原 Renderer 密码输入、Key 字节编码与 `credential.save` 提交已移除。Add/Rotate 表单只收非秘密名称并列出固定 Provider/模型范围。
- `credential.entry` 精确校验 `{provider_id, model_ids, action, name, credential_id?, operation_id}`，拒绝额外字段。Provider 仅 `deepseek`，端点仅 `https://api.deepseek.com`，模型仅 `deepseek-flash` / `deepseek-v4-pro`。操作标识是非零、规范小写 UUID，仅用于关联显示，不作为授权。
- `TrustedEntryPort` 仅接受有限 intent。生产 Host 在读取任何 legacy payload 字段前拒绝 `credential.save`；Host 文件中没有 Key 参数或秘密数据结构。历史明文测试保留在单独动态导入的 `synthetic-credential-fixture.ts`，须显式 `syntheticCredentialFixture: true`，且 REAL port 无法开启。
- 保存、轮换、启用、停用、删除与凭据模型范围管理均经短时 helper intent。非新增管理使用固定非秘密名称占位，真实目标名称由 helper 的认证 snapshot 显示，历史标签不会阻止撤销。DISABLE/DELETE/MODELS 允许空模型范围。
- 普通 Main 只启动固定 `C:\Program Files\AgentNexus\credential-launcher.exe`，不使用 shell、不传 stdin、不接收 stdout/stderr。启动环境仅为固定 `SystemRoot` 与 `WINDIR`，不复制 Host 环境中的 Key 或 CLR 启动变量。缺失固定 launcher/helper 时返回 `IPC_BLOCKED`，不尝试 UAC。
- launcher 使用 asInvoker manifest；正常模式必须是非提升 Medium、非 AppContainer、交互会话、固定自身路径及部署 operator SID。`Deployment.Load()` 校验并锁住部署 SHA 链后，才以 `ShellExecuteEx` / 固定 `runas` 启动 `trusted-credential-helper.exe`。参数不接受可执行路径、脚本、URL、环境、stdin 或任意 method。
- Main 元数据与 Chromium profile 使用普通用户 `app.getPath('appData')/AgentNexus`，不使用服务的 ProgramData 目录。默认启动与读取 snapshot 不打开提权窗口。
- helper 仅返回安全退出码；桌面刷新 snapshot 并丢弃扩展返回字段。0 仅表示可信操作完成；20、异常、未知退出及完成后无法刷新均显示 `INCONCLUSIVE`，21/缺部署显示 `IPC_BLOCKED`。凭据保存与 Provider 连通状态独立。
- UI 明确包含 `NOT_CONFIGURED`、`CREDENTIAL_SAVED`、`PROVIDER_CONNECTED`、`INVALID_KEY`、`REVOKED`、`SERVICE_UNAVAILABLE`、`IPC_BLOCKED`、`DATA_EGRESS_BLOCKED`、`BUDGET_EXCEEDED`、`INCONCLUSIVE`。状态服务缺失仍可提交 Add intent；已知元数据保留，未知用量用 `—`，不伪造零计数。模型元数据保存与未确认的凭据范围同步分别提示。

## 验证证据

命令 `node --test tests/desktop/service.test.ts tests/desktop/isolated.test.ts tests/desktop/q2-trusted-entry.test.ts`：32/32 通过，0 skip，0 fail。包括实际 Renderer 脚本的 VM 表单提交、旧元数据/账本/路由回归、有限 intent 与注入拒绝、未读取 legacy payload 的 REAL 拒绝、管理 helper 转发、取消及缺失部署、刷新失败、scope 空集与历史标签、普通请求不能配置服务预算。

之后为 launcher 的固定最小环境增加参数断言，受影响 `q2-trusted-entry.test.ts` 10/10 再次通过，严格 TypeScript 与 launch adapter 语法再次通过。此增量没有运行正常 launcher 或 UAC。

最终名称校验统一为最多 80 个 UTF-16 code unit 并拒绝 surrogate code unit，与 C# helper 的字母/数字白名单一致；补充平面字母、孤立 surrogate、超长值的负测通过。最终受影响 10/10 与严格类型检查再次通过，日志 `ui-final-intent-tests.log`。

严格 NodeNext TypeScript `noEmit` 检查通过；Main/Preload/launch adapter/Renderer 的 `node --check` 通过。复用原锁定 Node 24.15.0、TypeScript 5.9.3、@types/node 24.10.1，无依赖安装。

`native/credential-launcher/build.ps1` 仅编译并运行 `--self-test`：21/21 通过，`windows_boundary_qualified=false`，`uac_invoked=false`。编译器为系统 .NET Framework CSC 4.8.9221.0。测试覆盖参数白名单、额外 method/path/script/url/env/stdin、控制字符、空/重复模型、无效/全零 UUID 与 token 谓词；没有调用正常部署入口。

证据摘要在 [ui-synthetic.json](../evidence/ui-synthetic.json)。日志与构建产物位于 `.workflow-kit/runtime/AgentNexus-M1.8.3-Q2/`。

## 尚未证明

- Renderer VM 测试证明的是逻辑与字段边界，不是 Electron/WinForms 原生窗口的实际隔离。真实窗口及屏幕验收为 `NOT_RUN`。
- 最小环境的合成测试仅证明 Main 的 spawn 参数；`runas` 后的实际环境传播仍属未运行的 OS 验收，不能据此声称已验证。
- 没有安装、账户/ACL 变更、服务操作、防火墙/AppContainer/Ubuntu 操作、真实 Key、外网请求或 UAC 启动。代码不能据此宣称 Windows 边界合格。
- 生产 Daily Runtime 的可信来源与请求授权链未完成。普通接口不具备 `budget.configure` 或管理权限；日常完成请求在调用预算配置/dispatch 前返回 `IPC_BLOCKED`。
- 日常 snapshot 当前被封锁时，服务中已有凭据无法被普通 Host 枚举。helper 完成后的 `CREDENTIAL_SAVED` 是本次操作结果提示，不能代替持久状态验证或连接证据；重启后仍须可信 snapshot。固定二进制缺失或部署 SHA/审批失败时，录入保持封锁。
- 本实现只支持上述固定 DeepSeek 范围。原 Provider 元数据界面继续保留其他配置，不能通过名称、URL 或自定义模型扩大 helper 管理范围。

没有修改原 `AgentNexus-M1.8.3` 交付。
