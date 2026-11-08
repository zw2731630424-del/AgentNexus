# 治理与历史保护

最终未修改的 govern.py check 在 Windows extended-length 根路径上 PASS。初始普通路径因历史长路径失败，首次扩展路径因本轮自建测试 junction 失败；两次失败保留。先归档5个临时联接的类型、目标、属性和时间，再仅以非递归 rmdir 移除junction本体，并验证每个目标目录inode/device未变。没有删除或移动任何目标/历史数据，没有修改规则、账户、ACL或AppContainer。

Root治理策略/AGENTS原字节保持；15,510历史文件复核0变更。Root源码/测试/配置保持，M1.8为独立交付。源码178文件与最终回归快照、ZIP逐项匹配；全部最终交付文件由SHA256SUMS.txt核验。实际API费用0，DeepSeek仅选择准备方向。
