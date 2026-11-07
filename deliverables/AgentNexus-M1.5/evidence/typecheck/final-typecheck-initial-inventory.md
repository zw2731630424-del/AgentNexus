# AgentNexus M1.5 最终严格 TypeScript 检查

结果：FAIL。Node 24.15.0 / TypeScript 5.9.3 / @types/node 24.10.1。完成时间：2026-11-07T10:59:19.359Z。

冻结源码共 91 文件，集合 SHA256：`a55823fae02fd565249cf0d2af1f3257d2e107b798b05b078b74ba15eb0e109e`。编译前与编译后均逐项核对全部路径、字节数及 SHA256，与 source-freeze-final.json 完全一致；本轮未写入产品文件。

CLI tsc 退出码 0；同一完整 TypeScript 程序的配置、选项、全局、语法和语义诊断数量分别为 0 / 0 / 0 / 0 / 0。检查启用 strict、noEmit、NodeNext、allowImportingTsExtensions，skipLibCheck=false，noCheck=false。这是真正的类型与语义检查。

磁盘 TypeScript 文件 58 个，编译根文件 57 个，未漏纳文件 1 个。bootstrap 11、production 13、继承 runtime 5、顶层源码 14、测试 14、TS 工具 0。完整程序 236 文件，含 179 个声明文件；全部根文件与程序文件的哈希见 final-typecheck.json。

原始首次失败日志 first-tsc.log 保留 12 条错误，SHA256：`57a6dc5095bd1ab275a92149907f9560f51aedafbc0bead4c331d47b4f2c3d18`。继承修复限于 Zstd/Transform 选项类型、内部 disposal 生命周期形状、Buffer 类型、spread 的 Partial 类型、snapshot 数值参数，以及三个原有测试的类型声明；不以 any 抹除安全边界。production/exit.ts 的 state 联合类型由主代理处理。

工具隔离安装在 ../type-tools，使用官方 registry.npmjs.org 的固定包及锁文件，安装时禁用 lifecycle scripts。来源、SHA512 SRI、编译器及 Node SHA256 均保存在 final-typecheck.json 与 ../type-tools/provenance.json。未安装 source/node_modules，未改变系统配置。

受影响的继承测试先前 71/71 通过；完整最终隔离回归由主代理独立归档。合成测试产物已移至 `.workflow-kit/runtime/M15-type-data`，映射保存在 test-artifact-relocation.json。

本报告只声明 TypeScript 编译与语义检查结果。C#、Python、PowerShell 和 .mjs 文件均纳入 91 文件不变性核对，其各自运行验证由主代理的完整回归报告说明。

全部 TypeScript 根文件：

- `src/agentnexus/artifacts.ts`
- `src/agentnexus/bootstrap/config.ts`
- `src/agentnexus/bootstrap/entry.ts`
- `src/agentnexus/bootstrap/exit-closure.ts`
- `src/agentnexus/bootstrap/launcher-proof.ts`
- `src/agentnexus/bootstrap/permissions.ts`
- `src/agentnexus/bootstrap/reservations.ts`
- `src/agentnexus/bootstrap/runtime.ts`
- `src/agentnexus/bootstrap/session.ts`
- `src/agentnexus/bootstrap/supervisor.ts`
- `src/agentnexus/bootstrap/ubuntu.ts`
- `src/agentnexus/bootstrap/worker.ts`
- `src/agentnexus/cli.ts`
- `src/agentnexus/control.ts`
- `src/agentnexus/diagnostics.ts`
- `src/agentnexus/features.ts`
- `src/agentnexus/gateway.ts`
- `src/agentnexus/host.ts`
- `src/agentnexus/integrity.ts`
- `src/agentnexus/policy-contracts.ts`
- `src/agentnexus/policy.ts`
- `src/agentnexus/production/audit.ts`
- `src/agentnexus/production/authority.ts`
- `src/agentnexus/production/broker.ts`
- `src/agentnexus/production/contracts.ts`
- `src/agentnexus/production/exit.ts`
- `src/agentnexus/production/file-broker.ts`
- `src/agentnexus/production/host.ts`
- `src/agentnexus/production/identity.ts`
- `src/agentnexus/production/native-client.ts`
- `src/agentnexus/production/qualification.ts`
- `src/agentnexus/production/service.ts`
- `src/agentnexus/production/transport.ts`
- `src/agentnexus/production/windows-supervisor.ts`
- `src/agentnexus/reconciliation.ts`
- `src/agentnexus/records.ts`
- `src/agentnexus/runtime/audit.ts`
- `src/agentnexus/runtime/broker.ts`
- `src/agentnexus/runtime/contracts.ts`
- `src/agentnexus/runtime/control.ts`
- `src/agentnexus/runtime/ipc.ts`
- `src/agentnexus/storage.ts`
- `src/agentnexus/types.ts`
- `tests/agentnexus/control.test.ts`
- `tests/agentnexus/diagnostics.test.ts`
- `tests/agentnexus/gateway.test.ts`
- `tests/agentnexus/integrity.test.ts`
- `tests/agentnexus/m14-adapter.test.ts`
- `tests/agentnexus/m14-native.test.ts`
- `tests/agentnexus/m14-production.test.ts`
- `tests/agentnexus/m15-bootstrap.test.ts`
- `tests/agentnexus/m15-pipe.test.ts`
- `tests/agentnexus/reconciliation.test.ts`
- `tests/agentnexus/runtime.test.ts`
- `tests/agentnexus/security.test.ts`
- `tests/agentnexus/storage.test.ts`
- `tests/agentnexus/windows-native.test.ts`
