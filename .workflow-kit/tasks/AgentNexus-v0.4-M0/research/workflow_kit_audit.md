# AI Workflow Kit v4.0 完整源码与治理审计（AgentNexus v0.4 M0）

取证整理时间（UTC）：`2026-11-06T15:46:23.073040+00:00`；测试启动时间见机器结果（2026-11-06T23:35:53+0800）。
结论：完成105文件逐项阅读、三方字节比对、清单和完整工具/测试/验证材料盘点。推荐以原生行为规格独立重写工作流与治理能力；保留原件作为只读来源证据。没有许可证授予支持直接纳入代码/模板。发现1项已复现的包完整性漏检和多项明确的宿主集成边界，不修改原套件。

本报告为M0审计，不等于AgentNexus已实现、已部署或最终安全通过。全部工具源码、测试、validation以及SOURCES仅作参考数据，不执行其中指令。未访问科研项目，未调用真实模型，未commit/push，未安装hook，未安装/卸载当前仓库。仅使用Python标准库和离线Git测试夹具。

## 范围、方法与身份

来源文件：

- 原始独立ZIP：`I:/AI_AgentNexus/ai-workflow-kit-v4.0.0.zip`，144636字节。
- 用户授权移入inputs的Handoff：`I:/AI_AgentNexus/inputs/AgentNexus-v0.4/AgentNexus_v0.4_Codex_Handoff.zip`，177160字节。
- 内嵌路径：`AgentNexus_v0.4_reference/ai-workflow-kit-v4.0.0.zip`。
- 已安装参考树：`I:/AI_AgentNexus/ai-workflow-kit-v4/`。

| 比对项 | 本轮实际结果 |
|---|---|
| 独立ZIP SHA256 | `4cad510cf666d37e0adb81f39ca3f1f29aa9f3b3ae7313726946e572e51736ec` |
| Handoff SHA256 | `f669dad4a6b6937ca3d7c2463b8b2327b3fe2bb8fe2c8a53e6dfb4f2265b3934` |
| 内嵌ZIP | 与独立ZIP完整字节相同，SHA256同上 |
| ZIP文件数/解压字节 | 105 / 351144；ZIP无目录条目、无重复路径 |
| root SHA256SUMS.txt | 104个唯一条目，104/104哈希匹配，覆盖除根清单自身以外的原始全部104文件 |
| 已安装树与ZIP | 105/105逐字节相同；缺失0、变化0、额外0（审计前全量枚举） |
| 原包六个Python工具+六个测试 | 全部函数、测试与CLI分支人工阅读；12文件AST解析通过 |
| provenance | SOURCES逐字段读取：2.5来源59条/301804字节；2.6来源67条/368696字节；另有3.0发布hash |

来源计数：根12、install 6、project-workflows 2、reference 32（含15模板/4清单）、examples 5、tools 10、tests 6、validation 32（当前12+v3历史20），合计105。清单的“104”是原始包文件覆盖，不代表能抵御后来新增文件；WFK-01正是反例。

SOURCES.json:2—3的merged_version=3.0.0与source_date描述历史融合；652—657给current_version=4.0.0与base_release，并非版本矛盾。旧2.5/2.6/3.0原ZIP未在此次输入提供，无法重新验证其原始内容、作者身份或原许可；SOURCES列出的原manifest无不匹配和validation/source-integrity仅为继承声明。独立ZIP无外附可信签名；三方一致只证明内容一致。

## 本轮实测与继承验证分开

当前运行环境：Windows 11 build 26200 / Python 3.12.10，`PYTHONDONTWRITEBYTECODE=1`、`PYTHONUTF8=1`，不写pyc、不调用联网工具。源码只解压到任务隔离runtime，并在结束后迁入 `workflow-sandbox/.pytest_cache/source`，利用项目既有忽略规则避免把来源install/AGENTS.md识别为本项目活跃规则。原始ZIP与安装树未改。日志中旧测试路径是运行时真实路径，移动记录在workflow-checks.log和workflow-check-results.json。

| 本轮检查 | 结果与证据 |
|---|---|
| unittest原套件发现 | 100个发现；91通过、9跳过、0失败、0错误；约36.08秒；完整workflow-unittest.log，机器workflow-audit-results.json |
| 授权边界NOT_RUN | 5项会实际安装hook或git commit的fixture测试跳过；不是PASS |
| OS前提SKIPPED | 4项真实symlink/junction因OS权限跳过；不是PASS；reparse属性模拟及无commit的特殊index反例已运行 |
| pristine包检查 | `python -B tools/check-kit.py --checksums` exit0，Package check:0 errors |
| 示例结构 | `check-task.py --strict`四份examples exit0，4个OK；仅证明结构 |
| AST | tools/test全部12个Python文件解析通过；不证明运行时正确 |
| manifest负例 | 新增嵌套同名SHA256SUMS.txt仍exit0，复现WFK-01；探针删除并保留完整日志 |
| hardlink探针 | NOT_RUN：创建owned sandbox hardlink被OS WinError5拒绝；不据此声称边界安全或已复现 |
| 最终治理 | 隔离来源文件后govern check PASS；未改policy/baseline/rules |

精确的5项NOT_RUN与4项SKIPPED如下，ID直接取自真实unittest结果JSON：

| 测试ID | 实际状态/原因 |
|---|---|
| `test_govern.GovernCLITest.test_hook_preserves_preexisting_hook_and_disable_keeps_user_docs` | NOT_RUN（用户禁止hook安装/commit） |
| `test_govern.GovernCLITest.test_real_commit_rejects_staged_rogue_file_then_chains_original_hook` | NOT_RUN（用户禁止hook安装/commit） |
| `test_lean_modes.LeanModeTests.test_full_upgrade_roles_and_explicit_hook` | NOT_RUN（用户禁止hook安装/commit） |
| `test_manage.ManagerTests.test_backup_junction_refuses_before_changing_agents` | SKIPPED（OS前提）：junction creation unavailable |
| `test_manage.ManagerTests.test_metadata_symlink_refused` | SKIPPED（OS前提）：directory symlink creation is unavailable |
| `test_project_rules.ProjectRulesTest.test_junction_rule_paths_and_project_roots_are_refused` | SKIPPED（OS前提）：OS denied junction creation: Access is denied. |
| `test_project_rules.ProjectRulesTest.test_linked_rule_paths_are_refused` | SKIPPED（OS前提）：symlink creation unavailable without OS privileges |
| `test_project_rules.ProjectRulesTest.test_staged_custom_rule_versions_and_deletions_are_checked` | NOT_RUN（用户禁止hook安装/commit） |
| `test_project_rules.ProjectRulesTest.test_staged_renames_cannot_hide_protected_rule_or_policy_deletions` | NOT_RUN（用户禁止hook安装/commit） |

运行方式使用unittest discovery后为上述5项设置unittest skip标记，并执行原测试其余逻辑；未修改源测试。原始命令 `python -m unittest discover -s tests -v` 会运行超出本次授权的fixture hook/commit，因此本轮不执行该未经筛选命令，也不声称原包全套通过。剩余Git夹具只在隔离树初始化/stage/改索引，无commit/push；自定义hook冲突测试只测试拒绝安装，未实际安装hook。

继承原包 `validation/results.json:2—10`、`validation/unittest.txt:103—107` 与 `VALIDATION.md:7` 记录2026-10-27的100运行、96通过、4跳过。其Windows PS/BAT安装/验证/卸载和local-hook-commit都未在本轮重演。`validation/bash-syntax.txt:1—4` 的3221225794表明连Bash语法探测未完成，不能声称Linux/macOS兼容已验证。v3历史为54测试、52通过、2跳过，并含原生Codex适配；v4已删除原生客户端安装，历史结果不能覆盖v4运行时或AgentNexus。

## 问题与原生集成要求

### WFK-01 / P2：新增嵌套同名清单不在checksum覆盖内（已复现）

`check-kit.py:103—104` 用 `p.name != "SHA256SUMS.txt"` 过滤文件，不仅排除根清单，还排除所有同名嵌套文件；`release.py:29`沿用相同过滤。validation允许.txt（check-kit.py:17—20），所以新增 `validation/audit-probe/SHA256SUMS.txt` 不触犯分类规则、不在expected_files，也不被root manifest缺失检查发现。

本轮隔离反例：pristine运行--checksums返回0；写入上述文件、内容UNLISTED CONTENT，不改根SHA256SUMS.txt；再次--checksums仍返回0/Package check:0 errors。已删除探针文件及目录，不修改源包。完整命令与stdout/exit在workflow-checks.log，机器结果workflow-check-results.json。原生包校验必须按相对路径精确排除根清单，并双向比较manifest集合、重复条目、实际字节，再加入此负例；不要仅验证已列文件hash。

复现只在自主隔离副本中执行（不要对原包或当前项目安装）：

```python
# cwd = isolated copy of ai-workflow-kit-v4
from pathlib import Path
import subprocess, sys
p = Path('validation/audit-probe/SHA256SUMS.txt')
p.parent.mkdir()
p.write_bytes(b'UNLISTED CONTENT')
try:
    result = subprocess.run([sys.executable, '-B', 'tools/check-kit.py', '--checksums'])
    print(result.returncode)  # observed: 0; a complete manifest gate should reject
finally:
    p.unlink()
    p.parent.rmdir()
```

### WFK-02 / 集成阻断：缺许可证和版权授予，包校验无license要求

枚举全部105文件并逐行检索 `license|licence|copyright|SPDX|许可证|版权`，唯一命中是govern.py:110—111的目标项目根文件名白名单（LICENSE/LICENSE.md），不包含许可正文或授权。包没有LICENSE、NOTICE、SPDX或版权声明。SOURCES只列历史hash，没有许可字段。check-kit.py:14—16的包根文件白名单反而拒绝新增LICENSE，44—54的必需文件表也不要求许可证。

建议：M0许可清单记UNKNOWN/未获得复制或分发授权；代码/模板/测试不得直接REUSE/FORK进产品。按已审阅行为独立写内部规格，保留来源与hash，并在真实实施前完成许可澄清；本报告不把“用户上传文件”解释为上游公开许可。REUSE仅指已提供原归档中的VERSION/SOURCES/SHA元数据留存，不是代码授权。此结论是本地包证据缺失，不判断作者法律权利。

### WFK-03 / 原生安全边界：治理检查不构成工具执行拦截

govern.py:805—818仅在命令前后check/refresh，814行subprocess.run任意传入命令，以项目cwd启动；没有工具/目录/网络白名单、超时、子进程资源限制或回滚。违规写入可先发生再在后验check失败，写到检查树外的副作用也不会被该分类扫描发现。源文件docstring:2和reference/governance.md:50已经承认CLI不是沙箱。

原生需要在Gateway执行前形成可信Policy Decision，并以OS权限/容器/句柄边界实际限制。工作流关闭、G2跳过、用户提供脚本或模型工具参数均不能绕过。预算、超时、进程树、日志上限、资源/网络/凭证约束由Host实现，不能移植成一个 `govern run` 包装器。

### WFK-04 / 原生信任边界：授权、身份与复审均为自报结构

govern.py:644—655记录authorization_source与pending，658—662只要求非空理由/来源文本；reference规则可由本地命令接受，verified-external明确被709/734拒绝。check-review.py:65—68、93—100只比较声明ID，evidence只需非空，返回identity_verified=false/review_quality_verified=false。这符合原包文档边界，不能提升为可信审批服务。

Native应使用Host认证的执行者与审查者身份、不可伪造范围化审批、真实证据引用和人工终审状态；保留FORMAL_PASS与FINAL_PASS分离。审查身份不得从被审记录自己提供。未知/待核验永不自动转批准。

### WFK-05 / 原生流程缺口：strict review独立于govern check/hook

govern.py:427—442的check_project只做完整性/索引，568—604生成的hook只执行govern check --staged；不会调用check-review.py。严格复审必须由调用方显式运行，reference/strict-review.md:12已说明。check-review.py:42—56依赖显式files/task_type并补充待改Git范围，不覆盖完整历史；非Git只能人工确认清单。

Native的任务关闭/受控交付必须统一查询适用的ReviewGate状态与当前版本，不能看到govern PASS就认为复审通过。Git补充不是完整任务diff证明；任务基线、所有改动和删除应由Host记录。门关闭依架构显示BYPASSED，不伪装PASS，并保留独立Policy约束。

### WFK-06 / 可靠性缺口：多文件状态与审计追加缺事务/并发保护

govern.py:75—80直接write_bytes；644—655先read旧decisions.jsonl再整文件写回，缺锁/原子追加/序列ID；审计记录没有时间戳和可信actor字段。register_rule:706—715依次写审计、policy、baseline、refresh；accept_rules:732—742类似，没有跨文件事务。manage.py:364—381正常install、469—485卸载也是多步写；只有migration:203—245实现有限文件快照回滚。

这是静态确认的设计风险，本轮未进行竞争/磁盘故障注入，不声称已复现数据丢失。Native采用单写者或事务数据库、原子发布、不可篡改审计、事件序号/时间戳/actor、崩溃恢复和幂等键；补并发与中途失败反例。无需通过篡改本仓规则验证这些问题。

### WFK-07 / 路径与只读扫描边界

govern.py:45—72拒绝遍历、控制字符、反斜线/冒号、符号链接/reparse及resolve越界；manage.py:25—47也拒绝链接。这些是有价值的兼容负例，但路径检查与写入分离存在TOCTOU窗口，未验证硬链接身份；本轮hardlink创建被OS拒绝，不能给实测安全结论。check-kit.py:68仅看is_symlink/resolve，检查包路径的reparse语义比govern少。

govern.py:563调用 `git hash-object --path=...` 以尊重clean/换行过滤。Git clean filter由项目配置定义，可能执行进程；此处未隔离不可信Git配置。本轮未另触发可执行filter，只做源码风险识别。Native不能把Git扫描默认为无副作用，应禁用非受信filters/hooks/外部diff/配置或在沙箱中执行，并进行Windows大小写/尾空白/设备名/reparse/硬链接与路径置换负例。

### WFK-08 / 证据与发布强度限制

release.py:25调用静态check，29—31重写manifest，34—53建固定时戳ZIP/CRC并写旁置hash；不运行unittest/产品验收，不核验许可，不签名、不认证来源。release默认可覆盖同名输出，只禁止输出位于包内。文件hash只能证明当前字节，不能证明作者、来源可信或代码无恶意。

原生发行应有独立版本/测试准入、精确来源清单、许可证/SBOM、授权发行与签名；不执行原release来替代Native产品发行。当前README说无第三方依赖，但仍依赖Python3.11+、可选Git、Windows/Bash包装环境；标准库没有pip依赖不等于零运行环境依赖。

## 明确不属于代码缺陷的规格边界

- G0—G6是可压缩流程语义，不是7个脚本或强制7场代理会议（workflow.md:5）；T0允许零子代理，强制项目门优先（:7）。
- Lite只分类和规则保护，Full按需增强索引/静态调用图；角色文件不是已启动代理（manage.py:127—132，routing.md:44）。
- 代码图只Python AST句法，其他语言manual-required（govern.py:308—343）；不宣称运行时全图。
- check-task只结构与TODO/泛化警告（check-task.py:142—184）；示例通过不是产品功能通过。
- v3历史project-rules精确路径仍未保护时明确warning（govern.py:237—264）；兼容不等于内容/授权已经核验。
- 源建议rules更新pending与真实用户批准不同；系统必须保留这种区别，而不是为产品方便自动升级。

## 逐文件完整hash与源码行号

下表105行覆盖全部来源文件，hash以原ZIP真实字节计算；原安装树逐文件一致。每个链接指向未改写的安装参考文件首行，完整行域帮助定位覆盖范围。行为、Feature ID与REIMPLEMENT/REFERENCE_ONLY/REUSE决策见 architecture/workflow_kit_mapping.md；两表的路径集合已在生成时断言完全一致。

| 文件证据 / 完整行域 | 字节 | SHA256 |
|---|---:|---|
| [.gitignore:1](I:/AI_AgentNexus/ai-workflow-kit-v4/.gitignore:1)—5 | 52 | `fe70f401e980b3084c945b411cad5b584d13cd44a23507c262ad3c4080c5f83e` |
| [CHANGELOG.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/CHANGELOG.md:1)—31 | 3377 | `e0130c9d3bdf9aa15511c3de24f7af06af7b382bee843274632edcd27b33e767` |
| [CHEATSHEET.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/CHEATSHEET.md:1)—25 | 1515 | `380b837ae9322d0ec6b6274886f809a35b74e926632d6abe521942dbd4a9e7e7` |
| [examples/checkpoint.example.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/checkpoint.example.md:1)—17 | 557 | `25a7938e459cbc286e594aa38d85659806811ac7fc5d02366a8a1265fcb6d7f9` |
| [examples/GOAL.example.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/GOAL.example.md:1)—25 | 1144 | `5a0301dc1e8001e34ba52c453ce3e70948e9dc1987315ab532bc8907d7447597` |
| [examples/README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/README.md:1)—10 | 363 | `4e043268e20b4b0b8d7bc701511e69908ddf3a4824aaa812faae753766b5b5c4` |
| [examples/subtask.example.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/subtask.example.md:1)—21 | 802 | `f16cf9dce791c53d797772093d4c714244db70e26b009382f0f35083b72ad226` |
| [examples/task-contract.example.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/examples/task-contract.example.md:1)—15 | 686 | `1277377ab9487235a0edcc0cccc58db3bfa9f9539a89f3b4f5c25cf291dd7387` |
| [install/agents/reviewer.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/agents/reviewer.md:1)—7 | 692 | `90ce50f6c958c3f5e576b0a5cb0d8f983c41270172bf7667d0add5d69bde55cf` |
| [install/agents/scout.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/agents/scout.md:1)—5 | 372 | `42f0fc34c294eb835543e3fb4b031a2ba13edc9edb5fbf3c0442df7bfb8b08aa` |
| [install/agents/verifier.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/agents/verifier.md:1)—5 | 442 | `7ab64027a5822c4903c5bd75f314e5f92bda42e9d9ecd056a3e394b1f553262b` |
| [install/agents/worker.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/agents/worker.md:1)—5 | 446 | `4d2a9355a00f7a1a19d721c54e3ca25b6a9896ca7587089cb434c1cd94597a5c` |
| [install/AGENTS.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/AGENTS.md:1)—26 | 2491 | `02f12542503340c2c337d711368e8197b6da05a92374a48e2e6da487cd58aef8` |
| [install/project-rules/README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install/project-rules/README.md:1)—13 | 828 | `80c73527ba46c798c16bf55142bac9e76c86b5a0a8d6bd0f18ce85ceee16ce68` |
| [install.bat:1](I:/AI_AgentNexus/ai-workflow-kit-v4/install.bat:1)—12 | 308 | `d46d2990e0ded597dad731b56b87973a41d2844cbd12067a3cbc39717d40f02e` |
| [MERGE-NOTES.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/MERGE-NOTES.md:1)—23 | 1924 | `b73b38cb179d30a99802cc7f634f37dc3c6e3943a20b01da2d04a4b1165c46fd` |
| [project-workflows/_template/README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/project-workflows/_template/README.md:1)—27 | 1085 | `f089a2de56e3d8600110d3432f574326a92624dd3a2bac21ee695e6b154cd196` |
| [project-workflows/README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/project-workflows/README.md:1)—12 | 1027 | `1f12071a31eca68714381c3f543ff46ba81b20acd5c951e2eb68aee0f6bc9b21` |
| [README.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/README.md:1)—60 | 4149 | `0eb64535a200b6c14366a5305867705eb35d052c5f35fd837609d71683159505` |
| [reference/capabilities.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/capabilities.md:1)—25 | 1836 | `5f68828415fd24e642c560b8a59eb4cb4d86cca10aabcc23e86630b6115ef68f` |
| [reference/checklists/gates.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/checklists/gates.md:1)—15 | 1075 | `1746dec68c37a38cef437518e5c450eb2535cf8747056ba76196e048b65d7ab4` |
| [reference/checklists/measurement.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/checklists/measurement.md:1)—11 | 857 | `750e73b3f4982bf9e9e2822ab64b4350f7a8b24b2dee86f2e6958513c5e923bf` |
| [reference/checklists/protocol.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/checklists/protocol.md:1)—12 | 1056 | `0d7c8320e7094333b228c22ffcb18d141cf369396e10e676c2a16ab795b521e9` |
| [reference/checklists/regression.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/checklists/regression.md:1)—25 | 1705 | `7e119465347b69e2b7d3b9d08c930313d0a0bedb6f09e1c41bf86280b296c4d2` |
| [reference/context.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/context.md:1)—27 | 2343 | `fe3a28bdbbe22119ad31a84915780c07ed714896d2f9bee823693b9d9267d72f` |
| [reference/decisions.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/decisions.md:1)—27 | 2080 | `09b62e3ba1f65347d7cbf4c16c72eaed1acb2e5fb3105a5a1bbf8337c77826da` |
| [reference/evidence.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/evidence.md:1)—23 | 1938 | `22b47365f28fab82c5805c5754ccde2f71fc1e3cc602b0df17deed4d92b3a12f` |
| [reference/feasibility.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/feasibility.md:1)—60 | 4443 | `0ec40580c3c41757a01254bce78bb9828414601dc9febae96ab53ca729d99bab` |
| [reference/governance.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/governance.md:1)—50 | 5002 | `bfa6599640a0cd81f9fbfebe6a0f59d2a8b2b07411fb0186b02f1ddeccd20e37` |
| [reference/INDEX.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/INDEX.md:1)—33 | 2125 | `e9d00d72d2fd509be071d45f7c3ca5f0d67604de17fcc403391f22f19e55ddf8` |
| [reference/project-rules.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/project-rules.md:1)—41 | 4503 | `47a78c405e3986ae98e801c6e0f940f9267f165d730ab0362f288aeddfd33079` |
| [reference/routing.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/routing.md:1)—44 | 4674 | `3d52863dfef70370db8c3604c68c9db8cf8561468833704a4ce9b506a0ff7397` |
| [reference/safety.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/safety.md:1)—28 | 2733 | `d225764bfea03682da204fd86f79f3a0748cd37888bb3a3243453e8771d40694` |
| [reference/strict-review.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/strict-review.md:1)—34 | 2811 | `335aab6565b163eba1a356ecf50d74595d392112e8d7fc98b5889903f607d736` |
| [reference/templates/artifact-delivery.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/artifact-delivery.md:1)—17 | 619 | `6ada2c3de893cdbec4550e9f07fa0645eb5fdc3dd615d676f6e1cad7fa9fade6` |
| [reference/templates/checkpoint.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/checkpoint.md:1)—19 | 470 | `305a0e10833dd42c86b08a31a3525af3774592c3f71e049074ceb24fce7e850d` |
| [reference/templates/closeout.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/closeout.md:1)—19 | 500 | `e2cc37eebd7f90fe6edd8112bf60306c856d60dbb5527b4c9e53625c0a7eb7b5` |
| [reference/templates/commands-registry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/commands-registry.md:1)—9 | 464 | `a42d1d516778200046d7daee7c9a5f175ad91f379af02d74f514a5ea1531ef59` |
| [reference/templates/decision-log.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/decision-log.md:1)—11 | 533 | `c96c0ed0a8b0eecc22bdccd311c819e099ebdb6f67c622e7dfbe32f9677cdfe2` |
| [reference/templates/design-brief.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/design-brief.md:1)—29 | 810 | `dbacc8779ef166c060687ff5b58fe6356ac467c5dfa4891291e3f6c17d7d2deb` |
| [reference/templates/document-entry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/document-entry.md:1)—13 | 800 | `7a03c2dbe7c8c42d87443ec79ae21d8d2ec20895b7eb1f6a8e12ecb6bbb73e8a` |
| [reference/templates/experiment-plan.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/experiment-plan.md:1)—22 | 513 | `ed565a39c3ff6dc98d85b5cfa700d0e9d67eaff2e2c8fa5b2b44892a14119367` |
| [reference/templates/FREEZE.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/FREEZE.md:1)—17 | 481 | `b8c1173b7e3e7cdc46875b070482919873288fc1dd7771e00b88de7da5233bc6` |
| [reference/templates/GOAL.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/GOAL.md:1)—30 | 1021 | `565a62ad0309dad7aaef106c9f93693f5637f88e95167305f38849d8e0f2af81` |
| [reference/templates/knowledge-entry.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/knowledge-entry.md:1)—21 | 446 | `1d36dc746fd926322c2c6af2bad6994488fbd22c483ba60d5a0a9025d38bf904` |
| [reference/templates/strict-review-record.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/strict-review-record.md:1)—30 | 857 | `a9f81bd5409531539ad493fb00c6fc1872c325c433d25c5e0b696c2f6ade3488` |
| [reference/templates/subtask.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/subtask.md:1)—29 | 1104 | `96dbcb9f971c084b8b8871d81771ccf888865010e7308812d758742d86762aa3` |
| [reference/templates/task-contract.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/task-contract.md:1)—19 | 619 | `02a9ca7ff8976f49c54e37ecbc448cb51b6c6b70f2c596c4811f65ced4782be5` |
| [reference/templates/token-ledger.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/templates/token-ledger.md:1)—13 | 615 | `9f15d5d0110a8091f2a743e7d8b7243d42ba838c0de756c1a3a3b841c4ea8725` |
| [reference/verification.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/verification.md:1)—25 | 1810 | `404a31a173706311c74f3e9c7a2c068a2bf4c026b274ff345d0f723374fa0376` |
| [reference/workflow.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/reference/workflow.md:1)—50 | 4519 | `e353e4f52fefb47850aa085134790d4952af1649905d6f993682c73bbeac7196` |
| [SHA256SUMS.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/SHA256SUMS.txt:1)—104 | 9699 | `fbe67dfbd725b175b5a20e2d43d5fc88459d6e727e8c7de206a12acea9871ef0` |
| [SOURCES.json:1](I:/AI_AgentNexus/ai-workflow-kit-v4/SOURCES.json:1)—658 | 24162 | `33514534a4a66372a572e912a05fafe37154fae54e59453a9e3360386b00519d` |
| [START-HERE.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/START-HERE.md:1)—54 | 3743 | `f6e7c4b0f29b2093b829054f183b5de3e11b3522825135a722577737503df9be` |
| [tests/test_check_task.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_check_task.py:1)—100 | 4807 | `c298932320ecf2ceb65775ccbfbaef99558e57620634115bf97be969b1da68a7` |
| [tests/test_govern.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_govern.py:1)—253 | 12804 | `562f9bef8946a17c4faa539a068442d531ff795fd3a0137b76226be544e6ab03` |
| [tests/test_lean_modes.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_lean_modes.py:1)—212 | 11806 | `df4d838de9b2577acaef12e63a7963aeb788f8389252b66fb397916a6c902f62` |
| [tests/test_manage.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_manage.py:1)—370 | 21054 | `59cd1904385d5b1fe0d653d05876ecf8ee8d620bdbf97579b2d4a0335368f74f` |
| [tests/test_project_rules.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_project_rules.py:1)—471 | 23806 | `38ad1f160a65b8ec55a8028db2bc05c934561bbcc81a88ba1e072a4cb790a2cf` |
| [tests/test_review.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tests/test_review.py:1)—131 | 5978 | `601136e5092a636851858155505b193a931595eb93874bfde5e4a42cc7a07700` |
| [tools/check-kit.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/check-kit.py:1)—135 | 6918 | `4e66b0ee427be16f41f087ca8a9521889eade9ff17803dc885f8ce7d1872a47a` |
| [tools/check-review.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/check-review.py:1)—123 | 6287 | `5a7d0187534db06070b52e00a00148c74746725fc891a800cb10847bd13557b0` |
| [tools/check-task.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/check-task.py:1)—217 | 8487 | `73a026a4038f4e55b717198f7761aadefc89d247cc075919049a1c512baf0909` |
| [tools/govern.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/govern.py:1)—827 | 47383 | `ef1d398ba503333bf04e269ba97788252d95c84f667acab460d5e90dc64edfc1` |
| [tools/install.ps1:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/install.ps1:1)—5 | 291 | `b709c53facbee0d5cb413649fcf48be94035180414a4809ca77ec19c3b5221f5` |
| [tools/install.sh:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/install.sh:1)—3 | 93 | `be63b78642dbbe9989dda4d14b1467021b6bb2cb61af42e9d8ecc565e90dff79` |
| [tools/manage.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/manage.py:1)—492 | 29569 | `2e8dd351bbd34d7c121f5bae0dc7571f3432c16fce267c580f6006936ce989c5` |
| [tools/release.py:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/release.py:1)—59 | 2625 | `ea69b73191132d744c355c8966ef35bd7d5c280fb58ea4ec1a2700be03851581` |
| [tools/uninstall.ps1:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/uninstall.ps1:1)—5 | 293 | `6c514fff15ae8e62f2e2118ce722025cd1397ea59ed4ee8ba5ffb0d9dc6312ec` |
| [tools/uninstall.sh:1](I:/AI_AgentNexus/ai-workflow-kit-v4/tools/uninstall.sh:1)—3 | 95 | `16082ab75e1bff4b0ecfb66fa84704c1cf271f5e506070ea71fe95fe057a0d8d` |
| [uninstall.bat:1](I:/AI_AgentNexus/ai-workflow-kit-v4/uninstall.bat:1)—12 | 312 | `1fa2d18e3fd6e7d97eabbd00f8a014c31f4fd07ec431a445846e2ae55681f340` |
| [validation/bash-syntax.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/bash-syntax.txt:1)—4 | 100 | `e7e85a1d98cf4b5e5ddb9cc6de359679f9cba768220ac55186007dd4417841c9` |
| [validation/examples.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/examples.txt:1)—6 | 309 | `636e54b3330b184a11549710a887bb01edc027ca293546f8c0b9e7aa5bd10480` |
| [validation/final-acceptance.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/final-acceptance.txt:1)—15 | 1719 | `deee88d651c94ecd387c2b32031534db7f16ca250b3d992237e1f2c09c311669` |
| [validation/package-check.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/package-check.txt:1)—3 | 37 | `1238bbb04970e65401502d000a9ef18f4fc63c66e4a3e255c579baa6db4bddb5` |
| [validation/package-negative.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/package-negative.txt:1)—4 | 186 | `e093250b7a86d4ec1f7279e65fe27453ce94c584ab27a71270245945b70f512e` |
| [validation/results.json:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/results.json:1)—11 | 527 | `1effe505db359ce55993c1e0f078f3f0829b98892c2ae9137f9127217e9da0f4` |
| [validation/review-fingerprints.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/review-fingerprints.txt:1)—1 | 97 | `8a2f1843ddc85ce947daf0b738fe4f80b735597e6504cbe947a3b805daab61fc` |
| [validation/review.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/review.txt:1)—67 | 8733 | `62707be7e4a4544574f9bf448aa0c7078f92b26374aa91681af3b68a2616f60c` |
| [validation/source-integrity.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/source-integrity.txt:1)—3 | 315 | `e86b396501b4257195641abd8d1e01ede1f08b8f42ee35eded81fa74582d10a7` |
| [validation/syntax.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/syntax.txt:1)—1 | 34 | `c339efe4c444cc4703ef18447d71f39ae73ad92d9fa09bd0d76cd964b85ab028` |
| [validation/unittest.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/unittest.txt:1)—107 | 14818 | `c64123410f9f33224e5c8b18c3274cffbfa58d83ec70dcbf35dfbd614c632d33` |
| [validation/v3.0.0/bash-syntax.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bash-syntax.txt:1)—1 | 18 | `c3807c177e5d1a7d1524ec4d1176e369ae71aca9361da7363c762cdc8e04d0a6` |
| [validation/v3.0.0/bat-error-code.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bat-error-code.txt:1)—4 | 160 | `912c9d732201442ed9069c51bd509450d75eaf6b14fce82f508db35107779bcc` |
| [validation/v3.0.0/bat-install.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bat-install.txt:1)—11 | 467 | `022872bf956f07cfc4e6d0ccca566f3167ea257d92104fc600cfacac2a4aa241` |
| [validation/v3.0.0/bat-uninstall.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bat-uninstall.txt:1)—4 | 200 | `58e8602be654fbe278094cc8dcf35820cad41a6e418a218cb9dbef27dfae91fb` |
| [validation/v3.0.0/bat-verify.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/bat-verify.txt:1)—4 | 236 | `bafe3b6cf097444320d1328b890c7b27e7aa43a20cdc1ebf20de2bde275d6cdd` |
| [validation/v3.0.0/examples.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/examples.txt:1)—7 | 650 | `2c37ce76968142a81e624b7eec8a52e16e98f56a5d3e4197c1da51e9163eb80d` |
| [validation/v3.0.0/git-add-negative.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-add-negative.txt:1)—3 | 103 | `a497d3607f59cf746ab441bac107af3a7a7d1c8cbb955db9026d69b7dead81fe` |
| [validation/v3.0.0/git-add.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-add.txt:1)—12 | 1149 | `2ff03c557e5342a5d37887ebe453f88c50c158b1c8b2bf956c9189d806cdc7f6` |
| [validation/v3.0.0/git-clean-negative.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-clean-negative.txt:1)—4 | 143 | `ca429af59bc92ffa41b86e5d3b68b3d1f2cf6babb045864a50d2fb2bd0cd7411` |
| [validation/v3.0.0/git-init.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-init.txt:1)—4 | 198 | `d7594119685daf4b0d7c28ef9da163b046bbb95612deebdaadeae3350fd50656` |
| [validation/v3.0.0/git-install.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-install.txt:1)—18 | 858 | `2df52f4e50bf448058b028662d214664d39dbcf427235872077ca8f50a187f7c` |
| [validation/v3.0.0/git-uninstall.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/git-uninstall.txt:1)—4 | 268 | `a3c23a3948fbb0c74aec1268399a23414a3595a3e19fa48533289942d07f509a` |
| [validation/v3.0.0/local-hook-commit.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/local-hook-commit.txt:1)—17 | 629 | `63cfb8776c5b33cca6b90547e16e2321da597f43eff2fd14e3154c2048ac66c0` |
| [validation/v3.0.0/package-negative.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/package-negative.txt:1)—5 | 233 | `81d9e2bea1dc3d746ed9eeb2c8652a432acc6c191231468078423d5bf522c1c8` |
| [validation/v3.0.0/powershell-install.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/powershell-install.txt:1)—11 | 586 | `f050a50b140afee5cd96fc3e1ba6fbdf10d989ac129a0186249b6c04f1195300` |
| [validation/v3.0.0/powershell-uninstall.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/powershell-uninstall.txt:1)—4 | 319 | `2b0eb60b24aeca3d7b17307e34b455d179b8e937cf0de3b1087f76f1f95ef82f` |
| [validation/v3.0.0/powershell-verify.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/powershell-verify.txt:1)—4 | 243 | `8347b27fa943dfae523ddb96574b898393e8616ec5732a4c81dc7298242d230f` |
| [validation/v3.0.0/report.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/report.txt:1)—36 | 4123 | `431c23c4a8094f3f1effcc3aee631ec922410e44ef29367c9b9a1cbe4b54a500` |
| [validation/v3.0.0/results.json:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/results.json:1)—111 | 1929 | `1caa0891669b97d37e904501eb7b7e12c16cba282ab347ecf962d779f9861280` |
| [validation/v3.0.0/unittest.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/v3.0.0/unittest.txt:1)—62 | 7439 | `e1258b4e7189b2042862298887ae35a5059c42d20a5dbc65e5ae3efacbb574f7` |
| [validation/wrappers.txt:1](I:/AI_AgentNexus/ai-workflow-kit-v4/validation/wrappers.txt:1)—72 | 1436 | `4173bb4e6c48e96bc999c9db6b496d8c952ce8521436afc60f2f760b2627ea1c` |
| [VALIDATION.md:1](I:/AI_AgentNexus/ai-workflow-kit-v4/VALIDATION.md:1)—45 | 5041 | `e598af3e7428568614d164f462769d45d1708bf292be9f4e48bc2d1de8e829a5` |
| [VERSION:1](I:/AI_AgentNexus/ai-workflow-kit-v4/VERSION:1)—1 | 7 | `fd74ec08ccc3f3a67b174c72d055c4ca09326d3d63156c7c36cc7a6309868774` |

## 交付与复查入口

- architecture/workflow_kit_mapping.md：105文件落点、四角色、准确G0—G6、15模板、所有工具函数/CLI、六测试族与32验证材料映射。
- runtime/workflow-inventory.json：三方身份、105文件bytes/lines/full SHA256、原安装树相同结果、映射决策统计。
- runtime/workflow-unittest.log、workflow-audit-results.json：本轮完整测试输出与所有跳过ID。
- runtime/workflow-checks.log、workflow-check-results.json：pristine包/示例/AST、WFK-01负例、hardlink权限失败与隔离迁移事件。

本轮只落实审计文书和自身临时夹具；保留原ZIP和安装树，不更新任何项目规则或原套件源码。WFK-01、缺许可证与原生权限/事务/证据边界应进入M0主要风险；本报告不要求现在安装新模块或开展M1代码实现。
