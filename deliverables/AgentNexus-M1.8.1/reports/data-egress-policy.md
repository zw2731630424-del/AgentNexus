# Data Egress Policy

PUBLIC/SYNTHETIC必须由可信Host verifier逐字审阅来源，并绑定project/provider/model/endpoint/Context SHA/body SHA/sources SHA/授权ref/expiry；模型自行分类没有权限。INTERNAL本轮默认拒绝，CONFIDENTIAL/SECRET拒绝。本轮未授权源码、历史/科研材料或凭证外发。

每次在Vault/网络前审计ALLOW/DENY及来源哈希，发送前同步复核grant撤销/到期/全部receipt字段并做秘密扫描。Transport复核持久grant，伪造一个标成PUBLIC的对象不足以发送。无源码公开合同不再要求伪造uploads_project_source=true。首轮无真实数据发出，active live grants=0。

独立审查要求补强receipt字段一致性，已修复并加测试。完整生产外发资格依赖可信Host verifier、固定singleton store与OS边界，仍BLOCKED；程序离线拒绝/许可语义PASS。
