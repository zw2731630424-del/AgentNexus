# Key Pool

Provider/model/健康失败数/费用占用/选择顺序/并发/分钟速率共同决定Key，不做随机选取。ACTIVE/DISABLED/INVALID/RATE_LIMITED/EXPIRED/ROTATING/QUARANTINED独立状态；SQLite事务保证同Key不会并发重复消费额度。rotation新Key接新请求，旧inflight可完成，删除要求无未决lease，request tombstone阻止复用。

失败计数及lease使用记录存储于Vault私库，受限列表不含secret/ciphertext；Usage Ledger提供按请求的脱敏计量。此证据是合成管理逻辑及DPAPI本地存储，真实Key池轮换NOT_RUN。
