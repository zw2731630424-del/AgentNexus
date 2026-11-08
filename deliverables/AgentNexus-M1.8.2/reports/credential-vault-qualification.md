# Credential Vault 生产资格

**BLOCKED；当前身份的真实OS隔离反例为FAIL。** 新建的合成DPAPI Vault关闭后，独立真实子进程直接打开其SQLite并用CurrentUser解密，SHA与父进程预期相等；native identity确认同SID，子进程close/exit=0。原始与强化探针后两次结果均保留。它不是部署过的Worker/Reviewer跨账户测试，也没有读取任何真实Key。

观察到当前进程为宿主AppContainer下同一用户SID，合成Vault目录/SQLite与源码ACL继承，未保护DACL，不能视作Host-only部署。未取得互异标准Host/Worker/Operator身份、固定代码/服务/helper ACL与启动证明，也未取得被拒绝的生产Worker访问证据。没有索取Key、启用masked录入、修改账户/ACL/AppContainer或触碰既有凭证库。

| 用户资格条件 | 本轮证据与状态 |
|---|---|
| Host可信入口取得凭证 | BLOCKED；LIVE入口在文件/解密前拒绝，可信交互尚未部署 |
| 普通Agent不能读Key | 受限facade接口测试PASS；同SID真实进程可解密合成凭证，OS隔离FAIL |
| Subagent不能读父凭证 | 合成scope/facade PASS；生产独立身份访问NOT_RUN |
| Reviewer不能访问Vault | 只读角色合同保留；实际独立Reviewer OS拒绝NOT_RUN |
| Worker不能读Vault文件 | 同SID反例失败；生产受限Worker拒绝NOT_RUN |
| Key不进Prompt/Archive/Audit/error | 已知合成secret门/编码/跨块测试PASS；真实Key从未输入，生产资格未获证 |
| Key不经argv/env/临时明文 | 探针只向helper匿名pipe传合成值；真实入口NOT_RUN，未通过这些通道传Key |
| 错误/过期/撤销handle | 继承synthetic租约/状态/主体测试PASS；生产NOT_RUN |
| 并发与轮换 | SQLite/异步撤销与轮换合成测试PASS；生产NOT_RUN |
| Host重启/异常退出恢复 | 合成reopen/UNKNOWN保持测试PASS；生产Host身份重启NOT_RUN |

Windows DPAPI按用户凭据绑定；Credential Manager的CredRead读取用户credential set，迁移到它不能独自解决同SID隔离。[DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata)、[CredRead](https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credreada)。选择方向仍为独立Host-only服务+CurrentUser保护密文+受保护ACL+OS认证IPC，Agent仅获scoped completion，helper固定哈希且无任意endpoint/readSecret；这是一份部署方案，未实施。Ubuntu沿用跨平台CredentialProviderInterface，Secret Service规范本身不强制访问控制，必须另做平台资格。[规范边界](https://specifications.freedesktop.org/secret-service/latest/ch10.html)。

安全录入必须在已验真隔离Host中完成：本地masked界面直入可信服务，有界匿名pipe、内存最短持有、密文原子保存；只审计handle。当前缺该启动链，不能把一个输入框代码叫作安全入口。后续需要独立授权系统部署并以合成凭证先做所有角色的实际拒绝、撤销/轮换/重启组合试验，全部通过后再收真实Key。

[最终OS负证据](../evidence/probes/vault-final.json) · [ACL观察](../evidence/probes/host-acl.json) · [reader事前metadata拒绝](../evidence/probes/reader-denial.json)。
