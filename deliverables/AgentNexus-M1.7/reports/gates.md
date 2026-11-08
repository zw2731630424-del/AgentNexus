# Workflow / G0–G6 报告

采用 M1.6.1 NativeGateEngine 语义：G0准入、G1规则/输入、G2计划、G3代码测试、G4独立审查、G5交付证据、G6最终验收。每条记录绑定实际候选、基线、规则registry/hash/version、feature/policy epoch、checker版本和对应不可变证据Artifact；G3/G4保存完整固定checker原始报告，其余五门引用候选manifest。计划的DAG/所有权/预算另由DevelopmentAdmission在执行前校验。模型文本不能把Gate改成PASS。

最新7条本地Gate全部PASS，同一候选证据hash `4efb37521e7ff918500ad30bb8f211c82f99b36792e305ad637e330d5b098a7e`。其中文件内容tree hash另为 `0fe9d5c6ac0fd67b6cd5226a048db51dfc2c71dc9cc9b503522818b4fe57eadc`，二者结构与用途不同。程序校验实际文件/Storage版本/来源/报告，原修复前G3和G4 FAIL保留。G6事先绑定受保护delivery Task，成功后才允许其dispatch。

本轮profile无人工审查门，人工Gate不冒充已运行；继承测试验证缺失/伪造/过期证据、独立审查角色、规则更新绑定、NOT_RUN/INCONCLUSIVE/BYPASSED和人工门失败关闭。Feature或可选Gate关闭不能放行核心策略。详细7条记录和失败前2条见 [report](../evidence/native/report.json)。
