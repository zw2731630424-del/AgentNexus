# 同 SID 测试裁定

这里的“同SID普通进程”指与交互Host共用operator用户SID的普通组件/Worker/Reviewer，不是已经攻陷独立服务身份的管理员。新服务SID不分配给这些进程；只有固定被保护的服务/Node/DPAPI helper在可信边界内使用它。

M1.8.2实际反例保持FAIL：同Host用户SID进程读合成密文并成功CurrentUser解密，摘要相等。原证据与生成/reader源码保留；M1.8.3同账户Node分进程仍只是SIMULATED，不声称它本身修复反例。

新真实测试NOT_RUN/BLOCKED：安装批准后用实际服务SID加密合成值，把仅含密文的副本交给普通同Host SID独立进程，记录TokenUser、完整性/会话、PID/创建时间、读结果、解密错误/退出码和摘要；另记录实际pipe连接、伪造PID/start/消息、重放、内存/句柄/dump拒绝。无账户/ACL/安装授权时不执行。现有native纯token fixture和Node协议测试明确为SIMULATED，不能升级为该结果。
