# M1.8.3 最终验收

**离线实现/受影响回归通过；完整生产资格 BLOCKED。** 本轮没有安装服务、创建账户、修改ACL/防火墙、注册AppContainer、修改Ubuntu、读取真实Key或连接真实Provider。

最终源码 225 文件，SHA256 `108e724d0b5796f472d5eb46a9088c556f04084c4bca0dad9bceb9a691d0090a`。冻结源码前后完全相同；受影响回归 185 项：**183 PASS / 0 FAIL / 2 SKIP**，strict TypeScript、桌面编译及JS语法检查通过。两个跳过是宿主拒绝hardlink/junction夹具，未换系统权限制造通过。原M1.8.2及UI全量历史失败未改写，也未宣称本轮重跑全部695项。

交付真正的SCM服务/Virtual Service Account原生启动边界、受认证固定pipe、Node服务引擎、无Key读回RPC、单次导入ticket与断线撤销、受控DeepSeek请求、复用Vault/Key Pool、全局四级原子Token账本、最终egress检查，以及原UI最小接口改造。没有重做页面或Gateway/Adapter。原Renderer/Preload密码输入只短暂处理新值；不能声称输入界面完全不接触正在键入的Key。

新增本轮服务用例26项、桌面新增8项与原14项均在受影响回归范围通过。Native各 40/40 项纯测与6项缺安装入口负测通过；它们不是真实OS身份隔离。独立审查确认所列8项代码缺陷及导入生命周期离线缺口关闭：完整32项测试与最终4项定向分别保留快照，不合并成一次独立全套。

原生窗口复验 **BLOCKED**：现有Electron.exe连 `--version` 都在应用前退出2147483651，无应用输出；新页面的实际原生窗口NOT_RUN。已提供真实Renderer逻辑与实际Node子进程合同测试；不把它们称为新窗口视觉验收。原UI布局/CSS/Preload维持，原始窗口验收仅属于历史版本。

生产11项Windows边界测试及全部15项最终标准仍BLOCKED：独立服务SID、实际DACL/pipe、同SID/不同SID密文解密拒绝、Worker/Reviewer拒绝、内存/缓存/转储及服务恢复尚无真实证据。M1.8.2同SID解密反例仍FAIL。签名QUALIFICATION_ONLY模式仅为批准后收集合成OS证据准备，本机未部署/签发/激活。

真实请求/Token/费用均0；既有100,000,000输入+输出额度未重置，实际发票费用未取得。五份DeepSeek正文/Hash草案未预留、未发送，仍需资格通过后重建当时身份/Handle/Operation/Reservation并由用户确认。当前不索取Key或提交模型执行申请。

审批入口：[部署清单](reports/deployment-approval.md)、[精确范围/回滚](reports/deployment-runbook.md)；[生产资格](vault-qualification.json)、[25项测试矩阵](attack-test-matrix.json)、[独立审查](reports/independent-security-review.md)、[具体请求审阅](reports/deepseek-request-review.md)。
