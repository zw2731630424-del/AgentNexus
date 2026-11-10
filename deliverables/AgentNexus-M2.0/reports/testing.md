# 测试与原始证据

最终定向：[results](../evidence/verification/2026-11-09T21-10-09-346Z-53600/results.json)、[原始TAP](../evidence/verification/2026-11-09T21-10-09-346Z-53600/tests.stdout.txt)、[类型检查](../evidence/verification/2026-11-09T21-10-09-346Z-53600/typecheck.stdout.txt)。32/32通过，原生CredMan使用合成字节，不等于真实Provider验证。

实际桌面：[11步结果](../evidence/desktop-e2e/run-fukypu/results.json)、[进程原始观测](../evidence/desktop-e2e/run-fukypu/process-observation.json)、[启动/关闭日志](../evidence/desktop-e2e/run-fukypu/electron-processes.json)。五张PNG来自实际Electron capturePage；03风险弹窗、04保存后页面已视觉复核，应用前按钮需明确确认，应用后后端状态一致。测试窗口隐藏、渲染同步仅用于截图；不替代实际Host。

全量诊断：[805项结果](../evidence/verification/2026-11-09T20-28-37-968Z-26960/results.json)、[未改写原始TAP](../evidence/verification/2026-11-09T20-28-37-968Z-26960/tests.stdout.txt)。782 PASS /3 FAIL /20 SKIP。OS资格与无关旧资源测试失败不改记PASS。后续三项旧用例：[基线对照](../evidence/baseline-comparison/2026-11-09T20-45-14-918Z/results.json)，两边均1 PASS /2 FAIL，原全量失败不被后续通过覆盖。

独立证据在 [evidence/independent-review](../evidence/independent-review/)，含final-targeted.tap.txt、final-vault.tap.txt、independent-probes-latest.json、5组探针源码、故障初始证据、运行前后/最终source manifest。查看 [独立报告](independent-review.md) 区分独立执行和主代理执行。

保留所有本轮先前的验证与Electron失败记录，包括受限沙箱CredMan拒绝、旧PowerShell路径配置、修复前缺陷、测试定位、截图超时及重启等待问题；它们在evidence同名run目录，不覆盖失败。测试数据中的少量重解析链接条目已只对本轮runtime执行非递归unlink并保留 [清单](../evidence/test-link-cleanup.json)，未删除其目标或任何历史文件。

完整工作区治理结果：[原始输出](../evidence/governance-check.txt)。源码完整性：[与独立审查一致性](../evidence/source-review-consistency.json)；交付额外包含基线未变的Node许可证文件，该文件不在审查代码树283项范围内，但在完整源码与包SHA中。

状态语义：PASS是对应范围实际运行并符合预期；FAIL保留实际失败；BLOCKED是依赖/资格不足且阻断；NOT_RUN未运行；SIMULATED仅合成对象/响应；INCONCLUSIVE不确定。Synthetic成功不标CONNECTED，未运行Hardened不标生产PASS。

最终增量仅调整未绑定Hardened预算的关闭请求状态和风险文案：desired=false也保持BLOCKED，不能冒充DISABLED。独立16/16与最新主代理32/32已复跑。UI11/11是此前ac57源码树的真实记录；Local行为未变，未把该UI结果伪记为最终90fc源码树重新执行。逐版本Hash和增量范围见独立报告。
