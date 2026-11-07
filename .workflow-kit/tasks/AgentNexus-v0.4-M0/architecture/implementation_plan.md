# AgentNexus 总体实施计划

本轮止于M0研究交付，不启动M1产品开发。下面是可按证据推进的实施路线；用户明确的产品原则为约束，新增技术取舍为M0建议，不把工程建议写成已获用户批准。

## M0 已交付范围

11个主体仓库固定快照、实际Loop/工具/权限/保存/恢复控制流审计、根许可与重要嵌套例外、依赖初筛、105文件Workflow映射、Feature/Policy机器目录、内部协议、5个ADR、风险/验证记录。源码引用、原始输入指纹与实际测试记录可复查。

没有引入上游核心产品代码，没有运行候选Harness、模型、科研项目、正式实验或自动commit/push。当前工作区尚不是Git仓库；没有为M0擅自初始化或提交。源码缓存和合成探针均放runtime，研究材料放tasks；规则与原安装套件不改。

## 开始产品实现前的最小设计冻结

先审查：自有协议/三安全域、Feature收紧继承、Policy应用/底层边界、Archive ACK屏障、Node/SQLite最低版本及可选桌面后置。能影响方向/成本的未知仅有：Windows实际隔离helper的实现与部署、所选上游文件的许可闭包、首批真实Provider访问方式。其余UI、模型偏好和模板外观不阻塞合成最小验证。

规则文件不是设计文档落点。架构审阅结果进入Decision Ledger/ADR，只有用户明确要求修改项目规则才走治理显式入口；不把批准架构等同允许修改所有AGENTS。

## M1 功能开关 管理员模式 原始档案

| 切片 | 实现内容 | 必须交付的真实验收 | 失败处理 |
|---|---|---|---|
| M1.0 控制域最小验证 | 可信管理IPC与worker身份隔离、私有配置/审计存储；必要时仅做最小native身份helper | worker不能连管理端点/直写控制库；真实OS身份与ACL测试，不只自报role | 停止发放副作用能力；比较最小helper方案，不做大产品 |
| M1.1 基础状态与Feature | Project/Agent/Task/Session/Event、SQLite writer、outbox、ON/OFF/INHERIT与依赖闭包 | FT-RESOLVE/OFF-NO-WORK/RETAIN/DEPENDENCY/RECOVER；未知ID、非法作用域拒绝 | desired与health分离；失败关闭，保留记录 |
| M1.2 Policy模式 | 管理员双确认、原因/期限/scope、独立审计、epoch、恢复预检 | 同一合成操作在三模式实际效果不同；PDP崩溃不自动旁路；过期先封锁；Agent不能切mode | ENFORCE_PENDING_PREFLIGHT保持封锁；管理员恢复通道可用 |
| M1.3 Archive | 活动spool、对象流、分段Zstd、manifest/哈希、DB索引双写reconcile、手工ReadRange | 原文字节一致；强杀/磁盘满/半条尾记录；ACK后事件不静默丢；索引重建；关闭summary无影响 | 原件/孤儿隔离；停止依赖新动作，不能用摘要补丢失raw |

M1不需要真实科研项目或模型Key。模拟执行器可验证状态机，但结果标FAKE_ONLY或明确仅为存储/OS范围的真实测试，不能当模型端到端通过。M1不能以纯单元测试替代管理通道真实隔离。

## M2 原生单 Agent 与工具执行

实现一个原生Loop、有限Context Assembly、标准ModelAdapter、ToolDefinition/Intent/Permit、工作区/终端/Git/测试工具与受限OS执行器。先合成仓库，workspace单写者、Reviewer只读，工具输出流式归档。M1的管理员与档案不依赖这个Loop才能恢复。

验收覆盖每条L0/L1的正向、反向、Shell/路径/MCP/外部执行绕过、并发、恢复、版本升级；超时后旧进程仍活不能启动第二写者；一次性claim未知结果先核对。Windows restricted token/ACL/Job/网络与敏感读取分别测，不能只测写入禁用。无有效OS隔离的后端保持只读/低风险。

最后用明确授权的无风险仓库完成一次真实模型编码任务，完整保全模型/工具/费用/中断恢复证据。没有可用凭证则对应真实模型案例NOT_RUN，不能用假后端填补。

## M3 多模型 Gateway 与凭证池

Provider/Account/CredentialRef/Pool/Model/Profile/RoutePolicy分离；先手工选模型与固定Key，再分别实现自动路由、轮询和跨供应商failover。凭证只在Broker，UI/worker/档案不含明文。预留共享账户与全局/项目/Task预算，未知请求结果不盲重试。

验收：至少两家已授权真实供应商；流式工具/取消/用量、401/429/5xx/超时、共享限额、路由OFF、轮询OFF、failover OFF、撤销/重启、native OAuth与API pool分离。价格/能力来源及更新时间进入注册表，不把本轮选择的SDK版本当未来模型能力承诺。不会为研究而索取或扫描用户未授权凭证。

## M4 Workflow Runtime 原生整合

按[105文件映射](workflow_kit_mapping.md)实施RuleCompiler、角色、G0—G6、模板、Artifact/Evidence/Decision/Review与校验器。先原生类型和API，再UI渲染；不安装原套件、不把Prompt包作为运行时安全模块。

每项功能有Feature，Gate OFF为BYPASSED；原始档案、专属科研授权和OS约束独立。将源套件正/负例变成本项目API测试；包清单必须识别嵌套同名文件，授权不能自报，状态写入用原子事务。缺许可证的原文代码/模板不直接复制；发行前完成所用资产许可准入。

## M5 五系统 Agent 与长期协作

常驻确定性服务驱动消息/心跳，LLM按事件唤醒；Lead/Subagent/Background Reviewer/Coordinator身份与工作角色分开。自动规划/派生/审查/协调/修复分别OFF可手工替代，等待不占模型槽。默认派生深度1，子任务/资源受预算与并发约束，失败同类两次无进展回Lead/人工，不无界自修。

验收双向唤醒、父等待仍收消息、至少一次与幂等、死信/重启、循环依赖、取消旧进程、跨项目隔离、独立候选审查失效。Coordinator不修改项目代码/科研方向，也不批准预算增加。

## M6 外部后端与 Desktop Studio

先Codex app-server和Claude SDK可选适配，再依据真实接口/隔离能力决定ZCode/OpenCode；MCP、ACP、LSP、Browser分别注册与开关。协议握手/版本能力与原始后端事件保全，不把私有JSON协议称ACP。

Studio提供Projects/Agents/Tasks/Workspace/Review/Workflow/Archive/Models/Usage/Monitor。Renderer不持Key或直接Shell权限；管理旁路有醒目标识、期限和独立确认。Electron/React与Tauri用最小安装包/权限探针再比较；不先复制上游整个桌面壳。适配器关闭先核对旧执行，再手工切已验证后端，不自动启用未授权替代项。

## M7 故障 降级 与长期运行

先24小时合成无付费soak，再按证据升到72小时与已授权的无风险真实任务。正式科研实验仍不在通用验收授权内。每个可选模块单独OFF/ON/失败/回滚/恢复默认，核对进程、定时器、网络调用与隐式调用归零，历史不删。依赖失败必须解释影响，不出现半启用。

初始预算提案：单流4MiB队列、全Archive写队列64MiB、段16MiB原文或60秒；默认全局4个模型槽、单工作区1写者。均需测量修订，不是已达性能指标。监测RSS、CPU、磁盘/WAL/档案增长、句柄、子进程树、queue bytes、p95写延迟和已确认cursor。触顶背压/拒绝新任务，不删除原始历史腾空间；备份、坏段隔离和恢复点必须演练。

故障注入包括PDP/管理审计/Archive Writer强杀、DB忙/磁盘满、客户端断开、睡眠/时间跳变、写后未ACK、ACK后索引恢复、模型未知计费、半个压缩frame、外部进程未退出。断电测试需专门环境，在本轮没有运行。

## 发布与变更准入

每个里程碑记录候选树、规则/配置/测试profile、真实命令/退出码、日志与未测项。独立审查不替代产品验收；候选变化旧PASS失效。Fake、NOT_RUN、INCONCLUSIVE、BYPASSED不折算PASS。REUSE/FORK只引入锁定资产与完整notice；升级需协议/边界回归。默认不自动commit、push、发布或接管科研仓库，按当时用户授权执行。
