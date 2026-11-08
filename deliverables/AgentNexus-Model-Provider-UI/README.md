# AgentNexus Desktop — Model Providers

可运行的 Windows 桌面实现。供应商、模型、多 Key 池、Agent/Task 模型选择和 Usage 已接入 M1.8.2 后端；本轮 **合成工程范围通过，真实 Key 与 LIVE 仍 BLOCKED**。

双击 [Launch-AgentNexus.cmd](Launch-AgentNexus.cmd) 打开。当前机器已安装固定依赖，窗口已正常打开；无需编辑 JSON、环境变量或执行模型认证命令。

1. 点击 **Add Provider**，选择供应商或 Custom Provider，填写 Base URL 和初始模型。
2. 在 **Models** 中增加/编辑模型和默认设置。
3. 在 **API Key Pool** 中添加、禁用、轮换或删除合成 Key。真实 Key 录入尚未开放；测试值必须以 `synthetic-test-` 开头。
4. **Test Connection** 显示资格封锁；**运行合成测试** 经过现有 Gateway 与统一账本，成功也不会显示真实 Connected。
5. 在 **Agents / Messages** 选择默认或 Task 模型，在 **Usage & Billing** 查看 Host 账本。合成测试与真实总额分开。

新增服务测试 **14/14 PASS**，原生桌面测试 **2/2 PASS**，严格类型/语法 **8/8 PASS**。独立审查发现的四项问题均修复复验。完整历史回归仍 FAIL，保留原始结果及同环境基线比较。

[验收报告](acceptance-report.md) · [架构](architecture.md) · [IPC 合同](contracts.md) · [测试矩阵](reports/test-matrix.md) · [独立审查](reports/independent-review.md) · [安全边界](reports/security-boundary.md) · [机器验收](acceptance.json) · [交付索引](delivery-index.json) · [源码压缩包](AgentNexus-Model-Provider-UI-source.zip) · [SHA256](SHA256SUMS.txt)

当前仅实现 OpenAI-compatible 适配器集成；Anthropic-compatible 和 Google Native 明确不支持。生产跨身份凭证服务、唯一账本和真实 Data Egress 资格必须独立完成，不能因桌面测试通过而开启真实 API。

## 开发者复现

在 `source/` 使用 Node 24.15.0、固定 package-lock 依赖。新机器先 `npm ci`、`node node_modules/electron/install.js` 下载并校验 Electron，再 `npm run desktop`。这是依赖安装，不是让用户通过终端配置模型或 Key。网络不可达时恢复同 SHA256 的 Electron 官方包，不跳过校验。

运行 `node tools/agentnexus/verify-desktop.mjs` 验证服务，`npm run test:ui` 验证 Electron UI，`node tools/agentnexus/verify-desktop-static.mjs` 运行严格类型/语法检查。完整回归需把当前实际 Python/PowerShell/Git 可执行路径传给继承测试工具；详见原始记录。模拟调用、生产边界及失败历史见验收报告。

源码包不含 node_modules、编译缓存、Electron 二进制或运行时数据库。已有历史源和项目规则保持原字节；本轮未 commit/push、未部署生产服务。

## 本次 Git 发布

用户后续明确授权“全部保存提交推送”。本轮完整交付、源码 ZIP、测试/失败证据、截图、独立审查、构建和校验工具与发布记录一并提交；基线复测产生的两份新增可靠性 JSON 保留原路径。运行数据库、浏览器 profile 和依赖缓存继续留本地。上文及验收报告中的“未 commit/push”是实施阶段事实，当前发布另见[授权与范围记录](../../.workflow-kit/tasks/AgentNexus-Model-Provider-UI/publication.json)。生产凭证与 LIVE 仍 BLOCKED。
