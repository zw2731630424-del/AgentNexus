# 最终验收 — Model Provider Management UI

日期：2026-11-08。**当前授权的合成桌面工程范围通过；完整生产目标 BLOCKED。** 已实际实现页面、IPC、持久状态与后端集成，没有以设计文档或前端 Mock 冒充交付。

## 已交付

独立 Electron 桌面入口、统一导航、Provider Registry 驱动的供应商设置与自定义配置、独立秘密输入、多 Key 池、模型增删/能力/默认、统一模型选择器、Agent 模型绑定/备用路由/任务覆盖/预算，以及 Host 账本驱动的 Usage。复用 M1.8.2 Gateway、Adapter、Router、Vault 和 Usage Ledger；旧根产品与历史快照保持。

窗口曾因测试继承 Node 模式、Windows 尾斜杠参数和 ESM ready 等待而启动失败；这些问题已修正。固定 PowerShell 7 不存在时改用 Windows 自带 helper；普通隐藏启动器下补显式 show/focus。最终普通启动器已实际重新打开可见 AgentNexus 窗口，保留给用户。此最后显示差异只在非 E2E 模式执行，已经独立短复核、实际 Windows UI 核对和最终静态检查，未改变服务逻辑。

## 验证结果

- 新增服务：14 PASS / 0 FAIL / 0 SKIP。
- 原生桌面：2 PASS / 0 FAIL；含合成 DPAPI 保存/轮换、显隐/清空、连接状态、模型选择与 Task 路由、Usage、刷新、实际 Host 退出后重启和真实第二窗口 IPC 拒绝。
- 严格 TypeScript 和 7 项 Node 语法检查：8 PASS。
- 独立审查：四项可复现问题均 FIXED_VERIFIED；UNKNOWN 不切换、并发/关闭、403 和 TIMEOUT 另有定向证据。
- 根治理完整检查 PASS；最终交付文件按实际治理分类器增量校验、规则和 policy 哈希一致。初次长路径读取失败及重复中断不计作通过。

完整历史回归未通过：候选 695 项为 647 PASS / 33 SKIP / 15 FAIL，未改 M1.8.2 基线 648 PASS / 33 SKIP / 14 FAIL。14 项共同失败保留；额外一次 Broker BLOCKED 在随后候选与基线的相同定向断言中都 PASS，未证明为新增源码回归。**完整回归仍为 FAIL，不把定向通过覆盖到原失败。** 详见 [矩阵](reports/test-matrix.md) 与 [机器比较](evidence/regression-comparison.json)。

## 凭证与 LIVE

输入经受控本地 IPC 进入 Vault，保存后清空，不提供读回 Key API；Agent/Subagent 只获 scoped completion。原生 Renderer 无 Node/require、LocalStorage=0，输出投影无合成 canary。生产跨身份隔离未完成，同 SID 解密反例仍 FAIL；以上只证明合成接口纪律，不能证明生产 Worker 无法读取凭证。

真实 Key 导入、真实模型请求与真实 Provider Token 均为 0。统一真实授权上限仍为输入+输出合计 100,000,000，剩余 100,000,000；实际费用未取得，以 null 显示。当前本地 Store 仍缺生产唯一账本资格。所有 Key/Provider 的合成请求共用已有平台预算；轮换不重发 UNKNOWN。

Anthropic-compatible/Google Native、实时 Provider 模型目录、真实账户权限、真实账单与长期运行未验收。生产 Credential Service、Data Egress 和 LIVE 必须在独立部署资格通过后再开放，不要求用户现在输入真实 Key。

## 交付与完整性

17 项交付入口见 [delivery-index.json](delivery-index.json)，完整测试记录和截图见 `raw/`。原始失败尝试保留。历史 M1.8.2 189 源文件全部与原清单匹配；派生快照只修改原有 package.json/package-lock 与 Vault 的 Host-only setModels，另加桌面集成文件。源集合 SHA 见 [最终清单](raw/static-2026-11-08T14-02-23-332Z/source-manifest.json)。

[源码保全](evidence/source-preservation.json) · [治理记录](reports/governance.json) · [普通启动核对](evidence/normal-launch-smoke.json) · [独立报告](reports/independent-review.md) · [SHA256](SHA256SUMS.txt)。未修改规则、账户、ACL、AppContainer、Hook 或正式项目；未提交/推送。
