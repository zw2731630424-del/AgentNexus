# 24项安全验收映射

下表严格区分合同模型、真实原语和完整生产组合。PASS只指本行限定范围；完整组合均未被推断通过。原始测试名、skip原因和source hash见test-results.json；原生实际字段在final-test-data.zip内m14-native/*.jsonl。

| # | 要求 | 当前证据 | 未完成部分/裁定 |
|---|---|---|---|
| 1 | Host/Worker身份伪造 | M14-PERMIT/IPC/IR模型拒绝logical/PID/start/session替换，真实Token读取 | 独立标准账户组合NOT_RUN |
| 2 | IPC peer伪造 | 真实pipe双向内核PID/start匹配、假start拒绝、payload字段不被信任；模型其他SID拒绝 | 真正不同账户连接NOT_RUN |
| 3 | 请求重放 | 模型8并发一次消费、规范帧/MAC与nonce账本 | 生产跨账户长期端点NOT_RUN |
| 4 | Permit重放 | 原Approval/Permit消费与独立Broker唯一账本，独立OS Broker fixture拒绝第二次执行 | security观察SIMULATED |
| 5 | 资源越权 | 模型精确resource、参数、profile及epoch拒绝 | 组合OS目录权限NOT_RUN |
| 6 | 跨项目访问 | FileGrant模型foreign resource/project拒绝 | 实际Worker跨项目OS访问NOT_RUN |
| 7 | 管理数据库访问 | Worker API无DB对象；独立Broker使用独立Store | 实际Worker读取Host DB测试NOT_RUN，BLOCKED |
| 8 | 子进程逃逸 | 真Job挂起加入、禁止breakaway配置读回、detached子进程仍被Job监管/终止 | 完整COM/WMI/CREATE_BREAKAWAY等逃逸对抗NOT_RUN |
| 9 | 网络访问 | profile固定DENY、无capabilities候选代码 | 实际网络/loopback/IPC绕行NOT_RUN |
| 10 | symlink | 原M1.3链接夹具保留；格式/原生reparse拒绝代码审查 | 最终symlink夹具因权限NOT_RUN，以真实skip为准 |
| 11 | Junction | 真实临时junction被原生句柄owner拒绝 | AppContainer跨账户组合NOT_RUN |
| 12 | Hardlink | 真实hardlink的link_count拒绝 | 敌对并发建链竞态还需独立组合验证 |
| 13 | TOCTOU | CREATE字节跨await不可变模型负例、原生祖先不可写删句柄/file ID/hash | 真恶意目录rename/link并发攻击NOT_RUN |
| 14 | 强制终止 | 真实Job hold/输出超额终止、根/Job/producer分别观察 | 不生成完整生产proof |
| 15 | 父退子留 | 新真实orphan窗口断言root早于termination且存在child；未捕获则明确INCONCLUSIVE/NOT_RUN | 历史M1.3窗口仍保留原NOT_RUN，不反写 |
| 16 | 输出producer残留 | 模型未知producer不释放，真实stream overflow记EOF不完整 | 外部独立producer逃离Job的真实组合NOT_RUN |
| 17 | Host重启 | M1.4 SQLite重开保留UNKNOWN；原M1.3进程强杀回归仍运行 | M1.4独立生产Host/Job/pipe全链重启及全机重启NOT_RUN |
| 18 | 旧PID复用 | 模型start/session/generation拒绝；真实prepare的伪start拒绝 | 实际Windows PID回收复用场景NOT_RUN |
| 19 | 退出证明伪造 | 错误签名、循环父链、矛盾成员、原件重验，模型负例 | 完整真实生产正向proof没有来源，BLOCKED |
| 20 | 未确认时释放 | 模型五资源保持、manual SETTLED不能绕过、旧boot/版本receipt门禁 | 正向生产释放BLOCKED |
| 21 | Audit失败 | 模型flush故障不start，原存储真实回归，所有新服务共用outbox | 独立生产磁盘不可写/崩溃组合NOT_RUN |
| 22 | IPC断开 | 模型按可信channel归属撤权/终止/隔离，无重放 | 真实长期端点在执行中断开组合NOT_RUN |
| 23 | 并发Worker竞争 | 并发Permit消费、唯一Writer/资源SQL、未知slot保留模型 | 独立跨账户多Worker长期竞争/耗尽NOT_RUN |
| 24 | Sandbox变化 | 模型profile hash/observer变化立即拒绝/撤销；真实resume重查token/Job | 部署ACL/Profile/系统配置变化对抗NOT_RUN |

额外实际发现：累计CPU时间限制重复运行有FAIL和PASS，资格INCONCLUSIVE/BLOCKED；Token clone缺权限曾FAIL，修复后通过。所有历史日志单列，最终一次回归通过不抹去此前OS能力不稳定。测试中FAKE_ONLY等价的provider统一用SIMULATED标识；没有任何BYPASSED项被当成生产PASS。
