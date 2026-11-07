# Workflow 许可补救与原生完整性合同（M0.1）

状态：M0.1 设计与本地证据复核；未开发 M1 verifier。主代理已冻结下面的 manifest 形状、编码、精确自体例外和 `sourceMode` 接口。本文件遵循 [内部协议 v0.2](internal_protocols.md) 与 [ADR 008](adr/008-m1-admission.md)；M0 原文和原套件保持原字节。

本轮结论：Workflow Kit 的复制、改编后纳入及发行准入仍为 **BLOCKED**，证据标签为 `NOASSERTION`；本地材料没有补上版权授权。可继续按行为要求独立实现，不把这个结论扩大为禁止自有实现，也不宣称法律意义的 clean-room 已成立。包字节完整性、来源授权、OS 文件读取边界分别验收，一个通过不能代替另外两个。

## 1. 复核证据与能证明的范围

已完整读取 M0 的 [Workflow 审计](../../AgentNexus-v0.4-M0/research/workflow_kit_audit.md)、[许可清单](../../AgentNexus-v0.4-M0/research/license_inventory.md)、[105 文件映射](../../AgentNexus-v0.4-M0/architecture/workflow_kit_mapping.md) 和 [ADR 003](../../AgentNexus-v0.4-M0/architecture/adr/003-workflow-native.md)。当前复核只涉及已提供的 105 文件、两个输入归档及 `SOURCES.json`；没有重新抓取其他上游、联系权利人或获取新许可。

| 项目 | 本轮观察 | 解释边界 |
|---|---|---|
| 安装参考树 | 105 文件、351144 字节；全部按真实字节重新 SHA-256、严格 UTF-8 解码和许可标记检索 | 与 M0 逐文件清单、原 ZIP 均无新增/遗漏/变化 |
| 独立 ZIP | `4cad510cf666d37e0adb81f39ca3f1f29aa9f3b3ae7313726946e572e51736ec` | 105 条目，无目录条目/精确重复条目；不是发行者认证 |
| Handoff | `f669dad4a6b6937ca3d7c2463b8b2327b3fe2bb8fe2c8a53e6dfb4f2265b3934`；内嵌 ZIP 与独立 ZIP 字节相同 | 用户提供资料不产生上游许可授予 |
| 许可正文/文件 | 未发现 LICENSE、NOTICE、COPYING、SPDX 或版权授予正文 | 关键词检索仅 2 处命中，均为 `tools/govern.py:110–111` 的目标项目文件名白名单 |
| SOURCES | SHA-256 `33514534a4a66372a572e912a05fafe37154fae54e59453a9e3360386b00519d`；全部递归字段均已检查，无许可、作者、版权、授权字段 | 2.5 的 59 条、2.6 的 67 条及 3.0 基础归档 hash 是继承来源陈述；对应旧 ZIP 未在已知根路径提供 |
| 路径/链接元数据 | 105 路径均 ASCII，无 NFC+大小写折叠冲突；直接 `os.lstat()` 未见 reparse 或多硬链接，链接计数全部为 1 | 只是本次静态观察，不是敌对并发安全、ADS 全覆盖或后续源树不变的证明 |

机器记录：[license_recheck.json](../research/license_recheck.json)；逐文件事实与复核脚本在 `../../../runtime/AgentNexus-v0.4-M0.1/integrity/`。保护快照覆盖完整 M0 task/runtime 树、原安装套件、两个输入 ZIP、AGENTS 和 policy，前后差异见 `preservation_after.json`。不保存来源表达的新增副本，只新增路径、字节数、hash、匹配标记和本次设计。

本轮没有运行 Kit 的安装器、测试或 release，没有安装 hooks、commit/push、联网发布、科研任务、真实模型或 Key 探查。既有治理工具仅按项目要求用于本轮新文件登记和治理检查，不被当作 AgentNexus 的运行实现。

## 2. 许可补救路线及解除条件

`NOASSERTION` 表示已提供材料不足以作授权断言；不推定用户、套件提交者或未知上游拥有全部版权，也不据此判断任何人的法律权利。Kit 的源码、模板、提示词、测试和文档表达全部维持隔离来源地位。M0 的 3 项 `REUSE` 仅说明版本/hash/来源元数据在原证据中保留，不给产品分发原文件的许可。

| 路线 | 必备证据 | 准入变化 |
|---|---|---|
| 取得明确授予 | 能核实的权利人/授权主体、授予原文及日期、覆盖文件与版本/hash、复制/修改/发行范围、适用 NOTICE/保留条件；历史合并内容的权利链也在覆盖内 | 只对实际覆盖且履行条件的文件重新判定；没有覆盖的文件仍 BLOCKED |
| 找到可核实的既有许可 | 明确发行来源及精确版本、该版本许可/版权/例外全文、与本地文件的对应关系和文件级覆盖 | 禁止把另一个版本、相似项目或根许可自动套给全部 105 文件 |
| 独立实现 | 自写行为规格、独立代码/模板/测试、新文件来源台账；不复制 Kit 表达或将其改名翻译作为实现；由审查记录核对实际候选 diff | 对自有实现单独验收；无授权 Kit 的复制/发行状态不变 |

本轮选择第三路线推进设计。前两路线仅列所需证据，不自动向任何人发消息，也不为 Kit 添加 LICENSE/SPDX、填写版权人或代签授予。将来若获得许可，另存新证据并建立受控的新来源版本；禁止改写原 ZIP、原安装树或 M0 以伪造历史已获许可。

## 3. 冻结的 M1 manifest 与 API

唯一自体路径是包根 **`manifest.json`**，按完整相对路径精确匹配；不是 basename、glob、大小写不敏感后缀或任意 ignore 列表。`a/manifest.json`、`validation/SHA256SUMS.txt` 和 `a/b/SHA256SUMS.txt` 都是普通文件：存在则必须列入清单并校验。根 manifest 必须存在、普通、单链接，且不能把自己列入 `files`。

顶层只允许以下字段，entry 也只允许三字段：

```ts
{
  schema: 'agentnexus/package/1',
  profile: 'portable-ascii-v1',
  files: Array<{ path: string; bytes: number; sha256: string }>
}

verifyPackage(root, {
  sourceMode: 'controlled_static' | 'mutable',
  maxFiles?,
  maxTotalBytes?
}) -> Promise<{ status, reason, filesChecked, bytesChecked, checks, ... }>
```

`bytes` 是非负安全整数，且在下列预算内；`sha256` 恰好 64 个小写十六进制字符。`files` 按完整 `path` 的 JS codepoint 顺序排列，完整路径唯一。拒绝未知字段、非对象 entry、null、错误类型、非安全整数和不认识的 schema/profile；不把清单对象 merge 到 Host 配置或原型。

规范编码：递归对象键用 JS `.sort()` 排序，数组保序，`JSON.stringify` 无空白，末尾恰好一个 LF，UTF-8 无 BOM。读取时先作有界、严格 UTF-8 解码和 JSON 解析，再严格检查形状并规范重编码；**原始全部字节必须与规范编码完全相等**。单用 `JSON.parse` 会丢失重复对象键，因此不能单用解析后对象验证；字节一致合同同时拒绝重复 JSON 键、替代转义、多余空白/换行和 `-0` 等非规范表示。此合同只接受规范输入，不做会掩盖冲突的自动清洗。普通文件的 hash 使用二进制原文，不转换 CRLF/编码。

`status` 使用本轮六态 `PASS/FAIL/NOT_RUN/INCONCLUSIVE/BLOCKED/BYPASSED`。完整性错误返回 FAIL，无法获得稳定/足够 OS 事实返回 INCONCLUSIVE，未执行返回 NOT_RUN；准入不满足返回 BLOCKED。许可证状态另有 admission 字段，不能因完整性 PASS 而升级。模拟测试的范围写入 evidence scope，不为真实模型或 OS 行为冒认 PASS。License、测试结果、签名身份和完整性分别报告。

## 4. 路径、目录和双向集合

M1 的 `portable-ascii-v1` 先只接受组件 `[A-Za-z0-9._-]+`，由单个 `/` 分隔。拒绝空路径/组件、`.`/`..` 组件、绝对路径、盘符、UNC/设备前缀、反斜线、冒号/ADS、控制字符、空格、尾点、`~` 别名和全部非 ASCII 字符。Windows 保留设备名（包括带扩展名的 CON/PRN/AUX/NUL/COM1–9/LPT1–9）按不区分大小写拒绝；其余 Windows 特殊字符也不进入字符白名单。Unicode 在 M1 明确拒绝，不用 `normalize()` 将不合法路径变成合法路径。后续 Unicode profile 必须另冻版本并测试 NFC/NFD、大小写映射和规范化碰撞，不能静默扩大本 profile。[Windows 命名约定](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)

比较同时保留原始完整相对路径和 ASCII lowercase 冲突键。清单和实际树都建组件 trie：不仅拒绝 `A.txt/a.txt`，还拒绝 `Dir/a` 与 `dir/b` 造成的目录大小写冲突，以及 `a` 为文件同时出现 `a/b` 的文件/目录冲突。实际路径与清单要求原大小写完全相同；不依赖 Windows 的宽松查找来视为匹配。

设 `A` 为实际所有普通文件的完整相对路径集合，`M` 为清单 `files.path` 集合，`k = manifest.json`：

1. 验证根和逐级目录/文件类型，不跟随链接；完整枚举，不跳过隐藏文件、`.git`、缓存或未知扩展。
2. 验证 `k` 存在且 `k ∉ M`，精确例外数量恰为 1。
3. 要求 `A \ {k} = M`；分别列出 missing、unlisted、duplicate、alias/path-conflict，再比每项 bytes 和 SHA-256。
4. 实际目录集合必须等于 `M` 所有父目录的集合；根除外。多出的空目录、无权枚举的目录也不能静默忽略。
5. 校验完成后再枚举、重查身份与元数据；记录候选清单本身的 SHA-256 及总体树指纹到包外可信审计。

验证器只操作专用候选包树；验证报告、缓存和输出放在树外。旧 Kit 的 `SHA256SUMS.txt` 仅作为旧来源事实，M1 不执行原 check-kit/release，也不复制其实现。M0 已复现的 WFK-01 被转为新合成负例，而非再把探针写入原套件。

## 5. 链接、目录逃逸和恶意文件

拒绝文件/目录 symlink、junction、所有 reparse tag（包括不是普通 symlink 的项）、硬链接 `nlink > 1`、非普通文件、跨设备挂载及身份重复。`nlink` 缺失、零、无效或平台无法可靠提供时不得 PASS；拒绝不能先去读链接目标来“确认”。根及受信锚点以下的祖先也要纳入检查，不能只看最后组件。

Node 用 BigInt 形式的 lstat/fstat 元数据、受限枚举和流式 `node:crypto`，比较同一提供者的文件身份；不能把不同提供者/不同宽度的设备 ID 直接比较。本机 Node 24.15.0 的 `O_NOFOLLOW` 不存在，官方精确版本文档也未向 Windows 提供该打开标志。因此 `lstat → realpath → open` 和字符串前缀比较不构成反路径置换的 OS 保证。[Node 24.15.0 fs](https://nodejs.org/download/release/v24.15.0/docs/api/fs.html#file-system-constants)

M1 可由已装 Python/PowerShell 进行固定、可信、只读预检，不带入新的运行包：Python 必须直接 `os.lstat()` 获取 Windows 属性/tag，不能用 `DirEntry.stat()` 的缓存身份/链接计数当可靠事实；本机 SOURCES 探针曾观察后者 dev/ino/nlink 全 0，而直接 lstat 的 nlink 为 1。PowerShell 执行器路径/代码由 Host 固定、禁配置文件加载，参数走 argv，不执行候选包脚本。此预检仍不是抗并发边界。[Python Windows stat 字段](https://docs.python.org/3.12/library/os.html#os.stat_result)

硬链接可能指向树外同一卷上的对象，只查 realpath 不够；检查链接数与句柄身份才能覆盖这一类。本机已有探针无法创建某些链接时，相关真实 OS 负例必须记 NOT_RUN，不用模拟元数据冒充 OS 通过。[Windows hard links](https://learn.microsoft.com/en-us/windows/win32/fileio/hard-links-and-junctions)

拒绝不受支持的流/文件系统类型；任意既有 NTFS 树还需枚举并拒绝非默认 ADS，普通 readdir+默认流 hash 不能证明不存在额外流。M1 的受控包由 Host 新建普通文件、只写默认流，并以这个来源事实限定 PASS。稀疏文件按逻辑大小计预算；读错误、权限错误、不可枚举项不跳过。包内文件从不 import、eval、求值或启动；哈希一致也不证明内容没有恶意。

## 6. TOCTOU、稳定性和准入强度

`sourceMode` 是 Host 对操作来源的选择，不能由 manifest、Agent 或未认证调用者自报为受控。`controlled_static` 的 PASS 仅在 Host 独占、无不可信写者且验后消费同一候选版本的研究/发行 staging 前提下成立；这个前提须写入 checks/evidence。M1 同用户进程测试本身不证明恶意主体无法写入，也不能用 `chmod read-only`、进程内锁或 watcher 代替 OS 隔离。

`mutable` 即使所有路径/hash 匹配，也只能返回 **INCONCLUSIVE，reason=TOCTOU_NOT_CLOSED**。读取期间检测到真实变化则 FAIL/CHANGED_DURING_READ；可疑共享冲突或身份能力不足则 INCONCLUSIVE。保持打开的同一 fd 读 hash、读前/后 fstat、逐级检查和二次枚举能发现部分变化，无法排除同尺寸改写、目录置换、链接竞争或验后替换。禁止用这类 PASS 为后续重新按路径打开的执行器发授权。

未来若要对敌对可变树或真实发行给出更强准入，需要可信 OS 快照/隔离身份/句柄通道；在 Windows 上评估不跟随 reparse 的打开、卷+文件身份、链接数、限制写/删除共享和目录锚定，并让消费者读取同一快照/句柄。`FILE_FLAG_OPEN_REPARSE_POINT` 只影响有关打开行为，不能单独保证整条祖先链安全；精确 OS 集成与绕过测试未完成前保持 BLOCKED，不在本轮增加 helper 或 npm FFI。[CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew)、[句柄文件信息](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/ns-fileapi-by_handle_file_information)

manifest 的自体例外用包外可信记录的 manifest SHA-256 约束；不能要求文件包含自身普通 hash。若攻击者可同时替换内容和 manifest，内部一致性检查可能通过，来源认证仍需可信根/签名和发行授权。SHA-256 不替代来源认证、代码安全或许可。

## 7. 有界扫描预算

以下为 M1 初始工程上限提案，最终常数与参数范围由主代理在实现时冻结；不是已测性能指标。`maxFiles/maxTotalBytes` 只能在 Host 上限内收紧，Agent 清单无权放大。

| 资源 | 初始上限 | 行为 |
|---|---:|---|
| manifest 原文 | 16 MiB | 解码前按实际读字节截断拒绝；禁止无界 readFile |
| 普通载荷文件 | 100000 个，不含自体 manifest | 枚举时计数；清单和树双侧计数 |
| 目录/全部条目 | 20000 / 120001（含 manifest） | 迭代枚举，禁止递归栈无界增长 |
| 总逻辑载荷/单文件 | 2 GiB / 512 MiB | 先比声明和 stat，再累计实际读取；BigInt 计数 |
| 组件/深度/路径 | 64 ASCII 字节 / 16 / 240 相对字节 | Windows 另要求受控根+相对路径总长不超过所选 OS 安全上限；不临时启用设备前缀 |
| 并发/缓冲/句柄 | 2 个 hash / 每流 128 KiB / 最多 8 个受控句柄 | 背压、finally 关闭；输出不在包树 |
| 时间/工作进程 | 60 秒 / 初始 RSS 总上限 256 MiB | 超限终止扫描并回收句柄；无法完整验证返回 INCONCLUSIVE/BUDGET_EXCEEDED |
| 诊断/日志 | 最多 100 条细节且 64 KiB / 1 MiB | 保留总失败计数与 truncation 标记；不因截断变 PASS |

合法大包超限和恶意深树均不能降级成仅验清单已有文件。M1 用可缩小测试预算覆盖恰好上限/上限+1，无需写入 2 GiB 实物；真实吞吐和 RSS 测量另列证据，不能由小夹具外推。失败、取消和预算超限必须关闭流并确认无残留工作进程。

## 8. M1 独立实现与负例矩阵

主代理准入前不写 `src/agentnexus/integrity.ts` 或测试实现。准入后只依据冻结合同新写可擦除 TypeScript、Node 内建运行和自造夹具；原 Kit 代码/测试/模板均不复制。下表是未来验收计划，本文件内 **没有**把计划案例计为本轮 PASS。

| ID | 自造输入/动作 | 预期与必须保留的证据 |
|---|---|---|
| INT-01 | 空包仅 manifest；普通多级包；零字节/非文本内容 | controlled_static 可 PASS，逐项 count/bytes/hash闭合；mutable 为 INCONCLUSIVE |
| INT-02 | 普通文件改 1 字节、截断、追加 | FAIL/hash 或 bytes mismatch；不得重写 manifest 自动接受 |
| INT-03 | 漏列实际文件、清单多列缺失文件 | 两个方向各 FAIL；隐藏文件/未知扩展也必须发现 |
| INT-04 | 新增嵌套 `SHA256SUMS.txt` 或 `manifest.json` | 未列 FAIL；列入且 hash 正确作为普通文件，不扩大自体例外 |
| INT-05 | 根 manifest 缺失、是目录/链接、把自己列入 files | FAIL；根精确自体例外只能 1 路径 |
| INT-06 | 重复完整 path（相同/不同 hash） | FAIL/duplicate，不允许 last-wins |
| INT-07 | 重复 JSON 键、未知字段、错类型/schema/profile | FAIL/schema 或 canonical mismatch；不能只断言 JSON.parse 成功 |
| INT-08 | BOM/坏 UTF-8/CRLF/多换行/转义等价 path/非规范键序 | FAIL/canonical；不会清洗后 PASS |
| INT-09 | SHA 长度/大小写错误、bytes 为负/小数/不安全整数/-0 | FAIL；累计数无溢出 |
| INT-10 | `../`、`.`、双斜线、反斜线、盘符、UNC、设备/绝对路径 | 读取前拒绝，不访问树外探针文件 |
| INT-11 | 空/尾空格/尾点、CON.txt、COM1、冒号 ADS、`~` 别名 | FAIL/profile；Windows 不容创建时 parser 案例与真实 OS 结果分开 |
| INT-12 | 大小写碰撞、文件大小写错、目录组件折叠冲突 | FAIL；case-sensitive 测试盘也要求拒绝 |
| INT-13 | NFC/NFD/非 ASCII 大小写、无效 Unicode | M1 profile 明确 FAIL；不 normalize 接受 |
| INT-14 | 文件/目录前缀冲突、多出空目录、无权枚举子目录 | FAIL/类型或集合不闭合；读权限错误不得省略 |
| INT-15 | 文件 symlink、目录 symlink、junction、其他 reparse | 实际 OS 拒绝且不读目标；无创建权限则对应 NOT_RUN |
| INT-16 | 树内/树外硬链接，nlink 为 0/未知、身份重复 | 多链接 FAIL；元数据能力不足 INCONCLUSIVE；模拟只算逻辑用例 |
| INT-17 | 非普通文件、非默认 ADS、跨设备或网络根 | 拒绝；缺 OS 验证能力保持 INCONCLUSIVE/未准入 |
| INT-18 | 读中改写、文件替换、目录置换、验后替换 | 检测到变化 FAIL；mutable 恒 INCONCLUSIVE；未发现不等于 race-safe |
| INT-19 | manifest 被同时重写以匹配恶意内容 | 内部 hash 可一致；包外可信 manifest hash/来源门必须识别版本变化 |
| INT-20 | 文件/字节/manifest/深度/条目/时间预算各边界±1 | 上限内正常，超限 INCONCLUSIVE；有界资源和关闭流证据 |
| INT-21 | 读取取消/错误/工作进程终止 | 不产生 PASS；句柄/进程回收、日志上限保留 |
| INT-22 | 同 hash 的脚本/模块含有副作用哨兵 | verifier 不执行、不 import；哨兵未发生；不据 hash 宣称无恶意 |
| INT-23 | Kit 原文件被列入候选且 hash 全匹配 | 完整性可通过；许可 admission 仍 BLOCKED，不进入实际 M1 资产闭包 |

每条结果写实际命令、平台/版本、夹具指纹、退出码、期望/观察、状态和日志引用。Windows/Ubuntu 分别验收；一平台 PASS 不覆盖另一平台。真实 OS 链接、对抗 race、性能等未能运行必须保持 NOT_RUN/INCONCLUSIVE，不能以模拟替补。

## 9. M1 实际供应链与完整许可闭包

第一版采用 **zero npm runtime，zero imported third-party product source**。运行使用已装 Node 24.15.0 的 `node:*`；Python 3.12.10、PowerShell 7.6.9 仅为已装外部固定工具，若实际调用必须在能力清单列版本/可执行路径/用途/超时。Kit 治理工具是当前项目的既有维护设施，不被复制或嵌入产品。可擦除 TypeScript 直接由 Node 执行；任何后来引入的编译器、测试框架、native helper、FFI、npm package 都会改变闭包，须先重新准入。

“完整闭包”对 **M1 实际候选中引入的每个文件和每条依赖边** 关闭，不要求重新审完本轮未选入的 11 个上游仓库；也不能因为无 npm 就宣称已完成。候选清单应至少覆盖源代码、测试/fixture、schema/配置、构建/安装/打包脚本、生成物、资产和 notice。每项记录路径/hash、来源分类（本轮独立创作/第三方导入/生成）、精确来源版本、许可文本/适用范围与保留义务、采用决定及修改记录。生成物追溯到模板与生成器；开发、运行、打包依赖分别列，不能把测试包漏掉。

本轮新设计和 M1 将来独立编写的代码不得擅自给用户设置 MIT/Apache 等对外许可证或版权归属。先记录独立创作和引用来源；未来发行条款由有权决定者明确，独立实现本身不因此停工。若出现任何第三方文件，必须锁实际发行资产，查原文/NOTICE/嵌套例外与传递/native 依赖并保存 hash；metadata license 字段或浮动版本样本不足以关闭。

验收顺序：冻结实际候选文件集合 → 来源/依赖逐边闭合 → 履行许可与 notice → 对闭包清单执行本文件的双向完整性 → 记录精确版本和测试证据。任一新增文件/依赖或候选 hash 变化使旧闭包验收失效。M0 研究归档及无授权 Kit 不打入候选；完整性 checker 不替代许可审查。

本机 Node 有多项内建第三方组件；本轮只取得版本/API 元数据，**没有完成整个 Node 发行物的许可证闭包**，也没有复制或打包 Node/Python/PowerShell 运行时。外部运行环境登记与发行 runtime 的许可准入分开：若将来打包 Node 或其 DLL/静态库/安装器，必须按实际资产补齐完整第三方许可和构建闭包，不能写成一行“Node MIT”。Node 完整发行资产的再分发准入仍 BLOCKED；这不阻断已装外部运行时上的 M1 本地独立验证。Kit 的复制/发行也仍 BLOCKED，直到第 2 节证据确实到位。

## 10. 本轮检查和交接

当前仅执行完整本地复核、Node 打开 flag/元数据观察、保护快照与文稿结构/治理检查；没有 M1 verifier 实现结果。`recheck.py` 是本轮隔离取证脚本，不是产品实现或 OS 安全边界。规范/API 已冻结；新增实现须由主代理给出独占写面和准入后再开始。

公开技术事实仅引用精确 Node 版本官方文档、Python 官方文档和 Microsoft API 文档；网页用于 API 边界核实，不作为 Kit 授权证据。读取日期、URL、当前授权状态、供应链范围及逐文件证据索引同时登记在 [license_recheck.json](../research/license_recheck.json)。
