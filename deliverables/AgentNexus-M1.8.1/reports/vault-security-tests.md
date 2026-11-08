# Vault 安全测试范围

候选复跑继承的合成Vault加密、Key Handle绑定、轮换ABA、并发、撤销跨await、跨连接guard、错误/跨chunk泄漏防护，以及新增“合成Vault不能晋升为REAL Gateway”测试。每项真实PASS/SKIP见最终results.json；DPAPI受环境限制项保持SKIP，不补写历史。

Key不写普通业务表/Archive/Audit/Prompt的已知secret门覆盖合成值；它不能保证任意未知编码/同账户内存隔离。真实Key导入、跨身份Vault拒绝、Ubuntu后端与OS审计仍NOT_RUN/BLOCKED。
