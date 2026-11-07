# ADR 008 分能力准入与M1受限实现

状态：本轮用户授权完成M0.1后推进独立合法开发；工程准入按证据执行。

不复制未授权Workflow Kit，不新增npm依赖，不安装hooks或运行科研/模型。以Node内建SQLite/Zstd建立本地可信库，真实实现Feature、Policy三模式、Archive/Audit/Tool闭环与首批解析器；OS管理认证/任意执行后端保持BLOCKED。此选择允许基础状态机、存储、诊断与完整性持续推进，不把同进程不可伪造对象当OS身份隔离证明。

Windows与Ubuntu统一Sandbox能力接口，但每平台单独验证管理员身份、读写、网络、进程树和绕过测试；token/Job/namespace任一单原语均不能代替组合准入。M0既有108 Feature/22 Policy历史不变，新增目录使用v0.2与逐项变更清单。M1通过哪些真实测试就声明哪些，不宣称完整产品或M1全部安全验收完成。
