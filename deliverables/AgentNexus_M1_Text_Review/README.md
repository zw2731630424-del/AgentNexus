# AgentNexus M1 独立代码审查文本材料

本目录只提供普通Markdown和一个SHA256文本清单，没有新ZIP。所有原始内容以完整文件为单位嵌入；源文件字节没有改动。本轮不运行产品测试、模型、科研实验或任何修复/M1.1开发。

## 建议阅读顺序

- [源码索引](AgentNexus_M1_Source_Index.md)：运行/测试/开发/历史/生成配置的精确区分、测试映射和没有覆盖证据的范围。
- 当前完整源码：[AgentNexus_M1_Source_Review_Part1.md](AgentNexus_M1_Source_Review_Part1.md) · [AgentNexus_M1_Source_Review_Part2.md](AgentNexus_M1_Source_Review_Part2.md) · [AgentNexus_M1_Source_Review_Part3.md](AgentNexus_M1_Source_Review_Part3.md) · [AgentNexus_M1_Source_Review_Part4.md](AgentNexus_M1_Source_Review_Part4.md) · [AgentNexus_M1_Source_Review_Part5.md](AgentNexus_M1_Source_Review_Part5.md)。
- 完整测试/夹具生成器/辅助：[AgentNexus_M1_Test_Review_Part1.md](AgentNexus_M1_Test_Review_Part1.md) · [AgentNexus_M1_Test_Review_Part2.md](AgentNexus_M1_Test_Review_Part2.md) · [AgentNexus_M1_Test_Review_Part3.md](AgentNexus_M1_Test_Review_Part3.md) · [AgentNexus_M1_Test_Review_Part4.md](AgentNexus_M1_Test_Review_Part4.md) · [AgentNexus_M1_Test_Review_Part5.md](AgentNexus_M1_Test_Review_Part5.md)。
- 开发与历史源码：[AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md](AgentNexus_M1_Auxiliary_and_Historical_Source_Part1.md)。
- 核心原始运行证据：[AgentNexus_M1_Runtime_Evidence.md](AgentNexus_M1_Runtime_Evidence.md)。
- 补充原始记录：[AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part1.md) · [AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part2.md) · [AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part3.md) · [AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part4.md) · [AgentNexus_M1_Runtime_Evidence_Supplement_Part5.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part5.md) · [AgentNexus_M1_Runtime_Evidence_Supplement_Part6.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part6.md) · [AgentNexus_M1_Runtime_Evidence_Supplement_Part7.md](AgentNexus_M1_Runtime_Evidence_Supplement_Part7.md)。
- 字节校验工具：[AgentNexus_M1_Export_Verification_Tools.md](AgentNexus_M1_Export_Verification_Tools.md)。
- [完整性报告](AgentNexus_M1_Export_Verification.md)及[SHA256SUMS.txt](SHA256SUMS.txt)。

每个文件章节包含完整相对路径、原始字节数、原始SHA256及正确语言的代码块。没有摘要代替正文、没有省略号替代代码、没有删除注释/异常/边界检查。单个大JSON完整独占Part，不能在文件中间拆开。CRLF、BOM和原始末尾换行均直接按bytes保留；没有末尾LF时新增的分隔LF在机器标记中明确属于包装。不要通过复制粘贴后编辑器的换行规范化判断原始SHA；以磁盘文档和脚本提取的N个原始字节为准。

当前原生实现14文件，其中 integrity.ts 仅完整性测试导入、未接入Host；另外13个处于CLI值导入/按需检查器资源范围。没有逐文件动态加载trace或分支覆盖率，不把静态图当作全代码覆盖。测试源码与辅助6文件，另有runner和开发/历史工具；全部逐项列出，未只取24个旧候选。数据库Schema/约束在storage/control/features/policy/gateway/records/types等原文件中；没有独立Migration或配置Schema文件，不虚构缺失目录。配置目录142 Feature/34 Policy是设计数据，不是全部模块已实现。

测试夹具函数、内联数据、故障条件及辅助子进程已全部嵌入。tests目录无独立静态输入夹具。旧SQLite/Zstd/对象/段/损坏样本属于历史运行生成物，本轮不转Base64伪装成源码；所有未导出产物及M0研究工具的完整路径、大小、SHA256和原因在Excluded_Artifacts各Part登记，原件/旧分包不改动。

原始最终证据为135项：131 PASS、4因真实OS链接权限EPERM未运行、0 FAIL；本轮没有重跑。Node/SQLite/Zstd/文件/受控进程及Python/PowerShell AST的历史本地检查用合成输入；控制/Gateway有合成注册模块/PDP/工具回调，部分使用时钟mock和转发spawn spy，不能当作真实模型。真实Provider、OS管理员身份/沙箱、完整生产审计、Vault、全部工作流/五Agent、多语言/LSP、tsc、硬断电、长时soak均未完成或NOT_RUN/BLOCKED。完整安全部署仍BLOCKED。

原始missing_files.json完整嵌入补充证据：精确逐测试起止时间、部分中间源码版本和内联probe/transcript未保存，不补造。Node24.15.0原生运行TypeScript，无npm依赖、无安装产生的锁文件或tsconfig，外部Python3.12.10/PowerShell7.6.9环境不在本文中替代交付。现有package版本0.4.0-m1.1只是原件标签，不代表本轮开发。

完整性报告列出自动反向提取/原始字节比对结果及文件映射。所有Markdown（包括完整性报告自身）的SHA256在独立SHA256SUMS.txt；报告不尝试内嵌自己的自引用哈希。敏感筛查只针对本次候选原文和新文档，不读取本机Key池/凭据库/环境变量值；有强凭据格式时只登记路径/行号并阻止输出，不替换成假密钥。
