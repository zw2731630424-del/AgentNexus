# Model Gateway 联调

真实DeepSeek请求0，结果NOT_RUN；离线路径PASS（受最终测试逐项证据约束）。新增链路：Context重建→精确外发许可→统一campaign原子预留→四级Usage预算→Transport授权→Vault lease→最后同步撤销检查→Provider parser→Usage/Archive/Audit。

失败解析也保留有效Provider Usage，response_complete=false使原预留保留；UNKNOWN不触发重发，付费请求幂等返回已有结果。模型response_model/fingerprint以及请求正文/响应wire哈希可追溯。工程fixture 30个Gateway记录，39条转录，全部SIMULATED。

没有真实Gateway完整性、网络重连或账单证明。不能将本版Adapter、文档核验或自报QUALIFIED回调视为LIVE准入。
