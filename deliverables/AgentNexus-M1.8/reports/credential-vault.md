# Vault 实现与资格

合成多 Provider pool、host 对象身份 capability、密文 SQLite、Windows DPAPI CurrentUser、安全匿名管道、状态/健康计数/并发/rate/费用与请求记录已实现。UNKNOWN 保留，轮换绑定旧 handle 世代，未使用 lease 才能 NOT_SENT 释放；普通 settle 不能释放 UNKNOWN。

跨连接 import 的持久 generation 使旧 guard 失败关闭，refreshGuard 校验完整世代再增补已知秘密；关闭 guard 永久失败关闭。keys128/imports1024/request记录4096/security ring256 有界。DPAPI helper 并发2，退出未确认永久 poison。相关测试使用合成值，实际 DPAPI smoke 有真实本地执行证据。

LIVE 导入始终 BLOCKED。Ubuntu Secret Service 仅统一接口/技术设计，未实现实测后端。普通 Worker facade不含Vault，但同账户OS隔离不成立；没有更改账户或ACL。
