# 真实 TOCTOU Junction 验证

实现为新增 `m161-boundaries.test.ts` 与独立 Worker fixture；原 `m151-boundaries.test.ts` 的 `swaps > 0` 原断言和历史失败保持原字节。

独立宿主初次真实运行：旧算法观测 42 次尝试、21 次实际安装；新 fixture 先通过握手证明当前 slot 是指向受控 outside 合成目录的真实 Junction，再调用原 native FileRead。返回 REPARSE_REJECTED 且没有 result 数据。并发阶段额外实际安装 50 次 Junction；120 次读为 29 次安全内容和 91 次拒绝（64 REPARSE_REJECTED、3 WIN32_1921、24 WIN32_2）。不能把缺目录拒绝单独解释为 reparse 阻断；稳定已安装攻击的原生拒绝是独立必要证据。

安全文件 native file_id、SHA256、dev/inode/birth/mtime 和外部合成文件身份/内容哈希前后一致。真实目录 rename 后注入显式异常完成回滚；真实终止已经安装 Junction 的 Worker 后，Host 核对其目标身份并恢复。最终原生读取仍是同一安全文件。

原始 report.json、native RPC 请求/响应与源快照封装在 evidence 下；最终全回归也重新执行该新用例，次数随真实并发调度变化，以该次原件为准。受管环境创建 Junction EPERM 的 NOT_RUN 原件也完整保留。

验证范围是 REAL_WINDOWS_SAME_ACCOUNT_PRIMITIVE 和合成隔离路径；不是恶意 Worker 的生产跨账户、ACL/AppContainer 或完整执行链资格。没有读取任何真实授权工作区之外的用户数据。

最终完整 v4 回归中，新真实攻击用例 PASS；保留的旧 TOCTOU 测试因没有接受 WIN32_1921 而 FAIL。两份结果分别报告，原失败未删除、未改断言、未以新通过替代。

原件入口：[受管创建拒绝](evidence/toctou/managed-01-report.json)、[首个宿主真实攻击](evidence/toctou/host-02-report.json)、[最终同源码真实攻击](evidence/toctou/final-v4-report.json)。
