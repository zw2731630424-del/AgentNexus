# M1.6 CPU资格与资源边界

**严格Windows累计CPU：BLOCKED；原M1.5.1资格FAIL永久保留。** 原58项为56 FAIL/2 PASS；M1.5原10项全部FAIL。80+50、300+50、3000+150ms预算/容差未修改，子进程没有排除，未以Supervisor deadline或CPU_RATE替代累计预算。

M1.6没有重跑58项资格矩阵、没有签发新OS CPU资格。新后端比较与独立矩阵见cpu-backends.md和resource-qualification.json：Windows bandwidth、采样/Supervisor、分片、cgroup v2、Wasm均是不同合同/研究范围，未经本机资格不标硬限制PASS。

完整回归仍包含原CPU弱断言。v1它偶然PASS；v2实际FAIL，Job累计29062500个100ns ticks（2906.25ms），仍需helper DEADLINE。原断言和所有原始请求/响应保留；即使该弱用例PASS，也不覆盖原严格58场景或提供不存在的上界。

本轮实际进展为：四种CPU合同分离、固定失败关闭、可运行的三级原子预留/累计核算/UNKNOWN基础。整数CPU ledger可以核算可信输入，不能宣称实际Job/进程计量误差已解决；原24/58帧差异仍INCONCLUSIVE。

所有新OS硬限制Feature均未注册可运行模块；STRICT_OS和生产释放路径固定拒绝，Feature ON、Policy DISABLED或伪造JSON都不能解除。APP/SIM预算只提供明确的本地账本合同，不能通过其模拟闭合令牌释放真实生产五资源。

RAM/Disk/Process/I/O/Network同样区分逻辑预留、实际计量与OS控制。实际LOCAL_WRITE缺持久disk owner时保持UNKNOWN，包括成功的大返回路径；原Task完成、handler结束或进程退出都不自动代表磁盘数据已消失。
