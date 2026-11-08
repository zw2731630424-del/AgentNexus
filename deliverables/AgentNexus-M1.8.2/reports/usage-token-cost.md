# Usage / Token / Cost

真实请求0、输入/输出/缓存/推理/失败token均0、实际费用$0，剩余100,000,000。继承campaign ID m181-deepseek，没有换版本重置；后续切Key/Agent/Task/Session同账本。Campaign负责全局原子reserve，ModelUsageLedger负责请求/Agent/Task/Project/Platform，Vault租约另保留费用与并发。并发、耗尽、失败usage、reopen、不可重置与UNKNOWN保持均有合成SQLite回归。

总消费只计input+output，cache拆分不再相加、reasoning不再加到completion。used为已观察实际usage；UNKNOWN时另存保守held以阻止新请求，不把held当作真实已消费/真实费用。已报告失败Usage只入账一次；未知usage以估计上界保留并阻断全campaign。

三个草案合计token预留上界14,554，峰时全miss费率估计$0.004885；这不是已扣费或新增总限额，未创建live reservation。费用模型的RATE_ESTIMATE与invoice分开，真实账单未验证。固定唯一Host store、受保护账本和启动链仍BLOCKED，不能用新DB获得新1亿额度。
