# 独立安全审查最终报告

审查代理：`/root/independent_audit`，独立上下文、只读、无递归、无共享写入。下述为该代理最终报告的归档；主代理负责保存，审查者没有自行执行产品测试、Windows探针或系统配置命令。测试确认是读取原始TAP/JSON及绑定源码，不是审查者独立复跑。

结论：**三项P2已闭合；审查范围内未识别新的未闭合问题。完整OS安全部署仍BLOCKED。**

范围：M1.2全部16源码、9测试/子进程文件、验收/27账本/四设计和ADR001—009；M1.3 runtime全部6文件、host/policy-contracts、两配置、runtime.test/runtime-worker/runtime-crash-child/windows-native.test、windows-probes.ps1 共15重点文件，以及设计/协议/ADR/验证入口/指定原始证据。

| 发现及冻结时源码 | 修复与最终复核 |
|---|---|
| M13-IR-001，P2：observeExit可关联任意未归属operation | 唯一operation/runtime绑定含profile/generation/scope hash；issue/reserve同事务绑定，observeExit调用前和落库重查。负例PASS |
| M13-IR-002，P2：peer永久等待占满admission | deadline+撤销；未settled原生工作最多32且不无界替换；超时和保守拒绝PASS |
| M13-IR-003，P2：终态连接槽/密钥泄漏 | 共用同步清理/取消/清零路径；33轮回归PASS，未知资源仍保留 |

首轮三项发现绑定 runtime/control.ts SHA256 `7da1b3a4a098a5fe58a5fce0c61601aff88c98cda78ca6d9feafcccb73ef8546`；发现阶段提供了模型探针文本，审查者未执行，不宣称修前实测复现。最终文件为 `4b78fdfdbab38bc1d07dafea5fa323c72e1d02eeefbc7071b13f515ef6cec502`。

同时确认：会话关闭撤销、Host关闭取消、退出字段一致性、屏障失败INDETERMINATE；production dispatch/release硬拒绝，没有解除原M1.2 Writer的新路径。45个运行候选与最终source-manifest和隔离workspace逐路径、长度、SHA一致，实际目录无遗漏。

集合算法：路径统一 `/`，按路径排序，每项 UTF-8 `path + NUL + lowercase_sha256 + LF` 连接后SHA256。

```text
45文件：6a2f9f9f60c86ec7d72c4f64357172d604786ad0defe03c220b67156fb410005
15重点文件：9fd46e6e08eb1e652bf9562267445b9b4805d0f66c1a91910e5110e3b9bbaabb
测试source-manifest.json：9a0d78cb5824b16640bf5cc801655febe98af523a7694fc85810bc0023201bc5
```

原始证据核对：contract TAP 28 PASS/0FAIL；完整运行206项203 PASS/3NOT_RUN/0FAIL、exit0、未超时；旧171测试名全部保留，142Feature/34Policy逐对象一致，所核对11既有核心源码原字节相等。

Windows记录支持真实peer匹配、同SID非预期进程识别、Job正常和终止观察、Restricted Token创建；不支持完整管理认证、跨用户/文件/网络隔离及生命周期全追踪。管道负例没有执行真实管理命令。C#明确 membership_complete=false、release_authority=false。以上原语不能替代生产组合验收。
