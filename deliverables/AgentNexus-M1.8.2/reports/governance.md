# 治理与历史保护

未修改的 govern.py check 已在完整项目根的 Windows extended-length 路径上实际 PASS，原始日志见 evidence/governance/root-extended-check.txt。普通路径检查因既有超过260字符的历史目录报WinError 3，失败日志原样保留；同目录extended路径可读取且根目录device/inode一致，见path-length-probe.json。没有移走历史数据、增加忽略目录或更改规则来制造通过。

最初govern new长遍历未完成即取消，未创建其目标；新文件均按已批准的implementation/deliverable/task分类创建。最终所有M1.8.2交付、五个根构建工具、任务材料及SHA清单预期路径再使用原始path_at/classify函数核验，不替代完整根门禁。结果见final-delta.json。

M0至M1.8.1及根产品共16,040项历史文件在打包前逐字节复核，结果见evidence/history-preservation.json。AGENTS和policy保持原SHA，未安装Hook、未Commit/Push、未改变账户/ACL/AppContainer/Ubuntu或其他项目。最终源码189文件与冻结及完整测试快照同SHA95cd2da54b0e854a469eb5e0df8f4b52ce89fe67e452ab57b758aeb8e8335b50。全部最终文件另由SHA256SUMS.txt核对（清单自身不作自引用哈希）。
