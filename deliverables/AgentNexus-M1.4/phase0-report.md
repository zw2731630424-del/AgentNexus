# Phase 0 基线冻结与设计审查

日期：2026-11-07（Asia/Shanghai）。状态 **PASS，限定为基线与设计完成**；不包含生产部署验收。

已读 AGENTS.md、工作流路由与治理 policy。project-rules/README.md 不存在；路由没有匹配的强制流程，未安装增强模块或修改规则。主代理阅读M1.3全部runtime、协议、Windows原语与有关Host/Gateway/Policy/Feature/存储接口；独立只读核查员完整读取其余源码、全部测试/工具、M1.2 Reconciliation及ADR001—013。M1.3 README、完整验收、独立审查MD/JSON、部署清单与后续建议已全文读取。

| 核验 | 结果 |
|---|---|
| 起始工作树 | 干净 |
| 分支 / HEAD | main / 9cec1fdc6574c41d7a19b23fe5e491b2c9084d06 |
| M1.3 源码 45 项 | 根工作树、冻结source、最终run manifest逐路径/长度/SHA相等 |
| M1.3 集合 hash | 6a2f9f9f60c86ec7d72c4f64357172d604786ad0defe03c220b67156fb410005 |
| M1.3 交付 | 887项内容与交付manifest一致，manifest自身hash一致 |
| 独立核查追加 | source ZIP、原最终隔离workspace也全部一致；原M1.2的171个测试名未丢失 |
| 历史保全 | 1829个tracked项逐文件冻结；最终再核对，见verification.json |
| M1.3历史结果 | 206项：203 PASS/3 NOT_RUN/0 FAIL；完整部署BLOCKED |

精确冻结数据见 evidence/phase0/freeze.json。M1.3验收不得解读为生产Broker、独立账户、组合沙箱或释放权已经完成。本轮原始交付、根源码、项目规则及治理配置都不覆盖。M1.4所有产品候选在source中，任务记录与临时日志有各自M1.4路径。

总体方案与关键成本已在design.md提出：采用双标准账户、用户态Worker Launcher与批处理启动方式；不开管理员服务、不直接授交互登录权。远程Permit、Broker消费、Supervisor恢复、输出EOF、ExitProof及Owner最终裁定分别拥有证据和屏障。Job通知不足以证明完整历史成员；磁盘/CPU和默认拒绝网络必须单独实测。

只读preflight.json记录两账户与精确部署目录均不存在；Worker注册表hive、登录权与计划任务细节未假定已就绪。系统变更仍需逐项批准。当前可授权的工作没有因等待系统权限而停止：已继续实现和验证候选模块。
