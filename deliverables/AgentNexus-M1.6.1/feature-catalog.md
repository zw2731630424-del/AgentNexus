# Feature Catalog M1.6.1

完整机器目录为source/config/agentnexus/features.json，共193项；目录存在不等于全部实现。新增三个模块均只由可信bootstrap注册，关闭不放开安全能力。

| Feature | 实际owner / 范围 |
|---|---|
| native.storage-owner | 真实本地持久文件事务、身份/hash、ACK、显式恢复；OFF拒新写并保留UNKNOWN |
| native.rules-compiler | 有限DSL、原文来源、固定registry/version/hash/epochs/workflow；OFF拒新编译 |
| native.gate-engine | 真实证据/可信checker计算；OFF=BYPASSED/禁止protected许可 |

现有Context/Message/Model/Workflow/Scheduler/Resource/五角色沿用原Feature ID，新实现与最终证据单独绑定。没有凭Feature ON提高严格CPU或生产OS资格。全目录原M1.6测试映射未被用作本轮新功能的实际证据。
