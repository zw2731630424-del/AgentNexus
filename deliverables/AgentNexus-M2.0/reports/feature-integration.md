# Feature Toggle 实际绑定

完整46项定义和依赖图见 source/config/agentnexus/security。状态是 ENABLED / DISABLED / BLOCKED / NOT_AVAILABLE / NOT_QUALIFIED；verification另列 PASS / FAIL / BLOCKED / NOT_RUN / SIMULATED / INCONCLUSIVE。配置打开不等于资格通过。

| 控制 | 实际 owner / 行为 |
|---|---|
| OS Storage | Vault readSecrets、原生Credential Manager、credential.save与模型派发gate；关闭不解密，元数据只读 |
| Isolated Service / Helper / Deployment | 既有端口与资格；切换需重启，未绑定/未取得资格阻断 |
| Policy engine / enforcement / default deny | 同一 PolicyEngine evaluate，OFF不计算、ADVISORY计算、ENFORCED阻断 |
| Tool permission / exact resource / provenance / known-secret guard | 固定边界，不能误当普通可关闭策略；不可用时标BLOCKED并阻止持久化 |
| Command validation | 同一 ToolGateway 是否调用注册 validator |
| File approval | 同一 LOCAL_WRITE approval owner，两注册项同步 |
| Data classification / egress / secret scanning | beforeDispatch，真实请求审查；关闭不制造通过收据 |
| Endpoint restriction | Local HTTPS preflight 对最终endpoint与配置endpoint的绑定；关闭仍保留HTTPS/TLS和单次envelope fence |
| Command / Tool / File / Policy audit | ToolGateway相应附加 producer |
| Provider audit | 同一最终请求 pre-dispatch producer，仅标识符、Hash和决策 |
| Agent Message audit | 现有 MessageBus durable send之后的附加 producer |
| Credential audit | 存储intent/结果及启用、撤销、删除操作的附加 producer |
| Token/cost scopes / rate | 原 ModelUsageLedger 扩展 scopes、Gateway模型RPM和Vault Key RPM；总授权不重置 |
| Cost display | renderer隐藏费用字段，账本持续记录 |
| Sandbox / Restricted Process / OS limits / Runtime isolation | 未通过真实资格，不假装启用 |
| TPM / Signer / CMS | 原件保留，默认不要求；未运行的功能不标PASS |

Security Center在配置变化时展示风险确认，不在每次启动反复弹警告。Settings区有独立入口；导入导出、恢复默认、模式计划、后端状态与最近审计均已接入。高级逐请求Data Egress批准与非Windows凭证后端仍未实现，状态与报告明确区分。
