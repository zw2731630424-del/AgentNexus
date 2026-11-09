# 真实崩溃恢复与数据完整性

**15项全部 NOT_RUN。** 未启动目标服务或要求Windows重启。

- Credential Service崩溃：NOT_RUN。
- Native Runtime崩溃：NOT_RUN。
- Electron Host崩溃：NOT_RUN。
- Helper崩溃：NOT_RUN。
- Named Pipe断连：NOT_RUN。
- Streaming中断：NOT_RUN。
- ACK丢失：NOT_RUN。
- Host重启：NOT_RUN。
- Service重启：NOT_RUN。
- Windows重启：NOT_RUN。
- UNKNOWN恢复：NOT_RUN。
- Token Ledger恢复：NOT_RUN。
- Credential Handle撤销：NOT_RUN。
- Ticket失效：NOT_RUN。
- Grant失效：NOT_RUN。

未来仅使用独立合成Vault/ledger。UNKNOWN不自动重发、不重复核销或释放、不重置全局额度；原Vault、Ledger、Audit原样保留。真实账本保护式迁移未执行。
