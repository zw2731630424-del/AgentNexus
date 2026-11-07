# File Broker 安全测试报告

File Broker 以预先配置资源 root、签名 FileGrant、精确 Operation/Resource/Runtime/Profile/epoch/version 绑定授权。原生 owner 从固定本地 drive 句柄逐组件 NtCreateFile，使用 root-relative handle、禁止 reparse 的对象打开方式、文件 ID/link count，祖先不共享 write/delete；不以字符串前缀证明权限。字符串仅先拒绝 traversal/ADS/设备/UNC。

| 场景 | 实际结果 | 当前边界 |
|---|---|---|
| File/Directory symlink | fixture 创建均 EPERM；新旧四项 NOT_RUN/BLOCKED | 未跟随目标验证，不能 PASS；不启开发者模式/特权 |
| Junction | 真实 outside target junction 被拒绝 | PASS，同账户句柄原语 |
| Hardlink | 真实 outside object link count>1 被拒绝 | PASS，同账户句柄原语 |
| 跨项目/管理目录 | 真实合成 sibling 文件存在，broker traversal 被拒 | PASS，Broker 路由；独立 Worker 直接 OS 访问仍 BLOCKED |
| 固定目录句柄 | positive read 返回 retained ancestors、share-write/delete=false 和 file ID | PASS，实际原语 |
| TOCTOU/并发目录替换 | 最终原用例 40/40 完成：21 安全读取/19 拒绝，23 次 junction 安装；修前 4825 同用例遇 1921 而 FAIL | 最终原语 PASS，原 FAIL 及错误枚举未改，仍有 fixture 可移植性问题；独立 80 次补充另列 |
| 文件大小/独占 create | 实际大文件超 max、超长 create、overwrite、变更检测拒绝 | PASS，单次文件 Broker 上限；无 OS 磁盘配额 |
| Artifact Store 直接访问 | 当前无独立 Worker/ACL/Profile 攻击环境 | BLOCKED，不能由 Broker 路由测试推断 |

最终相同原断言完成 40 次：21 次返回 safe+原 ID、19 次拒绝，48 次 swap 尝试/23 次实际 junction 安装，无 outside 字节。修前 4825 的 TOCTOU 原始 zip 有 18 个响应（1 baseline+17 attack），8 个成功全部为 safe 且同 file ID，10 个失败含 8×WIN32_2、1×REPARSE_REJECTED、1×WIN32_1921。每个失败只有 id/ok/error，无 result/content。独立审查核对原始 member SHA，未发现这个失败返回 outside 字节。它属于 TEST_FIXTURE_ERROR 的拒绝码枚举缺口；原完整 40 轮未完成，不能宣称该用例 PASS，也不扩大白名单制造绿色。

1921 是系统文件名无法解析错误；[微软错误码定义](https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1700-3999-)支持这个拒绝语义，不单凭错误码证明完整文件安全。独立 reviewer 在不改原源码/原用例下完成 80/80 严格补充攻击：27 成功全部 safe+原 ID/hash，53 拒绝全部无 payload，实际 junction 安装 40 次，前后基线成功；含确定性控制共 85 响应（30 安全成功、55 拒绝）。首次受管环境 EPERM 的 0/80 INCONCLUSIVE 也保留。该原语证据绑定旧 4825 集合；最终差异仅进程 cleanup，FileOperation/Relative 字节不变，经独立只读核对限定复用，不冒充最终全集再次执行。生产文件边界整体仍因 symlink、跨账户与 Artifact Store 直接 OS 访问缺证 BLOCKED。

原始回归数据见 [evidence/runs/final-2026-11-07T19-55-23-372Z-7880](evidence/runs/final-2026-11-07T19-55-23-372Z-7880/results.json) 的 data.zip；新测试源码与创建 fixture 均在 source/tests。所有目标数据为本轮合成数据，没有访问真实其他项目或 Host 管理库。
