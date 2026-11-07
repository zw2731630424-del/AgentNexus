# ADR 002 单机技术栈与存储

状态：M0选型建议，先做有边界的实现；不是上游性能排名或产品已通过验证。

推荐：TypeScript/Node 24.15.0作为首版Host、原生Loop和CLI；SQLite元数据 + 分段Zstandard原档案 + 内容寻址对象目录；Windows优先受控本机IPC。业务核心不依赖UI、Python SDK或一个外部Harness。Node版本及native依赖按发行资产锁定；新补丁升级需回归。

| 选项 | 本轮证据与优点 | 成本/限制 | 决策 |
|---|---|---|---|
| TypeScript/Node | 现有Node24.15.0；DeepSeek/Cline/OpenCode/ZCode多处真实流式/工具实现；本轮node:sqlite与Zstd实测 | JS代码本身不是OS沙箱；同步SQLite须放专用服务/worker；Zstd API仍需版本隔离 | 首版业务运行时优先 |
| Python | Python3.12.10可用；OpenHands/Deep Agents实现成熟；便于研究工具 | 本机sqlite3为3.49.1；安全关键OS绑定及多语言发行增成本 | 研究探针/可选适配，不作为默认Host依赖 |
| Rust | Codex/Goose有真实Windows/状态机实现，适合小型OS helper | 本机无cargo/rustc；完整迁移loop成本和构建负担较高 | 仅必要native helper优先候选，先M2最小验证；不选整套Rust Harness |
| Electron/React 或 Tauri | OpenHands/ZCode桌面分层有源码依据 | Electron体积/权限；Tauri另需Rust工具链与WebView边界；本轮未测安装包 | M6比较后选；M1 CLI/API不被桌面壳阻塞 |

SQLite采用本机可靠磁盘，单服务writer、短事务/条件更新/唯一约束、FULL同步与受控WAL checkpoint；读事务限时，避免WAL因长期reader无限增长。WAL不适用网络文件系统，也不提供多个独立数据库/档案文件之间的原子提交。[SQLite WAL文档](https://sqlite.org/wal.html)。

本轮Python SQLite3.49.1的5项模式探针通过，只支持SQL模式可行性；该版本在官方WAL-reset缺陷范围内，**不能作为生产合格版本**。官方修复为3.51.3及后续版本，部分旧分支有明确回补；最低准入优先3.51.3。Node24.15.0实际绑定3.51.3，另做16worker的领取/预算/回滚3项实测通过。这不是WAL-reset故障注入或硬件断电证明。[官方缺陷说明](https://sqlite.org/wal.html#walreset)。

Zstandard用Node内置实现验证32MiB数据、64KiB分块、sha256字节一致、checksum损坏拒绝与1793次drain；观察峰值RSS约57.9MiB，仅是一轮小样本。初次高可压缩数据未触发背压，结果INCONCLUSIVE保留；随后用确定性伪随机输入验证。接口定义与稳定性以[精确Node版本Zlib文档](https://nodejs.org/download/release/v24.15.0/docs/api/zlib.html)为准，不使用Node私有Zstd API。node:sqlite具体API以[24.15.0文档](https://nodejs.org/download/release/v24.15.0/docs/api/sqlite.html)及实测为准。

执行边界与语言无关：可信控制数据由单一Broker/服务持有，worker无直接文件权限。Node permission model、worker_threads、Git worktree都不作为对恶意项目代码的完整安全边界。需要restricted token/Job、只读身份、网络限制时使用经过验证的native helper/OS机制；Rust还是最小已审依赖的绑定，待实际平台探针决定，不为M0安装工具链。

未选择分布式集群、常驻MySQL/Gitea/Mattermost、向量库或独立消息中间件作为首版必须依赖。可选向量/模型路由/桌面故障不影响原档案与手工任务。源码依据及许可范围见[主审计](../../research/primary_harness_audit.md)、[许可清单](../../research/license_inventory.md)。
