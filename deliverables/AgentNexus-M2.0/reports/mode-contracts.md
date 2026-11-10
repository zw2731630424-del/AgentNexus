# 两种模式合同

## LOCAL_DEVELOPMENT_MODE

新数据目录默认 Local。普通 Windows 用户可启动桌面、在 Model Providers 保存 Key、选择模型、绑定现有 Agent，并通过现有 Gateway 运行 Synthetic Provider。无需 TPM、证书、独立签名设备、CMS、Windows Service 或 UAC。Synthetic 请求清楚标为 SIMULATED，不是 Provider CONNECTED。

凭证存储是当前用户 Windows Credential Manager；普通 SQLite 配置只保留随机引用与元数据。Native helper 通过匿名 stdin/stdout 传递数据，shell=false、windowsHide=true，环境中没有 Key。现有 Vault 的 Key Pool、租约、轮换、撤销、UNKNOWN 占用与 guard 继续生效。

Local 防护边界：防止应用正常调用链把已知 Key 写入 Prompt、Context Archive、普通日志、项目文件、Subagent 或执行环境；限制普通 Agent 通过对象能力取凭证。它不抵御恶意同 SID 进程，不抵御管理员，不承诺进程隔离或内存取证防护。JS 字符串无法保证所有副本被物理清零；可变 Buffer 尽力清零。

Windows 以外的原生凭证适配器尚未实现，状态 NOT_AVAILABLE，不回退明文。OS Storage 被关闭时，保留元数据但不解密任何 Key，不运行模型调用，不接受可能写入秘密的任意文本配置；防泄漏状态显示 BLOCKED，可通过严格 Schema 的安全配置恢复存储。切换不删除凭证。

真实网络代码已接入同一 Gateway，但本轮未调用任何真实 Provider。LIVE 必须由可信 UI 明确确认连接测试，已配置有来源URL且30天内有效的输入/输出费用估算，并通过外发、预算、TLS和端点检查。普通 Agent 使用 LIVE 模型前还要求成功的真实连接记录；不自动退回 Synthetic。账单尚未获得，用户估算不会冒充实际费用。

## HARDENED_DEPLOYMENT_MODE

使用原有独立 Credential Service、Trusted Helper、Trusted Runtime、身份与 IPC 合同。TPM/CNG 和两阶段 CMS 不是该模式所有用户的统一前提；是否必需取决于原部署资格合同。本轮不变更合同中的真实验收条件。

缺少服务、OS身份/运行隔离资格或远程 Profile 绑定时显示 BLOCKED / NOT_QUALIFIED，整条模型派发阻断。当前没有完整 Hardened PASS；不能仅凭服务可连、模拟服务、历史签名工具测试或本地模式成功宣称生产通过。

已有 `host/kernel.sqlite` 但尚无 M2 Profile 的目录视为旧部署：先保留严格模式，要求显式预览、确认和重启才能转为 Local。旧 REAL 账本归属不明时显示 UNRESOLVED_LEGACY_LEDGER_NO_MIGRATION，禁用真实调用，绝不新建一份可用额度冒充原剩余额度。合成账本仍可运行。
