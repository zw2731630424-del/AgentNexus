# M1.8.3 Provider UI 集成验证

状态：22/22 桌面单测通过（原 14 项回归 + 新增 8 项端口、UI 与子进程集成）。本验证未使用真实 Key，也未连接真实 Provider。

## 集成结果

保留现有 Provider、模型、Key Pool、Agent 路由、用量与消息页面布局。`desktop/renderer/style.css`、`index.html`、`desktop/preload.cjs` 与既有 Provider UI 副本 SHA-256 一致。渲染脚本仅调整资格状态、凭证入口禁用、提示与提交后的清空行为。

普通桌面入口调用固定 native Credential Service 客户端。缺安装或未通过资格时保留元数据界面，凭证输入禁用，LIVE 测试返回 `BLOCKED`，不会回退到同 SID Host Vault。显式 E2E 环境只有同时设置 `AGENTNEXUS_DESKTOP_E2E` 与 `AGENTNEXUS_DESKTOP_SYNTHETIC_SERVICE=1` 才使用独立合成子进程。

提供 CredentialServicePort 时，Desktop Host 不打开 Vault、不持有 vaultAdmin、不初始化 REAL campaign，也不把 UI 路由预算写入服务账本。凭证增删、轮换、启停与模型范围使用端口调用；Key 列表、创建时间、用量和资格来自服务 snapshot。Host 保留 Context 重建、模型路由与审计。首轮 broker 路由仅允许官方 DeepSeek endpoint 的 `deepseek-flash`；`deepseek-v4-pro` 仍可配置及更新凭证模型范围，但尚未取得独立价格与能力资格，不进入请求路由。其他供应商配置仍可管理。Host 的模型价格字段仅是路由投影，真实成本必须由服务端独立计算。

密码输入所在 renderer 会短暂接触用户正在键入的新值。新凭证字节通过既有受控 IPC 经过 preload、Desktop main/Host，再由服务客户端封送；输入在提交或关闭对话框时清空，受控字节副本在提交后清零。没有已存 Key 的读回、解密或导出 API，也没有 renderer 持久化 Key 的逻辑。此边界不声称 renderer 无法看到正在键入的值。

## 验证证据

执行：`node --test tests/desktop/service.test.ts tests/desktop/isolated.test.ts`，结果 22 passed、0 failed。

新增验证覆盖：无服务时元数据可用及 BLOCKED；Host Vault/REAL campaign/用量预算投影缺席；既有 UI 载荷的保存、轮换、范围同步、启停与删除；broker 唯一执行路径及权威用量；401/403/429/503/timeout 状态；隐式无端口启动被拒；实际 renderer 函数的禁用与提交清空逻辑。独立 Node 子进程集成使用真实 DPAPI 合成凭证，覆盖保存、disable/enable、rotate、模型范围新增及删除、轮换后的 flash fixture 调用、两代 Key 删除和删除后拒绝新请求；同时验证 v4-pro 元数据可管理但请求不路由。`credential.state` 精确转发 `key_id/enabled`，`credential.delete` 精确转发 `key_id`，模型范围更新由 `credential.models` 携带 `models/model_wire_ids`；`credential.save` 继续携带初始范围，启停和删除不附加范围字段。合成成功仍显示 `INCONCLUSIVE`，不改成真实 `CONNECTED`。

`node --check` 已检查 main、preload 与 renderer。renderer 行为测试执行现有脚本和事件处理器；该证据不等同于 Electron 原生窗口的视觉验收。独立合成子进程仍与 Host 使用同一 Windows SID，只证明进程通信与合成链路，不代表生产 OS 隔离资格。构建、类型检查与治理检查由主任务统一执行。

## 最终主代理差异复核

冻结回归另验证服务预算由唯一Owner配置，新增NOT_CONNECTED/REVOKED状态。原Save点击内部使用单次录入ticket，无新增UI认证步骤。精确安装路径且非E2E才可连接原生服务；开发入口及所有测试变量分支只能显式合成或BLOCKED，避免可写profile与debug设置取得REAL端口。当前Electron二进制在应用前退出，原生窗口视觉复验BLOCKED；实际Renderer逻辑及独立Node子进程合同测试通过。最终完整受影响回归以acceptance-report和对应冻结SHA为准，不将此前22项当最终独立源码审查。
