# 回滚记录

本轮无系统变更、无回滚动作。[机读计划](../approval/rollback-plan.json)。未来stopped安装失败保留已消费receipt、部分安装、Vault/Ledger及一致WAL/SHM、审计/签署材料；重新观察后另批恢复。不自动重试Apply、删除DataRoot/receipt、清空REAL账本、释放UNKNOWN或重发SENT/UNKNOWN，不退回同SID解密。

服务stop/卸载、删除/账户或ACL清理不在当前请求内。本包不启动服务；未来若批准启动，另批唯一服务stop、有限等待与固定Runtime/engine/Helper退出、pipe关闭证明，不用sc请求退出码冒充退出。
