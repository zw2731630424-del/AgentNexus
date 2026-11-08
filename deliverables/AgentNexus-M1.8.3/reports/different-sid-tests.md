# 不同 SID 测试裁定

**NOT_RUN / BLOCKED。** 本机没有部署凭证服务，没有启动独立服务身份，也未为攻击测试创建Windows账户。不能用伪造SID字段、管理员/System token或同进程对象代替普通不同SID进程。

获批后至少分别核对：交互operator与独立服务SID不同；与Host不同的普通现有低权限用户（若可用）对服务密文/目录/pipe/Key读取接口的拒绝。每次均须实际新进程和TokenUser证据，先确认攻击确实到达预期对象，再裁定结果；缺第二身份/登录条件时继续NOT_RUN，不默认PASS。不为Agent类型各建账户。

该试验与同Host SID普通进程试验分开记录。当前只有原同SID解密FAIL、离线协议/纯token测试和只读部署预检，参见[25项矩阵](windows-attack-tests.md)及[Windows服务计划](windows-service-design.md)。
