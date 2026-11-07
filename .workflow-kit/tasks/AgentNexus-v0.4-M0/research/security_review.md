# 安全审查与威胁模型

M0结论：没有候选的所审路径可以未经改造直接承担AgentNexus的全部安全根。优先建立独立可信控制域、受限执行域、原始档案和管理员恢复通道。源码观察、隔离复现和未来测试分开；本轮没有证明产品已具备任何沙箱或三模式执行能力。

## 资产与信任边界

资产包括API凭证/订阅认证、项目与科研数据、完整交互档案、授权/一次性任务claim、预算余额、候选树/Review、控制配置与管理审计。攻击者可控制模型输出、网页/MCP返回、仓库文件/依赖脚本、项目规则文本或已获得普通worker代码执行；也考虑服务崩溃、并发、磁盘满和时间异常。机器管理员、被攻陷的OS/可信安装包不在软件沙箱能绝对抵御的范围内。

模型、worker、插件、外部Harness和renderer不能持有可信管理库/原档案的直接写权限，也不能读真实Provider Key。可信Host/Broker自身不加载任意项目插件。Windows工作进程需低权限独立身份/受限token，管理服务与存储由不同ACL控制；仅把进程拆开但继续共享全部OS权限不构成隔离。

## 重点攻击面与控制

| 场景 | 攻击或故障路径 | 程序/OS/数据库控制 | 后续验收 |
|---|---|---|---|
| Prompt Injection | 网页/项目AGENTS伪装管理员命令 | provenance与指令层级；任何授权仅可信通道签发 | P.IDENTITY、P.ADMIN_MODE负向/绕过 |
| 文件逃逸 | ../、大小写、UNC/设备路径、ADS、8.3别名、symlink/reparse/hardlink检查后替换 | resource identity、句柄级访问、限制mount/ACL；不能只用字符串prefix | P.FS_SCOPE-BYPASS/RACE；Windows实测 |
| Shell绕过 | 关闭file工具后从Shell/MCP/代码执行读写或联网 | 所有执行通道同受OS token/网络约束；命令解析只做辅助 | tool全组合绕过与未注册执行拒绝 |
| 外部Harness | 自带tools、hooks、LSP、credential helper绕过宿主菜单 | 进程低权限、网络代理、可达资源收缩；无法证明边界则只读/低风险 | 各adapter隔离一致性；NOT_RUN |
| 伪造批准 | 模型文本/项目文件构造approval或重放旧token | 管理peer认证；参数/hash/subject/期限/nonce绑定，原子consume | P.APPROVAL_REPLAY全套 |
| Mode自降级 | Agent改配置、MCP调用管理员API、DB直写 | 管理与Agent IPC分离，ACL；原生确认challenge；不接受payload自报身份 | P.ADMIN_MODE-BYPASS/RACE |
| PDP故障 | 超时/异常被默认当allow | ENFORCE/AUDIT_ONLY故障暂停副作用；恢复通道只能人工切换 | 服务强杀、审计磁盘满、恢复重启 |
| 旁路失控 | 模式到期、睡眠、时钟回拨或旧permit继续执行 | 有期限授权、单调时钟+持久截止值校验、epoch撤销；过期先封锁再预检 | expiry/reboot/clock skew；不自动延长 |
| Key泄漏 | 工具stdout、堆栈、子进程env、renderer或检索进入模型 | Credential Broker直注上游；env白名单；流式过滤；敏感原文单独加密/ACL | P.SECRET_BOUNDARY；误检/漏检边界保留 |
| 账户限额绕过 | 429后换Key、不同pool共账户 | AccountRef共享配额、全层级原子预留；失败不盲重发 | P.BUDGET_HARD-RACE/RECOVERY |
| 一次性科研动作重跑 | 超时/重启把claim删掉或重置 | 独立专属授权、业务唯一键、不可重置账本；UNKNOWN先reconcile | P.EXPERIMENT_ONCE；仅合成fixture，正式实验不运行 |
| 双写工作区 | lease过期但旧进程仍写；PID复用 | OS进程树确认、启动身份、fencing；新writer不能仅凭超时接管 | P.WORKSPACE_WRITER强杀/并发 |
| 过期Review | PASS未绑定新树、作者自审 | candidate/baseline/rules/test profile绑定；只读独立身份 | P.REVIEW_BINDING-MUTATE/STALE |
| 历史篡改 | summary/offload覆盖raw、metadata与档案双写不同步 | 独立Archive Writer、只追加ACL/哈希/提交屏障；更正追加事件 | P.ARCHIVE_APPEND、双写窗口恢复 |
| 资源耗尽 | 工具输出/事件缓存/重试队列无界；磁盘/WAL满 | 字节高水位、流控、分段、限额、超时与熔断；保留未确认事实 | M7 soak、disk-full、消费者故障 |
| 供应链/遥测 | 依赖安装脚本、插件Hook、外发全量上下文 | 不可信进程、网络默认拒绝；外发独立开关/白名单；锁定资产与notice | 安装/插件需单独授权；telemetry egress测试 |

## 本轮有源码或复现支撑的发现

| ID | 已观察事实及证据 | 对Nexus的处理 | 证据级别 |
|---|---|---|---|
| SEC-WFK-01 | check-kit.py:103—104/release.py:29按basename忽略全部SHA256SUMS.txt；隔离新增嵌套同名文件后校验仍exit 0 | 包清单按规范化完整路径、集合双向相等校验；拒绝重复/链接/漏列/未列文件 | **REPRODUCED**；[复现日志](../../../runtime/AgentNexus-v0.4-M0/workflow-checks.log)及[完整审计](workflow_kit_audit.md) |
| SEC-WFK-02 | govern工具自己写明非host sandbox；身份/授权来源自报；普通govern门不等同严格独立review | 仅保留功能语义，控制改为Broker/ACL/事务；不把本机脚本称强制授权系统 | SOURCE_VERIFIED，见workflow审计8项 |
| SEC-DS-01 | pre-execute无hook时默认allow；工具实际dispatch与guards仍在同进程 | 独立PEP及短期执行许可，Agent插件不能提供最终allow | SOURCE_VERIFIED，[主审计控制流2](primary_harness_audit.md) |
| SEC-DS-02 | live写失败buffer合回、冷读完整log解码 | 不照搬到长期档案；分段/分页/背压 | SOURCE_VERIFIED；非soak泄漏复现 |
| SEC-CLINE-01 | SDK autoApprove仅显式false询问，beforeTool可更改policy | 参数修改后重新授权；插件最多收紧，不能提升权限 | SOURCE_VERIFIED，[Cline审计](harness_secondary.md#1-cline) |
| SEC-GOOSE-01 | Auto全允；SmartApprove参考readonly hint/LLM；进程树清理不是文件网络隔离 | 提示和风险分类只做L2建议，L0/L1独立执行 | SOURCE_VERIFIED，[Goose审计](harness_secondary.md#3-goose) |
| SEC-DA-01 | LocalShellBackend实现SandboxBackendProtocol但无隔离；HITL未列工具可自动批准；offload失败仍可summary | 不按接口名认定沙箱；raw先durable后派生；边界由执行器保障 | SOURCE_VERIFIED，[Deep Agents审计](harness_secondary.md#4-deep-agents) |
| SEC-OH-01 | FileStore词法commonpath后普通open；pending动作可在重新run时执行 | 句柄级执行与reconcile；不能把resume当一次性动作保证 | SOURCE_VERIFIED，[OpenHands审计](primary_harness_audit.md) |
| SEC-AG-01 | boot退出整树tar含ignored文件；quality main-health可按时间放松 | 实时事件档案另建；敏感原文分域；不用于Policy自动旁路 | SOURCE_VERIFIED，[Agensh审计](primary_harness_audit.md) |
| SEC-ZC-01 | 传统server仅authToken配置后才挂鉴权；新server-core另有loopback限制 | 所有入口显式认证；区分新旧入口，不声称已实测公网暴露 | SOURCE_VERIFIED，[ZCode审计](public_interfaces.md#zcode) |
| SEC-ZC-02 | 非plan yolo/guarded在部分deny之前allow | 本项目硬禁止先于便利模式；不直接复用该策略服务 | SOURCE_VERIFIED；不是把上游有意模式称已证实漏洞 |
| SEC-CC-01 | Claude SDK can_use_tool可能被allow/bypass规则提前满足 | 回调只是集成层；独立OS能力和费用限制不可缺 | SOURCE_VERIFIED，[Claude审计](public_interfaces.md) |
| SEC-SQL-01 | 官方披露WAL-reset影响至3.51.2；本机Python SQLite3.49.1在范围，Node绑定3.51.3 | 生产最低版本3.51.3或经核实的补丁版；不能由一般并发测试PASS代替版本修复 | 上游[WAL-reset说明](https://sqlite.org/wal.html#walreset)与本轮真实版本/探针 |

这些发现用于设计准入，不推断未审路径都不安全，也不冒称已为上游验证可利用漏洞。只有SEC-WFK-01实际运行了针对缺陷的隔离复现；其他表项主要是源码控制流与本项目要求之间的差异。

## 三模式不能模糊的部分

DISABLED必须真实跳过选定范围的应用PDP，而不是继续全部执行却只换UI标签。AUDIT_ONLY必须记录原判定，只对管理员选定可降级条款解除阻断。独立OS沙箱、项目目录、密钥边界、原档案、事务、管理审计和专属科研授权仍由各自owner落实；关闭这些保护要另一个独立、明确的管理动作。

到期不是盲目“恢复成功”：先停止旁路新动作，撤销旧epoch，检查配置与旁路期间操作，再运行预检。失败进入ENFORCE_PENDING_PREFLIGHT并保持受控操作封锁。PDP不可用不能自动进入任何宽松模式；故障隔离不意味着授予新能力。设计见[Policy Catalog](../architecture/policy_catalog.md)及[协议](../architecture/internal_protocols.md)。

## 安全验证边界

本轮已运行Workflow Kit隔离测试及小型SQLite/Zstd/尾记录探针；它们不启动候选Harness或真实模型。尚未运行的产品级门：Windows受限读写/网络/进程逃逸、外部Harness完整通道覆盖、策略三模式、假冒管理peer、管理员确认challenge、凭证实际接入、断电、长时soak、两供应商费用对账、正式科研权限链。全为NOT_RUN。

强制测试顺序：先纯规格/数据库状态竞争，再专用合成工作区上的真实OS对抗，最后已授权无风险真实开发任务。无法证明的执行后端不得获得高风险/科研权限；这里的“不得”需由将来的执行器和能力发放程序实现，不依赖模型承诺。
