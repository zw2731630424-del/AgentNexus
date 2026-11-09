# AgentNexus M1.8.3-Q3 独立安全复审

状态：**独立复审完成；离线合成/纯测试通过，生产原生边界仍 BLOCKED。** 本文不是生产资格或 UAC/OS 验收结论。

本复审由独立代理执行，只读产品源代码。仅写入本报告、`evidence/independent-review/` 和本任务独立复审运行目录。未委派下级代理，未安装产品、创建服务/账户、变更系统 ACL、触发 UAC、录入真实 Key 或连接真实 Provider。

## 已发现并修复的问题

1. **Q3-IR-01：普通界面预算字段与服务账本权威不一致。** 初次源码审查发现日常通道不发送 `budget.configure`，但 UI 仍显示可编辑 Agent/Task Token Limit。未取得修复前真实发送证据，因此不声称已演示超预算消费。修复后独立进程探针确认 `binding.save(budget_tokens=1)` 被 `SERVICE_MANAGED_BUDGET` 拒绝，UI 说明服务管理预算。服务总额和计数未被普通调用者重置。
2. **Q3-IR-02：Host 内部模型 ID 与服务 wire 模型 scope 不一致。** 独立实际进程探针将 `deepseek-flash` scope 合成凭据存入服务，再从 Host 发请求，修复前得到 `NO_AVAILABLE_MODEL`，账本使用量为零。修复后同一路径成功，结果为 `SIMULATED/SUCCEEDED`，统一服务账本使用 30 Token、占用为零。修复前和修复后证据均已冻结。
3. **Q3-IR-03：原生路径缺少与合成 relay 相当的积压上限。** 源码审查发现慢读者可在下游写超时前堆积 engine 的 Promise 响应队列；此为静态发现，未进行原生 OS 洪泛实验。现有修复为原生 Session 维护请求 ID/字节窗口、拒绝重复活动 ID、只按终结响应释放占用，并限制 ACK 顺序；engine 增加每通道 16 个 RPC、全局 64 帧及 4 MiB 输出上限。限制的实际原生执行和耗尽行为仍需部署资格测试。
4. **Q3-IR-04：独立服务查询操作员进程/令牌的权限依赖未明确建立。** 此为静态部署可用性与边界假设发现，不是已演示提权。日常入口已改为验证每条消息实际冒充令牌、内核管道会话及连接 PID 连续性，原生 Runtime 的权威来自服务保留的子进程句柄。管理入口保留固定 Helper 进程核验，并在生产 Helper 打开任何管道、收集任何输入前设置服务专用 query 权限。新 Helper 对象安全代码只编译和执行纯描述符测试，未在真实提权进程上执行。
5. **Q3-IR-05：部署初稿的完整性、批准时序和权限边界不足。** 静态复审发现初稿会将受保护 policy 文件设为 service-writable，且签名/主机/类型/测试名检查、目录保护时点和锁后路径重开存在缺口。实现者已修正为：默认仅验证；Apply 前按同一已锁定字节验证 SHA-256 pin、两份 CMS、主机/SID/epoch/期限/十九项原生测试名，重新哈希 held payload；只从 held stream 复制清单文件，先保护根再复制，service 仅可写三个状态树；核验安装后文件集合及哈希，拒绝已有安装/数据/服务，不自动删除旧账本。清单重复路径曾可掩盖额外文件，现使用规范化且大小写不敏感的精确集合验证。默认负例还实际发现并修复了异常清理掩盖原拒绝码的问题。变更系统的 Apply 分支仅静态审查，未执行。

未发现尚未修复、已确认可越过凭据/精确外发授权/共享预算的漏洞；这不是证明不存在漏洞。以下生产阻断项仍然有效。

## 安全边界审查结论

- **来源与权限分离：** 普通调用者只能使用有限 Daily 方法；管理入口仍为单独 High 管道和固定 Helper。新 Runtime 由服务身份以固定映像、工作目录、环境和显式三个继承句柄启动，保留进程句柄及 kill-on-close Job。PID、映像路径、哈希或调用者 Subject JSON 均不独立构成授权。
- **服务与 Helper 的 query readback：** 服务对象向操作员、Helper 对象向服务授予的进程权限为 `0x00101000`，令牌权限为 `0x8`，没有 VM、句柄复制、令牌复制或写权限。独立 Runtime 的进程/线程 ACL 没有操作员授权。上述为源码/常量审查，实际 Windows 对象读取及拒绝结果未验证。命名管道使用个别访问权而非 GENERIC_WRITE，避免其隐含 CREATE_PIPE_INSTANCE；该解释符合 [Microsoft 的命名管道权限说明](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)。
- **精确请求授权：** QUALIFIED 生产请求仍先取得服务内导入的、按机器/服务 SID/epoch/期限绑定的 CMS 签名精确 consent。最终 URL、POST、headers、序列化 body、完整 context 和 tools 范围接受既有检查。另行签名批准的 QUALIFICATION_ONLY 分支可对原生日常测试请求调用既有合成 review，但只使用 SIMULATED 存储和本地 fixture，没有 REAL vault/Provider 网络；该原生测试分支本次未部署执行。普通 Daily 方法没有生产 consent 签名、自报 PUBLIC 授权或通用 HTTP/命令/文件代理能力。
- **grant 与 ticket：** DailyGrant 持久绑定服务实例、Runtime、通道、Subject、完整输入、请求/操作/nonce、epoch、deadline 和保守 Token 上限；单次消费与四级预算占用在同一 SQLite 事务中完成。捕获后换连接、改输入或额度不构成 bearer 权限。Helper ticket 仍绑定 channel、operation、metadata/secret 摘要、epoch、有效期及状态，并在加密提交边界重新检查。
- **崩溃与预算：** 服务恢复撤销未用 grant；已 SENT/无法确定结果的请求保留 UNKNOWN 和占用，阻止自动重发。原账本 owner、100,000,000 Token 全局上限和四级预算没有因 UI 配置、模型切换或重启而创建第二份消费权。普通 UI 的预算已明确为服务管理；其本地显示不是服务授权。
- **启动与秘密输入：** Launcher 读取受保护、非秘密的机器/操作员/映像/期限 launch plan，只允许固定 Helper 和有限参数，生产入口不接收 Key 字节。真实路径要求同 SID 分离管理员令牌，标准用户以另一管理员身份批准被拒绝；实际 runas/UAC 未运行。Key 输入及最终确认属于独立 WinForms 窗口，生产端口不连接 Helper stdio 秘密流。
- **Helper 对象加固的限制：** 新代码在自身对象上设置 BA/SY 所有权与 DACL、服务 query-only readback，并在枚举既有线程前调整自身令牌的未来对象默认项，失败即退出。该设计不会撤销已打开句柄，也未消除启动竞争；同等 High 管理员不在该隔离承诺内。不能由描述符纯测试推出实际内存/转储隔离。微软区分 [进程 VM/句柄权限](https://learn.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights) 与 [令牌 query/duplicate 权限](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-rights-for-access-token-objects)，本复审按此区分能力，未将 query 权限称为秘密读取权限。

## 已独立执行的攻击验证

实际本地同 SID 的 Node service / Runtime / pipe-client 进程与命名管道，共五个明确场景：

- 逐字节分片的 UTF-8 请求保持精确绑定；修改 grant Token 总额在发送前被拒绝，原始 grant 可执行一次。
- 其他连接无法取消未发送 grant；所有者取消后永久拒绝该 grant 执行。
- 超过 1 MiB 和畸形 JSON 帧只断开攻击者连接，服务和 Runtime 仍可用，账本不变。
- 畸形参数与伪造嵌套原生身份字段不产生权限或消费。
- 流式消费者不 ACK，约 10 秒后产生 `SERVICE_SENT_OUTCOME_UNKNOWN`；保留 4,973 Token 占用，重复执行拒绝，无自动重发；合成 Key canary 未出现在响应线上。

这些测试证明所执行合成进程协议行为，不证明独立 Windows 服务账户、MIC、UAC、进程内存隔离、真正原生命名管道令牌身份或 DPAPI 隔离已通过。

完整 Electron + 合成 WinForms UI 证据由实现代理执行，独立复审读取其源码和协议；本独立复审未重复操作 UI。合成控制器为测试将固定 dummy canary 从 worker 经 Electron Main 转发给合成服务，因此该 UI 测试不能用于声称 Main/Host 内存 canary 隔离。

## 生产阻断项

1. 未获部署/资格测试许可，未安装或启动独立虚拟服务账户服务，未实际应用/测量新原生服务和 Helper 的对象安全 API、MIC、pipe 令牌冒充、继承句柄、跨 SID/会话、客户端线程 token 交接、原生 Runtime 生命周期/并发/流控及故障关闭行为。
2. 原始 70 个 Windows 攻击测试仍为 NOT_RUN；新资格门禁要求 19 个签名证据类别，含四个 Daily 类别，旧 Q2 15 类结果不被接纳。编译、纯测试及同 SID 合成进程结果不填充 OS PASS。
3. 真实 Helper 的 UAC、输入来源、内存/clipboard/dump 及旧句柄/启动竞争实验仍未执行；无生产内存隔离结论。
4. 生产 REAL 账本仍需在另行批准的部署中按既有 owner 和零用量基线提供，丢失账本文件会阻断而不会重置配额。真实凭据导入和真实 Provider 调用还需要各自明确授权及有效部署/精确外发 consent。

## 冻结与复测证据

最终独立复测时间为 **2026-11-09 09:03:16–09:03:34 UTC**，覆盖最终 wire 模型兼容分支和签名 QUALIFICATION_ONLY 条件的静态复核。范围内 48 个源文件/验证依赖的执行前后 SHA-256 完全一致，见 [实际源码快照](../evidence/independent-review/reviewed-source-sha256.json)。独立代理未修改任何产品源码。原 Q2 的 **215 PASS、2 SKIP、70 NOT_RUN** 历史证据保持原样。

| 独立执行内容 | 结果 | 直接证据 |
|---|---|---|
| 五个真实同 SID 合成进程/管道攻击场景 | 5 PASS，0 FAIL | [pipe-attacks.json](../evidence/independent-review/pipe-attacks.json) |
| Host → Runtime → Daily pipe → 服务 route / UI 预算拒绝 | SUCCEEDED；30 used、0 held；SERVICE_MANAGED_BUDGET | [修复后探针](../evidence/independent-review/desktop-after-fix.json) |
| 相同 wire scope 修复前 route 失败 | NO_AVAILABLE_MODEL；0 used、0 held | [修复前探针](../evidence/independent-review/desktop-before-routing-fix.json) |
| 独立重编译原生服务，warnings as errors | 90 个既有纯断言通过 | [native-compilation.json](../evidence/independent-review/native-compilation.json) |
| 独立重编译 Helper / Launcher，warnings as errors | 138 / 36 个既有纯断言通过 | [entry-compilation.json](../evidence/independent-review/entry-compilation.json) |
| 安装器默认 verify-only：有效清单及六个明确负例 | 7 个场景通过；无 Apply/StartService/UAC | [installer-readonly-tests.json](../evidence/independent-review/installer-readonly-tests.json) |

以上纯断言不是 OS 测试，也不与 Q2 基线重复相加。[最终复测记录](../evidence/independent-review/final-recheck.json) 包含实际时间、exit code、stdout/stderr 摘要；五次运行的 stderr 均为空。合成测试没有真实 Provider 网络调用。

关键文件摘要如下；完整路径与 SHA-256 以快照 JSON 为准：

| 文件 | SHA-256 |
|---|---|
| native/credential-service/Common.cs | `f9b8a6d34f6251a7a3b01a90ae485762d8a70c7dcfffef4bb4af047eb026ac0e` |
| native/credential-service/CredentialService.cs | `d2c9d8ee014775e8b22a55a02764c8439cce3525a371c62097d2e68255ba6f8c` |
| native/credential-service/DailyRuntime.cs | `80fe489ec6cff1d6a513753c57c42428fee83f098cafc5714f0ecdd1a0e3a716` |
| native/credential-helper/HelperObjectSecurity.cs | `76bb0953388c491c8d7378ed060c06beb89bf43b5b73cc50d38626dd4d5c2fbc` |
| credential-service/engine.ts | `04bce38adf4276ae7096565917213666ca76d26fad9e7911fc16713fdbbb03bc` |
| credential-service/daily-gateway.ts | `15ea6b32b37643fd860c9dc884ddfa3f0a487a8f02d5843df172247533eedcde` |
| credential-service/store.ts | `0343e86e7560499853b3a0314ced864cbdad3cf13a71597664a072ca83a8bd1a` |
| credential-service/client.ts | `3833767c18d31d5355df5e796756661f54abd183d3ef2db61c3a7e05700acf2f` |

部署工具初次增量复审于 **2026-11-09 09:12:30 UTC** 冻结，许可证回退增量于 **09:22:34 UTC** 复核更新。安装器默认验证于 09:11:22 UTC 通过：有效 payload 只返回 `PAYLOAD_VERIFIED_ONLY / system_changes=false / approved=false`；重复路径、大小写重复、父目录逃逸、Windows 尾点别名、额外文件及字节篡改均返回预期拒绝码。09:22:34 再次检查核心 48 文件与上述快照一致，安装器也保持同一哈希，见 [部署工具复审记录](../evidence/independent-review/deployment-tools-review.json)。未测试 Apply，也未由独立复审代理执行打包脚本。

| 部署工具 | SHA-256 |
|---|---|
| tools/agentnexus/install-q3-qualification.ps1 | `8985976a9be9758c7288cfb2a6b3482f41401bc5aa95a687b208fc932c797bcd` |
| tools/agentnexus/package-q3.py | `d2459e01396f154dc9a87549b0ae93d02b1a7ca69e34c817af15681194866a2d` |

## 冻结后的小范围增量复核

- `package-q3.py` 仅增加固定版本许可证文件回退：本地 Node 目录没有 LICENSE 时，从 `source/assets/licenses/node-v24.15.0-LICENSE.txt` 复制到 staging 的 `licenses/node-LICENSE.txt`。使用既有复制函数，不改变运行时、权限或安装动作。上表为当前脚本哈希；旧哈希仅作为已取代的历史值保存在附录证据中。
- `tests/agentnexus/m18-vault.test.ts` 只增加 `unlink` 导入及成功创建 junction 后注册的 `child.after` 清理：删除本次新建的精确链接项，未递归删除或遍历目标，原 `VAULT_UNSAFE_PATH` 断言保留。独立复审检查实现代理提供的完整 Vault 日志，记录为 **27 PASS / 0 FAIL / 0 SKIP**；此次未由独立复审重复执行该套件，也未计入原 70 项 OS 资格测试。
- 治理缓存包装器仍调用原 `govern.py` 的 main，未替换分类、策略、摘要或路径守卫逻辑；在文件系统保持冻结的前提下，元数据缓存可用于加速。结束时的 mode/device/inode/attributes 复核不构成对瞬态并发变化的完整防护，resolve 缓存也未在结束时逐项重新解析。因此本复核不声称其对并发变化文件系统完全等价，亦未将治理检查视为 OS 安全资格证据。独立复审只静态检查该包装器，未运行它。

上述增量文件、许可证、Vault 日志、包装器及原治理器的实际 SHA-256 见 [增量复核记录](../evidence/independent-review/post-review-addendum.json)。生产原生资格仍为 BLOCKED，70 项 OS 测试状态保持 NOT_RUN。
