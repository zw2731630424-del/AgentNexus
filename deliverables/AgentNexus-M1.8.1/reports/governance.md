# 治理与历史保护

原始 `govern.py check` 在完整项目根的 Windows extended-length 路径上返回 **PASS**。扫描覆盖当前约20万个文件的分类、路径、重解析点与受保护规则；原始结果见 `evidence/governance/root-check.txt`。没有修改规则、忽略表、Hook、账户或 ACL。为避免重复扫描，已核对身份并停止较晚启动的重复只读检查；保留较早完整检查的实际 PASS。

首次 `govern.py new` 的普通路径检查因已有超过260字符的历史路径报 WinError 3，未创建目标或改变规则；原始工具错误保留于本轮工具记录，机器摘要另附。新文件使用受控分类路径创建。M1.8.1本轮运行目录未发现需要清理的重解析点，没有删除历史文件或移动目标。

最终新增的治理结果、源码清单和SHA256清单路径，再以原始治理工具的 path_at/classify 函数验证为deliverable；这项增量核验不代替完整根检查，见final-delta.json。完整根检查与最终增量分开记录。

15,762项历史交付和根产品文件逐字节保护，结果见evidence/history-preservation.json。规则、根产品与M0–M1.8交付未改写；没有Commit/Push。最终源码185文件集合SHA256为 `d2091ef71fbd7a62f17ff8a42a922357759817073d97f1343d27b6ff7c9c3bb1`。
