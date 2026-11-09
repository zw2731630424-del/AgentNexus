# M1.8.3-Q2 Helper 威胁模型与证据边界

这份模型只记录代码机制、假设和缺口。Helper 编译及纯测试通过，不能证明 Windows 服务隔离、UAC、同 SID 内存读取否认、可信输入桌面或实际秘密处理通过。所有 OS 资格与真实 Key 输入仍为 NOT_RUN/BLOCKED。

## 资产与主体

资产包括用户在 Helper 中输入的 API Key、Key 的 base64/UTF-8 副本、票据、Provider/Model/target 绑定、最终确认意图、服务中的凭据和不确定提交结果。

普通 Host/renderer/Agent 视为可被控制，可构造命令行元数据、重复发起意图或伪造 UI 文案。Helper 必须自己显示真实服务 snapshot 与最终确认。服务和受保护的固定部署/签名 qualification 链是信任根的一部分。系统管理员、高权限调试者、内核或机器证据签发者失陷超出当前代码的保护能力；不能借 High IL 宣称对这些主体隔离。

## 攻击面和处理

| 攻击/失败 | 代码处理 | 尚未证明的部分 |
|---|---|---|
| Host 把 Key 放进 stdin、通用 pipe-client、renderer API | Helper 无这些输入通道；只有自身控件收 Key，直接 NamedPipe 发送 | Host 真实链路及同 SID 观察否认须单独实测 |
| CLI 任意方法、路径、URL、脚本、环境、模型别名/映射 | exact 选项、数量、长度、UUID、名称字符及两 wire model allowlist | 非秘密名称仍可能被使用者误填秘密，不能凭字符规则识别语义 |
| Host 调换 Provider/target/模型或旧 snapshot | Helper 自有复核窗；目标从认证服务 snapshot 获取，交易前再次比较 | UI spoof、焦点劫持、恶意桌面、用户是否核对尚未测试 |
| 替换 Helper/launcher/服务/应用 | 父 Common 校验固定路径、全 SHA manifest、签名 qualification 绑定，并持有只读锁 | 实际安装 ACL、reparse、更新原子性、签发和受保护目录资格未测 |
| 同名恶意 pipe/server 或 SCM PID 重用 | 每 RPC 前后核 SCM PID、service SID/session、固定映像和 start identity | 真实 server impersonation/进程变更测试 NOT_RUN |
| 非授权 token/伪造 JSON peer | Helper 检查 operator SID、elevated/high、非 AppContainer；服务核实际消息 token/PID/image | pipe DACL/MIC、Medium 拒绝、远程拒绝资格 NOT_RUN |
| 票据跨连接、篡改 metadata/secret、过期/重放 | 同 channel、operation、metadata SHA、secret SHA、epoch、30 秒和单次 fence | Helper 只运行纯解析；实际双端票据/取消由父合成测试及后续 OS 资格支撑 |
| 取消与提交并发、响应丢失、崩溃 | 本地清空、尽力 ticket.cancel、断线撤销；已尝试 mutation 一律保留不确定；禁止自动重试 | 崩溃 dump、断电/系统终止、实际服务 fence 时序未实测 |
| 复制、拖放、长期明文显示 | 默认掩码；禁止编辑快捷复制/剪切/粘贴/Undo/拖放；显式粘贴；显示 15 秒/失焦掩码；三分钟关闭 | 不证明键盘钩子、UIA、截图、屏幕共享、旁观者读取被阻断 |
| 秘密通过输出、日志、错误或结果泄漏 | 正常 stdout/stderr 为空；无 payload logging；固定错误路径与安全退出码；Host 仅刷新 snapshot | 运行库/系统 crash reporting、第三方注入、外部调试器不在可控输出内 |
| 低权限/同 SID 读取 Helper 进程内存或复制 token | 当前仅有 high-token/映像/身份检查 | **BLOCKED：未实现严格 process/thread/token 对象访问保护；High IL 本身不足以拒绝 VM_READ** |

## 明确的内存与剪贴板缺口

`TextBox.Text`、剪贴板 API、UTF-8 转换、base64 和 JSON 序列化会生成 CLR `string`。这些不可变对象及 GC/WinForms/native buffer 副本不能可靠覆盖。代码只尽力覆盖自己持有的可变字节数组、清空控件/Undo、释放 payload 引用，不能声称“已完全清零”。

显式“粘贴”降低意外读取，不能撤回已存在的剪贴板、Windows 历史、同步、其他监听进程或源应用副本。Helper 不自动修改系统剪贴板。正常掩码不防止显示期间截图，也不证明 UIPI/UIAccess/同权限程序无法读取。普通桌面标题和 UAC 出现本身不使窗口成为受保护秘密输入通道。

高完整性进程的 DACL、线程和 token 对象需要单独设计和证明；仅 elevated/high、固定路径和服务 IPC 校验不提供通用进程内存隔离。后续可审查在收集 Key 前设置最小 process/thread/token DACL、控制继承句柄和 dump 行为的代码方案，并验证同 SID 的 `OpenProcess`/`PROCESS_VM_READ`、handle duplication、debug privilege、thread/token 访问。该方案也不能对管理员/内核失陷给出保证。本轮未调用任何 ACL 修改 API或实际部署保护代码。

## 验证矩阵

| 证据 | 状态 | 含义 |
|---|---|---|
| C# 5 x64 编译、无包下载 | PASS | 编译器接受冻结 Q2 源码；不代表 Windows 边界通过 |
| `--self-test` parser/metadata/ticket/response/snapshot 纯测试 | PASS | 固定合成输入，无 UI/token 查询/管道/部署/UAC/网络 |
| Low token + 缺固定配置的普通入口 | PASS | 当前执行壳为 Low integrity，缺部署时退出 21，stdout/stderr 空；未触发 UAC；不代表 Medium 拒绝实测 |
| UI 布局、掩码/剪贴板/取消交互 | NOT_RUN | 没有启动实际输入窗口 |
| UAC 与 launcher→Helper→服务完整链路 | NOT_RUN | 没有调用 runas 或提升入口 |
| 服务账户、ACL、pipe DACL/MIC/远程拒绝 | NOT_RUN | 本轮禁止安装和变更相关系统对象 |
| 同 SID/Medium 内存读取否认及进程对象保护 | BLOCKED | 代码和 OS 资格均未完成，不得改写为可信内存隔离 PASS |
| 真实 Key、网络、AppContainer、Ubuntu | NOT_RUN | 本轮未使用 |

机器可读记录见 `evidence/helper-native-verification.json` 与 `evidence/helper-boundary-matrix.json`。缺部署负测仅证明相应前置条件下阻断，不可推广为所有安全分支、UAC 或 OS 隔离通过。实际部署和安全资格需单独用户授权，且必须保留已提交但结果未知的事务状态。
