# 本地复现与证据范围

在source目录使用Node24.15.0运行 `node tools/agentnexus/verify-m183.mjs`。它执行固定TypeScript5.9.3/@types-node24.10.1检查、受影响模型/Vault/egress/desktop测试和编译，原始结果写workspace .workflow-kit/runtime/AgentNexus-M1.8.3/verification。Type工具复用本机已锁定副本；独立源码包可恢复package-lock固定依赖后build，不要求用户用终端认证模型或编辑Key配置。

`node --test tests/agentnexus/m183-service.test.ts tests/desktop/isolated.test.ts` 仅合成；真实独立Node子进程仍同账户，不具备生产OS资格。`node tools/agentnexus/m183-desktop-smoke.mjs` 有预启动Electron --version检查；当前运行时退出，原始BLOCKED保留，未禁用安全设置强行通过。

`source/native/credential-service/build.ps1` 只编译到workspace runtime和执行纯测；preflight.ps1只读现状。交付bin仅供审阅/纯测，服务常规/attester/stdio入口缺安装资格时拒绝；不提供未签名测试启动模式。

禁止把上述命令当系统部署批准。部署路径/身份/ACL/签发/启动另见审批清单；本轮不存在真实Key、签名计划或Provider consent。原始Windows拒绝和跨身份解密必须部署批准后在真实独立进程/身份下重新记录，NOT_RUN不算PASS。
