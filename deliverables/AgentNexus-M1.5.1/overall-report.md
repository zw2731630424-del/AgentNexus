# M1.5.1 总体报告

2026-11-08（Asia/Shanghai）。基线 M1.5，开发 HEAD `4c714583e9971bc510218dc9274d4692b8ab70d2`，分支 main。本轮全部产品、工具和交付增量在独立目录；没有提交或推送 Git，没有系统部署变更。

## 实际完成

1. 保全 M1.2—M1.5、tracked 文件与 M1.5 原始 10/10 CPU FAIL；复现 M1.5 265/23/1 基线；独立审查分工完成全文读取与 hash 冻结。
2. 使用相同预算的真实时间序列、逐进程/Job 计量、AppContainer 与宿主同账户对照、无 CPU_RATE 对照、额外 PROCESS_TIME 对照调查失败。确认正确 Job/先分配后恢复；额外进程为 conhost，未排除其用量。
3. 没有把 Windows 的周期用户态检查伪称有界累计硬预算。新增 Resource Governance 能力说明和不可由证书/Feature/Policy 覆盖的门禁，真实 prepare 在创建准备槽前拒绝；Broker 在消费/执行前拒绝。
4. 新增原生创建/Job 加入/恢复时间、逐成员 user/kernel CPU、实际 CloseHandle 返回证据。设置、预算、截止、原始断言不变；这些观察不签发资源释放证明。
5. 实际运行了持久 Named Pipe、hardlink/junction、目录替换攻击、多层/残留树、owner 强杀、固定创建时间钉住观察和真正 CREATE_BREAKAWAY_FROM_JOB 拒绝。symlink 创建被 OS 拒绝，原样记 BLOCKED。

## 结果与未关闭项

最终源码 `3f4c9e1b30f7d956b7be9c6330872cf87f32681f86c39a9b3b09c97c9bc581a0`。主套件 305 项，296 PASS、8 NOT_RUN、1 FAIL，exit 1，tsc/语法 PASS。CPU 58 项 56 FAIL/2 PASS；这个偶然样本不会使资格转绿。M1.5 原始 10 FAIL 永久保留。

修前主套件的两个失败分别是继承 CPU 真实超限，以及新增 TOCTOU fixture 的拒绝码枚举没有覆盖系统返回的 WIN32_1921。后者操作已拒绝且未返回外部内容；不改原断言制造 PASS，失败和未完成的原攻击次数保留，独立审查另做完整、严格的后置条件攻击。

Host/Worker 独立账户、受保护 key/config/code、Profile/登录权/Task、真实跨账户 Peer、网络/管理库/其他项目隔离、严格累计 CPU、OS 磁盘配额、完整生产退出证明与 Host 重启仍没有资格证据。**PROCESS 与 EXTERNAL_EFFECT 持续 BLOCKED。** 代码和同账户原语通过不回答这些部署问题。

## 采用的边界

没有延长截止或放宽 CPU 数值；没有以软件 CPU poller 替换内核限制；没有从失败树中剔除 conhost 或子进程；没有修改 M1.5 历史记录或继承测试预期。新增治理 API 是已知失败能力的固定保护，不是已实现的项目/平台资源预算引擎。系统级审批清单只提供下一步精确基础对象，不能将 CPU 失败豁免为生产通过。

## 全部本轮完整运行

| Run | 源集合前缀 | PASS / FAIL / NOT_RUN | exit |
|---|---|---|---|
| baseline-2026-11-07T19-12-47-387Z-18824 | a55823fae02f | 253 / 20 / 9 | 1 |
| baseline-corrected-2026-11-07T19-16-22-964Z-38000 | a55823fae02f | 265 / 1 / 23 | 1 |
| baseline-host-account-2026-11-07T19-19-25-025Z-18624 | a55823fae02f | 276 / 0 / 13 | 0 |
| final-2026-11-07T19-34-37-992Z-27356 | 4825d2432a01 | 295 / 2 / 8 | 1 |
| final-2026-11-07T19-55-23-372Z-7880 | 3f4c9e1b30f7 | 296 / 1 / 8 | 1 |

| CPU Run | 源集合前缀 | PASS / FAIL | 根/树/EOF/历史闭合 | Job/process句柄关闭 |
|---|---|---|---|---|
| 2026-11-07T19-32-42-737Z-19340 | 4825d2432a01 | 1 / 57 | 56/58 | 58/58 |
| 2026-11-07T19-49-58-861Z-25456 | 3f4c9e1b30f7 | 2 / 56 | 58/58 | 58/58 |

原始 M1.5 为 265 PASS / 1 FAIL / 23 NOT_RUN，CPU 0 PASS / 10 FAIL；所有历史标签保留。表中 PS5 工具选择失败不作产品资格，新源码通过的任何用例不覆盖旧失败。
