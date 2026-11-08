# 真实 OS 测试与离线证据

**生产全部 BLOCKED。** 本轮没有部署独立服务账户、修改 ACL 或运行真实 native pipe。下列 PASS 只用于明确标记的合成范围；原同 SID 反例 FAIL 保持。

|序号|场景|本轮/继承证据|范围|
|---|---|---|---|
|1|Credential Service 自身读取凭证|SIMULATED / PASS|实际独立服务 SID 读取/DPAPI 仍 NOT_RUN|
|2|同 SID 普通进程读取 Vault 密文|HISTORICAL_REAL_OS / FAIL|M1.8.2 反例仍可读；新服务 DACL 未部署|
|3|同 SID 普通进程尝试独立解密|HISTORICAL_REAL_OS / FAIL|M1.8.2 SHA 相符反例保持；新服务身份密文测试 BLOCKED|
|4|同 SID 普通进程连接服务|SIMULATED / PASS|native token fixture 拒绝；真实 pipe 连接 NOT_RUN|
|5|伪造 Host PID|SIMULATED / PASS|payload 声明不授权；实际 OS 对抗 NOT_RUN|
|6|伪造 Process Start Identity|SIMULATED / PASS|native 句柄/创建时间核验源码；实际 OS 对抗 NOT_RUN|
|7|伪造 IPC 消息|SIMULATED / PASS|严格方法/字段与非读取 API；真实 native 认证 NOT_RUN|
|8|重放旧 IPC 请求|SIMULATED / PASS|prepared nonce、管理 id、导入 ticket 单次消费|
|9|过期 Credential Handle|SIMULATED / PASS|过期 Key / ticket / deadline 拒绝|
|10|撤销 Credential Handle|SIMULATED / PASS|旧 prepare 也不可重选 Handle|
|11|Worker 读取 Vault|NONE / NOT_RUN|需真实 Worker token/受保护目录|
|12|Reviewer 读取 Vault|NONE / NOT_RUN|需真实 Reviewer token/受保护目录|
|13|Agent 读取完整 Key|SIMULATED / PASS|scoped complete 与无 read/export；OS 权限未验证|
|14|日志泄漏|SIMULATED / PASS|已知及本次新 Key、编码元数据在 audit 前拒绝|
|15|Context 泄漏|SIMULATED / PASS|Guard/egress 来源覆盖；未真实外发|
|16|Prompt 泄漏|SIMULATED / PASS|原文/编码/跨语义 delta Guard；非通用 DLP|
|17|Host 崩溃|NONE / NOT_RUN|新安装 Host/服务组合崩溃未测|
|18|Credential Service 崩溃|SIMULATED_PROCESS / PASS|真实同账户 fork 被 kill，重启保留 UNKNOWN；非 SCM 身份资格|
|19|Host 重启|SIMULATED / PASS|显式旧合成回归/新远端元数据恢复，非安装身份资格|
|20|Credential Service 重启|SIMULATED_PROCESS / PASS|私有 IPC 子进程重开；无预算重置/自动重发|
|21|轮换期间并发请求|SIMULATED / PASS|已发送请求保持原 Handle，旧 Handle 拒新请求|
|22|Token 预算竞争|SIMULATED / PASS|单 Owner 同步事务四级原子预留/失败回滚|
|23|Data Egress 拒绝|SIMULATED / PASS|完整字节/分类/工具 schema /重复 JSON /最终 fence|
|24|Provider 超时|SIMULATED / PASS|Fixture 进入发送后超时持有；真实 Provider NOT_RUN|
|25|Streaming 中断|SIMULATED / PASS|部分 Usage、背压、UTF8、取消、断连保留|

不同 SID、实际 Worker/Reviewer、VM_READ/WRITE、DUP_HANDLE、转储与缓存、SCM 重启均需单独部署审批。没有将同进程单测当作进程或身份隔离。见 attack-test-matrix.json 与 Native 11 项资格计划。
