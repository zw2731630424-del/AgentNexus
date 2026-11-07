# M1.3 变更与证据记录

原始基线、独立复跑和冻结清单位于 evidence/baseline；历史 M1.2 交付保持原字节。根 AGENTS/治理规则不修改。新增文件按 src/tests/tools/deliverables/.workflow-kit 分类；首个工具通过 govern new，余项批量建立，最终治理检查通过。

旧运行候选中仅六项变化：features/policies追加新条目且旧条目语义完全相等；package更新版本；host接入默认拒绝的新运行控制并在会话关闭时撤权；policy-contracts追加7个不可降级owner；security.test只把目录总数断言由34适配为41。另根README更新交付入口。旧32个运行文件中26个原字节相等，特别是 gateway/control/reconciliation/storage/artifacts/features/records/diagnostics/integrity/types 原文件均未改写。

新增runtime合同/IPC帧/审计SDK/控制投影/拒绝型Broker和原生C#探针，25个主协议测试（含3个真实崩溃子场景）、Windows原语测试、固定worker/crash夹具、独立快照测试工具。正式独立Broker与OS组合沙箱保持未实现，不以文件存在报完成。

中间证据保留：初次SDK未剥离Logical.role导致19个record校验失败；修后19 PASS；独立审查回归夹具把deadline设在cap expiry之后导致超时探针先被拒绝，修正夹具读取可信lease之后28 PASS。完整首轮202项含1个该夹具失败；最终206项全部已执行断言通过。Windows工具隔离内EPERM及缺残留窗口保留；隔离外仅pipe原语转为PASS，完整沙箱不改变BLOCKED。

独立审查3项P2：ExitProof任意operation归属、原生peer无界等待、终态连接槽/密钥未回收，均新增明确合同及M13-IR回归。作者同步自审另修复连接数最终检查、会话关闭撤销、矛盾退出观察及消费后屏障INDETERMINATE；不把代码修复前未执行的探针虚写成实测复现。
