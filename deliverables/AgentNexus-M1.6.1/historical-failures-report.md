# 历史 FAIL 的独立处理

M1.6 原交付、原测试和原始失败字节不变。原结论是 380 项 351 PASS、27 NOT_RUN、2 FAIL。M1.6.1 Phase 0 在受管执行环境复验为 350 PASS、27 NOT_RUN、3 FAIL；新增一项是原 CREATE_BREAKAWAY 用例在文件组件打开时收到 WIN32_5，属于当次环境事实，未删测试或修改断言。最终宿主回归逐项结果另见 acceptance.json。

CPU：原 M1.6 Job 累计 29062500 ticks 并依靠 Helper DEADLINE；本次基线同一原用例为 27656250 ticks/DEADLINE。与 M1.5.1 JOB_TIME 无严格累计超支上界的既有结论一致，属于严格 CPU 资格失败，不能当作普通代码回归修绿。原 80+50 / 300+50 / 3000+150 ms 合同和 M1.5.1 56 FAIL/2 PASS 保留；未重跑 58 场景矩阵。CPU_RATE、账本、超时或弱断言的偶然 PASS 均不升级资格。

新增可执行负例证明 Windows 严格资格在证书/Profile 读取前拒绝；原 production prepare/Broker 与 native STRICT_OS 路径的失败关闭机制保留。严格 CPU 与完整生产执行继续 BLOCKED。

TOCTOU：当次受管环境中，原算法诊断的 53 次替换全部在创建 Junction 时以 symlink EPERM 失败；普通目录 rename 与回滚已经成功，独立静态创建同样 EPERM。这个证据定位 swaps=0 的直接环境原因。此前关于 unlink 或调度窗口的推测未被冒认为根因；宿主实测此 Node 的 unlink Junction 实际成功。

同一隔离夹具在已经授权的独立宿主进程中完成真实 Junction 安装握手、实际边界拒绝、并发替换和恢复，见 toctou-report.md。没有修改账户、ACL 或系统策略。原 FAIL 不被这一新 PASS 覆盖；没有攻击发生的受管结果仍是 NOT_RUN/INCONCLUSIVE 范围。

最终 v4 原 TOCTOU 用例仍为 FAIL：并发 FileRead 的第 34 个请求返回 WIN32_1921，旧错误码列表未包含它，测试在原断言处失败；本轮未修改旧列表或重跑追绿。1921 在本机 Win32Exception 和 [Microsoft WinError 文档](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1700-3999-)中表示 ERROR_CANT_RESOLVE_FILENAME。这个拒绝本身不是路径逃逸证据，也不能代替实际攻击成功安装的证明。新夹具在最终相同源码完整回归中独立 PASS，稳定安装攻击、真实并发替换、外部字节未返回及前后身份/hash均有原件。

最终 CPU 原用例仍为 FAIL：29062500 ticks / Helper DEADLINE。v2/v3 中同一旧弱断言曾偶然 PASS，这些结果同样保留且不改变严格资格。

CREATE_BREAKAWAY 的工具路径复验使用 658 个文件逐 SHA 与捆绑 PowerShell 完全相同的工作区副本，原断言实际 PASS，最终完整回归也 PASS。没有改变原测试或 OS ACL；只把环境差异定位到工具执行位置，具体内核/ACL机制不作超出证据的断言。复制的工具链不进入源码交付，仅保留校验清单。
