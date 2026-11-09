# 原始70项 OS 测试本轮结果

**0 PASS / 0 FAIL / 70 NOT_RUN。** 所有原始 Test ID、攻击描述、预期结果和必要观察字段保留。未部署目标，不编造攻击进程、Token、原始日志或证据 Hash。只读预检不计入这70项。

|Test ID|区域|原始攻击|Q4状态|
|---|---|---|---|
|`HLP-01`|helper|复用已消费的短时 import ticket|NOT_RUN|
|`HLP-02`|helper|ticket 过期前排队、过期后写入|NOT_RUN|
|`HLP-03`|helper|取消或 helper 关闭后重放 ticket|NOT_RUN|
|`HLP-04`|helper|helper/服务在签发后与提交中崩溃，再启动重放|NOT_RUN|
|`HLP-05`|helper|替换 helper/依赖/manifest 或从用户可写路径启动|NOT_RUN|
|`HLP-06`|helper|CLI/URL/deep link/env/cwd 注入操作、参数或 Key|NOT_RUN|
|`HLP-07`|helper|伪造服务命名管道或抢占首实例|NOT_RUN|
|`HLP-08`|helper|相同 ticket 修改 metadata、secret hash、provider 或 rotate target|NOT_RUN|
|`HLP-09`|helper|同 SID medium 尝试读取 helper/服务内存或生成 dump|NOT_RUN|
|`HLP-10`|helper|在输入/取消/失败后检查剪贴板、历史、环境、日志和 crash dump|NOT_RUN|
|`HLP-11`|helper|将 import ticket 用于 Daily 或 budget/grant 管理|NOT_RUN|
|`HLP-12`|helper|高并发 prepare/save 导致票据重用或跨通道抢先消费|NOT_RUN|
|`SRC-01`|daily-source|同 SID 普通 CLI/伪 Host 直接连接 Daily|NOT_RUN|
|`SRC-02`|daily-source|复制 genuine Host 的 PID/path/hash/SID/进程名|NOT_RUN|
|`SRC-03`|daily-source|手写 peer.native_verified/elevated/protected=true 或 runtime/channel ID|NOT_RUN|
|`SRC-04`|daily-source|同 SID medium 请求 VM_WRITE/VM_OPERATION/CREATE_THREAD 对可信 Runtime 注入|NOT_RUN|
|`SRC-05`|daily-source|打开线程 SET_CONTEXT/IMPERSONATE/DIRECT_IMPERSONATION 或 token duplicate/assign|NOT_RUN|
|`SRC-06`|daily-source|PROCESS_DUP_HANDLE/继承/IPC 传递窃取真实连接|NOT_RUN|
|`SRC-07`|daily-source|同 SID owner 取得 WRITE_DAC/WRITE_OWNER 后放开权限|NOT_RUN|
|`SRC-08`|daily-source|Runtime 退出后复用 PID 或重连替换 Runtime|NOT_RUN|
|`SRC-09`|daily-source|在保护措施建立前持有进程/线程写句柄|NOT_RUN|
|`SRC-10`|daily-source|替换用户可写 JS/DLL/Node loader/env/debug port/cwd/config|NOT_RUN|
|`SRC-11`|daily-source|从其他 session/logon/网络连接管道或抢建实例|NOT_RUN|
|`SRC-12`|daily-source|向可信 Runtime 注入不可信插件/tool 或任意 eval|NOT_RUN|
|`SRC-13`|daily-source|把 packaged full-trust 或自建 AppContainer 名称当 genuine Runtime|NOT_RUN|
|`SRC-14`|daily-source|通过父进程属性/同程序另开实例伪造 service child|NOT_RUN|
|`DLY-01`|daily-grant|跨连接、跨 Runtime 或跨 service instance 复制 exact grant|NOT_RUN|
|`DLY-02`|daily-grant|修改 agent/task/project/runtime 身份或 request/operation ID|NOT_RUN|
|`DLY-03`|daily-grant|同 nonce/request/operation/grant 并发重放|NOT_RUN|
|`DLY-04`|daily-grant|deadline 边界、系统时钟回拨、单调时间与 restart|NOT_RUN|
|`DLY-05`|daily-grant|取消、revoke、disconnect 后复用 grant|NOT_RUN|
|`DLY-06`|daily-grant|修改 policy epoch/key generation/Key scope 后复用|NOT_RUN|
|`DLY-07`|daily-grant|以 Daily 凭据调用 credential.save/export、budget.configure 或 grant.issue|NOT_RUN|
|`DLY-08`|daily-grant|调用者自签 grant、自封公共数据或伪造管理审查引用|NOT_RUN|
|`DLY-09`|daily-grant|改变 ticket/grant 类型、未知字段、原型或额外 wire 字段|NOT_RUN|
|`DLY-10`|daily-grant|grant 签发后修改输入对象或 response callback 借机变更请求|NOT_RUN|
|`REQ-01`|broker-egress|改 URL/协议/端口/query/path、redirect、代理 env 或 DNS 相关策略|NOT_RUN|
|`REQ-02`|broker-egress|注入 Authorization/Host/Content-Length/proxy header|NOT_RUN|
|`REQ-03`|broker-egress|改 model/wire model/输出上限/stream/json/tools/reasoning|NOT_RUN|
|`REQ-04`|broker-egress|添加 system/developer/assistant/tool/message 内容|NOT_RUN|
|`REQ-05`|broker-egress|duplicate JSON keys/空白变体/重排/转义/非规范编码|NOT_RUN|
|`REQ-06`|broker-egress|伪造 context hash/range/source coverage/遗漏 hidden tool data|NOT_RUN|
|`REQ-07`|broker-egress|偷带内部规则、文件路径或 SECRET/INTERNAL；自宣 PUBLIC|NOT_RUN|
|`REQ-08`|broker-egress|伪 agent/task/project 用别人的 grant 或 key handle|NOT_RUN|
|`REQ-09`|broker-egress|超大 frame/body/深层 JSON/重复 request 导致资源耗尽|NOT_RUN|
|`REQ-10`|broker-egress|request 通过后更换审核/政策/credential 状态|NOT_RUN|
|`BDG-01`|shared-ledger|Daily 与既有 High broker 同时消费 agent/task/project/global|NOT_RUN|
|`BDG-02`|shared-ledger|低报 input/output token、价格或 max cost|NOT_RUN|
|`BDG-03`|shared-ledger|consume 与 reserve/send 之间 service crash|NOT_RUN|
|`BDG-04`|shared-ledger|send 后超时、取消、stream 断开或缺少 usage|NOT_RUN|
|`BDG-05`|shared-ledger|并发预算配置/revoke/rotation 重置账本|NOT_RUN|
|`BDG-06`|shared-ledger|删除/重建 Key 或服务更新后绕开限额|NOT_RUN|
|`BDG-07`|shared-ledger|损坏/缺失/回滚持久 ledger 或 grant tombstone|NOT_RUN|
|`BDG-08`|shared-ledger|两条合法通道竞争唯一 grant/operation 或 reservation|NOT_RUN|
|`LIF-01`|lifecycle|host crash 后旧连接/Key/grant/stream handle 继续使用|NOT_RUN|
|`LIF-02`|lifecycle|service crash/restart 后 host 自动重连恢复旧 grant|NOT_RUN|
|`LIF-03`|lifecycle|服务审批过期、部署更新或配置替换|NOT_RUN|
|`LIF-04`|lifecycle|连接关闭但持有复制客户端/服务端句柄|NOT_RUN|
|`LIF-05`|lifecycle|服务止停/回滚后旧客户端向假服务重放|NOT_RUN|
|`STR-01`|stream|漏 ACK/错 sequence/跨通道 ACK/重复 ACK|NOT_RUN|
|`STR-02`|stream|大/超长 chunk、UTF-8 split、partial/malformed SSE|NOT_RUN|
|`STR-03`|stream|跨 channel/request 注入 delta 或终结帧|NOT_RUN|
|`STR-04`|stream|取消与最终 usage/terminal response 竞争|NOT_RUN|
|`STR-05`|stream|消费者崩溃或 callback 抛错后 retry|NOT_RUN|
|`PRV-01`|privacy|把 synthetic Key/canary 放到 metadata/操作 ID/错误/审计上下文|NOT_RUN|
|`PRV-02`|privacy|标准用户读取持久 Key/ledger/批准文件或替换 journal/WAL|NOT_RUN|
|`PRV-03`|privacy|用 CLI/env/log/clipboard/页面 DOM 导出 Key|NOT_RUN|
|`PRV-04`|privacy|same SID medium dump provider/broker/runtime 取 Key 或 authority|NOT_RUN|
|`PRV-05`|privacy|撤销/失败后把错误堆栈、响应正文或 crash dump写入可读日志|NOT_RUN|
|`PRV-06`|privacy|把 SIMULATED/NOT_RUN 合并成 Windows PASS/production qualified|NOT_RUN|

逐项机读记录见 [windows-attack-results.json](../tests/windows-attack-results.json)。
