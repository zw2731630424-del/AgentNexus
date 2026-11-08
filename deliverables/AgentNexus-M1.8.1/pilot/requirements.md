# M1.8.1 独立 Pilot：Synthetic Event Summary

状态：HOST_AUTHORED_PREPARATION / LIVE NOT_RUN。这是新的独立工作区合同，不是模型交付。不得修改 AI_Consciousness、AI_NeuroWeave、AI_Highlycomplex 或 AgentNexus 自身源码。

实现无依赖 ESM 模块 summarize(events)，输入为 {id,value} 数组。id 为1–64位ASCII字母、数字、下划线、短横线；value 为无前导零的规范十进制整数字符串，可为负数，禁止 -0。重复相同id与相同value只计一次；相同id冲突抛出 E_CONFLICT。非法字段/输入抛出 E_INPUT。返回 {count,total}，count 为去重后数量，total 为任意精度整数十进制字符串；不得用浮点累加导致精度损失。输入不得被修改。模块不得自行进行网络、文件或进程操作。

客观验收：独立冻结的验收测试、输入不变性、边界值、重复与冲突；G0–G6只有已资格Owner可出具。Research/Coding/Test/Debug必须由真实模型生成任务和实现，经 Message Bus、Tool Gateway、Storage Owner交付。Reviewer只读，未知缺陷评估答案不放入其上下文。

Single与Multi从同一initial目录的同一哈希开始，模型别名与system_fingerprint需留证；各臂最高50万总Token、30分钟，均包含在本轮1亿总额度内。模型规划不能预写；当前没有模型代码、没有运行样本、没有执行任意生成代码。PROCESS资格仍BLOCKED。首次live基础验证不发送此目录源码；后续使用此合成Pilot必须先逐字审查并登记外发合同。
