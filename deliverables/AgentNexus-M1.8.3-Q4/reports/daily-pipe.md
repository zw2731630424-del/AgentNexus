# Daily Medium Pipe

**NOT_RUN。** 只读枚举未发现 `\\.\pipe\AgentNexus.Daily.v1`，未连接或创建管道。实际创建者、DACL、Mandatory Label、身份、跨SID/会话、远程拒绝、抢占、重放、消息篡改、权限拒绝均无目标证据。

源码预期Medium MIC、operator 0x00120183且不含CREATE_INSTANCE、拒绝远程；每消息验证实际冒充Token的SID/IL/Session/Logon ID；此为源码合同，不是本机对象观察。Runtime 来源、Grant/Nonce/Epoch/Request Hash/Context Hash 的生产关联仍待实际独立进程验证。原合成协议测试不能填充 OS PASS。
