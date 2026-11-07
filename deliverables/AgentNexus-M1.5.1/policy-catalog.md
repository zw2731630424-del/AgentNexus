# M1.5.1 Policy Catalog 增量

完整机器定义 source/config/agentnexus/policies.json：44 项、无重复 ID，与 M1.5 原字节一致。L0 的不可降级 metadata、strict schema 与 owner 约束保留，不关闭策略、不添加 any 或降低 TypeScript strict。

| Policy/保护合同 | 当前执行含义 | 验证/限制 |
|---|---|---|
| P.IDENTITY | 逻辑身份不替代 Runtime/OS；精确 worker/boot/instance | 模型拒绝+实际本账户 observation；独立账户 BLOCKED |
| P.COMMAND_RISK | 精确 intent/resource/arguments + 单次审批/Permit | 参数变更、过期、epoch、nonce/断连重放拒绝 |
| PROCESS / EXTERNAL_EFFECT 非降级门禁 | Feature ON、Policy DISABLED、requires_sandbox=false 不放行 | 原 Gateway 与新增 fixed Resource gate 双重失败关闭 |
| 文件授权 | Signed FileGrant、固定资源、句柄/fileID/hash/max bytes | 不以路径前缀代替 OS；跨账户直接访问尚未证明 |
| Writer/Workspace/Slot/Quota/Sandbox ownership | 完整退出+最终裁定+独立 owner 版本/回执 | UNKNOWN/未 EOF/未知成员永不按 timer 释放 |
| Audit before effect | 高风险准备/消费/START 前持久 audit | 注入 flush 失败时 0 prepare/start；生产持续流未完成 |
| Resource Governance | 已失败的硬限制不能由审批、Feature 或资格证书覆盖 | 新固定代码门禁，CPU FAIL 持续 BLOCKED |

以上最后一行是代码不可覆盖安全不变量，不伪造新的 Policy ID，也不修改原 44 项 Schema。项目/平台 CPU、RAM、Disk、I/O、Network、Model 等预算的后续设计见 resource-governance-design.md，未实现部分 NOT_RUN。
